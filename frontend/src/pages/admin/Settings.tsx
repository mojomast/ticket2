import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useAuthStore } from '../../stores/auth-store';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Mail, MessageSquare, CheckCircle, XCircle, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Checkbox } from '../../components/ui/checkbox';

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

  // ── Worksheet threshold state ───────────────────────────────────
  const [thresholdAmount, setThresholdAmount] = useState(500);

  // ── Worksheet config state ─────────────────────────────────────
  const [wsDefaultHourlyRate, setWsDefaultHourlyRate] = useState(85);
  const [wsDefaultRatePerKm, setWsDefaultRatePerKm] = useState(0.68);
  const [wsTravelChargeMode, setWsTravelChargeMode] = useState<'per_km' | 'hourly' | 'flat'>('per_km');
  const [wsTravelHourlyRate, setWsTravelHourlyRate] = useState(65);
  const [wsTravelFlatRate, setWsTravelFlatRate] = useState(50);
  const [wsEnableLabor, setWsEnableLabor] = useState(true);
  const [wsEnableParts, setWsEnableParts] = useState(true);
  const [wsEnableTravel, setWsEnableTravel] = useState(true);
  const [wsEnableNotes, setWsEnableNotes] = useState(true);
  const [wsEnableFollowUps, setWsEnableFollowUps] = useState(true);
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

  const { data: thresholdConfig } = useQuery({
    queryKey: ['config', 'worksheet_alert_threshold'],
    queryFn: () => api.admin.config.get('worksheet_alert_threshold').catch(() => null),
  });

  const { data: worksheetConfigData } = useQuery({
    queryKey: ['config', 'worksheet_config'],
    queryFn: () => api.admin.config.get('worksheet_config').catch(() => null),
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

  // ── Populate worksheet threshold ────────────────────────────────
  useEffect(() => {
    if (!thresholdConfig?.value) return;
    if (typeof thresholdConfig.value === 'object') {
      const v = thresholdConfig.value as Record<string, unknown>;
      const threshold = v.threshold ?? v.value;
      if (typeof threshold === 'number') setThresholdAmount(threshold);
    } else if (typeof thresholdConfig.value === 'number') {
      setThresholdAmount(thresholdConfig.value);
    }
  }, [thresholdConfig]);

  // ── Populate worksheet config ──────────────────────────────────
  useEffect(() => {
    if (!worksheetConfigData?.value || typeof worksheetConfigData.value !== 'object') return;
    const v = worksheetConfigData.value as Record<string, unknown>;
    if (typeof v.defaultHourlyRate === 'number') setWsDefaultHourlyRate(v.defaultHourlyRate);
    if (typeof v.defaultRatePerKm === 'number') setWsDefaultRatePerKm(v.defaultRatePerKm);
    if (v.travelChargeMode === 'per_km' || v.travelChargeMode === 'hourly' || v.travelChargeMode === 'flat') {
      setWsTravelChargeMode(v.travelChargeMode);
    }
    if (typeof v.travelHourlyRate === 'number') setWsTravelHourlyRate(v.travelHourlyRate);
    if (typeof v.travelFlatRate === 'number') setWsTravelFlatRate(v.travelFlatRate);
    if (typeof v.enableLabor === 'boolean') setWsEnableLabor(v.enableLabor);
    if (typeof v.enableParts === 'boolean') setWsEnableParts(v.enableParts);
    if (typeof v.enableTravel === 'boolean') setWsEnableTravel(v.enableTravel);
    if (typeof v.enableNotes === 'boolean') setWsEnableNotes(v.enableNotes);
    if (typeof v.enableFollowUps === 'boolean') setWsEnableFollowUps(v.enableFollowUps);
  }, [worksheetConfigData]);

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

  const saveThresholdMutation = useMutation({
    mutationFn: () =>
      api.admin.config.set('worksheet_alert_threshold', { threshold: thresholdAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'worksheet_alert_threshold'] });
      toast.success(t('settings.thresholdSaved'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('settings.saveError'));
    },
  });

  const saveWorksheetConfigMutation = useMutation({
    mutationFn: () =>
      api.admin.config.set('worksheet_config', {
        defaultHourlyRate: wsDefaultHourlyRate,
        defaultRatePerKm: wsDefaultRatePerKm,
        travelChargeMode: wsTravelChargeMode,
        travelHourlyRate: wsTravelHourlyRate,
        travelFlatRate: wsTravelFlatRate,
        enableLabor: wsEnableLabor,
        enableParts: wsEnableParts,
        enableTravel: wsEnableTravel,
        enableNotes: wsEnableNotes,
        enableFollowUps: wsEnableFollowUps,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'worksheet_config'] });
      toast.success(t('settings.worksheetConfigSaved'));
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 max-w-xl rounded-lg" />
        <Skeleton className="h-64 max-w-xl rounded-lg" />
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
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">{t('settings.language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <HelpTooltip content={t('settings.languageTooltip')} side="right">
              <div className="flex rounded-md border border-input overflow-hidden">
                <Button
                  type="button"
                  variant={locale === 'fr' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLocale('fr')}
                  className="rounded-none"
                >
                  {t('settings.french')}
                </Button>
                <Button
                  type="button"
                  variant={locale === 'en' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLocale('en')}
                  className="rounded-none"
                >
                  {t('settings.english')}
                </Button>
              </div>
            </HelpTooltip>
            <span className="text-sm text-muted-foreground">
              {locale === 'fr' ? t('settings.activeLangFr') : t('settings.activeLangEn')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Branding ── */}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">{t('settings.branding')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company name */}
          <div className="space-y-1">
            <Label>{t('settings.companyName')}</Label>
            <HelpTooltip content={t('settings.companyNameTooltip')} side="right">
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Valitek"
              />
            </HelpTooltip>
          </div>

          {/* Primary colour */}
          <div className="space-y-1">
            <Label>{t('settings.primaryColor')}</Label>
            <HelpTooltip content={t('settings.primaryColorTooltip')} side="right">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  maxLength={7}
                  className="w-28 font-mono"
                />
              </div>
            </HelpTooltip>
          </div>

          {/* Logo URL */}
          <div className="space-y-1">
            <Label>{t('settings.logoUrl')}</Label>
            <HelpTooltip content={t('settings.logoUrlTooltip')} side="right">
              <Input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </HelpTooltip>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label>{t('settings.phone')}</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label>{t('settings.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@entreprise.fr"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <Label>{t('settings.address')}</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="123 rue Exemple, 75001 Paris"
              className="resize-y"
            />
          </div>

          {/* Save button */}
          <HelpTooltip content={t('settings.saveTooltip')} side="right">
            <Button
              onClick={() => saveBrandingMutation.mutate()}
              disabled={saveBrandingMutation.isPending}
            >
              {saveBrandingMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </HelpTooltip>
        </CardContent>
      </Card>

      {/* ── Email Configuration (Microsoft 365) ── */}
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('settings.emailConfig')}</CardTitle>
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
          <p className="text-sm text-muted-foreground">
            {t('settings.emailConfigDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tenant ID */}
          <div className="space-y-1">
            <Label>{t('settings.m365TenantId')}</Label>
            <HelpTooltip content={t('settings.m365TenantIdTooltip')} side="right">
              <Input
                type="text"
                value={m365TenantId}
                onChange={(e) => setM365TenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Client ID */}
          <div className="space-y-1">
            <Label>{t('settings.m365ClientId')}</Label>
            <HelpTooltip content={t('settings.m365ClientIdTooltip')} side="right">
              <Input
                type="text"
                value={m365ClientId}
                onChange={(e) => setM365ClientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Client Secret */}
          <div className="space-y-1">
            <Label>{t('settings.m365ClientSecret')}</Label>
            <HelpTooltip content={t('settings.m365ClientSecretTooltip')} side="right">
              <Input
                type="password"
                value={m365ClientSecret}
                onChange={(e) => setM365ClientSecret(e.target.value)}
                placeholder="••••••••"
                className="font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Sender Email */}
          <div className="space-y-1">
            <Label>{t('settings.m365SenderEmail')}</Label>
            <HelpTooltip content={t('settings.m365SenderEmailTooltip')} side="right">
              <Input
                type="email"
                value={m365SenderEmail}
                onChange={(e) => setM365SenderEmail(e.target.value)}
                placeholder="noreply@entreprise.com"
              />
            </HelpTooltip>
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveEmailMutation.mutate()}
            disabled={saveEmailMutation.isPending}
          >
            {saveEmailMutation.isPending ? t('common.saving') : t('settings.saveEmailConfig')}
          </Button>
        </CardContent>
      </Card>

      {/* ── SMS Configuration (VoIP.ms) ── */}
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('settings.smsConfig')}</CardTitle>
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
          <p className="text-sm text-muted-foreground">
            {t('settings.smsConfigDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Username */}
          <div className="space-y-1">
            <Label>{t('settings.voipmsUsername')}</Label>
            <HelpTooltip content={t('settings.voipmsUsernameTooltip')} side="right">
              <Input
                type="text"
                value={voipmsUsername}
                onChange={(e) => setVoipmsUsername(e.target.value)}
                placeholder="user@example.com"
              />
            </HelpTooltip>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label>{t('settings.voipmsPassword')}</Label>
            <HelpTooltip content={t('settings.voipmsPasswordTooltip')} side="right">
              <Input
                type="password"
                value={voipmsPassword}
                onChange={(e) => setVoipmsPassword(e.target.value)}
                placeholder="••••••••"
                className="font-mono"
              />
            </HelpTooltip>
          </div>

          {/* DID */}
          <div className="space-y-1">
            <Label>{t('settings.voipmsDid')}</Label>
            <HelpTooltip content={t('settings.voipmsDidTooltip')} side="right">
              <Input
                type="tel"
                value={voipmsDid}
                onChange={(e) => setVoipmsDid(e.target.value)}
                placeholder="15141234567"
                className="font-mono"
              />
            </HelpTooltip>
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveSmsMutation.mutate()}
            disabled={saveSmsMutation.isPending}
          >
            {saveSmsMutation.isPending ? t('common.saving') : t('settings.saveSmsConfig')}
          </Button>
        </CardContent>
      </Card>

      {/* ── Worksheet Alert Threshold ── */}
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('settings.worksheetThreshold')}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.worksheetThresholdDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{t('settings.thresholdAmount')}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={thresholdAmount}
              onChange={(e) => setThresholdAmount(Number(e.target.value))}
              className="max-w-[200px]"
            />
          </div>
          <Button
            onClick={() => saveThresholdMutation.mutate()}
            disabled={saveThresholdMutation.isPending}
          >
            {saveThresholdMutation.isPending ? t('common.saving') : t('settings.saveThreshold')}
          </Button>
        </CardContent>
      </Card>

      {/* ── Worksheet Configuration ── */}
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('settings.worksheetConfig')}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.worksheetConfigDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default hourly rate */}
          <div className="space-y-1">
            <Label>{t('settings.defaultHourlyRate')}</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={wsDefaultHourlyRate}
              onChange={(e) => setWsDefaultHourlyRate(Number(e.target.value))}
              className="max-w-[200px]"
            />
          </div>

          {/* Travel charge mode */}
          <div className="space-y-1">
            <Label>{t('settings.travelChargeMode')}</Label>
            <select
              value={wsTravelChargeMode}
              onChange={(e) => setWsTravelChargeMode(e.target.value as 'per_km' | 'hourly' | 'flat')}
              className="flex h-9 w-full max-w-[300px] rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="per_km">{t('settings.travelModePerKm')}</option>
              <option value="hourly">{t('settings.travelModeHourly')}</option>
              <option value="flat">{t('settings.travelModeFlat')}</option>
            </select>
          </div>

          {/* Rate per km (shown when mode is per_km) */}
          {wsTravelChargeMode === 'per_km' && (
            <div className="space-y-1">
              <Label>{t('settings.defaultRatePerKm')}</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={wsDefaultRatePerKm}
                onChange={(e) => setWsDefaultRatePerKm(Number(e.target.value))}
                className="max-w-[200px]"
              />
            </div>
          )}

          {/* Travel hourly rate (shown when mode is hourly) */}
          {wsTravelChargeMode === 'hourly' && (
            <div className="space-y-1">
              <Label>{t('settings.travelHourlyRate')}</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={wsTravelHourlyRate}
                onChange={(e) => setWsTravelHourlyRate(Number(e.target.value))}
                className="max-w-[200px]"
              />
            </div>
          )}

          {/* Travel flat rate (shown when mode is flat) */}
          {wsTravelChargeMode === 'flat' && (
            <div className="space-y-1">
              <Label>{t('settings.travelFlatRate')}</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={wsTravelFlatRate}
                onChange={(e) => setWsTravelFlatRate(Number(e.target.value))}
                className="max-w-[200px]"
              />
            </div>
          )}

          {/* Enabled sections */}
          <div className="space-y-2">
            <Label>{t('settings.enabledSections')}</Label>
            <div className="space-y-2">
              {([
                { key: 'labor', state: wsEnableLabor, setter: setWsEnableLabor, label: t('settings.enableLabor') },
                { key: 'parts', state: wsEnableParts, setter: setWsEnableParts, label: t('settings.enableParts') },
                { key: 'travel', state: wsEnableTravel, setter: setWsEnableTravel, label: t('settings.enableTravel') },
                { key: 'notes', state: wsEnableNotes, setter: setWsEnableNotes, label: t('settings.enableNotes') },
                { key: 'followups', state: wsEnableFollowUps, setter: setWsEnableFollowUps, label: t('settings.enableFollowUps') },
              ] as const).map((section) => (
                <div key={section.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`ws-enable-${section.key}`}
                    checked={section.state}
                    onCheckedChange={(checked) => section.setter(checked === true)}
                  />
                  <label
                    htmlFor={`ws-enable-${section.key}`}
                    className="text-sm cursor-pointer"
                  >
                    {section.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveWorksheetConfigMutation.mutate()}
            disabled={saveWorksheetConfigMutation.isPending}
          >
            {saveWorksheetConfigMutation.isPending ? t('common.saving') : t('settings.saveWorksheetConfig')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
