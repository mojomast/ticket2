import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { api, type Attachment } from '../../api/client';
import { useTranslation } from '../../lib/i18n/hook';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  FileSpreadsheet,
  File,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function isText(mimeType: string): boolean {
  return mimeType.startsWith('text/') || mimeType === 'application/json';
}

function isPreviewable(mimeType: string): boolean {
  return isImage(mimeType) || isPdf(mimeType) || isText(mimeType);
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className="h-16 w-16 text-blue-500" />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return <FileSpreadsheet className="h-16 w-16 text-green-500" />;
  return <File className="h-16 w-16 text-muted-foreground" />;
}

// ── Component ────────────────────────────────────────────────────────

interface FileViewerProps {
  attachment: Attachment | null;
  attachments: Attachment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FileViewer({
  attachment,
  attachments,
  open,
  onOpenChange,
}: FileViewerProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  // Current index in the attachments list
  const currentIndex = attachment
    ? attachments.findIndex((a) => a.id === attachment.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < attachments.length - 1;

  // Reset zoom/rotation when attachment changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);
  }, [attachment?.id]);

  // Fetch text content for text files
  useEffect(() => {
    if (!attachment || !isText(attachment.mimeType)) return;
    setTextLoading(true);
    fetch(api.attachments.viewUrl(attachment.id), { credentials: 'include' })
      .then((res) => res.text())
      .then((text) => {
        setTextContent(text);
        setTextLoading(false);
      })
      .catch(() => {
        setTextContent(null);
        setTextLoading(false);
      });
  }, [attachment?.id, attachment?.mimeType]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && hasPrev) goTo(currentIndex - 1);
      if (e.key === 'ArrowRight' && hasNext) goTo(currentIndex + 1);
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 5));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.25));
      if (e.key === '0') { setZoom(1); setRotation(0); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function goTo(index: number) {
    const target = attachments[index];
    if (target) {
      // We simulate changing by calling the parent's onOpenChange cycle
      // Since we can't directly set the attachment, we use a custom event
      const event = new CustomEvent('fileviewer-navigate', { detail: target });
      window.dispatchEvent(event);
    }
  }

  if (!attachment) return null;

  const viewUrl = api.attachments.viewUrl(attachment.id);
  const downloadUrl = api.attachments.downloadUrl(attachment.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-medium truncate">
                {attachment.fileName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {attachment.uploader.firstName} {attachment.uploader.lastName}
                {' · '}
                {formatSize(attachment.fileSize)}
                {attachments.length > 1 && (
                  <span className="ml-2">
                    ({currentIndex + 1} / {attachments.length})
                  </span>
                )}
              </DialogDescription>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isImage(attachment.mimeType) && (
                <>
                  <button
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
                    className="rounded-md p-1.5 hover:bg-accent transition-colors"
                    title={t('fileViewer.zoomOut')}
                    aria-label={t('fileViewer.zoomOut')}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}
                    className="rounded-md p-1.5 hover:bg-accent transition-colors"
                    title={t('fileViewer.zoomIn')}
                    aria-label={t('fileViewer.zoomIn')}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="rounded-md p-1.5 hover:bg-accent transition-colors"
                    title={t('fileViewer.rotate')}
                    aria-label={t('fileViewer.rotate')}
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <div className="w-px h-5 bg-border mx-1" />
                </>
              )}

              <a
                href={downloadUrl}
                className="rounded-md p-1.5 hover:bg-accent transition-colors"
                title={t('attachment.download')}
                aria-label={t('common.download')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-auto relative bg-muted/30 flex items-center justify-center min-h-[300px]">
          {/* Prev / Next navigation overlays */}
          {hasPrev && (
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 border shadow-md p-2 hover:bg-background transition-colors"
              title={t('fileViewer.previous')}
              aria-label={t('fileViewer.previous')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 border shadow-md p-2 hover:bg-background transition-colors"
              title={t('fileViewer.next')}
              aria-label={t('fileViewer.next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Preview content */}
          {isImage(attachment.mimeType) ? (
            <div
              className="flex items-center justify-center p-4 overflow-auto w-full h-full"
              style={{ minHeight: 300 }}
            >
              <img
                src={viewUrl}
                alt={attachment.fileName}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  maxHeight: zoom === 1 ? '70vh' : undefined,
                  maxWidth: zoom === 1 ? '100%' : undefined,
                }}
                draggable={false}
              />
            </div>
          ) : isPdf(attachment.mimeType) ? (
            <iframe
              src={viewUrl}
              className="w-full h-full min-h-[70vh] border-0"
              title={attachment.fileName}
            />
          ) : isText(attachment.mimeType) ? (
            <div className="w-full h-full p-4 overflow-auto">
              {textLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  {t('common.loadingEllipsis')}
                </p>
              ) : textContent !== null ? (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-background rounded-md border p-4 max-h-[70vh] overflow-auto">
                  {textContent}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('fileViewer.loadError')}
                </p>
              )}
            </div>
          ) : (
            /* Non-previewable file */
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              {getFileIcon(attachment.mimeType)}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">{attachment.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {t('fileViewer.noPreview')}
                </p>
              </div>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                {t('attachment.download')}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple byte formatter (no i18n needed here — used in the dialog header)
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export { isPreviewable, isImage };
