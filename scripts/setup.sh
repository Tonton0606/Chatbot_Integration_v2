#!/bin/bash

# Hermes Enterprise Portal - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Hermes Enterprise Portal - Setup Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 20+ first.${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Check Node version is 20+
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${YELLOW}⚠️  Node.js version should be 20 or higher${NC}"
    echo "   Current version: $NODE_VERSION"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Docker is installed (optional)
echo ""
echo -e "${BLUE}Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker installed: $DOCKER_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not installed (optional, for containerized development)${NC}"
fi

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"

# Root dependencies
echo -e "${BLUE}Installing root dependencies...${NC}"
npm install

# Client dependencies
echo -e "${BLUE}Installing client dependencies...${NC}"
cd client
npm install
cd ..

# Server dependencies
echo -e "${BLUE}Installing server dependencies...${NC}"
cd server
npm install
cd ..

echo -e "${GREEN}✅ All dependencies installed!${NC}"

# Create .env file if it doesn't exist
echo ""
echo -e "${BLUE}Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env with your actual credentials${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Create server .env if it doesn't exist (server loads .env from its own directory)
if [ ! -f server/.env ]; then
    cp .env.example server/.env 2>/dev/null || echo -e "${YELLOW}⚠️  No root .env.example found${NC}"
fi

# Create client .env if it doesn't exist
if [ ! -f client/.env ]; then
    cp .env.example client/.env 2>/dev/null || cp client/.env.example client/.env 2>/dev/null || echo -e "${YELLOW}⚠️  No client/.env.example found${NC}"
fi

# Create necessary directories
echo ""
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p logs
mkdir -p tmp
mkdir -p database/backups

echo -e "${GREEN}✅ Directories created${NC}"

# Git hooks setup (optional)
echo ""
echo -e "${BLUE}Setting up Git hooks...${NC}"
if [ -d .git ]; then
    # Check if husky is installed
    if npm list husky &>/dev/null; then
        npx husky install
        echo -e "${GREEN}✅ Git hooks configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Husky not installed, skipping Git hooks${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not a Git repository, skipping Git hooks${NC}"
fi

# Final instructions
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}Configure environment:${NC}"
echo "   Edit .env file with your Supabase credentials"
echo ""
echo "2. ${YELLOW}Set up database:${NC}"
echo "   Run SQL migrations in Supabase SQL Editor in order:"
ls -1 database/migrations/*.sql | sed 's/^/   - /'
echo ""
echo "3. ${YELLOW}Start development server:${NC}"
echo "   make dev"
echo "   OR"
echo "   npm run dev"
echo ""
echo "4. ${YELLOW}Open in browser:${NC}"
echo "   http://localhost:5173"
echo ""
echo "Documentation:"
echo "   README.md - Project overview"
echo "   docs/     - Detailed documentation"
echo "   Makefile  - Available commands"
echo ""
echo "Need help? Check the documentation or contact support."
echo ""
