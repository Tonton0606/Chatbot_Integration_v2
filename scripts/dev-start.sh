#!/bin/bash

# Hermes Enterprise Portal - Development Start Script
# Starts both client and server in development mode

set -e

echo "🚀 Starting Hermes Enterprise Portal (Development Mode)"
echo "======================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if concurrently is available
if ! command -v concurrently &> /dev/null; then
    echo -e "${YELLOW}⚠️  'concurrently' not found globally. Installing...${NC}"
    npm install -g concurrently
fi

# Check environment file
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "   Run 'make install' or 'cp .env.example .env' first"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down development servers...${NC}"
    echo "   Thanks for using Hermes Enterprise Portal!"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Starting servers...${NC}"
echo "   Client: http://localhost:5173"
echo "   Server: http://localhost:5000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Start both servers using concurrently
concurrently \
    --prefix "[{name}]" \
    --names "CLIENT,SERVER" \
    --prefix-colors "bgBlue.bold,bgGreen.bold" \
    "cd client && npm run dev" \
    "cd server && npm run dev"
