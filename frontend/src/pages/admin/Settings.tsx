import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useAuthStore } from '../../stores/auth-store';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

export default function AdminSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { locale, setLocale } = useAuthStore();
  const { t } = useTranslation();

  // ---------- Form state ----------
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // ---------- Query ----------
  const { data: branding, isLoading, isError } = useQuery({
    queryKey: ['config', 'branding'],
    queryFn: api.config.branding,
  });

  // Populate form when branding data arrives or changes
  // (replaces the removed TanStack Query v5 `onSuccess` callback)
  useEffect(() => {
    if (!branding) return;
    if (branding.companyName) setCompanyName(branding.companyName as string);
    if (branding.primaryColor) setPrimaryColor(branding.primaryColor as string);
    if (branding.logoUrl) setLogoUrl(branding.logoUrl as string);
    if (branding.phone) setPhone(branding.phone as string);
    if (branding.email) setEmail(branding.email as string);
    if (branding.address) setAddress(branding.address as string);
  }, [branding]);

  // ---------- Mutation ----------
  const saveMutation = useMutation({
    mutationFn: () =>
      api.admin.config.updateBranding({
        companyName,
        primaryColor,
        logoUrl,
        phone,
        email,
        address,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'branding'] });
      toast.success(t('settings.savedSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('settings.saveError'));
    },
  });

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground text-sm">{t('settings.loadingSettings')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-destructive text-sm">
          {t('settings.loadError')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Language Toggle Section */}
      <div className="bg-card border rounded-lg p-6 max-w-xl">
        <h2 className="font-semibold mb-4">{t('settings.language')}</h2>
        <div className="flex items-center gap-3">
          <HelpTooltip content={t('settings.languageTooltip')} side="right">
            <div className="flex rounded-md border border-input overflow-hidden">
              <button
                type="button"
                onClick={() => setLocale('fr')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  locale === 'fr'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                {t('settings.french')}
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  locale === 'en'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                {t('settings.english')}
              </button>
            </div>
          </HelpTooltip>
          <span className="text-sm text-muted-foreground">
            {locale === 'fr' ? t('settings.activeLangFr') : t('settings.activeLangEn')}
          </span>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 max-w-xl">
        <h2 className="font-semibold mb-4">{t('settings.branding')}</h2>

        <div className="space-y-4">
          {/* Company name */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.companyName')}</label>
            <HelpTooltip content={t('settings.companyNameTooltip')} side="right">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Valitek"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </HelpTooltip>
          </div>

          {/* Primary colour */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.primaryColor')}</label>
            <HelpTooltip content={t('settings.primaryColorTooltip')} side="right">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  maxLength={7}
                  className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            </HelpTooltip>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.logoUrl')}</label>
            <HelpTooltip content={t('settings.logoUrlTooltip')} side="right">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </HelpTooltip>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@entreprise.fr"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.address')}</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="123 rue Exemple, 75001 Paris"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
            />
          </div>

          {/* Save button */}
          <HelpTooltip content={t('settings.saveTooltip')} side="right">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </HelpTooltip>
        </div>
      </div>
    </div>
  );
}
