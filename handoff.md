# Handoff — Valitek v2

## Completed: Session 9 — 5 worksheet features/fixes
## Branch: main

## Session 9 Changes

### Feature 1: Admin Worksheet Config UI
- Added authenticated non-admin `GET /api/config/:key` endpoint with whitelist (`backend/src/index.ts`)
- Added `api.config.get(key)` method to API client (`frontend/src/api/client.ts`)
- Added complete worksheet config card to admin Settings page (`frontend/src/pages/admin/Settings.tsx`, 540→721 lines):
  - Default hourly rate
  - Travel charge mode dropdown (per_km, flat, time_based)
  - Enable/disable toggles for labor, parts, travel, notes, follow-ups sections
- Technician WorksheetDetail fetches config defaults, pre-fills rates, adapts travel form by charge mode, hides disabled tabs

### Feature 2: Manual Labor Time Entry
- Added timer/manual mode toggle to labor entry form in technician WorksheetDetail
- Manual mode shows end time + break minutes fields instead of timer controls
- Auto-calculates billable hours from start/end/breaks

### Feature 3: Follow-ups in Technician Schedule
- Added `getFollowUpsForSchedule()` to worksheet service (`backend/src/services/worksheet.service.ts`)
- Added `GET /follow-ups/schedule` endpoint BEFORE `/:id` route (`backend/src/routes/worksheet.routes.ts`)
- Added `ScheduleFollowUp` type + `api.worksheets.followUps.schedule()` to API client
- Integrated into Schedule page — orange dots/blocks/cards in month/week/day views, follow-up count in day summary

### Feature 4: Admin Worksheet Editing
- Rewrote admin WorksheetDetail (`frontend/src/pages/admin/WorksheetDetail.tsx`, 645→1691 lines) with full editing:
  - Summary editing (inline textarea)
  - Labor entries: add/edit/delete with inline row editing
  - Parts: add/edit/delete with inline row editing
  - Travel entries: add/edit/delete with inline row editing
  - Notes: add/delete
  - Follow-ups: add/edit/delete/toggle complete
- Status-gated: all edit controls only visible for BROUILLON or REVISEE status
- Fetches worksheet config for default hourly rate and rate per km

### Feature 5: Fix PDF Generation Error
- **Root cause**: Unicode characters `✓` (U+2713) and `○` (U+25CB) in follow-up status display. pdf-lib's StandardFonts.Helvetica only supports WinAnsi encoding — these chars caused `StandardFontEmbedder.encodeText` to throw.
- **Fix**: Replaced with ASCII-safe `[X] Complété` / `[ ] En attente`
- **Defense-in-depth**: Added `sanitizeForPdf()` helper that validates all text against WinAnsi before passing to pdf-lib, applied to all PdfDrawer methods
- Any worksheet with follow-ups previously returned HTTP 500; now returns valid PDF

## Files Modified (Session 9)

### Backend
- `backend/src/index.ts` — Added GET /api/config/:key non-admin endpoint
- `backend/src/routes/worksheet.routes.ts` — Added GET /follow-ups/schedule route
- `backend/src/services/worksheet.service.ts` — Added getFollowUpsForSchedule()
- `backend/src/services/worksheet-pdf.service.ts` — Fixed non-WinAnsi chars, added sanitizeForPdf()

### Frontend
- `frontend/src/api/client.ts` — Added config.get(), ScheduleFollowUp type, followUps.schedule()
- `frontend/src/pages/admin/Settings.tsx` — Added worksheet config card (540→721 lines)
- `frontend/src/pages/admin/WorksheetDetail.tsx` — Full editing rewrite (645→1691 lines)
- `frontend/src/pages/technician/WorksheetDetail.tsx` — Config defaults, tab hiding, manual labor mode (1361→1531 lines)
- `frontend/src/pages/technician/Schedule.tsx` — Follow-ups integration with orange markers
- `frontend/src/lib/i18n/locales/fr.ts` — ~33 new keys
- `frontend/src/lib/i18n/locales/en.ts` — ~33 new keys (in sync with fr.ts)

## Build Status
- Backend tsc: PASS
- Frontend tsc: PASS
- Vite build: PASS

## Running Services
- **Backend**: screen `valitek-backend`, port 3200
- **Frontend**: screen `valitek-frontend`, port 5173
- **Database**: Docker `valitek-db`, port 5433, PostgreSQL 16

## Completed Sessions

1. **Sessions 1-4**: Email/SMS, pagination, password change, attachments, i18n (1014 keys), technician calendar, dashboard fix, attachment fix, email/SMS settings, admin calendar, file viewer, knowledge base, customer notes, client detail
2. **Session 5** (`7f34599`): Code review pass — 11 bug fixes
3. **Session 6** (`cfbf1a1`): Full worksheet system — 6 Prisma models, 22-function service, PDF generator, 24 endpoints, 4 frontend pages, ~95 i18n keys
4. **Session 7a** (`ff3723b`): First worksheet code review — 9 fixes
5. **Session 7b** (`c81649f`): Flexible worksheet creation — optional workOrderId, ticketId support
6. **Session 7c** (`1db0677`): Second code review — 13 fixes (security, status logic, validation, UX)
7. **Session 8** (`723c512`): 4 features — signature canvas, portal worksheets, admin threshold, follow-up reminders
8. **Session 9** (this): 5 features — admin worksheet config, manual labor entry, schedule follow-ups, admin worksheet editing, PDF fix

## Key Architecture Notes
- Backend: Hono v4, TypeScript, Prisma 6, Zod, jose JWT, pdf-lib
- Frontend: React 18, Vite 5, TanStack Query v5, React Router v6, Zustand, Tailwind + shadcn/ui
- French primary language, all UI uses t('key') from useTranslation()
- Services throw AppError, NO Prisma in routes, { data, error: null } response envelope
- TanStack Query v5: no onSuccess in useQuery, use useEffect instead
- DB uses `prisma db push` (no migration history), all models use uuid IDs
- i18n catalogs: 1,325 keys each in fr.ts and en.ts (in sync)
