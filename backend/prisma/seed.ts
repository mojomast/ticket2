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

  // ─── Work Order Notes ───
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
  console.log(`  Users: 6 (1 admin, 2 technicians, 3 customers)`);
  console.log(`  Tickets: 7`);
  console.log(`  Appointments: 2`);
  console.log(`  Messages: 5`);
  console.log(`  Notifications: 4`);
  console.log(`  Work Orders: 8`);
  console.log(`  Work Order Notes: 7`);
}

// Run when called directly (prisma db seed)
seedDemoData()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
