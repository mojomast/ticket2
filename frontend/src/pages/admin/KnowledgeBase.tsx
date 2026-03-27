import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type KbArticle } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { formatDateTime } from '../../lib/utils';
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

const PAGE_LIMIT = 20;

const KB_CATEGORY_KEYS = ['MATERIEL', 'LOGICIEL', 'RESEAU', 'PROCEDURE', 'FAQ', 'AUTRE'] as const;

const KB_VISIBILITY_KEYS = ['INTERNAL', 'PUBLIC'] as const;

/** Empty form state for creating a new article. */
const EMPTY_FORM: ArticleFormData = {
  title: '',
  content: '',
  category: 'MATERIEL',
  visibility: 'INTERNAL',
  tags: '',
};

// ─── Types ───

interface ArticleFormData {
  title: string;
  content: string;
  category: string;
  visibility: string;
  tags: string;
}

// ─── Component ───

export default function KnowledgeBase() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── Search with debounce ──
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── Filter state ──
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Dialog state ──
  const [dialogMode, setDialogMode] = useState<'closed' | 'create'>('closed');
  const [form, setForm] = useState<ArticleFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Query (paginated) ──
  const { data, isLoading } = useQuery({
    queryKey: ['kb', 'articles', { search: debouncedSearch, category: categoryFilter, visibility: visibilityFilter, page }],
    queryFn: () =>
      api.kb.articles.list({
        search: debouncedSearch,
        category: categoryFilter,
        visibility: visibilityFilter,
        page,
        limit: PAGE_LIMIT,
      }),
  });

  const articles: KbArticle[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; content: string; category?: string; tags?: string[]; visibility?: string }) =>
      api.kb.articles.create(payload),
    onSuccess: (newArticle) => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'articles'] });
      toast.success(t('kb.createdSuccess'));
      closeDialog();
      navigate(`/admin/base-connaissances/${newArticle.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.kb.articles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'articles'] });
      toast.success(t('kb.deletedSuccess'));
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteConfirmId(null);
    },
  });

  // ── Handlers ──

  const closeDialog = useCallback(() => {
    setDialogMode('closed');
    setForm(EMPTY_FORM);
  }, []);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setDialogMode('create');
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof ArticleFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const parsedTags = form.tags
        .split(',')
        .map((tk) => tk.trim())
        .filter(Boolean);

      const payload: { title: string; content: string; category?: string; tags?: string[]; visibility?: string } = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        visibility: form.visibility,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      };

      createMutation.mutate(payload);
    },
    [form, createMutation],
  );

  const isSaving = createMutation.isPending;

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('kb.title')}</h1>
        <Button onClick={openCreate}>
          {t('kb.newArticle')}
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder={t('kb.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('kb.allCategories')}</option>
          {KB_CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`label.kbCategory.${key}`)}
            </option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => {
            setVisibilityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('kb.allVisibility')}</option>
          {KB_VISIBILITY_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`label.kbVisibility.${key}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">{t('kb.titleField')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('kb.category')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('kb.visibility')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('kb.author')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('kb.updated')}</th>
                <th className="text-right p-3 text-sm font-medium">{t('kb.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3 text-sm">
                    <button
                      onClick={() => navigate(`/admin/base-connaissances/${article.id}`)}
                      className="text-left font-medium text-primary hover:underline"
                    >
                      {article.title}
                    </button>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {t(`label.kbCategory.${article.category}`) || article.category}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={
                        article.visibility === 'PUBLIC'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {article.visibility === 'PUBLIC' ? t('kb.public') : t('kb.internal')}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm">
                    {article.author.firstName} {article.author.lastName}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {formatDateTime(article.updatedAt)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/admin/base-connaissances/${article.id}`)}
                        className="h-7 bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        {t('common.edit')}
                      </Button>

                      {/* Delete */}
                      {deleteConfirmId === article.id ? (
                        <span className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(article.id)}
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
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDeleteConfirmId(article.id)}
                          className="h-7 bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          {t('common.delete')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {articles.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">{t('kb.noArticles')}</div>
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

      {/* ── Create Dialog ── */}
      <Dialog open={dialogMode !== 'closed'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('kb.createTitle')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <Label>{t('kb.titleField')}</Label>
              <Input
                type="text"
                required
                value={form.title}
                onChange={handleFieldChange('title')}
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <Label>{t('kb.content')}</Label>
              <Textarea
                required
                value={form.content}
                onChange={handleFieldChange('content')}
                rows={6}
                className="resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label>{t('kb.category')}</Label>
              <select
                value={form.category}
                onChange={handleFieldChange('category')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {KB_CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`label.kbCategory.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div className="space-y-1">
              <Label>{t('kb.visibility')}</Label>
              <select
                value={form.visibility}
                onChange={handleFieldChange('visibility')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {KB_VISIBILITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`label.kbVisibility.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <Label>{t('kb.tags')}</Label>
              <Input
                type="text"
                value={form.tags}
                onChange={handleFieldChange('tags')}
                placeholder={t('kb.tagsHelp')}
              />
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
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('kb.newArticle')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
