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
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

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

const PAGE_LIMIT = 25;

export default function PortalTickets() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Pagination state ───
  const [page, setPage] = useState(1);

  // ─── Ticket list query (paginated) ───
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { page, limit: PAGE_LIMIT }],
    queryFn: () => api.tickets.listPaginated({ page, limit: PAGE_LIMIT }),
  });
  const tickets: Ticket[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // ─── Create‑form visibility & field state ───
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTicketForm>(EMPTY_FORM);

  // ─── Create mutation ───
  const createMutation = useMutation({
    mutationFn: (payload: CreateTicketForm) => api.tickets.create(payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success(t('ticket.createdSuccess'));
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: () => {
      toast.error(t('ticket.createError'));
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
        <h1 className="text-2xl font-bold">{t('portal.tickets.title')}</h1>
        <HelpTooltip content={t('portal.tickets.newTooltip')} side="left">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            {showForm ? t('common.cancel') : t('ticket.newButton')}
          </button>
        </HelpTooltip>
      </div>

      {/* ─── Create ticket form ─── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">{t('ticket.new')}</h2>

          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="ticket-title" className="text-sm font-medium">
              {t('ticket.title')}
            </label>
            <input
              id="ticket-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('ticket.titlePlaceholder')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="ticket-description" className="text-sm font-medium">
              {t('ticket.description')}
            </label>
            <textarea
              id="ticket-description"
              required
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t('ticket.descriptionPlaceholderPortal')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          {/* Priority / Service Category / Service Mode — row of selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Priority */}
            <div className="space-y-1">
              <label htmlFor="ticket-priority" className="text-sm font-medium">
                {t('ticket.priority')}
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
                {t('portal.tickets.serviceCategory')}
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
                {t('ticket.serviceMode')}
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
            <HelpTooltip content={t('portal.tickets.submitTooltip')} side="left">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? t('ticket.creating') : t('ticket.createButton')}
              </button>
            </HelpTooltip>
          </div>
        </form>
      )}

      {/* ─── Ticket list ─── */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : (
        <div className="bg-card border rounded-lg divide-y">
          {tickets.map((tk: Ticket) => (
            <Link
              key={tk.id}
              to={`/portail/billets/${tk.id}`}
              className="p-4 flex justify-between items-center hover:bg-muted/30 block"
            >
              <div>
                <span className="text-sm font-mono text-muted-foreground mr-2">
                  {tk.ticketNumber}
                </span>
                <span className="text-sm font-medium">{tk.title}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(tk.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <HelpTooltip content={t('portal.tickets.statusTooltip')} side="left">
                  <span><StatusBadge status={tk.status} /></span>
                </HelpTooltip>
                <HelpTooltip content={t('portal.tickets.priorityTooltip')} side="left">
                  <span><StatusBadge status={tk.priority} type="priority" /></span>
                </HelpTooltip>
              </div>
            </Link>
          ))}
          {tickets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {t('ticket.noTickets')}
            </div>
          )}
        </div>
      )}

      {/* ─── Pagination controls ─── */}
      {!isLoading && totalPages > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {t('common.pageOf', { page: String(page), total: String(totalPages) })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.previous_arrow')}
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next_arrow')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
