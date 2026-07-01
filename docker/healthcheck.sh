#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Hermes Enterprise Portal — Per-Module Health Probe
# Usage: docker/healthcheck.sh <module> [port] [optional_url_path]
#
# Modules:
#   redis     — pings Redis via redis-cli
#   server    — checks Node health endpoint
#   client    — checks nginx static serving
#   gmaps     — checks Python FastAPI health endpoint
#   supervisor— checks supervisord is running
#
# Returns 0 (healthy) or 1 (unhealthy).
# ─────────────────────────────────────────────────────────────────────────────

set -e

MODULE="${1:-}"
PORT="${2:-}"
URL_PATH="${3:-/health}"

# ── Log helper ───────────────────────────────────────────────────────────────
fail() {
  echo "[healthcheck] [${MODULE}] UNHEALTHY: $*" >&2
  exit 1
}

pass() {
  echo "[healthcheck] [${MODULE}] HEALTHY"
  exit 0
}

# ── Validate process is alive ────────────────────────────────────────────────
require_process() {
  local proc_name="$1"
  if ! pgrep -f "$proc_name" >/dev/null 2>&1; then
    fail "Process '${proc_name}' not running"
  fi
}

# ── Check TCP port is listening ──────────────────────────────────────────────
require_port() {
  local port="$1"
  if ! nc -z 127.0.0.1 "$port" 2>/dev/null; then
    fail "Port ${port} not listening"
  fi
}

# ── Check HTTP endpoint returns 2xx ─────────────────────────────────────────
require_http() {
  local url="$1"
  local status
  status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$status" = "000" ]; then
    fail "HTTP ${url} returned no response"
  fi
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    fail "HTTP ${url} returned ${status}"
  fi
}

# ── Check last N lines of log for ERROR/FATAL ────────────────────────────────
check_log_for_errors() {
  local log_file="$1"
  local tail_lines="${2:-10}"
  if [ ! -f "$log_file" ]; then
    return 0  # log file doesn't exist yet — acceptable during startup
  fi
  if tail -"$tail_lines" "$log_file" | grep -qiE '\b(ERROR|FATAL|CRITICAL)\b' >/dev/null 2>&1; then
    fail "Recent log lines contain ERROR/FATAL in ${log_file}"
  fi
}

# ── Module-specific probes ───────────────────────────────────────────────────

case "$MODULE" in

redis)
  require_process "redis-server"
  require_port "${PORT:-6379}"
  # Redis PING
  if ! redis-cli -p "${PORT:-6379}" PING 2>/dev/null | grep -q "PONG"; then
    fail "redis-cli PING did not return PONG"
  fi
  # Check memory usage
  MEM_USAGE=$(redis-cli -p "${PORT:-6379}" INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2)
  pass
  ;;

server)
  require_process "node"
  require_port "${PORT:-5000}"
  # Liveness probe (/livez), NOT readiness (/health): the container restart
  # decision must not depend on Supabase reachability, or a transient DB blip
  # would trigger a restart storm. /health (DB-aware readiness) is used by the
  # load balancer for routing instead.
  require_http "http://127.0.0.1:${PORT:-5000}/livez"
  # Check logs for recent errors
  check_log_for_errors "/var/log/hermes/server.log" 20
  pass
  ;;

client)
  require_process "nginx"
  require_port "${PORT:-80}"
  require_http "http://127.0.0.1:${PORT:-80}/"
  pass
  ;;

gmaps)
  require_process "python"
  require_port "${PORT:-8000}"
  require_http "http://127.0.0.1:${PORT:-8000}/health"
  check_log_for_errors "/var/log/hermes/gmaps.log" 20
  pass
  ;;

supervisor)
  require_process "supervisord"
  # Check supervisor status — all processes should be RUNNING
  if command -v supervisorctl >/dev/null 2>&1; then
    BAD=$(supervisorctl status 2>/dev/null | grep -v "RUNNING" | wc -l)
    if [ "$BAD" -gt 0 ]; then
      fail "supervisorctl reports ${BAD} non-running processes"
    fi
  fi
  pass
  ;;

*)
  echo "[healthcheck] Usage: $0 {redis|server|client|gmaps|supervisor} [port]"
  exit 1
  ;;

esac