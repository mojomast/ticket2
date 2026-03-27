# Handoff — Valitek v2

## Completed: Docs, help system, and i18n update pass
## Next Task: UI polish (empty states, accessibility, responsive tables, confirmation dialogs)
## Context: All builds pass (tsc + vite). Ready to commit.

## What Was Done (This Session — 3 phases)

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

### Phase 3: Docs & Help Update (this commit)
- **README.md** rewritten (926→1153 lines): updated model/enum counts, added worksheet/KB/customer-notes sections, fixed ports, added missing routes/endpoints
- **backend/.env.example** created with all 16 env vars documented
- **docker-compose.dev.yml** fixed: DB port 5432→5433 mapping
- **Aspirational docs** marked: MODULARITY_SPEC.md ("PLANNED"), GETTING_STARTED.md ("FUTURE PLANS"), newspec.md ("HISTORICAL")
- **devplan.md** all 11 phases marked complete
- **use-page-help.ts**: 9 missing route mappings added (worksheet, KB, client detail pages)
- **help-content.ts**: 9 new HelpArticle entries (admin/tech/customer worksheets + KB + client detail)
- **Profile.tsx**: remaining i18n strings wired with t()
- **TicketDetail pages** (admin, tech, portal): HelpTooltip strings converted to t() keys
- **i18n catalogs** (fr.ts + en.ts): ~40 new keys for Profile + TicketDetail tooltips

## Known Issues NOT Fixed (documented for future)
- `Float` for currency fields should be `Decimal` — requires schema migration + code changes across entire app
- `WorkOrder.devicePassword` stored in plaintext — needs encryption implementation
- User soft-delete doesn't cascade to child records — needs transaction + policy decision
- `AuditLog.userId` has no FK relation — by design (audit survives user deletion)
- Notification table grows unbounded — needs TTL/purge mechanism
- Ticket number generation race condition — needs DB sequence or advisory lock

## Suggested Next Steps (UI Polish from audit)
- Empty states on tables/lists — add "no data" messages
- Some forms missing client-side validation feedback
- Responsive table issues on mobile
- Accessibility gaps (aria-labels on icon-only buttons)
- Missing confirmation dialogs on some destructive actions
- Inconsistent button styles across similar actions
- ~53 hardcoded French HelpTooltip strings remaining in TicketDetail pages (partially addressed)

## Files Modified (this commit — Phase 3)
```
GETTING_STARTED.md                              # Added "FUTURE PLANS" banners
MODULARITY_SPEC.md                              # Added "PLANNED" banner
README.md                                       # Full rewrite (926→1153 lines)
devplan.md                                      # All 11 phases marked complete
docker-compose.dev.yml                          # Fixed DB port mapping 5432→5433
newspec.md                                      # Added "HISTORICAL" banner
backend/.env.example                            # NEW — all 16 env vars documented
frontend/src/hooks/use-page-help.ts             # 9 missing route mappings added
frontend/src/lib/help-content.ts                # 9 new HelpArticle entries
frontend/src/lib/i18n/locales/fr.ts             # ~40 new keys (Profile + TicketDetail tooltips)
frontend/src/lib/i18n/locales/en.ts             # ~40 new keys (in sync with fr.ts)
frontend/src/pages/admin/TicketDetail.tsx        # HelpTooltip i18n wiring
frontend/src/pages/technician/TicketDetail.tsx   # HelpTooltip i18n wiring
frontend/src/pages/portal/TicketDetail.tsx       # HelpTooltip i18n wiring
frontend/src/pages/shared/Profile.tsx            # i18n wiring for remaining strings
handoff.md                                       # This file
```

## Running Services
- **Backend**: screen `valitek-backend`, port 3200
- **Frontend**: screen `valitek-frontend`, port 5173
- **Database**: Docker `valitek-db`, port 5433, PostgreSQL 16

## Key Architecture Notes
- Backend: Hono v4, TypeScript, Prisma 6, Zod, jose JWT, pdf-lib, hash-wasm (argon2id), pino
- Frontend: React 18, Vite 5, TanStack Query v5, React Router v6, Zustand, Tailwind + shadcn/ui
- French is primary language; all UI text uses `t('key')` from `useTranslation()` hook
- i18n catalogs: `frontend/src/lib/i18n/locales/fr.ts` and `en.ts` (~1400+ keys each)
- Help system: `help-content.ts` exports `getHelpContent(pageKey, role)` → 38 HelpArticle entries
- Worksheet system: 6 Prisma models, 22-function service, PDF generator, 24 endpoints
- Backend port 3200, frontend port 5173, accessible via Tailscale at `http://100.72.41.9:5173`
- Backend dev: `npx tsx watch --env-file=.env src/index.ts`
- DB schema: `prisma db push` (no migration history)
- All models: uuid PK, createdAt, updatedAt, soft-delete via deletedAt
