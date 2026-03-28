import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ROLE_LABELS } from '../../lib/constants';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from './HelpTooltip';
import ConfirmDialog from './ConfirmDialog';
import { useTranslation } from '../../lib/i18n/hook';

export default function DemoBanner() {
  const { user, demoLogin, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => api.demo.reset(),
    onSuccess: async () => {
      queryClient.clear();
      toast.success(t('demo.resetSuccess'));
      logout();
    },
    onError: () => toast.error(t('demo.resetError')),
  });

  const handlePersonaSwitch = async (email: string) => {
    try {
      const loggedInUser = await demoLogin(email);
      switch (loggedInUser.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'TECHNICIAN':
          navigate('/technicien');
          break;
        case 'CUSTOMER':
          navigate('/portail');
          break;
      }
    } catch {
      toast.error(t('demo.loginError'));
    }
  };

  const { data: personas } = useQuery({
    queryKey: ['demo', 'personas'],
    queryFn: api.demo.personas,
    retry: false,
  });

  if (!personas || personas.length === 0) return null;

  // Group personas by role
  const admins = personas.filter((p) => p.role === 'ADMIN');
  const technicians = personas.filter((p) => p.role === 'TECHNICIAN');
  const customers = personas.filter((p) => p.role === 'CUSTOMER');

  // Check if current user is a customer persona
  const currentCustomerEmail =
    user?.role === 'CUSTOMER' ? user.email : '';

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center gap-4 max-w-7xl mx-auto">
        <span className="text-xs font-medium text-amber-800 whitespace-nowrap">
          {t('demo.mode')}
        </span>

        {/* Admin & Technician buttons */}
        <div className="flex gap-2 flex-wrap">
          {[...admins, ...technicians].map((persona) => (
            <HelpTooltip key={persona.id} content={t('demo.loginAs', { name: persona.firstName, role: ROLE_LABELS[persona.role] || persona.role })} side="bottom">
              <button
                onClick={() => handlePersonaSwitch(persona.email)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  user?.email === persona.email
                    ? 'bg-amber-200 border-amber-400 text-amber-900 font-medium'
                    : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {persona.firstName} ({ROLE_LABELS[persona.role] || persona.role})
              </button>
            </HelpTooltip>
          ))}

          {/* Customer dropdown */}
          {customers.length > 0 && (
            <HelpTooltip content={t('demo.switchCustomerTooltip')} side="bottom">
              <select
                value={currentCustomerEmail}
                onChange={(e) => {
                  if (e.target.value) handlePersonaSwitch(e.target.value);
                }}
                className={`text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
                  currentCustomerEmail
                    ? 'bg-amber-200 border-amber-400 text-amber-900 font-medium'
                    : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <option value="">
                  {t('demo.customers', { count: customers.length })}
                </option>
                {customers.map((persona) => (
                  <option key={persona.id} value={persona.email}>
                    {persona.firstName} {persona.lastName}
                  </option>
                ))}
              </select>
            </HelpTooltip>
          )}
        </div>

        <div className="ml-auto">
          {user?.role === 'ADMIN' && (
            <HelpTooltip content={t('demo.resetTooltip')} side="bottom">
              <button
                onClick={() => setResetConfirmOpen(true)}
                disabled={resetMutation.isPending}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {resetMutation.isPending ? t('demo.resetting') : t('demo.reset')}
              </button>
            </HelpTooltip>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title={t('demo.resetConfirmTitle')}
        description={t('demo.resetConfirmDescription')}
        confirmLabel={t('demo.reset')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => resetMutation.mutate()}
      />
    </div>
  );
}
