> **⚠️ PLANNED / NOT YET IMPLEMENTED** — This document describes the *future* modular
> architecture for Valitek. None of the module registry, event bus, ConfigOption table,
> or deployment system described below exists in the current codebase (`ticket2`).
> The current app is a monolithic Hono + React application. Treat this spec as a
> design blueprint for a future `ticket3` refactor.

# Valitek Modular Framework Spec
## `ticket3` / `valitek-core`

**Version:** 1.0  
**Based on:** `mojomast/ticket2` @ current HEAD  
**Goal:** Refactor ticket2 into a deployable framework where the IT ticketing system becomes one optional module, and new vertical deployments can be built by composing modules against a shared core.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Repository Structure](#2-repository-structure)
3. [Core Schema](#3-core-schema-prisma)
4. [Module Contract](#4-module-contract)
5. [Module Registry](#5-module-registry)
6. [Event Bus](#6-event-bus)
7. [Module Extraction](#7-module-extraction--ticket2--modules)
8. [Frontend Module System](#8-frontend-module-system)
9. [i18n](#9-i18n--complete-the-85)
10. [Gaps Resolved](#10-remaining-ticket2-gaps--resolved-by-this-spec)
11. [CI Pipeline](#11-ci-pipeline)
12. [Migration Path](#12-migration-path-from-ticket2)
13. [What This Enables](#13-what-this-enables)

---

## 1. Design Philosophy

The current ticket2 architecture is already structurally sound — Hono route mounting, layered services, decoupled middleware, and a generic `SystemConfig` / `AuditLog` schema. The framework work is **not a rewrite** — it is a series of targeted extractions and interface definitions. Every existing feature keeps working. New deployments simply omit or replace modules.

**Three rules:**
1. The core never imports from a module
2. Modules never import from each other (they communicate via core events)
3. Domain enums live in config tables, not the Prisma schema

---

## 2. Repository Structure

```
valitek-core/
├── core/                        # Shared, deployment-agnostic
│   ├── backend/
│   │   ├── src/
│   │   │   ├── lib/             # prisma, logger, errors (unchanged)
│   │   │   ├── middleware/      # All 6 middleware files (unchanged)
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── audit.service.ts
│   │   │   │   ├── backup.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   └── sms.service.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── profile.routes.ts
│   │   │   │   ├── notification.routes.ts
│   │   │   │   ├── config.routes.ts
│   │   │   │   ├── backup.routes.ts
│   │   │   │   └── health.routes.ts
│   │   │   ├── events/
│   │   │   │   └── event-bus.ts  # NEW — lightweight in-process event emitter
│   │   │   ├── module-registry.ts # NEW — module manifest loader
│   │   │   └── index.ts          # Core app bootstrap
│   │   └── prisma/
│   │       └── schema.prisma     # Core-only models
│   └── frontend/
│       ├── src/
│       │   ├── core/             # Auth, layout, routing shell, i18n
│       │   ├── components/shared/ # All existing shared components (unchanged)
│       │   └── module-registry.ts # NEW — frontend module manifest
│
├── modules/
│   ├── tickets/                  # Extracted from ticket2
│   ├── workorders/               # Extracted from ticket2
│   ├── scheduling/               # Extracted from ticket2
│   └── messaging/                # Extracted from ticket2
│
└── deployments/
    └── valitek-it/               # ticket2 reassembled from core + all 4 modules
```

---

## 3. Core Schema (Prisma)

The core schema strips all IT-specific enums and replaces them with generic, configurable models. **All existing ticket2 models remain** — they move into module-owned schema files via Prisma schema splitting.

### 3.1 Models That Stay in Core (Unchanged)

- `User` — remove `customerType`, `companyName` (move to module-level profile extensions via `Json` metadata field)
- `SystemConfig` — unchanged, this is the config backbone
- `AuditLog` — unchanged, already fully generic
- `BackupRecord` — unchanged
- `Notification` — change `ticketId` to `entityId String?` + `entityType String?` (generic reference instead of hard FK to Ticket)
- `Attachment` — change `ticketId` to `entityId String` + `entityType String`

### 3.2 Enum Migration — The Core Change

Every hard Prisma enum that is domain-specific gets replaced with a `ConfigOption` lookup pattern.

**Remove from core schema:**
- `ServiceCategory`, `ServiceMode`, `TicketStatus`, `Priority` (ticket-domain)
- `WorkOrderStatus`, `DeviceType`, `DataBackupConsent` (workorder-domain)
- `AppointmentStatus`, `ProposalStatus` (scheduling-domain)
- `NotificationType` (replace with `String`)

**Add to core schema:**

```prisma
// Replaces all domain enums
model ConfigOption {
  id         String  @id @default(uuid())
  module     String  // e.g. "tickets", "workorders", "scheduling"
  type       String  // e.g. "status", "category", "priority", "device_type"
  key        String  // machine key, e.g. "NOUVELLE"
  label      String  // display label, e.g. "Nouvelle" or "New"
  color      String? // optional hex for badges
  icon       String? // optional icon name
  sortOrder  Int     @default(0)
  isTerminal Boolean @default(false) // for status terminal states
  metadata   Json?   // module-specific extra data
  locale     String  @default("fr")

  @@unique([module, type, key, locale])
  @@index([module, type])
}
```

This single table replaces `ServiceCategory`, `TicketStatus`, `WorkOrderStatus`, `DeviceType`, `Priority`, `AppointmentStatus`, `ProposalStatus`, and `NotificationType` — all configurable per deployment, all seedable per module.

### 3.3 Core User Extensions

Remove hard-typed `customerType`, `companyName`, `address` from `User`. Replace with:

```prisma
model UserProfile {
  userId   String @id
  metadata Json   // module-specific fields stored here
  user     User   @relation(fields: [userId], references: [id])
}
```

Each module's seed defines what goes in `metadata` for its user types.

---

## 4. Module Contract

Every module must export a manifest file: `module.manifest.ts`

```ts
export interface ModuleManifest {
  id: string                    // e.g. "tickets"
  version: string               // semver
  label: string                 // display name
  description: string
  dependencies?: string[]       // other module IDs this depends on

  // Backend
  routes: {
    path: string                // e.g. "/api/tickets"
    router: Hono                // the Hono app instance
    public?: boolean            // skip requireAuth?
    adminOnly?: boolean
  }[]

  // Config options this module seeds into ConfigOption table
  configOptions: {
    type: string
    key: string
    label: string
    color?: string
    isTerminal?: boolean
    locale?: string
    metadata?: Record<string, unknown>
  }[]

  // Event subscriptions (what core events does this module listen to?)
  eventSubscriptions?: {
    event: string               // e.g. "user.created", "backup.completed"
    handler: (payload: unknown) => Promise<void>
  }[]

  // Events this module emits (for documentation/discovery)
  emits?: string[]

  // Frontend
  navItems?: {
    label: string
    path: string
    icon: string
    roles: string[]             // which UserRoles see this nav item
  }[]

  // Prisma schema additions (filename reference, applied via prisma migrate)
  schemaExtension?: string      // path to .prisma file for this module

  // Seed function
  seed?: (prisma: PrismaClient) => Promise<void>
}
```

---

## 5. Module Registry

### 5.1 Backend — `core/backend/src/module-registry.ts`

```ts
import type { ModuleManifest } from './types/module.js'
import type { Hono } from 'hono'

const modules: ModuleManifest[] = []

export function registerModule(manifest: ModuleManifest) {
  modules.push(manifest)
}

export function mountModules(app: Hono, requireAuth: Middleware, requireRole: Middleware) {
  for (const mod of modules) {
    for (const route of mod.routes) {
      if (!route.public) app.use(`${route.path}/*`, requireAuth)
      if (route.adminOnly) app.use(`${route.path}/*`, requireRole('ADMIN'))
      app.route(route.path, route.router)
    }
  }
}

export function getRegisteredModules() {
  return modules
}
```

### 5.2 Core `index.ts` (Simplified)

```ts
// Core mounts only core routes
app.route('/api/health', healthRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/admin/users', userRoutes)
// ... other core routes

// Modules mount themselves
mountModules(app, requireAuth, requireRole)
```

### 5.3 Deployment Entry Point — `deployments/valitek-it/index.ts`

```ts
import { registerModule } from '../../core/backend/src/module-registry.js'
import ticketsModule from '../../modules/tickets/module.manifest.js'
import workordersModule from '../../modules/workorders/module.manifest.js'
import schedulingModule from '../../modules/scheduling/module.manifest.js'
import messagingModule from '../../modules/messaging/module.manifest.js'

registerModule(ticketsModule)
registerModule(workordersModule)
registerModule(schedulingModule)
registerModule(messagingModule)

// Then start core
import '../../core/backend/src/index.js'
```

---

## 6. Event Bus

Modules should not call each other's services directly. Instead they emit events the core (or other modules) can subscribe to.

### `core/backend/src/events/event-bus.ts`

```ts
import { EventEmitter } from 'node:events'

const bus = new EventEmitter()
bus.setMaxListeners(50)

export function emit(event: string, payload: unknown) {
  bus.emit(event, payload)
}

export function on(event: string, handler: (payload: unknown) => void) {
  bus.on(event, handler)
}
```

### Standard Core Events (emitted by core services)

| Event | Payload |
|---|---|
| `user.created` | `{ userId, role }` |
| `user.deactivated` | `{ userId }` |
| `backup.completed` | `{ backupId }` |
| `backup.restored` | `{ backupId }` |

### Standard Module Events (tickets module)

| Event | Payload |
|---|---|
| `ticket.created` | `{ ticketId, ticketNumber, customerId, technicianId? }` |
| `ticket.status_changed` | `{ ticketId, oldStatus, newStatus, actorId }` |
| `ticket.assigned` | `{ ticketId, technicianId }` |
| `ticket.message_added` | `{ ticketId, messageId, authorId }` |

The notification service subscribes to all of these and fires email/SMS/in-app notifications — completely decoupled from the modules that emit them.

---

## 7. Module Extraction — ticket2 → modules/

### 7.1 `modules/tickets/`

**Extract from ticket2:**

| Source (ticket2) | Destination |
|---|---|
| `backend/src/routes/ticket.routes.ts` | `modules/tickets/backend/routes/` |
| `backend/src/routes/service-request.routes.ts` | `modules/tickets/backend/routes/` |
| `backend/src/routes/message.routes.ts` | `modules/tickets/backend/routes/` |
| `backend/src/services/ticket.service.ts` | `modules/tickets/backend/services/` |
| `backend/src/services/message.service.ts` | `modules/tickets/backend/services/` |
| `backend/src/validations/ticket.ts` | `modules/tickets/backend/validations/` |
| `frontend/src/pages/admin/Tickets.tsx` | `modules/tickets/frontend/pages/admin/` |
| `frontend/src/pages/admin/TicketDetail.tsx` | `modules/tickets/frontend/pages/admin/` |
| `frontend/src/pages/admin/KanbanBoard.tsx` | `modules/tickets/frontend/pages/admin/` |
| `frontend/src/pages/technician/Tickets.tsx` | `modules/tickets/frontend/pages/technician/` |
| `frontend/src/pages/technician/TicketDetail.tsx` | `modules/tickets/frontend/pages/technician/` |
| `frontend/src/pages/portal/` (all portal ticket pages) | `modules/tickets/frontend/pages/portal/` |

**Schema extension** (`modules/tickets/prisma/tickets.prisma`):
- `Ticket` model — replace `TicketStatus`, `Priority`, `ServiceMode`, `ServiceCategory` enums with `String` fields referencing `ConfigOption`
- `Message` model
- `Attachment` model (shared with workorders, owned by core after refactor)

**Config options seeded:**

```ts
configOptions: [
  // Statuses
  { type: 'status', key: 'NOUVELLE',                    label: 'Nouvelle',                     color: '#94a3b8' },
  { type: 'status', key: 'EN_ATTENTE_APPROBATION',      label: 'En attente d\'approbation',    color: '#f59e0b' },
  { type: 'status', key: 'EN_ATTENTE_REPONSE_CLIENT',   label: 'En attente réponse client',    color: '#f97316' },
  { type: 'status', key: 'APPROUVEE',                   label: 'Approuvée',                    color: '#84cc16' },
  { type: 'status', key: 'PLANIFIEE',                   label: 'Planifiée',                    color: '#06b6d4' },
  { type: 'status', key: 'EN_COURS',                    label: 'En cours',                     color: '#3b82f6' },
  { type: 'status', key: 'BLOCAGE',                     label: 'Blocage',                      color: '#ef4444' },
  { type: 'status', key: 'TERMINEE',                    label: 'Terminée',                     color: '#22c55e' },
  { type: 'status', key: 'FERMEE',                      label: 'Fermée',                       color: '#6b7280', isTerminal: true },
  { type: 'status', key: 'ANNULEE',                     label: 'Annulée',                      color: '#6b7280', isTerminal: true },
  // Priorities
  { type: 'priority', key: 'BASSE',   label: 'Basse',   color: '#94a3b8' },
  { type: 'priority', key: 'NORMALE', label: 'Normale', color: '#3b82f6' },
  { type: 'priority', key: 'HAUTE',   label: 'Haute',   color: '#f59e0b' },
  { type: 'priority', key: 'URGENTE', label: 'Urgente', color: '#ef4444' },
  // Categories
  { type: 'category', key: 'REPARATION',    label: 'Réparation' },
  { type: 'category', key: 'LOGICIEL',      label: 'Logiciel' },
  { type: 'category', key: 'RESEAU',        label: 'Réseau' },
  { type: 'category', key: 'DONNEES',       label: 'Données' },
  { type: 'category', key: 'INSTALLATION',  label: 'Installation' },
  { type: 'category', key: 'MAINTENANCE',   label: 'Maintenance' },
  { type: 'category', key: 'CONSULTATION',  label: 'Consultation' },
  { type: 'category', key: 'FORMATION',     label: 'Formation' },
  { type: 'category', key: 'AUTRE',         label: 'Autre' },
]
```

### 7.2 `modules/workorders/`

**Extract:**
- `backend/src/routes/workorder.routes.ts`
- `backend/src/services/workorder.service.ts`
- All workorder frontend pages

**Schema:** `WorkOrder`, `WorkOrderNote` — replace `WorkOrderStatus`, `DeviceType`, `DataBackupConsent`, `Priority` with `String` + `ConfigOption` lookup.

**Config options seeded (all 12 `WorkOrderStatus`, 9 `DeviceType`, 3 `DataBackupConsent` values):**

```ts
configOptions: [
  // WorkOrder Statuses
  { type: 'wo_status', key: 'RECEPTION',            label: 'Réception',              color: '#94a3b8' },
  { type: 'wo_status', key: 'DIAGNOSTIC',           label: 'Diagnostic',             color: '#f59e0b' },
  { type: 'wo_status', key: 'ATTENTE_APPROBATION',  label: 'Attente approbation',    color: '#f97316' },
  { type: 'wo_status', key: 'APPROUVE',             label: 'Approuvé',               color: '#84cc16' },
  { type: 'wo_status', key: 'ATTENTE_PIECES',       label: 'Attente pièces',         color: '#06b6d4' },
  { type: 'wo_status', key: 'EN_REPARATION',        label: 'En réparation',          color: '#3b82f6' },
  { type: 'wo_status', key: 'VERIFICATION',         label: 'Vérification',           color: '#8b5cf6' },
  { type: 'wo_status', key: 'PRET',                 label: 'Prêt',                   color: '#22c55e' },
  { type: 'wo_status', key: 'REMIS',                label: 'Remis',                  color: '#6b7280', isTerminal: true },
  { type: 'wo_status', key: 'REFUSE',               label: 'Refusé',                 color: '#6b7280', isTerminal: true },
  { type: 'wo_status', key: 'ABANDONNE',            label: 'Abandonné',              color: '#6b7280', isTerminal: true },
  { type: 'wo_status', key: 'ANNULE',               label: 'Annulé',                 color: '#6b7280', isTerminal: true },
  // Device Types
  { type: 'device_type', key: 'LAPTOP',        label: 'Portable' },
  { type: 'device_type', key: 'DESKTOP',       label: 'Ordinateur de bureau' },
  { type: 'device_type', key: 'TABLETTE',      label: 'Tablette' },
  { type: 'device_type', key: 'TELEPHONE',     label: 'Téléphone' },
  { type: 'device_type', key: 'TOUT_EN_UN',    label: 'Tout-en-un' },
  { type: 'device_type', key: 'IMPRIMANTE',    label: 'Imprimante' },
  { type: 'device_type', key: 'SERVEUR',       label: 'Serveur' },
  { type: 'device_type', key: 'RESEAU_EQUIP',  label: 'Équipement réseau' },
  { type: 'device_type', key: 'AUTRE',         label: 'Autre' },
  // Backup Consent
  { type: 'backup_consent', key: 'CLIENT_FAIT',     label: 'Client a fait la sauvegarde' },
  { type: 'backup_consent', key: 'ATELIER_FAIT',    label: 'Atelier fera la sauvegarde' },
  { type: 'backup_consent', key: 'DECLINE',         label: 'Client a décliné' },
  { type: 'backup_consent', key: 'NON_APPLICABLE',  label: 'Non applicable' },
]
```

### 7.3 `modules/scheduling/`

**Extract:**
- `backend/src/routes/appointment.routes.ts`
- `backend/src/routes/technician.routes.ts`
- `backend/src/services/scheduling.service.ts`
- `frontend/src/pages/admin/Calendar.tsx`
- `frontend/src/pages/technician/Schedule.tsx`

**Schema:** `Appointment`, `AppointmentProposal` — replace `AppointmentStatus`, `ProposalStatus` with `String`.

> **Note:** Scheduling depends on the `tickets` module (appointments link to tickets). Declared via `dependencies: ['tickets']` in the manifest. The module registry validates dependency order at startup.

### 7.4 `modules/messaging/`

The `Message` model and `message.routes.ts` currently belong to tickets. Extracted as its own module so other modules (workorders, future modules) can also attach message threads.

**Key change:** `Message.ticketId` → `Message.entityId String` + `Message.entityType String` — same generic reference pattern as Notification after core refactor.

---

## 8. Frontend Module System

### 8.1 Module Registry — `core/frontend/src/module-registry.ts`

```ts
export interface FrontendModule {
  id: string
  routes: {
    path: string
    element: React.LazyExoticComponent<any>
    layout: 'admin' | 'technician' | 'portal' | 'public'
    roles?: string[]
  }[]
  navItems?: {
    label: string
    path: string
    icon: string
    roles: string[]
  }[]
}

const modules: FrontendModule[] = []

export function registerFrontendModule(mod: FrontendModule) {
  modules.push(mod)
}

export function getRoutes() {
  return modules.flatMap(m => m.routes)
}

export function getNavItems(role: string) {
  return modules.flatMap(m => m.navItems ?? []).filter(n => n.roles.includes(role))
}
```

### 8.2 `App.tsx` — Dynamic Route Loading

Currently `App.tsx` has hardcoded route definitions. Replace with:

```tsx
import { getRoutes } from './module-registry'

// In router
{getRoutes().map(route => (
  <Route key={route.path} path={route.path} element={
    <Suspense fallback={<PageLoader />}>
      <route.element />
    </Suspense>
  } />
))}
```

### 8.3 `AppSidebar.tsx` — Dynamic Nav

Already reads branding from API. Extend to read nav items from `getNavItems(currentUser.role)` instead of hardcoded links.

---

## 9. i18n — Complete the 85%

The existing `useTranslation()` hook is only partially used across pages. The framework makes i18n **mandatory** at the module level.

**Each module ships its own locale files:**

```
modules/tickets/frontend/locales/
  fr.json
  en.json

modules/workorders/frontend/locales/
  fr.json
  en.json
```

**Core ships base locales:**

```
core/frontend/src/locales/
  fr.json   # auth, nav, common UI strings
  en.json
```

The i18n loader merges core + active module locales at startup. No hardcoded strings in any component — all user-facing text uses `t('key')`.

**Migration approach:** Run a single pass on all 20 pages replacing hardcoded French strings with `t()` calls while building the locale files in parallel.

---

## 10. Remaining ticket2 Gaps — Resolved by This Spec

| Gap from handoff.md | How this spec addresses it |
|---|---|
| Email/SMS orphaned | Event bus: notification service subscribes to module events, calls `email.service` / `sms.service` |
| i18n 15% done | Module locale files + mandatory `t()` policy across all pages |
| Pagination missing on 3 pages | Each module owns its pages — pagination added during extraction |
| Password change missing | Added to core `profile.routes.ts` as a core feature (not module-specific) |
| Attachments dead | `Attachment` refactored to generic `entityId`/`entityType` in core; each module registers its own upload endpoint |
| No CI pipeline | See section 11 |

---

## 11. CI Pipeline — `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd core/backend && npm ci
      - run: cd core/backend && npm run lint
      - run: cd core/backend && npm run test:ci

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd core/frontend && npm ci
      - run: cd core/frontend && npm run lint
      - run: cd core/frontend && npm run test:ci
      - run: cd core/frontend && npm run build
```

---

## 12. Migration Path from ticket2

Designed to be done incrementally — ticket2 keeps running at every step.

### Phase 1 — Core Extraction *(no behaviour change)*
Pull core models/services/middleware into `core/`, create `module-registry.ts`, update `index.ts` to use `mountModules()`. ticket2 still works, just reorganized.

### Phase 2 — Schema Migration
Add `ConfigOption` table, migrate enums to `String` fields, seed existing enum values into `ConfigOption`. All existing data preserved via a migration script.

### Phase 3 — Module Extraction
Move tickets, workorders, scheduling, messaging into `modules/`. Each gets its `module.manifest.ts`. `deployments/valitek-it/` assembles them. ticket2 behaviour fully preserved.

### Phase 4 — Event Bus Wiring
Replace direct cross-service notification/audit calls with `emit()`. Wire `notification.service` + `email.service` + `sms.service` as event subscribers. **This fixes the orphaned email/SMS gap.**

### Phase 5 — Frontend Module System
Extract frontend pages into module folders, implement dynamic routing and nav, complete i18n across all 20 pages.

### Phase 6 — New Deployment Proof
Build a second deployment (e.g. `deployments/helpdesk/`) using only `core` + `tickets` + `messaging` modules, with a different `ConfigOption` seed (English labels, different statuses) — proving the framework works.

---

## 13. What This Enables

Once complete, a new vertical deployment is:

1. Create `deployments/my-app/index.ts` — pick which modules to register
2. Provide a `ConfigOption` seed for your domain's statuses/categories/priorities
3. Optionally write a new module for domain-specific features
4. Deploy — same Docker/Caddy setup, same core auth, audit, backup, notifications

### Example: `deployments/helpdesk/` (English, tickets-only)

```ts
// deployments/helpdesk/index.ts
registerModule(ticketsModule)
registerModule(messagingModule)
// workorders and scheduling NOT registered — those pages/routes simply don't exist
```

```ts
// deployments/helpdesk/seed/config-options.ts
// English labels, simplified statuses
configOptions: [
  { type: 'status', key: 'NEW',         label: 'New',         color: '#94a3b8' },
  { type: 'status', key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { type: 'status', key: 'RESOLVED',    label: 'Resolved',    color: '#22c55e', isTerminal: true },
  { type: 'priority', key: 'LOW',    label: 'Low',    color: '#94a3b8' },
  { type: 'priority', key: 'MEDIUM', label: 'Medium', color: '#f59e0b' },
  { type: 'priority', key: 'HIGH',   label: 'High',   color: '#ef4444' },
]
```

Same codebase. Different deployment. Zero new code needed.

---

## Effort Breakdown

| Layer | Effort | What's Needed |
|---|---|---|
| Backend routing | **Low** | Already plug-and-play via Hono route mounting |
| Middleware | **Low** | Already fully decoupled |
| Config system | **Low** | `SystemConfig` key/value table is already there |
| Audit logging | **Low** | Already generic (`entityType`, `entityId`, `action`) |
| Schema enums | **High** | Replace with dynamic `ConfigOption` table + string fields |
| Notification types | **Medium** | Replace enum with string + module registry |
| Frontend structure | **High** | Reorganize from role-based to feature-module folders |
| i18n | **Medium** | Needs to cover 100% of user-facing strings before multi-deployment |
| Seed/demo data | **Medium** | Current seed is IT-shop specific — needs to be modular per deployment |
