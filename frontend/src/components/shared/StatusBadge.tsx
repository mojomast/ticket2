import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, PROPOSAL_STATUS_COLORS, PROPOSAL_STATUS_LABELS, WO_STATUS_COLORS, WO_STATUS_LABELS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import HelpTooltip from './HelpTooltip';

// French descriptions for each status type and value
const STATUS_DESCRIPTIONS: Record<string, Record<string, string>> = {
  ticket: {
    NEW: 'Nouveau billet en attente de prise en charge',
    OPEN: 'Billet ouvert et en cours de traitement',
    IN_PROGRESS: 'Un technicien travaille activement sur ce billet',
    WAITING_CUSTOMER: 'En attente d\'une réponse du client',
    WAITING_PARTS: 'En attente de pièces ou matériel',
    RESOLVED: 'Le problème a été résolu',
    CLOSED: 'Billet fermé définitivement',
    CANCELLED: 'Billet annulé',
  },
  priority: {
    LOW: 'Priorité basse — traitement dans les délais normaux',
    MEDIUM: 'Priorité moyenne — traitement dans un délai raisonnable',
    HIGH: 'Priorité haute — traitement rapide requis',
    URGENT: 'Urgent — traitement immédiat nécessaire',
  },
  appointment: {
    SCHEDULED: 'Rendez-vous planifié',
    CONFIRMED: 'Rendez-vous confirmé par le client',
    COMPLETED: 'Rendez-vous terminé',
    CANCELLED: 'Rendez-vous annulé',
    NO_SHOW: 'Le client ne s\'est pas présenté',
  },
  proposal: {
    DRAFT: 'Brouillon — pas encore envoyé au client',
    SENT: 'Devis envoyé au client',
    ACCEPTED: 'Devis accepté par le client',
    REJECTED: 'Devis refusé par le client',
  },
  workorder: {
    DRAFT: 'Bon de travail en brouillon',
    INTAKE: 'Réception de l\'équipement en cours',
    DIAGNOSED: 'Diagnostic terminé',
    IN_REPAIR: 'Réparation en cours',
    WAITING_PARTS: 'En attente de pièces',
    REPAIRED: 'Réparation terminée',
    READY: 'Prêt pour la remise au client',
    DELIVERED: 'Remis au client',
    CANCELLED: 'Bon de travail annulé',
  },
};

interface StatusBadgeProps {
  status: string;
  type?: 'ticket' | 'priority' | 'appointment' | 'proposal' | 'workorder';
  className?: string;
}

export default function StatusBadge({ status, type = 'ticket', className }: StatusBadgeProps) {
  let colors: { bg: string; text: string } | undefined;
  let label = status;

  switch (type) {
    case 'ticket':
      colors = STATUS_COLORS[status];
      label = STATUS_LABELS[status] || status;
      break;
    case 'priority':
      colors = PRIORITY_COLORS[status];
      label = PRIORITY_LABELS[status] || status;
      break;
    case 'appointment':
      colors = APPOINTMENT_STATUS_COLORS[status];
      label = APPOINTMENT_STATUS_LABELS[status] || status;
      break;
    case 'proposal':
      colors = PROPOSAL_STATUS_COLORS[status];
      label = PROPOSAL_STATUS_LABELS[status] || status;
      break;
    case 'workorder':
      colors = WO_STATUS_COLORS[status];
      label = WO_STATUS_LABELS[status] || status;
      break;
  }

  if (!colors) {
    colors = { bg: 'bg-gray-100', text: 'text-gray-700' };
  }

  const description = STATUS_DESCRIPTIONS[type]?.[status];

  const badge = (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      {label}
    </span>
  );

  if (description) {
    return (
      <HelpTooltip content={description} side="top">
        {badge}
      </HelpTooltip>
    );
  }

  return badge;
}
