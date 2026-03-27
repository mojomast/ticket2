import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useAuthStore } from '../../stores/auth-store';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Mail, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

export default function AdminSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { locale, setLocale } = useAuthStore();
  const { t } = useTranslation();

  // ── Branding form state ─────────────────────────────────────────
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // ── Email config form state ─────────────────────────────────────
  const [m365TenantId, setM365TenantId] = useState('');
  const [m365ClientId, setM365ClientId] = useState('');
  const [m365ClientSecret, setM365ClientSecret] = useState('');
  const [m365SenderEmail, setM365SenderEmail] = useState('');

  // ── SMS config form state ───────────────────────────────────────
  const [voipmsUsername, setVoipmsUsername] = useState('');
  const [voipmsPassword, setVoipmsPassword] = useState('');
  const [voipmsDid, setVoipmsDid] = useState('');

  // ── Queries ─────────────────────────────────────────────────────
  const { data: branding, isLoading, isError } = useQuery({
    queryKey: ['config', 'branding'],
    queryFn: api.config.branding,
  });

  const { data: emailConfig } = useQuery({
    queryKey: ['config', 'email_config'],
    queryFn: () => api.admin.config.get('email_config').catch(() => null),
  });

  const { data: smsConfig } = useQuery({
    queryKey: ['config', 'sms_config'],
    queryFn: () => api.admin.config.get('sms_config').catch(() => null),
  });

  // ── Populate branding form ──────────────────────────────────────
  useEffect(() => {
    if (!branding) return;
    if (branding.companyName) setCompanyName(branding.companyName as string);
    if (branding.primaryColor) setPrimaryColor(branding.primaryColor as string);
    if (branding.logoUrl) setLogoUrl(branding.logoUrl as string);
    if (branding.phone) setPhone(branding.phone as string);
    if (branding.email) setEmail(branding.email as string);
    if (branding.address) setAddress(branding.address as string);
  }, [branding]);

  // ── Populate email config form ──────────────────────────────────
  useEffect(() => {
    if (!emailConfig?.value || typeof emailConfig.value !== 'object') return;
    const v = emailConfig.value as Record<string, string>;
    if (v.tenantId) setM365TenantId(v.tenantId);
    if (v.clientId) setM365ClientId(v.clientId);
    if (v.clientSecret) setM365ClientSecret(v.clientSecret);
    if (v.senderEmail) setM365SenderEmail(v.senderEmail);
  }, [emailConfig]);

  // ── Populate SMS config form ────────────────────────────────────
  useEffect(() => {
    if (!smsConfig?.value || typeof smsConfig.value !== 'object') return;
    const v = smsConfig.value as Record<string, string>;
    if (v.username) setVoipmsUsername(v.username);
    if (v.password) setVoipmsPassword(v.password);
    if (v.did) setVoipmsDid(v.did);
  }, [smsConfig]);

  // ── Mutations ───────────────────────────────────────────────────
  const saveBrandingMutation = useMutation({
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

  const saveEmailMutation = useMutation({
    mutationFn: () =>
      api.admin.config.set('email_config', {
        tenantId: m365TenantId,
        clientId: m365ClientId,
        clientSecret: m365ClientSecret,
        senderEmail: m365SenderEmail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'email_config'] });
      toast.success(t('settings.emailSaved'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('settings.saveError'));
    },
  });

  const saveSmsMutation = useMutation({
    mutationFn: () =>
      api.admin.config.set('sms_config', {
        username: voipmsUsername,
        password: voipmsPassword,
        did: voipmsDid,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'sms_config'] });
      toast.success(t('settings.smsSaved'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('settings.saveError'));
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────
  const emailConfigured = !!(
    emailConfig?.value &&
    typeof emailConfig.value === 'object' &&
    (emailConfig.value as Record<string, unknown>).tenantId
  );

  const smsConfigured = !!(
    smsConfig?.value &&
    typeof smsConfig.value === 'object' &&
    (smsConfig.value as Record<string, unknown>).username
  );

  // ── Render ──────────────────────────────────────────────────────
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

      {/* ── Language Toggle ── */}
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

      {/* ── Branding ── */}
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
              onClick={() => saveBrandingMutation.mutate()}
              disabled={saveBrandingMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saveBrandingMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </HelpTooltip>
        </div>
      </div>

      {/* ── Email Configuration (Microsoft 365) ── */}
      <div className="bg-card border rounded-lg p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">{t('settings.emailConfig')}</h2>
          {emailConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              {t('settings.configured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              {t('settings.notConfigured')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.emailConfigDesc')}
        </p>

        <div className="space-y-4">
          {/* Tenant ID */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.m365TenantId')}</label>
            <HelpTooltip content={t('settings.m365TenantIdTooltip')} side="right">
              <input
                type="text"
                value={m365TenantId}
                onChange={(e) => setM365TenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.m365ClientId')}</label>
            <HelpTooltip content={t('settings.m365ClientIdTooltip')} side="right">
              <input
                type="text"
                value={m365ClientId}
                onChange={(e) => setM365ClientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.m365ClientSecret')}</label>
            <HelpTooltip content={t('settings.m365ClientSecretTooltip')} side="right">
              <input
                type="password"
                value={m365ClientSecret}
                onChange={(e) => setM365ClientSecret(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Sender Email */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.m365SenderEmail')}</label>
            <HelpTooltip content={t('settings.m365SenderEmailTooltip')} side="right">
              <input
                type="email"
                value={m365SenderEmail}
                onChange={(e) => setM365SenderEmail(e.target.value)}
                placeholder="noreply@entreprise.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </HelpTooltip>
          </div>

          {/* Save button */}
          <button
            onClick={() => saveEmailMutation.mutate()}
            disabled={saveEmailMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saveEmailMutation.isPending ? t('common.saving') : t('settings.saveEmailConfig')}
          </button>
        </div>
      </div>

      {/* ── SMS Configuration (VoIP.ms) ── */}
      <div className="bg-card border rounded-lg p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">{t('settings.smsConfig')}</h2>
          {smsConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              {t('settings.configured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              {t('settings.notConfigured')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.smsConfigDesc')}
        </p>

        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.voipmsUsername')}</label>
            <HelpTooltip content={t('settings.voipmsUsernameTooltip')} side="right">
              <input
                type="text"
                value={voipmsUsername}
                onChange={(e) => setVoipmsUsername(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </HelpTooltip>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.voipmsPassword')}</label>
            <HelpTooltip content={t('settings.voipmsPasswordTooltip')} side="right">
              <input
                type="password"
                value={voipmsPassword}
                onChange={(e) => setVoipmsPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </HelpTooltip>
          </div>

          {/* DID */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('settings.voipmsDid')}</label>
            <HelpTooltip content={t('settings.voipmsDidTooltip')} side="right">
              <input
                type="tel"
                value={voipmsDid}
                onChange={(e) => setVoipmsDid(e.target.value)}
                placeholder="15141234567"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Save button */}
          <button
            onClick={() => saveSmsMutation.mutate()}
            disabled={saveSmsMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saveSmsMutation.isPending ? t('common.saving') : t('settings.saveSmsConfig')}
          </button>
        </div>
      </div>
    </div>
  );
}
