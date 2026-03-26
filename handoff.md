# Handoff

## Completed: Comprehensive Help System (Help Sidebar + Tooltips)

### Summary

Built a complete contextual help system for the Valitek v2 IT ticket management application. The system includes a slide-out help sidebar accessible from every authenticated page, plus 170+ tooltips on key interactive elements across all pages. All content is in French.

---

### What was built

#### 1. Core Help Infrastructure

| File | Purpose |
|------|---------|
| `frontend/src/stores/help-store.ts` | Zustand store — `isOpen`, `currentPageKey`, `toggle()`, `open()`, `close()`, `setPageKey()` |
| `frontend/src/hooks/use-page-help.ts` | Route-to-pageKey mapping via regex (29 routes), keyboard shortcuts (`?` and `F1`), auto-syncs page key to store |
| `frontend/src/components/shared/HelpSidebar.tsx` | Slide-out panel (right side, 384px, z-50) with collapsible accordion sections, tips, backdrop overlay |
| `frontend/src/components/shared/HelpTooltip.tsx` | Convenience wrapper around shadcn Tooltip (props: `content`, `side`, `align`, `className`) |
| `frontend/src/lib/help-content.ts` | 1,131 lines of French help articles — 29 page keys across all roles |

#### 2. Layout Modifications

All three layouts modified to include:
- `usePageHelp()` hook call (sets up keyboard listeners + page key sync)
- Help button (`HelpCircle` icon from lucide-react) in the header bar, before `NotificationBell`
- `<HelpSidebar />` component rendered in the layout

Files:
- `frontend/src/pages/admin/AdminLayout.tsx`
- `frontend/src/pages/technician/TechLayout.tsx`
- `frontend/src/pages/portal/PortalLayout.tsx`

#### 3. TooltipProvider

`frontend/src/main.tsx` updated to wrap app in `<TooltipProvider delayDuration={300}>` from `@radix-ui/react-tooltip` (via shadcn).

#### 4. Help Content Coverage (29 page keys)

| Role | Page Keys | Count |
|------|-----------|-------|
| **ADMIN** | admin-dashboard, admin-tickets, admin-ticket-detail, admin-kanban, admin-calendar, admin-clients, admin-technicians, admin-settings, admin-backups, admin-workorders, admin-workorder-intake, admin-workorder-detail | 12 |
| **TECHNICIAN** | tech-dashboard, tech-tickets, tech-ticket-detail, tech-schedule, tech-workorders, tech-workorder-intake, tech-workorder-detail | 7 |
| **CUSTOMER** | customer-dashboard, customer-tickets, customer-ticket-detail, customer-appointments, customer-workorders, customer-workorder-detail | 6 |
| **GENERAL** | profile, landing, login, service-request | 4 |

Each article contains: title, description, 3-8 collapsible sections, 2-4 tips.

#### 5. Tooltips Added (~170+ total)

| Area | Files | Tooltip Count |
|------|-------|:---:|
| Admin Dashboard, Tickets, TicketDetail, KanbanBoard, Calendar | 5 | ~47 |
| Admin Clients, Technicians, Settings, Backups | 4 | ~24 |
| Shared components (NotificationBell, StatusBadge, DemoBanner) | 3 | ~7 |
| Technician Dashboard, Tickets, TicketDetail, Schedule | 4 | ~31 |
| Customer Dashboard, Tickets, TicketDetail, Appointments, WorkOrders, WorkOrderDetail | 6 | ~29 |
| WorkOrdersDashboard, WorkOrderIntake, WorkOrderDetail, Profile | 4 | ~35 |

---

### How it works

1. User navigates to any page — `usePageHelp()` hook derives the page key from the URL
2. User presses `?`, `F1`, or clicks the `?` button in the header
3. `HelpSidebar` slides in from the right, showing role-aware + page-aware content
4. Content comes from `help-content.ts` via `getHelpContent(pageKey, role)` which tries `ROLE:pageKey` → `GENERAL:pageKey` → profile fallback → null
5. Tooltips on interactive elements provide inline contextual hints on hover

### Build status

- TypeScript: clean (`tsc --noEmit` — zero errors)
- Vite build: succeeds (`npx vite build` — 4.1s)
- No new dependencies added — everything uses existing packages (zustand, lucide-react, @radix-ui/react-tooltip, react-router-dom)

### Services

- **Backend**: screen session `valitek-backend`, port 3200
- **Frontend**: screen session `valitek-frontend`, port 5173
- **Database**: Docker container `valitek-db`, port 5433, PostgreSQL 16
- **Access**: `http://100.72.41.9:5173` via Tailscale
