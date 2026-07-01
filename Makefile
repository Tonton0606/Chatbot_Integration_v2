# Hermes Enterprise Portal - Makefile
# Standardized commands for development, building, and deployment

.PHONY: help install dev build clean docker-build docker-dev docker-up docker-down lint format test

# Default target
help:
	@echo "Hermes Enterprise Portal - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install       Install all dependencies"
	@echo "  make dev          Start development servers (client + server)"
	@echo "  make dev-client   Start client development server only"
	@echo "  make dev-server   Start server development server only"
	@echo ""
	@echo "Building:"
	@echo "  make build        Build production client"
	@echo "  make build-client Build client only"
	@echo "  make build-server Build server only"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build Build production Docker images"
	@echo "  make docker-dev   Start development containers with hot reload"
	@echo "  make docker-up    Start production containers"
	@echo "  make docker-down  Stop all containers"
	@echo "  make docker-logs  View container logs"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         Run ESLint on all code"
	@echo "  make format       Run Prettier to format code"
	@echo "  make test         Run test suite"
	@echo ""
	@echo "Observability (built from source — no Docker Hub):"
	@echo "  make obs-build     Build Grafana + Loki + Promtail from source"
	@echo "  make obs-build-force  Force rebuild all observability images"
	@echo "  make obs-up        Start Grafana dashboard (localhost:3001)"
	@echo "  make obs-down      Stop observability sidecar"
	@echo "  make obs-status    Show build audit info for observability images"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        Clean node_modules and build files"
	@echo "  make reset        Full reset (clean + install)"

# Development
install:
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing client dependencies..."
	cd client && npm install
	@echo "Installing server dependencies..."
	cd server && npm install
	@echo "✅ All dependencies installed!"

dev:
	@echo "Starting development servers..."
	npm run dev

dev-client:
	@echo "Starting client development server..."
	cd client && npm run dev

dev-server:
	@echo "Starting server development server..."
	cd server && npm run dev

# Building
build: build-client

build-client:
	@echo "Building client for production..."
	cd client && npm run build
	@echo "✅ Client build complete!"

build-server:
	@echo "Server doesn't require build step (Node.js)"
	@echo "✅ Server ready!"

# Docker
docker-build:
	@echo "Building production Docker images..."
	docker compose -f docker-compose.yml build --no-cache
	@echo "✅ Docker images built!"

docker-build-fast:
	@echo "Building Docker images (with cache)..."
	docker compose -f docker-compose.yml build
	@echo "✅ Docker images built!"

docker-dev:
	@echo "Starting development containers (hot-reload)..."
	docker compose up -d
	@echo "✅ Development containers started!"
	@echo "  Client (Vite):  http://localhost:5173"
	@echo "  Server (API):   http://localhost:5000"
	@echo "  Redis:          localhost:6379"

docker-up:
	@echo "Starting production containers..."
	docker compose -f docker-compose.yml up -d
	@echo "✅ Production containers started!"
	@echo "  Application:    http://localhost"
	@echo "  Health check:   http://localhost/health"

docker-ps:
	docker compose ps

docker-logs:
	docker compose logs -f

docker-logs-server:
	docker compose logs -f server

docker-logs-client:
	docker compose logs -f client

docker-down:
	@echo "Stopping containers..."
	docker-compose down
	@echo "✅ Containers stopped!"

docker-logs:
	@echo "Showing container logs (Ctrl+C to exit)..."
	docker-compose logs -f

docker-clean:
	@echo "Removing containers and images..."
	docker-compose down -v --rmi all
	@echo "✅ Docker cleaned!"

# Code Quality
lint:
	@echo "Running ESLint..."
	cd client && npm run lint
	@echo "✅ Linting complete!"

format:
	@echo "Running Prettier..."
	cd client && npm run format
	@echo "✅ Formatting complete!"

test:
	@echo "Running tests..."
	cd client && npm test
	@echo "✅ Tests complete!"

# Maintenance
clean:
	@echo "Cleaning node_modules and build files..."
	rm -rf node_modules
	rm -rf client/node_modules
	rm -rf server/node_modules
	rm -rf client/dist
	@echo "✅ Clean complete!"

reset: clean install
	@echo "✅ Full reset complete!"

# Observability (Grafana + Loki + Promtail — built from source)
obs-build:
	@echo "Building observability images from source (Grafana v11.0.0, Loki v3.0.0)..."
	@echo "First build: ~20-40 min, ~6 GB disk. Subsequent builds use Docker layer cache."
	./scripts/build-observability.sh
	@echo "✅ Observability images built from source!"

obs-build-force:
	@echo "Force-rebuilding all observability images from source..."
	FORCE_REBUILD=1 ./scripts/build-observability.sh
	@echo "✅ Observability images rebuilt!"

obs-up:
	@if ! docker image inspect hermes-grafana:11.0.0 &>/dev/null; then \
		echo "⚠️  hermes-grafana:11.0.0 not found. Run 'make obs-build' first."; exit 1; \
	fi
	@echo "Starting observability sidecar (Loki + Promtail + Grafana)..."
	docker compose up -d loki promtail grafana
	@echo "✅ Observability stack started!"
	@echo "  Grafana dashboard:  http://localhost:3001"
	@echo "  Login:              admin / hermesdev"

obs-down:
	@echo "Stopping observability sidecar..."
	docker compose stop loki promtail grafana
	@echo "✅ Observability stack stopped."

obs-logs:
	docker compose logs -f loki promtail grafana

obs-status:
	@echo "=== Observability Image Audit ==="
	@for img in hermes-grafana:11.0.0 hermes-loki:3.0.0 hermes-promtail:3.0.0; do \
		if docker image inspect $$img &>/dev/null; then \
			echo "✅ $$img"; \
			docker image inspect $$img --format '   built: {{index .Config.Labels "hermes.build.date"}}  commit: {{index .Config.Labels "org.opencontainers.image.revision"}}'; \
		else \
			echo "❌ $$img — not built"; \
		fi; \
	done

# Database
db-migrate:
	@echo "Running database migrations..."
	@echo "Please run SQL files in Supabase SQL Editor in order:"
	@ls -1 database/migrations/*.sql | sed 's/^/  - /'

db-migrate-ai:
	@echo "Apply AI layer migrations (044-048) in Supabase SQL Editor:"
	@echo "  - database/migrations/044_ai_chatbot_settings.sql"
	@echo "  - database/migrations/045_ai_chatbot_analytics.sql"
	@echo "  - database/migrations/046_ai_voice_command_settings.sql"
	@echo "  - database/migrations/047_chat_head_settings.sql"
	@echo "  - database/migrations/048_ai_tts_settings.sql"

db-seed:
	@echo "Seeding database..."
	@echo "Please run seed files in Supabase SQL Editor:"
	@echo "  - database/seeds/initial_data.sql"

# Deployment
deploy-staging:
	@echo "Deploying to staging..."
	@echo "Run deployment scripts here"

deploy-production:
	@echo "Deploying to production..."
	@echo "Run deployment scripts here"
