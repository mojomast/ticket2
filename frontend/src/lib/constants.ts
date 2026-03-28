// ─── Status Colors (SINGLE SOURCE OF TRUTH) ───

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NOUVELLE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  EN_ATTENTE_APPROBATION: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  EN_ATTENTE_REPONSE_CLIENT: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  APPROUVEE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  PLANIFIEE: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  EN_COURS: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  BLOCAGE: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  TERMINEE: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  FERMEE: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  ANNULEE: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  BASSE: { bg: 'bg-gray-100', text: 'text-gray-700' },
  NORMALE: { bg: 'bg-blue-100', text: 'text-blue-700' },
  HAUTE: { bg: 'bg-orange-100', text: 'text-orange-700' },
  URGENTE: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DEMANDE: { bg: 'bg-amber-100', text: 'text-amber-800' },
  PLANIFIE: { bg: 'bg-blue-100', text: 'text-blue-800' },
  CONFIRME: { bg: 'bg-green-100', text: 'text-green-800' },
  EN_COURS: { bg: 'bg-purple-100', text: 'text-purple-800' },
  TERMINE: { bg: 'bg-gray-100', text: 'text-gray-800' },
  ANNULE: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  DEMANDE: 'Demande',
  PLANIFIE: 'Planifié',
  CONFIRME: 'Confirmé',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

export const PROPOSAL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PROPOSEE: { bg: 'bg-amber-100', text: 'text-amber-800' },
  ACCEPTEE: { bg: 'bg-green-100', text: 'text-green-800' },
  REFUSEE: { bg: 'bg-red-100', text: 'text-red-800' },
  ANNULEE: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PROPOSEE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
};

// ─── Status Labels (French) ───

export const STATUS_LABELS: Record<string, string> = {
  NOUVELLE: 'Nouvelle',
  EN_ATTENTE_APPROBATION: 'En attente d\'approbation',
  EN_ATTENTE_REPONSE_CLIENT: 'En attente réponse client',
  APPROUVEE: 'Approuvée',
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  BLOCAGE: 'Blocage',
  TERMINEE: 'Terminée',
  FERMEE: 'Fermée',
  ANNULEE: 'Annulée',
};

export const PRIORITY_LABELS: Record<string, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};

export const SERVICE_MODE_LABELS: Record<string, string> = {
  SUR_ROUTE: 'Sur route',
  EN_CUBICULE: 'En cubicule',
};

export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  REPARATION: 'Réparation',
  LOGICIEL: 'Logiciel',
  RESEAU: 'Réseau',
  DONNEES: 'Données',
  INSTALLATION: 'Installation',
  MAINTENANCE: 'Maintenance',
  CONSULTATION: 'Consultation',
  FORMATION: 'Formation',
  AUTRE: 'Autre',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  TECHNICIAN: 'Technicien',
  CUSTOMER: 'Client',
};

// ─── Work Order Status ───

export const WO_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  RECEPTION: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  DIAGNOSTIC: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  ATTENTE_APPROBATION: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  APPROUVE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  ATTENTE_PIECES: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  EN_REPARATION: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  VERIFICATION: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  PRET: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  REMIS: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  REFUSE: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  ABANDONNE: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  ANNULE: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

export const WO_STATUS_LABELS: Record<string, string> = {
  RECEPTION: 'Réception',
  DIAGNOSTIC: 'Diagnostic',
  ATTENTE_APPROBATION: 'Attente approbation',
  APPROUVE: 'Approuvé',
  ATTENTE_PIECES: 'Attente pièces',
  EN_REPARATION: 'En réparation',
  VERIFICATION: 'Vérification',
  PRET: 'Prêt pour ramassage',
  REMIS: 'Remis au client',
  REFUSE: 'Refusé',
  ABANDONNE: 'Abandonné',
  ANNULE: 'Annulé',
};

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  LAPTOP: 'Portable',
  DESKTOP: 'Bureau',
  TABLETTE: 'Tablette',
  TELEPHONE: 'Téléphone',
  TOUT_EN_UN: 'Tout-en-un',
  IMPRIMANTE: 'Imprimante',
  SERVEUR: 'Serveur',
  RESEAU_EQUIP: 'Équipement réseau',
  AUTRE: 'Autre',
};

export const DATA_BACKUP_CONSENT_LABELS: Record<string, string> = {
  CLIENT_FAIT: 'Client a sauvegardé',
  ATELIER_FAIT: 'Atelier effectue la sauvegarde',
  DECLINE: 'Client refuse la sauvegarde',
  NON_APPLICABLE: 'Non applicable',
};

// Work order statuses that are "active" (non-terminal)
export const WO_ACTIVE_STATUSES = [
  'RECEPTION', 'DIAGNOSTIC', 'ATTENTE_APPROBATION', 'APPROUVE',
  'ATTENTE_PIECES', 'EN_REPARATION', 'VERIFICATION', 'PRET',
] as const;

// Work order statuses that are terminal
export const WO_TERMINAL_STATUSES = ['REMIS', 'REFUSE', 'ABANDONNE', 'ANNULE'] as const;

// Kanban column order
export const WO_KANBAN_COLUMNS = [
  'RECEPTION', 'DIAGNOSTIC', 'ATTENTE_APPROBATION', 'APPROUVE',
  'ATTENTE_PIECES', 'EN_REPARATION', 'VERIFICATION', 'PRET',
] as const;

// ─── Worksheet Status ───

export const WS_STATUS_KEYS = [
  'BROUILLON', 'SOUMISE', 'REVISEE', 'APPROUVEE', 'FACTUREE', 'ANNULEE',
] as const;

export const LABOR_TYPE_KEYS = [
  'DIAGNOSTIC', 'REPARATION', 'INSTALLATION', 'CONSULTATION', 'GARANTIE', 'REPRISE',
] as const;

export const WS_NOTE_TYPE_KEYS = [
  'INTERNE', 'VISIBLE_CLIENT', 'DIAGNOSTIC_FINDING', 'PROCEDURE',
] as const;

export const FOLLOWUP_TYPE_KEYS = [
  'VERIFICATION_GARANTIE', 'RAPPEL_CLIENT', 'REVERIFICATION', 'ARRIVEE_PIECES', 'SUIVI_DEVIS',
] as const;

export const WS_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BROUILLON: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  SOUMISE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  REVISEE: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  APPROUVEE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  FACTUREE: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  ANNULEE: { bg: 'bg-red-100', text: 'text-red-500', border: 'border-red-200' },
};

export const WS_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  REVISEE: 'Révisée',
  APPROUVEE: 'Approuvée',
  FACTUREE: 'Facturée',
  ANNULEE: 'Annulée',
};

export const LABOR_TYPE_LABELS: Record<string, string> = {
  DIAGNOSTIC: 'Diagnostic',
  REPARATION: 'Réparation',
  INSTALLATION: 'Installation',
  CONSULTATION: 'Consultation',
  GARANTIE: 'Garantie',
  REPRISE: 'Reprise',
};

export const WS_NOTE_TYPE_LABELS: Record<string, string> = {
  INTERNE: 'Interne',
  VISIBLE_CLIENT: 'Visible client',
  DIAGNOSTIC_FINDING: 'Constat diagnostic',
  PROCEDURE: 'Procédure',
};

export const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
  VERIFICATION_GARANTIE: 'Vérification garantie',
  RAPPEL_CLIENT: 'Rappel client',
  REVERIFICATION: 'Revérification',
  ARRIVEE_PIECES: 'Arrivée pièces',
  SUIVI_DEVIS: 'Suivi devis',
};
