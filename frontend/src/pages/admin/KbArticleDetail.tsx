import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type KbArticle, type KbArticleLink } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

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
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="font-semibold">{t('kb.detail.edit')}</h2>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Title */}
                  <div>
                    <Label className="mb-1">
                      {t('kb.detail.titleLabel')}
                    </Label>
                    <Input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      required
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <Label className="mb-1">
                      {t('kb.detail.contentLabel')}
                    </Label>
                    <Textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      required
                      rows={20}
                      className="resize-y font-mono"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="mb-1">
                      {t('kb.detail.categoryLabel')}
                    </Label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    <Label className="mb-1">
                      {t('kb.detail.visibilityLabel')}
                    </Label>
                    <select
                      value={editForm.visibility}
                      onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    <Label className="mb-1">
                      {t('kb.detail.tagsLabel')}
                    </Label>
                    <Input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      placeholder={t('kb.detail.tagsPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('kb.detail.tagsHint')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? t('common.saving') : t('kb.detail.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={updateMutation.isPending}
                    >
                      {t('kb.detail.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* ─── View Mode ─── */
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Header row: title + edit/delete buttons */}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold">{a.title}</h1>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={startEditing}
                    >
                      {t('kb.detail.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {deleteMutation.isPending ? t('common.deleting') : t('kb.detail.delete')}
                    </Button>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>
                    {CATEGORY_LABELS[a.category] || a.category}
                  </Badge>
                  <Badge variant={a.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                    {VISIBILITY_LABELS[a.visibility] || a.visibility}
                  </Badge>
                  {a.tags &&
                    a.tags.map((tk) => (
                      <Badge key={tk} variant="outline">
                        {tk}
                      </Badge>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Sidebar (1 col) ─── */}
        <div className="space-y-4">
          {/* ─── Article Info Card ─── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('kb.detail.articleInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
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
                <Badge variant="default">
                  {CATEGORY_LABELS[a.category] || a.category}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t('kb.detail.visibilityLabel')}:</span>{' '}
                <Badge variant={a.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                  {VISIBILITY_LABELS[a.visibility] || a.visibility}
                </Badge>
              </div>
              {a.tags && a.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{t('kb.detail.tagsLabel')}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.tags.map((tk) => (
                      <Badge key={tk} variant="outline">
                        {tk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Linked Entities Card ─── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('kb.detail.linkedEntities')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnlink(link.id)}
                                disabled={unlinkMutation.isPending}
                                className="flex-shrink-0 h-auto px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                title={t('kb.detail.unlink')}
                              >
                                &times;
                              </Button>
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
                    <Label className="text-xs text-muted-foreground">
                      {t('kb.detail.entityType')}
                    </Label>
                    <select
                      value={linkEntityType}
                      onChange={(e) => setLinkEntityType(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {ENTITY_TYPE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('kb.detail.entityId')}
                    </Label>
                    <Input
                      type="text"
                      value={linkEntityId}
                      onChange={(e) => setLinkEntityId(e.target.value)}
                      placeholder="ID"
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={linkMutation.isPending || !linkEntityId.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {linkMutation.isPending ? t('common.saving') : t('kb.detail.linkEntity')}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
