import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/use-auth';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

export default function Profile() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  // ---------- Profile form state ----------
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // ---------- Password form state ----------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // ---------- Profile form errors ----------
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

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

  // ---------- Profile Mutation ----------
  const saveMutation = useMutation({
    mutationFn: () =>
      api.users.updateProfile({ firstName, lastName, phone }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
      // Also update the auth cache so the sidebar name refreshes
      queryClient.setQueryData(['auth', 'me'], updatedUser);
      toast.success(t('profile.savedSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('profile.saveError'));
    },
  });

  // ---------- Password Mutation ----------
  const passwordMutation = useMutation({
    mutationFn: () =>
      api.users.changePassword({ currentPassword, newPassword, confirmPassword }),
    onSuccess: () => {
      toast.success(t('profile.passwordSuccess'));
      // Clear the password form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    },
    onError: (err: Error) => {
      toast.error(err.message || t('profile.passwordError'));
    },
  });

  // ---------- Profile validation ----------
  function validateProfileForm(): boolean {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = t('validation.firstNameRequired');
    if (!lastName.trim()) errs.lastName = t('validation.lastNameRequired');
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ---------- Password validation ----------
  function validatePasswordForm(): boolean {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = t('profile.errorCurrentRequired');
    }
    if (newPassword.length < 8) {
      errors.newPassword = t('profile.errorNewMinLength');
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = t('profile.errorConfirmMismatch');
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validatePasswordForm()) {
      passwordMutation.mutate();
    }
  }

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground text-sm">{t('profile.loadingProfile')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-destructive text-sm">
          {t('profile.loadError')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      {/* ─── Profile Information Card ─── */}
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
                ? t('profile.roleAdmin')
                : authUser?.role === 'TECHNICIAN'
                  ? t('profile.roleTech')
                  : t('profile.roleCustomer')}
            </span>
          </div>
        </div>

        <h2 className="font-semibold mb-4">{t('profile.editInfo')}</h2>

        <div className="space-y-4">
          {/* First name */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.firstName')}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setProfileErrors((prev) => { const { firstName: _, ...rest } = prev; return rest; }); }}
              placeholder={t('profile.firstName')}
              className={`w-full rounded-md border ${profileErrors.firstName ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {profileErrors.firstName && <p className="text-sm text-destructive mt-1">{profileErrors.firstName}</p>}
          </div>

          {/* Last name */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.lastName')}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setProfileErrors((prev) => { const { lastName: _, ...rest } = prev; return rest; }); }}
              placeholder={t('profile.lastName')}
              className={`w-full rounded-md border ${profileErrors.lastName ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {profileErrors.lastName && <p className="text-sm text-destructive mt-1">{profileErrors.lastName}</p>}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.email')}</label>
            <HelpTooltip content={t('profile.emailTooltip')} side="right">
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              />
            </HelpTooltip>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.phone')}</label>
            <HelpTooltip content={t('profile.phoneTooltip')} side="right">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </HelpTooltip>
          </div>

          {/* Save button */}
          <HelpTooltip content={t('profile.saveTooltip')} side="right">
            <button
              onClick={() => { if (validateProfileForm()) saveMutation.mutate(); }}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </HelpTooltip>
        </div>
      </div>

      {/* ─── Change Password Card ─── */}
      <div className="bg-card border rounded-lg p-6 max-w-xl">
        <h2 className="font-semibold mb-4">{t('profile.changePassword')}</h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((prev) => { const { currentPassword: _, ...rest } = prev; return rest; }); }}
              placeholder={t('profile.currentPasswordPlaceholder')}
              className={`w-full rounded-md border ${passwordErrors.currentPassword ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {passwordErrors.currentPassword && (
              <p className="text-destructive text-xs mt-1">{passwordErrors.currentPassword}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((prev) => { const { newPassword: _, ...rest } = prev; return rest; }); }}
              placeholder={t('profile.newPasswordPlaceholder')}
              className={`w-full rounded-md border ${passwordErrors.newPassword ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {passwordErrors.newPassword && (
              <p className="text-destructive text-xs mt-1">{passwordErrors.newPassword}</p>
            )}
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors((prev) => { const { confirmPassword: _, ...rest } = prev; return rest; }); }}
              placeholder={t('profile.confirmPasswordPlaceholder')}
              className={`w-full rounded-md border ${passwordErrors.confirmPassword ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {passwordErrors.confirmPassword && (
              <p className="text-destructive text-xs mt-1">{passwordErrors.confirmPassword}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {passwordMutation.isPending ? t('profile.changingPassword') : t('profile.changePasswordButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
