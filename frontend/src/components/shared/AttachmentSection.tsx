import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Attachment } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime } from '../../lib/utils';
import HelpTooltip from './HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

// ─── Helpers ───

function formatFileSize(bytes: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (bytes < 1024) return t('attachment.sizeBytes', { size: bytes });
  if (bytes < 1024 * 1024) return t('attachment.sizeKb', { size: (bytes / 1024).toFixed(1) });
  return t('attachment.sizeMb', { size: (bytes / 1024 / 1024).toFixed(2) });
}

/** Map MIME type to a friendly icon/label */
function fileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.startsWith('text/')) return '📃';
  if (mimeType === 'application/zip') return '📦';
  return '📎';
}

// ─── Component ───

interface AttachmentSectionProps {
  ticketId: string;
  /** Whether this user can upload files */
  canUpload?: boolean;
  /** Whether this user can delete any attachment (admin) or just their own */
  isAdmin?: boolean;
}

export default function AttachmentSection({
  ticketId,
  canUpload = true,
  isAdmin = false,
}: AttachmentSectionProps) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ─── Query attachments ───
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', ticketId],
    queryFn: () => api.attachments.list(ticketId),
    enabled: !!ticketId,
  });

  // ─── Upload mutation ───
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.attachments.upload(ticketId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] });
      toast.success(t('attachment.uploadSuccess'));
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => {
      toast.error(err.message || t('attachment.uploadError'));
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // ─── Delete mutation ───
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.attachments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] });
      toast.success(t('attachment.deleteSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('attachment.deleteError'));
    },
  });

  // ─── Handlers ───

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    uploadMutation.mutate(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function canDelete(attachment: Attachment): boolean {
    if (isAdmin) return true;
    return attachment.uploadedBy === user?.id;
  }

  // ─── Render ───

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('attachment.title')}</h3>
        <span className="text-xs text-muted-foreground">
          {t('attachment.count', { count: (attachments as Attachment[]).length, plural: (attachments as Attachment[]).length !== 1 ? 's' : '' })}
        </span>
      </div>

      {/* Attachments list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : (attachments as Attachment[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('attachment.noAttachments')}</p>
      ) : (
        <div className="space-y-2">
          {(attachments as Attachment[]).map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-3 border rounded-md p-3 bg-background hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-lg flex-shrink-0" title={att.mimeType}>
                  {fileTypeIcon(att.mimeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" title={att.fileName}>
                    {att.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.fileSize, t)}
                    {' · '}
                    {att.uploader.firstName} {att.uploader.lastName}
                    {' · '}
                    {formatDateTime(att.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <HelpTooltip content={t('attachment.downloadTooltip')} side="top">
                  <a
                    href={api.attachments.downloadUrl(att.id)}
                    className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('attachment.download')}
                  </a>
                </HelpTooltip>

                {canDelete(att) && (
                  <HelpTooltip content={t('attachment.deleteTooltip')} side="top">
                    <button
                      onClick={() => {
                        if (window.confirm(t('attachment.deleteConfirm', { name: att.fileName }))) {
                          deleteMutation.mutate(att.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-md border border-red-200 bg-background px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {t('attachment.delete')}
                    </button>
                  </HelpTooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
          />

          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">{t('attachment.uploading')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t('attachment.dropzone')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('attachment.dropzoneHint')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
