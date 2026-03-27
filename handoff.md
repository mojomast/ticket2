# Handoff — Session Summary

## What Was Completed

### Session 1 — 5 Audit Gaps

All 5 audit gaps from the comprehensive code review have been fully implemented and verified:

### 1. Email/SMS Notifications
- **4 backend services modified**: ticket, workorder, message, scheduling
- **Email notifications** for: ticket created, status changed, quote sent, tech assigned, new message, WO status changed, WO quote sent, service request received
- **SMS notifications** for: quote sent, WO ready for pickup, appointment confirmed
- Both services have graceful guards for missing env vars (log warning + return false)
- All calls use fire-and-forget pattern: `.catch(err => logger.error(...))`

### 2. Pagination
- **5 frontend files modified**: portal/Tickets, tech/Tickets, admin/Clients, admin/Tickets (improved), api/client.ts
- Added `requestPaginated<T>()` helper to api client that returns full `{ data, pagination }` envelope
- All paginated pages use 25 items per page, reset page to 1 on filter/search changes
- Existing `list()` methods preserved for backward compatibility

### 3. Password Change
- **5 files modified**: user validations (Zod schema), user service, profile routes, api client, Profile.tsx
- `POST /api/users/profile/password` endpoint with current password verification
- Password change card in Profile page with validation (min 8 chars, confirm match)

### 4. Attachment Upload
- **4 new files created**: attachment.service.ts, attachment.routes.ts, uploads/.gitkeep, AttachmentSection.tsx
- **5 files modified**: backend index.ts, api client, 3 ticket detail pages
- Endpoints: POST/GET `/api/tickets/:ticketId/attachments`, GET `/api/attachments/:id/download`, DELETE `/api/attachments/:id`
- Files stored in `backend/uploads/` with UUID filenames, 10MB max, validated MIME types
- Frontend uses drag-and-drop upload with raw `fetch`/`FormData`

### 5. i18n (Internationalization)
- **Translation catalogs**: 1014 keys in both fr.ts (French) and en.ts (English), fully in sync
- **All 31 pages wired** with `useTranslation()` hook — zero hardcoded user-facing strings remain
- Deleted dead `I18nProvider` (provider.tsx) — hook reads directly from zustand store
- Key naming convention: `common.*`, `nav.*`, `auth.*`, `admin.*`, `tech.*`, `portal.*`, `wo.*`, `profile.*`, etc.

## Build Verification
- `tsc --noEmit` passes on both backend and frontend (zero errors)
- `vite build` succeeds (2542 modules)

## Key Technical Notes

### Variable Shadowing
When wiring `t()` into components that use `.map((t) =>` or `.filter((t) =>`, the iterator variable was renamed to `(tk)` or `(tr)` to avoid shadowing the `t` translation function.

### Hardcoded Date Locale
Several files use `toLocaleDateString('fr-CA')` — the locale is hardcoded rather than driven by i18n. This is a minor enhancement for a future session if multi-language date formatting is needed.

### Email/SMS Configuration
Email requires Microsoft 365 Graph API credentials (`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_SENDER_EMAIL`).
SMS requires VoIP.ms credentials (`VOIPMS_USERNAME`, `VOIPMS_PASSWORD`, `VOIPMS_DID`).
Both gracefully degrade when env vars are missing.

## Files Modified/Created This Session

### Backend
- `src/index.ts` — mounted attachment routes + service-request routes
- `src/routes/attachment.routes.ts` — NEW: file upload/download/delete endpoints
- `src/routes/profile.routes.ts` — added POST /profile/password
- `src/services/attachment.service.ts` — NEW: upload, get, list, delete
- `src/services/message.service.ts` — email notification on new message
- `src/services/scheduling.service.ts` — email+SMS on appointment events
- `src/services/ticket.service.ts` — email notifications on ticket events
- `src/services/user.service.ts` — added changePassword()
- `src/services/workorder.service.ts` — email+SMS on WO events
- `src/validations/user.ts` — added changePasswordSchema
- `uploads/.gitkeep` — NEW: file storage directory

### Frontend
- `src/api/client.ts` — added requestPaginated, listPaginated, attachments, users.changePassword
- `src/components/shared/AttachmentSection.tsx` — NEW: drag-drop upload component
- `src/components/shared/DemoBanner.tsx` — i18n wired
- `src/components/shared/HelpSidebar.tsx` — i18n wired
- `src/components/shared/MessageThread.tsx` — i18n wired
- `src/components/shared/NotificationBell.tsx` — i18n wired
- `src/components/shared/StatusBadge.tsx` — i18n wired
- `src/lib/i18n/locales/fr.ts` — expanded to 1014 keys
- `src/lib/i18n/locales/en.ts` — expanded to 1014 keys
- `src/lib/i18n/provider.tsx` — DELETED (dead code)
- All 31 page files in pages/ — i18n wired with useTranslation()
- `src/pages/shared/Profile.tsx` — password change card added

### Session 2 — Calendar Schedule Rebuild

Rebuilt the technician Schedule page (`frontend/src/pages/technician/Schedule.tsx`) from a simple day-only appointment list into a full calendar with three view modes:

#### Month View
- 6-row grid calendar (Mon-Sun columns) showing the full month
- Days outside the current month are dimmed
- Each day cell shows appointment dots with status colors and start times
- Shows up to 3 appointments per cell with "+N" overflow indicator
- Today is highlighted with a primary-color circle
- Clicking any day drills into Day view

#### Week View
- 7-column layout (Mon-Sun) with hourly rows (8:00-18:00)
- Appointment blocks are color-coded by status (from APPOINTMENT_STATUS_COLORS)
- Blocks show start time and ticket title, link to ticket detail
- Today's column is highlighted
- Scrollable timeline (max 600px height)
- Clicking a day header drills into Day view

#### Day View
- Hourly timeline (8:00-18:00) with full appointment cards
- Each card shows: ticket title (linked), time range with duration in minutes, notes, status badge
- Preserves all action buttons: Start, Complete, Cancel (permission-gated)
- Hours without appointments are dimmed for visual clarity
- Empty state shows centered calendar icon with "no appointments" message
- Summary bar shows total appointment count

#### View Switcher and Navigation
- Tab-style view switcher with icons (LayoutGrid, CalendarDays, Clock from lucide-react)
- Navigation adapts to current view: prev/next month, week, or day
- Today button, date picker
- Period label shows current month/week range/day in French via date-fns locale

#### Technical Details
- Uses date-fns 4.x for all date manipulation (startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, etc.)
- Uses date-fns/locale/fr for French day/month names in navigation labels
- API query range adjusts per view mode (full month grid, Mon-Sun week, single day)
- Single useQuery call with from/to params, limit: 100
- All strings use t() from useTranslation() hook
- 15 new i18n keys added to both fr.ts and en.ts (now 1029 keys each)

#### Files Modified (Session 2)
- `frontend/src/pages/technician/Schedule.tsx` — complete rewrite (263 to ~490 lines)
- `frontend/src/lib/i18n/locales/fr.ts` — 15 new keys (tech.schedule.viewMonth/Week/Day, prevMonth/nextMonth, prevWeek/nextWeek, mon-sun, appointmentsCount)
- `frontend/src/lib/i18n/locales/en.ts` — matching 15 new English keys

### Session 2 (continued) — Bug Fixes + Email/SMS Settings

#### Fix: Admin Dashboard 400 Bad Request
- `frontend/src/pages/admin/Dashboard.tsx` — changed `limit: 200` to `limit: 100` (backend Zod max is 100)
- `frontend/src/pages/admin/Calendar.tsx` — same fix

#### Fix: Attachment Upload 404 Not Found
- Root cause: Hono route shadowing — `app.route('/api/tickets', ticketRoutes)` captured all `/api/tickets/*` requests, preventing `app.route('/api', attachmentRoutes)` from handling `/api/tickets/:id/attachments`
- Fix: Moved ticket-scoped attachment routes (POST/GET `/:id/attachments`) into `ticket.routes.ts`
- `attachment.routes.ts` now only contains standalone routes (`/attachments/:id/download`, `/attachments/:id`)
- Files modified: `backend/src/routes/ticket.routes.ts`, `backend/src/routes/attachment.routes.ts`

#### Feature: Email/SMS Configuration in Admin Settings
- **Backend**: `email.service.ts` and `sms.service.ts` now read config from `SystemConfig` DB table first (keys: `email_config`, `sms_config`), falling back to process.env
- **Backend**: `config.routes.ts` now masks sensitive fields (clientSecret, password) in GET responses — shows last 4 chars with bullet mask
- **Backend**: PUT `/:key` for sensitive configs merges masked fields with existing DB values, so saving masked secrets doesn't overwrite them
- **Frontend**: `Settings.tsx` expanded with two new config cards:
  - **Email (Microsoft 365)**: Tenant ID, Client ID, Client Secret (password input), Sender Email
  - **SMS (VoIP.ms)**: API Username, API Password (password input), DID Number
- Both cards show configured/not-configured status badge
- 24 new i18n keys added to both fr.ts and en.ts (now 1053 keys each)

#### Files Modified
- `frontend/src/pages/admin/Dashboard.tsx` — limit fix
- `frontend/src/pages/admin/Calendar.tsx` — limit fix
- `frontend/src/pages/admin/Settings.tsx` — email/SMS config forms added
- `frontend/src/lib/i18n/locales/fr.ts` — 24 new settings.* keys
- `frontend/src/lib/i18n/locales/en.ts` — matching 24 English keys
- `backend/src/routes/ticket.routes.ts` — added attachment POST/GET routes
- `backend/src/routes/attachment.routes.ts` — removed ticket-scoped routes (standalone only)
- `backend/src/routes/config.routes.ts` — secret masking + merge logic
- `backend/src/services/email.service.ts` — DB config lookup with env fallback
- `backend/src/services/sms.service.ts` — DB config lookup with env fallback

### Session 3 — Admin Calendar Rebuild (Month/Week/Day Views)

Rebuilt the admin Calendar page (`frontend/src/pages/admin/Calendar.tsx`) from a day-only appointment list into a full calendar with three view modes, matching the technician Schedule pattern:

#### Month View
- 7-column grid (Mon–Sun) showing the full month with overflow weeks
- Days outside the current month are dimmed
- Each day cell shows appointment dots with status colors, start times, and technician initials
- Shows up to 3 appointments per cell with "+N" overflow indicator
- Today is highlighted with a primary-color circle
- Clicking any day drills into Day view

#### Week View
- 7-column layout (Mon–Sun) with hourly rows (8:00–18:00)
- Appointment blocks are color-coded by status (from APPOINTMENT_STATUS_COLORS constant)
- Blocks show start time, ticket title, and technician name (admin sees all techs)
- Today's column is highlighted
- Scrollable timeline (max 600px height)
- Clicking a day header or appointment block drills into Day view

#### Day View
- Hourly timeline (8:00–18:00) with full appointment cards
- Each card shows: ticket title + number, time range with duration, travel buffer, technician name, notes, status badge
- Admin-specific controls: status change dropdown (all statuses) + cancel button
- Hours without appointments are dimmed for visual clarity
- Empty state shows centered calendar icon with "no appointments" message
- Summary bar shows total appointment count

#### Appointment Creation Form (Preserved)
- "+ Nouveau rendez-vous" button toggles the creation form
- Form includes: ticket select (filtered to open tickets), technician select, availability slots, datetime inputs, travel buffer, notes
- Availability slots fetched from API when technician is selected
- Click a slot to auto-fill start/end times
- Form extracted into a separate `CreationForm` component for clarity

#### Key Improvements Over Previous Version
- Replaced hardcoded `APPOINTMENT_STATUS_LABELS` with import from `lib/constants.ts` (single source of truth)
- Fixed variable shadowing bug: `openTickets.map((t) =>` renamed to `openTickets.map((tk) =>` to avoid shadowing the `t` translation function
- API query range now adapts per view mode (full month grid, Mon–Sun week, single day) — previously only queried single day
- Uses date-fns for all date manipulation instead of manual Date arithmetic
- View mode defaults to `week` (was day-only before)

#### Technical Details
- Uses date-fns 4.x with fr locale for French day/month names
- date-fns functions: startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, addDays, format, isSameDay, isSameMonth, isToday, eachDayOfInterval, getHours, getMinutes, parseISO
- lucide-react icons: ChevronLeft, ChevronRight, Calendar, CalendarDays, Clock, LayoutGrid
- Single useQuery call with from/to params, limit: 100
- 17 new i18n keys added to both fr.ts and en.ts under `admin.calendar.*` prefix

#### Files Modified (Session 3)
- `frontend/src/pages/admin/Calendar.tsx` — complete rewrite (~700 lines, was 609)
- `frontend/src/lib/i18n/locales/fr.ts` — 17 new admin.calendar keys (viewMonth/Week/Day, prevMonth/nextMonth, prevWeek/nextWeek, mon-sun, appointmentsCount, loadError)
- `frontend/src/lib/i18n/locales/en.ts` — matching 17 English keys

### Session 3 (continued) — Uploaded File Viewer

Added an inline file viewer/previewer to the attachment system. Previously, the only action for uploaded files was to download them — now users can view images, PDFs, and text files directly in the browser without leaving the page.

#### Backend Changes
- **New endpoint**: `GET /api/attachments/:id/view` in `attachment.routes.ts`
  - Streams file with `Content-Disposition: inline` (browser displays instead of downloading)
  - Sets `X-Frame-Options: SAMEORIGIN` to allow embedding in iframes
  - Same authentication requirement as the download endpoint
  - Complements the existing `GET /api/attachments/:id/download` endpoint

#### Frontend — FileViewer Modal Component (NEW)
- `frontend/src/components/shared/FileViewer.tsx` — new Radix Dialog-based modal
- **Image preview**: Full-size image with zoom (25%–500%) and rotation controls
- **PDF preview**: Embedded iframe using the inline view endpoint
- **Text/CSV/JSON preview**: Fetches content and renders in a `<pre>` block with monospace font
- **Non-previewable files**: Shows file icon + "download to open" message with download button
- **Navigation**: Prev/Next arrows to cycle through attachments in the same ticket
- **Keyboard shortcuts**: Arrow keys (prev/next), +/- (zoom), 0 (reset zoom/rotation), Escape (close)
- Uses Radix Dialog primitives from `components/ui/dialog.tsx`

#### Frontend — AttachmentSection Rewrite
- **Image thumbnail grid**: Images are displayed in a responsive grid (2/3/4 columns) with aspect-square thumbnails
- **Hover overlay**: Shows View, Download, and Delete (if permitted) action buttons on hover
- **Filename overlay**: Semi-transparent gradient at bottom of each thumbnail showing filename
- **Click to view**: Clicking a thumbnail opens the FileViewer modal
- **Non-image files**: Displayed in the existing list format but now with a "View" button for previewable types (PDFs, text)
- **"Click to view" hint**: Non-image previewable files show a small blue hint text next to the filename
- All existing functionality preserved: drag-and-drop upload, download, delete with confirm dialog

#### API Client
- Added `api.attachments.viewUrl(id)` → returns `{BASE_URL}/api/attachments/{id}/view`

#### i18n
- 10 new keys added to both `fr.ts` and `en.ts` under the `fileViewer.*` prefix
- Keys: view, viewTooltip, clickToView, zoomIn, zoomOut, rotate, previous, next, noPreview, loadError

#### Files Modified
- `backend/src/routes/attachment.routes.ts` — added `/attachments/:id/view` endpoint
- `frontend/src/api/client.ts` — added `viewUrl()` method
- `frontend/src/components/shared/FileViewer.tsx` — NEW: modal file viewer component
- `frontend/src/components/shared/AttachmentSection.tsx` — rewritten with thumbnails + FileViewer integration
- `frontend/src/lib/i18n/locales/fr.ts` — 10 new fileViewer.* keys
- `frontend/src/lib/i18n/locales/en.ts` — matching 10 English keys

### Session 4 — Knowledge Base + Customer Notes + Client Detail

Implemented the complete Knowledge Base (Base de connaissances) system, Customer Notes, and Client Detail page. This adds three major capabilities: a searchable article wiki for internal documentation, per-customer notes for staff, and a comprehensive customer history page.

#### Backend — Prisma Schema (3 new models, 3 new enums)
- **KbArticle**: id, title, slug (unique), content (Markdown), category (KbCategory enum), tags (Json), visibility (KbVisibility enum), authorId FK, soft delete
- **KbArticleLink**: polymorphic join table — links articles to any entity (TICKET, WORKORDER, CUSTOMER) via entityType + entityId. Unique constraint on [articleId, entityType, entityId]
- **CustomerNote**: id, customerId FK, authorId FK, content, isPinned, soft delete
- **New enums**: KbCategory (MATERIEL, LOGICIEL, RESEAU, PROCEDURE, FAQ, AUTRE), KbVisibility (INTERNAL, PUBLIC), KbLinkEntityType (TICKET, WORKORDER, CUSTOMER)

#### Backend — Services
- **knowledgebase.service.ts** (287 lines): Article CRUD with auto-generated unique slugs (accent-safe), full-text search (title + content, case-insensitive), article linking/unlinking to any entity, paginated lists with category/visibility/search filters
- **customer-note.service.ts** (156 lines): Note CRUD with customer role validation, pin/unpin toggle, paginated lists ordered by isPinned DESC + createdAt DESC
- Both services use fire-and-forget audit logging, AppError throws, getPagination/buildPaginatedResponse helpers

#### Backend — Routes
- **knowledgebase.routes.ts**: GET/POST /api/kb/articles, GET/PATCH/DELETE /api/kb/articles/:id, GET /api/kb/articles/by-slug/:slug, GET /api/kb/articles/:id/links, GET/POST/DELETE /api/kb/links
- **customer-note.routes.ts**: GET/POST /api/customer-notes, PATCH/DELETE /api/customer-notes/:id, PATCH /api/customer-notes/:id/toggle-pin
- Both route sets require authentication; mounted in index.ts

#### Backend — Validations
- **knowledgebase.ts**: Zod schemas for create/update article, article list query, create link, link list query, create/update customer note, customer note list query. French error messages. 8 exported type inferences.

#### Frontend — API Client
- Added 6 interfaces: KbArticleAuthor, KbArticle, KbArticleLink, CustomerNote
- Added api.kb.articles.* (list, get, getBySlug, create, update, delete, links)
- Added api.kb.links.* (forEntity, create, delete)
- Added api.customerNotes.* (list, create, update, togglePin, delete)

#### Frontend — KnowledgeBase.tsx (Article List Page)
- Debounced search (300ms), category filter dropdown, visibility filter dropdown
- Article table: title (clickable → detail), category badge, visibility badge, author, updated date, delete action
- Create dialog with title, content textarea, category select, visibility select, comma-separated tags input
- Paginated (20 per page)

#### Frontend — KbArticleDetail.tsx (Article Detail/Edit Page)
- 3-column grid layout: main content (2 cols) + sidebar (1 col)
- View mode: title, content (whitespace-pre-wrap), category/visibility/tag badges, author, dates
- Edit mode: inline form with all fields editable
- Sidebar: article info card + linked entities card (grouped by entity type) with link/unlink actions
- Delete with confirmation

#### Frontend — ClientDetail.tsx (Customer History Page)
- Customer info card (email, phone, type, company, address, member since, active/inactive badge)
- Customer notes section with create form (textarea + pin checkbox), pinned-first list, pin toggle, delete
- Ticket history table (ticket#, title, status/priority badges, created date) with pagination, rows link to ticket detail
- Work order history table (order#, device, status/priority, intake date), rows link to WO detail
- Linked KB articles section with link/unlink functionality

#### Frontend — Navigation
- Added "Base de connaissances" link with BookOpen icon to admin sidebar (AppSidebar.tsx)
- Added "View" button to Clients table rows → navigates to /admin/clients/:id
- Routes wired in App.tsx: /admin/base-connaissances, /admin/base-connaissances/:id, /admin/clients/:id

#### i18n
- 83 new keys added to both fr.ts and en.ts:
  - 20 kb.* keys (article list page)
  - 23 kb.detail.* keys (article detail page)
  - 38 clientDetail.* keys (client detail page)
  - 1 nav.knowledgeBase key
  - 2 admin.clients.viewDetail/viewDetailTooltip keys

#### Files Created
- `backend/src/validations/knowledgebase.ts`
- `backend/src/services/knowledgebase.service.ts`
- `backend/src/services/customer-note.service.ts`
- `backend/src/routes/knowledgebase.routes.ts`
- `backend/src/routes/customer-note.routes.ts`
- `frontend/src/pages/admin/KnowledgeBase.tsx`
- `frontend/src/pages/admin/KbArticleDetail.tsx`
- `frontend/src/pages/admin/ClientDetail.tsx`

#### Files Modified
- `backend/prisma/schema.prisma` — 3 new models + 3 new enums + User relation back-references
- `backend/src/index.ts` — mounted KB and customer-note routes with requireAuth
- `frontend/src/api/client.ts` — types + api methods for KB and customer notes
- `frontend/src/App.tsx` — lazy imports + 3 new admin routes
- `frontend/src/components/shared/AppSidebar.tsx` — KB nav link with BookOpen icon
- `frontend/src/pages/admin/Clients.tsx` — added navigate import + "View" detail button
- `frontend/src/lib/i18n/locales/fr.ts` — 83 new keys
- `frontend/src/lib/i18n/locales/en.ts` — 83 new English keys

#### Build Verification
- `tsc --noEmit` passes on both backend and frontend (zero errors)
- `vite build` succeeds (2592 modules)
