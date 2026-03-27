import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, LaborEntry, PartUsed, TravelEntry, WorksheetNote, FollowUp } from '../../api/client';
import { useTranslation } from '../../lib/i18n/hook';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  WS_STATUS_COLORS,
} from '../../lib/constants';

const LABOR_TYPE_KEYS = [
  'DIAGNOSTIC', 'REPARATION', 'INSTALLATION', 'FORMATION', 'CONSULTATION', 'AUTRE',
] as const;

const WS_NOTE_TYPE_KEYS = [
  'DIAGNOSTIC_FINDING', 'PROCEDURE', 'VISIBLE_CLIENT', 'INTERNE',
] as const;

const FOLLOWUP_TYPE_KEYS = [
  'VERIFICATION_GARANTIE', 'RAPPEL_CLIENT', 'REVERIFICATION', 'ARRIVEE_PIECES', 'SUIVI_DEVIS',
] as const;
import { formatDateTime } from '../../lib/utils';
import SignaturePad from '../../components/shared/SignaturePad';

// ─── Tab definitions ───
type TabKey = 'labor' | 'parts' | 'travel' | 'notes' | 'followups';

// ─── Helper: format money ───
function money(value: number | null | undefined): string {
  return (value ?? 0).toFixed(2) + ' $';
}

// ─── Helper: format elapsed time from a start ISO string ───
function formatElapsed(startTime: string): string {
  const diff = Date.now() - new Date(startTime).getTime();
  if (diff < 0) return '00:00:00';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function TechWorksheetDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Worksheet config (admin-defined defaults) ───
  const { data: wsConfigData } = useQuery({
    queryKey: ['config', 'worksheet_config'],
    queryFn: () => api.config.get('worksheet_config').catch(() => null),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  // Extract worksheet config with defaults
  const wsConfig = (() => {
    const v = (wsConfigData?.value && typeof wsConfigData.value === 'object')
      ? wsConfigData.value as Record<string, unknown>
      : {};
    return {
      defaultHourlyRate: typeof v.defaultHourlyRate === 'number' ? v.defaultHourlyRate : 85,
      defaultRatePerKm: typeof v.defaultRatePerKm === 'number' ? v.defaultRatePerKm : 0.68,
      travelChargeMode: (v.travelChargeMode === 'per_km' || v.travelChargeMode === 'hourly' || v.travelChargeMode === 'flat') ? v.travelChargeMode : 'per_km',
      travelHourlyRate: typeof v.travelHourlyRate === 'number' ? v.travelHourlyRate : 65,
      travelFlatRate: typeof v.travelFlatRate === 'number' ? v.travelFlatRate : 50,
      enableLabor: typeof v.enableLabor === 'boolean' ? v.enableLabor : true,
      enableParts: typeof v.enableParts === 'boolean' ? v.enableParts : true,
      enableTravel: typeof v.enableTravel === 'boolean' ? v.enableTravel : true,
      enableNotes: typeof v.enableNotes === 'boolean' ? v.enableNotes : true,
      enableFollowUps: typeof v.enableFollowUps === 'boolean' ? v.enableFollowUps : true,
    };
  })();

  // ─── Active tab ───
  const [activeTab, setActiveTab] = useState<TabKey>('labor');

  // ─── Summary auto-save ───
  const [summary, setSummary] = useState('');
  const summaryInitializedRef = useRef(false);

  // ─── Timer tick (value read indirectly to force re-render) ───
  const [_timerTick, setTimerTick] = useState(0);

  // ─── Form visibility toggles ───
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);
  const [showTravelForm, setShowTravelForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  // ─── Labor form state ───
  const [laborMode, setLaborMode] = useState<'timer' | 'manual'>('timer');
  const [laborType, setLaborType] = useState('DIAGNOSTIC');
  const [laborDescription, setLaborDescription] = useState('');
  const [laborStartTime, setLaborStartTime] = useState('');
  const [laborEndTime, setLaborEndTime] = useState('');
  const [laborBreakMinutes, setLaborBreakMinutes] = useState('0');
  const [laborHourlyRate, setLaborHourlyRate] = useState(String(wsConfig.defaultHourlyRate));

  // ─── Part form state ───
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partSupplier, setPartSupplier] = useState('');
  const [partSupplierCost, setPartSupplierCost] = useState('0');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('0');
  const [partWarrantyMonths, setPartWarrantyMonths] = useState('');

  // ─── Travel form state ───
  const [travelDeparture, setTravelDeparture] = useState('');
  const [travelArrival, setTravelArrival] = useState('');
  const [travelDistanceKm, setTravelDistanceKm] = useState('');
  const [travelRatePerKm, setTravelRatePerKm] = useState(String(wsConfig.defaultRatePerKm));
  const [travelDate, setTravelDate] = useState('');
  const [travelTimeMinutes, setTravelTimeMinutes] = useState('');

  // ─── Note form state ───
  const [noteType, setNoteType] = useState('INTERNE');
  const [noteContent, setNoteContent] = useState('');

  // ─── Follow-up form state ───
  const [followUpType, setFollowUpType] = useState('RAPPEL_CLIENT');
  const [followUpScheduledDate, setFollowUpScheduledDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // ─── Inline validation errors ───
  const [laborErrors, setLaborErrors] = useState<Record<string, string>>({});
  const [partErrors, setPartErrors] = useState<Record<string, string>>({});
  const [travelErrors, setTravelErrors] = useState<Record<string, string>>({});
  const [noteErrors, setNoteErrors] = useState<Record<string, string>>({});
  const [followUpErrors, setFollowUpErrors] = useState<Record<string, string>>({});

  // ─── Part edit state ───
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPartName, setEditPartName] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editPartSupplier, setEditPartSupplier] = useState('');
  const [editPartSupplierCost, setEditPartSupplierCost] = useState('0');
  const [editPartQuantity, setEditPartQuantity] = useState('1');
  const [editPartUnitPrice, setEditPartUnitPrice] = useState('0');
  const [editPartWarrantyMonths, setEditPartWarrantyMonths] = useState('');

  // ─── Main query ───
  const { data: worksheet, isLoading } = useQuery({
    queryKey: ['worksheet', id],
    queryFn: () => api.worksheets.get(id!),
    enabled: !!id,
  });

  // Sync summary from server on first load
  useEffect(() => {
    if (worksheet && !summaryInitializedRef.current) {
      setSummary(worksheet.summary ?? '');
      summaryInitializedRef.current = true;
    }
  }, [worksheet]);

  // Timer interval for running labor entries
  useEffect(() => {
    const hasRunning = worksheet?.laborEntries?.some((le: LaborEntry) => !le.endTime);
    if (!hasRunning) return;
    const interval = setInterval(() => setTimerTick((tk) => tk + 1), 1000);
    return () => clearInterval(interval);
  }, [worksheet]);

  // Update form defaults when worksheet config loads
  useEffect(() => {
    if (!wsConfigData?.value) return;
    setLaborHourlyRate(String(wsConfig.defaultHourlyRate));
    setTravelRatePerKm(String(wsConfig.defaultRatePerKm));
  }, [wsConfigData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mutations ───

  const updateSummaryMutation = useMutation({
    mutationFn: (newSummary: string) => api.worksheets.update(id!, { summary: newSummary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.saved'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeStatusMutation = useMutation({
    mutationFn: (status: string) => api.worksheets.changeStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.submitted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Labor mutations ──
  const addLaborMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.worksheets.labor.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.laborAdded'));
      resetLaborForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopTimerMutation = useMutation({
    mutationFn: (entryId: string) => api.worksheets.labor.stopTimer(id!, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.saved'));
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

  // ── Parts mutations ──
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

  // ── Travel mutations ──
  const addTravelMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.worksheets.travel.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.travelAdded'));
      resetTravelForm();
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

  // ── Notes mutations ──
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

  const convertToKbMutation = useMutation({
    mutationFn: (noteId: string) => api.worksheets.notes.toKb(id!, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.kbCreated'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Follow-up mutations ──
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

  const saveSignatureMutation = useMutation({
    mutationFn: ({ type, signatureData }: { type: 'tech' | 'customer'; signatureData: string }) =>
      api.worksheets.saveSignature(id!, type, signatureData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
      toast.success(t('worksheet.signatureSaved'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Form reset helpers ───

  function resetLaborForm() {
    setLaborMode('timer');
    setLaborType('DIAGNOSTIC');
    setLaborDescription('');
    setLaborStartTime('');
    setLaborEndTime('');
    setLaborBreakMinutes('0');
    setLaborHourlyRate(String(wsConfig.defaultHourlyRate));
    setShowLaborForm(false);
    setLaborErrors({});
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
    setPartErrors({});
  }

  function resetTravelForm() {
    setTravelDeparture('');
    setTravelArrival('');
    setTravelDistanceKm('');
    setTravelRatePerKm(String(wsConfig.defaultRatePerKm));
    setTravelDate('');
    setTravelTimeMinutes('');
    setShowTravelForm(false);
    setTravelErrors({});
  }

  function resetNoteForm() {
    setNoteType('INTERNE');
    setNoteContent('');
    setShowNoteForm(false);
    setNoteErrors({});
  }

  function resetFollowUpForm() {
    setFollowUpType('RAPPEL_CLIENT');
    setFollowUpScheduledDate('');
    setFollowUpNotes('');
    setShowFollowUpForm(false);
    setFollowUpErrors({});
  }

  // ─── Form submit handlers ───

  function handleAddLabor(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const rate = parseFloat(laborHourlyRate);
    if (isNaN(rate) || rate < 0) errs.hourlyRate = t('validation.hoursInvalid');
    if (laborMode === 'manual') {
      if (!laborStartTime) errs.startTime = t('validation.dateRequired');
      if (!laborEndTime) errs.endTime = t('validation.dateRequired');
    }
    setLaborErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const payload: Record<string, unknown> = {
      laborType,
      description: laborDescription || undefined,
      startTime: laborStartTime ? new Date(laborStartTime).toISOString() : new Date().toISOString(),
      hourlyRate: rate,
    };
    if (laborMode === 'manual') {
      if (laborEndTime) {
        payload.endTime = new Date(laborEndTime).toISOString();
      }
      const breakMin = parseInt(laborBreakMinutes) || 0;
      if (breakMin > 0) {
        payload.breakMinutes = breakMin;
      }
    }
    addLaborMutation.mutate(payload);
  }

  function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!partName.trim()) errs.partName = t('validation.partNameRequired');
    const qty = parseInt(partQuantity);
    if (isNaN(qty) || qty < 1) errs.quantity = t('validation.quantityInvalid');
    const price = parseFloat(partUnitPrice);
    if (isNaN(price) || price < 0) errs.unitPrice = t('validation.unitPriceInvalid');
    setPartErrors(errs);
    if (Object.keys(errs).length > 0) return;
    addPartMutation.mutate({
      partName,
      partNumber: partNumber || undefined,
      supplier: partSupplier || undefined,
      supplierCost: parseFloat(partSupplierCost) || 0,
      quantity: qty,
      unitPrice: price,
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

  function handleAddTravel(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const distance = parseFloat(travelDistanceKm);
    if (!travelDistanceKm || isNaN(distance) || distance <= 0) errs.distanceKm = t('validation.distanceInvalid');
    setTravelErrors(errs);
    if (Object.keys(errs).length > 0) return;
    let rate = parseFloat(travelRatePerKm) || 0;

    // For hourly mode: billing = (travelTimeMinutes / 60) * travelHourlyRate
    // We encode the billing into ratePerKm so the backend computes lineTotal = distanceKm * ratePerKm
    if (wsConfig.travelChargeMode === 'hourly' && distance > 0) {
      const minutes = parseFloat(travelTimeMinutes) || 0;
      const hourlyBilling = (minutes / 60) * wsConfig.travelHourlyRate;
      rate = hourlyBilling / distance;
    }

    // For flat mode: encode flat rate as ratePerKm so lineTotal = distanceKm * (flatRate / distanceKm) = flatRate
    if (wsConfig.travelChargeMode === 'flat' && distance > 0) {
      rate = wsConfig.travelFlatRate / distance;
    }

    addTravelMutation.mutate({
      departureAddress: travelDeparture || undefined,
      arrivalAddress: travelArrival || undefined,
      distanceKm: distance,
      ratePerKm: rate,
      travelDate: travelDate ? new Date(travelDate).toISOString() : new Date().toISOString(),
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!noteContent.trim()) errs.noteContent = t('validation.noteRequired');
    setNoteErrors(errs);
    if (Object.keys(errs).length > 0) return;
    addNoteMutation.mutate({ noteType, content: noteContent });
  }

  function handleAddFollowUp(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!followUpScheduledDate) errs.scheduledDate = t('validation.followUpDateRequired');
    setFollowUpErrors(errs);
    if (Object.keys(errs).length > 0) return;
    addFollowUpMutation.mutate({
      followUpType,
      scheduledDate: followUpScheduledDate ? new Date(followUpScheduledDate).toISOString() : undefined,
      notes: followUpNotes || undefined,
    });
  }

  function handleSubmitWorksheet() {
    if (confirm(t('worksheet.submitConfirm'))) {
      changeStatusMutation.mutate('SOUMISE');
    }
  }

  function handleSaveDraft() {
    updateSummaryMutation.mutate(summary);
  }

  function handleSummaryBlur() {
    if (worksheet && summary !== (worksheet.summary ?? '')) {
      updateSummaryMutation.mutate(summary);
    }
  }

  // ─── Loading / Error ───

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!worksheet) {
    return <div className="p-8 text-center text-muted-foreground">{t('worksheet.notFound')}</div>;
  }

  const isDraft = worksheet.status === 'BROUILLON' || worksheet.status === 'REVISEE';
  const statusColor = WS_STATUS_COLORS[worksheet.status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  const wo = worksheet.workOrder;

  const allTabs: Array<{ key: TabKey; label: string }> = [
    { key: 'labor', label: t('worksheet.laborTab') },
    { key: 'parts', label: t('worksheet.partsTab') },
    { key: 'travel', label: t('worksheet.travelTab') },
    { key: 'notes', label: t('worksheet.notesTab') },
    { key: 'followups', label: t('worksheet.followUpsTab') },
  ];

  // Filter tabs based on enabled sections from config
  const enabledMap: Record<TabKey, boolean> = {
    labor: wsConfig.enableLabor,
    parts: wsConfig.enableParts,
    travel: wsConfig.enableTravel,
    notes: wsConfig.enableNotes,
    followups: wsConfig.enableFollowUps,
  };
  const tabs = allTabs.filter((tab) => enabledMap[tab.key]);

  // If active tab is disabled, switch to first available tab
  const validActiveTab = enabledMap[activeTab] ? activeTab : (tabs[0]?.key ?? 'labor');

  // ─── Render ───

  return (
    <div className="pb-28 space-y-4">
      {/* ════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/technicien/feuilles-travail')}>
            ← {t('worksheet.backToList')}
          </Button>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
          {t(`label.wsStatus.${worksheet.status}`) ?? worksheet.status}
        </span>
      </div>

      {/* Work Order / Ticket / Standalone info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('worksheet.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {wo ? (
            <>
              <p>
                <span className="font-medium">{t('worksheet.workOrder')}:</span>{' '}
                <Link to={`/technicien/bons-travail/${wo.id}`} className="text-primary underline">
                  {wo.orderNumber}
                </Link>
              </p>
              <p>
                <span className="font-medium">{t('worksheet.customer')}:</span> {wo.customerName}
              </p>
              <p>
                <span className="font-medium">{t('worksheet.device')}:</span>{' '}
                {wo.deviceBrand} {wo.deviceModel} {wo.deviceSerial ? `(${wo.deviceSerial})` : ''}
              </p>
              <p>
                <span className="font-medium">{t('worksheet.issue')}:</span> {wo.reportedIssue}
              </p>
            </>
          ) : worksheet.ticket ? (
            <>
              <p>
                <span className="font-medium">{t('worksheet.ticketRef')}:</span>{' '}
                {worksheet.ticket.ticketNumber}
              </p>
              {worksheet.ticket.title && (
                <p>
                  <span className="font-medium">{t('worksheet.issue')}:</span> {worksheet.ticket.title}
                </p>
              )}
              {worksheet.ticket.customer && (
                <p>
                  <span className="font-medium">{t('worksheet.customer')}:</span> {worksheet.ticket.customer.firstName} {worksheet.ticket.customer.lastName}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground italic">
              {t('worksheet.unscheduledCall')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════ */}
      {/* SUMMARY (editable) */}
      {/* ════════════════════════════════════════════════ */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t('worksheet.summary')}</label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
          placeholder={t('worksheet.summaryPlaceholder')}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={handleSummaryBlur}
          disabled={!isDraft}
        />
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* TAB NAVIGATION */}
      {/* ════════════════════════════════════════════════ */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              validActiveTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* TAB CONTENT */}
      {/* ════════════════════════════════════════════════ */}

      {/* ── Labor Tab ── */}
      {validActiveTab === 'labor' && (
        <div className="space-y-3">
          {/* Totals summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('worksheet.totalLabor')}</span>
            <span className="font-bold">{money(worksheet.totalLabor)}</span>
          </div>

          {/* Existing entries */}
          {worksheet.laborEntries.map((le: LaborEntry) => (
            <Card key={le.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {t(`label.laborType.${le.laborType}`) ?? le.laborType}
                  </span>
                  {!le.endTime && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                      ⏱ {t('worksheet.timerRunning')} — {formatElapsed(le.startTime)}
                    </span>
                  )}
                </div>
                {le.description && <p className="text-sm text-muted-foreground">{le.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>{t('worksheet.startTime')}: {formatDateTime(le.startTime)}</div>
                  <div>{t('worksheet.endTime')}: {le.endTime ? formatDateTime(le.endTime) : '—'}</div>
                  <div>{t('worksheet.breakMinutes')}: {le.breakMinutes} min</div>
                  <div>{t('worksheet.hourlyRate')}: {money(le.hourlyRate)}/h</div>
                  <div>{t('worksheet.billableHours')}: {le.billableHours != null ? le.billableHours.toFixed(2) : '—'}</div>
                  <div>{t('worksheet.lineTotal')}: {money(le.lineTotal)}</div>
                </div>
                {isDraft && (
                  <div className="flex gap-2 pt-1">
                    {!le.endTime && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stopTimerMutation.mutate(le.id)}
                        disabled={stopTimerMutation.isPending}
                      >
                        ⏹ {t('worksheet.stopTimer')}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteLaborMutation.mutate(le.id)}
                      disabled={deleteLaborMutation.isPending}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {worksheet.laborEntries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
          )}

          {/* Add labor form */}
          {isDraft && (
            <>
              {!showLaborForm ? (
                <Button variant="outline" className="w-full" onClick={() => setShowLaborForm(true)}>
                  + {t('worksheet.addLabor')}
                </Button>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('worksheet.addLabor')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddLabor} className="space-y-3">
                      {/* Mode toggle: Timer vs Manual */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={laborMode === 'timer' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLaborMode('timer')}
                        >
                          ⏱ {t('worksheet.laborModeTimer')}
                        </Button>
                        <Button
                          type="button"
                          variant={laborMode === 'manual' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLaborMode('manual')}
                        >
                          ✏️ {t('worksheet.laborModeManual')}
                        </Button>
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.laborType')}</label>
                        <select
                          value={laborType}
                          onChange={(e) => setLaborType(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {LABOR_TYPE_KEYS.map((key) => (
                            <option key={key} value={key}>{t(`label.laborType.${key}`)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.description')}</label>
                        <textarea
                          value={laborDescription}
                          onChange={(e) => setLaborDescription(e.target.value)}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                          placeholder={t('worksheet.description')}
                        />
                      </div>
                      {/* Manual mode: start time, end time, break minutes */}
                      {laborMode === 'manual' && (
                        <>
                          <div>
                            <label className="text-xs font-medium">{t('worksheet.startTime')}</label>
                            <input
                              type="datetime-local"
                              value={laborStartTime}
                              onChange={(e) => { setLaborStartTime(e.target.value); setLaborErrors((prev) => { const { startTime: _, ...rest } = prev; return rest; }); }}
                              className={`flex h-9 w-full rounded-md border ${laborErrors.startTime ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                            />
                            {laborErrors.startTime && <p className="text-xs text-destructive mt-0.5">{laborErrors.startTime}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-medium">{t('worksheet.laborEndTime')}</label>
                            <input
                              type="datetime-local"
                              value={laborEndTime}
                              onChange={(e) => { setLaborEndTime(e.target.value); setLaborErrors((prev) => { const { endTime: _, ...rest } = prev; return rest; }); }}
                              className={`flex h-9 w-full rounded-md border ${laborErrors.endTime ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                            />
                            {laborErrors.endTime && <p className="text-xs text-destructive mt-0.5">{laborErrors.endTime}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-medium">{t('worksheet.laborBreakMin')}</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={laborBreakMinutes}
                              onChange={(e) => setLaborBreakMinutes(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                          </div>
                        </>
                      )}
                      {/* Timer mode: optional start time override */}
                      {laborMode === 'timer' && (
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.startTime')}</label>
                          <input
                            type="datetime-local"
                            value={laborStartTime}
                            onChange={(e) => setLaborStartTime(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.hourlyRate')}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={laborHourlyRate}
                          onChange={(e) => { setLaborHourlyRate(e.target.value); setLaborErrors((prev) => { const { hourlyRate: _, ...rest } = prev; return rest; }); }}
                          className={`flex h-9 w-full rounded-md border ${laborErrors.hourlyRate ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                        />
                        {laborErrors.hourlyRate && <p className="text-xs text-destructive mt-0.5">{laborErrors.hourlyRate}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={addLaborMutation.isPending}>
                          {laborMode === 'timer' ? t('worksheet.laborModeTimer') : t('common.save')}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={resetLaborForm}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Parts Tab ── */}
      {validActiveTab === 'parts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('worksheet.totalParts')}</span>
            <span className="font-bold">{money(worksheet.totalParts)}</span>
          </div>

          {worksheet.parts.map((part: PartUsed) => (
            <Card key={part.id}>
              <CardContent className="p-4 space-y-2">
                {editingPartId === part.id ? (
                  /* Inline edit form */
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium">{t('worksheet.partName')}</label>
                      <input
                        type="text"
                        value={editPartName}
                        onChange={(e) => setEditPartName(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.partNumber')}</label>
                        <input
                          type="text"
                          value={editPartNumber}
                          onChange={(e) => setEditPartNumber(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.supplier')}</label>
                        <input
                          type="text"
                          value={editPartSupplier}
                          onChange={(e) => setEditPartSupplier(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.supplierCost')}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPartSupplierCost}
                          onChange={(e) => setEditPartSupplierCost(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.quantity')}</label>
                        <input
                          type="number"
                          min="1"
                          value={editPartQuantity}
                          onChange={(e) => setEditPartQuantity(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.unitPrice')}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPartUnitPrice}
                          onChange={(e) => setEditPartUnitPrice(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">{t('worksheet.warrantyMonths')}</label>
                      <input
                        type="number"
                        min="0"
                        value={editPartWarrantyMonths}
                        onChange={(e) => setEditPartWarrantyMonths(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdatePart(part.id)} disabled={updatePartMutation.isPending}>
                        {t('common.save')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingPartId(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{part.partName}</span>
                      <span className="text-sm font-bold">{money(part.lineTotal)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {part.partNumber && <div>{t('worksheet.partNumber')}: {part.partNumber}</div>}
                      {part.supplier && <div>{t('worksheet.supplier')}: {part.supplier}</div>}
                      <div>{t('worksheet.quantity')}: {part.quantity}</div>
                      <div>{t('worksheet.unitPrice')}: {money(part.unitPrice)}</div>
                      <div>{t('worksheet.supplierCost')}: {money(part.supplierCost)}</div>
                      {part.warrantyMonths != null && (
                        <div>{t('worksheet.warrantyMonths')}: {part.warrantyMonths}</div>
                      )}
                    </div>
                    {isDraft && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => startEditPart(part)}>
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePartMutation.mutate(part.id)}
                          disabled={deletePartMutation.isPending}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {worksheet.parts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
          )}

          {/* Add part form */}
          {isDraft && (
            <>
              {!showPartForm ? (
                <Button variant="outline" className="w-full" onClick={() => setShowPartForm(true)}>
                  + {t('worksheet.addPart')}
                </Button>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('worksheet.addPart')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddPart} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.partName')}</label>
                        <input
                          type="text"
                          value={partName}
                          onChange={(e) => { setPartName(e.target.value); setPartErrors((prev) => { const { partName: _, ...rest } = prev; return rest; }); }}
                          className={`flex h-9 w-full rounded-md border ${partErrors.partName ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                        />
                        {partErrors.partName && <p className="text-xs text-destructive mt-0.5">{partErrors.partName}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.partNumber')}</label>
                          <input
                            type="text"
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.supplier')}</label>
                          <input
                            type="text"
                            value={partSupplier}
                            onChange={(e) => setPartSupplier(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.supplierCost')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={partSupplierCost}
                            onChange={(e) => setPartSupplierCost(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.quantity')}</label>
                          <input
                            type="number"
                            min="1"
                            value={partQuantity}
                            onChange={(e) => { setPartQuantity(e.target.value); setPartErrors((prev) => { const { quantity: _, ...rest } = prev; return rest; }); }}
                            className={`flex h-9 w-full rounded-md border ${partErrors.quantity ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                          />
                          {partErrors.quantity && <p className="text-xs text-destructive mt-0.5">{partErrors.quantity}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.unitPrice')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={partUnitPrice}
                            onChange={(e) => { setPartUnitPrice(e.target.value); setPartErrors((prev) => { const { unitPrice: _, ...rest } = prev; return rest; }); }}
                            className={`flex h-9 w-full rounded-md border ${partErrors.unitPrice ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                          />
                          {partErrors.unitPrice && <p className="text-xs text-destructive mt-0.5">{partErrors.unitPrice}</p>}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.warrantyMonths')}</label>
                        <input
                          type="number"
                          min="0"
                          value={partWarrantyMonths}
                          onChange={(e) => setPartWarrantyMonths(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={addPartMutation.isPending}>
                          {t('common.save')}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={resetPartForm}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Travel Tab ── */}
      {validActiveTab === 'travel' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('worksheet.totalTravel')}</span>
            <span className="font-bold">{money(worksheet.totalTravel)}</span>
          </div>

          {worksheet.travelEntries.map((te: TravelEntry) => (
            <Card key={te.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {te.departureAddress || '?'} → {te.arrivalAddress || '?'}
                  </span>
                  <span className="text-sm font-bold">{money(te.lineTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <div>{t('worksheet.distanceKm')}: {te.distanceKm} km</div>
                  <div>{t('worksheet.ratePerKm')}: {money(te.ratePerKm)}/km</div>
                  <div>{t('worksheet.travelDate')}: {formatDateTime(te.travelDate)}</div>
                  {te.notes && <div>{t('worksheet.travelNotes')}: {te.notes}</div>}
                </div>
                {isDraft && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTravelMutation.mutate(te.id)}
                      disabled={deleteTravelMutation.isPending}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {worksheet.travelEntries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
          )}

          {/* Add travel form */}
          {isDraft && (
            <>
              {!showTravelForm ? (
                <Button variant="outline" className="w-full" onClick={() => setShowTravelForm(true)}>
                  + {t('worksheet.addTravel')}
                </Button>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('worksheet.addTravel')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddTravel} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.departureAddress')}</label>
                        <input
                          type="text"
                          value={travelDeparture}
                          onChange={(e) => setTravelDeparture(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.arrivalAddress')}</label>
                        <input
                          type="text"
                          value={travelArrival}
                          onChange={(e) => setTravelArrival(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>

                      {/* Distance is always required (for reimbursement) */}
                      <div>
                        <label className="text-xs font-medium">{t('worksheet.distanceKm')}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={travelDistanceKm}
                          onChange={(e) => { setTravelDistanceKm(e.target.value); setTravelErrors((prev) => { const { distanceKm: _, ...rest } = prev; return rest; }); }}
                          className={`flex h-9 w-full rounded-md border ${travelErrors.distanceKm ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                        />
                        {travelErrors.distanceKm && <p className="text-xs text-destructive mt-0.5">{travelErrors.distanceKm}</p>}
                      </div>

                      {/* Per-km mode: show rate per km */}
                      {wsConfig.travelChargeMode === 'per_km' && (
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.ratePerKm')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={travelRatePerKm}
                            onChange={(e) => setTravelRatePerKm(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                        </div>
                      )}

                      {/* Hourly mode: show travel time in minutes */}
                      {wsConfig.travelChargeMode === 'hourly' && (
                        <div>
                          <label className="text-xs font-medium">{t('worksheet.travelTimeMinutes')}</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={travelTimeMinutes}
                            onChange={(e) => setTravelTimeMinutes(e.target.value)}
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('worksheet.travelBillingInfo')} ({wsConfig.travelHourlyRate} $/h)
                          </p>
                        </div>
                      )}

                      {/* Flat mode: show info about flat rate */}
                      {wsConfig.travelChargeMode === 'flat' && (
                        <p className="text-xs text-muted-foreground">
                          {t('settings.travelFlatRate')}: {wsConfig.travelFlatRate} $
                        </p>
                      )}

                      <div>
                        <label className="text-xs font-medium">{t('worksheet.travelDate')}</label>
                        <input
                          type="datetime-local"
                          value={travelDate}
                          onChange={(e) => setTravelDate(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={addTravelMutation.isPending}>
                          {t('common.save')}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={resetTravelForm}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Notes Tab ── */}
      {validActiveTab === 'notes' && (
        <div className="space-y-3">
          {worksheet.notes.map((note: WorksheetNote) => (
            <Card key={note.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {t(`label.wsNoteType.${note.noteType}`) ?? note.noteType}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground">
                  {note.author.firstName} {note.author.lastName}
                </p>
                <div className="flex gap-2 pt-1">
                  {(note.noteType === 'DIAGNOSTIC_FINDING' || note.noteType === 'PROCEDURE') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => convertToKbMutation.mutate(note.id)}
                      disabled={convertToKbMutation.isPending}
                    >
                      {t('worksheet.convertToKb')}
                    </Button>
                  )}
                   {isDraft && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      disabled={deleteNoteMutation.isPending}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {worksheet.notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
          )}

          {/* Add note form */}
          {isDraft && (!showNoteForm ? (
            <Button variant="outline" className="w-full" onClick={() => setShowNoteForm(true)}>
              + {t('worksheet.addNote')}
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('worksheet.addNote')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.noteType')}</label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {WS_NOTE_TYPE_KEYS.map((key) => (
                        <option key={key} value={key}>{t(`label.wsNoteType.${key}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.noteContent')}</label>
                    <textarea
                      value={noteContent}
                      onChange={(e) => { setNoteContent(e.target.value); setNoteErrors((prev) => { const { noteContent: _, ...rest } = prev; return rest; }); }}
                      className={`flex w-full rounded-md border ${noteErrors.noteContent ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm min-h-[80px]`}
                      placeholder={t('worksheet.noteContent')}
                    />
                    {noteErrors.noteContent && <p className="text-xs text-destructive mt-0.5">{noteErrors.noteContent}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={addNoteMutation.isPending}>
                      {t('common.save')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={resetNoteForm}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
           ))}
        </div>
      )}

      {/* ── Follow-ups Tab ── */}
      {validActiveTab === 'followups' && (
        <div className="space-y-3">
          {worksheet.followUps.map((fu: FollowUp) => (
            <Card key={fu.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    {t(`label.followUpType.${fu.followUpType}`) ?? fu.followUpType}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${fu.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {fu.completed ? '✓' : '○'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{t('worksheet.scheduledDate')}: {formatDateTime(fu.scheduledDate)}</div>
                  {fu.notes && <div className="mt-1">{fu.notes}</div>}
                  {fu.completedAt && <div>{t('worksheet.completedAt')}: {formatDateTime(fu.completedAt)}</div>}
                </div>
                <div className="flex gap-2 pt-1">
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
                  {isDraft && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteFollowUpMutation.mutate(fu.id)}
                      disabled={deleteFollowUpMutation.isPending}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {worksheet.followUps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('worksheet.noEntries')}</p>
          )}

          {/* Add follow-up form */}
          {isDraft && (!showFollowUpForm ? (
            <Button variant="outline" className="w-full" onClick={() => setShowFollowUpForm(true)}>
              + {t('worksheet.addFollowUp')}
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('worksheet.addFollowUp')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddFollowUp} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.followUpType')}</label>
                    <select
                      value={followUpType}
                      onChange={(e) => setFollowUpType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {FOLLOWUP_TYPE_KEYS.map((key) => (
                        <option key={key} value={key}>{t(`label.followUpType.${key}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.scheduledDate')}</label>
                    <input
                      type="datetime-local"
                      value={followUpScheduledDate}
                      onChange={(e) => { setFollowUpScheduledDate(e.target.value); setFollowUpErrors((prev) => { const { scheduledDate: _, ...rest } = prev; return rest; }); }}
                      className={`flex h-9 w-full rounded-md border ${followUpErrors.scheduledDate ? 'border-destructive' : 'border-input'} bg-background px-3 py-1 text-sm`}
                    />
                    {followUpErrors.scheduledDate && <p className="text-xs text-destructive mt-0.5">{followUpErrors.scheduledDate}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t('worksheet.followUpNotes')}</label>
                    <textarea
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                      placeholder={t('worksheet.followUpNotes')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={addFollowUpMutation.isPending}>
                      {t('common.save')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={resetFollowUpForm}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* SIGNATURES */}
      {/* ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technician signature */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('worksheet.techSignature')}</CardTitle>
          </CardHeader>
          <CardContent>
            {worksheet.techSignature ? (
              <div className="space-y-2">
                <img
                  src={worksheet.techSignature}
                  alt={t('worksheet.techSignature')}
                  className="max-h-32 border rounded bg-white p-2"
                />
                {worksheet.techSignedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('worksheet.signedAt')}: {formatDateTime(worksheet.techSignedAt)}
                  </p>
                )}
              </div>
            ) : isDraft ? (
              <SignaturePad
                onSave={(dataUrl) => saveSignatureMutation.mutate({ type: 'tech', signatureData: dataUrl })}
                disabled={saveSignatureMutation.isPending}
              />
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
            {worksheet.custSignature ? (
              <div className="space-y-2">
                <img
                  src={worksheet.custSignature}
                  alt={t('worksheet.custSignature')}
                  className="max-h-32 border rounded bg-white p-2"
                />
                {worksheet.custSignedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('worksheet.signedAt')}: {formatDateTime(worksheet.custSignedAt)}
                  </p>
                )}
              </div>
            ) : isDraft ? (
              <SignaturePad
                onSave={(dataUrl) => saveSignatureMutation.mutate({ type: 'customer', signatureData: dataUrl })}
                disabled={saveSignatureMutation.isPending}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t('worksheet.noSignature')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* STICKY BOTTOM BAR */}
      {/* ════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Grand total */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t('worksheet.grandTotal')}</p>
            <p className="text-xl font-bold">{money(worksheet.grandTotal)}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={updateSummaryMutation.isPending}
              >
                {t('worksheet.saveDraft')}
              </Button>
            )}
            {isDraft && (
              <Button
                size="sm"
                onClick={handleSubmitWorksheet}
                disabled={changeStatusMutation.isPending}
              >
                {t('worksheet.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
