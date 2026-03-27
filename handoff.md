# Handoff — Valitek v2

## Completed: Full code review + 22 fixes (7 critical, 8 high, 7 medium)
## Branch: main

## Code Review Session Changes

### CRITICAL Fixes (7)
1. **Follow-ups schedule endpoint response envelope** — `c.json(followUps)` → `c.json({ data: followUps, error: null })`. Feature was completely broken (frontend got `undefined`).
2. **Follow-up CRUD ownership + status checks** — Added `requireEditableStatus()` + `requireOwnership()` to `createFollowUp`, `updateFollowUp`, `deleteFollowUp`. Previously any tech could modify any worksheet's follow-ups in any status.
3. **Internal notes leaked to customers** — `getWorksheetById` now filters out `INTERNE` notes when `role === 'CUSTOMER'`.
4. **Backup service missing 9 models** — Added Worksheet, LaborEntry, PartUsed, TravelEntry, WorksheetNote, FollowUp, KbArticle, KbArticleLink, CustomerNote to MODELS/DELETE_ORDER/INSERT_ORDER.
5. **Demo reset missing models** — Added same 9 models to the transaction delete chain in proper FK order.
6. **Worksheet mutations not transactional** — All labor/parts/travel create/update/delete now wrapped in `prisma.$transaction()`. `recalculateTotals` accepts optional transaction client.
7. **API client non-JSON crash** — `request()` and `requestPaginated()` now wrap `res.json()` in try-catch. Header merging bug also fixed.

### HIGH Fixes (8)
8. **Financial totals rounding** — `recalculateTotals` rounds all subtotals and grandTotal to 2 decimals via `parseFloat(toFixed(2))`.
9. **WorkOrder status+note transactions** — `changeStatus`, `approveQuote`, `declineQuote` now wrap update+note in `prisma.$transaction()`.
10. **Labor endTime > startTime validation** — Throws `AppError.badRequest` if endTime <= startTime.
11. **PDF signature Y position overlap** — `drawSignature` now decrements `this.y`. Tech/customer signatures render side-by-side without text overlap.
12. **Schedule follow-ups date validation** — `from`/`to` query params validated with `isNaN(getTime())` check.
13. **Note deletion blocked in SOUMISE for techs** — Technicians restricted to BROUILLON/REVISEE. Admins can delete in BROUILLON/SOUMISE/REVISEE.
14. **addNote ownership check** — Now calls `requireOwnership()` consistent with labor/parts/travel.
15. **Frontend loading/error states** — Added to admin, technician, portal Dashboard pages.

### MEDIUM Fixes (7)
16. **getDashboardStats 9→2 queries** — Replaced 8 separate `count()` calls with single `groupBy()`.
17. **Schema indexes** — Added 5 missing indexes (WorkOrder.customerName, estimatedPickupDate; Notification.userId+createdAt; Ticket.priority; Appointment.technicianId+scheduledStart+scheduledEnd). Removed redundant `@@index([orderNumber])`.
18. **KB slug soft-delete fix** — `generateUniqueSlug` no longer filters by `deletedAt`, avoiding P2002 constraint violations.
19. **Service request race condition** — `createServiceRequest` user-find-or-create + ticket-create wrapped in transaction.
20. **PDF table column widths** — Parts (455→495px) and travel (475→495px) tables now fill CONTENT_WIDTH.
21. **Notification service typing** — `query: any` → `query: NotificationQuery` interface.
22. **breakMinutes validation** — Throws error if break minutes exceed total work time.

### Additional Fix
- **KanbanBoard t() shadowing** — `.map((t) =>` renamed to `.map((tk) =>` to prevent shadowing translation function.

## Files Modified

### Backend (10 files)
- `backend/src/services/worksheet.service.ts` — Fixes 2,3,6,8,10,13,14,22
- `backend/src/services/worksheet-pdf.service.ts` — Fixes 11,20
- `backend/src/services/workorder.service.ts` — Fixes 9,16
- `backend/src/services/backup.service.ts` — Fix 4
- `backend/src/services/knowledgebase.service.ts` — Fix 18
- `backend/src/services/ticket.service.ts` — Fix 19
- `backend/src/services/notification.service.ts` — Fix 21
- `backend/src/routes/worksheet.routes.ts` — Fixes 1,2,12
- `backend/src/routes/demo.routes.ts` — Fix 5
- `backend/prisma/schema.prisma` — Fix 17

### Frontend (5 files)
- `frontend/src/api/client.ts` — Fix 7
- `frontend/src/pages/admin/Dashboard.tsx` — Fix 15
- `frontend/src/pages/admin/KanbanBoard.tsx` — t() shadowing fix
- `frontend/src/pages/technician/Dashboard.tsx` — Fix 15
- `frontend/src/pages/portal/Dashboard.tsx` — Fix 15

## Build Status
- Backend tsc: PASS
- Frontend tsc: PASS
- Vite build: PASS
- Prisma db push: PASS (indexes applied)

## Known Issues Not Fixed (documented for future)
- `Float` for currency fields (should be `Decimal`) — requires schema migration + code changes across entire app
- `WorkOrder.devicePassword` stored in plaintext — needs encryption implementation
- User soft-delete doesn't cascade to child records — needs transaction + policy decision
- `AuditLog.userId` has no FK relation — by design (audit survives user deletion)
- Notification table grows unbounded — needs TTL/purge mechanism
- Ticket number generation race condition — needs DB sequence or advisory lock
- README.md significantly stale (missing 8 models, 7 enums, 9 route groups)

## Running Services
- **Backend**: screen `valitek-backend`, port 3200
- **Frontend**: screen `valitek-frontend`, port 5173
- **Database**: Docker `valitek-db`, port 5433, PostgreSQL 16

## Key Architecture Notes
- Backend: Hono v4, TypeScript, Prisma 6, Zod, jose JWT, pdf-lib
- Frontend: React 18, Vite 5, TanStack Query v5, React Router v6, Zustand, Tailwind + shadcn/ui
- French primary language, all UI uses t('key') from useTranslation()
- Services throw AppError, NO Prisma in routes, { data, error: null } response envelope
- TanStack Query v5: no onSuccess in useQuery, use useEffect instead
- DB uses `prisma db push` (no migration history), all models use uuid IDs
