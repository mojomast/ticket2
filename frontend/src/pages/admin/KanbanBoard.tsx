import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { api, type Ticket } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { STATUS_LABELS, STATUS_COLORS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';

// ─── Constants ───

const KANBAN_COLUMNS = [
  'NOUVELLE',
  'EN_ATTENTE_APPROBATION',
  'EN_ATTENTE_REPONSE_CLIENT',
  'APPROUVEE',
  'PLANIFIEE',
  'EN_COURS',
  'BLOCAGE',
  'TERMINEE',
  'FERMEE',
  'ANNULEE',
] as const;

type KanbanStatus = (typeof KANBAN_COLUMNS)[number];

/** French tooltip descriptions for each kanban column status */
const COLUMN_TOOLTIPS: Record<KanbanStatus, string> = {
  NOUVELLE: 'Billets nouvellement créés, en attente de prise en charge',
  EN_ATTENTE_APPROBATION: 'Devis envoyé au client, en attente de son approbation',
  EN_ATTENTE_REPONSE_CLIENT: 'En attente d\'une réponse ou action du client',
  APPROUVEE: 'Devis approuvé par le client, prêt à être planifié',
  PLANIFIEE: 'Rendez-vous planifié avec le technicien',
  EN_COURS: 'Travail en cours par le technicien',
  BLOCAGE: 'Travail bloqué — nécessite une action pour débloquer',
  TERMINEE: 'Travail terminé, en attente de fermeture',
  FERMEE: 'Billet fermé définitivement',
  ANNULEE: 'Billet annulé',
};

// ─── Draggable Ticket Card ───

interface TicketCardProps {
  ticket: Ticket;
  isDragOverlay?: boolean;
}

function TicketCard({ ticket, isDragOverlay = false }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  // When this card is being dragged, show a faded placeholder
  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        className="bg-card border border-dashed border-muted-foreground/30 rounded-md p-3 opacity-30"
        style={style}
      >
        <p className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</p>
        <p className="text-sm font-medium mt-1 line-clamp-2">{ticket.title}</p>
      </div>
    );
  }

  // The actual card content (shared between in-place and overlay)
  const cardContent = (
    <>
      <p className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</p>
      <p className="text-sm font-medium mt-1 line-clamp-2">{ticket.title}</p>
      <div className="flex items-center justify-between mt-2">
        <StatusBadge status={ticket.priority} type="priority" />
        <span className="text-xs text-muted-foreground">
          {ticket.customer?.firstName?.[0]}
          {ticket.customer?.lastName?.[0]}
        </span>
      </div>
    </>
  );

  // Drag overlay renders without link (no navigation on drag)
  if (isDragOverlay) {
    return (
      <div className="bg-card border rounded-md p-3 shadow-lg ring-2 ring-primary/20 cursor-grabbing w-[256px]">
        {cardContent}
      </div>
    );
  }

  return (
    <HelpTooltip content="Cliquez pour voir les détails ou glissez pour changer le statut" side="right">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="block bg-card border rounded-md p-3 hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing"
      >
        <Link
          to={`/admin/billets/${ticket.id}`}
          className="block"
          // Prevent navigation when starting a drag
          onClick={(e) => {
            if (isDragging) e.preventDefault();
          }}
        >
          {cardContent}
        </Link>
      </div>
    </HelpTooltip>
  );
}

// ─── Droppable Column ───

interface KanbanColumnProps {
  status: KanbanStatus;
  tickets: Ticket[];
  isOver: boolean;
}

function KanbanColumn({ status, tickets, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  const colors = STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-w-[280px] max-w-[280px] bg-muted/50 rounded-lg p-3 transition-colors flex flex-col',
        isOver && 'ring-2 ring-primary/40 bg-primary/5'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <HelpTooltip content={COLUMN_TOOLTIPS[status]} side="bottom" align="start">
          <div className="flex items-center gap-2">
            {colors && (
              <div className={cn('w-2 h-2 rounded-full', colors.bg)} />
            )}
            <h3 className="font-medium text-sm truncate">{STATUS_LABELS[status] || status}</h3>
          </div>
        </HelpTooltip>
        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 flex-shrink-0">
          {tickets.length}
        </span>
      </div>

      {/* Ticket list */}
      <div className="space-y-2 flex-1 min-h-[60px]">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}

        {/* Empty column hint */}
        {tickets.length === 0 && (
          <div
            className={cn(
              'border-2 border-dashed rounded-md p-4 text-center text-xs text-muted-foreground transition-colors',
              isOver ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/20'
            )}
          >
            Déposer ici
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ───

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Track the currently-dragged ticket for the overlay
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Track which column is currently being hovered (for highlighting)
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Fetch all tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', { limit: 100 }],
    queryFn: () => api.tickets.list({ limit: 100 }),
  });

  const allTickets: Ticket[] = tickets ?? [];

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {};
    for (const status of KANBAN_COLUMNS) {
      grouped[status] = [];
    }
    for (const ticket of allTickets) {
      const col = grouped[ticket.status];
      if (col) {
        col.push(ticket);
      }
    }
    return grouped;
  }, [allTickets]);

  // Mutation for changing ticket status with optimistic updates
  const changeStatusMutation = useMutation({
    mutationFn: ({ ticketId, newStatus }: { ticketId: string; newStatus: string }) =>
      api.tickets.changeStatus(ticketId, newStatus),

    onMutate: async ({ ticketId, newStatus }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tickets', { limit: 100 }] });

      // Snapshot the previous state
      const previousTickets = queryClient.getQueryData<Ticket[]>(['tickets', { limit: 100 }]);

      // Optimistically update the cache
      queryClient.setQueryData<Ticket[]>(['tickets', { limit: 100 }], (old) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === ticketId ? { ...t, status: newStatus } : t
        );
      });

      return { previousTickets };
    },

    onError: (_error, _variables, context) => {
      // Revert to the previous state on error
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets', { limit: 100 }], context.previousTickets);
      }
      toast.error('Erreur lors du changement de statut. Le billet a été remis à sa position.');
    },

    onSettled: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ['tickets', { limit: 100 }] });
    },
  });

  // Configure pointer sensor with activation constraint to distinguish click from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (allows clicks for navigation)
      },
    })
  );

  // ─── Drag Handlers ───

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as Ticket | undefined;
    if (ticket) {
      setActiveTicket(ticket);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverColumnId(event.over?.id?.toString() ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTicket(null);
      setOverColumnId(null);

      const { active, over } = event;
      if (!over) return;

      const ticketId = active.id as string;
      const ticket = active.data.current?.ticket as Ticket | undefined;
      if (!ticket) return;

      // Determine the target column — `over` could be a column ID or another card's ID
      let targetStatus: string | undefined;

      // Check if we dropped on a column directly
      if (KANBAN_COLUMNS.includes(over.id as KanbanStatus)) {
        targetStatus = over.id as string;
      } else {
        // Dropped on another ticket — find which column that ticket belongs to
        const overTicket = allTickets.find((t) => t.id === over.id);
        if (overTicket) {
          targetStatus = overTicket.status;
        }
      }

      // Only fire mutation if the status actually changed
      if (targetStatus && targetStatus !== ticket.status) {
        changeStatusMutation.mutate({ ticketId, newStatus: targetStatus });
      }
    },
    [allTickets, changeStatusMutation]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTicket(null);
    setOverColumnId(null);
  }, []);

  // ─── Render ───

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Kanban</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <div key={status} className="min-w-[280px] bg-muted/50 rounded-lg p-3 animate-pulse">
              <div className="h-5 bg-muted rounded w-24 mb-3" />
              <div className="space-y-2">
                <div className="h-20 bg-muted rounded" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kanban</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tickets={ticketsByStatus[status] || []}
              isOver={overColumnId === status}
            />
          ))}
        </div>

        {/* Floating card that follows the cursor during drag */}
        <DragOverlay dropAnimation={null}>
          {activeTicket ? (
            <TicketCard ticket={activeTicket} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
