import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type User } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';

// ─── Constants ───

const PAGE_LIMIT = 25;

const CUSTOMER_TYPE_KEYS = ['PARTICULIER', 'ENTREPRISE'] as const;

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
    setFormErrors({});
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
        setFormErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });
      },
    [],
  );

  function validateClientForm(): boolean {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('validation.firstNameRequired');
    if (!form.lastName.trim()) errs.lastName = t('validation.lastNameRequired');
    if (!form.email.trim()) {
      errs.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = t('validation.emailInvalid');
    }
    if (dialogMode === 'create') {
      if (!form.password) {
        errs.password = t('validation.passwordRequired');
      } else if (form.password.length < 8) {
        errs.password = t('validation.passwordMinLength');
      }
    } else if (form.password && form.password.length < 8) {
      errs.password = t('validation.passwordMinLength');
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateClientForm()) return;

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
          <Button onClick={openCreate}>
            {t('admin.clients.newClient')}
          </Button>
        </HelpTooltip>
      </div>

      {/* Search */}
      <HelpTooltip content={t('admin.clients.searchTooltip')} side="right">
        <Input
          type="text"
          placeholder={t('admin.clients.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
      </HelpTooltip>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">{t('admin.clients.name')}</th>
                <th className="text-left p-3 text-sm font-medium hidden md:table-cell">{t('admin.clients.email')}</th>
                <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">{t('admin.clients.phone')}</th>
                <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">{t('admin.clients.type')}</th>
                <th className="text-left p-3 text-sm font-medium hidden md:table-cell">{t('admin.clients.company')}</th>
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
                  <td className="p-3 text-sm min-w-0 truncate max-w-[180px]">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="p-3 text-sm hidden md:table-cell min-w-0 truncate max-w-[200px]">{user.email}</td>
                  <td className="p-3 text-sm hidden lg:table-cell">{user.phone || '–'}</td>
                  <td className="p-3 text-sm hidden lg:table-cell">
                    {user.customerType
                      ? t(`label.customerType.${user.customerType}`) || user.customerType
                      : '–'}
                  </td>
                  <td className="p-3 text-sm hidden md:table-cell">{user.companyName || '–'}</td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {user.isActive ? t('admin.clients.active') : t('admin.clients.inactive')}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Toggle active */}
                      <HelpTooltip content={user.isActive ? t('admin.clients.deactivateTooltip') : t('admin.clients.activateTooltip')} side="bottom">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: user.id,
                              isActive: !user.isActive,
                            })
                          }
                          disabled={toggleActiveMutation.isPending}
                          title={user.isActive ? t('admin.clients.deactivate') : t('admin.clients.activate')}
                          className={`h-7 ${
                            user.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {user.isActive ? t('admin.clients.deactivate') : t('admin.clients.activate')}
                        </Button>
                      </HelpTooltip>

                      {/* View detail */}
                      <HelpTooltip content={t('admin.clients.viewDetailTooltip')} side="bottom">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/clients/${user.id}`)}
                          className="h-7 bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        >
                          {t('admin.clients.viewDetail')}
                        </Button>
                      </HelpTooltip>

                      {/* Edit */}
                      <HelpTooltip content={t('admin.clients.editTooltip')} side="bottom">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(user)}
                          title={t('common.edit')}
                          className="h-7 bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          {t('common.edit')}
                        </Button>
                      </HelpTooltip>

                      {/* Delete */}
                      {deleteConfirmId === user.id ? (
                        <span className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(user.id)}
                            disabled={deleteMutation.isPending}
                            className="h-7"
                          >
                            {deleteMutation.isPending ? '...' : t('common.confirm')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(null)}
                            className="h-7"
                          >
                            {t('common.cancel')}
                          </Button>
                        </span>
                      ) : (
                        <HelpTooltip content={t('admin.clients.deleteTooltip')} side="bottom">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDeleteConfirmId(user.id)}
                            title={t('common.delete')}
                            className="h-7 bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            {t('common.delete')}
                          </Button>
                        </HelpTooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogMode !== 'closed'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? t('admin.clients.dialogTitleCreate') : t('admin.clients.dialogTitleEdit')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First name / Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t('admin.clients.firstName')}</Label>
                <Input
                  type="text"
                  value={form.firstName}
                  onChange={handleFieldChange('firstName')}
                  className={formErrors.firstName ? 'border-destructive' : ''}
                />
                {formErrors.firstName && <p className="text-sm text-destructive mt-1">{formErrors.firstName}</p>}
              </div>
              <div className="space-y-1">
                <Label>{t('admin.clients.lastName')}</Label>
                <Input
                  type="text"
                  value={form.lastName}
                  onChange={handleFieldChange('lastName')}
                  className={formErrors.lastName ? 'border-destructive' : ''}
                />
                {formErrors.lastName && <p className="text-sm text-destructive mt-1">{formErrors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label>{t('admin.clients.email')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={handleFieldChange('email')}
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-sm text-destructive mt-1">{formErrors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label>{t('admin.clients.phone')}</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={handleFieldChange('phone')}
              />
            </div>

            {/* Customer type */}
            <div className="space-y-1">
              <Label>{t('admin.clients.customerType')}</Label>
              <select
                value={form.customerType}
                onChange={handleFieldChange('customerType')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CUSTOMER_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`label.customerType.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Company name */}
            <div className="space-y-1">
              <Label>{t('admin.clients.companyName')}</Label>
              <Input
                type="text"
                value={form.companyName}
                onChange={handleFieldChange('companyName')}
              />
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label>{t('admin.clients.address')}</Label>
              <Textarea
                value={form.address}
                onChange={handleFieldChange('address')}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label>
                {t('admin.clients.password')}
                {dialogMode === 'edit' && (
                  <span className="text-muted-foreground font-normal">
                    {t('admin.clients.passwordEditHint')}
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={handleFieldChange('password')}
                className={formErrors.password ? 'border-destructive' : ''}
              />
              {formErrors.password && <p className="text-sm text-destructive mt-1">{formErrors.password}</p>}
            </div>

            {/* Actions */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
              >
                {t('common.cancel')}
              </Button>
              <HelpTooltip content={dialogMode === 'create' ? t('admin.clients.createSubmitTooltip') : t('admin.clients.editSubmitTooltip')} side="top">
                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? t('common.saving')
                    : dialogMode === 'create'
                      ? t('admin.clients.createButton')
                      : t('common.save')}
                </Button>
              </HelpTooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
