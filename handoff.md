# Handoff — Valitek v2

## Completed: Customer signature, retention-admin UI, and user soft-delete cascade pass
## Next Task: Optional broader lifecycle/admin polish and long-term ticket-number strategy
## Context: This pass completed the next three requested follow-ups after the platform-hardening work

## What Was Done (Latest Pass)

### 1. Customer-portal worksheet signature flow with audit trail
- Added `POST /api/worksheets/:id/customer-signature` for authenticated customers only
- Backend verifies the worksheet belongs to the logged-in customer through its linked work order or ticket
- Customer signing is blocked for `BROUILLON`, `ANNULEE`, and `FACTUREE`
- Staff route `POST /api/worksheets/:id/signature` remains technician-signature-only
- Portal worksheet detail now shows the signature pad only when the worksheet is visible, signable, and not already customer-signed
- Customer signature submissions now create an audit log entry (`CUSTOMER_SIGNATURE_SUBMITTED`) with user/timestamp and request metadata when available

### 2. Admin-visible notification retention controls
- Added retention controls to Admin → Settings for:
  - enable/disable cleanup
  - read notification retention days
  - unread notification retention days
- Reused the existing config/settings flow via `notification_retention_policy`
- Notification cleanup continues to run from the existing scheduler, but now reads the latest saved policy dynamically from config
- No restart is required; changes apply to future cleanup runs automatically

### 3. Transactional user soft-delete cascade policy
- User soft-delete now runs in a transaction in `backend/src/services/user.service.ts`
- On user soft-delete:
  - the user gets `deletedAt` set and `isActive=false`
  - pending appointment proposals authored by that user are cancelled
  - if the user is a technician, they are unassigned from active tickets, work orders, and active appointments
  - draft worksheets owned by that technician are soft-deleted
- Historical data is intentionally preserved:
  - audit logs
  - completed/cancelled appointments
  - non-draft worksheets
  - historical authored records/messages/notes

## Recently Completed Before This Pass
- Work-order device password encryption at rest
- Real pagination UX on capped portal/work-order pages
- Help-content accuracy refresh
- Float → Decimal migration for money fields
- Notification retention cleanup scheduler
- Earlier security review hardening, UI polish, empty-state sweeps, docs/help updates, and worksheet/session feature work remain committed

## Files Modified (latest pass)
```
README.md                                        # Updated for customer signature flow and admin retention controls
backend/src/index.ts                             # Cleanup scheduler now reads dynamic retention policy flow
backend/src/routes/config.routes.ts              # Retention policy config exposure/save support
backend/src/routes/worksheet.routes.ts           # Added customer-signature route
backend/src/services/notification.service.ts     # Runtime retention policy now reads config overrides
backend/src/services/notification.service.test.ts # Retention policy/config tests
backend/src/services/user.service.ts             # Transactional soft-delete cascade policy
backend/src/services/user.service.test.ts        # Soft-delete cascade tests
backend/src/services/worksheet.service.ts        # Customer signature authorization + audit logging
backend/src/services/worksheet.service.test.ts   # NEW — customer signature tests
backend/src/validations/worksheet.ts             # Customer signature payload validation
frontend/src/api/client.ts                       # Added customer-signature API call + retention config helpers
frontend/src/lib/i18n/locales/fr.ts             # Customer signature + retention settings strings
frontend/src/lib/i18n/locales/en.ts             # Matching English strings
frontend/src/pages/admin/Settings.tsx            # Admin retention controls UI
frontend/src/pages/admin/Settings.test.tsx       # NEW — retention settings UI tests
frontend/src/pages/portal/WorksheetDetail.tsx    # Customer signature pad + action flow
handoff.md                                       # This file
```

## Verification
- Backend: `npm run lint` ✅
- Backend: `npm run test:ci` ✅ (121/121 tests passing)
- Frontend: `npm run lint` ✅
- Frontend: `npm run build` ✅

## Known Issues Still Open
- `AuditLog.userId` still intentionally has no FK relation so audit history survives user deletion
- Ticket number generation still uses a retry-based strategy instead of a DB sequence/advisory lock
- Notification retention is now bounded and configurable, but no dedicated reporting/preview UI exists for pending cleanup counts
- Some larger list pages could still benefit from page-size controls for consistency

## Suggested Next Steps
- Replace retry-based ticket numbering with a stronger DB-backed sequencing strategy
- Add admin reporting/preview for notification cleanup counts and next-run impact
- Add broader page-size controls across more large list pages for pagination consistency
- Review whether additional authored records should be anonymized when users are soft-deleted

## Running Services
- **Backend**: screen `valitek-backend`, port 3200
- **Frontend**: screen `valitek-frontend`, port 5173
- **Database**: Docker `valitek-db`, port 5433, PostgreSQL 16

## Key Architecture Notes
- Money fields are stored as Decimal in PostgreSQL and serialized back to JSON numbers by the Prisma layer
- `WorkOrder.devicePassword` is encrypted at rest and transparently decrypted in the service layer
- Notification retention has env defaults plus live admin-config overrides
- Worksheet signatures now have distinct staff and customer flows
