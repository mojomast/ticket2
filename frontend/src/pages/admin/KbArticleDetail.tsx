import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type KbArticle, type KbArticleLink } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { formatDateTime } from '../../lib/utils';

// ─── Label Maps ───

const CATEGORY_LABELS: Record<string, string> = {
  MATERIEL: 'Matériel',
  LOGICIEL: 'Logiciel',
  RESEAU: 'Réseau',
  PROCEDURE: 'Procédure',
  FAQ: 'FAQ',
  AUTRE: 'Autre',
};

const VISIBILITY_LABELS: Record<string, string> = {
  INTERNAL: 'Interne',
  PUBLIC: 'Public',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  TICKET: 'Billet',
  WORKORDER: 'Bon de travail',
  CUSTOMER: 'Client',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);
const VISIBILITY_OPTIONS = Object.entries(VISIBILITY_LABELS);
const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_TYPE_LABELS);

// ─── Main Component ───

export default function KbArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // ─── View / Edit toggle ───
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    category: '',
    visibility: '',
    tags: '',
  });

  // ─── Link entity form ───
  const [linkEntityType, setLinkEntityType] = useState('TICKET');
  const [linkEntityId, setLinkEntityId] = useState('');

  // ─── Query ───

  const {
    data: article,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['kb', 'article', id],
    queryFn: () => api.kb.articles.get(id!),
    enabled: !!id,
  });

  // Populate edit form when article loads
  useEffect(() => {
    if (!article) return;
    const a = article as KbArticle;
    setEditForm({
      title: a.title,
      content: a.content,
      category: a.category,
      visibility: a.visibility,
      tags: a.tags ? a.tags.join(', ') : '',
    });
  }, [article]);

  // ─── Mutations ───

  const updateMutation = useMutation({
    mutationFn: (data: {
      title?: string;
      content?: string;
      category?: string;
      visibility?: string;
      tags?: string[];
    }) => api.kb.articles.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'article', id] });
      queryClient.invalidateQueries({ queryKey: ['kb', 'articles'] });
      setIsEditing(false);
      toast.success(t('kb.detail.updatedSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('kb.detail.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.kb.articles.delete(id!),
    onSuccess: () => {
      toast.success(t('kb.detail.deletedSuccess'));
      navigate('/admin/base-connaissances');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('kb.detail.deleteError'));
    },
  });

  const linkMutation = useMutation({
    mutationFn: (data: { articleId: string; entityType: string; entityId: string }) =>
      api.kb.links.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'article', id] });
      setLinkEntityId('');
      toast.success(t('kb.detail.linkSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('kb.detail.linkError'));
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => api.kb.links.delete(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'article', id] });
      toast.success(t('kb.detail.unlinkSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('kb.detail.unlinkError'));
    },
  });

  // ─── Handlers ───

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const tags = editForm.tags
      .split(',')
      .map((tk) => tk.trim())
      .filter(Boolean);

    updateMutation.mutate({
      title: editForm.title,
      content: editForm.content,
      category: editForm.category,
      visibility: editForm.visibility,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  function handleDelete() {
    if (!window.confirm(t('kb.detail.deleteConfirm'))) return;
    deleteMutation.mutate();
  }

  function handleLinkEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!linkEntityId.trim()) return;
    linkMutation.mutate({
      articleId: id!,
      entityType: linkEntityType,
      entityId: linkEntityId.trim(),
    });
  }

  function handleUnlink(linkId: string) {
    if (!window.confirm(t('kb.detail.unlinkConfirm'))) return;
    unlinkMutation.mutate(linkId);
  }

  function startEditing() {
    if (article) {
      const a = article as KbArticle;
      setEditForm({
        title: a.title,
        content: a.content,
        category: a.category,
        visibility: a.visibility,
        tags: a.tags ? a.tags.join(', ') : '',
      });
    }
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    if (article) {
      const a = article as KbArticle;
      setEditForm({
        title: a.title,
        content: a.content,
        category: a.category,
        visibility: a.visibility,
        tags: a.tags ? a.tags.join(', ') : '',
      });
    }
  }

  // ─── Render ───

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground text-sm">{t('common.loading')}</span>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/base-connaissances"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {t('kb.detail.backToList')}
        </Link>
        <div className="flex items-center justify-center py-12">
          <span className="text-destructive text-sm">{t('kb.detail.notFound')}</span>
        </div>
      </div>
    );
  }

  const a = article as KbArticle;
  const links = (a.links || []) as KbArticleLink[];

  // Group links by entity type
  const linksByType: Record<string, KbArticleLink[]> = {};
  for (const link of links) {
    if (!linksByType[link.entityType]) {
      linksByType[link.entityType] = [];
    }
    linksByType[link.entityType]!.push(link);
  }

  return (
    <div className="space-y-6">
      {/* ─── Back Link ─── */}
      <Link
        to="/admin/base-connaissances"
        className="inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; {t('kb.detail.backToList')}
      </Link>

      {/* ─── 3-Column Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Content (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            /* ─── Edit Mode ─── */
            <form onSubmit={handleSave} className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="font-semibold">{t('kb.detail.edit')}</h2>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('kb.detail.titleLabel')}
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('kb.detail.contentLabel')}
                </label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  required
                  rows={20}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y font-mono"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('kb.detail.categoryLabel')}
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('kb.detail.visibilityLabel')}
                </label>
                <select
                  value={editForm.visibility}
                  onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {VISIBILITY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('kb.detail.tagsLabel')}
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder={t('kb.detail.tagsPlaceholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('kb.detail.tagsHint')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateMutation.isPending ? t('common.saving') : t('kb.detail.save')}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={updateMutation.isPending}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                >
                  {t('kb.detail.cancel')}
                </button>
              </div>
            </form>
          ) : (
            /* ─── View Mode ─── */
            <div className="bg-card border rounded-lg p-6 space-y-4">
              {/* Header row: title + edit/delete buttons */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold">{a.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={startEditing}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {t('kb.detail.edit')}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded-md border border-red-300 bg-background px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? t('common.deleting') : t('kb.detail.delete')}
                  </button>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {CATEGORY_LABELS[a.category] || a.category}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.visibility === 'PUBLIC'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {VISIBILITY_LABELS[a.visibility] || a.visibility}
                </span>
                {a.tags &&
                  a.tags.map((tk) => (
                    <span
                      key={tk}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tk}
                    </span>
                  ))}
              </div>

              {/* Author + dates */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {a.author.firstName} {a.author.lastName}
                </span>
                <span>{formatDateTime(a.createdAt)}</span>
              </div>

              {/* Article content */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed pt-2 border-t">
                {a.content}
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar (1 col) ─── */}
        <div className="space-y-4">
          {/* ─── Article Info Card ─── */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('kb.detail.articleInfo')}</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">{t('kb.detail.author')}:</span>{' '}
                {a.author.firstName} {a.author.lastName}
              </div>
              <div>
                <span className="text-muted-foreground">{t('kb.detail.createdAt')}:</span>{' '}
                {formatDateTime(a.createdAt)}
              </div>
              <div>
                <span className="text-muted-foreground">{t('kb.detail.updatedAt')}:</span>{' '}
                {formatDateTime(a.updatedAt)}
              </div>
              <div>
                <span className="text-muted-foreground">{t('kb.detail.categoryLabel')}:</span>{' '}
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {CATEGORY_LABELS[a.category] || a.category}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('kb.detail.visibilityLabel')}:</span>{' '}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.visibility === 'PUBLIC'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {VISIBILITY_LABELS[a.visibility] || a.visibility}
                </span>
              </div>
              {a.tags && a.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{t('kb.detail.tagsLabel')}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.tags.map((tk) => (
                      <span
                        key={tk}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Linked Entities Card ─── */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('kb.detail.linkedEntities')}</h3>

            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('kb.detail.noLinks')}</p>
            ) : (
              <div className="space-y-3">
                {ENTITY_TYPE_OPTIONS.map(([typeKey, typeLabel]) => {
                  const typeLinks = linksByType[typeKey];
                  if (!typeLinks || typeLinks.length === 0) return null;
                  return (
                    <div key={typeKey}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {typeLabel}
                      </p>
                      <div className="space-y-1">
                        {typeLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-medium text-muted-foreground">
                                {typeLabel}
                              </span>
                              <span
                                className="text-xs font-mono truncate max-w-[120px]"
                                title={link.entityId}
                              >
                                {link.entityId}
                              </span>
                            </div>
                            <button
                              onClick={() => handleUnlink(link.id)}
                              disabled={unlinkMutation.isPending}
                              className="flex-shrink-0 rounded-md px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                              title={t('kb.detail.unlink')}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Link Entity Form ─── */}
            <div className="border-t pt-3">
              <p className="text-xs font-medium mb-2">{t('kb.detail.linkEntity')}</p>
              <form onSubmit={handleLinkEntity} className="space-y-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-0.5">
                    {t('kb.detail.entityType')}
                  </label>
                  <select
                    value={linkEntityType}
                    onChange={(e) => setLinkEntityType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    {ENTITY_TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-0.5">
                    {t('kb.detail.entityId')}
                  </label>
                  <input
                    type="text"
                    value={linkEntityId}
                    onChange={(e) => setLinkEntityId(e.target.value)}
                    placeholder="ID"
                    required
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={linkMutation.isPending || !linkEntityId.trim()}
                  className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {linkMutation.isPending ? t('common.saving') : t('kb.detail.linkEntity')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
