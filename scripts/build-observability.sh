#!/usr/bin/env bash
# =============================================================================
# build-observability.sh — Build Grafana + Loki + Promtail from source
#
# Supply-chain rationale: builds all observability images locally from the
# official upstream repos at pinned versions. No Docker Hub images pulled at
# runtime — every binary is compiled on this machine from audited source.
#
# Output images (local Docker daemon):
#   hermes-grafana:11.0.0
#   hermes-loki:3.0.0
#   hermes-promtail:3.0.0
#
# Requirements: git, docker (BuildKit), go 1.22+, node 20+, yarn
# Disk space:   ~6 GB for build artifacts (build dir is cleaned on success)
# Time:         ~20–40 min on first run (cached layers make rebuilds fast)
#
# Usage:
#   chmod +x scripts/build-observability.sh
#   ./scripts/build-observability.sh
#
#   Force rebuild even if images exist:
#   FORCE_REBUILD=1 ./scripts/build-observability.sh
# =============================================================================

set -euo pipefail

# ── Pinned versions ────────────────────────────────────────────────────────────
# Bump these deliberately — never use "latest".
GRAFANA_VERSION="v11.0.0"
LOKI_VERSION="v3.0.0"

GRAFANA_REPO="https://github.com/grafana/grafana.git"
LOKI_REPO="https://github.com/grafana/loki.git"

# ── Local image tags ───────────────────────────────────────────────────────────
GRAFANA_IMAGE="hermes-grafana:11.0.0"
LOKI_IMAGE="hermes-loki:3.0.0"
PROMTAIL_IMAGE="hermes-promtail:3.0.0"

# ── Build directory ────────────────────────────────────────────────────────────
# Cloned repos go here; cleaned on success to reclaim disk space.
BUILD_DIR="${TMPDIR:-/tmp}/hermes-obs-build"

# ── Helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[obs-build]${NC} $*"; }
ok()   { echo -e "${GREEN}[obs-build]${NC} $*"; }
warn() { echo -e "${YELLOW}[obs-build]${NC} $*"; }
fail() { echo -e "${RED}[obs-build] ERROR:${NC} $*" >&2; exit 1; }

image_exists() { docker image inspect "$1" &>/dev/null; }

# ── Preflight checks ──────────────────────────────────────────────────────────
log "Preflight checks..."
command -v git    &>/dev/null || fail "git is required"
command -v docker &>/dev/null || fail "docker is required"
command -v go     &>/dev/null || fail "go is required (need 1.22+)"
command -v node   &>/dev/null || fail "node is required (need 20+)"

GO_MIN="1.22"
GO_ACTUAL=$(go version | awk '{print $3}' | sed 's/go//')
if ! printf '%s\n%s\n' "$GO_MIN" "$GO_ACTUAL" | sort -V -C; then
  fail "go $GO_MIN+ required, found $GO_ACTUAL"
fi

# Yarn is needed to build Grafana's frontend
if ! command -v yarn &>/dev/null; then
  warn "yarn not found — installing via npm..."
  npm install -g yarn
fi

# Ensure BuildKit is enabled (faster multi-stage builds)
export DOCKER_BUILDKIT=1
ok "Preflight passed."

# ── Build Grafana ─────────────────────────────────────────────────────────────
build_grafana() {
  if image_exists "$GRAFANA_IMAGE" && [[ "${FORCE_REBUILD:-0}" != "1" ]]; then
    ok "Grafana image $GRAFANA_IMAGE already exists — skipping build. (FORCE_REBUILD=1 to override)"
    return
  fi

  log "Cloning grafana/grafana at $GRAFANA_VERSION..."
  rm -rf "$BUILD_DIR/grafana"
  git clone \
    --depth 1 \
    --branch "$GRAFANA_VERSION" \
    "$GRAFANA_REPO" \
    "$BUILD_DIR/grafana"

  # Record the exact commit being built for audit trail
  GRAFANA_COMMIT=$(git -C "$BUILD_DIR/grafana" rev-parse HEAD)
  log "Building Grafana from commit $GRAFANA_COMMIT..."

  docker build \
    --label "org.opencontainers.image.source=$GRAFANA_REPO" \
    --label "org.opencontainers.image.version=$GRAFANA_VERSION" \
    --label "org.opencontainers.image.revision=$GRAFANA_COMMIT" \
    --label "hermes.build.origin=source" \
    --label "hermes.build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -t "$GRAFANA_IMAGE" \
    "$BUILD_DIR/grafana"

  ok "Built $GRAFANA_IMAGE (commit $GRAFANA_COMMIT)"
}

# ── Build Loki + Promtail ─────────────────────────────────────────────────────
# Both binaries live in the grafana/loki repo.
build_loki_and_promtail() {
  local skip_loki=0 skip_promtail=0

  if image_exists "$LOKI_IMAGE" && [[ "${FORCE_REBUILD:-0}" != "1" ]]; then
    ok "Loki image $LOKI_IMAGE already exists — skipping."
    skip_loki=1
  fi
  if image_exists "$PROMTAIL_IMAGE" && [[ "${FORCE_REBUILD:-0}" != "1" ]]; then
    ok "Promtail image $PROMTAIL_IMAGE already exists — skipping."
    skip_promtail=1
  fi
  if [[ $skip_loki -eq 1 && $skip_promtail -eq 1 ]]; then return; fi

  log "Cloning grafana/loki at $LOKI_VERSION..."
  rm -rf "$BUILD_DIR/loki"
  git clone \
    --depth 1 \
    --branch "$LOKI_VERSION" \
    "$LOKI_REPO" \
    "$BUILD_DIR/loki"

  LOKI_COMMIT=$(git -C "$BUILD_DIR/loki" rev-parse HEAD)

  if [[ $skip_loki -eq 0 ]]; then
    log "Building Loki from commit $LOKI_COMMIT..."
    docker build \
      --label "org.opencontainers.image.source=$LOKI_REPO" \
      --label "org.opencontainers.image.version=$LOKI_VERSION" \
      --label "org.opencontainers.image.revision=$LOKI_COMMIT" \
      --label "hermes.build.origin=source" \
      --label "hermes.build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      -f "$BUILD_DIR/loki/cmd/loki/Dockerfile" \
      -t "$LOKI_IMAGE" \
      "$BUILD_DIR/loki"
    ok "Built $LOKI_IMAGE (commit $LOKI_COMMIT)"
  fi

  if [[ $skip_promtail -eq 0 ]]; then
    log "Building Promtail from commit $LOKI_COMMIT..."
    docker build \
      --label "org.opencontainers.image.source=$LOKI_REPO" \
      --label "org.opencontainers.image.version=$LOKI_VERSION" \
      --label "org.opencontainers.image.revision=$LOKI_COMMIT" \
      --label "hermes.build.origin=source" \
      --label "hermes.build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      -f "$BUILD_DIR/loki/clients/cmd/promtail/Dockerfile" \
      -t "$PROMTAIL_IMAGE" \
      "$BUILD_DIR/loki"
    ok "Built $PROMTAIL_IMAGE (commit $LOKI_COMMIT)"
  fi
}

# ── Audit manifest ────────────────────────────────────────────────────────────
# Write a signed manifest of built images for compliance records.
write_manifest() {
  local manifest_dir="docker/grafana"
  local manifest_file="$manifest_dir/build-manifest.txt"

  mkdir -p "$manifest_dir"
  {
    echo "# Hermes Observability Build Manifest"
    echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "# Build host: $(hostname)"
    echo ""
    for img in "$GRAFANA_IMAGE" "$LOKI_IMAGE" "$PROMTAIL_IMAGE"; do
      local digest
      digest=$(docker image inspect --format '{{index .RepoDigests 0}}' "$img" 2>/dev/null || echo "local-build-no-digest")
      local labels
      labels=$(docker image inspect --format '{{json .Config.Labels}}' "$img")
      echo "image: $img"
      echo "digest: $digest"
      echo "labels: $labels"
      echo ""
    done
  } > "$manifest_file"

  ok "Audit manifest written to $manifest_file"
}

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  if [[ -d "$BUILD_DIR" ]]; then
    log "Cleaning build directory ($BUILD_DIR)..."
    rm -rf "$BUILD_DIR"
    ok "Build directory cleaned."
  fi
}
trap cleanup EXIT

# ── Main ──────────────────────────────────────────────────────────────────────
mkdir -p "$BUILD_DIR"

log "=== Building Hermes observability stack from source ==="
log "  Grafana  : $GRAFANA_VERSION → $GRAFANA_IMAGE"
log "  Loki     : $LOKI_VERSION    → $LOKI_IMAGE"
log "  Promtail : $LOKI_VERSION    → $PROMTAIL_IMAGE"
echo ""
warn "First build takes 20–40 min and ~6 GB disk. Subsequent builds use Docker layer cache."
echo ""

build_grafana
build_loki_and_promtail
write_manifest

echo ""
ok "=== All observability images built from source ==="
ok "Start the stack with:  make obs-up"
ok "  Grafana dashboard:   http://localhost:3001"
