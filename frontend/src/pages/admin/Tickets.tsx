import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

/** Shape of the admin "New Ticket" form data. */
interface CreateTicketForm {
  title: string;
  description: string;
  priority: string;
  serviceCategory: string;
  serviceMode: string;
  customerId: string;
}

// ─── Label key arrays (values from i18n catalogs) ───
const STATUS_KEYS = [
  'NOUVELLE', 'EN_ATTENTE_APPROBATION', 'EN_ATTENTE_REPONSE_CLIENT', 'APPROUVEE',
  'PLANIFIEE', 'EN_COURS', 'BLOCAGE', 'TERMINEE', 'FERMEE', 'ANNULEE',
] as const;
const PRIORITY_KEYS = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as const;
const SERVICE_CATEGORY_KEYS = [
  'REPARATION', 'LOGICIEL', 'RESEAU', 'DONNEES', 'INSTALLATION',
  'MAINTENANCE', 'CONSULTATION', 'FORMATION', 'AUTRE',
] as const;
const SERVICE_MODE_KEYS = ['SUR_ROUTE', 'EN_CUBICULE'] as const;

const EMPTY_FORM: CreateTicketForm = {
  title: '',
  description: '',
  priority: 'NORMALE',
  serviceCategory: 'REPARATION',
  serviceMode: 'EN_CUBICULE',
  customerId: '',
};

const PAGE_LIMIT = 25;

export default function AdminTickets() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTicketForm>(EMPTY_FORM);

  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { ...filters, search, page, limit: PAGE_LIMIT }],
    queryFn: () => api.tickets.listPaginated({ ...filters, search, page, limit: PAGE_LIMIT }),
  });

  const tickets = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Fetch customers for the create-ticket dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: () => api.admin.users.list({ role: 'CUSTOMER' }),
    enabled: showForm,
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateTicketForm) =>
      api.tickets.create(payload as unknown as Record<string, unknown>),
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

  const updateField = (field: keyof CreateTicketForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) {
      toast.error(t('ticket.selectClientError'));
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('ticket.list')}</h1>
        <HelpTooltip content={t('admin.tickets.newTooltip')} side="left">
          <Button
            type="button"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? t('common.cancel') : t('ticket.newButton')}
          </Button>
        </HelpTooltip>
      </div>

      {/* ─── Create ticket form ─── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">{t('ticket.new')}</h2>

          {/* Customer select */}
          <div className="space-y-1">
            <Label htmlFor="admin-ticket-customer">
              {t('ticket.customer')}
            </Label>
            <select
              id="admin-ticket-customer"
              value={form.customerId}
              onChange={(e) => updateField('customerId', e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">{t('ticket.selectClient')}</option>
              {(customers as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="admin-ticket-title">
              {t('ticket.title')}
            </Label>
            <Input
              id="admin-ticket-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('ticket.titlePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="admin-ticket-description">
              {t('ticket.description')}
            </Label>
            <Textarea
              id="admin-ticket-description"
              required
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t('ticket.descriptionPlaceholder')}
              className="resize-y"
            />
          </div>

          {/* Priority / Category / Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="admin-ticket-priority">
                {t('ticket.priority')}
              </Label>
              <select
                id="admin-ticket-priority"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {PRIORITY_KEYS.map((key) => (
                  <option key={key} value={key}>{t(`label.priority.${key}`)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="admin-ticket-category">
                {t('ticket.category')}
              </Label>
              <select
                id="admin-ticket-category"
                value={form.serviceCategory}
                onChange={(e) => updateField('serviceCategory', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {SERVICE_CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>{t(`label.serviceCategory.${key}`)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="admin-ticket-mode">
                {t('ticket.mode')}
              </Label>
              <select
                id="admin-ticket-mode"
                value={form.serviceMode}
                onChange={(e) => updateField('serviceMode', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {SERVICE_MODE_KEYS.map((key) => (
                  <option key={key} value={key}>{t(`label.serviceMode.${key}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <HelpTooltip content={t('admin.tickets.createTooltip')} side="left">
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? t('ticket.creating') : t('ticket.createButton')}
              </Button>
            </HelpTooltip>
          </div>
        </form>
      )}

      <div className="flex gap-4">
        <HelpTooltip content={t('admin.tickets.searchTooltip')} side="bottom">
          <Input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 max-w-sm"
          />
        </HelpTooltip>
        <HelpTooltip content={t('admin.tickets.filterStatusTooltip')} side="bottom">
          <select
            onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('ticket.allStatuses')}</option>
            {STATUS_KEYS.map((key) => (
              <option key={key} value={key}>{t(`label.status.${key}`)}</option>
            ))}
          </select>
        </HelpTooltip>
        <HelpTooltip content={t('admin.tickets.filterPriorityTooltip')} side="bottom">
          <select
            onChange={(e) => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('ticket.allPriorities')}</option>
            {PRIORITY_KEYS.map((key) => (
              <option key={key} value={key}>{t(`label.priority.${key}`)}</option>
            ))}
          </select>
        </HelpTooltip>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">#</th>
                <th className="text-left p-3 text-sm font-medium">{t('ticket.title')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('ticket.customer')}</th>
                <HelpTooltip content={t('admin.tickets.technicianTooltip')} side="bottom">
                  <th className="text-left p-3 text-sm font-medium">{t('ticket.technician')}</th>
                </HelpTooltip>
                <HelpTooltip content={t('admin.tickets.statusTooltip')} side="bottom">
                  <th className="text-left p-3 text-sm font-medium">{t('ticket.status')}</th>
                </HelpTooltip>
                <HelpTooltip content={t('admin.tickets.priorityTooltip')} side="bottom">
                  <th className="text-left p-3 text-sm font-medium">{t('ticket.priority')}</th>
                </HelpTooltip>
                <th className="text-left p-3 text-sm font-medium">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((ticket: any) => (
                <tr key={ticket.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <Link to={`/admin/billets/${ticket.id}`} className="text-sm font-mono text-primary hover:underline">
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="p-3 text-sm">{ticket.title}</td>
                  <td className="p-3 text-sm">
                    {ticket.customer?.firstName} {ticket.customer?.lastName}
                  </td>
                  <td className="p-3 text-sm">
                    {ticket.technician ? `${ticket.technician.firstName} ${ticket.technician.lastName}` : '-'}
                  </td>
                  <td className="p-3"><StatusBadge status={ticket.status} /></td>
                  <td className="p-3"><StatusBadge status={ticket.priority} type="priority" /></td>
                  <td className="p-3 text-sm text-muted-foreground">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">{t('ticket.noTickets')}</div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t('common.previous_arrow')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              {t('common.next_arrow')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
