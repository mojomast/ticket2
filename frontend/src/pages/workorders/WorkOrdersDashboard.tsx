import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, WorkOrder } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import {
  WO_STATUS_LABELS, WO_STATUS_COLORS, WO_KANBAN_COLUMNS,
  WO_TERMINAL_STATUSES, DEVICE_TYPE_LABELS,
} from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';

type ViewMode = 'kanban' | 'list';
const PAGE_LIMIT = 25;

function formatRelativeTime(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t('wo.dashboard.relativeNow');
  if (diffMins < 60) return t('wo.dashboard.relativeMinutes', { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('wo.dashboard.relativeHours', { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t('wo.dashboard.relativeDays', { count: diffDays });
}

function isOverdue(wo: WorkOrder): boolean {
  if (!wo.estimatedPickupDate) return false;
  if ((WO_TERMINAL_STATUSES as readonly string[]).includes(wo.status)) return false;
  return new Date(wo.estimatedPickupDate) < new Date();
}

// ─── Age Badge ───
// Color-coded pill showing how many days since intake

function AgeBadge({ wo }: { wo: WorkOrder }) {
  const { t } = useTranslation();
  // Don't show for terminal statuses
  if ((WO_TERMINAL_STATUSES as readonly string[]).includes(wo.status)) return null;

  const now = new Date();
  const intake = new Date(wo.intakeDate);
  const diffMs = now.getTime() - intake.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Determine color based on age
  let colorClasses: string;
  if (days <= 2) {
    colorClasses = 'bg-green-100 text-green-700';
  } else if (days <= 5) {
    colorClasses = 'bg-yellow-100 text-yellow-700';
  } else if (days <= 9) {
    colorClasses = 'bg-orange-100 text-orange-700';
  } else {
    colorClasses = 'bg-red-100 text-red-700';
  }

  const label = days === 0 ? t('wo.dashboard.ageLessThanDay') : t('wo.dashboard.ageDays', { count: days });

  return (
    <HelpTooltip content={t('wo.dashboard.ageBadgeTooltip')} side="top">
      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', colorClasses)}>
        {label}
      </span>
    </HelpTooltip>
  );
}

export default function WorkOrdersDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const basePath = user?.role === 'ADMIN' ? '/admin' : '/technicien';

  // Debounce search input (300ms)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const workOrderQueryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  // Fetch paginated work orders
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workorders', workOrderQueryParams],
    queryFn: () => api.workorders.listPaginated(workOrderQueryParams),
  });

  const workOrders = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Fetch stats
  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['workorders-stats'],
    queryFn: () => api.workorders.stats(),
  });

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  // Group work orders by status for Kanban
  const columns = useMemo(() => {
    const grouped: Record<string, WorkOrder[]> = {};
    for (const col of WO_KANBAN_COLUMNS) {
      grouped[col] = [];
    }
    for (const wo of workOrders) {
      if (grouped[wo.status] !== undefined) {
        grouped[wo.status]!.push(wo);
      }
    }
    return grouped;
  }, [workOrders]);

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('wo.dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('wo.dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpTooltip content={t('wo.dashboard.newReceptionTooltip')} side="bottom">
            <Link
              to={`${basePath}/bons-travail/nouveau`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
            >
              {t('wo.dashboard.newReception')}
            </Link>
          </HelpTooltip>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      {stats && !statsError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <StatCard label={t('wo.dashboard.totalOpen')} value={stats.totalOpen} color="text-blue-700" bg="bg-blue-50" />
          <StatCard label={t('wo.dashboard.reception')} value={stats.statusCounts.RECEPTION || 0} color="text-blue-700" bg="bg-blue-50" />
          <StatCard label={t('wo.dashboard.diagnostic')} value={stats.statusCounts.DIAGNOSTIC || 0} color="text-cyan-700" bg="bg-cyan-50" />
          <StatCard label={t('wo.dashboard.waitingParts')} value={stats.statusCounts.ATTENTE_PIECES || 0} color="text-orange-700" bg="bg-orange-50" />
          <StatCard label={t('wo.dashboard.inRepair')} value={stats.statusCounts.EN_REPARATION || 0} color="text-purple-700" bg="bg-purple-50" />
          <StatCard
            label={t('wo.dashboard.overdue')}
            value={stats.overdue}
            color={stats.overdue > 0 ? 'text-red-700' : 'text-gray-500'}
            bg={stats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'}
          />
        </div>
      )}

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex border rounded-md overflow-hidden">
          <HelpTooltip content={t('wo.dashboard.kanbanTooltip')} side="bottom">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium',
                viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {t('wo.dashboard.kanban')}
            </button>
          </HelpTooltip>
          <HelpTooltip content={t('wo.dashboard.listTooltip')} side="bottom">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {t('wo.dashboard.list')}
            </button>
          </HelpTooltip>
        </div>

        {/* Search */}
        <HelpTooltip content={t('wo.dashboard.searchTooltip')} side="bottom">
          <input
            type="text"
            placeholder={t('wo.dashboard.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-card w-48"
          />
        </HelpTooltip>

        {/* Status filter (always visible, reset on kanban) */}
        <HelpTooltip content={t('wo.dashboard.filterStatusTooltip')} side="bottom">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-card"
          >
            <option value="">{t('wo.dashboard.allStatuses')}</option>
            {Object.entries(WO_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </HelpTooltip>
      </div>

      {/* ─── Content ─── */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('wo.dashboard.loading')}</div>
      ) : isError ? (
        <div className="text-center py-12 text-red-600">
          {t('wo.dashboard.loadError')}
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView columns={columns} basePath={basePath} />
      ) : (
        <ListView workOrders={workOrders} basePath={basePath} />
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {t('common.pageOf', { page: String(page), total: String(totalPages) })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t('common.previous_arrow')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              {t('common.next_arrow')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-lg p-3 text-center', bg)}>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ─── Kanban View ───

function KanbanView({ columns, basePath }: { columns: Record<string, WorkOrder[]>; basePath: string }) {
  const { t } = useTranslation();

  const columnTooltipKeys: Record<string, string> = {
    RECEPTION: 'wo.dashboard.columnReception',
    DIAGNOSTIC: 'wo.dashboard.columnDiagnostic',
    ATTENTE_APPROBATION: 'wo.dashboard.columnAttenteApprobation',
    APPROUVE: 'wo.dashboard.columnApprouve',
    ATTENTE_PIECES: 'wo.dashboard.columnAttentePieces',
    EN_REPARATION: 'wo.dashboard.columnEnReparation',
    VERIFICATION: 'wo.dashboard.columnVerification',
    PRET: 'wo.dashboard.columnPret',
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {WO_KANBAN_COLUMNS.map((status) => {
        const items = columns[status] || [];
        const colors = WO_STATUS_COLORS[status];
        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-lg flex flex-col"
          >
            {/* Column header */}
            <HelpTooltip content={columnTooltipKeys[status] ? t(columnTooltipKeys[status]) : (WO_STATUS_LABELS[status] || status)} side="top">
              <div className={cn('px-3 py-2 rounded-t-lg border-b flex items-center justify-between', colors?.bg)}>
                <span className={cn('text-xs font-semibold', colors?.text)}>
                  {WO_STATUS_LABELS[status]}
                </span>
                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', colors?.bg, colors?.text)}>
                  {items.length}
                </span>
              </div>
            </HelpTooltip>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: '65vh' }}>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t('wo.dashboard.noItems')}</p>
              ) : (
                items.map((wo) => (
                  <KanbanCard key={wo.id} wo={wo} basePath={basePath} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ wo, basePath }: { wo: WorkOrder; basePath: string }) {
  const { t } = useTranslation();
  const overdue = isOverdue(wo);

  return (
    <Link
      to={`${basePath}/bons-travail/${wo.id}`}
      className={cn(
        'block bg-card border rounded-md p-3 space-y-2 hover:shadow-md transition-shadow',
        overdue && 'border-red-300 bg-red-50/50'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-mono font-bold text-primary">{wo.orderNumber}</span>
        <StatusBadge status={wo.priority} type="priority" />
      </div>

      <div className="text-sm font-medium truncate">{wo.customerName}</div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">
          {DEVICE_TYPE_LABELS[wo.deviceType] || wo.deviceType}
        </span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="text-xs text-muted-foreground truncate">{wo.deviceBrand} {wo.deviceModel}</span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2">{wo.reportedIssue}</p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {wo.technician ? (
          <span>{wo.technician.firstName} {wo.technician.lastName?.charAt(0)}.</span>
        ) : (
          <span className="italic">{t('wo.dashboard.unassigned')}</span>
        )}
        <div className="flex items-center gap-1.5">
          <AgeBadge wo={wo} />
          <span>{formatRelativeTime(wo.intakeDate, t)}</span>
        </div>
      </div>

      {overdue && (
        <div className="text-xs font-medium text-red-700">
          {t('wo.dashboard.overdueLabel')}
        </div>
      )}

      {wo.estimatedCost != null && (
        <div className="text-xs text-muted-foreground">
          {t('wo.dashboard.quoteLabel', { amount: wo.estimatedCost.toFixed(2) })}
        </div>
      )}
    </Link>
  );
}

// ─── List View ───

function ListView({ workOrders, basePath }: { workOrders: WorkOrder[]; basePath: string }) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('wo.dashboard.thNumber')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('wo.dashboard.thStatus')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('wo.dashboard.thClient')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('wo.dashboard.thDevice')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">{t('wo.dashboard.thProblem')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">{t('wo.dashboard.thTechnician')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('wo.dashboard.thPriority')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">{t('wo.dashboard.thReception')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('wo.dashboard.thAge')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  {t('wo.dashboard.noWorkOrders')}
                </td>
              </tr>
            ) : workOrders.map((wo) => (
              <tr key={wo.id} className={cn('hover:bg-muted/50', isOverdue(wo) && 'bg-red-50/50')}>
                <td className="px-4 py-3">
                  <Link to={`${basePath}/bons-travail/${wo.id}`} className="font-mono font-medium text-primary hover:underline">
                    {wo.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={wo.status} type="workorder" />
                </td>
                <td className="px-4 py-3 hidden md:table-cell max-w-[150px] min-w-0 truncate">{wo.customerName}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {wo.deviceBrand} {wo.deviceModel}
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground hidden lg:table-cell">{wo.reportedIssue}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {wo.technician ? `${wo.technician.firstName} ${wo.technician.lastName?.charAt(0)}.` : '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <StatusBadge status={wo.priority} type="priority" />
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                  {new Date(wo.intakeDate).toLocaleDateString('fr-CA')}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <AgeBadge wo={wo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
