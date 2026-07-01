FROM node:20-alpine AS production

WORKDIR /app

# Install Python + Chromium for Google Maps microservice
RUN apk add --no-cache \
    python3 \
    py3-pip \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium-browser \
    PLAYWRIGHT_BROWSERS_PATH=/dev/null \
    PYTHONUNBUFFERED=1

# Install Python deps before copying app code (layer cache)
COPY services/googleMapsLeads/requirements.txt /tmp/gmaps-requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /tmp/gmaps-requirements.txt && \
    rm /tmp/gmaps-requirements.txt

# Install Node deps (production only)
COPY package*.json ./
RUN npm install --production --ignore-scripts

# Copy application source (env files excluded via .dockerignore)
COPY . .

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/services/googleMapsLeads/output && \
    chown -R nodejs:nodejs /app

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health',(r)=>r.statusCode===200?process.exit(0):process.exit(1)).on('error',()=>process.exit(1))"

EXPOSE 5000

CMD ["node", "server.js"]
