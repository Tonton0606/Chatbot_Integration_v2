#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# HERMES v2.2.1 — Instant Rollback
# =============================================================================
# Reverts all services to the 'previous' Docker image tag.
# Logs every rollback event with timestamp and reason.
#
# Usage:
#   ./scripts/rollback.sh [reason]    # Rollback all services
#   ./scripts/rollback.sh "memory leak in v2.1.3"  # Rollback with reason
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

# ── Config ───────────────────────────────────────────────────────────────────
ROLLBACK_LOG="logs/rollback.log"
COMPOSE_FILE="docker-compose.yml"
REASON="${*:-Manual rollback via script}"

# ── Ensure log directory ─────────────────────────────────────────────────────
mkdir -p "$(dirname "$ROLLBACK_LOG")"

# ── Log function ─────────────────────────────────────────────────────────────
log() {
    local level="$1"
    shift
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} [${level}] $*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*" >> "$ROLLBACK_LOG"
}

# ── Check prerequisites ──────────────────────────────────────────────────────
check_prereqs() {
    if ! command -v docker &>/dev/null; then
        log "ERROR" "Docker is not installed. Aborting."
        exit 1
    fi
    if ! docker compose version &>/dev/null; then
        log "ERROR" "Docker Compose v2 is not installed. Aborting."
        exit 1
    fi
}

# ── Check service health ─────────────────────────────────────────────────────
check_service_health() {
    local service="$1"
    local container_name

    container_name=$(docker compose -f "$COMPOSE_FILE" ps --format json "$service" 2>/dev/null | \
        python3 -c "
import sys,json
try:
    data = [json.loads(line) for line in sys.stdin if line.strip()]
    if data:
        print(data[0].get('Name',''))
except: pass
" 2>/dev/null || echo "")

    [ -z "$container_name" ] && container_name="$service"

    local status
    status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    [ "$status" != "running" ] && return 1

    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_healthcheck")
    [ "$health" = "healthy" ] || [ "$health" = "no_healthcheck" ] || return 1

    return 0
}

# ═════════════════════════════════════════════════════════════════════════════
# MAIN ROLLBACK
# ═════════════════════════════════════════════════════════════════════════════
log "RED" "══════════════════════════════════════════════════════════════"
log "RED" "ROLLBACK INITIATED"
log "RED" "Reason: ${REASON}"
log "RED" "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
log "RED" "══════════════════════════════════════════════════════════════"

check_prereqs

# Step 1: List current images before rollback
log "INFO" "Current image state before rollback:"
docker compose -f "$COMPOSE_FILE" images 2>/dev/null || true

# Step 2: Find all :previous images and retag as :latest
log "INFO" "Restoring 'previous' images to 'latest'..."
PREVIOUS_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep ":previous$" || true)
PREVIOUS_COUNT=0

if [ -z "$PREVIOUS_IMAGES" ]; then
    log "WARN" "No 'previous' images found. Nothing to rollback to."
    log "WARN" "This may be the first deploy — no previous version exists."
    exit 0
fi

while IFS= read -r image; do
    [ -z "$image" ] && continue
    new_tag="${image%:*}:latest"
    if docker tag "$image" "$new_tag" 2>/dev/null; then
        log "INFO" "  ✓ Restored: ${image} → ${new_tag}"
        PREVIOUS_COUNT=$((PREVIOUS_COUNT + 1))
    else
        log "WARN" "  ✗ Failed to tag: ${image}"
    fi
done <<< "$PREVIOUS_IMAGES"

# Step 3: Restart services
log "INFO" "Restarting services with rollback images..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Step 4: Wait for services to become healthy (up to 60 seconds)
log "INFO" "Waiting for services to become healthy after rollback..."
HEALTHY=true
for svc in redis gmaps server client; do
    log "INFO" "  Checking '${svc}'..."
    for i in $(seq 1 12); do
        if check_service_health "$svc" 2>/dev/null; then
            log "GREEN" "  ✓ '${svc}' is healthy."
            break
        fi
        if [ "$i" -eq 12 ]; then
            log "RED" "  ✗ '${svc}' is still unhealthy after 60s."
            HEALTHY=false
        fi
        sleep 5
    done
done

# Step 5: Final report
if [ "$HEALTHY" = true ]; then
    log "GREEN" "══════════════════════════════════════════════════════════════"
    log "GREEN" "ROLLBACK COMPLETE — All services healthy"
    log "GREEN" "Reason: ${REASON}"
    log "GREEN" "══════════════════════════════════════════════════════════════"
else
    log "YELLOW" "══════════════════════════════════════════════════════════════"
    log "YELLOW" "ROLLBACK COMPLETE — Some services may be unhealthy"
    log "YELLOW" "Check 'docker compose ps' for status"
    log "YELLOW" "Reason: ${REASON}"
    log "YELLOW" "══════════════════════════════════════════════════════════════"
fi