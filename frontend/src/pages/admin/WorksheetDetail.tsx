import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, LaborEntry, PartUsed, TravelEntry, WorksheetNote, FollowUp } from '../../api/client';
import { formatDate, formatDateTime } from '../../lib/utils';
import { WS_STATUS_LABELS, WS_STATUS_COLORS, LABOR_TYPE_LABELS, WS_NOTE_TYPE_LABELS, FOLLOWUP_TYPE_LABELS } from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

// ─── Helper: format money ───
function money(value: number | null | undefined): string {
  return (value ?? 0).toFixed(2) + ' $';
}

// ─── Status transition rules for admin actions ───
function canApprove(status: string): boolean {
  return status === 'SOUMISE' || status === 'REVISEE';
}

function canRequestRevision(status: string): boolean {
  return status === 'SOUMISE';
}

function canMarkBilled(status: string): boolean {
  return status === 'APPROUVEE';
}

function canCancel(status: string): boolean {
  return status === 'BROUILLON' || status === 'APPROUVEE';
}

/** Admin can edit worksheet data when status is BROUILLON or REVISEE */
function canEdit(status: string): boolean {
  return status === 'BROUILLON' || status === 'REVISEE';
}

export default function AdminWorksheetDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // ─── Summary editing state ───
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');

  // ─── Form visibility toggles ───
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);
  const [showTravelForm, setShowTravelForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  // ─── Labor form state ───
  const [laborType, setLaborType] = useState('DIAGNOSTIC');
  const [laborDescription, setLaborDescription] = useState('');
  const [laborStartTime, setLaborStartTime] = useState('');
  const [laborEndTime, setLaborEndTime] = useState('');
  const [laborBreakMinutes, setLaborBreakMinutes] = useState('0');
  const [laborHourlyRate, setLaborHourlyRate] = useState('85');

  // ─── Labor edit state ───
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  const [editLaborType, setEditLaborType] = useState('DIAGNOSTIC');
  const [editLaborDescription, setEditLaborDescription] = useState('');
  const [editLaborStartTime, setEditLaborStartTime] = useState('');
  const [editLaborEndTime, setEditLaborEndTime] = useState('');
  const [editLaborBreakMinutes, setEditLaborBreakMinutes] = useState('0');
  const [editLaborHourlyRate, setEditLaborHourlyRate] = useState('85');

  // ─── Part form state ───
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partSupplier, setPartSupplier] = useState('');
  const [partSupplierCost, setPartSupplierCost] = useState('0');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('0');
  const [partWarrantyMonths, setPartWarrantyMonths] = useState('');

  // ─── Part edit state ───
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPartName, setEditPartName] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editPartSupplier, setEditPartSupplier] = useState('');
  const [editPartSupplierCost, setEditPartSupplierCost] = useState('0');
  const [editPartQuantity, setEditPartQuantity] = useState('1');
  const [editPartUnitPrice, setEditPartUnitPrice] = useState('0');
  const [editPartWarrantyMonths, setEditPartWarrantyMonths] = useState('');

  // ─── Travel form state ───
  const [travelDeparture, setTravelDeparture] = useState('');
  const [travelArrival, setTravelArrival] = useState('');
  const [travelDistanceKm, setTravelDistanceKm] = useState('');
  const [travelRatePerKm, setTravelRatePerKm] = useState('0.68');
  const [travelDate, setTravelDate] = useState('');

  // ─── Travel edit state ───
  const [editingTravelId, setEditingTravelId] = useState<string | null>(null);
  const [editTravelDeparture, setEditTravelDeparture] = useState('');
  const [editTravelArrival, setEditTravelArrival] = useState('');
  const [editTravelDistanceKm, setEditTravelDistanceKm] = useState('');
  const [editTravelRatePerKm, setEditTravelRatePerKm] = useState('0.68');
  const [editTravelDate, setEditTravelDate] = useState('');

  // ─── Note form state ───
  const [noteType, setNoteType] = useState('INTERNE');
  const [noteContent, setNoteContent] = useState('');

  // ─── Follow-up form state ───
  const [followUpType, setFollowUpType] = useState('RAPPEL_CLIENT');
  const [followUpScheduledDate, setFollowUpScheduledDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // ─── Follow-up edit state ───
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [editFollowUpType, setEditFollowUpType] = useState('RAPPEL_CLIENT');
  const [editFollowUpScheduledDate, setEditFollowUpScheduledDate] = useState('');
  const [editFollowUpNotes, setEditFollowUpNotes] = useState('');

  // ─── Worksheet config (admin-defined defaults) ───
  const { data: wsConfigData } = useQuery({
    queryKey: ['config', 'worksheet_config'],
    queryFn: () => api.config.get('worksheet_config').catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // Extract worksheet config with defaults
  const wsConfig = (() => {
    const v = (wsConfigData?.value && typeof wsConfigData.value === 'object')
      ? wsConfigData.value as Record<string, unknown>
      : {};
    return {
      defaultHourlyRate: typeof v.defaultHourlyRate === 'number' ? v.defaultHourlyRate : 85,
      defaultRatePerKm: typeof v.defaultRatePerKm === 'number' ? v.defaultRatePerKm : 0.68,
    };
  })();

  // Config-initialized ref to update defaults once
  const configInitRef = useRef(false);
  useEffect(() => {
    if (wsConfigData?.value && !configInitRef.current) {
      configInitRef.current = true;
      setLaborHourlyRate(String(wsConfig.defaultHourlyRate));
      setTravelRatePerKm(String(wsConfig.defaultRatePerKm));
    }
  }, [wsConfigData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Query ───
  const { data: ws, isLoading, error } = useQuery({
    queryKey: ['worksheet', id],
    queryFn: () => api.worksheets.get(id!),
    enabled: !!id,
  });

  // ─── Status change mutation ───
  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      api.worksheets.changeStatus(id!, status, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      queryClient.invalidateQueries({ queryKey: ['worksheets'] });
      setIsChangingStatus(false);

      switch (variables.status) {
        case 'APPROUVEE':
          toast.success(t('worksheet.approved'));
          break;
        case 'REVISEE':
          toast.success(t('worksheet.revisioned'));
          break;
        case 'FACTUREE':
          toast.success(t('worksheet.billed'));
          break;
        case 'ANNULEE':
          toast.success(t('worksheet.cancelled'));
          break;
        default:
          toast.success(t('worksheet.saved'));
      }
    },
    onError: (err: any) => {
      setIsChangingStatus(false);
      toast.error(err?.message || t('common.error'));
    },
  });

  // ─── Summary mutation ───
  const updateSummaryMutation = useMutation({
    mutationFn: (newSummary: string) => api.worksheets.update(id!, { summary: newSummary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      setIsEditingSummary(false);
      toast.success(t('worksheet.saved'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Labor mutations ───
  const addLaborMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.worksheets.labor.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.laborAdded'));
      resetLaborForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateLaborMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: Record<string, unknown> }) =>
      api.worksheets.labor.update(id!, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.saved'));
      setEditingLaborId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteLaborMutation = useMutation({
    mutationFn: (entryId: string) => api.worksheets.labor.delete(id!, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Part mutations ───
  const addPartMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.worksheets.parts.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.partAdded'));
      resetPartForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updatePartMutation = useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: Record<string, unknown> }) =>
      api.worksheets.parts.update(id!, partId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.saved'));
      setEditingPartId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletePartMutation = useMutation({
    mutationFn: (partId: string) => api.worksheets.parts.delete(id!, partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Travel mutations ───
  const addTravelMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.worksheets.travel.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.travelAdded'));
      resetTravelForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTravelMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: Record<string, unknown> }) =>
      api.worksheets.travel.update(id!, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.saved'));
      setEditingTravelId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTravelMutation = useMutation({
    mutationFn: (entryId: string) => api.worksheets.travel.delete(id!, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Note mutations ───
  const addNoteMutation = useMutation({
    mutationFn: (data: { noteType: string; content: string }) =>
      api.worksheets.notes.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.noteAdded'));
      resetNoteForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.worksheets.notes.delete(id!, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Follow-up mutations ───
  const addFollowUpMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.worksheets.followUps.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.followUpAdded'));
      resetFollowUpForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: ({ followUpId, data }: { followUpId: string; data: Record<string, unknown> }) =>
      api.worksheets.followUps.update(id!, followUpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.saved'));
      setEditingFollowUpId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFollowUpMutation = useMutation({
    mutationFn: (followUpId: string) => api.worksheets.followUps.delete(id!, followUpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Form reset helpers ───

  function resetLaborForm() {
    setLaborType('DIAGNOSTIC');
    setLaborDescription('');
    setLaborStartTime('');
    setLaborEndTime('');
    setLaborBreakMinutes('0');
    setLaborHourlyRate(String(wsConfig.defaultHourlyRate));
    setShowLaborForm(false);
  }

  function resetPartForm() {
    setPartName('');
    setPartNumber('');
    setPartSupplier('');
    setPartSupplierCost('0');
    setPartQuantity('1');
    setPartUnitPrice('0');
    setPartWarrantyMonths('');
    setShowPartForm(false);
  }

  function resetTravelForm() {
    setTravelDeparture('');
    setTravelArrival('');
    setTravelDistanceKm('');
    setTravelRatePerKm(String(wsConfig.defaultRatePerKm));
    setTravelDate('');
    setShowTravelForm(false);
  }

  function resetNoteForm() {
    setNoteType('INTERNE');
    setNoteContent('');
    setShowNoteForm(false);
  }

  function resetFollowUpForm() {
    setFollowUpType('RAPPEL_CLIENT');
    setFollowUpScheduledDate('');
    setFollowUpNotes('');
    setShowFollowUpForm(false);
  }

  // ─── Edit start helpers ───

  function startEditLabor(entry: LaborEntry) {
    setEditingLaborId(entry.id);
    setEditLaborType(entry.laborType);
    setEditLaborDescription(entry.description ?? '');
    // Format ISO datetime to datetime-local value
    setEditLaborStartTime(entry.startTime ? entry.startTime.slice(0, 16) : '');
    setEditLaborEndTime(entry.endTime ? entry.endTime.slice(0, 16) : '');
    setEditLaborBreakMinutes(String(entry.breakMinutes));
    setEditLaborHourlyRate(String(entry.hourlyRate));
  }

  function startEditPart(part: PartUsed) {
    setEditingPartId(part.id);
    setEditPartName(part.partName);
    setEditPartNumber(part.partNumber ?? '');
    setEditPartSupplier(part.supplier ?? '');
    setEditPartSupplierCost(String(part.supplierCost));
    setEditPartQuantity(String(part.quantity));
    setEditPartUnitPrice(String(part.unitPrice));
    setEditPartWarrantyMonths(part.warrantyMonths != null ? String(part.warrantyMonths) : '');
  }

  function startEditTravel(entry: TravelEntry) {
    setEditingTravelId(entry.id);
    setEditTravelDeparture(entry.departureAddress ?? '');
    setEditTravelArrival(entry.arrivalAddress ?? '');
    setEditTravelDistanceKm(String(entry.distanceKm));
    setEditTravelRatePerKm(String(entry.ratePerKm));
    setEditTravelDate(entry.travelDate ? entry.travelDate.slice(0, 16) : '');
  }

  function startEditFollowUp(fu: FollowUp) {
    setEditingFollowUpId(fu.id);
    setEditFollowUpType(fu.followUpType);
    setEditFollowUpScheduledDate(fu.scheduledDate ? fu.scheduledDate.slice(0, 16) : '');
    setEditFollowUpNotes(fu.notes ?? '');
  }

  // ─── Form submit handlers ───

  function handleAddLabor(e: React.FormEvent) {
    e.preventDefault();
    addLaborMutation.mutate({
      laborType,
      description: laborDescription || undefined,
      startTime: laborStartTime ? new Date(laborStartTime).toISOString() : new Date().toISOString(),
      endTime: laborEndTime ? new Date(laborEndTime).toISOString() : undefined,
      breakMinutes: parseInt(laborBreakMinutes) || 0,
      hourlyRate: parseFloat(laborHourlyRate),
    });
  }

  function handleUpdateLabor(entryId: string) {
    updateLaborMutation.mutate({
      entryId,
      data: {
        laborType: editLaborType,
        description: editLaborDescription || undefined,
        startTime: editLaborStartTime ? new Date(editLaborStartTime).toISOString() : undefined,
        endTime: editLaborEndTime ? new Date(editLaborEndTime).toISOString() : undefined,
        breakMinutes: parseInt(editLaborBreakMinutes) || 0,
        hourlyRate: parseFloat(editLaborHourlyRate),
      },
    });
  }

  function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    addPartMutation.mutate({
      partName,
      partNumber: partNumber || undefined,
      supplier: partSupplier || undefined,
      supplierCost: parseFloat(partSupplierCost) || 0,
      quantity: parseInt(partQuantity) || 1,
      unitPrice: parseFloat(partUnitPrice) || 0,
      warrantyMonths: partWarrantyMonths ? parseInt(partWarrantyMonths) : undefined,
    });
  }

  function handleUpdatePart(partId: string) {
    updatePartMutation.mutate({
      partId,
      data: {
        partName: editPartName,
        partNumber: editPartNumber || undefined,
        supplier: editPartSupplier || undefined,
        supplierCost: parseFloat(editPartSupplierCost) || 0,
        quantity: parseInt(editPartQuantity) || 1,
        unitPrice: parseFloat(editPartUnitPrice) || 0,
        warrantyMonths: editPartWarrantyMonths ? parseInt(editPartWarrantyMonths) : undefined,
      },
    });
  }

  function handleAddTravel(e: React.FormEvent) {
    e.preventDefault();
    addTravelMutation.mutate({
      departureAddress: travelDeparture || undefined,
      arrivalAddress: travelArrival || undefined,
      distanceKm: parseFloat(travelDistanceKm) || 0,
      ratePerKm: parseFloat(travelRatePerKm) || 0,
      travelDate: travelDate ? new Date(travelDate).toISOString() : new Date().toISOString(),
    });
  }

  function handleUpdateTravel(entryId: string) {
    updateTravelMutation.mutate({
      entryId,
      data: {
        departureAddress: editTravelDeparture || undefined,
        arrivalAddress: editTravelArrival || undefined,
        distanceKm: parseFloat(editTravelDistanceKm) || 0,
        ratePerKm: parseFloat(editTravelRatePerKm) || 0,
        travelDate: editTravelDate ? new Date(editTravelDate).toISOString() : undefined,
      },
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    addNoteMutation.mutate({ noteType, content: noteContent });
  }

  function handleAddFollowUp(e: React.FormEvent) {
    e.preventDefault();
    addFollowUpMutation.mutate({
      followUpType,
      scheduledDate: followUpScheduledDate ? new Date(followUpScheduledDate).toISOString() : undefined,
      notes: followUpNotes || undefined,
    });
  }

  function handleUpdateFollowUp(followUpId: string) {
    updateFollowUpMutation.mutate({
      followUpId,
      data: {
        followUpType: editFollowUpType,
        scheduledDate: editFollowUpScheduledDate ? new Date(editFollowUpScheduledDate).toISOString() : undefined,
        notes: editFollowUpNotes || undefined,
      },
    });
  }

  // ─── Action handlers ───
  const handleApprove = () => {
    if (isChangingStatus) return;
    if (!window.confirm(t('worksheet.confirmApprove'))) return;
    setIsChangingStatus(true);
    statusMutation.mutate({ status: 'APPROUVEE' });
  };

  const handleRequestRevision = () => {
    const reason = window.prompt(t('worksheet.revisionReasonPrompt'));
    if (!reason) return;
    setIsChangingStatus(true);
    statusMutation.mutate({ status: 'REVISEE', reason });
  };

  const handleMarkBilled = () => {
    if (isChangingStatus) return;
    if (!window.confirm(t('worksheet.confirmBilled'))) return;
    setIsChangingStatus(true);
    statusMutation.mutate({ status: 'FACTUREE' });
  };

  const handleCancel = () => {
    if (isChangingStatus) return;
    if (!window.confirm(t('worksheet.confirmCancel'))) return;
    setIsChangingStatus(true);
    statusMutation.mutate({ status: 'ANNULEE' });
  };

  const handleDownloadPdf = () => {
    window.open(api.worksheets.pdfUrl(id!), '_blank');
  };

  // Common input class
  const inputCls = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm';
  const textareaCls = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]';

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
        <Link to="/admin/feuilles-travail" className="text-primary hover:underline text-sm">
          ← {t('worksheet.backToList')}
        </Link>
        <p className="text-destructive">{t('common.error')}</p>
      </div>
    );
  }

  const statusColors = WS_STATUS_COLORS[ws.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  const editable = canEdit(ws.status);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════
          1. HEADER — Back link, status badge, actions
         ═══════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/feuilles-travail" className="text-primary hover:underline text-sm">
            ← {t('worksheet.backToList')}
          </Link>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
          >
            {WS_STATUS_LABELS[ws.status] || ws.status}
          </span>

          <h1 className="text-2xl font-bold">
            {ws.workOrder?.orderNumber || ws.ticket?.ticketNumber || t('worksheet.unscheduledCall')}
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            {t('worksheet.downloadPdf')}
          </Button>

          {canApprove(ws.status) && (
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isChangingStatus}
            >
              {t('worksheet.approve')}
            </Button>
          )}

          {canRequestRevision(ws.status) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRequestRevision}
              disabled={isChangingStatus}
            >
              {t('worksheet.requestRevision')}
            </Button>
          )}

          {canMarkBilled(ws.status) && (
            <Button
              size="sm"
              onClick={handleMarkBilled}
              disabled={isChangingStatus}
            >
              {t('worksheet.markBilled')}
            </Button>
          )}

          {canCancel(ws.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isChangingStatus}
            >
              {t('worksheet.cancel')}
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          2. INFO SECTION — Two-column grid
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Worksheet info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.worksheetInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{ws.id.slice(0, 8)}…</span>
            </div>
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
            {ws.billedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('worksheet.billedAt')}</span>
                <span>{formatDateTime(ws.billedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Work order / Ticket / Standalone info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {ws.workOrder
                ? t('worksheet.woInfo')
                : ws.ticket
                  ? t('worksheet.ticketInfo')
                  : t('worksheet.referenceLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {ws.workOrder ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.workOrder')}</span>
                  <Link
                    to={`/admin/bons-travail/${ws.workOrder.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {ws.workOrder.orderNumber}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.customer')}</span>
                  <span>{ws.workOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.device')}</span>
                  <span>{ws.workOrder.deviceBrand} {ws.workOrder.deviceModel}</span>
                </div>
                {ws.workOrder.deviceSerial && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('common.serial')}</span>
                    <span className="font-mono text-xs">{ws.workOrder.deviceSerial}</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground shrink-0">{t('worksheet.issue')}</span>
                  <span className="text-right ml-4">{ws.workOrder.reportedIssue}</span>
                </div>
              </>
            ) : ws.ticket ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('worksheet.ticketRef')}</span>
                  <span className="font-mono">{ws.ticket.ticketNumber}</span>
                </div>
                {ws.ticket.title && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground shrink-0">{t('worksheet.issue')}</span>
                    <span className="text-right ml-4">{ws.ticket.title}</span>
                  </div>
                )}
                {ws.ticket.customer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('worksheet.customer')}</span>
                    <span>{ws.ticket.customer.firstName} {ws.ticket.customer.lastName}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">
                {t('worksheet.unscheduledCall')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          3. SUMMARY — Editable in draft/revised
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('worksheet.summary')}</CardTitle>
            {editable && !isEditingSummary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSummaryDraft(ws.summary ?? '');
                  setIsEditingSummary(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {t('common.edit')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingSummary ? (
            <div className="space-y-3">
              <textarea
                className={textareaCls + ' min-h-[100px]'}
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                placeholder={t('worksheet.summaryPlaceholder')}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateSummaryMutation.mutate(summaryDraft)}
                  disabled={updateSummaryMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {t('common.save')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingSummary(false)}>
                  <X className="h-4 w-4 mr-1" />
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {ws.summary || <span className="text-muted-foreground italic">{t('worksheet.noEntries')}</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          4. FINANCIAL SUMMARY
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
          5. LABOR ENTRIES
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('worksheet.laborTab')}</CardTitle>
            {editable && !showLaborForm && (
              <Button variant="outline" size="sm" onClick={() => setShowLaborForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('worksheet.addLabor')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Add labor form (inline, above table) */}
          {showLaborForm && (
            <div className="p-4 border-b bg-muted/30">
              <form onSubmit={handleAddLabor} className="space-y-3">
                <p className="text-sm font-medium">{t('worksheet.addLabor')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.laborType')}</label>
                    <select value={laborType} onChange={(e) => setLaborType(e.target.value)} className={inputCls}>
                      {Object.entries(LABOR_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium">{t('worksheet.description')}</label>
                    <input type="text" value={laborDescription} onChange={(e) => setLaborDescription(e.target.value)} className={inputCls} placeholder={t('worksheet.description')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.startTime')}</label>
                    <input type="datetime-local" value={laborStartTime} onChange={(e) => setLaborStartTime(e.target.value)} required className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.endTime')}</label>
                    <input type="datetime-local" value={laborEndTime} onChange={(e) => setLaborEndTime(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.laborBreakMin')}</label>
                    <input type="number" min="0" step="1" value={laborBreakMinutes} onChange={(e) => setLaborBreakMinutes(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.hourlyRate')}</label>
                    <input type="number" step="0.01" value={laborHourlyRate} onChange={(e) => setLaborHourlyRate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addLaborMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetLaborForm}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {ws.laborEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">{t('worksheet.laborType')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.description')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.startTime')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.endTime')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.breakMinutes')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.billableHours')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.hourlyRate')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.lineTotal')}</th>
                    {editable && <th className="text-right p-3 font-medium">{t('worksheet.adminActions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ws.laborEntries.map((entry: LaborEntry) => (
                    editingLaborId === entry.id ? (
                      /* Inline edit row */
                      <tr key={entry.id} className="bg-muted/20">
                        <td className="p-2">
                          <select value={editLaborType} onChange={(e) => setEditLaborType(e.target.value)} className={inputCls}>
                            {Object.entries(LABOR_TYPE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="text" value={editLaborDescription} onChange={(e) => setEditLaborDescription(e.target.value)} className={inputCls} />
                        </td>
                        <td className="p-2">
                          <input type="datetime-local" value={editLaborStartTime} onChange={(e) => setEditLaborStartTime(e.target.value)} className={inputCls} />
                        </td>
                        <td className="p-2">
                          <input type="datetime-local" value={editLaborEndTime} onChange={(e) => setEditLaborEndTime(e.target.value)} className={inputCls} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="0" value={editLaborBreakMinutes} onChange={(e) => setEditLaborBreakMinutes(e.target.value)} className={inputCls + ' text-right'} />
                        </td>
                        <td className="p-2 text-center text-muted-foreground text-xs">—</td>
                        <td className="p-2">
                          <input type="number" step="0.01" value={editLaborHourlyRate} onChange={(e) => setEditLaborHourlyRate(e.target.value)} className={inputCls + ' text-right'} />
                        </td>
                        <td className="p-2 text-center text-muted-foreground text-xs">—</td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateLabor(entry.id)} disabled={updateLaborMutation.isPending}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingLaborId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      /* Display row */
                      <tr key={entry.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {LABOR_TYPE_LABELS[entry.laborType] || entry.laborType}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">
                          {entry.description || '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">{formatDateTime(entry.startTime)}</td>
                        <td className="p-3 whitespace-nowrap">
                          {entry.endTime ? formatDateTime(entry.endTime) : '—'}
                        </td>
                        <td className="p-3 text-right tabular-nums">{entry.breakMinutes} min</td>
                        <td className="p-3 text-right tabular-nums">
                          {entry.billableHours != null ? entry.billableHours.toFixed(2) : '—'}
                        </td>
                        <td className="p-3 text-right tabular-nums">{money(entry.hourlyRate)}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{money(entry.lineTotal)}</td>
                        {editable && (
                          <td className="p-3">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => startEditLabor(entry)} title={t('common.edit')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (window.confirm(t('worksheet.confirmDeleteEntry'))) {
                                    deleteLaborMutation.mutate(entry.id);
                                  }
                                }}
                                disabled={deleteLaborMutation.isPending}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('worksheet.noEntries')}</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          6. PARTS
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('worksheet.partsTab')}</CardTitle>
            {editable && !showPartForm && (
              <Button variant="outline" size="sm" onClick={() => setShowPartForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('worksheet.addPart')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Add part form */}
          {showPartForm && (
            <div className="p-4 border-b bg-muted/30">
              <form onSubmit={handleAddPart} className="space-y-3">
                <p className="text-sm font-medium">{t('worksheet.addPart')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.partName')}</label>
                    <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} required className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.partNumber')}</label>
                    <input type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.supplier')}</label>
                    <input type="text" value={partSupplier} onChange={(e) => setPartSupplier(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.supplierCost')}</label>
                    <input type="number" step="0.01" value={partSupplierCost} onChange={(e) => setPartSupplierCost(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.quantity')}</label>
                    <input type="number" min="1" value={partQuantity} onChange={(e) => setPartQuantity(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.unitPrice')}</label>
                    <input type="number" step="0.01" value={partUnitPrice} onChange={(e) => setPartUnitPrice(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.warrantyMonths')}</label>
                    <input type="number" min="0" value={partWarrantyMonths} onChange={(e) => setPartWarrantyMonths(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addPartMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetPartForm}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {ws.parts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">{t('worksheet.partName')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.partNumber')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.supplier')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.quantity')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.supplierCost')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.unitPrice')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.margin')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.lineTotal')}</th>
                    <th className="text-center p-3 font-medium">{t('worksheet.warrantyMonths')}</th>
                    {editable && <th className="text-right p-3 font-medium">{t('worksheet.adminActions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ws.parts.map((part: PartUsed) => {
                    const marginPct =
                      part.supplierCost > 0
                        ? (((part.unitPrice - part.supplierCost) / part.supplierCost) * 100).toFixed(1)
                        : '—';

                    if (editingPartId === part.id) {
                      return (
                        <tr key={part.id} className="bg-muted/20">
                          <td className="p-2">
                            <input type="text" value={editPartName} onChange={(e) => setEditPartName(e.target.value)} className={inputCls} />
                          </td>
                          <td className="p-2">
                            <input type="text" value={editPartNumber} onChange={(e) => setEditPartNumber(e.target.value)} className={inputCls} />
                          </td>
                          <td className="p-2">
                            <input type="text" value={editPartSupplier} onChange={(e) => setEditPartSupplier(e.target.value)} className={inputCls} />
                          </td>
                          <td className="p-2">
                            <input type="number" min="1" value={editPartQuantity} onChange={(e) => setEditPartQuantity(e.target.value)} className={inputCls + ' text-right'} />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" value={editPartSupplierCost} onChange={(e) => setEditPartSupplierCost(e.target.value)} className={inputCls + ' text-right'} />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" value={editPartUnitPrice} onChange={(e) => setEditPartUnitPrice(e.target.value)} className={inputCls + ' text-right'} />
                          </td>
                          <td className="p-2 text-center text-muted-foreground text-xs">—</td>
                          <td className="p-2 text-center text-muted-foreground text-xs">—</td>
                          <td className="p-2">
                            <input type="number" min="0" value={editPartWarrantyMonths} onChange={(e) => setEditPartWarrantyMonths(e.target.value)} className={inputCls + ' text-center'} />
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => handleUpdatePart(part.id)} disabled={updatePartMutation.isPending}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingPartId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={part.id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{part.partName}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {part.partNumber || '—'}
                        </td>
                        <td className="p-3 text-muted-foreground">{part.supplier || '—'}</td>
                        <td className="p-3 text-right tabular-nums">{part.quantity}</td>
                        <td className="p-3 text-right tabular-nums">{money(part.supplierCost)}</td>
                        <td className="p-3 text-right tabular-nums">{money(part.unitPrice)}</td>
                        <td className="p-3 text-right tabular-nums">
                          {marginPct !== '—' ? `${marginPct}%` : '—'}
                        </td>
                        <td className="p-3 text-right tabular-nums font-medium">{money(part.lineTotal)}</td>
                        <td className="p-3 text-center text-muted-foreground">
                          {part.warrantyMonths != null ? `${part.warrantyMonths} ${t('worksheet.warrantyMonthsShort')}` : '—'}
                        </td>
                        {editable && (
                          <td className="p-3">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => startEditPart(part)} title={t('common.edit')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (window.confirm(t('worksheet.confirmDeleteEntry'))) {
                                    deletePartMutation.mutate(part.id);
                                  }
                                }}
                                disabled={deletePartMutation.isPending}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('worksheet.noEntries')}</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          7. TRAVEL ENTRIES
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('worksheet.travelTab')}</CardTitle>
            {editable && !showTravelForm && (
              <Button variant="outline" size="sm" onClick={() => setShowTravelForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('worksheet.addTravel')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Add travel form */}
          {showTravelForm && (
            <div className="p-4 border-b bg-muted/30">
              <form onSubmit={handleAddTravel} className="space-y-3">
                <p className="text-sm font-medium">{t('worksheet.addTravel')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.departureAddress')}</label>
                    <input type="text" value={travelDeparture} onChange={(e) => setTravelDeparture(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.arrivalAddress')}</label>
                    <input type="text" value={travelArrival} onChange={(e) => setTravelArrival(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.distanceKm')}</label>
                    <input type="number" step="0.1" value={travelDistanceKm} onChange={(e) => setTravelDistanceKm(e.target.value)} required className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.ratePerKm')}</label>
                    <input type="number" step="0.01" value={travelRatePerKm} onChange={(e) => setTravelRatePerKm(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.travelDate')}</label>
                    <input type="datetime-local" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addTravelMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetTravelForm}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {ws.travelEntries.length > 0 ? (
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
                    {editable && <th className="text-right p-3 font-medium">{t('worksheet.adminActions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ws.travelEntries.map((entry: TravelEntry) => (
                    editingTravelId === entry.id ? (
                      <tr key={entry.id} className="bg-muted/20">
                        <td className="p-2">
                          <input type="datetime-local" value={editTravelDate} onChange={(e) => setEditTravelDate(e.target.value)} className={inputCls} />
                        </td>
                        <td className="p-2">
                          <input type="text" value={editTravelDeparture} onChange={(e) => setEditTravelDeparture(e.target.value)} className={inputCls} />
                        </td>
                        <td className="p-2">
                          <input type="text" value={editTravelArrival} onChange={(e) => setEditTravelArrival(e.target.value)} className={inputCls} />
                        </td>
                        <td className="p-2">
                          <input type="number" step="0.1" value={editTravelDistanceKm} onChange={(e) => setEditTravelDistanceKm(e.target.value)} className={inputCls + ' text-right'} />
                        </td>
                        <td className="p-2">
                          <input type="number" step="0.01" value={editTravelRatePerKm} onChange={(e) => setEditTravelRatePerKm(e.target.value)} className={inputCls + ' text-right'} />
                        </td>
                        <td className="p-2 text-center text-muted-foreground text-xs">—</td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateTravel(entry.id)} disabled={updateTravelMutation.isPending}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTravelId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry.id} className="hover:bg-muted/30">
                        <td className="p-3 whitespace-nowrap">{formatDate(entry.travelDate)}</td>
                        <td className="p-3 text-muted-foreground">{entry.departureAddress || '—'}</td>
                        <td className="p-3 text-muted-foreground">{entry.arrivalAddress || '—'}</td>
                        <td className="p-3 text-right tabular-nums">{entry.distanceKm.toFixed(1)} km</td>
                        <td className="p-3 text-right tabular-nums">{money(entry.ratePerKm)}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{money(entry.lineTotal)}</td>
                        {editable && (
                          <td className="p-3">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => startEditTravel(entry)} title={t('common.edit')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (window.confirm(t('worksheet.confirmDeleteEntry'))) {
                                    deleteTravelMutation.mutate(entry.id);
                                  }
                                }}
                                disabled={deleteTravelMutation.isPending}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('worksheet.noEntries')}</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          8. NOTES
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('worksheet.notesTab')}</CardTitle>
            {editable && !showNoteForm && (
              <Button variant="outline" size="sm" onClick={() => setShowNoteForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('worksheet.addNote')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add note form */}
          {showNoteForm && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <form onSubmit={handleAddNote} className="space-y-3">
                <p className="text-sm font-medium">{t('worksheet.addNote')}</p>
                <div>
                  <label className="text-xs font-medium">{t('worksheet.noteType')}</label>
                  <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className={inputCls}>
                    {Object.entries(WS_NOTE_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('worksheet.noteContent')}</label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    required
                    className={textareaCls + ' min-h-[80px]'}
                    placeholder={t('worksheet.noteContent')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addNoteMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetNoteForm}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {ws.notes.length > 0 ? (
            ws.notes.map((note: WorksheetNote) => (
              <div
                key={note.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {WS_NOTE_TYPE_LABELS[note.noteType] || note.noteType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {note.author.firstName} {note.author.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(note.createdAt)}
                  </span>
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive h-7 px-2"
                      onClick={() => {
                        if (window.confirm(t('worksheet.confirmDeleteEntry'))) {
                          deleteNoteMutation.mutate(note.id);
                        }
                      }}
                      disabled={deleteNoteMutation.isPending}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          9. FOLLOW-UPS
         ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('worksheet.followUpsTab')}</CardTitle>
            {editable && !showFollowUpForm && (
              <Button variant="outline" size="sm" onClick={() => setShowFollowUpForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('worksheet.addFollowUp')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add follow-up form */}
          {showFollowUpForm && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <form onSubmit={handleAddFollowUp} className="space-y-3">
                <p className="text-sm font-medium">{t('worksheet.addFollowUp')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.followUpType')}</label>
                    <select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)} className={inputCls}>
                      {Object.entries(FOLLOWUP_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.scheduledDate')}</label>
                    <input type="datetime-local" value={followUpScheduledDate} onChange={(e) => setFollowUpScheduledDate(e.target.value)} required className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">{t('worksheet.followUpNotes')}</label>
                  <textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    className={textareaCls}
                    placeholder={t('worksheet.followUpNotes')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addFollowUpMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetFollowUpForm}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {ws.followUps.length > 0 ? (
            ws.followUps.map((fu: FollowUp) => (
              editingFollowUpId === fu.id ? (
                /* Inline edit form for follow-up */
                <div key={fu.id} className="border rounded-lg p-4 bg-muted/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">{t('worksheet.followUpType')}</label>
                      <select value={editFollowUpType} onChange={(e) => setEditFollowUpType(e.target.value)} className={inputCls}>
                        {Object.entries(FOLLOWUP_TYPE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">{t('worksheet.scheduledDate')}</label>
                      <input type="datetime-local" value={editFollowUpScheduledDate} onChange={(e) => setEditFollowUpScheduledDate(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.followUpNotes')}</label>
                    <textarea value={editFollowUpNotes} onChange={(e) => setEditFollowUpNotes(e.target.value)} className={textareaCls} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdateFollowUp(fu.id)} disabled={updateFollowUpMutation.isPending}>
                      <Save className="h-4 w-4 mr-1" />
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingFollowUpId(null)}>
                      <X className="h-4 w-4 mr-1" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display mode for follow-up */
                <div
                  key={fu.id}
                  className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 shrink-0">
                    {FOLLOWUP_TYPE_LABELS[fu.followUpType] || fu.followUpType}
                  </span>
                  <span className="text-sm whitespace-nowrap">
                    {formatDate(fu.scheduledDate)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      fu.completed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {fu.completed ? t('worksheet.completedAt') : t('worksheet.scheduledDate')}
                  </span>
                  {fu.notes && (
                    <span className="text-sm text-muted-foreground">{fu.notes}</span>
                  )}
                  {fu.completed && fu.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      {t('worksheet.completedAt')}: {formatDateTime(fu.completedAt)}
                    </span>
                  )}
                  {editable && (
                    <div className="flex gap-1 sm:ml-auto shrink-0">
                      {/* Toggle complete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateFollowUpMutation.mutate({
                            followUpId: fu.id,
                            data: { completed: !fu.completed },
                          })
                        }
                        disabled={updateFollowUpMutation.isPending}
                      >
                        {fu.completed ? '↩' : '✓'} {t('worksheet.markComplete')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEditFollowUp(fu)} title={t('common.edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(t('worksheet.confirmDeleteEntry'))) {
                            deleteFollowUpMutation.mutate(fu.id);
                          }
                        }}
                        disabled={deleteFollowUpMutation.isPending}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
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
