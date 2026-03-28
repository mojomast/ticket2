import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  brandingMock,
  configGetMock,
  configSetMock,
  updateBrandingMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  brandingMock: vi.fn(),
  configGetMock: vi.fn(),
  configSetMock: vi.fn(),
  updateBrandingMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  api: {
    config: {
      branding: brandingMock,
    },
    admin: {
      config: {
        get: configGetMock,
        set: configSetMock,
        updateBranding: updateBrandingMock,
      },
    },
  },
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

vi.mock('../../components/shared/HelpTooltip', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import AdminSettings from './Settings';

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSettings />
    </QueryClientProvider>
  );
}

describe('AdminSettings notification retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    brandingMock.mockResolvedValue({});
    updateBrandingMock.mockResolvedValue({});
    configSetMock.mockResolvedValue({});
    configGetMock.mockImplementation(async (key: string) => {
      switch (key) {
        case 'notification_retention_policy':
          return {
            key,
            value: {
              enabled: true,
              readDays: 14,
              unreadDays: 120,
            },
          };
        default:
          return { key, value: null };
      }
    });
  });

  it('loads and saves notification retention policy', async () => {
    renderWithProviders();

    const readDaysInput = await screen.findByLabelText('Supprimer les notifications lues après (jours)');
    const unreadDaysInput = screen.getByLabelText('Supprimer les notifications non lues après (jours)');

    expect(readDaysInput).toHaveValue(14);
    expect(unreadDaysInput).toHaveValue(120);

    fireEvent.change(readDaysInput, { target: { value: '21' } });
    fireEvent.change(unreadDaysInput, { target: { value: '240' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la politique de rétention' }));

    await waitFor(() => {
      expect(configSetMock).toHaveBeenCalledWith('notification_retention_policy', {
        enabled: true,
        readDays: 21,
        unreadDays: 240,
      });
    });
  });

  it('validates notification retention days before saving', async () => {
    renderWithProviders();

    const readDaysInput = await screen.findByLabelText('Supprimer les notifications lues après (jours)');
    fireEvent.change(readDaysInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la politique de rétention' }));

    expect(await screen.findByText('Entrez un nombre entier supérieur à 0')).toBeInTheDocument();
    expect(configSetMock).not.toHaveBeenCalledWith(
      'notification_retention_policy',
      expect.anything(),
    );
  });
});
