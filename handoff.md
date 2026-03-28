# Handoff — Valitek v2

## Completed: Platform hardening + data/model cleanup pass after security review
## Next Task: Optional dedicated customer-signature workflow and deeper data-retention/product polish
## Context: This pass completed the previously queued work for work-order password encryption, real pagination UX, help-copy accuracy, Decimal money fields, and notification retention cleanup

## What Was Done (Latest Pass)

### 1. WorkOrder device password encryption
- `WorkOrder.devicePassword` is now encrypted at rest using AES-256-GCM via `backend/src/lib/workorder-password.ts`
- Service-layer reads transparently decrypt values before returning them to the app
- Existing plaintext rows remain readable; new encrypted values are stored with an `enc:v1:` prefix
- Config now supports optional `WORKORDER_DEVICE_PASSWORD_KEY`, with fallback to `AUTH_SECRET` and a safe dev/test fallback

### 2. Real pagination UX on capped list pages
- Portal appointments now use the paginated backend envelope with actual previous/next controls in `frontend/src/pages/portal/Appointments.tsx`
- Portal work orders now paginate properly in `frontend/src/pages/portal/WorkOrders.tsx`
- Shared work-order dashboard list/kanban pagination was improved in `frontend/src/pages/workorders/WorkOrdersDashboard.tsx`
- API client and scheduling query handling were updated so paging and sort order stay consistent

### 3. Help-content accuracy refresh
- `frontend/src/lib/help-content.ts` was corrected to match real ticket, appointment, work-order, and worksheet workflows
- Stale status names and misleading transition guidance were updated to reflect the current backend enums and role permissions

### 4. Float → Decimal migration for money fields
- Money/rate fields moved from Prisma `Float` to `Decimal` in `backend/prisma/schema.prisma`
- Added centralized decimal helpers in `backend/src/lib/decimal.ts`
- Prisma client now serializes Decimal values back to JSON-safe numbers in `backend/src/lib/prisma.ts`
- Ticket/work-order/worksheet financial writes and calculations now use Decimal-safe conversions
- Frontend display logic was adjusted where needed so valid zero-valued quote/cost fields still render correctly
- Local schema sync was applied with `npx prisma db push --accept-data-loss`

### 5. Notification retention cleanup
- Added retention policy config and cleanup logic in `backend/src/services/notification.service.ts`
- Default cleanup policy:
  - read notifications older than 30 days are deleted
  - unread notifications older than 180 days are deleted
- Cleanup runs shortly after startup and then every 24 hours from `backend/src/index.ts`
- Configurable via:
  - `NOTIFICATION_RETENTION_ENABLED`
  - `NOTIFICATION_RETENTION_READ_DAYS`
  - `NOTIFICATION_RETENTION_UNREAD_DAYS`

## Additional Notes From Earlier Recent Passes
- Attachment/message authorization was hardened
- Appointment authorization and chronology validation were tightened
- Demo reset now clears the auth cookie and logs out cleanly
- Worksheet signature flow is currently technician-only in the implemented app flow
- Admin/non-admin empty-state sweeps and broader UI polish are already committed

## Files Modified (latest pass)
```
README.md                                        # Added platform-hardening notes (encryption, Decimal, pagination, signatures)
backend/.env.example                             # Added workorder-password key + notification retention env docs
backend/prisma/schema.prisma                     # Money fields migrated from Float to Decimal
backend/prisma/seed.ts                           # Seed data adjusted for encrypted device password handling
backend/src/index.ts                             # Added notification cleanup scheduler
backend/src/lib/config.ts                        # Added encryption/retention config and test-safe fallback parsing
backend/src/lib/prisma.ts                        # Decimal serialization support
backend/src/lib/decimal.ts                       # NEW — Decimal conversion/format helpers
backend/src/lib/decimal.test.ts                  # NEW — Decimal helper tests
backend/src/lib/workorder-password.ts            # NEW — AES-GCM work-order password encryption/decryption
backend/src/lib/workorder-password.test.ts       # NEW — encryption helper tests
backend/src/services/notification.service.ts     # Notification retention cleanup logic
backend/src/services/notification.service.test.ts # Retention cleanup tests
backend/src/services/ticket.service.ts           # Decimal-safe ticket money handling
backend/src/services/ticket.service.test.ts      # Updated for Decimal-safe behavior
backend/src/services/workorder.service.ts        # Device password encryption + Decimal-safe work-order money handling
backend/src/services/workorder.service.test.ts   # NEW/updated work-order service tests
backend/src/services/worksheet.service.ts        # Decimal-safe worksheet totals/rates handling
backend/src/services/scheduling.service.ts       # Appointment list sort/pagination support
backend/src/validations/appointment.ts           # Appointment query validation updates for pagination/sort usage
frontend/src/api/client.ts                       # Paginated appointment/work-order helpers and updated typing
frontend/src/lib/help-content.ts                 # Workflow/status help copy refreshed
frontend/src/pages/portal/Appointments.tsx       # Real pagination UI
frontend/src/pages/portal/WorkOrders.tsx         # Real pagination UI
frontend/src/pages/workorders/WorkOrdersDashboard.tsx # Real pagination UI
frontend/src/pages/admin/TicketDetail.tsx        # Decimal-safe quote display logic
frontend/src/pages/portal/TicketDetail.tsx       # Decimal-safe quote display logic
frontend/src/pages/portal/WorkOrderDetail.tsx    # Decimal-safe cost display logic
frontend/src/pages/workorders/WorkOrderDetail.tsx # Decimal-safe cost display logic
handoff.md                                       # This file
```

## Verification
- Backend: `npm run lint` ✅
- Backend: `npm run test:ci` ✅ (115/115 tests passing)
- Frontend: `npm run lint` ✅
- Frontend: `npm run build` ✅
- Schema sync: `npx prisma db push --accept-data-loss` ✅ (local environment)

## Known Issues Still Open
- Customer worksheet signature capture is intentionally not implemented in the current secure flow; only technician signature is active
- User soft-delete still does not cascade to child records — needs transaction + policy decision
- `AuditLog.userId` has no FK relation — by design (audit survives user deletion)
- Ticket number generation still uses a retry-based strategy instead of a DB sequence/advisory lock
- Notification retention is now bounded, but no admin UI exists yet to inspect/override policy from the app

## Suggested Next Steps
- Build a dedicated customer-portal signature flow with audit trail if customer signature is still a requirement
- Consider adding admin-visible pagination controls and page-size controls on more large list pages for consistency
- Add an admin settings surface for notification-retention policy if operations need runtime control
- Revisit user soft-delete cascading and archival policy

## Running Services
- **Backend**: screen `valitek-backend`, port 3200
- **Frontend**: screen `valitek-frontend`, port 5173
- **Database**: Docker `valitek-db`, port 5433, PostgreSQL 16

## Key Architecture Notes
- Backend: Hono v4, TypeScript, Prisma 6, Zod, jose JWT, pdf-lib, hash-wasm (argon2id), pino
- Frontend: React 18, Vite 5, TanStack Query v5, React Router v6, Zustand, Tailwind + shadcn/ui
- Backend dev: `npx tsx watch --env-file=.env src/index.ts`
- DB schema workflow: `prisma db push` (no migration history)
- Money fields are now stored as Decimal in PostgreSQL and serialized back to JSON numbers by the Prisma layer
