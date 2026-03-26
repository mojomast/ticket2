import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type DemoPersona } from '../../api/client';
import { ROLE_LABELS } from '../../lib/constants';
import { useToast } from '../../hooks/use-toast';

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

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center gap-4 max-w-7xl mx-auto">
        <span className="text-xs font-medium text-amber-800 whitespace-nowrap">
          MODE DEMO
        </span>
        <div className="flex gap-2 flex-wrap">
          {(personas as DemoPersona[]).map((persona) => (
            <button
              key={persona.id}
              onClick={() => handlePersonaSwitch(persona.email)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                user?.email === persona.email
                  ? 'bg-amber-200 border-amber-400 text-amber-900 font-medium'
                  : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {persona.firstName} ({ROLE_LABELS[persona.role] || persona.role})
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {resetMutation.isPending ? 'Reinitialisation...' : 'Reinitialiser'}
          </button>
        </div>
      </div>
    </div>
  );
}
