import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This function is called by both `prisma db seed` AND the demo reset endpoint
export async function seedDemoData() {
  console.log('Seeding demo data...');

  // Clear all data in dependency order
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.appointmentProposal.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.workOrderNote.deleteMany(),
    prisma.workOrder.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.backupRecord.deleteMany(),
    prisma.systemConfig.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ─── Users ───
  // Password: "password123" hashed with argon2id
  // For seeding we use a pre-computed hash to avoid importing hash-wasm
  const demoPasswordHash = '$argon2id$v=19$m=19456,t=2,p=1$c2VlZHNhbHQxMjM0NTY3OA$YnJpZ2h0aGFzaGVkdmFsdWVoZXJl';

  const admin = await prisma.user.create({
    data: {
      email: 'admin@valitek.ca',
      passwordHash: demoPasswordHash,
      firstName: 'Marie',
      lastName: 'Tremblay',
      phone: '514-555-0001',
      role: 'ADMIN',
      isDemo: true,
      isActive: true,
    },
  });

  const tech1 = await prisma.user.create({
    data: {
      email: 'tech1@valitek.ca',
      passwordHash: demoPasswordHash,
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '514-555-0002',
      role: 'TECHNICIAN',
      isDemo: true,
      isActive: true,
      permissions: {
        can_accept_tickets: true,
        can_close_tickets: true,
        can_send_quotes: true,
        can_cancel_appointments: false,
        can_view_all_tickets: true,
      },
    },
  });

  const tech2 = await prisma.user.create({
    data: {
      email: 'tech2@valitek.ca',
      passwordHash: demoPasswordHash,
      firstName: 'Sophie',
      lastName: 'Martin',
      phone: '514-555-0003',
      role: 'TECHNICIAN',
      isDemo: true,
      isActive: true,
      permissions: {
        can_accept_tickets: true,
        can_close_tickets: false,
        can_send_quotes: true,
        can_cancel_appointments: false,
        can_view_all_tickets: false,
      },
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'client1@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Pierre',
      lastName: 'Lavoie',
      phone: '514-555-0010',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '123 Rue Principale, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'client2@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Isabelle',
      lastName: 'Roy',
      phone: '514-555-0011',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Solutions Roy Inc.',
      address: '456 Boul. Saint-Laurent, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'client3@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Marc',
      lastName: 'Gagnon',
      phone: '514-555-0012',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '789 Ave du Parc, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  // ─── New Customers (7 more) ───
  const customer4 = await prisma.user.create({
    data: {
      email: 'client4@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Luc',
      lastName: 'Bélanger',
      phone: '514-555-0013',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '42 Rue Sherbrooke Est, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer5 = await prisma.user.create({
    data: {
      email: 'client5@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Nathalie',
      lastName: 'Côté',
      phone: '514-555-0014',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Clinique Dentaire Côté',
      address: '1200 Boul. René-Lévesque, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer6 = await prisma.user.create({
    data: {
      email: 'client6@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'François',
      lastName: 'Pelletier',
      phone: '450-555-0015',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '88 Rue Sainte-Catherine Ouest, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer7 = await prisma.user.create({
    data: {
      email: 'client7@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Caroline',
      lastName: 'Bouchard',
      phone: '438-555-0016',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Comptabilité Bouchard & Associés',
      address: '350 Rue McGill, Vieux-Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer8 = await prisma.user.create({
    data: {
      email: 'client8@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Yves',
      lastName: 'Thibault',
      phone: '514-555-0017',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '15 Ave Laurier Est, Plateau Mont-Royal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer9 = await prisma.user.create({
    data: {
      email: 'client9@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Sylvie',
      lastName: 'Moreau',
      phone: '450-555-0018',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Restaurant Chez Sylvie',
      address: '67 Rue Saint-Denis, Montreal, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer10 = await prisma.user.create({
    data: {
      email: 'client10@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Benoît',
      lastName: 'Fortin',
      phone: '438-555-0019',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '230 Boul. Gouin Ouest, Ahuntsic, QC',
      isDemo: true,
      isActive: true,
    },
  });

  // ─── Tickets ───
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260101',
      title: 'Ordinateur ne demarre plus',
      description: 'Mon ordinateur de bureau ne demarre plus depuis ce matin. L\'ecran reste noir apres avoir appuye sur le bouton d\'alimentation. Les lumieres du boitier s\'allument brievement puis s\'eteignent.',
      status: 'EN_COURS',
      priority: 'HAUTE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'REPARATION',
      customerId: customer1.id,
      technicianId: tech1.id,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260102',
      title: 'Installation reseau bureau',
      description: 'Nous avons besoin d\'installer un reseau complet pour notre nouveau bureau. 15 postes de travail, 2 imprimantes reseau, et un serveur NAS.',
      status: 'EN_ATTENTE_APPROBATION',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'RESEAU',
      quotedPrice: 4500.00,
      quoteDescription: 'Installation reseau complete: cablage, configuration routeur, switch, et NAS',
      quoteDuration: '3 jours',
      customerId: customer2.id,
      technicianId: tech1.id,
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260103',
      title: 'Virus sur portable',
      description: 'Mon portable est tres lent et affiche des publicites constamment. Je pense avoir un virus.',
      status: 'NOUVELLE',
      priority: 'URGENTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'LOGICIEL',
      customerId: customer3.id,
    },
  });

  const ticket4 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260104',
      title: 'Migration donnees vers nouveau serveur',
      description: 'Nous devons migrer toutes les donnees de notre ancien serveur vers le nouveau. Environ 2TB de donnees.',
      status: 'PLANIFIEE',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'DONNEES',
      customerId: customer2.id,
      technicianId: tech2.id,
    },
  });

  const ticket5 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260105',
      title: 'Formation Microsoft 365',
      description: 'Formation pour 10 employes sur l\'utilisation de Microsoft 365 (Teams, SharePoint, OneDrive).',
      status: 'APPROUVEE',
      priority: 'BASSE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'FORMATION',
      customerId: customer2.id,
      technicianId: tech1.id,
    },
  });

  const ticket6 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260106',
      title: 'Imprimante ne fonctionne plus',
      description: 'L\'imprimante du salon refuse d\'imprimer. Le voyant clignote en rouge.',
      status: 'BLOCAGE',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'REPARATION',
      blockerReason: 'Piece de remplacement en commande (tete d\'impression). Livraison prevue dans 3-5 jours.',
      customerId: customer1.id,
      technicianId: tech2.id,
    },
  });

  const ticket7 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260107',
      title: 'Consultation securite informatique',
      description: 'Audit de securite complet de notre infrastructure IT.',
      status: 'TERMINEE',
      priority: 'HAUTE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'CONSULTATION',
      customerId: customer2.id,
      technicianId: tech1.id,
    },
  });

  // New tickets for new customers
  const ticket8 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260108',
      title: 'Remplacement ecran laptop',
      description: 'Mon ecran de portable presente des lignes horizontales depuis une chute. L\'affichage est partiellement visible.',
      status: 'NOUVELLE',
      priority: 'HAUTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'REPARATION',
      customerId: customer4.id,
    },
  });

  const ticket9 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260109',
      title: 'Configuration reseau clinique',
      description: 'Mise en place du reseau informatique pour notre nouvelle clinique dentaire. 8 postes, 2 imprimantes, serveur de fichiers.',
      status: 'EN_COURS',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'RESEAU',
      customerId: customer5.id,
      technicianId: tech1.id,
    },
  });

  const ticket10 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260110',
      title: 'Recuperation de donnees disque dur',
      description: 'Mon disque dur externe ne monte plus. Il contient toutes les photos de famille des 10 dernieres annees.',
      status: 'EN_ATTENTE_APPROBATION',
      priority: 'URGENTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'DONNEES',
      quotedPrice: 750.00,
      quoteDescription: 'Recuperation de donnees en salle blanche - disque 2TB',
      quoteDuration: '5-7 jours ouvrables',
      customerId: customer6.id,
      technicianId: tech2.id,
    },
  });

  const ticket11 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260111',
      title: 'Maintenance serveur comptable',
      description: 'Maintenance preventive du serveur de comptabilite. Verifier les sauvegardes, mises a jour, et performances.',
      status: 'TERMINEE',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'MAINTENANCE',
      customerId: customer7.id,
      technicianId: tech2.id,
    },
  });

  const ticket12 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260112',
      title: 'Installation point de vente',
      description: 'Installation d\'un systeme de point de vente (POS) pour le restaurant. Caisse, terminal de paiement, et imprimante thermique.',
      status: 'PLANIFIEE',
      priority: 'HAUTE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'INSTALLATION',
      customerId: customer9.id,
      technicianId: tech1.id,
    },
  });

  const ticket13 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260113',
      title: 'Probleme imprimante reseau',
      description: 'L\'imprimante du bureau ne repond plus aux requetes reseau. Les impressions locales USB fonctionnent.',
      status: 'ANNULEE',
      priority: 'BASSE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'REPARATION',
      customerId: customer8.id,
      technicianId: tech2.id,
    },
  });

  const ticket14 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260114',
      title: 'Configuration VPN teletravail',
      description: 'Besoin de configurer un VPN pour permettre le teletravail de 5 employes. Connexion securisee au serveur du bureau.',
      status: 'EN_ATTENTE_REPONSE_CLIENT',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'RESEAU',
      customerId: customer10.id,
      technicianId: tech1.id,
    },
  });

  // ─── Appointments ───
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket1.id,
      technicianId: tech1.id,
      scheduledStart: tomorrow,
      scheduledEnd: tomorrowEnd,
      status: 'PLANIFIE',
      notes: 'Apporter kit de diagnostic materiel',
    },
  });

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(13, 0, 0, 0);
  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(17, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket4.id,
      technicianId: tech2.id,
      scheduledStart: dayAfter,
      scheduledEnd: dayAfterEnd,
      status: 'CONFIRME',
      notes: 'Migration des donnees - prevoir disque externe de backup',
    },
  });

  // New appointments
  // Past appointment (completed)
  const threeDaysAgoAppt = new Date();
  threeDaysAgoAppt.setDate(threeDaysAgoAppt.getDate() - 3);
  threeDaysAgoAppt.setHours(10, 0, 0, 0);
  const threeDaysAgoApptEnd = new Date(threeDaysAgoAppt);
  threeDaysAgoApptEnd.setHours(12, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket11.id,
      technicianId: tech2.id,
      scheduledStart: threeDaysAgoAppt,
      scheduledEnd: threeDaysAgoApptEnd,
      status: 'TERMINE',
      notes: 'Maintenance serveur terminee. Tout est a jour.',
    },
  });

  // Today's appointment (in progress)
  const todayAppt = new Date();
  todayAppt.setHours(14, 0, 0, 0);
  const todayApptEnd = new Date(todayAppt);
  todayApptEnd.setHours(17, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket9.id,
      technicianId: tech1.id,
      scheduledStart: todayAppt,
      scheduledEnd: todayApptEnd,
      status: 'EN_COURS',
      notes: 'Installation reseau clinique - premiere visite',
    },
  });

  // Future appointment (cancelled)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(11, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket13.id,
      technicianId: tech2.id,
      scheduledStart: nextWeek,
      scheduledEnd: nextWeekEnd,
      status: 'ANNULE',
      cancelReason: 'Le client a annule le billet.',
    },
  });

  // Future appointment
  const fourDaysFromNow = new Date();
  fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
  fourDaysFromNow.setHours(8, 30, 0, 0);
  const fourDaysFromNowEnd = new Date(fourDaysFromNow);
  fourDaysFromNowEnd.setHours(16, 30, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket12.id,
      technicianId: tech1.id,
      scheduledStart: fourDaysFromNow,
      scheduledEnd: fourDaysFromNowEnd,
      status: 'PLANIFIE',
      notes: 'Installation POS complete - prevoir journee entiere',
    },
  });

  // ─── Messages ───
  await prisma.message.create({
    data: {
      ticketId: ticket1.id,
      authorId: customer1.id,
      content: 'Le probleme est arrive soudainement ce matin. Rien de special ne s\'est passe hier soir.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket1.id,
      authorId: tech1.id,
      content: 'Je vais passer demain matin pour diagnostiquer le probleme. Ca pourrait etre l\'alimentation ou la carte mere.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket1.id,
      authorId: tech1.id,
      content: 'Note: verifier aussi les condensateurs sur la carte mere - symptomes typiques.',
      isInternal: true,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket2.id,
      authorId: tech1.id,
      content: 'J\'ai prepare le devis pour l\'installation reseau. Veuillez le consulter et l\'approuver pour que nous puissions planifier les travaux.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket6.id,
      authorId: tech2.id,
      content: 'Apres diagnostic, la tete d\'impression est defectueuse. J\'ai commande la piece de remplacement.',
    },
  });

  // New messages on various tickets
  await prisma.message.create({
    data: {
      ticketId: ticket8.id,
      authorId: customer4.id,
      content: 'J\'ai laisse tomber mon portable hier soir. L\'ecran a des lignes colorees et le tactile ne fonctionne plus.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket9.id,
      authorId: tech1.id,
      content: 'Premiere visite effectuee. Le cablage existant est en bon etat. Il faudra ajouter 3 prises reseau supplementaires.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket9.id,
      authorId: customer5.id,
      content: 'Parfait, merci! Est-ce que ca va affecter le delai prevu?',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket10.id,
      authorId: tech2.id,
      content: 'Diagnostic initial: le disque presente des secteurs defectueux. La recuperation en salle blanche sera necessaire.',
      isInternal: false,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket10.id,
      authorId: tech2.id,
      content: 'Note interne: le PCB semble intact, bonne chance de recuperation des donnees. Contacter le labo pour estimation.',
      isInternal: true,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket12.id,
      authorId: customer9.id,
      content: 'Bonjour, est-ce que le systeme POS sera compatible avec notre logiciel de comptabilite Sage?',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket14.id,
      authorId: tech1.id,
      content: 'Bonjour M. Fortin, pourriez-vous me confirmer combien d\'employes auront besoin d\'acces VPN et quel systeme d\'exploitation ils utilisent?',
    },
  });

  // ─── Notifications ───
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        ticketId: ticket3.id,
        type: 'TICKET_CREATED',
        title: 'Nouveau billet',
        message: 'Le billet TKT-260103 a ete cree par Marc Gagnon',
      },
      {
        userId: customer2.id,
        ticketId: ticket2.id,
        type: 'QUOTE_SENT',
        title: 'Devis envoye',
        message: 'Un devis de 4 500,00 $ a ete soumis pour le billet TKT-260102',
      },
      {
        userId: tech1.id,
        ticketId: ticket1.id,
        type: 'TECHNICIAN_ASSIGNED',
        title: 'Billet assigne',
        message: 'Le billet TKT-260101 vous a ete assigne',
      },
      {
        userId: customer1.id,
        ticketId: ticket6.id,
        type: 'BLOCKER_ADDED',
        title: 'Blocage ajoute',
        message: 'Un blocage a ete ajoute au billet TKT-260106',
      },
      // New notifications
      {
        userId: admin.id,
        ticketId: ticket8.id,
        type: 'TICKET_CREATED',
        title: 'Nouveau billet',
        message: 'Le billet TKT-260108 a ete cree par Luc Bélanger',
      },
      {
        userId: customer6.id,
        ticketId: ticket10.id,
        type: 'QUOTE_SENT',
        title: 'Devis envoye',
        message: 'Un devis de 750,00 $ a ete soumis pour le billet TKT-260110 (recuperation de donnees)',
      },
      {
        userId: tech1.id,
        ticketId: ticket12.id,
        type: 'APPOINTMENT_BOOKED',
        title: 'Rendez-vous planifie',
        message: 'Un rendez-vous a ete planifie pour le billet TKT-260112 (installation POS)',
      },
      {
        userId: customer7.id,
        ticketId: ticket11.id,
        type: 'STATUS_CHANGED',
        title: 'Statut modifie',
        message: 'Le billet TKT-260111 a ete marque comme termine',
        readAt: new Date(),
      },
      {
        userId: customer9.id,
        ticketId: ticket12.id,
        type: 'NEW_MESSAGE',
        title: 'Nouveau message',
        message: 'Un nouveau message a ete ajoute au billet TKT-260112',
      },
    ],
  });

  // ─── Work Orders ───

  const now = new Date();
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
  const fiveDaysAgo = new Date(now); fiveDaysAgo.setDate(now.getDate() - 5);
  const oneWeekAgo = new Date(now); oneWeekAgo.setDate(now.getDate() - 7);
  const twoDaysFromNow = new Date(now); twoDaysFromNow.setDate(now.getDate() + 2);
  const fiveDaysFromNow = new Date(now); fiveDaysFromNow.setDate(now.getDate() + 5);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const fourDaysAgo = new Date(now); fourDaysAgo.setDate(now.getDate() - 4);
  const eightDaysAgo = new Date(now); eightDaysAgo.setDate(now.getDate() - 8);
  const tenDaysAgo = new Date(now); tenDaysAgo.setDate(now.getDate() - 10);
  const twelveDaysAgo = new Date(now); twelveDaysAgo.setDate(now.getDate() - 12);
  const fifteenDaysAgo = new Date(now); fifteenDaysAgo.setDate(now.getDate() - 15);
  const twoWeeksFromNow = new Date(now); twoWeeksFromNow.setDate(now.getDate() + 14);

  // WO1: Just received at the counter
  const wo1 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260301',
      status: 'RECEPTION',
      priority: 'NORMALE',
      customerId: customer1.id,
      customerName: 'Pierre Lavoie',
      customerPhone: '514-555-0010',
      customerEmail: 'client1@example.com',
      deviceType: 'LAPTOP',
      deviceBrand: 'Dell',
      deviceModel: 'Latitude 5540',
      deviceSerial: 'DL5540-A1234',
      deviceColor: 'Noir',
      deviceOs: 'Windows 11 Pro',
      devicePassword: '1234',
      conditionNotes: 'Legere egratignure sur le couvercle. Coin inferieur droit legerement cabossé.',
      accessories: ['Chargeur', 'Souris'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Batterie presente': true,
        'Chargeur inclus': true,
        'Chassis sans dommage': false,
        'Ports USB fonctionnels': true,
      },
      reportedIssue: 'L\'ordinateur est extremement lent depuis une semaine. Prend 10 minutes pour demarrer. Les applications gèlent constamment.',
      serviceCategory: 'LOGICIEL',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: now,
      intakeDate: now,
      estimatedPickupDate: fiveDaysFromNow,
      intakeById: admin.id,
      warrantyDays: 30,
      depositAmount: 50.00,
      diagnosticFee: 45.00,
    },
  });

  // WO2: In diagnostic phase
  const wo2 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260302',
      status: 'DIAGNOSTIC',
      priority: 'HAUTE',
      customerId: customer2.id,
      customerName: 'Isabelle Roy',
      customerPhone: '514-555-0011',
      customerEmail: 'client2@example.com',
      deviceType: 'DESKTOP',
      deviceBrand: 'HP',
      deviceModel: 'EliteDesk 800 G9',
      deviceSerial: 'HP800G9-B5678',
      deviceOs: 'Windows 11 Pro',
      conditionNotes: 'Appareil en bon etat general.',
      accessories: ['Cable alimentation', 'Clavier', 'Souris'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Batterie presente': false,
        'Chargeur inclus': true,
        'Chassis sans dommage': true,
        'Ports USB fonctionnels': true,
      },
      reportedIssue: 'Ecran bleu frequent (BSOD). Messages d\'erreur varies. Se produit aleatoirement, parfois 2-3 fois par jour.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: threeDaysAgo,
      intakeDate: threeDaysAgo,
      estimatedPickupDate: twoDaysFromNow,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Tests memoire en cours. Premiere passe: 2 erreurs detectees sur le module DIMM 2.',
      diagnosticFee: 45.00,
      warrantyDays: 30,
    },
  });

  // WO3: Waiting for customer approval
  const wo3 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260303',
      status: 'ATTENTE_APPROBATION',
      priority: 'NORMALE',
      customerId: customer3.id,
      customerName: 'Marc Gagnon',
      customerPhone: '514-555-0012',
      deviceType: 'LAPTOP',
      deviceBrand: 'Apple',
      deviceModel: 'MacBook Pro 14 M3',
      deviceSerial: 'FVFG12345678',
      deviceColor: 'Gris sideral',
      deviceOs: 'macOS Sonoma 14.3',
      reportedIssue: 'Clavier ne repond plus sur certaines touches (E, R, T). Probleme intermittent.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: fiveDaysAgo,
      intakeDate: fiveDaysAgo,
      intakeById: tech1.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Debris sous les touches affectees. Le mecanisme butterfly est endommage sur 3 touches. Remplacement du clavier complet necessaire (piece soudee au top case).',
      estimatedCost: 450.00,
      estimatedPickupDate: fiveDaysFromNow,
      maxAuthorizedSpend: 500.00,
      diagnosticFee: 45.00,
      warrantyDays: 90,
    },
  });

  // WO4: Approved, waiting for parts
  const wo4 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260304',
      status: 'ATTENTE_PIECES',
      priority: 'HAUTE',
      customerId: customer1.id,
      customerName: 'Pierre Lavoie',
      customerPhone: '514-555-0010',
      deviceType: 'LAPTOP',
      deviceBrand: 'Lenovo',
      deviceModel: 'ThinkPad X1 Carbon Gen 11',
      deviceSerial: 'LNV-X1C11-9876',
      deviceColor: 'Noir',
      deviceOs: 'Windows 11 Pro',
      reportedIssue: 'Ecran fissure apres une chute. L\'affichage fonctionne partiellement mais avec des lignes verticales.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: oneWeekAgo,
      intakeDate: oneWeekAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Panel LCD fissure. Cadre intact. Remplacement du panel LCD uniquement.',
      repairNotes: 'Piece commandee chez le fournisseur. ETA: 3-5 jours ouvrables.',
      estimatedCost: 350.00,
      estimatedPickupDate: twoDaysFromNow,
      depositAmount: 100.00,
      diagnosticFee: 0,
      warrantyDays: 90,
    },
  });

  // WO5: Currently being repaired
  const wo5 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260305',
      status: 'EN_REPARATION',
      priority: 'URGENTE',
      customerId: customer2.id,
      customerName: 'Isabelle Roy - Solutions Roy Inc.',
      customerPhone: '514-555-0011',
      customerEmail: 'client2@example.com',
      deviceType: 'SERVEUR',
      deviceBrand: 'Dell',
      deviceModel: 'PowerEdge T440',
      deviceSerial: 'DELLT440-C1234',
      deviceOs: 'Windows Server 2022',
      reportedIssue: 'Serveur ne demarre plus. Bip codes au demarrage. Lumière ambre sur la carte mere.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: fiveDaysAgo,
      intakeDate: fiveDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Module RAID controller defectueux. Remplacement necessaire. Donnees intactes sur les disques.',
      repairNotes: 'Remplacement du RAID controller en cours. Reconstruction du RAID prevue apres installation.',
      estimatedCost: 800.00,
      finalCost: 750.00,
      depositAmount: 200.00,
      partsUsed: [
        { name: 'RAID Controller Dell PERC H740P', cost: 450.00, type: 'OEM' },
        { name: 'Cable SAS interne', cost: 35.00, type: 'OEM' },
      ],
      warrantyDays: 90,
    },
  });

  // WO6: Ready for pickup (overdue!)
  const wo6 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260306',
      status: 'PRET',
      priority: 'NORMALE',
      customerId: customer3.id,
      customerName: 'Marc Gagnon',
      customerPhone: '514-555-0012',
      deviceType: 'TABLETTE',
      deviceBrand: 'Apple',
      deviceModel: 'iPad Air 5',
      deviceSerial: 'DMPX12345678',
      deviceColor: 'Bleu',
      deviceOs: 'iPadOS 17',
      reportedIssue: 'Ecran tactile ne repond plus dans le coin superieur droit.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: oneWeekAgo,
      intakeDate: oneWeekAgo,
      intakeById: tech1.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Digitizer defectueux. Remplacement effectue.',
      repairNotes: 'Digitizer remplace. Tests tactiles OK sur toute la surface. Calibration effectuee.',
      estimatedCost: 250.00,
      finalCost: 230.00,
      completedDate: threeDaysAgo,
      estimatedPickupDate: yesterday,
      partsUsed: [
        { name: 'Digitizer iPad Air 5', cost: 120.00, type: 'AFTERMARKET' },
        { name: 'Adhesif ecran', cost: 8.00, type: 'AFTERMARKET' },
      ],
      warrantyDays: 30,
    },
  });

  // WO7: Already picked up (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260307',
      status: 'REMIS',
      priority: 'NORMALE',
      customerId: customer1.id,
      customerName: 'Pierre Lavoie',
      customerPhone: '514-555-0010',
      deviceType: 'TELEPHONE',
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy S24',
      deviceSerial: 'SGS24-D4567',
      deviceColor: 'Violet',
      reportedIssue: 'Ecran fissure, remplacement demandé.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: oneWeekAgo,
      intakeDate: oneWeekAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Ecran AMOLED fissure. Chassis intact.',
      repairNotes: 'Ecran AMOLED remplace. Test complet OK.',
      estimatedCost: 320.00,
      finalCost: 320.00,
      completedDate: threeDaysAgo,
      pickupDate: yesterday,
      warrantyStartDate: yesterday,
      partsUsed: [
        { name: 'Ecran AMOLED Galaxy S24', cost: 200.00, type: 'OEM' },
        { name: 'Kit adhesif', cost: 12.00, type: 'AFTERMARKET' },
      ],
      warrantyDays: 90,
    },
  });

  // WO8: Refused by customer (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260308',
      status: 'REFUSE',
      priority: 'BASSE',
      customerId: customer3.id,
      customerName: 'Marc Gagnon',
      customerPhone: '514-555-0012',
      deviceType: 'LAPTOP',
      deviceBrand: 'Acer',
      deviceModel: 'Aspire 5',
      deviceOs: 'Windows 10',
      reportedIssue: 'Portable tres lent, demande de mise a niveau.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: oneWeekAgo,
      intakeDate: oneWeekAgo,
      intakeById: tech1.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Carte mere ancienne (gen 6). Mise a niveau SSD et RAM possible mais couteuse par rapport a la valeur du portable.',
      estimatedCost: 280.00,
      diagnosticFee: 45.00,
      warrantyDays: 30,
    },
  });

  // WO9: Telephone reception - just received today (0 days ago)
  const wo9 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260309',
      status: 'RECEPTION',
      priority: 'NORMALE',
      customerId: customer4.id,
      customerName: 'Luc Bélanger',
      customerPhone: '514-555-0013',
      customerEmail: 'client4@example.com',
      deviceType: 'TELEPHONE',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 15 Pro',
      deviceSerial: 'F2LZ12345678',
      deviceColor: 'Titane naturel',
      deviceOs: 'iOS 17.4',
      conditionNotes: 'Fissure en coin inferieur gauche de l\'ecran.',
      accessories: ['Chargeur USB-C', 'Etui de protection'],
      conditionChecklist: {
        'Ecran intact': false,
        'Boutons fonctionnels': true,
        'Appareil photo': true,
        'Haut-parleur': true,
        'Microphone': true,
      },
      reportedIssue: 'Ecran fissure suite a une chute. Le tactile fonctionne encore mais la fissure s\'agrandit.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: now,
      intakeDate: now,
      estimatedPickupDate: fiveDaysFromNow,
      intakeById: admin.id,
      diagnosticFee: 45.00,
      warrantyDays: 30,
    },
  });

  // WO10: Imprimante diagnostic - 1 day ago
  const wo10 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260310',
      status: 'DIAGNOSTIC',
      priority: 'BASSE',
      customerId: customer5.id,
      customerName: 'Nathalie Côté - Clinique Dentaire Côté',
      customerPhone: '514-555-0014',
      customerEmail: 'client5@example.com',
      deviceType: 'IMPRIMANTE',
      deviceBrand: 'HP',
      deviceModel: 'LaserJet Pro MFP M428fdw',
      deviceSerial: 'CNBJP12345',
      deviceOs: 'Firmware v2.11',
      conditionNotes: 'Appareil en bon etat physique.',
      accessories: ['Cable USB', 'Cable alimentation'],
      conditionChecklist: {
        'Ecran affichage OK': true,
        'Bac papier intact': true,
        'Vitre scanner propre': true,
        'Chassis sans dommage': true,
      },
      reportedIssue: 'L\'imprimante bourre constamment depuis la mise a jour du firmware. Pages incompletes et taches d\'encre.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: yesterday,
      intakeDate: yesterday,
      estimatedPickupDate: fiveDaysFromNow,
      intakeById: tech1.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Bourrage papier frequent. Rouleaux d\'entrainement a verifier.',
      diagnosticFee: 35.00,
      warrantyDays: 30,
    },
  });

  // WO11: Tout-en-un en reparation - 4 days ago
  const wo11 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260311',
      status: 'EN_REPARATION',
      priority: 'HAUTE',
      customerId: customer7.id,
      customerName: 'Caroline Bouchard - Comptabilité Bouchard & Associés',
      customerPhone: '438-555-0016',
      customerEmail: 'client7@example.com',
      deviceType: 'TOUT_EN_UN',
      deviceBrand: 'Apple',
      deviceModel: 'iMac 24 M3',
      deviceSerial: 'C02Z12345678',
      deviceColor: 'Argent',
      deviceOs: 'macOS Sonoma 14.4',
      conditionNotes: 'Appareil en excellent etat.',
      accessories: ['Clavier Magic Keyboard', 'Magic Mouse', 'Cable alimentation'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Souris fonctionnelle': true,
        'Ports USB-C': true,
        'Haut-parleurs': true,
      },
      reportedIssue: 'Le iMac s\'eteint de maniere aleatoire apres 20-30 minutes d\'utilisation. Pas de surchauffe apparente.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: fourDaysAgo,
      intakeDate: fourDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Tests thermiques OK. Alimentation interne defectueuse - coupure intermittente.',
      repairNotes: 'Remplacement de l\'alimentation interne en cours.',
      estimatedCost: 400.00,
      depositAmount: 100.00,
      diagnosticFee: 45.00,
      warrantyDays: 90,
      partsUsed: [
        { name: 'Alimentation interne iMac 24 M3', cost: 220.00, type: 'OEM' },
      ],
    },
  });

  // WO12: Reseau equip - 8 days ago - verification phase
  const wo12 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260312',
      status: 'VERIFICATION',
      priority: 'NORMALE',
      customerId: customer9.id,
      customerName: 'Sylvie Moreau - Restaurant Chez Sylvie',
      customerPhone: '450-555-0018',
      customerEmail: 'client9@example.com',
      deviceType: 'RESEAU_EQUIP',
      deviceBrand: 'Ubiquiti',
      deviceModel: 'UniFi Dream Machine Pro',
      deviceSerial: 'UDM-PRO-F8765',
      conditionNotes: 'Quelques egratignures mineures.',
      accessories: ['Cable RJ45', 'Cable alimentation', 'Support de montage'],
      conditionChecklist: {
        'Ports RJ45 intacts': true,
        'Ventilateur fonctionne': true,
        'LED statut': true,
        'Chassis sans dommage': true,
      },
      reportedIssue: 'Le routeur perd la connexion Internet de maniere intermittente. Deconnexions toutes les 2-3 heures.',
      serviceCategory: 'RESEAU',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: eightDaysAgo,
      intakeDate: eightDaysAgo,
      intakeById: tech1.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Firmware corrompu. Reinstallation complete effectuee.',
      repairNotes: 'Firmware reinstalle. Configuration reseau reappliquee. Tests de stabilite en cours (48h).',
      estimatedCost: 150.00,
      diagnosticFee: 45.00,
      warrantyDays: 30,
    },
  });

  // WO13: Desktop - 12 days ago - approved, parts on order
  const wo13 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260313',
      status: 'ATTENTE_PIECES',
      priority: 'NORMALE',
      customerId: customer8.id,
      customerName: 'Yves Thibault',
      customerPhone: '514-555-0017',
      customerEmail: 'client8@example.com',
      deviceType: 'DESKTOP',
      deviceBrand: 'Custom',
      deviceModel: 'Tour gaming personnalisee',
      deviceSerial: 'CUSTOM-2024-001',
      deviceColor: 'Noir/RGB',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Tour en bon etat. Eclairage RGB fonctionne.',
      accessories: ['Cable alimentation', 'Cable HDMI'],
      conditionChecklist: {
        'Chassis intact': true,
        'Ventilateurs fonctionnels': true,
        'Ports USB avant': true,
        'LED RGB': true,
      },
      reportedIssue: 'Carte graphique fait des artefacts en jeu. Ecrans noirs intermittents. Le PC redemarre parfois seul pendant le gaming.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: twelveDaysAgo,
      intakeDate: twelveDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'GPU RTX 4070 defectueux - artefacts confirmes avec FurMark. Memoire VRAM deterioree.',
      repairNotes: 'Remplacement GPU commande. Carte EVGA RTX 4070 Super en transit.',
      estimatedCost: 650.00,
      maxAuthorizedSpend: 700.00,
      depositAmount: 200.00,
      diagnosticFee: 45.00,
      warrantyDays: 90,
    },
  });

  // WO14: Laptop - 15 days ago - abandoned (very old)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260314',
      status: 'ABANDONNE',
      priority: 'BASSE',
      customerId: customer6.id,
      customerName: 'François Pelletier',
      customerPhone: '450-555-0015',
      deviceType: 'LAPTOP',
      deviceBrand: 'Toshiba',
      deviceModel: 'Satellite C55',
      deviceSerial: 'TSH-C55-Z9876',
      deviceOs: 'Windows 8.1',
      conditionNotes: 'Portable tres use. Nombreuses egratignures, touche espace collante.',
      accessories: ['Chargeur'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': false,
        'Batterie presente': true,
        'Chargeur inclus': true,
        'Chassis sans dommage': false,
      },
      reportedIssue: 'Ne demarre plus du tout. Aucune lumiere, aucune reaction quand on appuie sur le bouton.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'DECLINE',
      termsAccepted: true,
      termsAcceptedAt: fifteenDaysAgo,
      intakeDate: fifteenDaysAgo,
      intakeById: tech1.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Carte mere grillee. Reparation non economique - la valeur du portable est inferieure au cout de la piece.',
      estimatedCost: 350.00,
      diagnosticFee: 45.00,
      abandonedDate: threeDaysAgo,
      warrantyDays: 0,
    },
  });

  // WO15: Tablette approuvee - 10 days ago
  const wo15 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260315',
      status: 'APPROUVE',
      priority: 'HAUTE',
      customerId: customer10.id,
      customerName: 'Benoît Fortin',
      customerPhone: '438-555-0019',
      customerEmail: 'client10@example.com',
      deviceType: 'TABLETTE',
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy Tab S9',
      deviceSerial: 'SGT-S9-A1234',
      deviceColor: 'Graphite',
      deviceOs: 'Android 14',
      conditionNotes: 'Legere bosse coin superieur droit.',
      accessories: ['Stylet S Pen', 'Chargeur USB-C', 'Etui clavier'],
      conditionChecklist: {
        'Ecran intact': true,
        'Stylet fonctionnel': true,
        'Haut-parleurs': true,
        'Port USB-C': true,
        'Boutons volume/power': true,
      },
      reportedIssue: 'La batterie ne tient plus que 2 heures. Avant c\'etait 8-10 heures. La tablette chauffe beaucoup en charge.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: tenDaysAgo,
      intakeDate: tenDaysAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Batterie gonflee - remplacement urgent. Port de charge OK.',
      estimatedCost: 180.00,
      maxAuthorizedSpend: 200.00,
      estimatedPickupDate: twoDaysFromNow,
      diagnosticFee: 0,
      warrantyDays: 60,
    },
  });

  // WO16: Imprimante prete - 8 days ago intake
  const wo16 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260316',
      status: 'PRET',
      priority: 'BASSE',
      customerId: customer5.id,
      customerName: 'Nathalie Côté - Clinique Dentaire Côté',
      customerPhone: '514-555-0014',
      customerEmail: 'client5@example.com',
      deviceType: 'IMPRIMANTE',
      deviceBrand: 'Brother',
      deviceModel: 'MFC-L8900CDW',
      deviceSerial: 'BRO-L8900-K5678',
      conditionNotes: 'Appareil propre, bon etat general.',
      accessories: ['Cable alimentation', 'Cable USB', 'Bac supplementaire'],
      conditionChecklist: {
        'Ecran tactile OK': true,
        'Bacs papier intacts': true,
        'Chargeur docs ADF': true,
        'Vitre scanner': true,
      },
      reportedIssue: 'Les impressions couleur sortent avec des stries magenta. Le noir fonctionne correctement.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: eightDaysAgo,
      intakeDate: eightDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Tete d\'impression couleur encrassee. Nettoyage intensif et recalibration.',
      repairNotes: 'Nettoyage complet des tetes, remplacement du tambour magenta. Calibration couleur effectuee.',
      estimatedCost: 120.00,
      finalCost: 95.00,
      completedDate: yesterday,
      estimatedPickupDate: now,
      partsUsed: [
        { name: 'Tambour magenta Brother DR-421CL', cost: 45.00, type: 'OEM' },
        { name: 'Kit nettoyage tetes', cost: 15.00, type: 'AFTERMARKET' },
      ],
      warrantyDays: 30,
    },
  });
  await prisma.workOrderNote.createMany({
    data: [
      {
        workOrderId: wo2.id,
        authorId: tech1.id,
        content: 'Tests memoire en cours avec MemTest86. Premiere passe terminee avec 2 erreurs.',
        isInternal: true,
      },
      {
        workOrderId: wo2.id,
        authorId: tech1.id,
        content: 'Bonjour, nous avons detecte des problemes de memoire. Les tests sont en cours pour confirmer le diagnostic complet.',
        isInternal: false,
      },
      {
        workOrderId: wo3.id,
        authorId: tech1.id,
        content: 'Devis envoye au client. Le remplacement du top case est la seule option vu le design soude.',
        isInternal: true,
      },
      {
        workOrderId: wo5.id,
        authorId: tech1.id,
        content: 'RAID controller remplace. Reconstruction du RAID en cours - environ 4h pour 2TB de donnees.',
        isInternal: true,
      },
      {
        workOrderId: wo5.id,
        authorId: admin.id,
        content: 'Client informe du delai supplementaire pour la reconstruction RAID.',
        isInternal: false,
      },
      {
        workOrderId: wo6.id,
        authorId: tech2.id,
        content: 'Reparation terminee. Client appele pour ramassage.',
        isInternal: false,
      },
      {
        workOrderId: wo6.id,
        authorId: admin.id,
        content: 'Relance effectuee - client n\'est toujours pas venu chercher l\'appareil.',
        isInternal: true,
      },
      // New work order notes
      {
        workOrderId: wo9.id,
        authorId: admin.id,
        content: 'Appareil recu au comptoir. Client informe du delai de 3-5 jours pour le diagnostic.',
        isInternal: false,
      },
      {
        workOrderId: wo11.id,
        authorId: tech1.id,
        content: 'Alimentation interne commandee chez Apple. Livraison prevue demain.',
        isInternal: true,
      },
      {
        workOrderId: wo12.id,
        authorId: tech2.id,
        content: 'Firmware reinstalle avec succes. Tests de stabilite lances - 48h de monitoring.',
        isInternal: true,
      },
      {
        workOrderId: wo13.id,
        authorId: tech1.id,
        content: 'Client contacte et approuve le remplacement du GPU. Commande passee chez le fournisseur.',
        isInternal: false,
      },
      {
        workOrderId: wo16.id,
        authorId: tech1.id,
        content: 'Reparation terminee. Tests d\'impression couleur passes avec succes. Qualite excellente.',
        isInternal: false,
      },
    ],
  });

  // ─── System Config ───
  await prisma.systemConfig.create({
    data: {
      key: 'branding',
      value: {
        companyName: 'Valitek',
        primaryColor: '#2563eb',
        logo: null,
      },
    },
  });

  console.log('Demo data seeded successfully!');
  console.log(`  Users: 13 (1 admin, 2 technicians, 10 customers)`);
  console.log(`  Tickets: 14`);
  console.log(`  Appointments: 6`);
  console.log(`  Messages: 13`);
  console.log(`  Notifications: 9`);
  console.log(`  Work Orders: 16`);
  console.log(`  Work Order Notes: 12`);
}

// Run when called directly (prisma db seed)
seedDemoData()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
