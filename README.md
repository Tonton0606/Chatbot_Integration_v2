# Hermes Enterprise Portal

<p align="center">
  <img src="client/public/EXPONIFY_LOGO.png" alt="Hermes Logo" width="200"/>
</p>

<p align="center">
  <strong>AI-Powered Sales & Marketing Automation Platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Features

### 🤖 AI-Powered Automation
- **Intelligent Lead Scoring** - AI-driven lead qualification and prioritization
- **Automated Email Campaigns** - Smart email sequencing with personalization
- **Chatbot Integration** - 24/7 AI customer support and lead capture

### 📊 Analytics & Reporting
- **Real-time Dashboards** - Live metrics and KPI monitoring
- **ROI Tracking** - Comprehensive campaign performance analysis
- **Predictive Analytics** - AI-powered sales forecasting

### 🏢 Enterprise Features
- **Role-Based Access Control** - SuperAdmin, Admin, User, Client hierarchies
- **Multi-tenant Architecture** - Secure data isolation between organizations
- **Audit Logging** - Complete activity tracking for compliance

### 🔐 Security
- **Email Verification** - Secure signup with OTP verification
- **Two-Factor Authentication** - Enhanced security for admin accounts
- **Row Level Security** - Database-level access control with Supabase RLS

---

## Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Router v6** - Client-side routing

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database + Auth
- **Socket.io** - Real-time communication

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **GitHub Actions** - CI/CD automation
- **Nginx** - Reverse proxy & static serving

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (optional)
- Supabase account

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/KaliProton777/HermesV2.git
cd HermesV2

# Install dependencies
make install
# OR manually:
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### 3. Database Setup

Run the SQL migrations in Supabase SQL Editor:

1. `database/migrations/001_initial_setup.sql`
2. `database/migrations/002_rls_policies.sql`
3. `database/migrations/003_security_features.sql`

### 4. Start Development

```bash
# Option 1: Using Makefile (recommended)
make dev

# Option 2: Using Docker
make docker-dev

# Option 3: Manual
npm run dev
```

---

## Project Structure

```
HermesV2/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   └── config/         # Configuration files
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   └── utils/              # Utility functions
├── database/
│   ├── migrations/         # Versioned SQL migrations
│   ├── scripts/            # Utility scripts
│   └── seeds/              # Seed data
├── docker/                 # Docker configurations
├── docs/                   # Documentation
├── scripts/                # Automation scripts
├── .env.example            # Environment template
├── docker-compose.yml      # Production compose
├── docker-compose.override.yml  # Development override
├── Makefile               # Common commands
└── README.md              # This file
```

---

## Available Commands

### Development
```bash
make dev           # Start development servers
make install       # Install all dependencies
make clean         # Clean node_modules and build files
```

### Docker
```bash
make docker-build  # Build production images
make docker-dev    # Start development containers
make docker-up     # Start production containers
make docker-down   # Stop all containers
```

### Code Quality
```bash
make lint          # Run ESLint
make format        # Run Prettier
make test          # Run test suite
```

---

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Database Schema](docs/DATABASE.md)
- [Security Guide](docs/SECURITY.md)

---

## Deployment

### Docker Deployment

```bash
# Build and start production containers
docker-compose up -d

# View logs
docker-compose logs -f

# Update deployment
docker-compose pull && docker-compose up -d
```

### Manual Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions on:
- Render deployment
- Vercel deployment
- Custom server setup

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For support, email support@exponify.ph or join our Slack channel.

---

<p align="center">
  Built with ❤️ by <strong>Exponify PH</strong>
</p>
