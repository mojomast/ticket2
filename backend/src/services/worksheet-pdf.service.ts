import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { logger } from '../lib/logger.js';

// ─── Types (mirrors the Prisma includes from worksheet.service) ───

interface WorksheetForPdf {
  id: string;
  status: string;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  billedAt: Date | null;
  totalLabor: number;
  totalParts: number;
  totalTravel: number;
  grandTotal: number;
  summary: string | null;
  techSignature: string | null;
  techSignedAt: Date | null;
  custSignature: string | null;
  custSignedAt: Date | null;
  technician: { firstName: string; lastName: string; email: string };
  reviewedBy?: { firstName: string; lastName: string } | null;
  approvedBy?: { firstName: string; lastName: string } | null;
  workOrder: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    deviceBrand: string;
    deviceModel: string;
    deviceSerial?: string | null;
    deviceType: string;
    reportedIssue: string;
    customer?: {
      companyName?: string | null;
      address?: string | null;
      phone?: string | null;
    } | null;
  } | null;
  ticket?: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    customerId: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
    } | null;
  } | null;
  laborEntries: Array<{
    laborType: string;
    description: string | null;
    startTime: Date;
    endTime: Date | null;
    breakMinutes: number;
    hourlyRate: number;
    billableHours: number | null;
    lineTotal: number | null;
  }>;
  parts: Array<{
    partName: string;
    partNumber: string | null;
    supplier: string | null;
    supplierCost: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    warrantyMonths: number | null;
  }>;
  travelEntries: Array<{
    departureAddress: string | null;
    arrivalAddress: string | null;
    distanceKm: number;
    ratePerKm: number;
    lineTotal: number;
    travelDate: Date;
    notes: string | null;
  }>;
  notes: Array<{
    noteType: string;
    content: string;
    createdAt: Date;
    author: { firstName: string; lastName: string };
  }>;
  followUps: Array<{
    followUpType: string;
    scheduledDate: Date;
    notes: string | null;
    completed: boolean;
    completedAt: Date | null;
  }>;
}

// ─── Constants ───

const PAGE_WIDTH = 595.28;  // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const COLOR_PRIMARY = rgb(0.1, 0.2, 0.5);
const COLOR_DARK = rgb(0.1, 0.1, 0.1);
const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
const COLOR_LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const COLOR_TABLE_BG = rgb(0.95, 0.95, 0.97);

// ─── Helpers ───

/**
 * Sanitize text for pdf-lib StandardFonts (WinAnsi / Windows-1252 encoding).
 * Characters outside WinAnsi are replaced with '?' to prevent encodeText crashes.
 * WinAnsi supports: ASCII 0x20-0x7E, plus specific chars in 0x80-0xFF range
 * (accented Latin chars like é, è, ê, ë, à, ç, ñ, ü, etc.)
 */
// WinAnsi maps specific Unicode code points in the 0x80-0x9F range:
// 0x2013 (–), 0x2014 (—), 0x2018 ('), 0x2019 ('), 0x201A (‚),
// 0x201C ("), 0x201D ("), 0x201E („), 0x2026 (…), 0x2039 (‹), 0x203A (›),
// 0x0152 (Œ), 0x0153 (œ), 0x0160 (Š), 0x0161 (š), 0x0178 (Ÿ),
// 0x017D (Ž), 0x017E (ž), 0x0192 (ƒ), 0x02C6 (ˆ), 0x02DC (~),
// 0x2020 (†), 0x2021 (‡), 0x2030 (‰), 0x2122 (™)
const WINANSI_EXTRA_CODEPOINTS = new Set([
  0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
  0x2026, 0x2039, 0x203A, 0x0152, 0x0153, 0x0160, 0x0161, 0x0178,
  0x017D, 0x017E, 0x0192, 0x02C6, 0x02DC, 0x2020, 0x2021, 0x2030, 0x2122,
]);

function sanitizeForPdf(text: string): string {
  const result: string[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0x7E) {
      // Standard ASCII printable range
      result.push(ch);
    } else if (code >= 0xA0 && code <= 0xFF) {
      // Latin-1 supplement (0xA0-0xFF) — all mapped in WinAnsi
      result.push(ch);
    } else if (code === 0x0A || code === 0x0D || code === 0x09) {
      // Newline, carriage return, tab — replace with space
      result.push(' ');
    } else if (WINANSI_EXTRA_CODEPOINTS.has(code)) {
      result.push(ch);
    } else {
      result.push('?');
    }
  }
  return result.join('');
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toFixed(2)} $`;
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return '—';
  return `${h.toFixed(2)} h`;
}

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  REVISEE: 'Révisée',
  APPROUVEE: 'Approuvée',
  FACTUREE: 'Facturée',
  ANNULEE: 'Annulée',
};

const LABOR_TYPE_LABELS: Record<string, string> = {
  DIAGNOSTIC: 'Diagnostic',
  REPARATION: 'Réparation',
  INSTALLATION: 'Installation',
  CONSULTATION: 'Consultation',
  GARANTIE: 'Garantie',
  REPRISE: 'Reprise',
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  INTERNE: 'Interne',
  VISIBLE_CLIENT: 'Visible client',
  DIAGNOSTIC_FINDING: 'Diagnostic',
  PROCEDURE: 'Procédure',
};

const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
  VERIFICATION_GARANTIE: 'Vérification garantie',
  RAPPEL_CLIENT: 'Rappel client',
  REVERIFICATION: 'Revérification',
  ARRIVEE_PIECES: 'Arrivée pièces',
  SUIVI_DEVIS: 'Suivi devis',
};

// ─── PDF Drawing Context ───

class PdfDrawer {
  private doc: PDFDocument;
  private page: PDFPage;
  private y: number;
  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;

  constructor(doc: PDFDocument, page: PDFPage) {
    this.doc = doc;
    this.page = page;
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  async init() {
    this.fontRegular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  checkPage(neededHeight: number = 80) {
    if (this.y < MARGIN_BOTTOM + neededHeight) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN_TOP;
    }
  }

  drawTitle(text: string, size: number = 18) {
    this.checkPage(40);
    this.page.drawText(sanitizeForPdf(text), {
      x: MARGIN_LEFT, y: this.y,
      size, font: this.fontBold, color: COLOR_PRIMARY,
    });
    this.y -= size + 8;
  }

  drawSectionHeader(text: string) {
    this.checkPage(50);
    this.y -= 8;
    // Background bar
    this.page.drawRectangle({
      x: MARGIN_LEFT, y: this.y - 4,
      width: CONTENT_WIDTH, height: 20,
      color: COLOR_PRIMARY,
    });
    this.page.drawText(sanitizeForPdf(text), {
      x: MARGIN_LEFT + 6, y: this.y,
      size: 11, font: this.fontBold, color: rgb(1, 1, 1),
    });
    this.y -= 28;
  }

  drawText(text: string, opts: { size?: number; bold?: boolean; color?: typeof COLOR_DARK; indent?: number; maxWidth?: number } = {}) {
    const { size = 9, bold = false, color = COLOR_DARK, indent = 0, maxWidth = CONTENT_WIDTH - indent } = opts;
    const font = bold ? this.fontBold : this.fontRegular;
    const safeText = sanitizeForPdf(text);

    // Simple word-wrap
    const words = safeText.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && line) {
        this.checkPage(size + 4);
        this.page.drawText(line, { x: MARGIN_LEFT + indent, y: this.y, size, font, color });
        this.y -= size + 4;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      this.checkPage(size + 4);
      this.page.drawText(line, { x: MARGIN_LEFT + indent, y: this.y, size, font, color });
      this.y -= size + 4;
    }
  }

  drawKeyValue(key: string, value: string, indent: number = 0) {
    this.checkPage(16);
    const safeKey = sanitizeForPdf(key);
    const safeValue = sanitizeForPdf(value);
    const keyWidth = this.fontBold.widthOfTextAtSize(safeKey, 9);
    this.page.drawText(safeKey, {
      x: MARGIN_LEFT + indent, y: this.y,
      size: 9, font: this.fontBold, color: COLOR_GRAY,
    });
    this.page.drawText(safeValue, {
      x: MARGIN_LEFT + indent + keyWidth + 4, y: this.y,
      size: 9, font: this.fontRegular, color: COLOR_DARK,
    });
    this.y -= 14;
  }

  drawLine() {
    this.page.drawLine({
      start: { x: MARGIN_LEFT, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: this.y },
      thickness: 0.5, color: COLOR_LIGHT_GRAY,
    });
    this.y -= 8;
  }

  drawTableRow(cols: Array<{ text: string; width: number; align?: 'left' | 'right' }>, opts: { bold?: boolean; bg?: boolean; size?: number } = {}) {
    const { bold = false, bg = false, size = 8 } = opts;
    const rowHeight = size + 8;
    this.checkPage(rowHeight + 4);

    if (bg) {
      this.page.drawRectangle({
        x: MARGIN_LEFT, y: this.y - 4,
        width: CONTENT_WIDTH, height: rowHeight,
        color: COLOR_TABLE_BG,
      });
    }

    const font = bold ? this.fontBold : this.fontRegular;
    let x = MARGIN_LEFT;
    for (const col of cols) {
      const safeText = sanitizeForPdf(col.text);
      const textWidth = font.widthOfTextAtSize(safeText, size);
      const drawX = col.align === 'right' ? x + col.width - textWidth - 4 : x + 4;
      this.page.drawText(safeText, {
        x: drawX, y: this.y,
        size, font, color: COLOR_DARK,
      });
      x += col.width;
    }
    this.y -= rowHeight;
  }

  spacer(h: number = 6) {
    this.y -= h;
  }

  async drawSignature(dataUri: string | null, label: string, x: number) {
    const safeLabel = sanitizeForPdf(label);
    if (!dataUri) {
      this.page.drawText(`${safeLabel}: —`, {
        x, y: this.y,
        size: 9, font: this.fontRegular, color: COLOR_GRAY,
      });
      return;
    }

    try {
      // Extract base64 data from data URI
      const base64Match = dataUri.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!base64Match) {
        this.page.drawText(`${safeLabel}: (format invalide)`, {
          x, y: this.y,
          size: 9, font: this.fontRegular, color: COLOR_GRAY,
        });
        return;
      }

      const imageBytes = Buffer.from(base64Match[2], 'base64');
      const imageType = base64Match[1];
      const image = imageType === 'png'
        ? await this.doc.embedPng(imageBytes)
        : await this.doc.embedJpg(imageBytes);

      const scaledDims = image.scaleToFit(150, 60);
      this.page.drawText(`${safeLabel}:`, {
        x, y: this.y + scaledDims.height + 4,
        size: 9, font: this.fontBold, color: COLOR_GRAY,
      });
      this.page.drawImage(image, {
        x, y: this.y,
        width: scaledDims.width, height: scaledDims.height,
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to embed signature image in PDF');
      this.page.drawText(`${safeLabel}: (erreur image)`, {
        x, y: this.y,
        size: 9, font: this.fontRegular, color: COLOR_GRAY,
      });
    }
  }

  getY() { return this.y; }
  setY(v: number) { this.y = v; }
  getPage() { return this.page; }
}

// ─── Main Generator ───

export async function generateWorksheetPdf(ws: any): Promise<Uint8Array> {
  const w = ws as WorksheetForPdf;

  // Derive reference number and customer info from workOrder, ticket, or standalone
  const refNumber = w.workOrder?.orderNumber ?? w.ticket?.ticketNumber ?? '—';
  const customerName = w.workOrder?.customerName
    ?? (w.ticket?.customer ? `${w.ticket.customer.firstName} ${w.ticket.customer.lastName}` : '—');
  const customerPhone = w.workOrder?.customerPhone ?? w.ticket?.customer?.phone ?? '—';
  const customerEmail = w.workOrder?.customerEmail ?? w.ticket?.customer?.email ?? null;
  const companyName = w.workOrder?.customer?.companyName ?? null;
  const customerAddress = w.workOrder?.customer?.address ?? null;

  const doc = await PDFDocument.create();
  doc.setTitle(`Feuille de travail — ${refNumber}`);
  doc.setAuthor('Valitek');
  doc.setSubject(`Feuille de travail ${w.id.slice(0, 8)}`);
  doc.setCreationDate(new Date());

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const d = new PdfDrawer(doc, page);
  await d.init();

  // ─── Header ───
  d.drawTitle('VALITEK', 22);
  d.drawText('Services informatiques', { size: 10, color: COLOR_GRAY });
  d.spacer(4);
  d.drawTitle('Feuille de travail', 16);
  d.drawLine();

  // ─── Worksheet Info ───
  d.drawKeyValue('N° feuille:', w.id.slice(0, 8).toUpperCase());
  if (w.workOrder) {
    d.drawKeyValue('Bon de travail:', w.workOrder.orderNumber);
  } else if (w.ticket) {
    d.drawKeyValue('Billet:', w.ticket.ticketNumber);
  } else {
    d.drawKeyValue('Référence:', 'Appel non planifié');
  }
  d.drawKeyValue('Statut:', STATUS_LABELS[w.status] || w.status);
  d.drawKeyValue('Technicien:', `${w.technician.firstName} ${w.technician.lastName}`);
  d.drawKeyValue('Date de création:', formatDateTime(w.createdAt));
  if (w.submittedAt) d.drawKeyValue('Date de soumission:', formatDateTime(w.submittedAt));
  if (w.approvedAt) d.drawKeyValue('Date d\'approbation:', formatDateTime(w.approvedAt));
  if (w.approvedBy) d.drawKeyValue('Approuvé par:', `${w.approvedBy.firstName} ${w.approvedBy.lastName}`);
  d.spacer(4);

  // ─── Customer / Device Info ───
  d.drawSectionHeader('Information client & appareil');
  d.drawKeyValue('Client:', customerName);
  if (companyName) {
    d.drawKeyValue('Entreprise:', companyName);
  }
  d.drawKeyValue('Téléphone:', customerPhone);
  if (customerEmail) d.drawKeyValue('Courriel:', customerEmail);
  if (customerAddress) d.drawKeyValue('Adresse:', customerAddress);
  d.spacer(4);
  if (w.workOrder) {
    d.drawKeyValue('Appareil:', `${w.workOrder.deviceBrand} ${w.workOrder.deviceModel}`);
    d.drawKeyValue('Type:', w.workOrder.deviceType);
    if (w.workOrder.deviceSerial) d.drawKeyValue('N° série:', w.workOrder.deviceSerial);
    d.spacer(4);
    d.drawText(`Problème signalé: ${w.workOrder.reportedIssue}`, { size: 9, color: COLOR_GRAY });
  } else if (w.ticket) {
    d.drawText(`Titre du billet: ${w.ticket.title}`, { size: 9, color: COLOR_GRAY });
  } else {
    d.drawText('Appel non planifié — aucun appareil associé', { size: 9, color: COLOR_GRAY });
  }
  d.spacer(8);

  // ─── Labor Entries ───
  if (w.laborEntries.length > 0) {
    d.drawSectionHeader('Main-d\'oeuvre');

    const laborCols = [
      { text: 'Type', width: 90 },
      { text: 'Description', width: 170 },
      { text: 'Début', width: 70 },
      { text: 'Heures', width: 50, align: 'right' as const },
      { text: 'Taux', width: 55, align: 'right' as const },
      { text: 'Total', width: 60, align: 'right' as const },
    ];
    d.drawTableRow(laborCols, { bold: true, bg: true });

    for (let i = 0; i < w.laborEntries.length; i++) {
      const entry = w.laborEntries[i];
      d.drawTableRow([
        { text: LABOR_TYPE_LABELS[entry.laborType] || entry.laborType, width: 90 },
        { text: (entry.description || '').slice(0, 45), width: 170 },
        { text: formatDateTime(entry.startTime), width: 70 },
        { text: formatHours(entry.billableHours), width: 50, align: 'right' },
        { text: formatMoney(entry.hourlyRate), width: 55, align: 'right' },
        { text: formatMoney(entry.lineTotal), width: 60, align: 'right' },
      ], { bg: i % 2 === 1 });
    }

    d.spacer(4);
    d.drawTableRow([
      { text: '', width: 380 },
      { text: 'Sous-total main-d\'oeuvre:', width: 75, align: 'right' },
      { text: formatMoney(w.totalLabor), width: 40, align: 'right' },
    ], { bold: true });
    d.spacer(8);
  }

  // ─── Parts ───
  if (w.parts.length > 0) {
    d.drawSectionHeader('Pièces');

    const partCols = [
      { text: 'Pièce', width: 150 },
      { text: 'N° pièce', width: 80 },
      { text: 'Qté', width: 40, align: 'right' as const },
      { text: 'Prix unit.', width: 65, align: 'right' as const },
      { text: 'Garantie', width: 60 },
      { text: 'Total', width: 60, align: 'right' as const },
    ];
    d.drawTableRow(partCols, { bold: true, bg: true });

    for (let i = 0; i < w.parts.length; i++) {
      const part = w.parts[i];
      d.drawTableRow([
        { text: part.partName.slice(0, 40), width: 150 },
        { text: (part.partNumber || '—').slice(0, 20), width: 80 },
        { text: String(part.quantity), width: 40, align: 'right' },
        { text: formatMoney(part.unitPrice), width: 65, align: 'right' },
        { text: part.warrantyMonths ? `${part.warrantyMonths} mois` : '—', width: 60 },
        { text: formatMoney(part.lineTotal), width: 60, align: 'right' },
      ], { bg: i % 2 === 1 });
    }

    d.spacer(4);
    d.drawTableRow([
      { text: '', width: 395 },
      { text: 'Sous-total pièces:', width: 60, align: 'right' },
      { text: formatMoney(w.totalParts), width: 40, align: 'right' },
    ], { bold: true });
    d.spacer(8);
  }

  // ─── Travel ───
  if (w.travelEntries.length > 0) {
    d.drawSectionHeader('Déplacements');

    const travelCols = [
      { text: 'Date', width: 70 },
      { text: 'Départ', width: 120 },
      { text: 'Arrivée', width: 120 },
      { text: 'Km', width: 50, align: 'right' as const },
      { text: 'Taux/km', width: 55, align: 'right' as const },
      { text: 'Total', width: 60, align: 'right' as const },
    ];
    d.drawTableRow(travelCols, { bold: true, bg: true });

    for (let i = 0; i < w.travelEntries.length; i++) {
      const entry = w.travelEntries[i];
      d.drawTableRow([
        { text: formatDate(entry.travelDate), width: 70 },
        { text: (entry.departureAddress || '—').slice(0, 30), width: 120 },
        { text: (entry.arrivalAddress || '—').slice(0, 30), width: 120 },
        { text: `${entry.distanceKm.toFixed(1)}`, width: 50, align: 'right' },
        { text: formatMoney(entry.ratePerKm), width: 55, align: 'right' },
        { text: formatMoney(entry.lineTotal), width: 60, align: 'right' },
      ], { bg: i % 2 === 1 });
    }

    d.spacer(4);
    d.drawTableRow([
      { text: '', width: 380 },
      { text: 'Sous-total déplacements:', width: 75, align: 'right' },
      { text: formatMoney(w.totalTravel), width: 40, align: 'right' },
    ], { bold: true });
    d.spacer(8);
  }

  // ─── Grand Total ───
  d.checkPage(50);
  d.drawLine();
  d.drawTableRow([
    { text: '', width: 340 },
    { text: 'TOTAL GÉNÉRAL:', width: 115, align: 'right' },
    { text: formatMoney(w.grandTotal), width: 40, align: 'right' },
  ], { bold: true, size: 11 });
  d.spacer(12);

  // ─── Summary ───
  if (w.summary) {
    d.drawSectionHeader('Résumé des travaux');
    d.drawText(w.summary, { size: 9 });
    d.spacer(8);
  }

  // ─── Notes (only client-visible + diagnostic + procedure for PDF) ───
  const visibleNotes = w.notes.filter(
    (n) => n.noteType !== 'INTERNE',
  );
  if (visibleNotes.length > 0) {
    d.drawSectionHeader('Notes');
    for (const note of visibleNotes) {
      d.drawKeyValue(
        `${NOTE_TYPE_LABELS[note.noteType] || note.noteType} — ${note.author.firstName} ${note.author.lastName} (${formatDateTime(note.createdAt)}):`,
        '',
      );
      d.drawText(note.content, { indent: 8, size: 8 });
      d.spacer(4);
    }
    d.spacer(4);
  }

  // ─── Follow-Ups ───
  if (w.followUps.length > 0) {
    d.drawSectionHeader('Suivis planifiés');
    for (const fu of w.followUps) {
      // Note: Using ASCII-safe symbols because pdf-lib StandardFonts only support WinAnsi encoding
      // (Unicode chars like ✓ U+2713 and ○ U+25CB would crash encodeText)
      const statusStr = fu.completed ? '[X] Complété' : '[ ] En attente';
      d.drawKeyValue(
        `${FOLLOWUP_TYPE_LABELS[fu.followUpType] || fu.followUpType}:`,
        `${formatDate(fu.scheduledDate)} — ${statusStr}`,
      );
      if (fu.notes) {
        d.drawText(fu.notes, { indent: 8, size: 8, color: COLOR_GRAY });
      }
    }
    d.spacer(8);
  }

  // ─── Signatures ───
  d.checkPage(100);
  d.drawSectionHeader('Signatures');
  d.spacer(4);

  const sigStartY = d.getY();
  await d.drawSignature(w.techSignature, 'Technicien', MARGIN_LEFT);
  if (w.techSignedAt) {
    d.setY(d.getY() - 4);
    d.drawText(`Signé le ${formatDateTime(w.techSignedAt)}`, { size: 7, color: COLOR_GRAY });
  }

  d.setY(sigStartY);
  await d.drawSignature(w.custSignature, 'Client', MARGIN_LEFT + 250);
  if (w.custSignedAt) {
    d.setY(d.getY() - 4);
    d.drawText(`Signé le ${formatDateTime(w.custSignedAt)}`, { size: 7, color: COLOR_GRAY, indent: 250 });
  }

  // ─── Footer ───
  const allPages = doc.getPages();
  const footerFont = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < allPages.length; i++) {
    const pg = allPages[i];
    const footerText = sanitizeForPdf(`Valitek — Feuille de travail ${refNumber} — Page ${i + 1}/${allPages.length}`);
    const footerWidth = footerFont.widthOfTextAtSize(footerText, 7);
    pg.drawText(footerText, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: 25,
      size: 7, font: footerFont, color: COLOR_GRAY,
    });
  }

  return await doc.save();
}
