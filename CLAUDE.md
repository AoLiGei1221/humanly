# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development (each in separate terminal)
npm run dev:backend      # Express server on port 3001
npm run dev:frontend     # Next.js admin dashboard on port 3000
npm run dev:tracker      # Rollup watch mode for tracker library

# Build
npm run build:all        # Build tracker → backend → frontend
npm run build:backend    # Backend only
npm run build:frontend   # Frontend only
npm run build:tracker    # Tracker only

# Testing
npm test                 # Run tests across all workspaces
npm run test --workspace=@humory/backend  # Backend tests only

# Linting
npm run lint             # Lint all workspaces

# Docker (PostgreSQL + Redis for local dev)
npm run docker:up        # Start services
npm run docker:down      # Stop services
npm run docker:logs      # View logs
```

## Architecture

This is a **text provenance service** that tracks user typing in external forms/surveys. It's a monorepo using npm workspaces with these packages:

- **`@humory/backend`** - Express.js API with Socket.IO (port 3001)
- **`@humory/frontend`** - Next.js 14 admin dashboard (port 3000)
- **`@humory/frontend-user`** - Next.js 14 user portal for documents/certificates (port 3002)
- **`@humory/tracker`** - Lightweight browser library (<15KB) for embedding in external forms
- **`@humory/editor`** - Lexical-based rich text editor with tracking integration
- **`@humory/shared`** - Shared TypeScript types and validators

### Backend Structure (packages/backend/src/)

```
├── controllers/   # Request handlers (8 files)
├── services/      # Business logic (10 files)
├── models/        # Database operations (8 files)
├── routes/        # Express routes (8 files)
├── middleware/    # Auth, rate limiting, error handling
├── websocket/     # Socket.IO handlers for live preview
├── db/migrations/ # SQL migrations (001-004)
└── config/        # Database, Redis, environment
```

Pattern: Controllers → Services → Models (3-tier architecture)

### Frontend Structure (packages/frontend/src/)

Uses Next.js 14 App Router with:
- Zustand for state management
- shadcn/ui + Tailwind CSS for UI
- Socket.IO client for real-time updates
- Recharts for analytics visualization

### Database

PostgreSQL 15 + TimescaleDB (time-series). Key tables:
- `events` - TimescaleDB hypertable partitioned by day
- `sessions` - External user tracking sessions
- `projects` - User projects with tracking tokens
- `documents` / `certificates` - Document provenance system
- `ai_chat_sessions` / `ai_chat_messages` / `ai_interaction_logs` - AI Assistant data

## Key Integrations

- **Qualtrics/Google Forms**: Tracker library embeds via script tag. See `QUALTRICS_INTEGRATION.md`
- **Real-time Live Preview**: Socket.IO events for monitoring active sessions
- **Certificate Generation**: PDFKit + QRCode for authenticity certificates
- **AI Assistant**: Integrated AI chat for document editing assistance (see `docs/AI_ASSISTANT_REQUIREMENTS.md`)

## Environment Setup

1. Copy `.env.example` to `.env` in root
2. Copy `packages/backend/.env.example` to `packages/backend/.env`
3. Copy `packages/frontend/.env.local.example` to `packages/frontend/.env.local`
4. Run `docker-compose up -d postgres redis` for local database

Key env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `AI_PROVIDER`, `AI_API_KEY`

## API Structure

35+ endpoints across 9 groups: `/api/v1/auth/*`, `/api/v1/projects/*`, `/api/v1/track/*`, `/api/v1/projects/:id/analytics/*`, `/api/v1/projects/:id/export/*`, `/api/v1/documents/*`, `/api/v1/certificates/*`, `/api/v1/ai/*`, `/tracker/*` (public)

Health check: `GET /health`

## Relevant Documentation

- `packages/backend/AUTH_IMPLEMENTATION.md` - Auth system details
- `packages/backend/WEBSOCKET.md` - Socket.IO implementation
- `packages/backend/ANALYTICS.md` - Analytics endpoints
- `QUALTRICS_INTEGRATION.md` - External form tracking setup
- `TESTING_GUIDE.md` - Tracker testing with live preview
