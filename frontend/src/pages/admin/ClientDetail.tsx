import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type User,
  type Ticket,
  type WorkOrder,
  type CustomerNote,
  type KbArticleLink,
} from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { formatDateTime } from '../../lib/utils';

// ─── Constants ───

const TICKET_STATUS_COLORS: Record<string, string> = {
  NOUVELLE: 'bg-blue-100 text-blue-800',
  EN_COURS: 'bg-yellow-100 text-yellow-800',
  TERMINEE: 'bg-green-100 text-green-800',
  FERMEE: 'bg-gray-100 text-gray-800',
  ANNULEE: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  BASSE: 'bg-gray-100 text-gray-700',
  NORMALE: 'bg-blue-100 text-blue-700',
  HAUTE: 'bg-orange-100 text-orange-700',
  URGENTE: 'bg-red-100 text-red-700',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PARTICULIER: 'Résidentiel',
  ENTREPRISE: 'Commercial',
  RESIDENTIAL: 'Résidentiel',
  COMMERCIAL: 'Commercial',
};

// ─── Component ───

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  // ─── Local state ───
  const [noteForm, setNoteForm] = useState<{ content: string; isPinned: boolean }>({
    content: '',
    isPinned: false,
  });
  const [ticketPage, setTicketPage] = useState(1);
  const [notePage, setNotePage] = useState(1);
  const [linkArticleId, setLinkArticleId] = useState('');
  const [deleteNoteConfirmId, setDeleteNoteConfirmId] = useState<string | null>(null);
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null);

  // ─── Queries ───

  const {
    data: customer,
    isLoading: customerLoading,
    isError: customerError,
  } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api.admin.users.get(id!),
    enabled: !!id,
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', { customerId: id, page: ticketPage, limit: 20 }],
    queryFn: () => api.tickets.listPaginated({ customerId: id, page: ticketPage, limit: 20 }),
    enabled: !!id,
  });

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['customerNotes', { customerId: id, page: notePage, limit: 20 }],
    queryFn: () => api.customerNotes.list({ customerId: id!, page: notePage, limit: 20 }),
    enabled: !!id,
  });

  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['workorders', { customerId: id }],
    queryFn: () => api.workorders.list({ customerId: id, page: 1, limit: 100 }),
    enabled: !!id,
  });

  const { data: kbLinks, isLoading: kbLinksLoading } = useQuery({
    queryKey: ['kbLinks', 'CUSTOMER', id],
    queryFn: () => api.kb.links.forEntity('CUSTOMER', id!),
    enabled: !!id,
  });

  // ─── Mutations ───

  const createNoteMutation = useMutation({
    mutationFn: (data: { customerId: string; content: string; isPinned?: boolean }) =>
      api.customerNotes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes', { customerId: id }] });
      toast.success(t('clientDetail.noteCreated'));
      setNoteForm({ content: '', isPinned: false });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.customerNotes.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes', { customerId: id }] });
      toast.success(t('clientDetail.noteDeleted'));
      setDeleteNoteConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur');
      setDeleteNoteConfirmId(null);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (noteId: string) => api.customerNotes.togglePin(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerNotes', { customerId: id }] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur');
    },
  });

  const linkArticleMutation = useMutation({
    mutationFn: (articleId: string) =>
      api.kb.links.create({ articleId, entityType: 'CUSTOMER', entityId: id! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbLinks', 'CUSTOMER', id] });
      toast.success(t('clientDetail.linkSuccess'));
      setLinkArticleId('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur');
    },
  });

  const unlinkArticleMutation = useMutation({
    mutationFn: (linkId: string) => api.kb.links.delete(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbLinks', 'CUSTOMER', id] });
      toast.success(t('clientDetail.unlinkSuccess'));
      setUnlinkConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur');
      setUnlinkConfirmId(null);
    },
  });

  // ─── Handlers ───

  function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    createNoteMutation.mutate({
      customerId: id!,
      content: noteForm.content.trim(),
      isPinned: noteForm.isPinned,
    });
  }

  function handleLinkArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!linkArticleId.trim()) return;
    linkArticleMutation.mutate(linkArticleId.trim());
  }

  // ─── Derived data ───

  const tickets: Ticket[] = ticketsData?.data ?? [];
  const ticketTotalPages = ticketsData?.pagination?.totalPages ?? 1;
  const ticketTotal = ticketsData?.pagination?.total ?? 0;

  const notes: CustomerNote[] = notesData?.data ?? [];
  const noteTotalPages = notesData?.pagination?.totalPages ?? 1;
  const noteTotal = notesData?.pagination?.total ?? 0;

  const woList: WorkOrder[] = (workOrders as WorkOrder[]) ?? [];
  const linkList: KbArticleLink[] = kbLinks ?? [];

  // ─── Render: Loading / Error / Not Found ───

  if (customerLoading) {
    return <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>;
  }

  if (customerError || !customer) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {t('clientDetail.backToClients')}
        </Link>
        <div className="text-center py-8 text-muted-foreground">
          {t('clientDetail.notFound')}
        </div>
      </div>
    );
  }

  const user: User = customer as User;

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {t('clientDetail.backToClients')}
        </Link>
        <h1 className="text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            user.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {user.isActive ? t('clientDetail.active') : t('clientDetail.inactive')}
        </span>
      </div>

      {/* ─── Section 1: Customer Info Card ─── */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t('clientDetail.customerInfo')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">{t('clientDetail.email')}:</span>{' '}
            {user.email}
          </div>
          <div>
            <span className="text-muted-foreground">{t('clientDetail.phone')}:</span>{' '}
            {user.phone || '–'}
          </div>
          <div>
            <span className="text-muted-foreground">{t('clientDetail.type')}:</span>{' '}
            {user.customerType
              ? CUSTOMER_TYPE_LABELS[user.customerType] ?? user.customerType
              : '–'}
          </div>
          <div>
            <span className="text-muted-foreground">{t('clientDetail.company')}:</span>{' '}
            {user.companyName || '–'}
          </div>
          <div>
            <span className="text-muted-foreground">{t('clientDetail.address')}:</span>{' '}
            {user.address || '–'}
          </div>
          <div>
            <span className="text-muted-foreground">{t('clientDetail.memberSince')}:</span>{' '}
            {formatDateTime(user.createdAt)}
          </div>
        </div>
      </div>

      {/* ─── Section 2: Customer Notes ─── */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">{t('clientDetail.notes')}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              {noteTotal}
            </span>
          </div>
        </div>

        {/* Note creation form */}
        <form onSubmit={handleCreateNote} className="space-y-3 border rounded-md p-3 bg-muted/30">
          <textarea
            value={noteForm.content}
            onChange={(e) => setNoteForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder={t('clientDetail.notePlaceholder')}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={noteForm.isPinned}
                onChange={(e) =>
                  setNoteForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                }
                className="rounded border-input"
              />
              {t('clientDetail.pinNote')}
            </label>
            <button
              type="submit"
              disabled={createNoteMutation.isPending || !noteForm.content.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createNoteMutation.isPending ? '...' : t('clientDetail.newNote')}
            </button>
          </div>
        </form>

        {/* Notes list */}
        {notesLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('clientDetail.noNotes')}
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`border rounded-md p-3 space-y-2 ${
                  note.isPinned ? 'border-yellow-300 bg-yellow-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Pin toggle */}
                    <button
                      onClick={() => togglePinMutation.mutate(note.id)}
                      disabled={togglePinMutation.isPending}
                      title={t('clientDetail.pinNote')}
                      className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                        note.isPinned
                          ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      📌
                    </button>

                    {/* Delete */}
                    {deleteNoteConfirmId === note.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          {deleteNoteMutation.isPending ? '...' : t('common.confirm')}
                        </button>
                        <button
                          onClick={() => setDeleteNoteConfirmId(null)}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteNoteConfirmId(note.id)}
                        className="rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {note.author.firstName} {note.author.lastName}
                  </span>
                  <span>·</span>
                  <span>{formatDateTime(note.createdAt)}</span>
                  {note.isPinned && (
                    <>
                      <span>·</span>
                      <span className="text-yellow-700 font-medium">{t('clientDetail.pinNote')}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes pagination */}
        {!notesLoading && noteTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {t('common.pageOf', { page: notePage, total: noteTotalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setNotePage((p) => Math.max(1, p - 1))}
                disabled={notePage <= 1}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.previous_arrow')}
              </button>
              <button
                onClick={() => setNotePage((p) => p + 1)}
                disabled={notePage >= noteTotalPages}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.next_arrow')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 3: Ticket History ─── */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">{t('clientDetail.ticketHistory')}</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {ticketTotal}
          </span>
        </div>

        {ticketsLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('clientDetail.noTickets')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.ticketNumber')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.ticketTitle')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.ticketStatus')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.ticketPriority')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.ticketCreated')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((tk) => (
                  <tr
                    key={tk.id}
                    onClick={() => navigate(`/admin/billets/${tk.id}`)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-sm font-medium">{tk.ticketNumber}</td>
                    <td className="p-3 text-sm">{tk.title}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          TICKET_STATUS_COLORS[tk.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tk.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          PRIORITY_COLORS[tk.priority] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tk.priority}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(tk.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ticket pagination */}
        {!ticketsLoading && ticketTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {t('common.pageOf', { page: ticketPage, total: ticketTotalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
                disabled={ticketPage <= 1}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.previous_arrow')}
              </button>
              <button
                onClick={() => setTicketPage((p) => p + 1)}
                disabled={ticketPage >= ticketTotalPages}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.next_arrow')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 4: Work Order History ─── */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">{t('clientDetail.workOrderHistory')}</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {woList.length}
          </span>
        </div>

        {workOrdersLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : woList.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('clientDetail.noWorkOrders')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.orderNumber')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.device')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.woStatus')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.woPriority')}
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    {t('clientDetail.intakeDate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {woList.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => navigate(`/admin/bons-travail/${wo.id}`)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-sm font-medium">{wo.orderNumber}</td>
                    <td className="p-3 text-sm">
                      {wo.deviceBrand} {wo.deviceModel}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          TICKET_STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {wo.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          PRIORITY_COLORS[wo.priority] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {wo.priority}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(wo.intakeDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Section 5: Linked KB Articles ─── */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">{t('clientDetail.linkedArticles')}</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {linkList.length}
          </span>
        </div>

        {/* Link article form */}
        <form onSubmit={handleLinkArticle} className="flex items-center gap-2">
          <input
            type="text"
            value={linkArticleId}
            onChange={(e) => setLinkArticleId(e.target.value)}
            placeholder={t('clientDetail.articleIdPlaceholder')}
            className="flex-1 max-w-sm rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={linkArticleMutation.isPending || !linkArticleId.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {linkArticleMutation.isPending ? '...' : t('clientDetail.linkArticle')}
          </button>
        </form>

        {/* Linked articles list */}
        {kbLinksLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : linkList.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('clientDetail.noLinkedArticles')}
          </div>
        ) : (
          <div className="space-y-2">
            {linkList.map((lk) => (
              <div
                key={lk.id}
                className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    to={`/admin/base-connaissances/${lk.articleId}`}
                    className="text-sm font-medium text-primary hover:underline truncate"
                  >
                    {lk.article?.title || lk.articleId}
                  </Link>
                  {lk.article?.category && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground flex-shrink-0">
                      {lk.article.category}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0 ml-2">
                  {unlinkConfirmId === lk.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => unlinkArticleMutation.mutate(lk.id)}
                        disabled={unlinkArticleMutation.isPending}
                        className="rounded px-2 py-0.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        {unlinkArticleMutation.isPending ? '...' : t('common.confirm')}
                      </button>
                      <button
                        onClick={() => setUnlinkConfirmId(null)}
                        className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setUnlinkConfirmId(lk.id)}
                      className="rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
