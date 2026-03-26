import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ROLE_LABELS } from '../../lib/constants';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from './HelpTooltip';

export default function DemoBanner() {
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: () => api.demo.reset(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Donnees demo reinitialisees');
    },
    onError: () => toast.error('Erreur lors de la reinitialisation'),
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
      toast.error('Impossible de se connecter avec ce compte demo.');
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
          MODE DEMO
        </span>

        {/* Admin & Technician buttons */}
        <div className="flex gap-2 flex-wrap">
          {[...admins, ...technicians].map((persona) => (
            <HelpTooltip key={persona.id} content={`Se connecter en tant que ${persona.firstName} (${ROLE_LABELS[persona.role] || persona.role})`} side="bottom">
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
            <HelpTooltip content="Changer d'utilisateur client pour tester le portail" side="bottom">
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
                  Clients ({customers.length})
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
            <HelpTooltip content="Réinitialiser toutes les données de démonstration à leur état initial" side="bottom">
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {resetMutation.isPending ? 'Reinitialisation...' : 'Reinitialiser'}
              </button>
            </HelpTooltip>
          )}
        </div>
      </div>
    </div>
  );
}
