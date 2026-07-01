# Hermes Enterprise Portal - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Landing    │  │     Auth      │  │   Dashboard   │          │
│  │    Page      │  │   (Login/     │  │  (Admin/     │          │
│  │              │  │   Signup)     │  │   Client)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  React 18 + Vite + Tailwind CSS + Framer Motion                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Auth      │  │   Business   │  │   WebSocket  │          │
│  │   Routes     │  │    Logic      │  │    Server    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  Node.js + Express.js                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐        │
│  │              Supabase (PostgreSQL)                  │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │        │
│  │  │  auth   │  │ profiles │  │  tables  │        │        │
│  │  │ (users) │  │(metadata)│  │(business)│        │        │
│  │  └──────────┘  └──────────┘  └──────────┘        │        │
│  │                                                      │        │
│  │  Row Level Security (RLS) Policies                 │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Structure

```
client/src/
├── components/
│   ├── admin/              # Admin dashboard components
│   │   ├── layout/         # Admin layout (sidebar, header)
│   │   └── modules/        # Admin feature modules
│   ├── newlanding/         # Landing page sections
│   └── ui/                 # Reusable UI components
├── pages/
│   ├── Admin/              # Admin page routes
│   ├── Client/             # Client page routes
│   └── Components/         # Shared page components
├── config/                 # Configuration files
└── hooks/                  # Custom React hooks
```

### Backend Structure

```
server/
├── routes/                 # API route handlers
├── middleware/             # Express middleware
├── utils/                  # Utility functions
├── config/                 # Server configuration
└── services/               # Business logic services
```

## Authentication Flow

1. User submits signup form
2. Client validates input (client-side)
3. Supabase Auth creates user
4. Database trigger creates profile
5. Email verification sent
6. User verifies email via OTP
7. (Admin only) 2FA verification
8. User redirected to dashboard

## Security Model

### Role Hierarchy

- **SuperAdmin** (Level 4): Full system access
- **Admin** (Level 3): Company + user management
- **User** (Level 2): Standard access
- **Client** (Level 1): Limited access

### Authentication Layers

1. Supabase Auth (JWT)
2. Email Verification (OTP)
3. 2FA (Admin users)
4. RLS Policies (Database level)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Performance Considerations

- Code splitting with lazy loading
- Optimized images and assets
- Database query optimization
- Response caching
- Connection pooling
