import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/use-auth';

export default function Profile() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  // ---------- Form state ----------
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // ---------- Query ----------
  const { data: profile, isLoading, isError } = useQuery<User>({
    queryKey: ['users', 'profile'],
    queryFn: api.users.profile,
  });

  // Populate form when profile data arrives or changes
  // (same useEffect pattern as Settings.tsx)
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  // ---------- Mutation ----------
  const saveMutation = useMutation({
    mutationFn: () =>
      api.users.updateProfile({ firstName, lastName, phone }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
      // Also update the auth cache so the sidebar name refreshes
      queryClient.setQueryData(['auth', 'me'], updatedUser);
      toast.success('Profil mis à jour avec succès');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour du profil');
    },
  });

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground text-sm">Chargement du profil…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-destructive text-sm">
          Impossible de charger le profil. Veuillez réessayer.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

      <div className="bg-card border rounded-lg p-6 max-w-xl">
        {/* User info header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {(profile?.firstName?.[0] ?? '').toUpperCase()}
            {(profile?.lastName?.[0] ?? '').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">
              {profile?.firstName} {profile?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {authUser?.role === 'ADMIN'
                ? 'Administrateur'
                : authUser?.role === 'TECHNICIAN'
                  ? 'Technicien'
                  : 'Client'}
            </span>
          </div>
        </div>

        <h2 className="font-semibold mb-4">Modifier mes informations</h2>

        <div className="space-y-4">
          {/* First name */}
          <div>
            <label className="block text-sm font-medium mb-1">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Last name */}
          <div>
            <label className="block text-sm font-medium mb-1">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1">Courriel</label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Save button */}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
