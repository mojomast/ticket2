import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

const PERMISSION_LABELS: Record<string, string> = {
  can_accept_tickets: 'Accepter les billets',
  can_close_tickets: 'Fermer les billets',
  can_send_quotes: 'Envoyer des devis',
  can_cancel_appointments: 'Annuler les rendez-vous',
  can_view_all_tickets: 'Voir tous les billets',
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  can_accept_tickets: 'Permet au technicien de prendre en charge de nouveaux billets',
  can_close_tickets: 'Permet de marquer un billet comme résolu et de le fermer',
  can_send_quotes: 'Autorise l\'envoi de devis et estimations aux clients',
  can_cancel_appointments: 'Permet d\'annuler ou reporter les rendez-vous planifiés',
  can_view_all_tickets: 'Donne accès à tous les billets, pas seulement ceux assignés',
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

interface TechnicianFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

const emptyForm: TechnicianFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
};

export default function AdminTechnicians() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  // ─── UI State ───
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTech, setEditingTech] = useState<User | null>(null);
  const [deletingTechId, setDeletingTechId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TechnicianFormData>(emptyForm);

  // ─── Query ───
  const queryKey = ['admin', 'users', { role: 'TECHNICIAN' }];

  const { data: technicians, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.admin.users.list({ role: 'TECHNICIAN' }),
  });

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: (data: TechnicianFormData) =>
      api.admin.users.create({ ...data, role: 'TECHNICIAN' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(t('admin.technicians.createdSuccess'));
      setShowCreateForm(false);
      setFormData(emptyForm);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.technicians.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TechnicianFormData> }) =>
      api.admin.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(t('admin.technicians.updatedSuccess'));
      setEditingTech(null);
      setFormData(emptyForm);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.technicians.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(t('admin.technicians.deletedSuccess'));
      setDeletingTechId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.technicians.deleteError'));
      setDeletingTechId(null);
    },
  });

  const permissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Record<string, boolean> }) =>
      api.admin.users.updatePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(t('admin.technicians.permissionsUpdated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.technicians.permissionsError'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.users.update(id, { isActive }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(variables.isActive ? t('admin.technicians.activated') : t('admin.technicians.deactivated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.technicians.toggleError'));
    },
  });

  // ─── Handlers ───
  const handleOpenCreate = () => {
    setEditingTech(null);
    setFormData(emptyForm);
    setShowCreateForm(true);
  };

  const handleOpenEdit = (tech: User) => {
    setShowCreateForm(false);
    setFormData({
      firstName: tech.firstName,
      lastName: tech.lastName,
      email: tech.email,
      phone: tech.phone || '',
      password: '', // password is not pre-filled for editing
    });
    setEditingTech(tech);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingTech(null);
    setFormData(emptyForm);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;
    // Only send password if it was actually entered
    const updateData: Partial<TechnicianFormData> = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
    };
    if (formData.password) {
      updateData.password = formData.password;
    }
    updateMutation.mutate({ id: editingTech.id, data: updateData });
  };

  const handlePermissionToggle = (tech: User, permKey: string) => {
    const currentPermissions = tech.permissions || {};
    const updatedPermissions: Record<string, boolean> = {};
    for (const key of PERMISSION_KEYS) {
      updatedPermissions[key] = key === permKey
        ? !currentPermissions[key]
        : !!currentPermissions[key];
    }
    permissionsMutation.mutate({ id: tech.id, permissions: updatedPermissions });
  };

  const handleConfirmDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const updateField = (field: keyof TechnicianFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Shared form fields (used for both create and edit) ───
  const isFormPending = createMutation.isPending || updateMutation.isPending;

  const renderForm = (mode: 'create' | 'edit') => (
    <form
      onSubmit={mode === 'create' ? handleSubmitCreate : handleSubmitEdit}
      className="bg-card border rounded-lg p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold">
        {mode === 'create' ? t('admin.technicians.formTitleCreate') : t('admin.technicians.formTitleEdit', { name: `${editingTech?.firstName} ${editingTech?.lastName}` })}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.technicians.firstName')}</label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            disabled={isFormPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.technicians.lastName')}</label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            disabled={isFormPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.technicians.email')}</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isFormPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.technicians.phone')}</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            disabled={isFormPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">
            {mode === 'create' ? t('admin.technicians.password') : t('admin.technicians.passwordEditHint')}
          </label>
          <input
            type="password"
            required={mode === 'create'}
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            disabled={isFormPending}
            placeholder={mode === 'edit' ? '••••••••' : ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <HelpTooltip content={mode === 'create' ? t('admin.technicians.createTooltip') : t('admin.technicians.editTooltip')} side="top">
          <button
            type="submit"
            disabled={isFormPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isFormPending
              ? t('common.saving')
              : mode === 'create'
                ? t('admin.technicians.createButton')
                : t('admin.technicians.editButton')}
          </button>
        </HelpTooltip>
        <button
          type="button"
          onClick={handleCancelForm}
          disabled={isFormPending}
          className="border border-input px-4 py-2 rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );

  // ─── Render ───
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.technicians.title')}</h1>
        {!showCreateForm && !editingTech && (
          <HelpTooltip content={t('admin.technicians.newTechTooltip')} side="bottom">
            <button
              onClick={handleOpenCreate}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
            >
              {t('admin.technicians.newTech')}
            </button>
          </HelpTooltip>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && renderForm('create')}

      {/* Edit Form */}
      {editingTech && renderForm('edit')}

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <>
          {/* Technician Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(technicians as User[] | undefined)?.map((tech) => (
              <div
                key={tech.id}
                className={`bg-card border rounded-lg p-4 transition-colors ${
                  editingTech?.id === tech.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                {/* Tech Info */}
                <div className="flex items-start justify-between">
                    <div
                    className="cursor-pointer flex-1"
                    onClick={() => handleOpenEdit(tech)}
                    title={t('admin.technicians.clickToEdit')}
                  >
                    <h3 className="font-medium hover:text-primary transition-colors">
                      {tech.firstName} {tech.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{tech.email}</p>
                    {tech.phone && (
                      <p className="text-sm text-muted-foreground">{tech.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <HelpTooltip content={tech.isActive ? t('admin.technicians.activeTooltip') : t('admin.technicians.inactiveTooltip')} side="left">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          tech.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tech.isActive ? t('admin.technicians.active') : t('admin.technicians.inactive')}
                      </span>
                    </HelpTooltip>
                    <HelpTooltip content={tech.isActive ? t('admin.technicians.deactivateTooltip') : t('admin.technicians.activateTooltip')} side="left">
                      <button
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: tech.id,
                            isActive: !tech.isActive,
                          })
                        }
                        disabled={toggleActiveMutation.isPending}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          tech.isActive
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {tech.isActive ? t('admin.technicians.deactivate') : t('admin.technicians.activate')}
                      </button>
                    </HelpTooltip>
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('admin.technicians.permissions')}
                  </p>
                  {PERMISSION_KEYS.map((permKey) => {
                    const isChecked = !!tech.permissions?.[permKey];
                    const isPending =
                      permissionsMutation.isPending &&
                      permissionsMutation.variables?.id === tech.id;
                    return (
                      <HelpTooltip key={permKey} content={PERMISSION_DESCRIPTIONS[permKey] ?? PERMISSION_LABELS[permKey] ?? permKey} side="right">
                        <label
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isPending}
                            onChange={() => handlePermissionToggle(tech, permKey)}
                            className="rounded border-input disabled:opacity-50"
                          />
                          <span className={isPending ? 'opacity-50' : ''}>
                            {PERMISSION_LABELS[permKey]}
                          </span>
                        </label>
                      </HelpTooltip>
                    );
                  })}
                </div>

                {/* Delete Button */}
                <div className="mt-4 pt-3 border-t flex justify-end">
                  {deletingTechId === tech.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-destructive">{t('admin.technicians.deleteConfirm')}</span>
                      <button
                        onClick={() => handleConfirmDelete(tech.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs bg-destructive text-destructive-foreground px-3 py-1 rounded-md hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? t('common.deleting') : t('common.confirm')}
                      </button>
                      <button
                        onClick={() => setDeletingTechId(null)}
                        disabled={deleteMutation.isPending}
                        className="text-xs border border-input px-3 py-1 rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <HelpTooltip content={t('admin.technicians.deleteTooltip')} side="left">
                      <button
                        onClick={() => setDeletingTechId(tech.id)}
                        className="text-xs text-destructive hover:text-destructive/80 hover:underline"
                      >
                        {t('common.delete')}
                      </button>
                    </HelpTooltip>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {technicians && technicians.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Aucun technicien trouvé
            </div>
          )}
        </>
      )}
    </div>
  );
}
