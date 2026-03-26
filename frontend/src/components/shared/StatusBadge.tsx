import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, PROPOSAL_STATUS_COLORS, PROPOSAL_STATUS_LABELS, WO_STATUS_COLORS, WO_STATUS_LABELS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import HelpTooltip from './HelpTooltip';

// French descriptions for each status type and value (keys match the actual French enum values)
const STATUS_DESCRIPTIONS: Record<string, Record<string, string>> = {
  ticket: {
    NOUVELLE: 'Nouveau billet en attente de prise en charge',
    EN_ATTENTE_APPROBATION: 'Devis envoyé — en attente d\'approbation du client',
    EN_ATTENTE_REPONSE_CLIENT: 'En attente d\'une réponse du client',
    APPROUVEE: 'Devis approuvé — billet prêt à être planifié',
    PLANIFIEE: 'Rendez-vous planifié pour l\'intervention',
    EN_COURS: 'Un technicien travaille activement sur ce billet',
    BLOCAGE: 'Billet bloqué — en attente de résolution d\'un obstacle',
    TERMINEE: 'Le travail est terminé — en attente de fermeture',
    FERMEE: 'Billet fermé définitivement',
    ANNULEE: 'Billet annulé',
  },
  priority: {
    BASSE: 'Priorité basse — traitement dans les délais normaux',
    NORMALE: 'Priorité normale — traitement dans un délai raisonnable',
    HAUTE: 'Priorité haute — traitement rapide requis',
    URGENTE: 'Urgent — traitement immédiat nécessaire',
  },
  appointment: {
    DEMANDE: 'Demande de rendez-vous en attente',
    PLANIFIE: 'Rendez-vous planifié',
    CONFIRME: 'Rendez-vous confirmé par le client',
    EN_COURS: 'Intervention en cours',
    TERMINE: 'Rendez-vous terminé',
    ANNULE: 'Rendez-vous annulé',
  },
  proposal: {
    PROPOSEE: 'Proposition en attente de réponse',
    ACCEPTEE: 'Proposition acceptée — rendez-vous créé',
    REFUSEE: 'Proposition refusée',
    ANNULEE: 'Proposition annulée',
  },
  workorder: {
    RECEPTION: 'Équipement reçu — en attente de diagnostic',
    DIAGNOSTIC: 'Diagnostic en cours — identification du problème',
    ATTENTE_APPROBATION: 'Devis envoyé — en attente d\'approbation du client',
    APPROUVE: 'Devis approuvé — prêt pour la réparation',
    ATTENTE_PIECES: 'En attente de pièces ou de matériel nécessaire',
    EN_REPARATION: 'Réparation en cours par le technicien',
    VERIFICATION: 'Vérification finale après réparation',
    PRET: 'Réparation terminée — prêt pour le ramassage par le client',
    REMIS: 'Équipement remis au client',
    REFUSE: 'Devis refusé par le client',
    ABANDONNE: 'Bon de travail abandonné — équipement non réclamé',
    ANNULE: 'Bon de travail annulé',
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
