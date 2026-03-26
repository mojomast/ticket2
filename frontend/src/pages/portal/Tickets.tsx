import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Ticket } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import {
  PRIORITY_LABELS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MODE_LABELS,
} from '../../lib/constants';

/** Shape of the "New Ticket" form data. */
interface CreateTicketForm {
  title: string;
  description: string;
  priority: string;
  serviceCategory: string;
  serviceMode: string;
}

const EMPTY_FORM: CreateTicketForm = {
  title: '',
  description: '',
  priority: 'NORMALE',
  serviceCategory: 'REPARATION',
  serviceMode: 'EN_CUBICULE',
};

export default function PortalTickets() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Ticket list query ───
  const { data, isLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => api.tickets.list(),
  });
  const tickets: Ticket[] = data ?? [];

  // ─── Create‑form visibility & field state ───
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTicketForm>(EMPTY_FORM);

  // ─── Create mutation ───
  const createMutation = useMutation({
    mutationFn: (payload: CreateTicketForm) => api.tickets.create(payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Billet créé avec succès');
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: () => {
      toast.error('Erreur lors de la création du billet');
    },
  });

  /** Update a single form field. */
  const updateField = (field: keyof CreateTicketForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes billets</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouveau billet'}
        </button>
      </div>

      {/* ─── Create ticket form ─── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">Nouveau billet</h2>

          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="ticket-title" className="text-sm font-medium">
              Titre
            </label>
            <input
              id="ticket-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Décrivez brièvement le problème"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="ticket-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="ticket-description"
              required
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Fournissez plus de détails sur votre demande…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          {/* Priority / Service Category / Service Mode — row of selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Priority */}
            <div className="space-y-1">
              <label htmlFor="ticket-priority" className="text-sm font-medium">
                Priorité
              </label>
              <select
                id="ticket-priority"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Category */}
            <div className="space-y-1">
              <label htmlFor="ticket-category" className="text-sm font-medium">
                Catégorie de service
              </label>
              <select
                id="ticket-category"
                value={form.serviceCategory}
                onChange={(e) => updateField('serviceCategory', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Mode */}
            <div className="space-y-1">
              <label htmlFor="ticket-mode" className="text-sm font-medium">
                Mode de service
              </label>
              <select
                id="ticket-mode"
                value={form.serviceMode}
                onChange={(e) => updateField('serviceMode', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(SERVICE_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Création…' : 'Créer le billet'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Ticket list ─── */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : (
        <div className="bg-card border rounded-lg divide-y">
          {tickets.map((t: Ticket) => (
            <Link
              key={t.id}
              to={`/portail/billets/${t.id}`}
              className="p-4 flex justify-between items-center hover:bg-muted/30 block"
            >
              <div>
                <span className="text-sm font-mono text-muted-foreground mr-2">
                  {t.ticketNumber}
                </span>
                <span className="text-sm font-medium">{t.title}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(t.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={t.status} />
                <StatusBadge status={t.priority} type="priority" />
              </div>
            </Link>
          ))}
          {tickets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Aucun billet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
