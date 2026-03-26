import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, type User } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { DEVICE_TYPE_LABELS, DATA_BACKUP_CONSENT_LABELS, SERVICE_CATEGORY_LABELS, PRIORITY_LABELS } from '../../lib/constants';

const DEFAULT_CHECKLIST: Record<string, boolean> = {
  'Ecran intact': true,
  'Clavier fonctionnel': true,
  'Batterie presente': true,
  'Chargeur inclus': true,
  'Chassis sans dommage': true,
  'Ports USB fonctionnels': true,
};

const COMMON_ACCESSORIES = [
  'Chargeur', 'Souris', 'Housse/Sac', 'Cable USB', 'Cle USB',
  'Ecouteurs', 'Disque externe', 'Clavier externe', 'Adaptateur',
];

export default function WorkOrderIntake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
  const [conditionChecklist, setConditionChecklist] = useState<Record<string, boolean>>({ ...DEFAULT_CHECKLIST });

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

  // ─── Technicians query ───
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: api.technicians.list,
  });

  // ─── Submit mutation ───
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.workorders.create(data),
    onSuccess: (wo) => {
      toast.success(`Bon de travail ${wo.orderNumber} cree`);
      navigate(`${basePath}/bons-travail/${wo.id}`);
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la creation'),
  });

  // ─── Handlers ───

  function handleSelectCustomer(c: User) {
    setSelectedCustomer(c);
    setCustomerName(`${c.firstName} ${c.lastName}`);
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setShowCustomerSearch(false);
    setCustomerSearch('');
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Le nom du client est requis');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Le téléphone est requis');
      return;
    }
    if (!deviceBrand.trim()) {
      toast.error('La marque de l\'appareil est requise');
      return;
    }
    if (!deviceModel.trim()) {
      toast.error('Le modèle de l\'appareil est requis');
      return;
    }
    if (!reportedIssue.trim()) {
      toast.error('La description du problème est requise');
      return;
    }
    if (!termsAccepted) {
      toast.error('Le client doit accepter les conditions avant de continuer');
      return;
    }

    const payload: Record<string, unknown> = {
      customerId: selectedCustomer.id,
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
        <h1 className="text-2xl font-bold">Nouvelle reception</h1>
        <p className="text-sm text-muted-foreground">Enregistrer un appareil pour reparation en atelier</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Section 1: Client ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">1. Client</h2>

          {showCustomerSearch ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rechercher un client existant</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Nom, courriel ou telephone..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Results */}
              {customerSearch.length >= 2 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {(customers as User[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">Aucun client trouve</p>
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
                  Changer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Nom complet *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Telephone *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Courriel</label>
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
          <h2 className="font-semibold mb-4">2. Appareil</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type d'appareil</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(DEVICE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Marque *</label>
              <input
                type="text"
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                placeholder="Ex: Dell, HP, Apple..."
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Modele *</label>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="Ex: Latitude 5540, MacBook Pro..."
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">No. de serie</label>
              <input
                type="text"
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Couleur</label>
              <input
                type="text"
                value={deviceColor}
                onChange={(e) => setDeviceColor(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Systeme d'exploitation</label>
              <input
                type="text"
                value={deviceOs}
                onChange={(e) => setDeviceOs(e.target.value)}
                placeholder="Ex: Windows 11, macOS Sonoma..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-muted-foreground mb-1">Mot de passe appareil</label>
              <input
                type="text"
                value={devicePassword}
                onChange={(e) => setDevicePassword(e.target.value)}
                placeholder="PIN, mot de passe, pattern..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Necessaire pour le diagnostic</p>
            </div>
          </div>
        </section>

        {/* ─── Section 3: Etat et accessoires ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">3. Etat et accessoires</h2>

          {/* Condition checklist */}
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-2">Inspection visuelle</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(conditionChecklist).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => handleChecklistToggle(key)}
                    className="rounded border-input"
                  />
                  <span className={!val ? 'text-red-600 font-medium' : ''}>{key}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Condition notes */}
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Notes sur l'etat (egratignures, dommages, etc.)</label>
            <textarea
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              rows={2}
              placeholder="Decrire l'etat visible..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Accessories */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Accessoires laisses</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_ACCESSORIES.map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => handleToggleAccessory(acc)}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    accessories.includes(acc)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:bg-muted'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                placeholder="Autre accessoire..."
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
                Ajouter
              </button>
            </div>
            {accessories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {accessories.filter((a) => !COMMON_ACCESSORIES.includes(a)).map((a) => (
                  <span key={a} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {a}
                    <button type="button" onClick={() => handleToggleAccessory(a)} className="text-primary/50 hover:text-primary">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Section 4: Probleme ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">4. Probleme rapporte</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description du probleme *</label>
              <textarea
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                rows={4}
                required
                placeholder="Decrire le probleme tel que rapporte par le client..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Categorie de service</label>
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
                <label className="block text-xs text-muted-foreground mb-1">Priorite</label>
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
          <h2 className="font-semibold mb-4">5. Consentement</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Sauvegarde des donnees</label>
              <select
                value={dataBackupConsent}
                onChange={(e) => setDataBackupConsent(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(DATA_BACKUP_CONSENT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="rounded border-input"
              />
              Le client accepte les conditions de service et la politique de responsabilite
            </label>
          </div>
        </section>

        {/* ─── Section 6: Finances et estimation ─── */}
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold mb-4">6. Finances et estimation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Montant maximum autorise ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxAuthorizedSpend}
                onChange={(e) => setMaxAuthorizedSpend(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Montant maximum que le client autorise sans rapprobation</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Depot ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Frais de diagnostic ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={diagnosticFee}
                onChange={(e) => setDiagnosticFee(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date de ramassage estimee</label>
              <input
                type="date"
                value={estimatedPickupDate}
                onChange={(e) => setEstimatedPickupDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Technicien assigne</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Non assigne</option>
                {(technicians as User[] | undefined)?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Garantie (jours)</label>
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
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creation...' : 'Creer le bon de travail'}
          </button>
        </div>
      </form>
    </div>
  );
}
