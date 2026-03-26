import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Message } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { formatRelativeTime } from '../../lib/utils';
import { ROLE_LABELS } from '../../lib/constants';

interface MessageThreadProps {
  ticketId: string;
}

export default function MessageThread({ ticketId }: MessageThreadProps) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', ticketId],
    queryFn: () => api.messages.list(ticketId),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.messages.create(ticketId, { content, isInternal }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', ticketId] });
      toast.success('Message envoye');
    },
    onError: () => toast.error('Erreur lors de l\'envoi du message'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, newContent }: { id: string; newContent: string }) =>
      api.messages.update(id, newContent),
    onSuccess: () => {
      setEditingId(null);
      setEditContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', ticketId] });
      toast.success('Message modifie');
    },
    onError: () => toast.error('Erreur lors de la modification du message'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.messages.delete(id),
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['messages', ticketId] });
      toast.success('Message supprime');
    },
    onError: () => {
      setDeletingId(null);
      toast.error('Erreur lors de la suppression du message');
    },
  });

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {(messages as Message[]).map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
              msg.isInternal
                ? 'bg-yellow-50 border border-yellow-200'
                : msg.authorId === user?.id
                  ? 'bg-primary/5 border border-primary/20 ml-8'
                  : 'bg-muted border ml-0 mr-8'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {msg.author.firstName} {msg.author.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[msg.author.role] || msg.author.role}
                </span>
                {msg.isInternal && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                    Note interne
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(msg.createdAt)}
                </span>
                {editingId !== msg.id && deletingId !== msg.id && (() => {
                  const isAuthor = msg.authorId === user?.id;
                  const createdMs = new Date(msg.createdAt).getTime();
                  const withinFiveMin = Date.now() - createdMs < 5 * 60 * 1000;
                  const canEdit = isAuthor && withinFiveMin;
                  const canDelete = user?.role === 'ADMIN';
                  if (!canEdit && !canDelete) return null;
                  return (
                    <>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditContent(msg.content);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Modifier
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeletingId(msg.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            {editingId === msg.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: msg.id, newContent: editContent })}
                    disabled={!editContent.trim() || updateMutation.isPending}
                    className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditContent('');
                    }}
                    className="text-xs px-2 py-1 text-muted-foreground hover:underline"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : deletingId === msg.id ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-red-600">Supprimer ce message ?</span>
                <button
                  onClick={() => deleteMutation.mutate(msg.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Suppression...' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="text-xs px-2 py-1 text-muted-foreground hover:underline"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        ))}
        {(messages as Message[]).length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Aucun message</p>
        )}
      </div>

      {/* Message input */}
      <div className="border-t pt-4 space-y-2">
        {user?.role !== 'CUSTOMER' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300"
            />
            Note interne (invisible au client)
          </label>
        )}
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ecrire un message..."
            className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => sendMutation.mutate()}
            disabled={!content.trim() || sendMutation.isPending}
            className="self-end px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
