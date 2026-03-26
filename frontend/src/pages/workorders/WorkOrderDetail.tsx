import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type WorkOrder, type WorkOrderNote, type User } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime, formatCurrency, cn } from '../../lib/utils';
import {
  WO_STATUS_LABELS, WO_STATUS_COLORS,
  DEVICE_TYPE_LABELS, DATA_BACKUP_CONSENT_LABELS,
  SERVICE_CATEGORY_LABELS, PRIORITY_LABELS,
  WO_TERMINAL_STATUSES,
} from '../../lib/constants';

// ─── State Machine (mirrors backend WO_ALLOWED_TRANSITIONS) ───

const WO_TRANSITIONS: Record<string, Array<{ to: string; roles: string[] }>> = {
  RECEPTION: [
    { to: 'DIAGNOSTIC', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  DIAGNOSTIC: [
    { to: 'ATTENTE_APPROBATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'APPROUVE', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  ATTENTE_APPROBATION: [
    { to: 'APPROUVE', roles: ['ADMIN', 'CUSTOMER'] },
    { to: 'REFUSE', roles: ['ADMIN', 'CUSTOMER'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  APPROUVE: [
    { to: 'ATTENTE_PIECES', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  ATTENTE_PIECES: [
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  EN_REPARATION: [
    { to: 'ATTENTE_PIECES', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'VERIFICATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'PRET', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  VERIFICATION: [
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'PRET', roles: ['ADMIN', 'TECHNICIAN'] },
  ],
  PRET: [
    { to: 'REMIS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ABANDONNE', roles: ['ADMIN'] },
  ],
  REMIS: [],
  REFUSE: [],
  ABANDONNE: [],
  ANNULE: [],
};

// ─── Main Component ───

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const basePath = user?.role === 'ADMIN' ? '/admin' : '/technicien';
  const isAdmin = user?.role === 'ADMIN';

  // ─── Form state ───
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteEstimatedCost, setQuoteEstimatedCost] = useState('');
  const [quoteDiagnosticNotes, setQuoteDiagnosticNotes] = useState('');
  const [quotePickupDate, setQuotePickupDate] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [showStatusReason, setShowStatusReason] = useState<string | null>(null);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteIsInternal, setNoteIsInternal] = useState(false);

  // Edit mode
  const [editSection, setEditSection] = useState<string | null>(null);
  const [editDiagNotes, setEditDiagNotes] = useState('');
  const [editRepairNotes, setEditRepairNotes] = useState('');

  // Parts
  const [showPartForm, setShowPartForm] = useState(false);
  const [partName, setPartName] = useState('');
  const [partCost, setPartCost] = useState('');
  const [partType, setPartType] = useState('OEM');

  // Finance edit
  const [editFinalCost, setEditFinalCost] = useState('');

  // ─── Queries ───

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['workorder', id],
    queryFn: () => api.workorders.get(id!),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['workorder-notes', id],
    queryFn: () => api.workorders.notes.list(id!),
    enabled: !!id,
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: api.technicians.list,
  });

  // ─── Mutations ───

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      api.workorders.changeStatus(id!, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder', id] });
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['workorders-stats'] });
      toast.success('Statut mis à jour');
      setShowStatusReason(null);
      setStatusReason('');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  const quoteMutation = useMutation({
    mutationFn: (data: { estimatedCost: number; diagnosticNotes: string; estimatedPickupDate?: string }) =>
      api.workorders.sendQuote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder', id] });
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['workorders-stats'] });
      toast.success('Devis envoyé au client');
      setShowQuoteForm(false);
      setQuoteEstimatedCost('');
      setQuoteDiagnosticNotes('');
      setQuotePickupDate('');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.workorders.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder', id] });
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      toast.success('Bon de travail mis à jour');
      setEditSection(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; isInternal?: boolean }) =>
      api.workorders.notes.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      toast.success('Note ajoutée');
      setNoteContent('');
      setNoteIsInternal(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.workorders.delete(id!),
    onSuccess: () => {
      toast.success('Bon de travail supprimé');
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['workorders-stats'] });
      navigate(`${basePath}/bons-travail`);
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  // ─── Handlers ───

  function handleStatusChange(newStatus: string) {
    // For ANNULE or ABANDONNE, ask for a reason
    if (newStatus === 'ANNULE' || newStatus === 'ABANDONNE') {
      setShowStatusReason(newStatus);
      return;
    }
    // For terminal transitions (REMIS), confirm first
    if (newStatus === 'REMIS') {
      if (!confirm('Confirmer la remise de l\'appareil au client? Cette action est définitive.')) return;
    }
    statusMutation.mutate({ status: newStatus });
  }

  function handleStatusWithReason(e: React.FormEvent) {
    e.preventDefault();
    if (!showStatusReason) return;
    statusMutation.mutate({ status: showStatusReason, reason: statusReason.trim() || undefined });
  }

  function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cost = parseFloat(quoteEstimatedCost);
    if (isNaN(cost) || cost <= 0) {
      toast.error('Le cout estime doit etre un nombre positif');
      return;
    }
    if (!quoteDiagnosticNotes.trim()) {
      toast.error('Les notes de diagnostic sont requises');
      return;
    }
    quoteMutation.mutate({
      estimatedCost: cost,
      diagnosticNotes: quoteDiagnosticNotes.trim(),
      estimatedPickupDate: quotePickupDate ? new Date(quotePickupDate).toISOString() : undefined,
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast.error('Le contenu de la note est requis');
      return;
    }
    addNoteMutation.mutate({ content: noteContent.trim(), isInternal: noteIsInternal });
  }

  function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    const cost = parseFloat(partCost);
    if (!partName.trim() || isNaN(cost)) {
      toast.error('Nom et cout requis');
      return;
    }
    const currentParts = (wo.partsUsed as Array<{ name: string; cost: number; type?: string }>) || [];
    const newParts = [...currentParts, { name: partName.trim(), cost, type: partType }];
    updateMutation.mutate({ partsUsed: newParts });
    setPartName('');
    setPartCost('');
    setShowPartForm(false);
  }

  function handleRemovePart(index: number) {
    const currentParts = [...((wo.partsUsed as Array<{ name: string; cost: number; type?: string }>) || [])];
    currentParts.splice(index, 1);
    updateMutation.mutate({ partsUsed: currentParts });
  }

  // ─── Render ───

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;
  if (!workOrder) return <div className="text-center py-8">Bon de travail introuvable</div>;

  const wo: WorkOrder = workOrder;
  const isTerminal = (WO_TERMINAL_STATUSES as readonly string[]).includes(wo.status);

  // Get allowed transitions for the user's role
  const transitions = (WO_TRANSITIONS[wo.status] || [])
    .filter((t) => t.roles.includes(user?.role || ''))
    .map((t) => t.to);

  // Quote can be sent from DIAGNOSTIC status
  const canSendQuote = wo.status === 'DIAGNOSTIC' && (isAdmin || user?.role === 'TECHNICIAN');

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          to={`${basePath}/bons-travail`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Retour
        </Link>
        <h1 className="text-2xl font-bold font-mono">{wo.orderNumber}</h1>
        <StatusBadge status={wo.status} type="workorder" />
        <StatusBadge status={wo.priority} type="priority" />
        {isTerminal && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Terminal</span>
        )}
      </div>

      {/* ─── 3-Column Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Content (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Device Info */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Appareil</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Type" value={DEVICE_TYPE_LABELS[wo.deviceType] || wo.deviceType} />
              <InfoField label="Marque" value={wo.deviceBrand} />
              <InfoField label="Modele" value={wo.deviceModel} />
              {wo.deviceSerial && <InfoField label="No. serie" value={wo.deviceSerial} />}
              {wo.deviceColor && <InfoField label="Couleur" value={wo.deviceColor} />}
              {wo.deviceOs && <InfoField label="Systeme" value={wo.deviceOs} />}
              {wo.devicePassword && (
                <InfoField label="Mot de passe" value={wo.devicePassword} sensitive />
              )}
            </div>
          </div>

          {/* Reported Issue */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Probleme rapporte</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{wo.reportedIssue}</p>
            {wo.serviceCategory && (
              <p className="text-xs text-muted-foreground mt-2">
                Categorie: {SERVICE_CATEGORY_LABELS[wo.serviceCategory] || wo.serviceCategory}
              </p>
            )}
          </div>

          {/* Condition & Accessories */}
          {(wo.conditionNotes || (wo.accessories && wo.accessories.length > 0) || wo.conditionChecklist) && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-3">Etat et accessoires</h3>
              {wo.conditionNotes && (
                <div className="mb-3">
                  <span className="text-xs text-muted-foreground font-medium">Notes sur l'etat:</span>
                  <p className="text-sm mt-1">{wo.conditionNotes}</p>
                </div>
              )}
              {wo.accessories && wo.accessories.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-muted-foreground font-medium">Accessoires:</span>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {wo.accessories.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {wo.conditionChecklist && Object.keys(wo.conditionChecklist).length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Checklist:</span>
                  <div className="grid grid-cols-2 gap-1 mt-1 text-sm">
                    {Object.entries(wo.conditionChecklist).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={val ? 'text-green-600' : 'text-red-500'}>{val ? '✓' : '✗'}</span>
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quote Info (if exists) */}
          {wo.estimatedCost && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-3">Devis</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <InfoField label="Cout estime" value={formatCurrency(wo.estimatedCost)} />
                {wo.finalCost != null && <InfoField label="Cout final" value={formatCurrency(wo.finalCost)} />}
                {wo.depositAmount != null && <InfoField label="Depot" value={formatCurrency(wo.depositAmount)} />}
                {wo.diagnosticFee != null && <InfoField label="Frais diagnostic" value={formatCurrency(wo.diagnosticFee)} />}
                {wo.maxAuthorizedSpend != null && <InfoField label="Max autorise" value={formatCurrency(wo.maxAuthorizedSpend)} />}
              </div>
              {wo.diagnosticNotes && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground font-medium">Notes de diagnostic:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{wo.diagnosticNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Diagnostic Notes (editable) */}
          {!isTerminal && (
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Notes techniques</h3>
                {editSection !== 'notes' && (
                  <button
                    onClick={() => {
                      setEditSection('notes');
                      setEditDiagNotes(wo.diagnosticNotes || '');
                      setEditRepairNotes(wo.repairNotes || '');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Modifier
                  </button>
                )}
              </div>

              {editSection === 'notes' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Notes de diagnostic</label>
                    <textarea
                      value={editDiagNotes}
                      onChange={(e) => setEditDiagNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Notes de reparation</label>
                    <textarea
                      value={editRepairNotes}
                      onChange={(e) => setEditRepairNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate({
                        diagnosticNotes: editDiagNotes,
                        repairNotes: editRepairNotes,
                      })}
                      disabled={updateMutation.isPending}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                    <button
                      onClick={() => setEditSection(null)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {wo.diagnosticNotes ? (
                    <div>
                      <span className="text-xs text-muted-foreground font-medium">Diagnostic:</span>
                      <p className="mt-1 whitespace-pre-wrap">{wo.diagnosticNotes}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-xs">Aucune note de diagnostic</p>
                  )}
                  {wo.repairNotes && (
                    <div>
                      <span className="text-xs text-muted-foreground font-medium">Reparation:</span>
                      <p className="mt-1 whitespace-pre-wrap">{wo.repairNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parts Used */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Pieces utilisees</h3>
              {!isTerminal && !showPartForm && (
                <button
                  onClick={() => setShowPartForm(true)}
                  className="text-xs text-primary hover:underline"
                >
                  + Ajouter
                </button>
              )}
            </div>

            {wo.partsUsed && wo.partsUsed.length > 0 ? (
              <div className="space-y-2">
                {wo.partsUsed.map((part, i) => (
                  <div key={i} className="flex items-center justify-between border rounded-md p-2 text-sm">
                    <div>
                      <span className="font-medium">{part.name}</span>
                      {part.type && (
                        <span className="ml-2 text-xs text-muted-foreground">({part.type})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{formatCurrency(part.cost)}</span>
                      {!isTerminal && (
                        <button
                          onClick={() => handleRemovePart(i)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-sm text-right font-medium pt-2 border-t">
                  Total: {formatCurrency(wo.partsUsed.reduce((sum, p) => sum + p.cost, 0))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune piece enregistree</p>
            )}

            {showPartForm && (
              <form onSubmit={handleAddPart} className="mt-3 border rounded-md p-3 bg-muted/30 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nom</label>
                    <input
                      type="text"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      required
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Cout ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={partCost}
                      onChange={(e) => setPartCost(e.target.value)}
                      required
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Type</label>
                    <select
                      value={partType}
                      onChange={(e) => setPartType(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      <option value="OEM">OEM</option>
                      <option value="AFTERMARKET">Apres-marche</option>
                      <option value="REFURBISHED">Reconditionne</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPartForm(false); setPartName(''); setPartCost(''); }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Notes Thread */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Notes</h3>

            {/* Notes list */}
            <div className="space-y-3 mb-4">
              {(notes as WorkOrderNote[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune note</p>
              ) : (
                (notes as WorkOrderNote[]).map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      'border rounded-md p-3',
                      note.isInternal ? 'bg-amber-50/50 border-amber-200' : ''
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {note.author.firstName} {note.author.lastName}
                        {note.isInternal && (
                          <span className="ml-2 text-amber-700 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">Interne</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add note form */}
            {!isTerminal && (
              <form onSubmit={handleAddNote} className="space-y-2 border-t pt-3">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Ajouter une note..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={noteIsInternal}
                      onChange={(e) => setNoteIsInternal(e.target.checked)}
                      className="rounded border-input"
                    />
                    Note interne (non visible par le client)
                  </label>
                  <button
                    type="submit"
                    disabled={addNoteMutation.isPending || !noteContent.trim()}
                    className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {addNoteMutation.isPending ? 'Envoi...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ─── Sidebar (1 col) ─── */}
        <div className="space-y-4">

          {/* Customer card */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Client</h3>
            <p className="text-sm font-medium">{wo.customerName}</p>
            <p className="text-xs text-muted-foreground">{wo.customerPhone}</p>
            {wo.customerEmail && (
              <p className="text-xs text-muted-foreground">{wo.customerEmail}</p>
            )}
            {wo.customer && (
              <p className="text-xs text-muted-foreground">
                {wo.customer.firstName} {wo.customer.lastName}
              </p>
            )}
          </div>

          {/* Details card */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Details</h3>
            <div className="text-sm space-y-1.5">
              <div>
                <span className="text-muted-foreground">Priorite:</span>{' '}
                {PRIORITY_LABELS[wo.priority] || wo.priority}
              </div>
              <div>
                <span className="text-muted-foreground">Sauvegarde:</span>{' '}
                {DATA_BACKUP_CONSENT_LABELS[wo.dataBackupConsent] || wo.dataBackupConsent}
              </div>
              <div>
                <span className="text-muted-foreground">Reception:</span>{' '}
                {formatDateTime(wo.intakeDate)}
              </div>
              {wo.estimatedPickupDate && (
                <div>
                  <span className="text-muted-foreground">Ramassage prevu:</span>{' '}
                  {new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA')}
                </div>
              )}
              {wo.completedDate && (
                <div>
                  <span className="text-muted-foreground">Complete:</span>{' '}
                  {formatDateTime(wo.completedDate)}
                </div>
              )}
              {wo.pickupDate && (
                <div>
                  <span className="text-muted-foreground">Remis:</span>{' '}
                  {formatDateTime(wo.pickupDate)}
                </div>
              )}
              {wo.warrantyDays != null && wo.warrantyDays > 0 && (
                <div>
                  <span className="text-muted-foreground">Garantie:</span>{' '}
                  {wo.warrantyDays} jours
                  {wo.warrantyStartDate && (
                    <span className="text-xs"> (depuis {new Date(wo.warrantyStartDate).toLocaleDateString('fr-CA')})</span>
                  )}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Pris par:</span>{' '}
                {wo.intakeBy?.firstName} {wo.intakeBy?.lastName}
              </div>
              <div>
                <span className="text-muted-foreground">Cree:</span>{' '}
                {formatDateTime(wo.createdAt)}
              </div>
              <div>
                <span className="text-muted-foreground">Modifie:</span>{' '}
                {formatDateTime(wo.updatedAt)}
              </div>
            </div>
          </div>

          {/* Technician card */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Technicien</h3>
            {wo.technician ? (
              <p className="text-sm">{wo.technician.firstName} {wo.technician.lastName}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Non assigne</p>
            )}
            {!isTerminal && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    updateMutation.mutate({ technicianId: e.target.value });
                  }
                }}
                disabled={updateMutation.isPending}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
              >
                <option value="">
                  {wo.technician ? 'Reassigner...' : 'Assigner...'}
                </option>
                {(technicians as User[] | undefined)?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status Change */}
          {transitions.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Changer le statut</h3>

              {showStatusReason ? (
                <form onSubmit={handleStatusWithReason} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Raison pour {WO_STATUS_LABELS[showStatusReason]}:
                  </p>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Raison (optionnel)..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={statusMutation.isPending}
                      className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {statusMutation.isPending ? '...' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowStatusReason(null); setStatusReason(''); }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-1.5">
                  {transitions.map((status) => {
                    const colors = WO_STATUS_COLORS[status];
                    const isDestructive = ['ANNULE', 'ABANDONNE', 'REFUSE'].includes(status);
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={statusMutation.isPending}
                        className={cn(
                          'w-full rounded-md px-3 py-1.5 text-xs font-medium text-left disabled:opacity-50 transition-colors',
                          isDestructive
                            ? 'border border-red-300 bg-background text-red-700 hover:bg-red-50'
                            : `${colors?.bg || 'bg-muted'} ${colors?.text || 'text-foreground'} hover:opacity-80`
                        )}
                      >
                        &rarr; {WO_STATUS_LABELS[status] || status}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Send Quote (from DIAGNOSTIC) */}
          {canSendQuote && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Envoyer un devis</h3>
                {!showQuoteForm && (
                  <button
                    onClick={() => setShowQuoteForm(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Creer
                  </button>
                )}
              </div>

              {showQuoteForm && (
                <form onSubmit={handleQuoteSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Cout estime ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quoteEstimatedCost}
                      onChange={(e) => setQuoteEstimatedCost(e.target.value)}
                      required
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Notes de diagnostic</label>
                    <textarea
                      value={quoteDiagnosticNotes}
                      onChange={(e) => setQuoteDiagnosticNotes(e.target.value)}
                      required
                      rows={3}
                      placeholder="Description du probleme trouve et travaux proposes..."
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Date ramassage estimee</label>
                    <input
                      type="date"
                      value={quotePickupDate}
                      onChange={(e) => setQuotePickupDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={quoteMutation.isPending}
                      className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {quoteMutation.isPending ? 'Envoi...' : 'Envoyer le devis'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowQuoteForm(false); setQuoteEstimatedCost(''); setQuoteDiagnosticNotes(''); setQuotePickupDate(''); }}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Financial summary */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Finances</h3>
            <div className="text-sm space-y-1.5">
              <FinanceRow label="Devis" value={wo.estimatedCost} />
              <FinanceRow label="Cout final" value={wo.finalCost} />
              <FinanceRow label="Max autorise" value={wo.maxAuthorizedSpend} />
              <FinanceRow label="Depot" value={wo.depositAmount} />
              <FinanceRow label="Frais diag." value={wo.diagnosticFee} />
              {wo.partsUsed && wo.partsUsed.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pieces ({wo.partsUsed.length})</span>
                  <span>{formatCurrency(wo.partsUsed.reduce((s, p) => s + p.cost, 0))}</span>
                </div>
              )}
            </div>

            {/* Editable final cost (only visible for non-terminal + admin/tech) */}
            {!isTerminal && editSection !== 'finance' && (
              <button
                onClick={() => {
                  setEditSection('finance');
                  setEditFinalCost(wo.finalCost != null ? String(wo.finalCost) : '');
                }}
                className="text-xs text-primary hover:underline mt-2"
              >
                Modifier les coûts
              </button>
            )}
            {editSection === 'finance' && (
              <div className="space-y-2 mt-2 border-t pt-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Coût final ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFinalCost}
                    onChange={(e) => setEditFinalCost(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const val = parseFloat(editFinalCost);
                      updateMutation.mutate({ finalCost: isNaN(val) ? null : val });
                    }}
                    disabled={updateMutation.isPending}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => setEditSection(null)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete (admin only, terminal statuses only) */}
          {isAdmin && isTerminal && (
            <div className="bg-card border rounded-lg p-4">
              <button
                onClick={() => {
                  if (confirm('Supprimer définitivement ce bon de travail?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="w-full rounded-md border border-red-300 bg-background px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer le bon de travail'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ───

function InfoField({ label, value, sensitive }: { label: string; value: string; sensitive?: boolean }) {
  const [revealed, setRevealed] = useState(!sensitive);

  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">
        {sensitive && !revealed ? (
          <button onClick={() => setRevealed(true)} className="text-primary text-xs hover:underline">
            Afficher
          </button>
        ) : (
          value || '—'
        )}
      </p>
    </div>
  );
}

function FinanceRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value != null ? formatCurrency(value) : '—'}</span>
    </div>
  );
}
