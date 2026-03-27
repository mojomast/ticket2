import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { DemoPersona } from '../../api/client';
import { ROLE_LABELS } from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';

export default function Login() {
  const navigate = useNavigate();
  const { login, demoLogin, isLoggingIn, loginError, user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If already authenticated, redirect to the appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigateByRole(user.role);
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: personas } = useQuery({
    queryKey: ['demo', 'personas'],
    queryFn: api.demo.personas,
    retry: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await login({ email, password });
      navigateByRole(user.role);
    } catch {
      // Error handled by mutation
    }
  }

  async function handleDemoLogin(personaEmail: string) {
    try {
      const user = await demoLogin(personaEmail);
      navigateByRole(user.role);
    } catch {
      // Error handled
    }
  }

  function navigateByRole(role: string) {
    switch (role) {
      case 'ADMIN': navigate('/admin'); break;
      case 'TECHNICIAN': navigate('/technicien'); break;
      case 'CUSTOMER': navigate('/portail'); break;
      default: navigate('/');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-6">{t('auth.login')}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {loginError && (
              <p className="text-sm text-destructive">
                {(loginError as Error).message || t('auth.loginError')}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoggingIn ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          {personas && personas.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-3 text-center">{t('auth.demoMode')}</p>
              <div className="grid grid-cols-1 gap-2">
                {(personas as DemoPersona[]).map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => handleDemoLogin(persona.email)}
                    className="flex items-center justify-between px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors"
                  >
                    <span>{persona.firstName} {persona.lastName}</span>
                    <span className="text-xs text-muted-foreground">
                      {ROLE_LABELS[persona.role] || persona.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
