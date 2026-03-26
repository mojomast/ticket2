import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API client
vi.mock('../../api/client', () => ({
  api: {
    messages: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock useAuth
vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
    isAuthenticated: true,
  }),
}));

// Mock useToast
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

import MessageThread from './MessageThread';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('MessageThread', () => {
  it('shows loading state initially', () => {
    renderWithProviders(<MessageThread ticketId="ticket-1" />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('shows empty state when no messages', async () => {
    renderWithProviders(<MessageThread ticketId="ticket-1" />);
    expect(await screen.findByText('Aucun message')).toBeInTheDocument();
  });

  it('renders message input area', async () => {
    renderWithProviders(<MessageThread ticketId="ticket-1" />);
    expect(await screen.findByPlaceholderText('Ecrire un message...')).toBeInTheDocument();
    expect(screen.getByText('Envoyer')).toBeInTheDocument();
  });

  it('shows internal note checkbox for non-customer users', async () => {
    renderWithProviders(<MessageThread ticketId="ticket-1" />);
    expect(await screen.findByText(/Note interne/)).toBeInTheDocument();
  });
});
