# Valitek v2 - Gestion de billets IT

A complete IT ticket management and in-shop repair work order system built for Valitek. Three role-based portals (Admin, Technician, Customer), appointment scheduling, quote workflows, Kanban boards, a full work order lifecycle for in-shop device repairs, technician worksheets with PDF generation, a knowledge base, and customer notes.

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
- [Worksheet System](#worksheet-system)
- [Ticket System](#ticket-system)
- [Knowledge Base](#knowledge-base)
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

### Worksheet System (Feuilles de Travail)
- 6-state lifecycle: Brouillon → Soumise → Révisée → Approuvée → Facturée (+ Annulée)
- Links to work orders or tickets
- Labor time tracking with start/stop timers, break minutes, labor types (6 types)
- Parts used with supplier cost, quantity, unit price, warranty tracking
- Travel entries with distance, rate per km, addresses
- 4 note types: Interne, Visible Client, Diagnostic Finding, Procédure
- Follow-up reminders (5 types) with hourly scheduler and notification delivery
- Tech and customer signature capture (base64)
- PDF generation via pdf-lib with labor/parts/travel tables and signatures
- Automatic financial total recalculation on every mutation
- Notes-to-KB integration (create knowledge base article from diagnostic findings)
- Admin worksheet configuration (hourly rates, travel rates, section toggles via SystemConfig)
- High-value worksheet alerts (configurable threshold, triggers admin notification)

### Knowledge Base (Base de Connaissances)
- Article management with Markdown content, categories (6), tags, and slugs
- Visibility control: internal (staff-only) or public
- Entity linking: link articles to tickets, work orders, or customers
- Soft-delete with unique slug handling
- Created from worksheet diagnostic notes or manually

### Customer Notes (Notes Client)
- Per-customer notes created by staff (admin/technician)
- Pin/unpin important notes
- Displayed on client detail page
- Soft-delete support

### Appointment Scheduling
- Appointment proposals with accept/reject/counter-propose negotiation
- Day schedule view with visual timeline (08:00-18:00)
- Availability and capacity checking
- Travel buffer support for on-site appointments

### Three Role-Based Portals
- **Admin:** Full management dashboard, Kanban board, calendar, client management (with customer notes and detail), technician management, knowledge base, worksheets (review/approve), system settings (including worksheet config), database backups, work order dashboard
- **Technician:** Ticket queue, schedule view (with follow-up reminders), work order dashboard and intake, worksheets (create/edit/submit), ticket detail with inline tools
- **Customer Portal:** Ticket list, ticket detail with appointment proposals, work order status tracking with quote approval, worksheet viewing

### Additional
- In-app notification system with bell dropdown and navigation to related ticket/WO
- Email notifications via Microsoft 365 Graph API (ticket events, quote sent, tech assigned, messages, WO events, worksheet submitted/approved, follow-up reminders)
- SMS notifications via VoIP.ms (quote sent, WO ready for pickup, appointment confirmed)
- Message threads with internal (staff-only) messages, edit window (5 min), admin-only delete
- File attachments on tickets (drag-and-drop upload, download, delete) with 10MB limit and MIME validation
- Database backup/restore (admin) with transactional restore and confirmation dialog
- UI polish pass: inline form validation feedback, empty states for sparse views, responsive worksheet/backups tables, aria-label coverage for icon-only controls, reusable confirmation dialogs for destructive actions
- Review hardening pass: ticket attachment/message authorization checks, appointment access validation, stricter scheduling chronology rules, safer demo reset logout, and worksheet enum/signature alignment
- Audit logging for ticket, work order, and user changes
- Full French/English internationalization (~1400 translation keys) wired into all 38 pages
- Demo mode with persona selector (dropdown for customers) and data reset (admin-only)
- User profile management with password change
- Contextual help system with sidebar, keyboard shortcuts, and 170+ French tooltips
- Follow-up reminder scheduler (runs hourly, sends notifications for due follow-ups)

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
- **Database:** PostgreSQL 16 with Prisma 6 ORM. 21 models, 21 enums.
- **Proxy (production):** Caddy with auto-HTTPS, security headers, gzip compression.

### Key Design Principles

1. **No Prisma in routes** -- routes call services, services call Prisma
2. **Consistent response envelope** -- all endpoints return `{ data, error: null }` or `{ data: null, error: { message, code } }`
3. **Paginated lists** return `{ data: [...], pagination: { page, limit, total, totalPages } }`
4. **State machine enforcement** -- ticket, work order, and worksheet status transitions are role-gated
5. **French-first** UI with English translation support
6. **Transactional mutations** -- financial and multi-table operations wrapped in `prisma.$transaction()`

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
| PDF generation | pdf-lib | 1.17 |
| Logging | pino | 9.x |
| Testing | Vitest | 3.x |
| Build | tsup | 8.x |
| Dev runner | tsx | 4.x |

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Build | Vite | 5.4 |
| UI Library | React | 18.3 |
| Routing | React Router | 6.27 |
| Server State | TanStack Query | 5.59 |
| Client State | Zustand | 5.x |
| Forms | react-hook-form + Zod | 7.53 |
| Styling | Tailwind CSS + shadcn/ui | 3.4 |
| Drag & Drop | @dnd-kit | 6.x / 8.x |
| Icons | lucide-react | 0.454 |
| Toasts | sonner | 1.7 |
| Dates | date-fns | 4.1 |
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
│   │   ├── schema.prisma           # Database schema (21 models, 21 enums)
│   │   └── seed.ts                 # Demo data seeder
│   └── src/
│       ├── index.ts                # App entry, route mounting, middleware, follow-up scheduler
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
│       │   ├── attachment.routes.ts
│       │   ├── auth.routes.ts
│       │   ├── backup.routes.ts
│       │   ├── config.routes.ts
│       │   ├── customer-note.routes.ts
│       │   ├── demo.routes.ts
│       │   ├── health.routes.ts
│       │   ├── knowledgebase.routes.ts
│       │   ├── message.routes.ts
│       │   ├── notification.routes.ts
│       │   ├── profile.routes.ts
│       │   ├── service-request.routes.ts
│       │   ├── technician.routes.ts
│       │   ├── ticket.routes.ts
│       │   ├── user.routes.ts
│       │   ├── workorder.routes.ts
│       │   └── worksheet.routes.ts
│       ├── services/
│       │   ├── attachment.service.ts
│       │   ├── audit.service.ts
│       │   ├── backup.service.ts
│       │   ├── customer-note.service.ts
│       │   ├── email.service.ts
│       │   ├── followup-reminder.service.ts
│       │   ├── knowledgebase.service.ts
│       │   ├── message.service.ts
│       │   ├── notification.service.ts
│       │   ├── scheduling.service.ts
│       │   ├── sms.service.ts
│       │   ├── ticket.service.ts
│       │   ├── user.service.ts
│       │   ├── workorder.service.ts
│       │   ├── worksheet.service.ts
│       │   └── worksheet-pdf.service.ts
│       ├── types/
│       │   └── index.ts            # State machines, interfaces, enums
│       └── validations/
│           ├── appointment.ts
│           ├── backup.ts
│           ├── config.ts           # Branding + config value schemas
│           ├── knowledgebase.ts    # KB articles, links, customer notes
│           ├── message.ts
│           ├── ticket.ts           # Includes serviceRequestSchema
│           ├── user.ts
│           ├── workorder.ts
│           └── worksheet.ts        # Worksheet, labor, parts, travel, notes, follow-ups, signatures
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
        │       └── locales/
        │           ├── fr.ts      # French translations (~1400 keys)
        │           └── en.ts      # English translations (~1400 keys)
        ├── components/
        │   ├── shared/
        │   │   ├── AppSidebar.tsx      # Role-based sidebar navigation
        │   │   ├── AttachmentSection.tsx # Drag-drop file upload/download/delete
        │   │   ├── ConfirmDialog.tsx   # Reusable confirmation dialog for destructive actions
        │   │   ├── DemoBanner.tsx      # Demo mode banner + persona selector
        │   │   ├── FileViewer.tsx      # File preview component
        │   │   ├── HelpSidebar.tsx     # Contextual help slide-out panel
        │   │   ├── HelpTooltip.tsx     # Tooltip convenience wrapper
        │   │   ├── MessageThread.tsx   # Ticket message thread
        │   │   ├── NotificationBell.tsx # In-app notification dropdown
        │   │   ├── SignaturePad.tsx    # Signature capture component
        │   │   └── StatusBadge.tsx     # Status badge (ticket/appointment/workorder)
        │   └── ui/                     # shadcn/ui primitives (incl. AlertDialog)
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
            │   ├── ClientDetail.tsx    # Client detail with notes and history
            │   ├── Technicians.tsx     # Technician management + permissions
            │   ├── KnowledgeBase.tsx   # KB article list, search, categories
            │   ├── KbArticleDetail.tsx # KB article view/edit with entity links
            │   ├── Settings.tsx        # System configuration (incl. worksheet config)
            │   ├── Backups.tsx         # Database backup management
            │   ├── Worksheets.tsx      # Worksheet list (review queue)
            │   └── WorksheetDetail.tsx # Worksheet detail (review/approve)
            ├── portal/
            │   ├── PortalLayout.tsx    # Customer portal shell
            │   ├── Dashboard.tsx       # Customer dashboard
            │   ├── Tickets.tsx         # Customer ticket list
            │   ├── TicketDetail.tsx    # Ticket detail with proposal negotiation
            │   ├── Appointments.tsx    # Appointment list
            │   ├── WorkOrders.tsx      # Work order list
            │   ├── WorkOrderDetail.tsx # Work order detail + quote approval
            │   ├── Worksheets.tsx      # Worksheet list (customer view)
            │   └── WorksheetDetail.tsx # Worksheet detail (customer view)
            ├── technician/
            │   ├── TechLayout.tsx      # Technician shell
            │   ├── Dashboard.tsx       # Technician dashboard
            │   ├── Tickets.tsx         # Ticket queue
            │   ├── TicketDetail.tsx    # Ticket detail with proposals
            │   ├── Schedule.tsx        # Technician schedule view + follow-ups
            │   ├── Worksheets.tsx      # Worksheet list (own worksheets)
            │   └── WorksheetDetail.tsx # Worksheet detail (create/edit/submit)
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

This starts PostgreSQL 16 on port **5433** (mapped from container port 5432).

> **Note:** The dev compose exposes the DB on the host at port 5432 by default in `docker-compose.dev.yml`. If you use a custom port (e.g. 5433), update your `DATABASE_URL` accordingly.

### 3. Configure environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env -- set DATABASE_URL, AUTH_SECRET, PORT, etc.
```

Minimal `backend/.env` for local development:
```
DATABASE_URL=postgresql://valitek:yourpassword@localhost:5433/valitek
AUTH_SECRET=your-secret-at-least-32-characters-long
FRONTEND_URL=http://localhost:5173
PORT=3200
DEMO_MODE=true
```

### 4. Set up database

```bash
cd backend

# Push schema to database (no migration history needed for dev)
npx prisma db push

# Seed demo data
npx prisma db seed
```

> **Important:** This project uses `prisma db push` for schema synchronization, not `prisma migrate dev`. There is no migration history.

### 5. Start development servers

You can use separate terminals or `screen` sessions:

```bash
# Terminal 1 - Backend (port 3200)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

Using `screen` (recommended for persistent sessions):
```bash
screen -S valitek-backend -d -m bash -c "cd backend && npm run dev"
screen -S valitek-frontend -d -m bash -c "cd frontend && npm run dev"
```

The frontend Vite dev server proxies `/api` requests to `localhost:3200`.

Open `http://localhost:5173` in your browser.

---

## Environment Variables

See `.env.example` for the full template. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS/CSRF (e.g. `http://localhost:5173`) |
| `PORT` | No | Backend port (default: 3000, dev typically uses 3200) |
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

**21 enums, 21 models** defined in `backend/prisma/schema.prisma`.

#### Models

| Model | Purpose |
|-------|---------|
| `User` | Users (admin, technician, customer). Permissions stored as JSON. |
| `Ticket` | IT service tickets with 10-state lifecycle |
| `Appointment` | Scheduled appointments linked to tickets |
| `AppointmentProposal` | Negotiated appointment time proposals (self-referencing for threads) |
| `Message` | Ticket messages (supports internal/staff-only) |
| `Notification` | In-app notifications (21 notification types) |
| `Attachment` | File attachments on tickets/messages |
| `WorkOrder` | In-shop repair work orders with 12-state lifecycle |
| `WorkOrderNote` | Notes on work orders (internal/external) |
| `KbArticle` | Knowledge base articles with Markdown content, categories, tags, visibility |
| `KbArticleLink` | Links between KB articles and entities (tickets, work orders, customers) |
| `CustomerNote` | Per-customer staff notes with pin support |
| `Worksheet` | Technician work logs with 6-state lifecycle, signatures, totals |
| `LaborEntry` | Labor time entries on worksheets (start/stop timer, hourly rate, labor type) |
| `PartUsed` | Parts used on worksheets (supplier cost, unit price, warranty) |
| `TravelEntry` | Travel entries on worksheets (distance, rate per km, addresses) |
| `WorksheetNote` | Notes on worksheets (4 types: internal, client-visible, diagnostic, procedure) |
| `FollowUp` | Follow-up reminders on worksheets (5 types, hourly scheduler) |
| `SystemConfig` | Key-value system configuration |
| `AuditLog` | Audit trail for entity changes |
| `BackupRecord` | Database backup metadata |

#### Key Enums

| Enum | Values |
|------|--------|
| `UserRole` | CUSTOMER, TECHNICIAN, ADMIN |
| `TicketStatus` | NOUVELLE, EN_ATTENTE_APPROBATION, EN_ATTENTE_REPONSE_CLIENT, APPROUVEE, PLANIFIEE, EN_COURS, BLOCAGE, TERMINEE, FERMEE, ANNULEE |
| `WorkOrderStatus` | RECEPTION, DIAGNOSTIC, ATTENTE_APPROBATION, APPROUVE, ATTENTE_PIECES, EN_REPARATION, VERIFICATION, PRET, REMIS, REFUSE, ABANDONNE, ANNULE |
| `WorksheetStatus` | BROUILLON, SOUMISE, REVISEE, APPROUVEE, FACTUREE, ANNULEE |
| `LaborType` | DIAGNOSTIC, REPARATION, INSTALLATION, CONSULTATION, GARANTIE, REPRISE |
| `WorksheetNoteType` | INTERNE, VISIBLE_CLIENT, DIAGNOSTIC_FINDING, PROCEDURE |
| `FollowUpType` | VERIFICATION_GARANTIE, RAPPEL_CLIENT, REVERIFICATION, ARRIVEE_PIECES, SUIVI_DEVIS |
| `KbCategory` | MATERIEL, LOGICIEL, RESEAU, PROCEDURE, FAQ, AUTRE |
| `KbVisibility` | INTERNAL, PUBLIC |
| `KbLinkEntityType` | TICKET, WORKORDER, CUSTOMER |
| `Priority` | BASSE, NORMALE, HAUTE, URGENTE |
| `DeviceType` | LAPTOP, DESKTOP, TABLETTE, TELEPHONE, TOUT_EN_UN, IMPRIMANTE, SERVEUR, RESEAU_EQUIP, AUTRE |
| `DataBackupConsent` | CLIENT_FAIT, ATELIER_FAIT, DECLINE, NON_APPLICABLE |
| `AppointmentStatus` | DEMANDE, PLANIFIE, CONFIRME, EN_COURS, TERMINE, ANNULE |
| `ProposalStatus` | PROPOSEE, ACCEPTEE, REFUSEE, ANNULEE |
| `NotificationType` | 21 types (ticket, appointment, WO, worksheet, follow-up events) |
| `BackupStatus` | PENDING, COMPLETED, FAILED, RESTORED |
| `BackupType` | FULL, PARTIAL |
| `CustomerType` | RESIDENTIAL, COMMERCIAL |
| `ServiceMode` | SUR_ROUTE, EN_CUBICULE |
| `ServiceCategory` | REPARATION, LOGICIEL, RESEAU, DONNEES, INSTALLATION, MAINTENANCE, CONSULTATION, FORMATION, AUTRE |

### Commands

```bash
cd backend

# Push schema changes (dev — no migration history)
npx prisma db push

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

#### Worksheets
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/worksheets` | Any | List (filtered by role) |
| POST | `/api/worksheets` | Admin, Tech | Create worksheet |
| GET | `/api/worksheets/follow-ups/schedule` | Admin, Tech | Follow-ups for schedule view |
| GET | `/api/worksheets/:id` | Any | Detail (internal notes hidden from customers) |
| PATCH | `/api/worksheets/:id` | Admin, Tech | Update |
| DELETE | `/api/worksheets/:id` | Admin | Soft-delete |
| PATCH | `/api/worksheets/:id/status` | Admin, Tech | Status change (6-state lifecycle) |
| GET | `/api/worksheets/:id/pdf` | Any | Generate PDF |
| POST | `/api/worksheets/:id/labor` | Admin, Tech | Add labor entry |
| PATCH | `/api/worksheets/:id/labor/:entryId` | Admin, Tech | Update labor entry |
| DELETE | `/api/worksheets/:id/labor/:entryId` | Admin, Tech | Delete labor entry |
| POST | `/api/worksheets/:id/labor/:entryId/stop` | Admin, Tech | Stop labor timer |
| POST | `/api/worksheets/:id/parts` | Admin, Tech | Add part used |
| PATCH | `/api/worksheets/:id/parts/:partId` | Admin, Tech | Update part |
| DELETE | `/api/worksheets/:id/parts/:partId` | Admin, Tech | Delete part |
| POST | `/api/worksheets/:id/travel` | Admin, Tech | Add travel entry |
| PATCH | `/api/worksheets/:id/travel/:entryId` | Admin, Tech | Update travel entry |
| DELETE | `/api/worksheets/:id/travel/:entryId` | Admin, Tech | Delete travel entry |
| POST | `/api/worksheets/:id/notes` | Admin, Tech | Add note |
| DELETE | `/api/worksheets/:id/notes/:noteId` | Admin, Tech | Delete note |
| POST | `/api/worksheets/:id/notes/:noteId/to-kb` | Admin, Tech | Create KB article from note |
| POST | `/api/worksheets/:id/follow-ups` | Admin, Tech | Create follow-up |
| PATCH | `/api/worksheets/:id/follow-ups/:followUpId` | Admin, Tech | Update follow-up |
| DELETE | `/api/worksheets/:id/follow-ups/:followUpId` | Admin, Tech | Delete follow-up |
| POST | `/api/worksheets/:id/signature` | Admin, Tech | Save signature |

#### Knowledge Base
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/kb/articles` | Any | List articles (paginated, filtered by visibility/category) |
| POST | `/api/kb/articles` | Admin, Tech | Create article |
| GET | `/api/kb/articles/by-slug/:slug` | Any | Get article by slug |
| GET | `/api/kb/articles/:id` | Any | Get article by ID |
| PATCH | `/api/kb/articles/:id` | Admin, Tech | Update article |
| DELETE | `/api/kb/articles/:id` | Admin, Tech | Soft-delete article |
| GET | `/api/kb/articles/:id/links` | Any | List entity links for article |
| GET | `/api/kb/links` | Any | Get links for entity (by entityType + entityId) |
| POST | `/api/kb/links` | Admin, Tech | Link article to entity |
| DELETE | `/api/kb/links/:id` | Admin, Tech | Remove entity link |

#### Customer Notes
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/customer-notes` | Any auth | List notes for customer |
| POST | `/api/customer-notes` | Admin, Tech | Create note |
| PATCH | `/api/customer-notes/:id` | Admin, Tech | Update note |
| PATCH | `/api/customer-notes/:id/toggle-pin` | Admin, Tech | Toggle pin status |
| DELETE | `/api/customer-notes/:id` | Admin, Tech | Soft-delete note |

#### Config (Authenticated)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/config/:key` | Any auth | Read specific config (worksheet_config, worksheet_alert_threshold) |

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
| POST | `/api/users/profile/password` | Change own password |

#### Attachments
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/tickets/:id/attachments` | Any | Upload file attachment |
| GET | `/api/tickets/:id/attachments` | Any | List ticket attachments |
| GET | `/api/attachments/:id/download` | Any | Download attachment file |
| DELETE | `/api/attachments/:id` | Owner, Admin | Delete attachment |

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

## Worksheet System

The worksheet (Feuille de Travail) is a detailed technician work log attached to a work order or ticket. It tracks labor, parts, travel, and generates PDF documents for billing.

### Lifecycle (6 States)

```
BROUILLON --> SOUMISE --> REVISEE --> APPROUVEE --> FACTUREE
                                        |
                                        v
                                     ANNULEE (admin only, voids an approved worksheet)
```

- **BROUILLON (Draft):** Tech fills in labor/parts/travel/notes. Fully editable.
- **SOUMISE (Submitted):** Tech submits for admin review. No further edits by tech.
- **REVISEE (Reviewed):** Admin reviewed, may request changes (returns to editable).
- **APPROUVEE (Approved):** Ready for billing. No further edits.
- **FACTUREE (Billed):** Invoice generated. Terminal state.
- **ANNULEE (Voided):** Cancelled after approval. Admin only.

### Financial Tracking

- **Labor:** Hourly rate × billable hours (with break deduction), 6 labor types
- **Parts:** Supplier cost + customer-facing unit price × quantity, optional warranty
- **Travel:** Distance (km) × rate per km
- **Auto-totals:** `totalLabor`, `totalParts`, `totalTravel`, `grandTotal` recalculated on every mutation (rounded to 2 decimals)

### Follow-Up Reminders

5 follow-up types (warranty check, customer callback, re-check, parts arrival, quote follow-up). The backend runs an hourly scheduler (`followup-reminder.service.ts`) that checks for due follow-ups and sends in-app notifications.

### PDF Generation

Uses `pdf-lib` to generate professional PDF documents including:
- Header with company info and worksheet metadata
- Labor, parts, and travel tables with line totals
- Notes (client-visible only)
- Tech and customer signatures (rendered side-by-side)
- Grand total summary

### Admin Worksheet Config

Stored in `SystemConfig` as `worksheet_config`:
- Default hourly rate
- Default travel rate per km
- Section toggles (labor, parts, travel)
- High-value alert threshold (`worksheet_alert_threshold`)

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

## Knowledge Base

The knowledge base (`/api/kb/*`) provides article management for internal documentation and customer-facing FAQs.

### Features

- **Articles:** Markdown content, 6 categories (Matériel, Logiciel, Réseau, Procédure, FAQ, Autre), tags, auto-generated slugs
- **Visibility:** `INTERNAL` (staff-only) or `PUBLIC` (visible to customers)
- **Entity linking:** Articles can be linked to tickets, work orders, or customers for contextual reference
- **Creation from worksheets:** Diagnostic findings and procedure notes can be promoted to KB articles directly
- **Soft-delete:** Articles are soft-deleted, slug uniqueness accounts for deleted records

### Frontend

- Admin: `/admin/base-connaissances` (list) and `/admin/base-connaissances/:id` (detail/edit)
- Entity links shown in ticket detail, work order detail, and client detail pages

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
| `/admin/clients/:id` | Client detail (notes, history) | ADMIN |
| `/admin/base-connaissances` | Knowledge base | ADMIN |
| `/admin/base-connaissances/:id` | KB article detail | ADMIN |
| `/admin/parametres` | System settings | ADMIN |
| `/admin/sauvegardes` | Database backups | ADMIN |
| `/admin/techniciens` | Technician management | ADMIN |
| `/admin/bons-travail` | Work order dashboard | ADMIN |
| `/admin/bons-travail/nouveau` | Work order intake | ADMIN |
| `/admin/bons-travail/:id` | Work order detail | ADMIN |
| `/admin/feuilles-travail` | Worksheet list (review queue) | ADMIN |
| `/admin/feuilles-travail/:id` | Worksheet detail (review/approve) | ADMIN |
| `/admin/profil` | Profile | ADMIN |
| `/portail` | Customer dashboard | CUSTOMER |
| `/portail/billets` | Customer tickets | CUSTOMER |
| `/portail/billets/:id` | Ticket detail + proposals | CUSTOMER |
| `/portail/rendez-vous` | Appointments | CUSTOMER |
| `/portail/bons-travail` | Work orders | CUSTOMER |
| `/portail/bons-travail/:id` | Work order detail + quote approval | CUSTOMER |
| `/portail/feuilles-travail` | Worksheets (customer view) | CUSTOMER |
| `/portail/feuilles-travail/:id` | Worksheet detail (customer view) | CUSTOMER |
| `/portail/profil` | Profile | CUSTOMER |
| `/technicien` | Technician dashboard | TECHNICIAN |
| `/technicien/billets` | Ticket queue | TECHNICIAN |
| `/technicien/billets/:id` | Ticket detail + proposals | TECHNICIAN |
| `/technicien/horaire` | Schedule + follow-ups | TECHNICIAN |
| `/technicien/bons-travail` | Work order dashboard | TECHNICIAN |
| `/technicien/bons-travail/nouveau` | Work order intake | TECHNICIAN |
| `/technicien/bons-travail/:id` | Work order detail | TECHNICIAN |
| `/technicien/feuilles-travail` | Worksheet list (own) | TECHNICIAN |
| `/technicien/feuilles-travail/:id` | Worksheet detail (create/edit) | TECHNICIAN |
| `/technicien/profil` | Profile | TECHNICIAN |

**Total: 38 page components (3 layouts + 35 content pages), 40 routes**

### Key Frontend Patterns

- **API client** (`src/api/client.ts`): Typed `request<T>()` function reads `json.data` from response envelope. Namespaced API calls (`api.tickets.list()`, `api.workorders.create()`, `api.worksheets.get()`, etc.)
- **Auth hook** (`src/hooks/use-auth.ts`): Single `useAuth()` hook returns `{ user, isLoading, isAuthenticated, logout }`
- **Constants** (`src/lib/constants.ts`): All status labels, colors, and priority mappings in one file
- **UI guardrails**: High-traffic forms now show inline validation errors; destructive actions use a shared `ConfirmDialog`; icon-only controls include `aria-label`s; wide worksheet/backups tables keep mobile overflow wrappers
- **StatusBadge** (`src/components/shared/StatusBadge.tsx`): Supports `type="ticket"`, `type="appointment"`, `type="workorder"`
- **SignaturePad** (`src/components/shared/SignaturePad.tsx`): Canvas-based signature capture component
- **TanStack Query keys**: `['tickets']`, `['workorders']`, `['worksheets']`, `['kb-articles']`, `['customer-notes']`, `['notifications']`, etc.

---

## Testing

### Backend (9 test files)

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

### Frontend (4 test files)

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

Tested modules:
- StatusBadge, MessageThread, Dashboard, use-auth hook

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
- argon2id password hashing (via hash-wasm, no native dependencies)
- Parameterized queries only (no raw SQL injection vectors)
- Read-only container filesystem in production
- All capabilities dropped (`cap_drop: ALL`)
- Database on internal-only Docker network
- Security headers via Caddy (HSTS, X-Frame-Options DENY, etc.)
- Secure headers middleware via Hono
- Trivy image scanning in CI
- Rate limiting on auth endpoints (10 req/min) and general API (100 req/min)

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
