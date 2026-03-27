# Getting Started with Valitek

> **Who this is for:** You don't need to be a developer to understand this guide. Whether you're a business owner, a non-technical collaborator, or an AI assistant helping someone build software — this document explains what Valitek is, what it does, and how to use it to build your own custom application.
>
> **⚠️ Note:** Sections 4–6, 8, and parts of 9–10 describe the **planned modular framework**
> (`ticket3`), which is **not yet implemented**. The current `ticket2` codebase is a
> monolithic application. See `MODULARITY_SPEC.md` for the full future design.
> Sections 1–3 and 7 accurately describe the current working application.

---

## Table of Contents

1. [What Is Valitek?](#1-what-is-valitek)
2. [The Big Idea in Plain English](#2-the-big-idea-in-plain-english)
3. [What's Already Built](#3-whats-already-built)
4. [What You Can Build With It](#4-what-you-can-build-with-it)
5. [Key Concepts You Need to Know](#5-key-concepts-you-need-to-know)
6. [How to Build a New App (Step by Step)](#6-how-to-build-a-new-app-step-by-step)
7. [Customizing Your App Without Writing Code](#7-customizing-your-app-without-writing-code)
8. [For AI Assistants: How to Help a Human Build a Vertical](#8-for-ai-assistants-how-to-help-a-human-build-a-vertical)
9. [Common Questions](#9-common-questions)
10. [Where to Go Next](#10-where-to-go-next)

---

## 1. What Is Valitek?

Valitek is a **web application framework** — think of it as a pre-built foundation for building business management tools. It comes out of the box as a fully working IT service ticket system (for a computer repair shop), but it's designed so you can adapt it into almost any kind of business application without starting from scratch.

Examples of what you could turn it into:
- A **property management** system (work orders, tenant tickets, maintenance scheduling)
- A **healthcare clinic** intake and appointment system
- A **legal firm** client request and document tracking portal
- A **school** helpdesk for IT, facilities, and student services
- A **freelancer** client project and invoice tracker

The core of Valitek handles the hard stuff that every business app needs: user accounts, logins, permissions, notifications, email/SMS, audit logs, backups, and settings. The domain-specific stuff (what kind of "tickets" or "orders" you're managing) is handled by swappable modules that you choose and configure.

---

## 2. The Big Idea in Plain English

Imagine a restaurant. The kitchen, the plumbing, the electrical wiring, the point-of-sale system — that's the **core**. It works the same whether you're running a sushi bar or a pizza place.

The **menu**, the **decor**, and the **staff uniforms** are the modules — swappable, customizable, specific to your concept.

Valitek works the same way:

| Restaurant | Valitek |
|---|---|
| Kitchen, plumbing, electricity | Core: auth, users, notifications, backups |
| Menu | Modules: tickets, work orders, scheduling |
| Decor & branding | Config: your logo, colors, app name |
| Staff roles | User roles: Admin, Technician/Agent, Customer/Client |

You pick which modules you want, configure them for your domain, and deploy. The same reliable foundation powers everything.

---

## 3. What's Already Built

The current `ticket2` codebase is a **fully working application** — not a demo or a prototype. It is production-ready for an IT repair shop. Here's what exists right now:

### Three Portals

**Admin Portal** (`/admin`)
- Dashboard with live stats
- Manage all tickets and work orders
- Kanban board view
- Calendar/scheduling
- Client management
- Technician management with custom permissions
- System settings and branding
- Database backup and restore

**Technician Portal** (`/technicien`)
- Personal dashboard (assigned tickets only)
- Ticket detail with full action panel
- Weekly schedule view

**Customer Portal** (`/portail`)
- Submit service requests
- View ticket history and status
- Approve/decline quotes
- Book and manage appointments

### Core Features (available in every deployment)

- ✅ Secure login with role-based access
- ✅ In-app notifications
- ✅ Email notifications (via Microsoft 365)
- ✅ SMS notifications (via VoIP.ms)
- ✅ Audit log (every action is recorded)
- ✅ Database backup and restore (from the admin panel)
- ✅ French/English language support
- ✅ Demo mode with persona switcher
- ✅ Branding config (logo, company name, colors)
- ✅ Rate limiting and security hardening

---

## 4. What You Can Build With It

> **⚠️ FUTURE PLANS** — This section describes capabilities of the planned modular framework,
> not the current `ticket2` application. See `MODULARITY_SPEC.md`.

Once the modular framework migration is complete (see `MODULARITY_SPEC.md`), new apps are created by:

1. Choosing which built-in modules to include
2. Defining your own statuses, categories, and priorities in plain text
3. Setting your branding
4. Deploying with the same one-command Docker setup

### Example Verticals

#### 🏠 Property Management

| Concept | Mapped From |
|---|---|
| Tenant | Customer |
| Maintenance request | Ticket |
| Repair job (in-house) | Work Order |
| Contractor visit | Appointment |
| Building manager | Admin |
| Maintenance staff | Technician |

Custom statuses: `New`, `Scheduled`, `In Progress`, `Pending Parts`, `Complete`  
Custom categories: `Plumbing`, `Electrical`, `HVAC`, `Appliance`, `Structural`

#### 🏥 Clinic / Healthcare

| Concept | Mapped From |
|---|---|
| Patient | Customer |
| Intake request | Ticket |
| Appointment | Appointment |
| Physician / Nurse | Technician |
| Clinic admin | Admin |

Custom statuses: `Received`, `Triaged`, `Scheduled`, `In Consultation`, `Follow-Up Required`, `Closed`  
Custom categories: `General`, `Specialist Referral`, `Lab`, `Prescription`, `Administrative`

#### ⚖️ Legal / Professional Services

| Concept | Mapped From |
|---|---|
| Client | Customer |
| Matter / File request | Ticket |
| Consultation | Appointment |
| Associate / Paralegal | Technician |
| Partner / Office manager | Admin |

Custom statuses: `Intake`, `Under Review`, `Awaiting Client`, `In Progress`, `Resolved`, `Archived`

---

## 5. Key Concepts You Need to Know

You'll see these words throughout the documentation. Here's what they mean in plain English.

### Core
The shared foundation of the app. Handles logins, user accounts, notifications, emails, backups. **You never change this.** It works automatically.

### Module
A self-contained feature pack. The `tickets` module adds ticket management. The `scheduling` module adds calendar and appointments. You pick which ones to include in your deployment. Each module brings its own pages, API endpoints, and database tables.

### Deployment
Your specific instance of the app. It's where you decide: "I want the `tickets` module and the `messaging` module, with these statuses, this branding, and this language." A deployment is the final assembled product.

### ConfigOption
This is how you define your domain without writing code. Instead of the app having hardcoded IT-specific terms like `REPARATION` or `LAPTOP`, you define your own list of statuses, categories, priorities, and types — in your own language, with your own labels and colors. Think of it as a settings file for what words your app uses.

### Module Manifest
Every module has a manifest file — a single file that describes everything about it: what API routes it adds, what pages it contributes, what config options to seed, what events it emits. It's like a plugin descriptor.

### Event Bus
Modules talk to each other through events, not direct connections. When a ticket's status changes, the tickets module fires a `ticket.status_changed` event. The notification service hears that event and sends an email. The audit service hears it and writes a log entry. This means modules stay independent — you can add or remove them without breaking anything.

### UserRole
There are three built-in roles. Every deployment uses these same three roles, but you rename them to fit your domain:

| Built-in Role | IT Shop | Property Mgmt | Clinic |
|---|---|---|---|
| `ADMIN` | Admin | Building Manager | Clinic Admin |
| `TECHNICIAN` | Technician | Maintenance Staff | Physician |
| `CUSTOMER` | Client | Tenant | Patient |

---

## 6. How to Build a New App (Step by Step)

> **⚠️ FUTURE PLANS** — This section describes the workflow for the planned modular framework.
> The module system, ConfigOption table, and deployment folders do not exist yet in `ticket2`.

This section walks you through what it takes to go from zero to a deployed custom application using the Valitek framework. You'll need a developer (or AI assistant) to write the actual code, but this explains what decisions *you* need to make.

### Step 1 — Define Your Domain

Answer these questions before touching any code:

**A. What is the core "item" being tracked?**  
In the IT shop it's a "ticket". In property management it's a "maintenance request". In a law firm it's a "matter". Write this down — it will become your primary record type.

**B. What are the possible states it can be in?**  
Write out the lifecycle from creation to completion. Example for a maintenance request:
> New → Assigned → Scheduled → In Progress → Pending Parts → Complete → Closed

Mark which ones are "terminal" (no further action possible): usually `Closed`, `Cancelled`, `Rejected`.

**C. What categories does it fall into?**  
For an IT shop: Hardware, Software, Network. For a clinic: General, Specialist, Lab.

**D. What priority levels do you need?**  
Most apps use 3–4: Low, Normal, High, Urgent. You can rename these.

**E. Who are your three user types?**  
Fill in the role table from section 5 for your domain.

**F. What language?**  
The app supports French and English out of the box. Pick your default.

---

### Step 2 — Map Your Modules

Decide which of the four built-in modules you need:

| Module | What it adds | Include? |
|---|---|---|
| `tickets` | Ticket/request creation, status workflow, quotes, assignments | Almost always yes |
| `workorders` | In-shop / in-house repair jobs with device tracking | Only if you track physical items |
| `scheduling` | Calendar, appointments, technician availability | Yes if you book visits or consultations |
| `messaging` | Threaded messages on tickets, internal notes | Usually yes |

If you need something that doesn't exist (e.g. invoicing, inventory), that becomes a **new module** — a developer or AI assistant writes it using the module contract defined in `MODULARITY_SPEC.md`.

---

### Step 3 — Write Your ConfigOptions

This is the most important configuration file and it requires no programming knowledge — it's just a list.

Create a file called `config-options.ts` in your deployment folder. Fill it in like this:

```
Statuses:
  key: NEW          label: New             color: grey
  key: ASSIGNED     label: Assigned        color: blue
  key: IN_PROGRESS  label: In Progress     color: blue
  key: BLOCKED      label: Blocked         color: red
  key: COMPLETE     label: Complete        color: green
  key: CLOSED       label: Closed          color: grey    terminal: yes
  key: CANCELLED    label: Cancelled       color: grey    terminal: yes

Categories:
  key: PLUMBING     label: Plumbing
  key: ELECTRICAL   label: Electrical
  key: HVAC         label: HVAC
  key: APPLIANCE    label: Appliance
  key: OTHER        label: Other

Priorities:
  key: LOW          label: Low             color: grey
  key: NORMAL       label: Normal          color: blue
  key: HIGH         label: High            color: orange
  key: URGENT       label: Urgent          color: red
```

A developer or AI assistant converts this into the actual TypeScript format — the structure is defined in `MODULARITY_SPEC.md` section 7.

---

### Step 4 — Set Your Branding

In the admin panel under **Settings**, you can configure:
- Company name
- Logo (upload)
- Primary color
- Application name (what shows in the browser tab)
- Contact email and phone

This is done entirely through the UI — no code needed.

---

### Step 5 — Write Your Seed Data

Seed data is the "starter content" that gets loaded into the app when it's first deployed. For a demo or test environment, this means:
- A few sample user accounts (admin, staff, customer)
- A few sample records (tickets, work orders, appointments)
- Your ConfigOptions (from Step 3)

A developer or AI writes the seed file based on what you describe. You just need to tell them:
- What user names/emails to use for demo accounts
- What sample records would show off the app well

---

### Step 6 — Deploy

Deployment is a one-command operation using Docker. Once the code is ready:

```bash
docker compose up -d
```

That's it. The app starts, runs its database migrations automatically, loads your seed data, and is available at your domain.

Your developer sets up:
- A server (any VPS: DigitalOcean, Hetzner, Vultr — $6–20/month)
- A domain name pointed at the server
- The `.env` file with your secrets

The app handles HTTPS automatically via Caddy.

---

## 7. Customizing Your App Without Writing Code

These things can be done entirely through the admin panel after deployment:

### Branding
Settings → Branding. Change company name, logo, colors, contact info.

### User Management
Admin → Users. Create accounts, set roles, deactivate users, reset passwords.

### Technician Permissions
Each technician/agent has 5 individual permission toggles:
- Can accept/self-assign tickets
- Can close tickets
- Can send price quotes
- Can cancel appointments
- Can view all tickets (vs only their own)

### Notifications
Notifications are automatic — no configuration needed. When a ticket status changes, the relevant people get an in-app notification, email, and/or SMS depending on what's configured in the environment.

### Backups
Admin → Backups. Create a manual backup at any time. Download it. Restore from any previous backup. Automated nightly backups run via a cron job set up by your server administrator.

### Demo Mode
If `DEMO_MODE=true` is set in the environment, a persona selector appears at login allowing anyone to log in as a demo user. Useful for showing clients or stakeholders the app before going live. The admin can reset demo data to its original state at any time.

---

## 8. For AI Assistants: How to Help a Human Build a Vertical

> **⚠️ FUTURE PLANS** — This section references the modular framework (module manifests,
> deployments, event bus) which is not yet implemented. The coding patterns and rules
> (AppError, validateBody, TanStack Query, i18n) **do** apply to the current codebase.

If you're an AI assistant (like Claude, GPT, Copilot, etc.) helping someone build a new vertical on top of this codebase, follow this checklist.

### Before Writing Any Code

1. **Read `MODULARITY_SPEC.md`** — this is the technical source of truth. Understand the `ModuleManifest` interface, `ConfigOption` schema, module registry, and event bus contract before writing anything.

2. **Read `newspec.md`** — this is the full rebuild specification for the backend (Hono, Prisma, TypeScript) and frontend (React, Vite, TanStack Query). All code you write must follow the patterns defined there: AppError for errors, validateBody middleware, no try/catch in routes, TanStack Query for data fetching, typed API client.

3. **Ask the human these questions** before writing code:
   - What is the primary entity being tracked? (the "ticket" equivalent)
   - What are its statuses and which are terminal?
   - What categories and priorities are needed?
   - Which modules do they need? (tickets, workorders, scheduling, messaging)
   - What language? (fr / en)
   - Do they need a new module that doesn't exist yet?

### Creating a New Deployment

A deployment lives at `deployments/<your-app-name>/`. It contains:

```
deployments/my-app/
├── index.ts              # Registers modules, starts core
├── seed/
│   ├── config-options.ts # All ConfigOption entries for this domain
│   └── demo-data.ts      # Sample users and records
└── locales/
    ├── fr.json           # Any overrides to French strings
    └── en.json           # Any overrides to English strings
```

**`index.ts` template:**

```ts
import { registerModule } from '../../core/backend/src/module-registry.js'
import ticketsModule from '../../modules/tickets/module.manifest.js'
import messagingModule from '../../modules/messaging/module.manifest.js'
// Add or remove modules as needed

registerModule(ticketsModule)
registerModule(messagingModule)

import '../../core/backend/src/index.js'
```

**`config-options.ts` template:**

```ts
import type { ConfigOptionSeed } from '../../core/backend/src/types/module.js'

export const configOptions: ConfigOptionSeed[] = [
  // Statuses
  { module: 'tickets', type: 'status', key: 'NEW',         label: 'New',         color: '#94a3b8', sortOrder: 0 },
  { module: 'tickets', type: 'status', key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6', sortOrder: 1 },
  { module: 'tickets', type: 'status', key: 'CLOSED',      label: 'Closed',      color: '#6b7280', sortOrder: 2, isTerminal: true },

  // Priorities
  { module: 'tickets', type: 'priority', key: 'LOW',    label: 'Low',    color: '#94a3b8', sortOrder: 0 },
  { module: 'tickets', type: 'priority', key: 'NORMAL', label: 'Normal', color: '#3b82f6', sortOrder: 1 },
  { module: 'tickets', type: 'priority', key: 'HIGH',   label: 'High',   color: '#ef4444', sortOrder: 2 },

  // Categories — customize for your domain
  { module: 'tickets', type: 'category', key: 'GENERAL', label: 'General', sortOrder: 0 },
]
```

### Creating a New Module

If the human needs a feature that doesn't exist in the four built-in modules, create a new one at `modules/<name>/`. Every module requires:

**Required files:**
```
modules/my-module/
├── module.manifest.ts        # The module descriptor — see interface in MODULARITY_SPEC.md
├── backend/
│   ├── routes/
│   │   └── mymodule.routes.ts
│   ├── services/
│   │   └── mymodule.service.ts
│   └── validations/
│       └── mymodule.ts
├── frontend/
│   ├── pages/
│   │   ├── admin/
│   │   └── portal/
│   └── locales/
│       ├── fr.json
│       └── en.json
└── prisma/
    └── mymodule.prisma       # Any new database models
```

**Rules for module code:**
- Routes: no try/catch, use `validateBody()` middleware, throw `AppError` for errors
- Services: all errors thrown as `AppError`, no Prisma in routes
- Events: use `emit()` from the event bus — never call another module's service directly
- Frontend: all data fetching via TanStack Query, all strings via `t()` hook, no hardcoded labels
- Schema: no new enums — use `ConfigOption` lookups instead

**Manifest template:**

```ts
import type { ModuleManifest } from '../../core/backend/src/types/module.js'
import router from './backend/routes/mymodule.routes.js'

const manifest: ModuleManifest = {
  id: 'my-module',
  version: '1.0.0',
  label: 'My Module',
  description: 'What this module does in one sentence.',
  dependencies: [],          // e.g. ['tickets'] if you depend on tickets module

  routes: [
    { path: '/api/my-module', router }
  ],

  configOptions: [
    // Any domain config this module needs seeded
  ],

  emits: [
    'my-module.record_created',
    'my-module.status_changed',
  ],

  eventSubscriptions: [
    {
      event: 'user.created',
      handler: async (payload) => {
        // React to a core event if needed
      }
    }
  ],

  navItems: [
    { label: 'My Section', path: '/admin/my-section', icon: 'folder', roles: ['ADMIN'] }
  ],

  seed: async (prisma) => {
    // Insert your ConfigOptions and any default records
  }
}

export default manifest
```

### Code Quality Rules (Non-Negotiable)

These come from `newspec.md` and must be followed in all new code:

| Rule | Why |
|---|---|
| Never put try/catch in route handlers | Global error middleware handles all errors |
| Always throw `AppError`, never return error objects | Consistent error format across the entire API |
| Never write Prisma queries in route files | Services own all data access |
| Never add a new Prisma enum for domain values | Use `ConfigOption` table instead |
| Never hardcode user-facing strings in components | Use `t('key')` from i18n hook |
| Always use TanStack Query for data fetching | No `useState` + `useEffect` + `fetch` patterns |
| Always use `validateBody()` middleware for POST/PATCH | Never manually parse request bodies in routes |
| Auth cookie is always `httpOnly: true, secure: true, sameSite: 'Strict'` | Security |

### Event Naming Convention

```
<module-id>.<entity>_<past-tense-verb>

Examples:
  tickets.ticket_created
  tickets.status_changed
  workorders.order_completed
  scheduling.appointment_booked
  my-module.record_archived
```

### When You're Unsure

- If you don't know which module a feature belongs to → put it in the most relevant existing module, not a new one
- If you're unsure whether something belongs in core or a module → if it's domain-specific, it's a module
- If a new database model is needed → add it to the module's `.prisma` file, not the core schema
- If you need cross-module communication → use the event bus, never direct service imports

---

## 9. Common Questions

**Q: Do I need to know how to code to use this?**  
A: To run and configure an existing deployment, no. To build a new custom vertical, you need a developer or an AI assistant to write the code — but you make the product decisions described in section 6.

**Q: How long does it take to build a new vertical?**  
A: With a developer or capable AI assistant, a new deployment using existing modules can be configured in a day. A deployment requiring a new custom module typically takes 3–5 days.

**Q: Can I change the three user roles?**  
A: The role names (`ADMIN`, `TECHNICIAN`, `CUSTOMER`) are fixed in the database, but you can display them as anything you want in the UI using the i18n system. In a clinic, `TECHNICIAN` shows as "Physician". In a law firm, it shows as "Associate". The permissions system stays the same.

**Q: Can two deployments share a database?**  
A: No. Each deployment gets its own database. This keeps data completely separate between clients or projects.

**Q: What if I need a feature that no module provides?**  
A: You write a new module. Section 8 explains how — or hand that section to an AI assistant and describe what you need.

**Q: Is this multi-tenant? (Can one installation serve multiple clients?)**  
A: Not yet. Each deployment is single-tenant. Multi-tenancy support would require a core upgrade — it's a valid future direction but not in the current spec.

**Q: Where does data live?**  
A: In a PostgreSQL database on the server you deploy to. You own it completely. There is no cloud service, no SaaS dependency, no data sent to third parties (except email via Microsoft 365 and SMS via VoIP.ms if you configure those).

**Q: What happens if I want to add the scheduling module later after launching without it?**  
A: Add it to your deployment's `index.ts`, run a database migration for its new tables, and redeploy. Because modules are independent, adding one doesn't affect the others.

**Q: Can I rename fields? Like calling "tickets" something else throughout the app?**  
A: Yes — through the i18n locale files. Every user-facing string is a translatable key. Override the `tickets.*` keys in your deployment's `locales/en.json` to call them whatever you want.

---

## 10. Where to Go Next

| Document | What's In It | Who It's For |
|---|---|---|
| `GETTING_STARTED.md` | This document — overview and human guide | Everyone |
| `MODULARITY_SPEC.md` | Technical architecture for the modular framework | Developers and AI assistants |
| `newspec.md` | Full rebuild spec: stack decisions, schema, API design, security, Docker | Developers and AI assistants implementing the system |
| `README.md` | How to run the current ticket2 app locally | Developers |

### Quick Reference: Which Doc to Read First

- **"I want to understand what this app does"** → You're already reading it. Done.
- **"I want to build a new app on top of this"** → Read sections 5–6 of this doc, then `MODULARITY_SPEC.md`
- **"I'm a developer implementing the framework migration"** → Read `newspec.md` first, then `MODULARITY_SPEC.md`
- **"I'm an AI assistant asked to build a vertical"** → Read section 8 of this doc, then both spec files
- **"I want to run the existing app locally right now"** → Read `README.md`
