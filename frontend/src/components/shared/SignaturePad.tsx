import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../ui/button';

interface SignaturePadProps {
  /** Called with the base64 data URI when user clicks Save */
  onSave: (dataUrl: string) => void;
  /** Disable drawing and buttons (e.g. while saving) */
  disabled?: boolean;
}

/**
 * Reusable signature capture canvas component.
 * Supports mouse and touch input for drawing signatures.
 */
export default function SignaturePad({ onSave, disabled = false }: SignaturePadProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  // ─── Initialize canvas with white background ───
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas internal resolution to match its displayed size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    hasDrawnRef.current = false;
  }, []);

  useEffect(() => {
    initCanvas();

    // Re-init on resize so the canvas stays crisp
    const handleResize = () => initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  // ─── Drawing helpers ───

  function getPointerPosition(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return;
    const pos = getPointerPosition(e);
    if (!pos) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    hasDrawnRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawingRef.current || disabled) return;
    const pos = getPointerPosition(e);
    if (!pos) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  // ─── Actions ───

  function handleClear() {
    initCanvas();
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('worksheet.drawSignature')}</p>
      <canvas
        ref={canvasRef}
        className="w-full border rounded cursor-crosshair bg-white"
        style={{ minHeight: 150, touchAction: 'none' }}
        // Mouse events
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        // Touch events
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          {t('worksheet.clearSignature')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={disabled || !hasDrawnRef.current}
        >
          {t('worksheet.saveSignature')}
        </Button>
      </div>
    </div>
  );
}
