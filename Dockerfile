# Root Dockerfile — delegates to the proper server image.
# Used by Render.com (render.yaml) which builds from the repo root.
# For local multi-service dev/prod use docker-compose instead.

# ── deps stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    dumb-init

RUN npm install -g pm2@latest && npm cache clean --force

ENV PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium-browser \
    PLAYWRIGHT_BROWSERS_PATH=/dev/null \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    PORT=5000

COPY server/services/googleMapsLeads/requirements.txt /tmp/gmaps-requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /tmp/gmaps-requirements.txt && \
    rm /tmp/gmaps-requirements.txt

COPY --from=deps /app/node_modules ./node_modules
COPY server/ .
COPY docker/pm2.config.js ./pm2.config.js

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/services/googleMapsLeads/output /home/nodejs/.pm2 && \
    chown -R nodejs:nodejs /app /home/nodejs/.pm2

USER nodejs

# Liveness, not readiness: restart decisions must not hinge on DB reachability
# (a Supabase blip shouldn't restart the container). /health remains the
# DB-aware readiness check for load-balancer routing.
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=5 \
    CMD curl -sf http://localhost:5000/livez || exit 1

EXPOSE 5000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pm2-runtime", "pm2.config.js"]
