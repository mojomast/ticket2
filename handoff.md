# Handoff

## Latest Session Changes

Three features implemented in parallel:

### 1. Expanded Seed Data (`backend/prisma/seed.ts`)

| Entity | Before | After |
|--------|--------|-------|
| Users | 6 (1 admin, 2 techs, 3 customers) | 13 (1 admin, 2 techs, 10 customers) |
| Tickets | 7 | 14 |
| Appointments | 2 | 6 |
| Messages | 5 | 13 |
| Notifications | 4 | 9 |
| Work Orders | 8 | 16 |
| Work Order Notes | 7 | 12 |

- 7 new CUSTOMER users (client4-client10) with French-Canadian names and Montreal addresses
- Mix of RESIDENTIAL and COMMERCIAL customers (some with companyName)
- 7 new tickets (TKT-260108 through TKT-260114) in various statuses
- 4 new appointments (TERMINE past, EN_COURS today, ANNULE, PLANIFIE future)
- 8 new work orders (BDT-260309 through BDT-260316) with spread intake dates for age indicator:
  - 0 days (RECEPTION), 1 day (DIAGNOSTIC), 4 days (EN_REPARATION), 8 days (VERIFICATION + PRET), 10 days (APPROUVE), 12 days (ATTENTE_PIECES), 15 days (ABANDONNE)
  - Device types: TELEPHONE, IMPRIMANTE, TOUT_EN_UN, RESEAU_EQUIP, DESKTOP, TABLETTE, LAPTOP
- 8 new messages on various tickets
- 5 new notifications (TICKET_CREATED, QUOTE_SENT, APPOINTMENT_BOOKED, STATUS_CHANGED, NEW_MESSAGE)
- 5 new work order notes

Date variables added: fourDaysAgo, eightDaysAgo, tenDaysAgo, twelveDaysAgo, fifteenDaysAgo, twoWeeksFromNow

### 2. DemoBanner Customer Dropdown (`frontend/src/components/shared/DemoBanner.tsx`)

- Personas grouped by role: ADMIN, TECHNICIAN, CUSTOMER
- Admin and Technician personas remain as pill buttons
- Customer personas rendered in a `<select>` dropdown (shows "Clients (N)" as placeholder)
- Dropdown highlights with amber active styling when current user is a customer
- Handles 10+ customer personas without overflowing the toolbar

### 3. Work Order Age Indicator (`frontend/src/pages/workorders/WorkOrdersDashboard.tsx`)

- New `AgeBadge` component calculates days since `wo.intakeDate`
- Color-coded: green (0-2 days), yellow (3-5 days), orange (6-9 days), red (10+ days)
- Rendered as small rounded pill badge (text-xs, rounded-full)
- Integrated into both KanbanCard and ListView table (new "Age" column)
- Returns null for terminal statuses (REMIS, REFUSE, ABANDONNE, ANNULE)

## Files Modified
- `backend/prisma/seed.ts` -- Expanded from 713 to ~1452 lines
- `frontend/src/components/shared/DemoBanner.tsx` -- Refactored persona rendering
- `frontend/src/pages/workorders/WorkOrdersDashboard.tsx` -- Added AgeBadge component
- `README.md` -- Updated demo accounts, seed data counts, feature descriptions
- `handoff.md` -- This file

## Verification
- Backend TypeScript: Clean (tsc --noEmit)
- Frontend TypeScript: Clean (tsc --noEmit)
- Vite production build: Clean (41 chunks)
- Backend tests: 83/83 passing
- Database seed: Successful

## Previous State
All core functionality was already implemented:
- 3 role-based portals: Admin, Technician, Customer
- 10-state ticket lifecycle with role-gated state machine
- Work Order system with 12-state lifecycle, Kanban dashboard, detail/edit page, intake form
- Appointment proposals with accept/reject/counter-propose
- French/English internationalization

## Key Technical Notes
- Demo password hash is pre-computed (no hash-wasm import in seed): `$argon2id$v=19$m=19456,t=2,p=1$c2VlZHNhbHQxMjM0NTY3OA$YnJpZ2h0aGFzaGVkdmFsdWVoZXJl`
- TanStack Query v5 removed `onSuccess` from `useQuery` -- use `useEffect` instead
- CSRF validates Origin header against `FRONTEND_URL` env var
- `workOrderListQuerySchema` has `.max(100)` on limit
- Backend port 3200, frontend port 5173
- Prisma requires `Prisma.JsonNull` instead of raw `null` for nullable JSON fields
