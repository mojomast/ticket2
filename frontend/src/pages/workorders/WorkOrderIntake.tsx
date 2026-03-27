import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, type User } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { DEVICE_TYPE_LABELS, DATA_BACKUP_CONSENT_LABELS, SERVICE_CATEGORY_LABELS, PRIORITY_LABELS } from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';

const DEFAULT_CHECKLIST_KEYS = [
  'screenIntact',
  'keyboardFunctional',
  'batteryPresent',
  'chargerIncluded',
  'chassisNoDamage',
  'usbPortsFunctional',
] as const;

const COMMON_ACCESSORY_KEYS = [
  'charger', 'mouse', 'bag', 'usbCable', 'usbKey',
  'earphones', 'externalDisk', 'externalKeyboard', 'adapter',
] as const;

export default function WorkOrderIntake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();

  const basePath = user?.role === 'ADMIN' ? '/admin' : '/technicien';

  // ─── Customer search ───
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);

  const { data: customers = [] } = useQuery({
    queryKey: ['admin-users', customerSearch],
    queryFn: () => api.admin.users.list({ role: 'CUSTOMER', search: customerSearch, limit: 10 }),
    enabled: customerSearch.length >= 2,
  });

  // ─── Form fields ───
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Device
  const [deviceType, setDeviceType] = useState('LAPTOP');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [deviceOs, setDeviceOs] = useState('');

  // Condition
  const [conditionNotes, setConditionNotes] = useState('');
  const [accessories, setAccessories] = useState<string[]>([]);
  const [customAccessory, setCustomAccessory] = useState('');
  const [conditionChecklist, setConditionChecklist] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const k of DEFAULT_CHECKLIST_KEYS) init[k] = true;
    return init;
  });

  // Problem
  const [reportedIssue, setReportedIssue] = useState('');
  const [serviceCategory, setServiceCategory] = useState('REPARATION');

  // Financial
  const [maxAuthorizedSpend, setMaxAuthorizedSpend] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [diagnosticFee, setDiagnosticFee] = useState('');

  // Consent
  const [dataBackupConsent, setDataBackupConsent] = useState('NON_APPLICABLE');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Other
  const [estimatedPickupDate, setEstimatedPickupDate] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [priority, setPriority] = useState('NORMALE');
  const [warrantyDays, setWarrantyDays] = useState('30');

  // ─── Inline validation errors ───
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Technicians query ───
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: api.technicians.list,
  });

  // ─── Submit mutation ───
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.workorders.create(data),
    onSuccess: (wo) => {
      toast.success(t('wo.intake.createdSuccess', { orderNumber: wo.orderNumber }));
      navigate(`${basePath}/bons-travail/${wo.id}`);
    },
    onError: (err: Error) => toast.error(err.message || t('wo.intake.createError')),
  });

  // ─── Handlers ───

  function handleSelectCustomer(c: User) {
    setSelectedCustomer(c);
    setCustomerName(`${c.firstName} ${c.lastName}`);
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setShowCustomerSearch(false);
    setCustomerSearch('');
    clearError('customer');
    clearError('customerName');
    clearError('customerPhone');
  }

  function handleToggleAccessory(acc: string) {
    setAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  }

  function handleAddCustomAccessory() {
    if (customAccessory.trim() && !accessories.includes(customAccessory.trim())) {
      setAccessories((prev) => [...prev, customAccessory.trim()]);
      setCustomAccessory('');
    }
  }

  function handleChecklistToggle(key: string) {
    setConditionChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Helper to clear a single field error on change
  function clearError(field: string) {
    setFormErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!selectedCustomer) errs.customer = t('wo.intake.errorSelectClient');
    if (!customerName.trim()) errs.customerName = t('wo.intake.errorClientName');
    if (!customerPhone.trim()) errs.customerPhone = t('wo.intake.errorPhone');
    if (!deviceBrand.trim()) errs.deviceBrand = t('wo.intake.errorBrand');
    if (!deviceModel.trim()) errs.deviceModel = t('wo.intake.errorModel');
    if (!reportedIssue.trim()) errs.reportedIssue = t('wo.intake.errorIssue');
    if (!termsAccepted) errs.termsAccepted = t('wo.intake.errorTerms');
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    // selectedCustomer is guaranteed non-null after validateForm()
    const customer = selectedCustomer!;

    const payload: Record<string, unknown> = {
      customerId: customer.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      deviceType,
      deviceBrand: deviceBrand.trim(),
      deviceModel: deviceModel.trim(),
      deviceSerial: deviceSerial.trim() || undefined,
      deviceColor: deviceColor.trim() || undefined,
      devicePassword: devicePassword.trim() || undefined,
      deviceOs: deviceOs.trim() || undefined,
      conditionNotes: conditionNotes.trim() || undefined,
      accessories: accessories.length > 0 ? accessories : undefined,
      conditionChecklist: Object.keys(conditionChecklist).length > 0 ? conditionChecklist : undefined,
      reportedIssue: reportedIssue.trim(),
      serviceCategory,
      dataBackupConsent,
      termsAccepted,
      priority,
      warrantyDays: warrantyDays ? parseInt(warrantyDays) : undefined,
    };

    if (maxAuthorizedSpend) payload.maxAuthorizedSpend = parseFloat(maxAuthorizedSpend);
    if (depositAmount) payload.depositAmount = parseFloat(depositAmount);
    if (diagnosticFee) payload.diagnosticFee = parseFloat(diagnosticFee);
    if (estimatedPickupDate) payload.estimatedPickupDate = new Date(estimatedPickupDate).toISOString();
    if (technicianId) payload.technicianId = technicianId;

    createMutation.mutate(payload);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('wo.intake.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('wo.intake.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Section 1: Client ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">{t('wo.intake.sectionClient')}</h2>
          {formErrors.customer && showCustomerSearch && (
            <p className="text-sm text-destructive mb-2">{formErrors.customer}</p>
          )}

          {showCustomerSearch ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.searchExisting')}</label>
                <HelpTooltip content={t('wo.intake.searchTooltip')} side="right">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t('wo.intake.searchPlaceholder')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </HelpTooltip>
              </div>

              {/* Results */}
              {customerSearch.length >= 2 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {(customers as User[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">{t('wo.intake.noClientFound')}</p>
                  ) : (
                    (customers as User[]).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
                      >
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                        <span className="text-muted-foreground ml-2">{c.email}</span>
                        {c.phone && <span className="text-muted-foreground ml-2">| {c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{selectedCustomer?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCustomerSearch(true); setSelectedCustomer(null); }}
                  className="text-xs text-primary hover:underline"
                >
                  {t('wo.intake.changeClient')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.fullName')}</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); clearError('customerName'); }}
                    required
                    className={`w-full rounded-md border ${formErrors.customerName ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
                  />
                  {formErrors.customerName && <p className="text-sm text-destructive mt-1">{formErrors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.phone')}</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value); clearError('customerPhone'); }}
                    required
                    className={`w-full rounded-md border ${formErrors.customerPhone ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
                  />
                  {formErrors.customerPhone && <p className="text-sm text-destructive mt-1">{formErrors.customerPhone}</p>}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.email')}</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── Section 2: Appareil ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">{t('wo.intake.sectionDevice')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.deviceType')}</label>
              <HelpTooltip content={t('wo.intake.deviceTypeTooltip')} side="top">
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(DEVICE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </HelpTooltip>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.brand')}</label>
              <HelpTooltip content={t('wo.intake.brandTooltip')} side="top">
                <input
                  type="text"
                  value={deviceBrand}
                  onChange={(e) => { setDeviceBrand(e.target.value); clearError('deviceBrand'); }}
                  placeholder={t('wo.intake.brandPlaceholder')}
                  required
                  className={`w-full rounded-md border ${formErrors.deviceBrand ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
                />
              </HelpTooltip>
              {formErrors.deviceBrand && <p className="text-sm text-destructive mt-1">{formErrors.deviceBrand}</p>}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.model')}</label>
              <HelpTooltip content={t('wo.intake.modelTooltip')} side="top">
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => { setDeviceModel(e.target.value); clearError('deviceModel'); }}
                  placeholder={t('wo.intake.modelPlaceholder')}
                  required
                  className={`w-full rounded-md border ${formErrors.deviceModel ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
                />
              </HelpTooltip>
              {formErrors.deviceModel && <p className="text-sm text-destructive mt-1">{formErrors.deviceModel}</p>}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.serialNumber')}</label>
              <HelpTooltip content={t('wo.intake.serialTooltip')} side="top">
                <input
                  type="text"
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </HelpTooltip>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.color')}</label>
              <input
                type="text"
                value={deviceColor}
                onChange={(e) => setDeviceColor(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.os')}</label>
              <input
                type="text"
                value={deviceOs}
                onChange={(e) => setDeviceOs(e.target.value)}
                placeholder={t('wo.intake.osPlaceholder')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.devicePassword')}</label>
              <HelpTooltip content={t('wo.intake.devicePasswordTooltip')} side="top">
                <input
                  type="text"
                  value={devicePassword}
                  onChange={(e) => setDevicePassword(e.target.value)}
                  placeholder={t('wo.intake.devicePasswordPlaceholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </HelpTooltip>
              <p className="text-[10px] text-muted-foreground mt-1">{t('wo.intake.devicePasswordHint')}</p>
            </div>
          </div>
        </section>

        {/* ─── Section 3: Etat et accessoires ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">{t('wo.intake.sectionCondition')}</h2>

          {/* Condition checklist */}
          <div className="mb-4">
            <HelpTooltip content={t('wo.intake.visualInspectionTooltip')} side="right">
              <label className="block text-xs text-muted-foreground mb-2">{t('wo.intake.visualInspection')}</label>
            </HelpTooltip>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(conditionChecklist).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => handleChecklistToggle(key)}
                    className="rounded border-input"
                  />
                  <span className={!val ? 'text-red-600 font-medium' : ''}>{t(`wo.intake.checklist.${key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Condition notes */}
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.conditionNotes')}</label>
            <textarea
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              rows={2}
              placeholder={t('wo.intake.conditionNotesPlaceholder')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Accessories */}
          <div>
            <HelpTooltip content={t('wo.intake.accessoriesTooltip')} side="right">
              <label className="block text-xs text-muted-foreground mb-2">{t('wo.intake.accessories')}</label>
            </HelpTooltip>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_ACCESSORY_KEYS.map((accKey) => (
                <button
                  key={accKey}
                  type="button"
                  onClick={() => handleToggleAccessory(accKey)}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    accessories.includes(accKey)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:bg-muted'
                  }`}
                >
                  {t(`wo.intake.accessory.${accKey}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                placeholder={t('wo.intake.otherAccessory')}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCustomAccessory(); }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomAccessory}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
              >
                {t('wo.intake.addAccessory')}
              </button>
            </div>
            {accessories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {accessories.filter((a) => !(COMMON_ACCESSORY_KEYS as readonly string[]).includes(a)).map((a) => (
                  <span key={a} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {a}
                    <button type="button" onClick={() => handleToggleAccessory(a)} aria-label={t('wo.intake.removeAccessory', { accessory: a })} className="text-primary/50 hover:text-primary">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Section 4: Probleme ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">{t('wo.intake.sectionProblem')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.problemDesc')}</label>
              <HelpTooltip content={t('wo.intake.problemDescTooltip')} side="top">
                <textarea
                  value={reportedIssue}
                  onChange={(e) => { setReportedIssue(e.target.value); clearError('reportedIssue'); }}
                  rows={4}
                  required
                  placeholder={t('wo.intake.problemDescPlaceholder')}
                  className={`w-full rounded-md border ${formErrors.reportedIssue ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm resize-none`}
                />
              </HelpTooltip>
              {formErrors.reportedIssue && <p className="text-sm text-destructive mt-1">{formErrors.reportedIssue}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.serviceCategory')}</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(SERVICE_CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.priority')}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section 5: Consentement et sauvegarde ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">{t('wo.intake.sectionConsent')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.dataBackup')}</label>
              <HelpTooltip content={t('wo.intake.dataBackupTooltip')} side="right">
                <select
                  value={dataBackupConsent}
                  onChange={(e) => setDataBackupConsent(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(DATA_BACKUP_CONSENT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </HelpTooltip>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => { setTermsAccepted(e.target.checked); clearError('termsAccepted'); }}
                  className="rounded border-input"
                />
                {t('wo.intake.termsAccept')}
              </label>
              {formErrors.termsAccepted && <p className="text-sm text-destructive mt-1">{formErrors.termsAccepted}</p>}
            </div>
          </div>
        </section>

        {/* ─── Section 6: Finances et estimation ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">{t('wo.intake.sectionFinance')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.maxAuthorized')}</label>
              <HelpTooltip content={t('wo.intake.maxAuthorizedTooltip')} side="top">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maxAuthorizedSpend}
                  onChange={(e) => setMaxAuthorizedSpend(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </HelpTooltip>
              <p className="text-[10px] text-muted-foreground mt-1">{t('wo.intake.maxAuthorizedHint')}</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.deposit')}</label>
              <HelpTooltip content={t('wo.intake.depositTooltip')} side="top">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </HelpTooltip>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.diagnosticFee')}</label>
              <HelpTooltip content={t('wo.intake.diagnosticFeeTooltip')} side="top">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={diagnosticFee}
                  onChange={(e) => setDiagnosticFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </HelpTooltip>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.estimatedPickup')}</label>
              <input
                type="date"
                value={estimatedPickupDate}
                onChange={(e) => setEstimatedPickupDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.assignedTech')}</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('wo.intake.notAssigned')}</option>
                {(technicians as User[] | undefined)?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('wo.intake.warranty')}</label>
              <input
                type="number"
                min="0"
                max="365"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* ─── Submit ─── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/bons-travail`)}
            className="rounded-md border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            {t('wo.intake.cancel')}
          </button>
          <HelpTooltip content={t('wo.intake.submitTooltip')} side="top">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? t('wo.intake.creating') : t('wo.intake.submit')}
            </button>
          </HelpTooltip>
        </div>
      </form>
    </div>
  );
}
