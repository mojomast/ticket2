> **📄 ORIGINAL REBUILD SPECIFICATION (historical)** — This document was the design
> spec used to build the current `ticket2` codebase. The rebuild is complete and the
> app is running. This file is retained as an architectural reference; some details
> may no longer match the implemented code exactly.

# Valitek v2 -- Rebuild Specification

This document provides precise instructions to rebuild the Valitek IT ticket management system from scratch, eliminating the architectural debt, security issues, and unnecessary complexity identified in the current codebase. It is written so that a developer (or AI agent) can implement the entire system without referencing the old code.

---

## Table of Contents

1. [Why Rebuild](#1-why-rebuild)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Design](#6-api-design)
7. [Business Logic (Services)](#7-business-logic-services)
8. [Frontend](#8-frontend)
9. [Internationalization](#9-internationalization)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Security Hardening](#11-security-hardening)
12. [Testing Strategy](#12-testing-strategy)
13. [Migration Path](#13-migration-path)
14. [Implementation Order](#14-implementation-order)

---

## 1. Why Rebuild

The current Valitek codebase (~25,000 lines of TypeScript) has these structural problems that cannot be incrementally fixed:

### Problems Eliminated by This Rebuild

| Problem | Current State | Impact |
|---------|--------------|--------|
| **Fragmented auth** | 5 files, 3 separate HMAC implementations (Node.js, Edge, helpers), plus an unused 4th in auth-token.ts | Token verification bugs, maintenance hazard, deactivated users stay authenticated |
| **40 route files with identical boilerplate** | Every route manually calls getSessionFromRequest, checks null, wraps in try/catch, maps errors | ~3,000 lines of pure repetition (12% of codebase) |
| **1,047-line copy-paste** | demo.service.ts and prisma/seed.ts contain identical seed data maintained separately | Inevitable drift, double maintenance |
| **Mixed Next.js concerns** | Edge runtime forces separate auth code, standalone output needs custom Dockerfile hacks, middleware.ts is a monolithic regex router | Framework fighting, not framework helping |
| **Dual data-fetching systems** | Raw fetch() in admin, api() wrapper in portal, dual user identity stores (Zustand + useCurrentUser hook) | Stale data, inconsistent error handling |
| **No CSRF protection** | SameSite=Lax only | Cross-origin state changes possible |
| **Dev secret fallback** | auth-token.ts falls back to known string if NEXTAUTH_SECRET unset | Catastrophic auth bypass if env var missing in prod |
| **772 MB node_modules** | Next.js brings 460+ transitive dependencies | Massive attack surface, slow builds |

### What the Rebuild Preserves

All business logic, domain rules, and user-facing features are preserved exactly:

- 3 portals: Admin, Technician, Customer
- 10 database models, 8 enums
- Ticket status state machine (10 states, role-gated transitions)
- Technician permission system (5 boolean permissions)
- Appointment scheduling with availability/capacity
- Quote workflow (send/approve/decline)
- Blocker workflow
- In-app notifications
- Database backup/restore
- Audit logging
- Rate limiting
- French/English i18n
- Demo mode with persona selector

---

## 2. Technology Stack

### Backend: Hono + TypeScript

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Node.js 20 LTS | Stable, team knows it, runs Prisma |
| **Framework** | [Hono](https://hono.dev) v4 | 14KB framework, router + middleware only. No hidden behaviors. Middleware chaining replaces 40 boilerplate route files. |
| **Language** | TypeScript 5.x (strict) | Same as current -- all types, Zod schemas, and service logic port directly |
| **ORM** | Prisma 5.x | Same as current -- schema, migrations, and client port 1:1 |
| **Validation** | Zod v4 | Same as current -- all schemas port directly |
| **Auth tokens** | [jose](https://github.com/panva/jose) | Single library replaces 5 auth files. Edge-compatible. Handles algorithm pinning, timing-safe comparison, proper encoding. |
| **Password hashing** | argon2 (argon2id) | OWASP #1 recommendation. Memory-hard, side-channel resistant. Replaces bcryptjs. |
| **Rate limiting** | Hono built-in + Redis | Middleware-level, not custom implementation |
| **Logging** | pino | Structured JSON logging, fast, production-grade |

### Frontend: React + Vite (SPA)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Build** | Vite 5 | Fast dev server, simple config, no framework magic |
| **UI** | React 18 | Team knows it, existing components (Radix/shadcn) reuse directly |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui | Same as current -- all components port |
| **State** | Zustand | Same as current -- single auth store |
| **Forms** | react-hook-form + Zod | Same as current |
| **Routing** | React Router v6 | Client-side routing, role-based route guards |
| **Data fetching** | TanStack Query v5 | Replaces manual useState+useEffect+fetch. Handles caching, loading states, error handling, refetching. |
| **Drag & Drop** | @dnd-kit | Same as current (Kanban board) |

### Why This Stack

1. **~70% code reuse**: All Prisma schema, Zod validations, TypeScript types, service logic, and React components port with minimal changes.
2. **Auth consolidation**: 5 files -> 1 file (jose). No Edge/Node.js split.
3. **Route boilerplate elimination**: 40 files of repeated try/catch/auth/error-mapping -> middleware handles it once.
4. **Clean separation**: Backend is a pure API server. Frontend is a pure SPA. No mixed concerns.
5. **Simple Dockerfile**: No standalone output mode, no Prisma engine copying, no libc6-compat hacks.
6. **Small attack surface**: Hono (14KB) vs Next.js (460+ transitive deps).

---

## 3. Project Structure

```
valitek-v2/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # App entry point, Hono app creation
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # POST /login, /logout, /demo-login; GET /me
│   │   │   ├── ticket.routes.ts     # All ticket endpoints (CRUD, status, quote, blocker, assign, accept)
│   │   │   ├── appointment.routes.ts # All appointment endpoints
│   │   │   ├── message.routes.ts    # All message endpoints
│   │   │   ├── notification.routes.ts # All notification endpoints
│   │   │   ├── user.routes.ts       # Admin user management + profile
│   │   │   ├── config.routes.ts     # System config + branding
│   │   │   ├── backup.routes.ts     # Backup CRUD + restore + download
│   │   │   ├── technician.routes.ts # Technician list
│   │   │   ├── demo.routes.ts       # Demo personas + reset
│   │   │   └── health.routes.ts     # Health check
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    # JWT verification, session loading, role checking
│   │   │   ├── error.middleware.ts   # Global error handler (replaces 40 try/catch blocks)
│   │   │   ├── rate-limit.middleware.ts # Rate limiting
│   │   │   ├── validate.middleware.ts # Zod validation middleware factory
│   │   │   └── logging.middleware.ts  # Request/response logging
│   │   ├── services/
│   │   │   ├── ticket.service.ts     # All ticket business logic (single file, ~400 lines)
│   │   │   ├── scheduling.service.ts # Appointments, availability, time slots
│   │   │   ├── message.service.ts    # Message CRUD with role-based filtering
│   │   │   ├── notification.service.ts # Notification dispatch
│   │   │   ├── user.service.ts       # User CRUD, profile, soft-delete
│   │   │   ├── backup.service.ts     # Backup/restore
│   │   │   ├── audit.service.ts      # Audit log creation
│   │   │   ├── email.service.ts      # Email delivery (M365 Graph)
│   │   │   └── sms.service.ts        # SMS delivery (VoIP.ms)
│   │   ├── lib/
│   │   │   ├── auth.ts               # ONE file: createToken, verifyToken, getSession (using jose)
│   │   │   ├── prisma.ts             # PrismaClient singleton
│   │   │   ├── logger.ts             # pino logger instance
│   │   │   ├── errors.ts             # AppError class + error codes
│   │   │   └── config.ts             # Environment variable loading + validation
│   │   ├── validations/
│   │   │   ├── ticket.ts             # Ported from current codebase
│   │   │   ├── appointment.ts
│   │   │   ├── message.ts
│   │   │   ├── user.ts
│   │   │   └── backup.ts
│   │   └── types/
│   │       └── index.ts              # All interfaces, enums, ALLOWED_TRANSITIONS
│   ├── prisma/
│   │   ├── schema.prisma             # Same schema with fixes (see section 4)
│   │   ├── migrations/
│   │   └── seed.ts                   # SINGLE seed file (no more duplication)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Router setup with role guards
│   │   ├── api/
│   │   │   └── client.ts            # ONE fetch wrapper (TanStack Query + typed endpoints)
│   │   ├── pages/
│   │   │   ├── public/              # Landing, Login, ServiceRequest
│   │   │   ├── admin/               # Dashboard, Tickets, Kanban, Calendar, Clients, Settings, Backups, Technicians
│   │   │   ├── portal/              # Dashboard, Tickets, TicketDetail, Appointments
│   │   │   └── technician/          # Dashboard, Tickets, TicketDetail, Schedule
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui (ported directly)
│   │   │   ├── admin/               # Admin-specific components
│   │   │   ├── portal/              # Customer components
│   │   │   ├── technician/          # Technician components
│   │   │   └── shared/              # Cross-role: MessageThread, StatusBadge, DemoBanner, etc.
│   │   ├── hooks/
│   │   │   ├── use-auth.ts          # ONE auth hook (replaces dual Zustand + useCurrentUser)
│   │   │   └── use-toast.ts
│   │   ├── stores/
│   │   │   └── auth-store.ts        # Zustand: user state only
│   │   ├── lib/
│   │   │   ├── i18n/                # Locale provider, catalogs (fr.ts, en.ts), formatters
│   │   │   ├── constants.ts         # Status colors, priority colors (ONE file)
│   │   │   └── utils.ts             # cn() and other utilities
│   │   └── types/
│   │       └── index.ts             # Shared with backend (or duplicated -- see note)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── docker-compose.yml                # Production: app + db + caddy
├── docker-compose.dev.yml            # Development overrides
├── Caddyfile                         # Reverse proxy with auto-HTTPS
└── README.md
```

### Key Structural Decisions

1. **Monorepo with two packages** (`backend/` + `frontend/`). Not a monolithic Next.js app.
2. **11 route files** replace 40. Each route file groups related endpoints. Middleware handles cross-cutting concerns.
3. **9 service files** replace 17+. Ticket logic is ONE file (~400 lines) instead of 7 files + a barrel export. The sub-splitting was premature and caused fragmented Prisma includes.
4. **ONE auth file** replaces 5. No Edge/Node.js split needed -- Hono runs entirely on Node.js.
5. **ONE seed file** replaces 2. The demo reset endpoint calls the same seed function. No more sync requirement.
6. **Shared types** can be a symlink, a workspace package, or simply duplicated (the types file is ~200 lines).

---

## 4. Database Schema

Port the existing Prisma schema with these specific fixes:

### 4.1 Schema File (`backend/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───

enum UserRole {
  CUSTOMER
  TECHNICIAN
  ADMIN
}

enum CustomerType {
  RESIDENTIAL
  COMMERCIAL
}

enum ServiceMode {
  SUR_ROUTE
  EN_CUBICULE
}

enum ServiceCategory {
  REPARATION
  LOGICIEL
  RESEAU
  DONNEES
  INSTALLATION
  MAINTENANCE
  CONSULTATION
  FORMATION
  AUTRE
}

enum TicketStatus {
  NOUVELLE
  EN_ATTENTE_APPROBATION
  EN_ATTENTE_REPONSE_CLIENT
  APPROUVEE
  PLANIFIEE
  EN_COURS
  BLOCAGE
  TERMINEE
  FERMEE
  ANNULEE
}

enum Priority {
  BASSE
  NORMALE
  HAUTE
  URGENTE
}

enum AppointmentStatus {
  PLANIFIE
  CONFIRME
  EN_COURS
  TERMINE
  ANNULE
}

enum NotificationType {
  TICKET_CREATED
  STATUS_CHANGED
  QUOTE_SENT
  QUOTE_APPROVED
  QUOTE_DECLINED
  NEW_MESSAGE
  BLOCKER_ADDED
  BLOCKER_REMOVED
  TECHNICIAN_ASSIGNED
  APPOINTMENT_BOOKED
  APPOINTMENT_CANCELLED
  BACKUP_COMPLETED
  BACKUP_RESTORED
}

enum BackupStatus {
  PENDING
  COMPLETED
  FAILED
  RESTORED
}

enum BackupType {
  FULL
  PARTIAL
}

// ─── Models ───

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  firstName    String
  lastName     String
  phone        String?
  role         UserRole
  customerType CustomerType?
  companyName  String?
  address      String?
  isActive     Boolean       @default(true)
  isDemo       Boolean       @default(false)
  permissions  Json?         // Technician permissions (5 booleans)
  deletedAt    DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relations
  customerTickets  Ticket[]       @relation("CustomerTickets")
  technicianTickets Ticket[]      @relation("TechnicianTickets")
  appointments     Appointment[]
  messages         Message[]
  notifications    Notification[]
  attachments      Attachment[]

  @@index([role, isActive])
  @@index([deletedAt])
}

model Ticket {
  id               String          @id @default(uuid())
  ticketNumber     String          @unique // TKT-YYMMNN format
  title            String
  description      String
  status           TicketStatus    @default(NOUVELLE)
  priority         Priority        @default(NORMALE)
  serviceMode      ServiceMode     @default(EN_CUBICULE)
  serviceCategory  ServiceCategory @default(REPARATION)
  quotedPrice      Float?
  quoteDescription String?
  quoteDuration    String?
  blockerReason    String?
  customerId       String
  technicianId     String?
  deletedAt        DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  // Relations
  customer      User           @relation("CustomerTickets", fields: [customerId], references: [id], onDelete: Restrict)
  technician    User?          @relation("TechnicianTickets", fields: [technicianId], references: [id], onDelete: SetNull)
  appointments  Appointment[]
  messages      Message[]
  notifications Notification[]
  attachments   Attachment[]

  @@index([status, createdAt])
  @@index([customerId])
  @@index([technicianId])
  @@index([deletedAt])
}

model Appointment {
  id             String            @id @default(uuid())
  ticketId       String
  technicianId   String?
  scheduledStart DateTime
  scheduledEnd   DateTime
  travelBuffer   Int               @default(0) // minutes
  status         AppointmentStatus @default(PLANIFIE)
  notes          String?
  cancelReason   String?
  deletedAt      DateTime?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  // Relations
  ticket     Ticket @relation(fields: [ticketId], references: [id])
  technician User?  @relation(fields: [technicianId], references: [id], onDelete: SetNull)

  @@index([ticketId, status])
  @@index([technicianId])
  @@index([scheduledStart])
  @@index([deletedAt])
}

model Message {
  id         String   @id @default(uuid())
  ticketId   String
  authorId   String
  content    String
  isInternal Boolean  @default(false) // Hidden from customers
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  ticket      Ticket       @relation(fields: [ticketId], references: [id])
  author      User         @relation(fields: [authorId], references: [id], onDelete: Restrict)
  attachments Attachment[]

  @@index([ticketId, createdAt])
  @@index([deletedAt])
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  ticketId  String?
  type      NotificationType
  title     String
  message   String
  readAt    DateTime?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  // Relations
  user   User    @relation(fields: [userId], references: [id], onDelete: Restrict)
  ticket Ticket? @relation(fields: [ticketId], references: [id], onDelete: SetNull)

  @@index([userId, readAt])
  @@index([ticketId])
}

model Attachment {
  id          String  @id @default(uuid())
  ticketId    String
  messageId   String?
  uploadedBy  String
  fileName    String
  fileSize    Int
  mimeType    String
  storagePath String
  createdAt   DateTime @default(now())

  // Relations
  ticket  Ticket   @relation(fields: [ticketId], references: [id])
  message Message? @relation(fields: [messageId], references: [id])
  uploader User    @relation(fields: [uploadedBy], references: [id])

  @@index([ticketId])
  @@index([messageId])
}

model SystemConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(uuid())
  entityType String
  entityId   String
  action     String
  userId     String
  oldValue   Json?
  newValue   Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}

model BackupRecord {
  id           String       @id @default(uuid())
  fileName     String
  fileSize     Int
  storagePath  String
  type         BackupType
  status       BackupStatus @default(PENDING)
  tables       Json
  recordCount  Json
  createdBy    String
  restoredAt   DateTime?
  restoredBy   String?
  errorMessage String?
  createdAt    DateTime     @default(now())

  @@index([createdAt])
  @@index([status])
}
```

### 4.2 Schema Changes from Current

| Change | Reason |
|--------|--------|
| `BackupRecord.type` is now `BackupType` enum | Was loose `String`, no compile-time validation |
| `BackupRecord.status` is now `BackupStatus` enum | Was loose `String`, no compile-time validation |
| Removed `TimeSlot` model | Was seeded but never queried at runtime. Scheduling service generates slots from `Appointment` data. |
| Removed redundant `@@index([email])` on User | `@unique` already creates an index |
| Added `@@index([deletedAt])` on soft-delete models | Queries filter on this constantly |
| Added `@@index([userId, readAt])` on Notification | Most common query pattern |
| Added `updatedAt` on Notification | Was missing in original |
| All FK relations explicitly defined | `AuditLog.userId` was a loose string with no FK |

---

## 5. Authentication & Authorization

### 5.1 Single Auth Module (`backend/src/lib/auth.ts`)

Replace the current 5-file auth system with ONE file using `jose`:

```typescript
// backend/src/lib/auth.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { argon2id, argon2Verify } from 'hash-wasm'; // or 'argon2' native

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

// Fail hard if secret is missing -- no fallbacks, ever
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters');
}

interface TokenPayload extends JWTPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';
  firstName: string;
  lastName: string;
}

export async function createToken(user: TokenPayload): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });
  return payload as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  // argon2id with OWASP-recommended parameters
  return argon2id({ password, salt: crypto.getRandomValues(new Uint8Array(16)),
    parallelism: 1, iterations: 2, memorySize: 19456, hashLength: 32, outputType: 'encoded' });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2Verify({ hash, password });
}
```

**That's it.** One file. No Edge/Node.js split. No unused generic verifier. No dev-secret fallback.

### 5.2 Auth Middleware (`backend/src/middleware/auth.middleware.ts`)

```typescript
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../lib/auth.ts';
import { prisma } from '../lib/prisma.ts';
import { AppError } from '../lib/errors.ts';
import type { UserRole } from '@prisma/client';

// Attach session to context for all authenticated routes
export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'valitek-auth');
  if (!token) throw new AppError('UNAUTHORIZED', 'Non authentifie', 401);

  const payload = await verifyToken(token);

  // DB check: user still active and not deleted
  const user = await prisma.user.findFirst({
    where: { id: payload.id, isActive: true, deletedAt: null },
    select: { id: true, email: true, role: true, firstName: true, lastName: true, permissions: true },
  });

  if (!user) throw new AppError('UNAUTHORIZED', 'Session invalide', 401);

  c.set('session', { user });
  await next();
});

// Role guard factory -- use as: requireRole('ADMIN') or requireRole('ADMIN', 'TECHNICIAN')
export function requireRole(...roles: UserRole[]) {
  return createMiddleware(async (c, next) => {
    const session = c.get('session');
    if (!roles.includes(session.user.role)) {
      throw new AppError('FORBIDDEN', 'Acces refuse', 403);
    }
    await next();
  });
}
```

### 5.3 Usage in Routes

```typescript
// backend/src/routes/backup.routes.ts
import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth.middleware.ts';

const app = new Hono();

// All backup routes require ADMIN
app.use('/*', requireAuth, requireRole('ADMIN'));

app.get('/', async (c) => {
  const backups = await backupService.listBackups();
  return c.json({ data: backups, error: null });
});

app.post('/', async (c) => {
  const session = c.get('session');
  const backup = await backupService.createBackup(session.user.id);
  return c.json({ data: backup, error: null });
});

export default app;
```

Note: **zero boilerplate**. No manual session check, no try/catch (global error middleware handles it), no error code mapping. The route is pure business logic delegation.

### 5.4 Technician Permissions

Same 5-boolean model, parsed the same way:

```typescript
interface TechnicianPermissions {
  can_accept_tickets: boolean;
  can_close_tickets: boolean;
  can_send_quotes: boolean;
  can_cancel_appointments: boolean;
  can_view_all_tickets: boolean;
}

const DEFAULTS: TechnicianPermissions = {
  can_accept_tickets: false,
  can_close_tickets: false,
  can_send_quotes: true,
  can_cancel_appointments: false,
  can_view_all_tickets: false,
};

export function parseTechPermissions(raw: unknown): TechnicianPermissions {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  return { ...DEFAULTS, ...(raw as Partial<TechnicianPermissions>) };
}
```

### 5.5 Cookie Settings

```typescript
// Set on login response
setCookie(c, 'valitek-auth', token, {
  httpOnly: true,
  secure: true,            // Always true, even in dev (use HTTPS locally)
  sameSite: 'Strict',      // Upgraded from Lax -- prevents CSRF
  path: '/',
  maxAge: 60 * 60 * 24,   // 24 hours
});
```

### 5.6 Password Requirements

- Minimum 8 characters
- No maximum length (up to reasonable limit of 128)
- Check against breach database (Have I Been Pwned API) on registration/change -- optional but recommended
- Argon2id with: memoryCost=19456 (19 MiB), timeCost=2, parallelism=1

---

## 6. API Design

### 6.1 Response Format

All endpoints return the same envelope:

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }

// Paginated
{ data: T[], error: null, pagination: { page: number, limit: number, total: number, totalPages: number } }
```

### 6.2 Global Error Middleware

```typescript
// backend/src/middleware/error.middleware.ts
import type { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json({ data: null, error: { message: err.message, code: err.code } }, err.status);
  }

  // Unexpected error -- log full details, return generic message
  logger.error({ err, path: c.req.path, method: c.req.method }, 'Unhandled error');
  return c.json(
    { data: null, error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' } },
    500
  );
};
```

### 6.3 Validation Middleware Factory

```typescript
// backend/src/middleware/validate.middleware.ts
import { createMiddleware } from 'hono/factory';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.ts';

export function validateBody(schema: ZodSchema) {
  return createMiddleware(async (c, next) => {
    const body = await c.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', result.error.issues[0].message, 400);
    }
    c.set('body', result.data);
    await next();
  });
}

export function validateQuery(schema: ZodSchema) {
  return createMiddleware(async (c, next) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams);
    const result = schema.safeParse(query);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', result.error.issues[0].message, 400);
    }
    c.set('query', result.data);
    await next();
  });
}
```

### 6.4 Complete Endpoint List

#### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + DB connectivity |
| GET | `/api/config/branding` | Runtime branding config |
| GET | `/api/demo/personas` | List demo personas (only if DEMO_MODE enabled) |

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/demo-login` | Demo login (isDemo users only, DEMO_MODE only) |
| POST | `/api/auth/logout` | Clear auth cookie |
| GET | `/api/auth/me` | Current user info |

#### Tickets (all require auth)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/tickets` | Any | List with pagination + filters |
| POST | `/api/tickets` | Any | Create ticket |
| GET | `/api/tickets/:id` | Any | Get ticket with relations |
| PATCH | `/api/tickets/:id` | Admin, Tech | Update ticket fields |
| PATCH | `/api/tickets/:id/status` | Varies per transition | Status transition (state machine) |
| PATCH | `/api/tickets/:id/assign` | Admin | Assign technician |
| POST | `/api/tickets/:id/quote` | Admin, Tech | Send price quote |
| POST | `/api/tickets/:id/approve-quote` | Customer, Admin | Approve quote |
| POST | `/api/tickets/:id/decline-quote` | Customer, Admin | Decline quote |
| POST | `/api/tickets/:id/blocker` | Admin, Tech | Add blocker |
| DELETE | `/api/tickets/:id/blocker` | Admin, Tech | Remove blocker |
| POST | `/api/tickets/:id/accept` | Tech (can_accept_tickets) | Self-assign |
| GET | `/api/tickets/:id/messages` | Any | List messages (paginated) |
| POST | `/api/tickets/:id/messages` | Any | Create message |

#### Appointments
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/appointments` | Any | List with pagination |
| POST | `/api/appointments` | Any | Book appointment |
| GET | `/api/appointments/:id` | Any | Get detail |
| PATCH | `/api/appointments/:id` | Admin, Tech | Update |
| DELETE | `/api/appointments/:id` | Admin | Cancel |
| PATCH | `/api/appointments/:id/status` | Admin, Tech | Status transition |
| GET | `/api/appointments/availability` | Any | Query available slots |

#### Messages
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| PATCH | `/api/messages/:id` | Author (5-min window) | Edit message |
| DELETE | `/api/messages/:id` | Admin | Delete message |

#### Notifications
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/notifications` | Any | List user's notifications |
| PATCH | `/api/notifications/:id/read` | Owner | Mark read |
| POST | `/api/notifications/read-all` | Any | Mark all read |

#### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users (paginated, filterable) |
| POST | `/api/admin/users` | Create user |
| GET | `/api/admin/users/:id` | Get user detail |
| PATCH | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Soft-delete user |
| PATCH | `/api/admin/users/:id/permissions` | Update technician permissions |
| GET | `/api/admin/config` | List all system config |
| GET | `/api/admin/config/:key` | Get config by key |
| PUT | `/api/admin/config/:key` | Upsert config |
| PUT | `/api/admin/config/branding` | Update branding |
| GET | `/api/admin/backups` | List backups |
| POST | `/api/admin/backups` | Create backup |
| GET | `/api/admin/backups/:id` | Get backup detail |
| DELETE | `/api/admin/backups/:id` | Delete backup |
| GET | `/api/admin/backups/:id/download` | Download backup file |
| POST | `/api/admin/backups/:id/restore` | Restore from backup |

#### Other
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/technicians` | Admin, Tech | List active technicians |
| PATCH | `/api/users/profile` | Any | Update own profile |
| GET | `/api/users/profile` | Any | Get own profile |
| POST | `/api/demo/reset` | Admin | Reset demo data |

### 6.5 App Composition (`backend/src/index.ts`)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { errorHandler } from './middleware/error.middleware.ts';
import { requestLogger } from './middleware/logging.middleware.ts';
import { rateLimiter } from './middleware/rate-limit.middleware.ts';
import { requireAuth, requireRole } from './middleware/auth.middleware.ts';

import authRoutes from './routes/auth.routes.ts';
import ticketRoutes from './routes/ticket.routes.ts';
import appointmentRoutes from './routes/appointment.routes.ts';
import messageRoutes from './routes/message.routes.ts';
import notificationRoutes from './routes/notification.routes.ts';
import userRoutes from './routes/user.routes.ts';
import configRoutes from './routes/config.routes.ts';
import backupRoutes from './routes/backup.routes.ts';
import technicianRoutes from './routes/technician.routes.ts';
import demoRoutes from './routes/demo.routes.ts';
import healthRoutes from './routes/health.routes.ts';

const app = new Hono();

// ─── Global Middleware ───
app.use('*', secureHeaders());
app.use('*', cors({ origin: process.env.FRONTEND_URL!, credentials: true }));
app.use('*', requestLogger);
app.onError(errorHandler);

// ─── Public Routes ───
app.route('/api/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/config/branding', configRoutes);  // Public branding only
app.route('/api/demo', demoRoutes);

// ─── Rate limit auth endpoints more aggressively ───
app.use('/api/auth/*', rateLimiter({ max: 10, window: 60 }));
app.use('/api/*', rateLimiter({ max: 100, window: 60 }));

// ─── Authenticated Routes ───
app.use('/api/*', requireAuth);

app.route('/api/tickets', ticketRoutes);
app.route('/api/appointments', appointmentRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/technicians', technicianRoutes);
app.route('/api/users', userRoutes);

// ─── Admin Routes ───
app.use('/api/admin/*', requireRole('ADMIN'));
app.route('/api/admin/users', userRoutes);
app.route('/api/admin/config', configRoutes);
app.route('/api/admin/backups', backupRoutes);

export default app;
```

---

## 7. Business Logic (Services)

### 7.1 Service Design Rules

1. **One error convention**: All services throw `AppError`. Routes never catch -- the global error middleware handles it.
2. **No Prisma in routes**: Routes call services. Services call Prisma.
3. **Shared includes**: Define Prisma `include` and `select` objects once per service, not per function.
4. **Pure functions where possible**: Status transition validation, permission checks, and formatting are pure functions that are easy to test.

### 7.2 Ticket Service (~400 lines, single file)

Consolidate the current 7 files into one. Structure:

```typescript
// backend/src/services/ticket.service.ts

// ─── Shared Prisma includes ───
const TICKET_INCLUDE = { customer: { select: USER_SELECT }, technician: { select: USER_SELECT } };
const USER_SELECT = { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, customerType: true, companyName: true };

// ─── CRUD ───
export async function createTicket(data: CreateTicketInput, customerId: string) { ... }
export async function getTickets(filters: TicketFilters) { ... }
export async function getTicketById(id: string, userId: string, role: UserRole) { ... }
export async function updateTicket(id: string, data: UpdateTicketInput, userId: string, role: UserRole) { ... }

// ─── Status Machine ───
export async function changeStatus(id: string, newStatus: TicketStatus, userId: string, role: UserRole) { ... }
export async function assignTechnician(id: string, technicianId: string, adminId: string) { ... }
export async function acceptTicket(id: string, technicianId: string) { ... }

// ─── Quote Workflow ───
export async function sendQuote(id: string, price: number, description: string, duration: string, userId: string) { ... }
export async function approveQuote(id: string, userId: string) { ... }
export async function declineQuote(id: string, userId: string) { ... }

// ─── Blocker Workflow ───
export async function addBlocker(id: string, reason: string, userId: string) { ... }
export async function removeBlocker(id: string, userId: string) { ... }
```

### 7.3 Ticket Status State Machine

Port `ALLOWED_TRANSITIONS` exactly from the current `src/types/index.ts`:

```typescript
// backend/src/types/index.ts
export const ALLOWED_TRANSITIONS: Record<TicketStatus, Array<{ to: TicketStatus; roles: UserRole[] }>> = {
  NOUVELLE: [
    { to: 'EN_ATTENTE_APPROBATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'PLANIFIEE', roles: ['ADMIN'] },
    { to: 'EN_COURS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN', 'CUSTOMER'] },
  ],
  EN_ATTENTE_APPROBATION: [
    { to: 'APPROUVEE', roles: ['ADMIN', 'CUSTOMER'] },
    { to: 'EN_ATTENTE_REPONSE_CLIENT', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  EN_ATTENTE_REPONSE_CLIENT: [
    { to: 'EN_ATTENTE_APPROBATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  APPROUVEE: [
    { to: 'PLANIFIEE', roles: ['ADMIN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  PLANIFIEE: [
    { to: 'EN_COURS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  EN_COURS: [
    { to: 'BLOCAGE', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'TERMINEE', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  BLOCAGE: [
    { to: 'EN_COURS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  TERMINEE: [
    { to: 'FERMEE', roles: ['ADMIN'] }, // or TECHNICIAN with can_close_tickets
  ],
  FERMEE: [],
  ANNULEE: [],
};
```

### 7.4 Other Services

Port these directly with minimal changes:

| Service | Lines (est.) | Changes from Current |
|---------|-------------|---------------------|
| `scheduling.service.ts` | ~200 | Replace `$queryRawUnsafe` with parameterized `$queryRaw`. Remove TimeSlot queries. |
| `message.service.ts` | ~100 | Keep 5-minute edit window. Throw AppError instead of returning error objects. |
| `notification.service.ts` | ~150 | Keep all event helpers. Remove email side-effects (move to separate email.service call in routes). |
| `user.service.ts` | ~150 | Switch to argon2id. Same CRUD logic. |
| `backup.service.ts` | ~250 | Use Prisma model names array for iteration instead of switch statements. Throw AppError. |
| `audit.service.ts` | ~30 | Same. |
| `email.service.ts` | ~80 | Same (M365 Graph API). |
| `sms.service.ts` | ~50 | Same (VoIP.ms). |

### 7.5 Seed Data (ONE file)

```typescript
// backend/prisma/seed.ts
// This is the ONLY seed file. The demo reset endpoint calls this same function.

export async function seedDemoData() {
  // Clear all data
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.backupRecord.deleteMany(),
    prisma.systemConfig.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create users, tickets, appointments, messages, notifications
  // ... (port from current seed.ts -- this is the single source of truth)
}

// Called by `prisma db seed` AND by the demo reset endpoint
seedDemoData();
```

The demo reset route:
```typescript
// backend/src/routes/demo.routes.ts
app.post('/reset', requireAuth, requireRole('ADMIN'), async (c) => {
  if (!process.env.DEMO_MODE) throw new AppError('FORBIDDEN', 'Demo mode disabled', 403);
  await seedDemoData(); // Same function, no duplication
  return c.json({ data: { message: 'Demo reset complete' }, error: null });
});
```

---

## 8. Frontend

### 8.1 Key Changes from Current

| Current | New | Why |
|---------|-----|-----|
| Next.js App Router pages | React Router v6 pages | No server components complexity. Pure SPA. |
| `useState` + `useEffect` + `fetch()` | TanStack Query | Handles caching, loading, errors, refetching automatically. Eliminates ~50% of page boilerplate. |
| Dual fetch systems (raw fetch vs api() wrapper) | ONE typed API client | Single source of truth for all server communication |
| Dual user identity (Zustand + useCurrentUser) | ONE auth hook | `useAuth()` returns `{ user, isLoading, logout }` |
| Status colors defined 9+ times | ONE constants file | `lib/constants.ts` exports all color maps |
| No client routing guards | React Router `loader` + redirect | Role-based access handled at the router level |

### 8.2 API Client

```typescript
// frontend/src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // Send cookies
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (json.error) {
    throw new ApiError(json.error.message, json.error.code, res.status);
  }

  return json.data;
}

// Typed endpoint functions
export const api = {
  auth: {
    login: (data: LoginInput) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    me: () => request<User>('/api/auth/me'),
  },
  tickets: {
    list: (params: TicketFilters) => request<PaginatedResponse<Ticket>>(`/api/tickets?${qs(params)}`),
    get: (id: string) => request<TicketDetail>(`/api/tickets/${id}`),
    create: (data: CreateTicketInput) => request<Ticket>('/api/tickets', { method: 'POST', body: JSON.stringify(data) }),
    // ... etc
  },
  // ... appointments, messages, notifications, admin, etc.
};
```

### 8.3 Auth Hook

```typescript
// frontend/src/hooks/use-auth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.auth.me,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/';
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
  };
}
```

### 8.4 Route Guards

```typescript
// frontend/src/App.tsx
import { createBrowserRouter, redirect } from 'react-router-dom';

const router = createBrowserRouter([
  // Public
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/demande', element: <ServiceRequest /> },

  // Admin (requires ADMIN role)
  {
    path: '/admin',
    element: <AdminLayout />,
    loader: () => requireRole('ADMIN'),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'billets', element: <AdminTickets /> },
      { path: 'billets/:id', element: <AdminTicketDetail /> },
      { path: 'billets/kanban', element: <KanbanBoard /> },
      { path: 'calendrier', element: <AdminCalendar /> },
      { path: 'clients', element: <AdminClients /> },
      { path: 'parametres', element: <AdminSettings /> },
      { path: 'sauvegardes', element: <AdminBackups /> },
      { path: 'techniciens', element: <AdminTechnicians /> },
    ],
  },

  // Customer Portal
  {
    path: '/portail',
    element: <PortalLayout />,
    loader: () => requireRole('CUSTOMER'),
    children: [
      { index: true, element: <PortalDashboard /> },
      { path: 'billets', element: <PortalTickets /> },
      { path: 'billets/:id', element: <PortalTicketDetail /> },
      { path: 'rendez-vous', element: <PortalAppointments /> },
    ],
  },

  // Technician
  {
    path: '/technicien',
    element: <TechnicianLayout />,
    loader: () => requireRole('TECHNICIAN'),
    children: [
      { index: true, element: <TechDashboard /> },
      { path: 'billets', element: <TechTickets /> },
      { path: 'billets/:id', element: <TechTicketDetail /> },
      { path: 'horaire', element: <TechSchedule /> },
    ],
  },
]);
```

### 8.5 Component Reuse Strategy

Port all existing components with these consolidations:

| Current Components | New | Change |
|-------------------|-----|--------|
| AdminSidebar + TechSidebar | `AppSidebar` with role-based nav items | Merge into one component with config |
| 3x ticket list pages with inline fetch | `TicketList` + TanStack Query | Shared list component with role-based filters |
| 3x inline message threads | `MessageThread` (already exists in shared/) | Use consistently everywhere |
| 9+ inline status color definitions | `constants.ts` | Single import |
| 628-line admin ticket detail page | Split into `<TicketHeader>`, `<TicketEditor>`, `<QuoteSection>`, `<AssignmentSection>` | Compose from smaller components |

---

## 9. Internationalization

Port the existing i18n system:

```
frontend/src/lib/i18n/
  ├── provider.tsx       # React context provider
  ├── hook.ts            # useTranslation() hook
  ├── locales/
  │   ├── fr.ts          # French catalog (default)
  │   └── en.ts          # English catalog
  └── formatters.ts      # Locale-aware date/time/currency formatters
```

Same approach as current: flat key-value catalogs, `useTranslation()` hook returns `t('key')` function. Language stored in localStorage, toggled via header selector.

---

## 10. Infrastructure & Deployment

### 10.1 Docker Compose (Production)

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - db-only
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    # NO ports: section -- database never exposed to host

  app:
    build: ./backend
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?connection_limit=10
      AUTH_SECRET: ${AUTH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      DEMO_MODE: ${DEMO_MODE:-false}
    ports:
      - "127.0.0.1:3100:3000"
    volumes:
      - backup-data:/app/data/backups
    networks:
      - db-only
      - web
    depends_on:
      db:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - ./frontend/dist:/srv/frontend:ro
    networks:
      - web
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

networks:
  db-only:
    driver: bridge
    internal: true    # No outbound internet
  web:
    driver: bridge

volumes:
  postgres_data:
  backup-data:
  caddy_data:
  caddy_config:
```

### 10.2 Caddyfile

```
ticket.ussyco.de {
    # Serve frontend SPA
    handle /api/* {
        reverse_proxy app:3000
    }

    handle {
        root * /srv/frontend
        try_files {path} /index.html
        file_server
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    encode gzip
}
```

### 10.3 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache openssl wget
WORKDIR /app
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist/
COPY --from=build /app/prisma ./prisma/
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
```

### 10.4 Entrypoint Script

```bash
#!/bin/sh
set -e

# Read Docker secrets if available
for var in DATABASE_URL AUTH_SECRET; do
  file_var="${var}_FILE"
  eval file_val=\$$file_var
  if [ -n "$file_val" ] && [ -f "$file_val" ]; then
    export "$var"="$(cat "$file_val")"
  fi
done

# Wait for database
echo "Waiting for database..."
until wget -qO- "http://localhost:3000/api/health" 2>/dev/null || npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null; do
  sleep 2
done

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec "$@"
```

### 10.5 Secrets Management

**Never use `-e` flags on `docker run`.** All secrets go in `.env`:

```bash
# .env (mode 600, never committed)
POSTGRES_USER=valitek
POSTGRES_PASSWORD=<generated: openssl rand -base64 32>
POSTGRES_DB=valitek
AUTH_SECRET=<generated: openssl rand -base64 32>
FRONTEND_URL=https://ticket.ussyco.de
LOG_LEVEL=info
DEMO_MODE=false
```

### 10.6 Automated Database Backups

```bash
# /etc/cron.d/valitek-backup
0 2 * * * root docker exec valitek-db pg_dump -U valitek -Fc valitek > /opt/backups/valitek-$(date +\%Y\%m\%d).dump && find /opt/backups -name "valitek-*.dump" -mtime +30 -delete 2>&1 | logger -t valitek-backup
```

### 10.7 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: valitek_test
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: backend/package-lock.json }
      - run: npm ci
        working-directory: backend
      - run: npx prisma generate
        working-directory: backend
      - run: npx prisma migrate deploy
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/valitek_test
      - run: npm run lint
        working-directory: backend
      - run: npm run test:ci
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/valitek_test
          AUTH_SECRET: test-secret-for-ci-only-32chars!

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
        working-directory: frontend
      - run: npm run lint
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
      - run: npm run test:ci
        working-directory: frontend

  build-and-deploy:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push backend
        run: |
          docker build -t ghcr.io/${{ github.repository }}/backend:${{ github.sha }} backend/
          docker push ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
      - name: Build frontend
        run: npm ci && npm run build
        working-directory: frontend
      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1
      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/valitek
            docker pull ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
            IMAGE_TAG=${{ github.sha }} docker compose up -d --no-build
```

---

## 11. Security Hardening

### 11.1 Checklist

| Category | Measure | Implementation |
|----------|---------|----------------|
| **Auth** | No secret fallbacks | `auth.ts` throws on missing `AUTH_SECRET` |
| **Auth** | Argon2id password hashing | `hash-wasm` or `argon2` package, OWASP params |
| **Auth** | Token via jose library | Single implementation, algorithm pinning |
| **Auth** | SameSite=Strict cookies | Prevents CSRF for same-origin SPA |
| **Auth** | DB session validation on every request | Deactivated users immediately lose access |
| **Auth** | Account-level rate limiting | `login:${email}` key, 5 attempts per 15 min |
| **Input** | Zod validation on all endpoints | `validateBody()` / `validateQuery()` middleware |
| **Input** | Request size limits | Caddy: `request_body { max_size 2MB }` |
| **Input** | Parameterized queries only | Prisma default. No `$queryRawUnsafe`. |
| **Headers** | HSTS, CSP, X-Frame-Options, nosniff | Caddy header block + Hono `secureHeaders()` |
| **Network** | Database not exposed to host | No `ports:` on db container |
| **Network** | App port bound to localhost | `127.0.0.1:3100:3000` |
| **Network** | DB network isolated | `internal: true` Docker network |
| **Container** | Non-root user | UID 1001 |
| **Container** | Read-only filesystem | `read_only: true` + tmpfs |
| **Container** | Dropped capabilities | `cap_drop: ALL` |
| **Container** | no-new-privileges | `security_opt: no-new-privileges:true` |
| **Container** | Resource limits | Memory and CPU caps |
| **Container** | Image scanning | Trivy in CI pipeline |
| **Logging** | Structured JSON logs | pino logger |
| **Logging** | No sensitive data in logs | Never log passwords, tokens, secrets |
| **Logging** | Auth events logged | Login success/failure, role changes, account lockouts |
| **Demo** | Demo mode gated | `DEMO_MODE` env var, checked on every demo endpoint |
| **Demo** | Demo login restricted | Only `isDemo: true` users can use demo-login |

### 11.2 Origin Header Validation (CSRF defense-in-depth)

```typescript
// backend/src/middleware/csrf.middleware.ts
export const csrfProtection = createMiddleware(async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next();

  const origin = c.req.header('Origin');
  const allowed = process.env.FRONTEND_URL;

  if (!origin || new URL(origin).origin !== new URL(allowed!).origin) {
    throw new AppError('FORBIDDEN', 'Invalid origin', 403);
  }

  await next();
});
```

---

## 12. Testing Strategy

### 12.1 Backend Tests (Vitest)

```
backend/src/
  services/
    ticket.service.test.ts      # Unit tests for state machine, CRUD logic
    scheduling.service.test.ts   # Availability calculation, booking conflicts
    message.service.test.ts      # Edit window, internal note filtering
    user.service.test.ts         # Password hashing, soft delete
    backup.service.test.ts       # Backup/restore roundtrip
  middleware/
    auth.middleware.test.ts       # Token verification, role guards
    validate.middleware.test.ts   # Zod validation
  routes/
    auth.routes.test.ts           # Integration: login, logout, demo-login
    ticket.routes.test.ts         # Integration: CRUD, status transitions
```

### 12.2 Frontend Tests (Vitest + Testing Library)

```
frontend/src/
  components/
    shared/
      MessageThread.test.tsx
      StatusBadge.test.tsx
  hooks/
    use-auth.test.ts
  pages/
    admin/
      AdminDashboard.test.tsx
```

### 12.3 Test Commands

```bash
# Backend
cd backend && npm run test        # Watch mode
cd backend && npm run test:ci     # Single run

# Frontend
cd frontend && npm run test       # Watch mode
cd frontend && npm run test:ci    # Single run
```

---

## 13. Migration Path

### 13.1 What Ports Directly (minimal changes)

| Artifact | Current Location | Action |
|----------|-----------------|--------|
| Prisma schema | `prisma/schema.prisma` | Copy, apply fixes from section 4 |
| Seed data | `prisma/seed.ts` | Copy, make it the single source |
| Zod validations | `src/lib/validations/*.ts` | Copy directly |
| TypeScript types | `src/types/index.ts` | Copy directly |
| Service logic | `src/services/*.ts` | Copy, unify error convention |
| React components | `src/components/**/*.tsx` | Copy, update imports |
| i18n catalogs | `src/lib/i18n/locales/*` | Copy directly |
| Tailwind config | `tailwind.config.ts` | Copy directly |
| shadcn/ui components | `src/components/ui/*` | Copy directly |

### 13.2 What Gets Rewritten

| Artifact | Current | New |
|----------|---------|-----|
| Auth (5 files) | Custom HMAC in 3 runtimes | Single jose-based module |
| API routes (40 files) | Manual boilerplate | 11 Hono route files with middleware |
| Middleware | One monolithic `middleware.ts` | 5 composable middleware files |
| Data fetching | useState + useEffect + fetch | TanStack Query hooks |
| App routing | Next.js file-based | React Router v6 |
| Docker setup | Custom inline Dockerfile | Standard Dockerfile |
| Reverse proxy | Manual nginx config | Caddy with auto-HTTPS |

### 13.3 Database Migration

The Prisma schema is compatible. To migrate:

1. Create the v2 database (or use the existing one)
2. Run `npx prisma migrate deploy` -- same migration engine
3. If needed, run a data migration for `BackupRecord.type` and `BackupRecord.status` to use enum values

---

## 14. Implementation Order

### Phase 1: Backend Foundation (Week 1)

1. Initialize `backend/` with Hono, TypeScript, Prisma
2. Port Prisma schema with fixes
3. Create initial migration
4. Implement `lib/auth.ts` (jose), `lib/prisma.ts`, `lib/errors.ts`, `lib/config.ts`, `lib/logger.ts`
5. Implement all middleware: auth, error, validation, rate-limit, logging, CSRF
6. Implement `routes/auth.routes.ts` and `routes/health.routes.ts`
7. Write auth middleware tests
8. Verify: login, logout, me, health check working

### Phase 2: Core Business Logic (Week 1-2)

9. Port all Zod validation schemas
10. Port all TypeScript types + ALLOWED_TRANSITIONS
11. Port `ticket.service.ts` (consolidated from 7 files)
12. Implement `routes/ticket.routes.ts` (all ticket endpoints)
13. Port `scheduling.service.ts`
14. Implement `routes/appointment.routes.ts`
15. Port `message.service.ts`
16. Implement `routes/message.routes.ts`
17. Write service unit tests for ticket state machine
18. Verify: all ticket, appointment, message CRUD working

### Phase 3: Supporting Services (Week 2)

19. Port `notification.service.ts`, `user.service.ts`, `audit.service.ts`
20. Implement `routes/notification.routes.ts`, `routes/user.routes.ts`, `routes/config.routes.ts`
21. Port `backup.service.ts`
22. Implement `routes/backup.routes.ts`
23. Port `email.service.ts`, `sms.service.ts`
24. Implement `routes/technician.routes.ts`, `routes/demo.routes.ts`
25. Port and consolidate seed.ts (single file)
26. Verify: all API endpoints working, seed data loads

### Phase 4: Frontend (Week 2-3)

27. Initialize `frontend/` with Vite, React, TanStack Query, React Router
28. Port shadcn/ui components and Tailwind config
29. Implement API client and auth hook
30. Implement route guards and layouts
31. Port admin pages (dashboard, tickets, kanban, calendar, clients, settings, backups, technicians)
32. Port customer portal pages (dashboard, tickets, ticket detail, appointments)
33. Port technician pages (dashboard, tickets, ticket detail, schedule)
34. Port public pages (landing, login, service request)
35. Port i18n system
36. Verify: all pages rendering, all interactions working

### Phase 5: Infrastructure (Week 3)

37. Write backend Dockerfile
38. Write docker-compose.yml (app + db + caddy)
39. Write Caddyfile
40. Set up GitHub Actions CI/CD pipeline
41. Configure production secrets (.env)
42. Deploy to production server
43. Set up automated database backups (cron)
44. Set up uptime monitoring (UptimeRobot or similar)
45. Verify: production deployment working, HTTPS, health checks passing

### Phase 6: Hardening & Polish (Week 3-4)

46. Add Trivy image scanning to CI
47. Write remaining integration tests
48. Load test critical endpoints (login, ticket list, appointment booking)
49. Security audit: verify all checklist items from section 11
50. Documentation: update README with new setup instructions

---

## Estimated Outcomes

| Metric | Current | After Rebuild |
|--------|---------|---------------|
| Total backend files | ~100 | ~35 |
| Total frontend files | ~80 | ~65 |
| Auth implementation files | 5 | 1 |
| API route files | 40 | 11 |
| Lines of boilerplate | ~3,000 | ~200 |
| Duplicated seed data files | 2 | 1 |
| node_modules (backend) | ~772 MB | ~150 MB (est.) |
| Docker image size | ~350 MB | ~200 MB (est.) |
| Dockerfile complexity | 56 lines + workarounds | ~25 lines, standard |
| Framework attack surface | Next.js (460+ transitive deps) | Hono (14KB, ~30 deps) |
| Time to build | ~3 min | ~30 sec (est.) |
| Security issues | 6 identified | 0 by design |
