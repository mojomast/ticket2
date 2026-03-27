import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type User } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

// ─── Constants ───

const PAGE_LIMIT = 25;

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PARTICULIER: 'Particulier',
  ENTREPRISE: 'Entreprise',
};

const CUSTOMER_TYPE_OPTIONS = Object.entries(CUSTOMER_TYPE_LABELS);

/** Empty form state for creating a new client. */
const EMPTY_FORM: ClientFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  customerType: 'PARTICULIER',
  companyName: '',
  address: '',
  password: '',
};

// ─── Types ───

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerType: string;
  companyName: string;
  address: string;
  password: string;
}

// ─── Component ───

export default function AdminClients() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── Search with debounce ──
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Dialog state ──
  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Query (paginated) ──
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { role: 'CUSTOMER', search: debouncedSearch, page, limit: PAGE_LIMIT }],
    queryFn: () => api.admin.users.listPaginated({ role: 'CUSTOMER', search: debouncedSearch, page, limit: PAGE_LIMIT }),
  });

  const users: User[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.admin.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('admin.clients.createdSuccess'));
      closeDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.clients.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.admin.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('admin.clients.updatedSuccess'));
      closeDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.clients.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('admin.clients.deletedSuccess'));
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.clients.deleteError'));
      setDeleteConfirmId(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.users.update(id, { isActive }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(variables.isActive ? t('admin.clients.activated') : t('admin.clients.deactivated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.clients.toggleError'));
    },
  });

  // ── Handlers ──

  const closeDialog = useCallback(() => {
    setDialogMode('closed');
    setEditingUser(null);
    setForm(EMPTY_FORM);
  }, []);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setDialogMode('create');
  }, []);

  const openEdit = useCallback((user: User) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      customerType: user.customerType ?? 'PARTICULIER',
      companyName: user.companyName ?? '',
      address: user.address ?? '',
      password: '', // Never pre-fill password
    });
    setDialogMode('edit');
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof ClientFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (dialogMode === 'create') {
        const payload: Record<string, unknown> = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          customerType: form.customerType,
          companyName: form.companyName.trim() || undefined,
          address: form.address.trim() || undefined,
          password: form.password,
          role: 'CUSTOMER',
        };
        createMutation.mutate(payload);
      }

      if (dialogMode === 'edit' && editingUser) {
        const payload: Record<string, unknown> = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          customerType: form.customerType,
          companyName: form.companyName.trim() || undefined,
          address: form.address.trim() || undefined,
        };
        // Only include password if it was changed
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        updateMutation.mutate({ id: editingUser.id, data: payload });
      }
    },
    [dialogMode, form, editingUser, createMutation, updateMutation],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.clients.title')}</h1>
        <HelpTooltip content={t('admin.clients.newClientTooltip')} side="bottom">
          <button
            onClick={openCreate}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('admin.clients.newClient')}
          </button>
        </HelpTooltip>
      </div>

      {/* Search */}
      <HelpTooltip content={t('admin.clients.searchTooltip')} side="right">
        <input
          type="text"
          placeholder={t('admin.clients.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </HelpTooltip>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.name')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.email')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.phone')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.type')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.company')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.statusHeader')}</th>
                <th className="text-right p-3 text-sm font-medium">{t('admin.clients.actionsHeader')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => openEdit(user)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="p-3 text-sm">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="p-3 text-sm">{user.email}</td>
                  <td className="p-3 text-sm">{user.phone || '–'}</td>
                  <td className="p-3 text-sm">
                    {user.customerType
                      ? CUSTOMER_TYPE_LABELS[user.customerType] ?? user.customerType
                      : '–'}
                  </td>
                  <td className="p-3 text-sm">{user.companyName || '–'}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? t('admin.clients.active') : t('admin.clients.inactive')}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Toggle active */}
                      <HelpTooltip content={user.isActive ? t('admin.clients.deactivateTooltip') : t('admin.clients.activateTooltip')} side="bottom">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: user.id,
                              isActive: !user.isActive,
                            })
                          }
                          disabled={toggleActiveMutation.isPending}
                          title={user.isActive ? t('admin.clients.deactivate') : t('admin.clients.activate')}
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            user.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {user.isActive ? t('admin.clients.deactivate') : t('admin.clients.activate')}
                        </button>
                      </HelpTooltip>

                      {/* View detail */}
                      <HelpTooltip content={t('admin.clients.viewDetailTooltip')} side="bottom">
                        <button
                          onClick={() => navigate(`/admin/clients/${user.id}`)}
                          className="rounded px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                        >
                          {t('admin.clients.viewDetail')}
                        </button>
                      </HelpTooltip>

                      {/* Edit */}
                      <HelpTooltip content={t('admin.clients.editTooltip')} side="bottom">
                        <button
                          onClick={() => openEdit(user)}
                          title={t('common.edit')}
                          className="rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          {t('common.edit')}
                        </button>
                      </HelpTooltip>

                      {/* Delete */}
                      {deleteConfirmId === user.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(user.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            {deleteMutation.isPending ? '...' : t('common.confirm')}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                          >
                            {t('common.cancel')}
                          </button>
                        </span>
                      ) : (
                        <HelpTooltip content={t('admin.clients.deleteTooltip')} side="bottom">
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            title={t('common.delete')}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        </HelpTooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">{t('admin.clients.noClients')}</div>
          )}
        </div>
      )}

      {/* ─── Pagination controls ─── */}
      {!isLoading && totalPages > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {t('common.pageOf', { page, total: totalPages })}
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

      {/* ── Create / Edit Dialog Overlay ── */}
      {dialogMode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDialog}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg mx-4 bg-card border rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {dialogMode === 'create' ? t('admin.clients.dialogTitleCreate') : t('admin.clients.dialogTitleEdit')}
              </h2>
              <button
                onClick={closeDialog}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label={t('admin.clients.closeDialog')}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* First name / Last name */}
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium">{t('admin.clients.firstName')}</span>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={handleFieldChange('firstName')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">{t('admin.clients.lastName')}</span>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={handleFieldChange('lastName')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>

              {/* Email */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('admin.clients.email')}</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={handleFieldChange('email')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              {/* Phone */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('admin.clients.phone')}</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleFieldChange('phone')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              {/* Customer type */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('admin.clients.customerType')}</span>
                <select
                  value={form.customerType}
                  onChange={handleFieldChange('customerType')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CUSTOMER_TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Company name */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('admin.clients.companyName')}</span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={handleFieldChange('companyName')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              {/* Address */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('admin.clients.address')}</span>
                <textarea
                  value={form.address}
                  onChange={handleFieldChange('address')}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </label>

              {/* Password */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">
                  {t('admin.clients.password')}
                  {dialogMode === 'edit' && (
                    <span className="text-muted-foreground font-normal">
                      {t('admin.clients.passwordEditHint')}
                    </span>
                  )}
                </span>
                <input
                  type="password"
                  required={dialogMode === 'create'}
                  value={form.password}
                  onChange={handleFieldChange('password')}
                  minLength={dialogMode === 'create' ? 8 : undefined}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <HelpTooltip content={dialogMode === 'create' ? t('admin.clients.createSubmitTooltip') : t('admin.clients.editSubmitTooltip')} side="top">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSaving
                      ? t('common.saving')
                      : dialogMode === 'create'
                        ? t('admin.clients.createButton')
                        : t('common.save')}
                  </button>
                </HelpTooltip>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
