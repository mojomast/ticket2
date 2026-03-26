import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime } from '../../lib/utils';

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

  const { data: backups, isLoading } = useQuery({
    queryKey: ['admin', 'backups'],
    queryFn: () => api.admin.backups.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.admin.backups.create('FULL'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      toast.success('Sauvegarde creee');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.admin.backups.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Restauration terminee');
    },
    onError: () => toast.error('Erreur lors de la restauration'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.backups.delete(id),
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      toast.success('Sauvegarde supprimee');
    },
    onError: () => {
      setConfirmDeleteId(null);
      toast.error('Erreur lors de la suppression');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sauvegardes</h1>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creation...' : 'Nouvelle sauvegarde'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Fichier</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-sm font-medium">Statut</th>
                <th className="text-left p-3 text-sm font-medium">Date</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(backups as Backup[])?.map((backup) => (
                <tr key={backup.id}>
                  <td className="p-3 text-sm font-mono">{backup.fileName}</td>
                  <td className="p-3 text-sm">{backup.type}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      backup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      backup.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {backup.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{formatDateTime(backup.createdAt)}</td>
                  <td className="p-3 flex gap-2">
                    {backup.status === 'COMPLETED' && (
                      <>
                        <a
                          href={api.admin.backups.download(backup.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Telecharger
                        </a>
                        <button
                          onClick={() => restoreMutation.mutate(backup.id)}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          Restaurer
                        </button>
                      </>
                    )}
                    {confirmDeleteId === backup.id ? (
                      <>
                        <button
                          onClick={() => deleteMutation.mutate(backup.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs text-red-700 font-medium hover:underline disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? 'Suppression...' : 'Confirmer'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(backup.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
