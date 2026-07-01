#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Hermes Enterprise Portal — Container Entrypoint
# Handles:
#   - SIGTERM/SIGINT graceful shutdown
#   - Dependency wait loop
#   - Startup/shutdown logging with timestamps
#   - Sub-process management (supervisord or direct CMD)
# ─────────────────────────────────────────────────────────────────────────────

set -e

SERVICE_NAME="${SERVICE_NAME:-unknown}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-2}"

# ── Log helper ───────────────────────────────────────────────────────────────
log() {
  local level="$1"
  shift
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SERVICE_NAME}] [${level}] $*"
}

# ── Shutdown handler ─────────────────────────────────────────────────────────
_graceful_stop() {
  log "INFO" "Received shutdown signal (SIGTERM/SIGINT). Starting graceful shutdown..."

  # If supervisord is PID 1, it handles its own children
  if [ -n "$SUPERVISORD_PID" ]; then
    log "INFO" "Forwarding signal to supervisord (PID ${SUPERVISORD_PID})..."
    kill -TERM "$SUPERVISORD_PID" 2>/dev/null
    wait "$SUPERVISORD_PID"
  fi

  # If we have a child PID (direct CMD mode), forward signal
  if [ -n "$CHILD_PID" ]; then
    log "INFO" "Forwarding signal to child process (PID ${CHILD_PID})..."
    kill -TERM "$CHILD_PID" 2>/dev/null
    # Give it up to 30s to drain
    for i in $(seq 30); do
      if ! kill -0 "$CHILD_PID" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    # Force kill if still alive
    if kill -0 "$CHILD_PID" 2>/dev/null; then
      log "WARN" "Child process did not exit gracefully. Sending SIGKILL."
      kill -KILL "$CHILD_PID" 2>/dev/null
    fi
  fi

  log "INFO" "Shutdown complete. Goodbye."
  exit 0
}

# ── Trap signals ─────────────────────────────────────────────────────────────
trap _graceful_stop SIGTERM SIGINT

# ── Wait for a TCP port to be available ──────────────────────────────────────
wait_for_port() {
  local host="$1"
  local port="$2"
  local service_label="$3"
  local elapsed=0

  log "INFO" "Waiting for ${service_label} (${host}:${port})..."

  while [ "$elapsed" -lt "$MAX_WAIT_SECONDS" ]; do
    if nc -z "$host" "$port" 2>/dev/null; then
      log "INFO" "${service_label} is ready at ${host}:${port}"
      return 0
    fi
    sleep "$WAIT_INTERVAL"
    elapsed=$((elapsed + WAIT_INTERVAL))
  done

  log "ERROR" "Timed out after ${MAX_WAIT_SECONDS}s waiting for ${service_label}"
  return 1
}

# ── Wait for HTTP endpoint to return 200 ─────────────────────────────────────
wait_for_http() {
  local url="$1"
  local service_label="$2"
  local elapsed=0

  log "INFO" "Waiting for ${service_label} (HTTP: ${url})..."

  while [ "$elapsed" -lt "$MAX_WAIT_SECONDS" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "INFO" "${service_label} is healthy at ${url}"
      return 0
    fi
    sleep "$WAIT_INTERVAL"
    elapsed=$((elapsed + WAIT_INTERVAL))
  done

  log "ERROR" "Timed out after ${MAX_WAIT_SECONDS}s waiting for ${service_label}"
  return 1
}

# ── Main ─────────────────────────────────────────────────────────────────────
log "INFO" "Container starting. Service: ${SERVICE_NAME}"

# Process dependency waits based on env vars
if [ -n "${WAIT_FOR_REDIS:-}" ]; then
  wait_for_port "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" "Redis" || true
fi

if [ -n "${WAIT_FOR_SERVER:-}" ]; then
  wait_for_http "http://${SERVER_HOST:-server}:${SERVER_PORT:-5000}/health" "Server" || true
fi

if [ -n "${WAIT_FOR_GMAPS:-}" ]; then
  wait_for_http "http://${GMAPS_HOST:-gmaps}:${GMAPS_PORT:-8000}/health" "Google Maps Service" || true
fi

# Execute the main command
log "INFO" "Starting main process: $*"

# Run CMD in background so we can trap signals
"$@" &
CHILD_PID=$!

# If supervisord is being started, track its PID separately
if echo "$*" | grep -q "supervisord"; then
  SUPERVISORD_PID=$CHILD_PID
fi

log "INFO" "Process started with PID ${CHILD_PID}"

# Wait for child to finish
wait "$CHILD_PID"
EXIT_CODE=$?

log "INFO" "Process exited with code ${EXIT_CODE}"
exit "$EXIT_CODE"