# Valitek v2 - Gestion de billets IT

A complete IT ticket management and in-shop repair work order system built for Valitek. Three role-based portals (Admin, Technician, Customer), appointment scheduling, quote workflows, Kanban boards, and a full work order lifecycle for in-shop device repairs.

**Production domain:** `ticket.ussyco.de`

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Work Order System](#work-order-system)
- [Ticket System](#ticket-system)
- [Frontend](#frontend)
- [Testing](#testing)
- [Deployment](#deployment)
- [Demo Mode](#demo-mode)
- [Help System](#help-system)

---

## Features

### Ticket Management
- 10-state ticket lifecycle with role-gated transitions
- Quote workflow (send / approve / decline)
- Blocker workflow (add / remove)
- Technician assignment and self-assignment
- Priority levels (Basse, Normale, Haute, Urgente)
- Service categories (9 types) and modes (Sur Route, En Cubicule)
- Kanban board with drag-and-drop status changes

### Work Orders (Bons de Travail)
- 12-state lifecycle for in-shop device repairs
- Intake form with customer search, device details, condition checklist, accessories tracking
- Quote/approval flow with customer portal integration
- Internal and external notes system
- Dashboard with Kanban view, list view, statistics cards, and color-coded age indicators
- Order numbers in `BDT-YYMMNN` format
- Parts tracking, warranty management, data backup consent

### Appointment Scheduling
- Appointment proposals with accept/reject/counter-propose negotiation
- Day schedule view with visual timeline (08:00-18:00)
- Availability and capacity checking
- Travel buffer support for on-site appointments

### Three Role-Based Portals
- **Admin:** Full management dashboard, Kanban board, calendar, client management, technician management, system settings, database backups, work order dashboard
- **Technician:** Ticket queue, schedule view, work order dashboard and intake, ticket detail with inline tools
- **Customer Portal:** Ticket list, ticket detail with appointment proposals, work order status tracking with quote approval

### Additional
- In-app notification system with bell dropdown and navigation to related ticket/WO
- Message threads with internal (staff-only) messages, edit window (5 min), admin-only delete
- Database backup/restore (admin) with transactional restore and confirmation dialog
- Audit logging for ticket, work order, and user changes
- French/English internationalization with language toggle in settings
- Demo mode with persona selector (dropdown for customers) and data reset (admin-only)
- User profile management
- Contextual help system with sidebar, keyboard shortcuts, and 170+ French tooltips

---

## Architecture

```
Browser ──► Caddy (HTTPS + static) ──► Hono API (port 3000)
                │                            │
                │ /api/*  (reverse proxy)     │
                │ /*      (SPA static)        ▼
                │                        PostgreSQL 16
                ▼
          frontend/dist (React SPA)
```

- **Backend:** Pure REST API server. No SSR, no templates. Services throw `AppError`, global error middleware catches.
- **Frontend:** Pure SPA. React Router for client-side routing, TanStack Query for server state.
- **Database:** PostgreSQL 16 with Prisma 6 ORM. 12 models, 14 enums.
- **Proxy (production):** Caddy with auto-HTTPS, security headers, gzip compression.

### Key Design Principles

1. **No Prisma in routes** -- routes call services, services call Prisma
2. **Consistent response envelope** -- all endpoints return `{ data, error: null }` or `{ data: null, error: { message, code } }`
3. **Paginated lists** return `{ data: [...], pagination: { page, limit, total, totalPages } }`
4. **State machine enforcement** -- ticket and work order status transitions are role-gated
5. **French-first** UI with English translation support

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Hono | 4.x |
| Language | TypeScript (strict) | 5.x |
| ORM | Prisma | 6.x |
| Validation | Zod | 3.23 |
| Auth tokens | jose | 5.x |
| Password hashing | hash-wasm (argon2id) | 4.x |
| Logging | pino | 9.x |
| Testing | Vitest | 3.x |
| Build | tsup | 8.x |
| Dev runner | tsx | 4.x |

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Build | Vite | 5.x |
| UI Library | React | 18.x |
| Routing | React Router | 6.x |
| Server State | TanStack Query | 5.x |
| Client State | Zustand | 5.x |
| Forms | react-hook-form + Zod | 7.x |
| Styling | Tailwind CSS + shadcn/ui | 3.4 |
| Drag & Drop | @dnd-kit | 6.x / 8.x |
| Icons | lucide-react | 0.454 |
| Toasts | sonner | 1.7 |
| Dates | date-fns | 4.x |
| Testing | Vitest + Testing Library | 2.x |

---

## Project Structure

```
ticket2/
├── .github/workflows/ci.yml       # CI/CD pipeline (test + build + deploy)
├── .env.example                    # Environment variable template
├── .gitignore
├── Caddyfile                       # Reverse proxy config (production)
├── docker-compose.yml              # Production compose (db + app + caddy)
├── docker-compose.dev.yml          # Development overrides
├── README.md                       # This file
├── newspec.md                      # Original rebuild specification
├── handoff.md                      # Development session handoff notes
│
├── backend/
│   ├── .env                        # Local env vars (not committed)
│   ├── Dockerfile                  # Multi-stage production build
│   ├── docker-entrypoint.sh        # Migration + startup script
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema (12 models, 14 enums)
│   │   └── seed.ts                 # Demo data seeder
│   └── src/
│       ├── index.ts                # App entry, route mounting, middleware
│       ├── lib/
│       │   ├── auth.ts             # JWT create/verify, password hash/verify
│       │   ├── config.ts           # Zod-validated env config
│       │   ├── errors.ts           # AppError class
│       │   ├── logger.ts           # pino logger
│       │   └── prisma.ts           # PrismaClient singleton
│       ├── middleware/
│       │   ├── auth.middleware.ts   # JWT cookie auth + role guards
│       │   ├── csrf.middleware.ts   # Origin header CSRF protection
│       │   ├── error.middleware.ts  # Global error handler
│       │   ├── logging.middleware.ts
│       │   ├── rate-limit.middleware.ts
│       │   └── validate.middleware.ts  # Zod body/query validation
│       ├── routes/
│       │   ├── appointment.routes.ts
│       │   ├── auth.routes.ts
│       │   ├── backup.routes.ts
│       │   ├── config.routes.ts
│       │   ├── demo.routes.ts
│       │   ├── health.routes.ts
│       │   ├── message.routes.ts
│       │   ├── notification.routes.ts
│       │   ├── profile.routes.ts
│       │   ├── technician.routes.ts
│       │   ├── ticket.routes.ts
│       │   ├── user.routes.ts
│       │   └── workorder.routes.ts
│       ├── services/
│       │   ├── audit.service.ts
│       │   ├── backup.service.ts
│       │   ├── email.service.ts
│       │   ├── message.service.ts
│       │   ├── notification.service.ts
│       │   ├── scheduling.service.ts
│       │   ├── sms.service.ts
│       │   ├── ticket.service.ts
│       │   ├── user.service.ts
│       │   └── workorder.service.ts
│       ├── types/
│       │   └── index.ts            # State machines, interfaces, enums
│       └── validations/
│           ├── appointment.ts
│           ├── backup.ts
│           ├── config.ts           # Branding + config value schemas
│           ├── message.ts
│           ├── ticket.ts           # Includes serviceRequestSchema
│           ├── user.ts
│           └── workorder.ts
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts              # Dev proxy /api -> localhost:3200
    ├── vitest.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.js
    └── src/
        ├── main.tsx                # React entry
        ├── App.tsx                 # Router with lazy-loaded routes
        ├── index.css               # Tailwind base styles
        ├── api/
        │   └── client.ts          # Typed fetch wrapper + API namespaces
        ├── types/
        │   └── index.ts           # Frontend TypeScript types
        ├── stores/
        │   ├── auth-store.ts      # Zustand auth state
        │   └── help-store.ts      # Zustand help sidebar state
        ├── hooks/
        │   ├── use-auth.ts        # Auth hook (TanStack Query)
        │   ├── use-page-help.ts   # Route → pageKey mapping + keyboard shortcuts
        │   └── use-toast.ts       # Toast hook
        ├── lib/
        │   ├── constants.ts       # Status/priority labels & colors
        │   ├── help-content.ts    # All help articles (French, ~1100 lines)
        │   ├── utils.ts           # cn(), formatDate, formatCurrency, etc.
        │   └── i18n/
        │       ├── hook.ts        # useTranslation()
        │       ├── provider.tsx   # I18nProvider context
        │       └── locales/
        │           ├── fr.ts      # French translations
        │           └── en.ts      # English translations
        ├── components/
        │   ├── shared/
        │   │   ├── AppSidebar.tsx      # Role-based sidebar navigation
        │   │   ├── DemoBanner.tsx      # Demo mode banner + persona selector
        │   │   ├── HelpSidebar.tsx     # Contextual help slide-out panel
        │   │   ├── HelpTooltip.tsx     # Tooltip convenience wrapper
        │   │   ├── MessageThread.tsx   # Ticket message thread
        │   │   ├── NotificationBell.tsx # In-app notification dropdown
        │   │   └── StatusBadge.tsx     # Status badge (ticket/appointment/workorder)
        │   └── ui/                     # shadcn/ui primitives (18 components)
        └── pages/
            ├── public/
            │   ├── Landing.tsx         # Landing page
            │   ├── Login.tsx           # Login form
            │   └── ServiceRequest.tsx  # Public service request form
            ├── admin/
            │   ├── AdminLayout.tsx     # Admin shell layout
            │   ├── Dashboard.tsx       # Admin dashboard with stats
            │   ├── Tickets.tsx         # Ticket list with filters
            │   ├── TicketDetail.tsx    # Full ticket detail (proposals, calendar, quotes)
            │   ├── KanbanBoard.tsx     # Drag-and-drop Kanban
            │   ├── Calendar.tsx        # Appointment calendar
            │   ├── Clients.tsx         # Customer management
            │   ├── Technicians.tsx     # Technician management + permissions
            │   ├── Settings.tsx        # System configuration
            │   └── Backups.tsx         # Database backup management
            ├── portal/
            │   ├── PortalLayout.tsx    # Customer portal shell
            │   ├── Dashboard.tsx       # Customer dashboard
            │   ├── Tickets.tsx         # Customer ticket list
            │   ├── TicketDetail.tsx    # Ticket detail with proposal negotiation
            │   ├── Appointments.tsx    # Appointment list
            │   ├── WorkOrders.tsx      # Work order list
            │   └── WorkOrderDetail.tsx # Work order detail + quote approval
            ├── technician/
            │   ├── TechLayout.tsx      # Technician shell
            │   ├── Dashboard.tsx       # Technician dashboard
            │   ├── Tickets.tsx         # Ticket queue
            │   ├── TicketDetail.tsx    # Ticket detail with proposals
            │   └── Schedule.tsx        # Technician schedule view
            ├── workorders/             # Shared admin/technician work order pages
            │   ├── WorkOrdersDashboard.tsx  # Kanban + list view + stats
            │   ├── WorkOrderDetail.tsx      # Full detail/edit page
            │   └── WorkOrderIntake.tsx      # 6-section intake form
            └── shared/
                └── Profile.tsx         # User profile page
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (for PostgreSQL)
- npm

### 1. Clone and install

```bash
git clone https://github.com/mojomast/ticket2.git
cd ticket2
```

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Start the database

```bash
# From project root
docker compose -f docker-compose.dev.yml up db -d
```

This starts PostgreSQL 16 on port 5432.

### 3. Configure environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env -- set DATABASE_URL, AUTH_SECRET, etc.
```

Minimal `backend/.env`:
```
DATABASE_URL=postgresql://valitek:yourpassword@localhost:5432/valitek
AUTH_SECRET=your-secret-at-least-32-characters-long
FRONTEND_URL=http://localhost:5173
PORT=3200
DEMO_MODE=true
```

### 4. Set up database

```bash
cd backend

# Push schema to database
npx prisma db push

# Seed demo data
npx prisma db seed
```

### 5. Start development servers

```bash
# Terminal 1 - Backend (port 3200)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

The frontend dev server proxies `/api` requests to `localhost:3200`.

Open `http://localhost:5173` in your browser.

---

## Environment Variables

See `.env.example` for the full template. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS/CSRF (e.g. `http://localhost:5173`) |
| `PORT` | No | Backend port (default: 3000) |
| `DEMO_MODE` | No | Enable demo login/reset (default: false) |
| `LOG_LEVEL` | No | pino log level (default: info) |
| `NODE_ENV` | No | development / production |
| `M365_TENANT_ID` | No | Microsoft 365 tenant for email |
| `M365_CLIENT_ID` | No | Microsoft 365 app client ID |
| `M365_CLIENT_SECRET` | No | Microsoft 365 app secret |
| `M365_SENDER_EMAIL` | No | Email sender address |
| `VOIPMS_USERNAME` | No | VoIP.ms username for SMS |
| `VOIPMS_PASSWORD` | No | VoIP.ms password |
| `VOIPMS_DID` | No | VoIP.ms DID number |

---

## Database

### Schema Overview

**14 enums, 12 models** defined in `backend/prisma/schema.prisma`.

#### Models

| Model | Purpose |
|-------|---------|
| `User` | Users (admin, technician, customer). Permissions stored as JSON. |
| `Ticket` | IT service tickets with 10-state lifecycle |
| `Appointment` | Scheduled appointments linked to tickets |
| `AppointmentProposal` | Negotiated appointment time proposals (self-referencing for threads) |
| `Message` | Ticket messages (supports internal/staff-only) |
| `Notification` | In-app notifications |
| `Attachment` | File attachments on tickets/messages |
| `WorkOrder` | In-shop repair work orders with 12-state lifecycle |
| `WorkOrderNote` | Notes on work orders (internal/external) |
| `SystemConfig` | Key-value system configuration |
| `AuditLog` | Audit trail for entity changes |
| `BackupRecord` | Database backup metadata |

#### Key Enums

| Enum | Values |
|------|--------|
| `UserRole` | CUSTOMER, TECHNICIAN, ADMIN |
| `TicketStatus` | NOUVELLE, EN_ATTENTE_APPROBATION, EN_ATTENTE_REPONSE_CLIENT, APPROUVEE, PLANIFIEE, EN_COURS, BLOCAGE, TERMINEE, FERMEE, ANNULEE |
| `WorkOrderStatus` | RECEPTION, DIAGNOSTIC, ATTENTE_APPROBATION, APPROUVE, ATTENTE_PIECES, EN_REPARATION, VERIFICATION, PRET, REMIS, REFUSE, ABANDONNE, ANNULE |
| `Priority` | BASSE, NORMALE, HAUTE, URGENTE |
| `DeviceType` | LAPTOP, DESKTOP, TABLETTE, TELEPHONE, TOUT_EN_UN, IMPRIMANTE, SERVEUR, RESEAU_EQUIP, AUTRE |
| `DataBackupConsent` | CLIENT_FAIT, ATELIER_FAIT, DECLINE, NON_APPLICABLE |

### Commands

```bash
cd backend

# Push schema changes (dev)
npx prisma db push

# Create migration
npx prisma migrate dev --name description

# Deploy migrations (production)
npx prisma migrate deploy

# Seed demo data
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

---

## API Reference

Base URL: `/api`

All authenticated endpoints require a `valitek-auth` httpOnly cookie (set on login).

### Response Format

```json
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "message": "...", "code": "..." } }

// Paginated
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

### Endpoints

#### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config/branding` | Public branding config |
| GET | `/api/demo/personas` | Demo personas (DEMO_MODE only) |
| POST | `/api/service-request` | Public service request (auto-creates customer) |

#### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/demo-login` | Demo persona login |
| POST | `/api/auth/logout` | Logout (clears cookie) |
| GET | `/api/auth/me` | Current user session |

#### Tickets
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/tickets` | Any | List (paginated, filtered) |
| POST | `/api/tickets` | Any | Create |
| GET | `/api/tickets/:id` | Any | Detail |
| PATCH | `/api/tickets/:id` | Admin, Tech | Update |
| PATCH | `/api/tickets/:id/status` | Per transition | Status change |
| PATCH | `/api/tickets/:id/assign` | Admin | Assign technician |
| POST | `/api/tickets/:id/accept` | Tech | Self-assign |
| POST | `/api/tickets/:id/quote` | Admin, Tech | Send quote |
| POST | `/api/tickets/:id/approve-quote` | Customer, Admin | Approve quote |
| POST | `/api/tickets/:id/decline-quote` | Customer, Admin | Decline quote |
| POST | `/api/tickets/:id/blocker` | Admin, Tech | Add blocker |
| DELETE | `/api/tickets/:id/blocker` | Admin, Tech | Remove blocker |
| GET | `/api/tickets/:id/messages` | Any | List messages |
| POST | `/api/tickets/:id/messages` | Any | Create message |

#### Appointments
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/appointments` | Any | List |
| POST | `/api/appointments` | Any | Create |
| GET | `/api/appointments/availability` | Any | Available time slots |
| GET | `/api/appointments/day-schedule` | Any | Day schedule for calendar |
| GET | `/api/appointments/:id` | Any | Detail |
| PATCH | `/api/appointments/:id` | Admin, Tech | Update |
| DELETE | `/api/appointments/:id` | Admin | Cancel |
| PATCH | `/api/appointments/:id/status` | Admin, Tech | Status change |
| GET | `/api/appointments/proposals` | Any | List proposals |
| POST | `/api/appointments/proposals` | Any | Create proposal |
| PATCH | `/api/appointments/proposals/:id/accept` | Responder | Accept proposal |
| PATCH | `/api/appointments/proposals/:id/reject` | Responder | Reject proposal |
| DELETE | `/api/appointments/proposals/:id` | Author | Cancel proposal |

#### Work Orders
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/workorders` | Any | List |
| POST | `/api/workorders` | Admin, Tech | Create (intake) |
| GET | `/api/workorders/stats` | Admin, Tech | Dashboard statistics |
| GET | `/api/workorders/:id` | Any | Detail |
| PATCH | `/api/workorders/:id` | Admin, Tech | Update |
| DELETE | `/api/workorders/:id` | Admin | Soft-delete |
| PATCH | `/api/workorders/:id/status` | Per transition | Status change |
| POST | `/api/workorders/:id/quote` | Admin, Tech | Send quote |
| POST | `/api/workorders/:id/approve-quote` | Customer | Approve quote |
| POST | `/api/workorders/:id/decline-quote` | Customer | Decline quote |
| GET | `/api/workorders/:id/notes` | Any | List notes |
| POST | `/api/workorders/:id/notes` | Admin, Tech | Add note |

#### Messages
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| PATCH | `/api/messages/:id` | Author | Edit (5-min window) |
| DELETE | `/api/messages/:id` | Admin | Delete |

#### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List own notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |

#### User Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/profile` | Get own profile |
| PATCH | `/api/users/profile` | Update own profile |

#### Admin - User Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users (paginated) |
| POST | `/api/admin/users` | Create user |
| GET | `/api/admin/users/:id` | Get user |
| PATCH | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Soft-delete user |
| PATCH | `/api/admin/users/:id/permissions` | Update technician permissions |

#### Admin - Configuration
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/config` | List all config |
| GET | `/api/admin/config/branding` | Get branding |
| PUT | `/api/admin/config/branding` | Update branding |
| GET | `/api/admin/config/:key` | Get config by key |
| PUT | `/api/admin/config/:key` | Upsert config |

#### Admin - Backups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/backups` | List backups |
| POST | `/api/admin/backups` | Create backup |
| GET | `/api/admin/backups/:id` | Backup detail |
| DELETE | `/api/admin/backups/:id` | Delete backup |
| GET | `/api/admin/backups/:id/download` | Download backup file |
| POST | `/api/admin/backups/:id/restore` | Restore from backup |

#### Other
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/technicians` | Admin, Tech | List active technicians |
| POST | `/api/demo/reset` | Admin | Reset demo data |

---

## Authentication & Authorization

### How It Works

1. User logs in via `POST /api/auth/login` (or `/api/auth/demo-login`)
2. Server creates a JWT using `jose`, sets it as an httpOnly cookie (`valitek-auth`)
3. Cookie settings: `httpOnly`, `secure`, `SameSite=Strict`, `path=/`, 24h expiry
4. Every authenticated request: middleware reads cookie, verifies JWT, checks user still active in DB
5. CSRF protection: middleware validates `Origin` header matches `FRONTEND_URL`

### Auth module

Single file: `backend/src/lib/auth.ts`
- `createToken(user)` -- creates JWT with HS256
- `verifyToken(token)` -- verifies and returns payload
- `hashPassword(password)` -- argon2id via hash-wasm
- `verifyPassword(hash, password)` -- argon2 verification

### Role Guards

```typescript
requireAuth        // Verifies JWT + active user
requireRole('ADMIN')           // Single role
requireRole('ADMIN', 'TECHNICIAN')  // Multiple roles
```

### Technician Permissions

5 boolean flags stored as JSON on the User model:

| Permission | Default | Description |
|-----------|---------|-------------|
| `can_accept_tickets` | false | Self-assign unassigned tickets |
| `can_close_tickets` | false | Close completed tickets |
| `can_send_quotes` | true | Send price quotes to customers |
| `can_cancel_appointments` | false | Cancel scheduled appointments |
| `can_view_all_tickets` | false | See all tickets (not just assigned) |

---

## Work Order System

The work order (Bon de Travail) system handles in-shop device repairs, separate from the ticket system.

### Lifecycle (12 States)

```
RECEPTION --> DIAGNOSTIC --> ATTENTE_APPROBATION --> APPROUVE --> ATTENTE_PIECES --> EN_REPARATION
                                                                                        |
                                                --> REFUSE (terminal)                    v
                                                                                   VERIFICATION --> PRET --> REMIS (terminal)
                                                                                                        --> ABANDONNE (terminal)

Any non-terminal state --> ANNULE (terminal, admin only)
```

**Terminal states:** REMIS (picked up), REFUSE (quote declined), ABANDONNE (abandoned), ANNULE (cancelled)

### Key Features

- **Intake form:** 6-section form -- customer search/autocomplete, device details, condition checklist with toggle switches, accessories list, problem description with consent options, financial estimates
- **Denormalized customer info:** `customerName`/`customerPhone` stored directly for quick display (walk-in customers may not have full accounts)
- **Device tracking:** Type, brand, model, serial, color, password, OS
- **Condition checklist:** JSON `Record<string, boolean>` for flexible per-device checks
- **Accessories:** JSON array of strings
- **Parts used:** JSON array of `{ name, cost, type }`
- **Auto-timestamps:** `completedDate` on PRET/VERIFICATION, `pickupDate` on REMIS, `abandonedDate` on ABANDONNE, `warrantyStartDate` on REMIS
- **Data backup consent:** 4 options -- client does it, shop does it, declined, not applicable
- **Dashboard:** Kanban view with draggable columns, list view with search/filters, stat cards for active/completed/average time

### State Machine

Defined in `backend/src/types/index.ts` as `WO_ALLOWED_TRANSITIONS`. Each transition specifies allowed roles.

---

## Ticket System

### Lifecycle (10 States)

```
NOUVELLE --> EN_ATTENTE_APPROBATION --> APPROUVEE --> PLANIFIEE --> EN_COURS --> TERMINEE --> FERMEE
                |                                                     |
                v                                                     v
         EN_ATTENTE_REPONSE_CLIENT                                 BLOCAGE
                                                                      |
                                                                      v
Any non-terminal state --> ANNULEE (terminal)                      EN_COURS
```

### Quote Workflow

1. Admin/Technician sends quote (`POST /api/tickets/:id/quote`) -- ticket moves to EN_ATTENTE_APPROBATION
2. Customer approves (`POST /api/tickets/:id/approve-quote`) -- ticket moves to APPROUVEE
3. Customer declines (`POST /api/tickets/:id/decline-quote`) -- ticket moves to EN_ATTENTE_REPONSE_CLIENT

### Appointment Proposals

Customers and staff can propose appointment times. Proposals support:
- Accept (auto-creates appointment)
- Reject (with optional message)
- Counter-propose (creates child proposal with new times)

---

## Frontend

### Route Map

All routes use French-language paths. Components are lazy-loaded.

| Path | Page | Role |
|------|------|------|
| `/` | Landing page | Public |
| `/login` | Login form | Public |
| `/demande` | Service request form | Public |
| `/admin` | Admin dashboard | ADMIN |
| `/admin/billets` | Ticket list | ADMIN |
| `/admin/billets/:id` | Ticket detail | ADMIN |
| `/admin/billets/kanban` | Kanban board | ADMIN |
| `/admin/calendrier` | Calendar | ADMIN |
| `/admin/clients` | Client management | ADMIN |
| `/admin/techniciens` | Technician management | ADMIN |
| `/admin/parametres` | System settings | ADMIN |
| `/admin/sauvegardes` | Database backups | ADMIN |
| `/admin/bons-travail` | Work order dashboard | ADMIN |
| `/admin/bons-travail/nouveau` | Work order intake | ADMIN |
| `/admin/bons-travail/:id` | Work order detail | ADMIN |
| `/admin/profil` | Profile | ADMIN |
| `/portail` | Customer dashboard | CUSTOMER |
| `/portail/billets` | Customer tickets | CUSTOMER |
| `/portail/billets/:id` | Ticket detail + proposals | CUSTOMER |
| `/portail/rendez-vous` | Appointments | CUSTOMER |
| `/portail/bons-travail` | Work orders | CUSTOMER |
| `/portail/bons-travail/:id` | Work order detail + quote approval | CUSTOMER |
| `/portail/profil` | Profile | CUSTOMER |
| `/technicien` | Technician dashboard | TECHNICIAN |
| `/technicien/billets` | Ticket queue | TECHNICIAN |
| `/technicien/billets/:id` | Ticket detail + proposals | TECHNICIAN |
| `/technicien/horaire` | Schedule | TECHNICIAN |
| `/technicien/bons-travail` | Work order dashboard | TECHNICIAN |
| `/technicien/bons-travail/nouveau` | Work order intake | TECHNICIAN |
| `/technicien/bons-travail/:id` | Work order detail | TECHNICIAN |
| `/technicien/profil` | Profile | TECHNICIAN |

### Key Frontend Patterns

- **API client** (`src/api/client.ts`): Typed `request<T>()` function reads `json.data` from response envelope. Namespaced API calls (`api.tickets.list()`, `api.workorders.create()`, etc.)
- **Auth hook** (`src/hooks/use-auth.ts`): Single `useAuth()` hook returns `{ user, isLoading, isAuthenticated, logout }`
- **Constants** (`src/lib/constants.ts`): All status labels, colors, and priority mappings in one file
- **StatusBadge** (`src/components/shared/StatusBadge.tsx`): Supports `type="ticket"`, `type="appointment"`, `type="workorder"`
- **TanStack Query keys**: `['tickets']`, `['workorders']`, `['workorders-stats']`, `['portal-workorders']`, `['notifications']`, etc.

---

## Testing

### Backend (83 tests)

```bash
cd backend

# Run tests in watch mode
npm test

# Run tests once (CI)
npm run test:ci

# Type check
npm run lint
```

Test files: `*.test.ts` alongside source files. Tests use Vitest with mocked Prisma client.

Tested modules:
- Auth middleware, validate middleware
- Auth routes, ticket routes
- User service, ticket service, message service, backup service, scheduling service

### Frontend

```bash
cd frontend

# Run tests
npm test

# Type check
npm run lint

# Production build (includes type check)
npm run build
```

Test files: `*.test.ts` / `*.test.tsx` alongside source files. Tests use Vitest + Testing Library (jsdom).

---

## Deployment

### Production (Docker Compose)

```bash
# Build and start all services
docker compose up -d --build

# The stack:
# - db:    PostgreSQL 16 (internal network only, not exposed)
# - app:   Backend API (read-only container, port 3100 -> 3000)
# - caddy: Reverse proxy with auto-HTTPS (ports 80, 443)
```

The backend container runs migrations automatically on startup via `docker-entrypoint.sh`.

Caddy serves the frontend static files from `frontend/dist` and proxies `/api/*` to the backend.

### CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`):

1. **test-backend** -- Lint + test against PostgreSQL 16
2. **test-frontend** -- Lint + build + test
3. **build-and-deploy** (main branch only) -- Build Docker image, push to GHCR, Trivy security scan, deploy via SSH

### Security

- httpOnly, Secure, SameSite=Strict cookies
- CSRF protection via Origin header validation
- argon2id password hashing
- Parameterized queries only (no raw SQL injection vectors)
- Read-only container filesystem in production
- All capabilities dropped (`cap_drop: ALL`)
- Database on internal-only Docker network
- Security headers via Caddy (HSTS, X-Frame-Options DENY, etc.)
- Trivy image scanning in CI

---

## Demo Mode

When `DEMO_MODE=true`:

- Demo login available (`POST /api/auth/demo-login` with email only, no password)
- Demo persona selector shown in UI
- Demo data reset available (admin only)

### Demo Accounts

| Email | Role | Notes |
|-------|------|-------|
| admin@valitek.ca | ADMIN | Full access |
| tech1@valitek.ca | TECHNICIAN | can_view_all_tickets: true |
| tech2@valitek.ca | TECHNICIAN | can_view_all_tickets: false |
| client1@example.com - client25@example.com | CUSTOMER | 25 customers, mix of residential and commercial |

### Demo Banner

The demo banner at the top of the page shows admin and technician personas as buttons, and customer personas in a compact dropdown `<select>` to handle the larger number of customers without overflowing the toolbar.

### Seed Data

The seed creates: 28 users, 30 tickets, 18 appointments, 25 messages, 18 notifications, 36 work orders, 22 work order notes.

Work orders have intentionally varied intake dates (from 0 to 30 days ago) to demonstrate the age indicator feature. All 12 work order statuses and all 9 device types are represented.

```bash
cd backend && npx prisma db seed
```

---

## Help System

A comprehensive contextual help system is built into the frontend, providing role-aware, page-aware documentation and tooltips throughout the application.

### Help Sidebar

A slide-out panel accessible from any authenticated page:

- **Toggle:** Click the `?` button in the header, or press `?` or `F1` on your keyboard
- **Role-aware:** Content adapts based on the current user's role (Admin, Technician, Customer)
- **Page-aware:** Content automatically changes based on the current route
- **Collapsible sections:** Each help article has expandable/collapsible FAQ-style sections
- **Tips section:** Practical tips displayed with a lightbulb icon at the bottom of each article
- **Backdrop overlay:** Click outside the sidebar to close it

### Architecture

| Component | Path | Purpose |
|-----------|------|---------|
| `HelpSidebar` | `frontend/src/components/shared/HelpSidebar.tsx` | Slide-out panel (right, 384px, z-50) |
| `HelpTooltip` | `frontend/src/components/shared/HelpTooltip.tsx` | Convenience wrapper for shadcn Tooltip |
| `help-store` | `frontend/src/stores/help-store.ts` | Zustand store (isOpen, currentPageKey) |
| `use-page-help` | `frontend/src/hooks/use-page-help.ts` | Route-to-pageKey mapping + keyboard shortcuts |
| `help-content` | `frontend/src/lib/help-content.ts` | All help articles (~1100 lines, French) |

### Help Content Coverage

29 page keys covered across all roles:

- **Admin (12):** Dashboard, Tickets, TicketDetail, Kanban, Calendar, Clients, Technicians, Settings, Backups, WorkOrders, WorkOrderIntake, WorkOrderDetail
- **Technician (7):** Dashboard, Tickets, TicketDetail, Schedule, WorkOrders, WorkOrderIntake, WorkOrderDetail
- **Customer (6):** Dashboard, Tickets, TicketDetail, Appointments, WorkOrders, WorkOrderDetail
- **General (4):** Profile, Landing, Login, ServiceRequest

### Tooltips

170+ tooltips added across all pages using the `HelpTooltip` wrapper component. Tooltips are applied to key interactive elements: buttons, dropdowns, status badges, form fields, and navigation elements. All tooltip text is in French.

The `TooltipProvider` (from Radix UI via shadcn) is configured in `main.tsx` with a 300ms delay.

---

## License

Proprietary. All rights reserved.
