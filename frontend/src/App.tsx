import { createBrowserRouter, redirect, Outlet, Link } from 'react-router-dom';
import { api } from './api/client';

// Lazy-loaded pages
import { lazy, Suspense } from 'react';

// Public pages
const Landing = lazy(() => import('./pages/public/Landing'));
const Login = lazy(() => import('./pages/public/Login'));
const ServiceRequest = lazy(() => import('./pages/public/ServiceRequest'));

// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminTickets = lazy(() => import('./pages/admin/Tickets'));
const AdminTicketDetail = lazy(() => import('./pages/admin/TicketDetail'));
const KanbanBoard = lazy(() => import('./pages/admin/KanbanBoard'));
const AdminCalendar = lazy(() => import('./pages/admin/Calendar'));
const AdminClients = lazy(() => import('./pages/admin/Clients'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminBackups = lazy(() => import('./pages/admin/Backups'));
const AdminTechnicians = lazy(() => import('./pages/admin/Technicians'));
const AdminKnowledgeBase = lazy(() => import('./pages/admin/KnowledgeBase'));
const AdminKbArticleDetail = lazy(() => import('./pages/admin/KbArticleDetail'));
const AdminClientDetail = lazy(() => import('./pages/admin/ClientDetail'));
const AdminWorksheets = lazy(() => import('./pages/admin/Worksheets'));
const AdminWorksheetDetail = lazy(() => import('./pages/admin/WorksheetDetail'));

// Work Order pages (shared between admin + tech)
const WorkOrdersDashboard = lazy(() => import('./pages/workorders/WorkOrdersDashboard'));
const WorkOrderDetail = lazy(() => import('./pages/workorders/WorkOrderDetail'));
const WorkOrderIntake = lazy(() => import('./pages/workorders/WorkOrderIntake'));

// Customer Portal pages
const PortalLayout = lazy(() => import('./pages/portal/PortalLayout'));
const PortalDashboard = lazy(() => import('./pages/portal/Dashboard'));
const PortalTickets = lazy(() => import('./pages/portal/Tickets'));
const PortalTicketDetail = lazy(() => import('./pages/portal/TicketDetail'));
const PortalAppointments = lazy(() => import('./pages/portal/Appointments'));
const PortalWorkOrders = lazy(() => import('./pages/portal/WorkOrders'));
const PortalWorkOrderDetail = lazy(() => import('./pages/portal/WorkOrderDetail'));

// Technician pages
const TechLayout = lazy(() => import('./pages/technician/TechLayout'));
const TechDashboard = lazy(() => import('./pages/technician/Dashboard'));
const TechTickets = lazy(() => import('./pages/technician/Tickets'));
const TechTicketDetail = lazy(() => import('./pages/technician/TicketDetail'));
const TechSchedule = lazy(() => import('./pages/technician/Schedule'));
const TechWorksheets = lazy(() => import('./pages/technician/Worksheets'));
const TechWorksheetDetail = lazy(() => import('./pages/technician/WorksheetDetail'));

// Shared pages
const Profile = lazy(() => import('./pages/shared/Profile'));

function SuspenseWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <Outlet />
    </Suspense>
  );
}

/** Simple 404 page */
function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">Page non trouvée</p>
      <Link to="/" className="text-primary hover:underline text-sm">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

async function requireRole(role: string | string[]) {
  try {
    const user = await api.auth.me();
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      return redirect('/login');
    }
    return null;
  } catch {
    return redirect('/login');
  }
}

export const router = createBrowserRouter([
  {
    element: <SuspenseWrapper />,
    children: [
      // Public
      { path: '/', element: <Landing /> },
      { path: '/login', element: <Login /> },
      { path: '/demande', element: <ServiceRequest /> },

      // Admin
      {
        path: '/admin',
        element: <AdminLayout />,
        loader: () => requireRole('ADMIN'),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'billets', element: <AdminTickets /> },
          { path: 'billets/:id', element: <AdminTicketDetail /> },
          { path: 'billets/kanban', element: <KanbanBoard /> },
          { path: 'calendrier', element: <AdminCalendar /> },
          { path: 'clients', element: <AdminClients /> },
          { path: 'clients/:id', element: <AdminClientDetail /> },
          { path: 'base-connaissances', element: <AdminKnowledgeBase /> },
          { path: 'base-connaissances/:id', element: <AdminKbArticleDetail /> },
          { path: 'parametres', element: <AdminSettings /> },
          { path: 'sauvegardes', element: <AdminBackups /> },
          { path: 'techniciens', element: <AdminTechnicians /> },
          { path: 'bons-travail', element: <WorkOrdersDashboard /> },
          { path: 'bons-travail/nouveau', element: <WorkOrderIntake /> },
          { path: 'bons-travail/:id', element: <WorkOrderDetail /> },
          { path: 'feuilles-travail', element: <AdminWorksheets /> },
          { path: 'feuilles-travail/:id', element: <AdminWorksheetDetail /> },
          { path: 'profil', element: <Profile /> },
        ],
      },

      // Customer Portal
      {
        path: '/portail',
        element: <PortalLayout />,
        loader: () => requireRole('CUSTOMER'),
        children: [
          { index: true, element: <PortalDashboard /> },
          { path: 'billets', element: <PortalTickets /> },
          { path: 'billets/:id', element: <PortalTicketDetail /> },
          { path: 'rendez-vous', element: <PortalAppointments /> },
          { path: 'bons-travail', element: <PortalWorkOrders /> },
          { path: 'bons-travail/:id', element: <PortalWorkOrderDetail /> },
          { path: 'profil', element: <Profile /> },
        ],
      },

      // Technician
      {
        path: '/technicien',
        element: <TechLayout />,
        loader: () => requireRole('TECHNICIAN'),
        children: [
          { index: true, element: <TechDashboard /> },
          { path: 'billets', element: <TechTickets /> },
          { path: 'billets/:id', element: <TechTicketDetail /> },
          { path: 'horaire', element: <TechSchedule /> },
          { path: 'bons-travail', element: <WorkOrdersDashboard /> },
          { path: 'bons-travail/nouveau', element: <WorkOrderIntake /> },
          { path: 'bons-travail/:id', element: <WorkOrderDetail /> },
          { path: 'feuilles-travail', element: <TechWorksheets /> },
          { path: 'feuilles-travail/:id', element: <TechWorksheetDetail /> },
          { path: 'profil', element: <Profile /> },
        ],
      },

      // 404 catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
]);
