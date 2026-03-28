# Handoff — Valitek v2

## Completed: Extensive review hardening pass after UX/docs work
## Next Task: Optional pagination/product UX pass and help-content accuracy cleanup
## Context: This pass focused on security, authorization, enum drift, scheduling validation, and test coverage

## What Was Done (This Session — 5 phases)

### Phase 1: Session 9 Features (commit `18098fc`)
1. **Admin Worksheet Config UI** — Settings page card for worksheet defaults (tax rates, thresholds, require-signature, auto-submit); tech WorksheetDetail reads config on creation
2. **Manual Labor Time Entry** — Timer vs manual toggle on tech WorksheetDetail; validates hours/minutes/break
3. **Follow-ups in Technician Schedule** — New `GET /api/worksheets/schedule/followups` endpoint; orange markers in day/week/month calendar views
4. **Admin Worksheet Editing** — Full rewrite of admin WorksheetDetail (645→1691 lines); inline editing of all child records, status transitions, note management
5. **PDF Generation Fix** — sanitizeForPdf strips Unicode chars that crash pdf-lib; fixed `win1252` encoding issues

### Phase 2: Code Review (commit `2de90b6`)
7 subagents audited entire codebase, found 36 issues, fixed 22:
- **7 CRITICAL**: follow-ups schedule envelope, follow-up CRUD auth, internal notes leak to customers, backup/demo-reset missing 9 models, transaction wrapping, API client error handling
- **8 HIGH**: financial rounding, WO transactions, labor time validation, PDF signature overlap, date validation, note status/ownership checks, dashboard loading states
- **7 MEDIUM**: getDashboardStats optimization (9→2 queries), schema indexes, KB slug fix, service request transaction, PDF column widths, notification typing, breakMinutes validation
- **Bonus**: KanbanBoard t() shadowing fix, i18n label map wiring across ~20 pages

### Phase 3: Docs & Help Update (`3fb9a71`)
- **README.md** rewritten (926→1153 lines): updated model/enum counts, added worksheet/KB/customer-notes sections, fixed ports, added missing routes/endpoints
- **backend/.env.example** created with all 16 env vars documented
- **docker-compose.dev.yml** fixed: DB port 5432→5433 mapping
- **Aspirational docs** marked: MODULARITY_SPEC.md ("PLANNED"), GETTING_STARTED.md ("FUTURE PLANS"), newspec.md ("HISTORICAL")
- **devplan.md** all 11 phases marked complete
- **use-page-help.ts**: 9 missing route mappings added (worksheet, KB, client detail pages)
- **help-content.ts**: 9 new HelpArticle entries (admin/tech/customer worksheets + KB + client detail)
- **Profile.tsx**: remaining i18n strings wired with `t()`
- **TicketDetail pages** (admin, tech, portal): HelpTooltip strings converted to `t()` keys

### Phase 4: UI Polish + Empty-State Follow-Ups (`083b247`, `4faf899`, `d4739c1`)
- **Inline form validation** added to high-impact forms: login, public service request, profile, settings, work order intake, admin clients, admin/tech ticket detail dialogs, admin/tech worksheet child-entry forms
- **Responsive table improvements** added for worksheet detail tables and backups list: mobile overflow wrappers, minimum widths, truncation, and hidden low-priority columns on smaller breakpoints
- **Accessibility pass** added `aria-label` coverage for icon-only controls in worksheet editing, KB unlink actions, client note pinning, work order accessory removal, calendar navigation, and related UI affordances
- **Reusable confirmations** added with new shared `frontend/src/components/shared/ConfirmDialog.tsx` and shadcn/Radix `frontend/src/components/ui/alert-dialog.tsx`
- **Destructive actions now gated** for appointment cancel flows (admin, tech, portal), portal proposal cancellation, and demo reset
- **Button consistency** tightened for destructive actions and loading labels (`common.saving`, `common.deleting`) in portal ticket detail, admin client detail, and admin worksheet detail
- **Empty states** added across targeted admin and non-admin pages, including tickets, worksheets, clients, knowledge base, portal worksheet detail, and work-order dashboard views

### Phase 5: Review Hardening Pass (current commit)
- **Ticket attachments/messages secured**: attachment upload/list/download/delete now enforce ticket-level access; ticket message list/create now verify ticket access before returning data or writing rows
- **Appointment access hardened**: day schedule, appointment reads/updates/status changes, and related schedule queries now enforce role/ownership scope consistently
- **Chronology validation added**: appointment/proposal validations now reject invalid `end <= start` payloads
- **Cancellation restricted**: appointment cancellation is limited to cancellable statuses in backend and matching UI buttons are hidden when cancellation is not allowed
- **Technician/customer scope bypass fixed**: ticket and scheduling list filters no longer allow non-admin query params to override role-based scoping
- **Worksheet signature flow tightened**: backend now only accepts technician signatures via current staff flow; technician UI no longer exposes customer signature capture from staff screens
- **Worksheet enum drift fixed**: technician/portal worksheet pages now use backend-aligned worksheet statuses and labor-type constants via shared frontend constants
- **Demo reset UX fixed**: reset now clears the auth cookie and the frontend logs the user out instead of leaving a dead session
- **Service-request customer creation fixed**: generated customer credentials now store a real password hash instead of a raw random string in `passwordHash`
- **Tests added/updated**: backend tests now cover attachment/message access, scheduling auth/validation, demo reset, appointment chronology validation, and stricter ticket route/service behavior

## Known Issues NOT Fixed (documented for future)
- `Float` for currency fields should be `Decimal` — requires schema migration + code changes across entire app
- `WorkOrder.devicePassword` stored in plaintext — needs encryption implementation
- User soft-delete doesn't cascade to child records — needs transaction + policy decision
- `AuditLog.userId` has no FK relation — by design (audit survives user deletion)
- Notification table grows unbounded — needs TTL/purge mechanism
- Ticket number generation race condition — needs DB sequence or advisory lock
- Some list pages still use capped/paginated fetches without full pagination UX; documented, not changed in this pass
- Help content copy may still describe stale workflow wording in places; routing is correct, but copy review remains worthwhile

## Suggested Next Steps
- Add real pagination UX where capped list pages currently fetch only the first page/window
- Review `frontend/src/lib/help-content.ts` against current status enums/workflows and refresh outdated copy
- Consider allowing customer worksheet signature capture through an explicit customer-portal flow with audit trail if that feature is still desired
- Implement encryption for `WorkOrder.devicePassword`

## Files Modified (review hardening pass)
```
README.md                                       # Added note about review hardening pass
backend/src/services/ticket.service.ts          # Shared ticket access helpers, hashed service-request customer passwords, scoped listing hardening
backend/src/services/message.service.ts         # Ticket access enforcement for message list/create
backend/src/services/attachment.service.ts      # Ticket access enforcement for upload/list/download/delete
backend/src/services/scheduling.service.ts      # Appointment auth hardening, scope enforcement, cancellation rules
backend/src/services/worksheet.service.ts       # Technician-only signature enforcement
backend/src/routes/attachment.routes.ts         # Attachment auth wiring updates
backend/src/routes/appointment.routes.ts        # Appointment access/session wiring updates
backend/src/routes/demo.routes.ts               # Reset now clears auth cookie
backend/src/routes/ticket.routes.ts             # Ticket message route uses access-checked service path
backend/src/routes/ticket.routes.test.ts        # Updated route test mocks for stricter create path
backend/src/validations/appointment.ts          # Start/end chronology validation
backend/src/validations/worksheet.ts            # Signature input restricted to tech type
backend/src/services/attachment.service.test.ts # NEW — attachment access tests
backend/src/services/message.service.test.ts    # Message access tests updated
backend/src/services/scheduling.service.test.ts # Scheduling auth/validation coverage
backend/src/services/ticket.service.test.ts     # Scoped listing + hashed customer creation coverage
backend/src/routes/demo.routes.test.ts          # NEW — demo reset auth-cookie behavior test
backend/src/validations/appointment.test.ts     # NEW — chronology validation tests
frontend/src/api/client.ts                      # Worksheet signature API narrowed to tech
frontend/src/components/shared/DemoBanner.tsx   # Demo reset now logs out cleanly after reset
frontend/src/lib/constants.ts                   # Shared worksheet status/labor/note/follow-up constants
frontend/src/lib/i18n/locales/fr.ts             # Signature messaging tweaks
frontend/src/lib/i18n/locales/en.ts             # Signature messaging tweaks
frontend/src/pages/admin/Calendar.tsx           # Cancel button visibility aligned to backend rules
frontend/src/pages/admin/TicketDetail.tsx       # Cancel button visibility aligned to backend rules
frontend/src/pages/portal/TicketDetail.tsx      # Cancel/proposal UI aligned to backend rules
frontend/src/pages/portal/Worksheets.tsx        # Shared worksheet status constants
frontend/src/pages/technician/Schedule.tsx      # Schedule UI aligned to appointment access rules
frontend/src/pages/technician/TicketDetail.tsx  # Cancel button visibility aligned to backend rules
frontend/src/pages/technician/WorksheetDetail.tsx # Customer signature UI removed; labor constants aligned
frontend/src/pages/technician/Worksheets.tsx    # Shared worksheet status constants
handoff.md                                      # This file
```

## Verification
- Backend: `npm run lint` ✅
- Backend: `npm run test:ci` ✅ (101/101 tests passing)
- Frontend: `npm run lint` ✅
- Frontend: `npm run build` ✅

## Running Services
- **Backend**: screen `valitek-backend`, port 3200
- **Frontend**: screen `valitek-frontend`, port 5173
- **Database**: Docker `valitek-db`, port 5433, PostgreSQL 16

## Key Architecture Notes
- Backend: Hono v4, TypeScript, Prisma 6, Zod, jose JWT, pdf-lib, hash-wasm (argon2id), pino
- Frontend: React 18, Vite 5, TanStack Query v5, React Router v6, Zustand, Tailwind + shadcn/ui
- French is primary language; all UI text uses `t('key')` from `useTranslation()` hook
- i18n catalogs: `frontend/src/lib/i18n/locales/fr.ts` and `en.ts` stay in sync
- Backend dev: `npx tsx watch --env-file=.env src/index.ts`
- DB schema: `prisma db push` (no migration history)
