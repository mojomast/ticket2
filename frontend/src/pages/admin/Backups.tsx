import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime } from '../../lib/utils';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

interface Backup {
  id: string;
  fileName: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function AdminBackups() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { t } = useTranslation();

  const { data: backups, isLoading } = useQuery({
    queryKey: ['admin', 'backups'],
    queryFn: () => api.admin.backups.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.admin.backups.create('FULL'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      toast.success(t('backup.createdSuccess'));
    },
    onError: () => toast.error(t('backup.createError')),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.admin.backups.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(t('backup.restoreSuccess'));
    },
    onError: () => toast.error(t('backup.restoreError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.backups.delete(id),
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      toast.success(t('backup.deleteSuccess'));
    },
    onError: () => {
      setConfirmDeleteId(null);
      toast.error(t('backup.deleteError'));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('backup.title')}</h1>
        <HelpTooltip content={t('backup.createTooltip')} side="bottom">
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? t('backup.creating') : t('backup.new')}
          </button>
        </HelpTooltip>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : !backups || (backups as Backup[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">
          <p className="text-lg font-medium">{t('backup.noBackups')}</p>
          <p className="text-sm mt-1">{t('backup.noBackupsHint')}</p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">{t('common.file')}</th>
                <th className="text-left p-3 text-sm font-medium hidden md:table-cell">{t('common.type')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('common.status')}</th>
                <th className="text-left p-3 text-sm font-medium hidden md:table-cell">{t('common.date')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(backups as Backup[])?.map((backup) => (
                <tr key={backup.id}>
                  <td className="p-3 text-sm font-mono min-w-0 truncate max-w-[180px] md:max-w-[260px]">{backup.fileName}</td>
                  <td className="p-3 text-sm hidden md:table-cell">{backup.type}</td>
                  <td className="p-3">
                    <HelpTooltip content={
                      backup.status === 'COMPLETED' ? t('backup.statusCompleted') :
                      backup.status === 'FAILED' ? t('backup.statusFailed') :
                      t('backup.statusProcessing')
                    } side="top">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        backup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        backup.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {backup.status}
                      </span>
                    </HelpTooltip>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{formatDateTime(backup.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex flex-col items-start gap-1 whitespace-nowrap sm:flex-row sm:items-center sm:gap-2">
                      {backup.status === 'COMPLETED' && (
                        <>
                          <HelpTooltip content={t('backup.downloadTooltip')} side="top">
                            <a
                              href={api.admin.backups.download(backup.id)}
                              className="text-xs text-primary hover:underline"
                            >
                              {t('common.download')}
                            </a>
                          </HelpTooltip>
                          <HelpTooltip content={t('backup.restoreTooltip')} side="top">
                            <button
                              onClick={() => {
                                const confirmed = window.confirm(
                                  t('backup.restoreConfirm')
                                );
                                if (confirmed) {
                                  restoreMutation.mutate(backup.id);
                                }
                              }}
                              disabled={restoreMutation.isPending}
                              className="text-xs text-orange-600 hover:underline disabled:opacity-50"
                            >
                              {restoreMutation.isPending ? t('common.restoring') : t('common.restore')}
                            </button>
                          </HelpTooltip>
                        </>
                      )}
                      {confirmDeleteId === backup.id ? (
                        <>
                          <button
                            onClick={() => deleteMutation.mutate(backup.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs text-red-700 font-medium hover:underline disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? t('common.deleting') : t('common.confirm')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                          <HelpTooltip content={t('backup.deleteTooltip')} side="top">
                          <button
                            onClick={() => setConfirmDeleteId(backup.id)}
                            className="text-xs text-red-600 hover:underline"
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
          </div>
        </div>
      )}
    </div>
  );
}
