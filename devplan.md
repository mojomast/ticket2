# Dev Plan — i18n Wiring for All Frontend Files

## Tasks
- [✅] Phase 1: Expand fr.ts and en.ts catalogs to 400+ keys covering all strings
- [✅] Phase 2: Wire public pages (Landing, Login, ServiceRequest)
- [✅] Phase 3: Wire layout files (AdminLayout, TechLayout, PortalLayout)
- [✅] Phase 4: Wire shared components (HelpSidebar, StatusBadge, DemoBanner, MessageThread, NotificationBell, AttachmentSection)
- [✅] Phase 5: Wire admin pages (Dashboard, Tickets, KanbanBoard, Settings, Backups, Calendar, Clients, Technicians, ClientDetail, KnowledgeBase, KbArticleDetail, Worksheets, WorksheetDetail)
- [✅] Phase 6: Wire technician pages (Dashboard, Tickets, TicketDetail, Schedule) — Dashboard ✅, Schedule ✅, Tickets ✅, WorksheetDetail ✅, Worksheets ✅, TicketDetail label constants ✅
- [✅] Phase 7: Wire portal pages (Dashboard, Tickets, TicketDetail, Appointments, WorkOrders, WorkOrderDetail) — Dashboard ✅, Appointments ✅, WorkOrders ✅, WorkOrderDetail ✅, Tickets ✅, Worksheets ✅, WorksheetDetail ✅
- [✅] Phase 8: Wire work order pages (WorkOrdersDashboard, WorkOrderIntake, WorkOrderDetail)
- [✅] Phase 9: Wire admin/TicketDetail (1375 lines, t conflict), tech/TicketDetail (1100 lines, t conflict), portal/TicketDetail (672 lines, t conflict)
- [✅] Phase 10: Wire shared Profile page
- [✅] Phase 11: Run tsc --noEmit and fix all type errors
