export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';

export type TicketStatus =
  | 'NOUVELLE'
  | 'EN_ATTENTE_APPROBATION'
  | 'EN_ATTENTE_REPONSE_CLIENT'
  | 'APPROUVEE'
  | 'PLANIFIEE'
  | 'EN_COURS'
  | 'BLOCAGE'
  | 'TERMINEE'
  | 'FERMEE'
  | 'ANNULEE';

export type Priority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type ServiceMode = 'SUR_ROUTE' | 'EN_CUBICULE';

export type ServiceCategory =
  | 'REPARATION' | 'LOGICIEL' | 'RESEAU' | 'DONNEES'
  | 'INSTALLATION' | 'MAINTENANCE' | 'CONSULTATION' | 'FORMATION' | 'AUTRE';

export type AppointmentStatus = 'DEMANDE' | 'PLANIFIE' | 'CONFIRME' | 'EN_COURS' | 'TERMINE' | 'ANNULE';

export type ProposalStatus = 'PROPOSEE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE';

export type WorkOrderStatus =
  | 'RECEPTION' | 'DIAGNOSTIC' | 'ATTENTE_APPROBATION' | 'APPROUVE'
  | 'ATTENTE_PIECES' | 'EN_REPARATION' | 'VERIFICATION' | 'PRET'
  | 'REMIS' | 'REFUSE' | 'ABANDONNE' | 'ANNULE';

export type DeviceType =
  | 'LAPTOP' | 'DESKTOP' | 'TABLETTE' | 'TELEPHONE'
  | 'TOUT_EN_UN' | 'IMPRIMANTE' | 'SERVEUR' | 'RESEAU_EQUIP' | 'AUTRE';

export type DataBackupConsent = 'CLIENT_FAIT' | 'ATELIER_FAIT' | 'DECLINE' | 'NON_APPLICABLE';

export interface TechnicianPermissions {
  can_accept_tickets: boolean;
  can_close_tickets: boolean;
  can_send_quotes: boolean;
  can_cancel_appointments: boolean;
  can_view_all_tickets: boolean;
}
