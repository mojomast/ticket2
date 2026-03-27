import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { formatDate, formatDateTime } from '../../lib/utils';
import {
  WS_STATUS_COLORS,
} from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

// ─── Helper: format money ───
function money(value: number | null | undefined): string {
  return (value ?? 0).toFixed(2) + ' $';
}

export default function PortalWorksheetDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  // ─── Query ───
  const { data: ws, isLoading, error } = useQuery({
    queryKey: ['worksheet', id],
    queryFn: () => api.worksheets.get(id!),
    enabled: !!id,
  });

  const handleDownloadPdf = () => {
    window.open(api.worksheets.pdfUrl(id!), '_blank');
  };

  // ─── Loading / Error states ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !ws) {
    return (
      <div className="space-y-4">
        <Link to="/portail/feuilles-travail" className="text-primary hover:underline text-sm">
          ← {t('worksheet.backToList')}
        </Link>
        <p className="text-destructive">{t('worksheet.notFound')}</p>
      </div>
    );
  }

  const statusColors = WS_STATUS_COLORS[ws.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  // Only show notes visible to customers
  const visibleNotes = ws.notes.filter((n) => n.noteType === 'VISIBLE_CLIENT');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ═══════════════════════════════════════════════
          1. HEADER — Back link, status badge, reference
         ═══════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/portail/feuilles-travail" className="text-primary hover:underline text-sm">
            ← {t('worksheet.backToList')}
          </Link>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {t(`label.wsStatus.${ws.status}`) || ws.status}
          </span>

          <h1 className="text-2xl font-bold">
            {ws.workOrder?.orderNumber || ws.ticket?.ticketNumber || t('worksheet.unscheduledCall')}
          </h1>
        </div>

        {/* PDF download button */}
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          {t('worksheet.downloadPdf')}
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════
          2. WORKSHEET INFO — technician, dates
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('worksheet.worksheetInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('worksheet.technician')}</span>
            <span>{ws.technician.firstName} {ws.technician.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('common.created')}</span>
            <span>{formatDateTime(ws.createdAt)}</span>
          </div>
          {ws.submittedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('worksheet.submitted')}</span>
              <span>{formatDateTime(ws.submittedAt)}</span>
            </div>
          )}
          {ws.approvedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('worksheet.approvedAt')}</span>
              <span>{formatDateTime(ws.approvedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          3. WORK ORDER / TICKET INFO
         ═══════════════════════════════════════════════ */}
      {(ws.workOrder || ws.ticket) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {ws.workOrder ? t('worksheet.woInfo') : t('worksheet.ticketInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {ws.workOrder ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.workOrder')}</span>
                  <Link
                    to={`/portail/bons-travail/${ws.workOrder.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {ws.workOrder.orderNumber}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.customer')}</span>
                  <span>{ws.workOrder.customerName}</span>
                </div>
                {ws.workOrder.deviceBrand && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('worksheet.device')}</span>
                    <span>{ws.workOrder.deviceBrand} {ws.workOrder.deviceModel}</span>
                  </div>
                )}
                {ws.workOrder.reportedIssue && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground shrink-0">{t('worksheet.issue')}</span>
                    <span className="text-right ml-4">{ws.workOrder.reportedIssue}</span>
                  </div>
                )}
              </>
            ) : ws.ticket ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.ticketRef')}</span>
                  <Link
                    to={`/portail/billets/${ws.ticket.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {ws.ticket.ticketNumber}
                  </Link>
                </div>
                {ws.ticket.title && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground shrink-0">{t('worksheet.issue')}</span>
                    <span className="text-right ml-4">{ws.ticket.title}</span>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          4. SUMMARY — read-only text
         ═══════════════════════════════════════════════ */}
      {ws.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{ws.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          5. FINANCIAL SUMMARY
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('worksheet.financialSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{t('worksheet.totalLabor')}</p>
              <p className="text-lg font-semibold tabular-nums">{money(ws.totalLabor)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{t('worksheet.totalParts')}</p>
              <p className="text-lg font-semibold tabular-nums">{money(ws.totalParts)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{t('worksheet.totalTravel')}</p>
              <p className="text-lg font-semibold tabular-nums">{money(ws.totalTravel)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">{t('worksheet.grandTotal')}</p>
              <p className="text-xl font-bold tabular-nums text-primary">{money(ws.grandTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          6. LABOR ENTRIES
         ═══════════════════════════════════════════════ */}
      {ws.laborEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.laborTab')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">{t('worksheet.laborType')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.description')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.startTime')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.endTime')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.billableHours')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.hourlyRate')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ws.laborEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {t(`label.laborType.${entry.laborType}`) || entry.laborType}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">
                        {entry.description || '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatDateTime(entry.startTime)}</td>
                      <td className="p-3 whitespace-nowrap">
                        {entry.endTime ? formatDateTime(entry.endTime) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {entry.billableHours != null ? entry.billableHours.toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums">{money(entry.hourlyRate)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{money(entry.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          7. PARTS — NO supplier cost or margin columns
         ═══════════════════════════════════════════════ */}
      {ws.parts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.partsTab')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">{t('worksheet.partName')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.partNumber')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.quantity')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.unitPrice')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ws.parts.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{part.partName}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {part.partNumber || '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums">{part.quantity}</td>
                      <td className="p-3 text-right tabular-nums">{money(part.unitPrice)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{money(part.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          8. TRAVEL ENTRIES
         ═══════════════════════════════════════════════ */}
      {ws.travelEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.travelTab')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">{t('worksheet.travelDate')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.departureAddress')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.arrivalAddress')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.distanceKm')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.ratePerKm')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ws.travelEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30">
                      <td className="p-3 whitespace-nowrap">{formatDate(entry.travelDate)}</td>
                      <td className="p-3 text-muted-foreground">{entry.departureAddress || '—'}</td>
                      <td className="p-3 text-muted-foreground">{entry.arrivalAddress || '—'}</td>
                      <td className="p-3 text-right tabular-nums">{entry.distanceKm.toFixed(1)} km</td>
                      <td className="p-3 text-right tabular-nums">{money(entry.ratePerKm)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{money(entry.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          9. NOTES — Only VISIBLE_CLIENT notes
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('worksheet.customerVisible')}</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleNotes.length > 0 ? (
            <div className="space-y-3">
              {visibleNotes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {t(`label.wsNoteType.${note.noteType}`) || note.noteType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {note.author.firstName} {note.author.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('worksheet.noVisibleNotes')}</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          10. SIGNATURES
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technician signature */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.techSignature')}</CardTitle>
          </CardHeader>
          <CardContent>
            {ws.techSignature ? (
              <div className="space-y-2">
                <img
                  src={ws.techSignature}
                  alt={t('worksheet.techSignature')}
                  className="max-h-32 border rounded bg-white p-2"
                />
                {ws.techSignedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('worksheet.signedAt')}: {formatDateTime(ws.techSignedAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('worksheet.noSignature')}</p>
            )}
          </CardContent>
        </Card>

        {/* Customer signature */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.custSignature')}</CardTitle>
          </CardHeader>
          <CardContent>
            {ws.custSignature ? (
              <div className="space-y-2">
                <img
                  src={ws.custSignature}
                  alt={t('worksheet.custSignature')}
                  className="max-h-32 border rounded bg-white p-2"
                />
                {ws.custSignedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('worksheet.signedAt')}: {formatDateTime(ws.custSignedAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('worksheet.noSignature')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
