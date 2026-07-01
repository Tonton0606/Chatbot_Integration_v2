#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# HERMES v2.2.1 — Zero-Downtime Rolling Deploy
# =============================================================================
# Features:
#   - Builds all Docker images with --pull for base image updates
#   - Performs rolling update: docker compose up -d --no-deps --build
#   - Runs health checks after deploy
#   - Auto-rollback if health checks fail within 60 seconds
#   - Logs every deploy event with timestamp
#
# Usage:
#   ./scripts/deploy.sh [service]    # Deploy specific service or all
#   ./scripts/deploy.sh server       # Deploy only server
#   ./scripts/deploy.sh --check      # Only run health checks (no deploy)
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color

# ── Config ───────────────────────────────────────────────────────────────────
DEPLOY_LOG="logs/deploy.log"
HEALTH_CHECK_INTERVAL=5    # seconds between retries
HEALTH_CHECK_RETRIES=12    # 12 * 5 = 60 seconds total
COMPOSE_FILE="docker-compose.yml"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ── Ensure log directory ─────────────────────────────────────────────────────
mkdir -p "$(dirname "$DEPLOY_LOG")"

# ── Log function ─────────────────────────────────────────────────────────────
log() {
    local level="$1"
    shift
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} [${level}] $*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*" >> "$DEPLOY_LOG"
}

# ── Check prerequisites ──────────────────────────────────────────────────────
check_prereqs() {
    log "INFO" "Checking prerequisites..."

    if ! command -v docker &>/dev/null; then
        log "ERROR" "Docker is not installed. Aborting."
        exit 1
    fi

    if ! docker compose version &>/dev/null; then
        log "ERROR" "Docker Compose (v2) is not installed. Aborting."
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        log "ERROR" "Compose file '${COMPOSE_FILE}' not found. Aborting."
        exit 1
    fi

    log "INFO" "All prerequisites satisfied."
}

# ── Health check single service ──────────────────────────────────────────────
check_service_health() {
    local service="$1"
    local container_name

    container_name=$(docker compose ps --format json "$service" 2>/dev/null | \
        python3 -c "import sys,json; data=json.load(sys.stdin); print(data.get('Name',''))" 2>/dev/null || \
        echo "")

    if [ -z "$container_name" ]; then
        container_name="${service}"
    fi

    # Check container is running
    local status
    status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")

    if [ "$status" != "running" ]; then
        return 1
    fi

    # Check container health
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_healthcheck")

    if [ "$health" = "healthy" ] || [ "$health" = "no_healthcheck" ]; then
        return 0
    fi

    return 1
}

# ── Wait for service health ──────────────────────────────────────────────────
wait_for_service() {
    local service="$1"
    local retries="$2"
    local interval="$3"

    log "INFO" "Waiting for '${service}' to be healthy (${retries} retries × ${interval}s)..."

    for i in $(seq 1 "$retries"); do
        if check_service_health "$service"; then
            log "GREEN" "✓ '${service}' is healthy."
            return 0
        fi
        log "YELLOW" "  Waiting for '${service}'... attempt ${i}/${retries}"
        sleep "$interval"
    done

    log "RED" "✗ '${service}' failed health check after ${retries} attempts."
    return 1
}

# ── Deploy ────────────────────────────────────────────────────────────────────
deploy() {
    local target="${1:-}"

    log "INFO" "══════════════════════════════════════════════════════════════"
    log "INFO" "Starting deploy: target=${target:-all}"
    log "INFO" "══════════════════════════════════════════════════════════════"

    # Step 1: Pull latest base images
    log "INFO" "Pulling latest base images..."
    docker compose -f "$COMPOSE_FILE" pull "$target" 2>&1 | while read -r line; do
        log "INFO" "  pull: ${line}"
    done

    # Step 2: Build images
    log "INFO" "Building Docker images..."
    if [ -n "$target" ]; then
        docker compose -f "$COMPOSE_FILE" build --pull "$target"
    else
        docker compose -f "$COMPOSE_FILE" build --pull
    fi
    log "GREEN" "✓ Build complete."

    # Step 3: Tag current images as "previous" for rollback
    log "INFO" "Tagging current images as 'previous'..."
    if [ -n "$target" ]; then
        docker compose -f "$COMPOSE_FILE" images "$target" --format json 2>/dev/null | \
            python3 -c "import sys,json; [print(f'{d[\"Repository\"]}:{d[\"Tag\"]}') for d in [json.loads(l) for l in sys.stdin]]" 2>/dev/null | \
            while IFS= read -r image; do
                [ -z "$image" ] && continue
                local prev_tag="${image%:*}:previous"
                docker tag "$image" "$prev_tag" 2>/dev/null || true
                log "INFO" "  Tagged ${image} → ${prev_tag}"
            done
    else
        docker compose -f "$COMPOSE_FILE" images --format json 2>/dev/null | \
            python3 -c "import sys,json; [print(f'{d[\"Repository\"]}:{d[\"Tag\"]}') for d in [json.loads(l) for l in sys.stdin]]" 2>/dev/null | \
            while IFS= read -r image; do
                [ -z "$image" ] && continue
                local prev_tag="${image%:*}:previous"
                docker tag "$image" "$prev_tag" 2>/dev/null || true
                log "INFO" "  Tagged ${image} → ${prev_tag}"
            done
    fi

    # Step 4: Rolling update
    log "INFO" "Performing rolling update..."
    if [ -n "$target" ]; then
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --build "$target"
    else
        # Deploy services in dependency order: redis first, then server, then client
        for svc in redis gmaps server client; do
            log "INFO" "  Deploying '${svc}'..."
            if docker compose -f "$COMPOSE_FILE" ps --format json "$svc" 2>/dev/null | grep -q .; then
                docker compose -f "$COMPOSE_FILE" up -d --no-deps --build "$svc"
            else
                log "INFO" "  Service '${svc}' not in compose — skipping."
            fi
        done
    fi
    log "GREEN" "✓ Rolling update complete."

    # Step 5: Health check with auto-rollback
    log "INFO" "Running post-deploy health checks..."

    local failed=false
    if [ -n "$target" ]; then
        if ! wait_for_service "$target" "$HEALTH_CHECK_RETRIES" "$HEALTH_CHECK_INTERVAL"; then
            failed=true
        fi
    else
        for svc in redis gmaps server client; do
            if docker compose -f "$COMPOSE_FILE" ps --format json "$svc" 2>/dev/null | grep -q .; then
                if ! wait_for_service "$svc" "$HEALTH_CHECK_RETRIES" "$HEALTH_CHECK_INTERVAL"; then
                    failed=true
                    break
                fi
            fi
        done
    fi

    if [ "$failed" = true ]; then
        log "RED" "✗ Health check FAILED. Initiating auto-rollback..."
        rollback "$target"
        log "RED" "✗ Deploy FAILED. Rolled back to previous version."
        exit 1
    fi

    log "GREEN" "══════════════════════════════════════════════════════════════"
    log "GREEN" "✓ Deploy SUCCEEDED: target=${target:-all}"
    log "GREEN" "══════════════════════════════════════════════════════════════"
}

# ── Rollback ──────────────────────────────────────────────────────────────────
rollback() {
    local target="${1:-}"

    log "YELLOW" "════════════════════════════════════════════════════════"
    log "YELLOW" "ROLLBACK: Reverting to 'previous' image tag"
    log "YELLOW" "════════════════════════════════════════════════════════"

    # Find all images tagged :previous and re-tag as :latest, then restart
    docker images --format "{{.Repository}}:{{.Tag}}" | grep ":previous$" | while IFS= read -r image; do
        local new_tag="${image%:*}:latest"
        log "INFO" "  Restoring: ${image} → ${new_tag}"
        docker tag "$image" "$new_tag" 2>/dev/null || true
    done

    if [ -n "$target" ]; then
        docker compose -f "$COMPOSE_FILE" up -d --no-deps "$target"
    else
        docker compose -f "$COMPOSE_FILE" up -d
    fi

    log "YELLOW" "════════════════════════════════════════════════════════"
    log "YELLOW" "ROLLBACK COMPLETE"
    log "YELLOW" "════════════════════════════════════════════════════════"
}

# ── Health check only ────────────────────────────────────────────────────────
health_check_only() {
    log "INFO" "Running health checks on all services..."

    local all_healthy=true
    for svc in redis gmaps server client; do
        if docker compose -f "$COMPOSE_FILE" ps --format json "$svc" 2>/dev/null | grep -q .; then
            if check_service_health "$svc"; then
                log "GREEN" "  ✓ ${svc}: healthy"
            else
                log "RED" "  ✗ ${svc}: UNHEALTHY"
                all_healthy=false
            fi
        else
            log "YELLOW" "  - ${svc}: not deployed"
        fi
    done

    if [ "$all_healthy" = true ]; then
        log "GREEN" "All services healthy."
        return 0
    else
        log "RED" "Some services are unhealthy."
        return 1
    fi
}

# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
main() {
    local command="${1:-}"

    case "${command}" in
        --check)
            health_check_only
            ;;
        --rollback)
            shift
            rollback "$@"
            ;;
        -h|--help)
            echo "Usage: $0 [service] [--check] [--rollback]"
            echo ""
            echo "Commands:"
            echo "  <service>    Deploy specific service (redis, server, client, gmaps)"
            echo "  (none)       Deploy all services"
            echo "  --check      Run health checks only"
            echo "  --rollback   Rollback to previous images"
            echo "  -h, --help   Show this help"
            exit 0
            ;;
        *)
            check_prereqs
            deploy "$command"
            ;;
    esac
}

main "$@"