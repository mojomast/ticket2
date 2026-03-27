import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type KbArticle } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { formatDateTime } from '../../lib/utils';

// ─── Constants ───

const PAGE_LIMIT = 20;

const CATEGORY_LABELS: Record<string, string> = {
  MATERIEL: 'Matériel',
  LOGICIEL: 'Logiciel',
  RESEAU: 'Réseau',
  PROCEDURE: 'Procédure',
  FAQ: 'FAQ',
  AUTRE: 'Autre',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

const VISIBILITY_LABELS: Record<string, string> = {
  INTERNAL: 'Interne',
  PUBLIC: 'Public',
};

const VISIBILITY_OPTIONS = Object.entries(VISIBILITY_LABELS);

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
        <button
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('kb.newArticle')}
        </button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder={t('kb.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
          {VISIBILITY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {CATEGORY_LABELS[article.category] ?? article.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        article.visibility === 'PUBLIC'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {article.visibility === 'PUBLIC' ? t('kb.public') : t('kb.internal')}
                    </span>
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
                      <button
                        onClick={() => navigate(`/admin/base-connaissances/${article.id}`)}
                        className="rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        {t('common.edit')}
                      </button>

                      {/* Delete */}
                      {deleteConfirmId === article.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(article.id)}
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
                        <button
                          onClick={() => setDeleteConfirmId(article.id)}
                          className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                        >
                          {t('common.delete')}
                        </button>
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

      {/* ── Create Dialog Overlay ── */}
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
                {t('kb.createTitle')}
              </h2>
              <button
                onClick={closeDialog}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Title */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('kb.titleField')}</span>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={handleFieldChange('title')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>

              {/* Content */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('kb.content')}</span>
                <textarea
                  required
                  value={form.content}
                  onChange={handleFieldChange('content')}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </label>

              {/* Category */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('kb.category')}</span>
                <select
                  value={form.category}
                  onChange={handleFieldChange('category')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Visibility */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('kb.visibility')}</span>
                <select
                  value={form.visibility}
                  onChange={handleFieldChange('visibility')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {VISIBILITY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Tags */}
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t('kb.tags')}</span>
                <input
                  type="text"
                  value={form.tags}
                  onChange={handleFieldChange('tags')}
                  placeholder={t('kb.tagsHelp')}
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
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? t('common.saving') : t('kb.newArticle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
