import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/client', () => ({
  api: {
    tickets: {
      list: vi.fn().mockResolvedValue([
        { id: '1', ticketNumber: 'TKT-260301', title: 'Test ticket', status: 'NOUVELLE', priority: 'NORMALE', createdAt: new Date().toISOString(), customer: { firstName: 'Luc', lastName: 'Gagnon' } },
      ]),
    },
    appointments: {
      list: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
  }),
}));

import AdminDashboard from './Dashboard';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('AdminDashboard', () => {
  it('renders welcome message with user name', () => {
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText(/Bienvenue, Admin/)).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Nouveaux')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });

  it('displays ticket data when loaded', async () => {
    renderWithProviders(<AdminDashboard />);
    expect(await screen.findByText('TKT-260301')).toBeInTheDocument();
    expect(await screen.findByText('Test ticket')).toBeInTheDocument();
  });
});
