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

  // ─── New Customers (15 more: client11-client25) ───
  const customer11 = await prisma.user.create({
    data: {
      email: 'client11@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Émile',
      lastName: 'Lafleur',
      phone: '514-555-0020',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '55 Rue Wellington, Verdun, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer12 = await prisma.user.create({
    data: {
      email: 'client12@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Geneviève',
      lastName: 'Dufresne',
      phone: '514-555-0021',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Boutique Mode Gigi',
      address: '112 Ave Laurier Ouest, Outremont, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer13 = await prisma.user.create({
    data: {
      email: 'client13@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Alain',
      lastName: 'Bergeron',
      phone: '450-555-0022',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '340 Boul. Curé-Poirier, Longueuil, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer14 = await prisma.user.create({
    data: {
      email: 'client14@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Mélanie',
      lastName: 'Savard',
      phone: '450-555-0023',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Agence de Voyage Savard',
      address: '2050 Boul. Le Carrefour, Laval, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer15 = await prisma.user.create({
    data: {
      email: 'client15@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Réjean',
      lastName: 'Paquette',
      phone: '514-555-0024',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '1845 Rue Masson, Rosemont, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer16 = await prisma.user.create({
    data: {
      email: 'client16@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Véronique',
      lastName: 'Lemieux',
      phone: '514-555-0025',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Studio de Yoga Harmonie',
      address: '5430 Ave de Monkland, NDG, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer17 = await prisma.user.create({
    data: {
      email: 'client17@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Patrick',
      lastName: 'Desjardins',
      phone: '514-555-0026',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '8800 Boul. Viau, Saint-Léonard, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer18 = await prisma.user.create({
    data: {
      email: 'client18@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Josée',
      lastName: 'Gauthier',
      phone: '438-555-0027',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Garderie Les Petits Anges',
      address: '7420 Rue Saint-Hubert, Villeray, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer19 = await prisma.user.create({
    data: {
      email: 'client19@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Daniel',
      lastName: 'Morin',
      phone: '514-555-0028',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '1200 Boul. Newman, LaSalle, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer20 = await prisma.user.create({
    data: {
      email: 'client20@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Catherine',
      lastName: 'Brassard',
      phone: '438-555-0029',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Salon de Coiffure Belle Tête',
      address: '5245 Ave du Parc, Mile End, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer21 = await prisma.user.create({
    data: {
      email: 'client21@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Stéphane',
      lastName: 'Nadeau',
      phone: '514-555-0030',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '7300 Boul. des Galeries d\'Anjou, Anjou, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer22 = await prisma.user.create({
    data: {
      email: 'client22@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Annie',
      lastName: 'Ouellet',
      phone: '514-555-0031',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Centre de Massothérapie Zen',
      address: '4050 Rue Ontario Est, Hochelaga, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer23 = await prisma.user.create({
    data: {
      email: 'client23@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Michel',
      lastName: 'Simard',
      phone: '514-555-0032',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '12400 Rue Sherbrooke Est, Pointe-aux-Trembles, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer24 = await prisma.user.create({
    data: {
      email: 'client24@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Julie',
      lastName: 'Paradis',
      phone: '514-555-0033',
      role: 'CUSTOMER',
      customerType: 'COMMERCIAL',
      companyName: 'Fleuriste Paradis',
      address: '4900 Rue Sherbrooke Ouest, Westmount, QC',
      isDemo: true,
      isActive: true,
    },
  });

  const customer25 = await prisma.user.create({
    data: {
      email: 'client25@example.com',
      passwordHash: demoPasswordHash,
      firstName: 'Robert',
      lastName: 'Champagne',
      phone: '514-555-0034',
      role: 'CUSTOMER',
      customerType: 'RESIDENTIAL',
      address: '800 Ave Dawson, Dorval, QC',
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

  // ─── New Tickets (16 more: TKT-260115 to TKT-260130) ───
  const ticket15 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260115',
      title: 'Ordinateur portable ne charge plus',
      description: 'Mon portable Dell ne charge plus. Le voyant de charge ne s\'allume pas quand je branche le chargeur. J\'ai essaye un autre chargeur sans succes.',
      status: 'NOUVELLE',
      priority: 'HAUTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'REPARATION',
      customerId: customer11.id,
    },
  });

  const ticket16 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260116',
      title: 'Installation systeme de caisse',
      description: 'Besoin d\'installer un systeme de caisse pour la boutique. Ecran tactile, tiroir-caisse, imprimante de recus.',
      status: 'EN_ATTENTE_APPROBATION',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'INSTALLATION',
      quotedPrice: 2800.00,
      quoteDescription: 'Installation systeme POS complet: ecran tactile, tiroir-caisse, imprimante thermique et configuration logicielle',
      quoteDuration: '1 journee',
      customerId: customer12.id,
      technicianId: tech1.id,
    },
  });

  const ticket17 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260117',
      title: 'Lenteur generale de l\'ordinateur',
      description: 'Mon ordinateur est de plus en plus lent. Le demarrage prend plus de 5 minutes et les programmes gèlent souvent.',
      status: 'EN_COURS',
      priority: 'NORMALE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'LOGICIEL',
      customerId: customer13.id,
      technicianId: tech2.id,
    },
  });

  const ticket18 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260118',
      title: 'Migration vers le cloud',
      description: 'Nous souhaitons migrer nos donnees et notre messagerie vers Microsoft 365. 12 employes.',
      status: 'APPROUVEE',
      priority: 'HAUTE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'DONNEES',
      customerId: customer14.id,
      technicianId: tech1.id,
    },
  });

  const ticket19 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260119',
      title: 'Ecran bleu au demarrage',
      description: 'Mon PC affiche un ecran bleu avec le code d\'erreur CRITICAL_PROCESS_DIED a chaque demarrage. Impossible d\'acceder a Windows.',
      status: 'BLOCAGE',
      priority: 'URGENTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'LOGICIEL',
      blockerReason: 'Disque dur en fin de vie. En attente de l\'approbation du client pour le remplacement du SSD.',
      customerId: customer15.id,
      technicianId: tech1.id,
    },
  });

  const ticket20 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260120',
      title: 'Installation cameras de securite IP',
      description: 'Installation de 4 cameras IP et d\'un NVR pour le studio. Couverture de l\'entree, la salle principale et le stationnement.',
      status: 'PLANIFIEE',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'INSTALLATION',
      customerId: customer16.id,
      technicianId: tech2.id,
    },
  });

  const ticket21 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260121',
      title: 'Probleme de surchauffe laptop gaming',
      description: 'Mon laptop gaming surchauffe enormement pendant les jeux. Il s\'eteint parfois apres 30 minutes de jeu.',
      status: 'NOUVELLE',
      priority: 'NORMALE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'REPARATION',
      customerId: customer17.id,
    },
  });

  const ticket22 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260122',
      title: 'Configuration reseau garderie',
      description: 'Mise en place du wifi securise et du controle parental pour la garderie. 3 tablettes pour les educatrices et un poste administratif.',
      status: 'EN_ATTENTE_REPONSE_CLIENT',
      priority: 'BASSE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'RESEAU',
      customerId: customer18.id,
      technicianId: tech2.id,
    },
  });

  const ticket23 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260123',
      title: 'Recuperation photos telephone',
      description: 'J\'ai supprime par erreur toutes les photos de mon telephone. Plus de 2000 photos de famille. Besoin de recuperation urgente.',
      status: 'EN_COURS',
      priority: 'URGENTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'DONNEES',
      customerId: customer19.id,
      technicianId: tech2.id,
    },
  });

  const ticket24 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260124',
      title: 'Mise a jour systeme de reservation',
      description: 'Notre systeme de reservation en ligne est desuet. Besoin de mettre a jour le logiciel et le serveur.',
      status: 'TERMINEE',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'LOGICIEL',
      customerId: customer20.id,
      technicianId: tech1.id,
    },
  });

  const ticket25 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260125',
      title: 'Remplacement batterie tablette',
      description: 'La batterie de ma tablette Samsung gonfle. L\'ecran commence a se decoller sur le cote.',
      status: 'FERMEE',
      priority: 'HAUTE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'REPARATION',
      customerId: customer21.id,
      technicianId: tech2.id,
    },
  });

  const ticket26 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260126',
      title: 'Audit securite reseau',
      description: 'Nous souhaitons un audit de securite complet de notre reseau. Verification des pare-feux, politiques de mots de passe et vulnerabilites.',
      status: 'EN_ATTENTE_APPROBATION',
      priority: 'HAUTE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'CONSULTATION',
      quotedPrice: 3200.00,
      quoteDescription: 'Audit de securite complet: scan de vulnerabilites, revue des configurations, rapport detaille et recommandations',
      quoteDuration: '2 jours',
      customerId: customer22.id,
      technicianId: tech1.id,
    },
  });

  const ticket27 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260127',
      title: 'Installation imprimante 3D',
      description: 'J\'ai achete une imprimante 3D Prusa et j\'ai besoin d\'aide pour l\'assembler et la configurer avec mon ordinateur.',
      status: 'PLANIFIEE',
      priority: 'BASSE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'INSTALLATION',
      customerId: customer23.id,
      technicianId: tech2.id,
    },
  });

  const ticket28 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260128',
      title: 'Configuration site web et email professionnel',
      description: 'Besoin de configurer notre nom de domaine, hebergement web et adresses email professionnelles pour la fleuriste.',
      status: 'EN_COURS',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'LOGICIEL',
      customerId: customer24.id,
      technicianId: tech1.id,
    },
  });

  const ticket29 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260129',
      title: 'Sauvegarde et clonage disque dur',
      description: 'Je veux cloner mon disque dur actuel vers un nouveau SSD plus rapide. Mon PC a Windows 10 et environ 500GB de donnees.',
      status: 'ANNULEE',
      priority: 'BASSE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'DONNEES',
      customerId: customer25.id,
    },
  });

  const ticket30 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-260130',
      title: 'Formation cybersecurite pour employes',
      description: 'Formation de sensibilisation a la cybersecurite pour nos 8 employes. Phishing, mots de passe, bonnes pratiques.',
      status: 'APPROUVEE',
      priority: 'NORMALE',
      serviceMode: 'SUR_ROUTE',
      serviceCategory: 'FORMATION',
      customerId: customer18.id,
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

  // ─── New Appointments (12 more) ───

  // Past appointment 1 - completed 5 days ago
  const fiveDaysAgoAppt = new Date();
  fiveDaysAgoAppt.setDate(fiveDaysAgoAppt.getDate() - 5);
  fiveDaysAgoAppt.setHours(9, 0, 0, 0);
  const fiveDaysAgoApptEnd = new Date(fiveDaysAgoAppt);
  fiveDaysAgoApptEnd.setHours(12, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket7.id,
      technicianId: tech1.id,
      scheduledStart: fiveDaysAgoAppt,
      scheduledEnd: fiveDaysAgoApptEnd,
      status: 'TERMINE',
      notes: 'Audit de securite termine. Rapport envoye au client.',
    },
  });

  // Past appointment 2 - completed 2 days ago
  const twoDaysAgoAppt = new Date();
  twoDaysAgoAppt.setDate(twoDaysAgoAppt.getDate() - 2);
  twoDaysAgoAppt.setHours(13, 0, 0, 0);
  const twoDaysAgoApptEnd = new Date(twoDaysAgoAppt);
  twoDaysAgoApptEnd.setHours(16, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket24.id,
      technicianId: tech1.id,
      scheduledStart: twoDaysAgoAppt,
      scheduledEnd: twoDaysAgoApptEnd,
      status: 'TERMINE',
      notes: 'Mise a jour du systeme de reservation effectuee avec succes.',
    },
  });

  // Past appointment 3 - cancelled last week
  const sixDaysAgoAppt = new Date();
  sixDaysAgoAppt.setDate(sixDaysAgoAppt.getDate() - 6);
  sixDaysAgoAppt.setHours(10, 0, 0, 0);
  const sixDaysAgoApptEnd = new Date(sixDaysAgoAppt);
  sixDaysAgoApptEnd.setHours(11, 30, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket29.id,
      technicianId: tech2.id,
      scheduledStart: sixDaysAgoAppt,
      scheduledEnd: sixDaysAgoApptEnd,
      status: 'ANNULE',
      cancelReason: 'Le client a decide de faire le clonage lui-meme.',
    },
  });

  // Past appointment 4 - completed yesterday
  const yesterdayAppt = new Date();
  yesterdayAppt.setDate(yesterdayAppt.getDate() - 1);
  yesterdayAppt.setHours(14, 0, 0, 0);
  const yesterdayApptEnd = new Date(yesterdayAppt);
  yesterdayApptEnd.setHours(17, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket25.id,
      technicianId: tech2.id,
      scheduledStart: yesterdayAppt,
      scheduledEnd: yesterdayApptEnd,
      status: 'TERMINE',
      notes: 'Remplacement batterie tablette termine. Client satisfait.',
    },
  });

  // Today appointment 1 - in progress
  const todayAppt2 = new Date();
  todayAppt2.setHours(9, 0, 0, 0);
  const todayAppt2End = new Date(todayAppt2);
  todayAppt2End.setHours(12, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket28.id,
      technicianId: tech1.id,
      scheduledStart: todayAppt2,
      scheduledEnd: todayAppt2End,
      status: 'EN_COURS',
      notes: 'Configuration du domaine et des emails pour Fleuriste Paradis',
    },
  });

  // Today appointment 2 - planned for afternoon
  const todayAppt3 = new Date();
  todayAppt3.setHours(13, 30, 0, 0);
  const todayAppt3End = new Date(todayAppt3);
  todayAppt3End.setHours(15, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket23.id,
      technicianId: tech2.id,
      scheduledStart: todayAppt3,
      scheduledEnd: todayAppt3End,
      status: 'PLANIFIE',
      notes: 'Recuperation de photos - apporter cable OTG et logiciel de recuperation',
    },
  });

  // Future appointment 1 - 3 days from now
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(10, 0, 0, 0);
  const threeDaysFromNowEnd = new Date(threeDaysFromNow);
  threeDaysFromNowEnd.setHours(12, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket18.id,
      technicianId: tech1.id,
      scheduledStart: threeDaysFromNow,
      scheduledEnd: threeDaysFromNowEnd,
      status: 'CONFIRME',
      notes: 'Premiere session de migration cloud - preparation des comptes Microsoft 365',
    },
  });

  // Future appointment 2 - 5 days from now
  const fiveDaysFromNowAppt = new Date();
  fiveDaysFromNowAppt.setDate(fiveDaysFromNowAppt.getDate() + 5);
  fiveDaysFromNowAppt.setHours(9, 0, 0, 0);
  const fiveDaysFromNowApptEnd = new Date(fiveDaysFromNowAppt);
  fiveDaysFromNowApptEnd.setHours(17, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket20.id,
      technicianId: tech2.id,
      scheduledStart: fiveDaysFromNowAppt,
      scheduledEnd: fiveDaysFromNowApptEnd,
      status: 'PLANIFIE',
      notes: 'Installation cameras IP - journee complete prevue',
    },
  });

  // Future appointment 3 - 6 days from now
  const sixDaysFromNow = new Date();
  sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
  sixDaysFromNow.setHours(13, 0, 0, 0);
  const sixDaysFromNowEnd = new Date(sixDaysFromNow);
  sixDaysFromNowEnd.setHours(16, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket27.id,
      technicianId: tech2.id,
      scheduledStart: sixDaysFromNow,
      scheduledEnd: sixDaysFromNowEnd,
      status: 'PLANIFIE',
      notes: 'Installation et configuration imprimante 3D Prusa',
    },
  });

  // Future appointment 4 - 8 days from now (demand)
  const eightDaysFromNow = new Date();
  eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8);
  eightDaysFromNow.setHours(10, 0, 0, 0);
  const eightDaysFromNowEnd = new Date(eightDaysFromNow);
  eightDaysFromNowEnd.setHours(12, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket30.id,
      technicianId: tech1.id,
      scheduledStart: eightDaysFromNow,
      scheduledEnd: eightDaysFromNowEnd,
      status: 'DEMANDE',
      notes: 'Formation cybersecurite - premiere session (4 employes)',
    },
  });

  // Future appointment 5 - 10 days from now (demand)
  const tenDaysFromNow = new Date();
  tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
  tenDaysFromNow.setHours(10, 0, 0, 0);
  const tenDaysFromNowEnd = new Date(tenDaysFromNow);
  tenDaysFromNowEnd.setHours(12, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      ticketId: ticket30.id,
      technicianId: tech1.id,
      scheduledStart: tenDaysFromNow,
      scheduledEnd: tenDaysFromNowEnd,
      status: 'DEMANDE',
      notes: 'Formation cybersecurite - deuxieme session (4 employes restants)',
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

  // ─── New Messages (12 more) ───
  await prisma.message.create({
    data: {
      ticketId: ticket15.id,
      authorId: customer11.id,
      content: 'J\'ai essaye deux chargeurs differents et aucun ne fonctionne. Le port de charge semble un peu lache.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket16.id,
      authorId: tech1.id,
      content: 'Bonjour Mme Dufresne, le devis inclut l\'ecran tactile 15 pouces, le tiroir-caisse, l\'imprimante thermique et la configuration du logiciel de caisse.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket16.id,
      authorId: customer12.id,
      content: 'Merci pour le devis. Est-ce que le logiciel de caisse est compatible avec la gestion d\'inventaire?',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket17.id,
      authorId: tech2.id,
      content: 'Diagnostic en cours. Le disque dur mecanique est la cause principale de la lenteur. Je recommande un remplacement par un SSD.',
      isInternal: false,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket17.id,
      authorId: tech2.id,
      content: 'Note interne: le client a aussi 47 programmes au demarrage. Faire le menage apres l\'installation du SSD.',
      isInternal: true,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket19.id,
      authorId: tech1.id,
      content: 'Le disque dur est en fin de vie (SMART indique de nombreux secteurs realloues). Le SSD de remplacement coutera environ 120$ pour un 500GB.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket19.id,
      authorId: customer15.id,
      content: 'D\'accord pour le remplacement. Est-ce que vous pouvez recuperer mes donnees avant?',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket23.id,
      authorId: tech2.id,
      content: 'Bonne nouvelle: le scan initial montre que les photos sont recuperables. Je commence la procedure de recuperation.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket23.id,
      authorId: customer19.id,
      content: 'Merci beaucoup! C\'est un grand soulagement. Combien de temps ca va prendre?',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket26.id,
      authorId: tech1.id,
      content: 'Note interne: le client a mentionne avoir eu un incident de securite il y a 2 mois. Verifier les logs du pare-feu en priorite.',
      isInternal: true,
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket28.id,
      authorId: tech1.id,
      content: 'Le domaine fleuristeparadis.ca est disponible. J\'ai configure les enregistrements DNS et les boites email. Premiere connexion envoyee par courriel.',
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket28.id,
      authorId: customer24.id,
      content: 'Parfait! J\'ai recu le courriel de configuration. Est-ce que je peux aussi avoir une adresse info@fleuristeparadis.ca?',
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
      // New notifications (9 more)
      {
        userId: admin.id,
        ticketId: ticket15.id,
        type: 'TICKET_CREATED',
        title: 'Nouveau billet',
        message: 'Le billet TKT-260115 a ete cree par Émile Lafleur',
      },
      {
        userId: admin.id,
        ticketId: ticket21.id,
        type: 'TICKET_CREATED',
        title: 'Nouveau billet',
        message: 'Le billet TKT-260121 a ete cree par Patrick Desjardins',
      },
      {
        userId: customer12.id,
        ticketId: ticket16.id,
        type: 'QUOTE_SENT',
        title: 'Devis envoye',
        message: 'Un devis de 2 800,00 $ a ete soumis pour le billet TKT-260116 (systeme de caisse)',
      },
      {
        userId: customer22.id,
        ticketId: ticket26.id,
        type: 'QUOTE_SENT',
        title: 'Devis envoye',
        message: 'Un devis de 3 200,00 $ a ete soumis pour le billet TKT-260126 (audit securite)',
      },
      {
        userId: tech2.id,
        ticketId: ticket17.id,
        type: 'TECHNICIAN_ASSIGNED',
        title: 'Billet assigne',
        message: 'Le billet TKT-260117 vous a ete assigne',
      },
      {
        userId: tech1.id,
        ticketId: ticket18.id,
        type: 'TECHNICIAN_ASSIGNED',
        title: 'Billet assigne',
        message: 'Le billet TKT-260118 vous a ete assigne',
      },
      {
        userId: customer20.id,
        ticketId: ticket24.id,
        type: 'STATUS_CHANGED',
        title: 'Statut modifie',
        message: 'Le billet TKT-260124 a ete marque comme termine',
        readAt: new Date(),
      },
      {
        userId: tech2.id,
        ticketId: ticket20.id,
        type: 'APPOINTMENT_BOOKED',
        title: 'Rendez-vous planifie',
        message: 'Un rendez-vous a ete planifie pour le billet TKT-260120 (cameras de securite)',
      },
      {
        userId: customer19.id,
        ticketId: ticket23.id,
        type: 'NEW_MESSAGE',
        title: 'Nouveau message',
        message: 'Un nouveau message a ete ajoute au billet TKT-260123 (recuperation de photos)',
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

  const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
  const sixDaysAgo = new Date(now); sixDaysAgo.setDate(now.getDate() - 6);
  const nineteenDaysAgo = new Date(now); nineteenDaysAgo.setDate(now.getDate() - 19);
  const twentyDaysAgo = new Date(now); twentyDaysAgo.setDate(now.getDate() - 20);
  const twentyFiveDaysAgo = new Date(now); twentyFiveDaysAgo.setDate(now.getDate() - 25);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);

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

  // ─── New Work Orders (20 more: BDT-260317 to BDT-260336) ───

  // WO17: RECEPTION - Laptop just received today
  const wo17 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260317',
      status: 'RECEPTION',
      priority: 'HAUTE',
      customerId: customer11.id,
      customerName: 'Émile Lafleur',
      customerPhone: '514-555-0020',
      customerEmail: 'client11@example.com',
      deviceType: 'LAPTOP',
      deviceBrand: 'Dell',
      deviceModel: 'Inspiron 15 3520',
      deviceSerial: 'DL3520-F8901',
      deviceColor: 'Argent',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Port de charge lache. Quelques egratignures mineures.',
      accessories: ['Chargeur Dell 65W'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Batterie presente': true,
        'Chargeur inclus': true,
        'Chassis sans dommage': true,
        'Ports USB fonctionnels': true,
      },
      reportedIssue: 'Le portable ne charge plus du tout. Le voyant de charge ne s\'allume pas. J\'ai teste avec 2 chargeurs differents.',
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

  // WO18: DIAGNOSTIC - Desktop 2 days ago
  const wo18 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260318',
      status: 'DIAGNOSTIC',
      priority: 'NORMALE',
      customerId: customer13.id,
      customerName: 'Alain Bergeron',
      customerPhone: '450-555-0022',
      customerEmail: 'client13@example.com',
      deviceType: 'DESKTOP',
      deviceBrand: 'Acer',
      deviceModel: 'Aspire TC-1780',
      deviceSerial: 'ACR-TC-G2345',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Tour en bon etat, pas de dommages physiques.',
      accessories: ['Cable alimentation', 'Cable HDMI'],
      conditionChecklist: {
        'Chassis intact': true,
        'Ventilateurs fonctionnels': true,
        'Ports USB avant': true,
        'Lecteur optique': true,
      },
      reportedIssue: 'L\'ordinateur est extremement lent. Le demarrage prend 5+ minutes. Les programmes gèlent regulierement.',
      serviceCategory: 'LOGICIEL',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: twoDaysAgo,
      intakeDate: twoDaysAgo,
      estimatedPickupDate: fiveDaysFromNow,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Disque dur mecanique a 95% de capacite. 47 programmes au demarrage. Recommandation: SSD + nettoyage logiciel.',
      diagnosticFee: 45.00,
      warrantyDays: 30,
    },
  });

  // WO19: ATTENTE_APPROBATION - Telephone 6 days ago
  const wo19 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260319',
      status: 'ATTENTE_APPROBATION',
      priority: 'URGENTE',
      customerId: customer19.id,
      customerName: 'Daniel Morin',
      customerPhone: '514-555-0028',
      customerEmail: 'client19@example.com',
      deviceType: 'TELEPHONE',
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy S23 Ultra',
      deviceSerial: 'SGS23U-D7890',
      deviceColor: 'Vert',
      deviceOs: 'Android 14',
      conditionNotes: 'Appareil en bon etat physique.',
      accessories: ['Chargeur USB-C', 'Stylet S Pen'],
      conditionChecklist: {
        'Ecran intact': true,
        'Boutons fonctionnels': true,
        'Appareil photo': true,
        'Stylet S Pen': true,
      },
      reportedIssue: 'Photos supprimees par erreur. Plus de 2000 photos de famille. Besoin de recuperation urgente.',
      serviceCategory: 'DONNEES',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: sixDaysAgo,
      intakeDate: sixDaysAgo,
      intakeById: tech2.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Scan initial montre que 1847 photos sont recuperables sur 2100. Procedure de recuperation estimee a 4 heures.',
      estimatedCost: 350.00,
      maxAuthorizedSpend: 400.00,
      diagnosticFee: 45.00,
      warrantyDays: 0,
    },
  });

  // WO20: APPROUVE - Tablette 6 days ago
  const wo20 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260320',
      status: 'APPROUVE',
      priority: 'NORMALE',
      customerId: customer21.id,
      customerName: 'Stéphane Nadeau',
      customerPhone: '514-555-0030',
      customerEmail: 'client21@example.com',
      deviceType: 'TABLETTE',
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy Tab S8+',
      deviceSerial: 'SGT-S8P-K1234',
      deviceColor: 'Gris',
      deviceOs: 'Android 14',
      conditionNotes: 'Ecran commence a se decoller sur le cote gauche.',
      accessories: ['Chargeur USB-C', 'Etui a rabat'],
      conditionChecklist: {
        'Ecran intact': false,
        'Haut-parleurs': true,
        'Port USB-C': true,
        'Boutons volume/power': true,
      },
      reportedIssue: 'La batterie gonfle et l\'ecran se decolle. La tablette chauffe beaucoup en utilisation.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: sixDaysAgo,
      intakeDate: sixDaysAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Batterie gonflee confirmee. Remplacement urgent necessaire. Ecran non endommage.',
      estimatedCost: 200.00,
      maxAuthorizedSpend: 250.00,
      estimatedPickupDate: twoDaysFromNow,
      diagnosticFee: 0,
      warrantyDays: 60,
    },
  });

  // WO21: ATTENTE_PIECES - Imprimante 12 days ago
  const wo21 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260321',
      status: 'ATTENTE_PIECES',
      priority: 'BASSE',
      customerId: customer14.id,
      customerName: 'Mélanie Savard - Agence de Voyage Savard',
      customerPhone: '450-555-0023',
      customerEmail: 'client14@example.com',
      deviceType: 'IMPRIMANTE',
      deviceBrand: 'Epson',
      deviceModel: 'WorkForce Pro WF-4830',
      deviceSerial: 'EPS-WF4830-N5678',
      conditionNotes: 'Appareil en etat moyen, quelques traces d\'encre.',
      accessories: ['Cable alimentation', 'Cable USB'],
      conditionChecklist: {
        'Ecran affichage OK': true,
        'Bac papier intact': true,
        'Chargeur docs ADF': true,
        'Vitre scanner': true,
      },
      reportedIssue: 'L\'imprimante ne reconnait plus les cartouches d\'encre. Message d\'erreur "cartouche non reconnue" sur toutes les couleurs.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: twelveDaysAgo,
      intakeDate: twelveDaysAgo,
      intakeById: tech1.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Chip de lecture des cartouches defectueux sur la tete d\'impression. Remplacement de la tete necessaire.',
      repairNotes: 'Tete d\'impression commandee chez Epson. Delai: 7-10 jours ouvrables.',
      estimatedCost: 180.00,
      depositAmount: 50.00,
      diagnosticFee: 35.00,
      warrantyDays: 30,
    },
  });

  // WO22: EN_REPARATION - Serveur 8 days ago
  const wo22 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260322',
      status: 'EN_REPARATION',
      priority: 'URGENTE',
      customerId: customer18.id,
      customerName: 'Josée Gauthier - Garderie Les Petits Anges',
      customerPhone: '438-555-0027',
      customerEmail: 'client18@example.com',
      deviceType: 'SERVEUR',
      deviceBrand: 'HP',
      deviceModel: 'ProLiant MicroServer Gen10 Plus',
      deviceSerial: 'HP-MS10P-L9012',
      deviceOs: 'Windows Server 2019 Essentials',
      conditionNotes: 'Serveur en bon etat physique.',
      accessories: ['Cable alimentation', '2x Cable RJ45'],
      conditionChecklist: {
        'Chassis intact': true,
        'Ventilateurs fonctionnels': true,
        'Disques durs presents': true,
        'Ports reseau': true,
      },
      reportedIssue: 'Le serveur de fichiers de la garderie ne demarre plus. Erreur au POST. Les donnees des enfants et les dossiers administratifs sont dessus.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: eightDaysAgo,
      intakeDate: eightDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Module memoire ECC defectueux (slot 2). Remplacement en cours.',
      repairNotes: 'Memoire ECC remplacee. Verification de l\'integrite des donnees en cours.',
      estimatedCost: 300.00,
      depositAmount: 100.00,
      partsUsed: [
        { name: 'Module DDR4 ECC 16GB HP', cost: 120.00, type: 'OEM' },
      ],
      diagnosticFee: 45.00,
      warrantyDays: 90,
    },
  });

  // WO23: VERIFICATION - Laptop 10 days ago
  const wo23 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260323',
      status: 'VERIFICATION',
      priority: 'NORMALE',
      customerId: customer15.id,
      customerName: 'Réjean Paquette',
      customerPhone: '514-555-0024',
      customerEmail: 'client15@example.com',
      deviceType: 'LAPTOP',
      deviceBrand: 'ASUS',
      deviceModel: 'ROG Strix G16',
      deviceSerial: 'ASU-ROG-M3456',
      deviceColor: 'Noir Eclipse',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Portable gaming en bon etat. Stickers sur le couvercle.',
      accessories: ['Chargeur 280W', 'Souris gaming'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Batterie presente': true,
        'Ventilateurs': true,
        'Ports USB/HDMI': true,
      },
      reportedIssue: 'Ecran bleu CRITICAL_PROCESS_DIED a chaque demarrage. Impossible d\'acceder a Windows. Le mode sans echec ne fonctionne pas non plus.',
      serviceCategory: 'LOGICIEL',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: tenDaysAgo,
      intakeDate: tenDaysAgo,
      intakeById: tech1.id,
      technicianId: tech1.id,
      diagnosticNotes: 'SSD NVMe en fin de vie - SMART critique. Remplacement effectue, Windows reinstalle.',
      repairNotes: 'SSD Samsung 990 Pro 1TB installe. Windows 11 reinstalle. Donnees recuperees du vieux SSD. Tests de stabilite en cours.',
      estimatedCost: 220.00,
      finalCost: 210.00,
      partsUsed: [
        { name: 'Samsung 990 Pro 1TB NVMe', cost: 130.00, type: 'OEM' },
        { name: 'Pate thermique Arctic MX-6', cost: 12.00, type: 'AFTERMARKET' },
      ],
      diagnosticFee: 45.00,
      warrantyDays: 90,
    },
  });

  // WO24: PRET - Telephone 15 days ago
  const wo24 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260324',
      status: 'PRET',
      priority: 'HAUTE',
      customerId: customer17.id,
      customerName: 'Patrick Desjardins',
      customerPhone: '514-555-0026',
      customerEmail: 'client17@example.com',
      deviceType: 'TELEPHONE',
      deviceBrand: 'Google',
      deviceModel: 'Pixel 8 Pro',
      deviceSerial: 'GPX8P-R5678',
      deviceColor: 'Porcelaine',
      deviceOs: 'Android 14',
      conditionNotes: 'Ecran micro-fissure coin superieur droit.',
      accessories: ['Chargeur USB-C', 'Etui transparent'],
      conditionChecklist: {
        'Ecran intact': false,
        'Boutons fonctionnels': true,
        'Appareil photo': true,
        'Haut-parleur': true,
      },
      reportedIssue: 'L\'ecran a des zones mortes au tactile apres une micro-fissure. Certaines applications sont impossibles a utiliser.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: fifteenDaysAgo,
      intakeDate: fifteenDaysAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Digitizer endommage. Remplacement de l\'ensemble ecran+digitizer.',
      repairNotes: 'Ecran OLED remplace. Tests tactiles OK. Calibration effectuee.',
      estimatedCost: 380.00,
      finalCost: 370.00,
      completedDate: twoDaysAgo,
      estimatedPickupDate: now,
      partsUsed: [
        { name: 'Ecran OLED Pixel 8 Pro', cost: 250.00, type: 'OEM' },
        { name: 'Kit adhesif etancheite', cost: 15.00, type: 'AFTERMARKET' },
      ],
      warrantyDays: 90,
    },
  });

  // WO25: REMIS - Tout-en-un 20 days ago (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260325',
      status: 'REMIS',
      priority: 'NORMALE',
      customerId: customer16.id,
      customerName: 'Véronique Lemieux - Studio de Yoga Harmonie',
      customerPhone: '514-555-0025',
      customerEmail: 'client16@example.com',
      deviceType: 'TOUT_EN_UN',
      deviceBrand: 'Lenovo',
      deviceModel: 'IdeaCentre AIO 3 27',
      deviceSerial: 'LNV-AIO3-P4567',
      deviceColor: 'Blanc',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Appareil en bon etat, quelques traces de doigts sur l\'ecran.',
      accessories: ['Clavier sans fil', 'Souris sans fil', 'Cable alimentation'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Souris fonctionnelle': true,
        'Webcam': true,
        'Haut-parleurs': true,
      },
      reportedIssue: 'Le systeme est infecte par des adwares. Publicites intempestives et redirections de navigateur.',
      serviceCategory: 'LOGICIEL',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: twentyDaysAgo,
      intakeDate: twentyDaysAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Infection adware confirmee. 12 PUPs detectes. Nettoyage complet effectue.',
      repairNotes: 'Nettoyage malware complet. Adwcleaner + Malwarebytes. Chrome reinitialise. Antivirus installe.',
      estimatedCost: 120.00,
      finalCost: 120.00,
      completedDate: fifteenDaysAgo,
      pickupDate: twelveDaysAgo,
      warrantyStartDate: twelveDaysAgo,
      warrantyDays: 30,
    },
  });

  // WO26: REFUSE - Desktop 19 days ago (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260326',
      status: 'REFUSE',
      priority: 'BASSE',
      customerId: customer23.id,
      customerName: 'Michel Simard',
      customerPhone: '514-555-0032',
      deviceType: 'DESKTOP',
      deviceBrand: 'HP',
      deviceModel: 'Pavilion Desktop TP01',
      deviceSerial: 'HP-TP01-Q7890',
      deviceOs: 'Windows 10 Home',
      conditionNotes: 'Tour poussiereuse, quelques marques.',
      accessories: ['Cable alimentation'],
      conditionChecklist: {
        'Chassis intact': true,
        'Ventilateurs fonctionnels': false,
        'Ports USB avant': true,
      },
      reportedIssue: 'L\'ordinateur fait un bruit fort de ventilateur et surchauffe. Il s\'eteint tout seul apres 15 minutes.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: nineteenDaysAgo,
      intakeDate: nineteenDaysAgo,
      intakeById: tech1.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Ventilateur CPU HS + pate thermique sechee. GPU aussi en surchauffe. Reparation estimee a 180$ mais le PC vaut environ 200$.',
      estimatedCost: 180.00,
      diagnosticFee: 45.00,
      warrantyDays: 0,
    },
  });

  // WO27: ABANDONNE - Tablette 25 days ago (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260327',
      status: 'ABANDONNE',
      priority: 'BASSE',
      customerId: customer25.id,
      customerName: 'Robert Champagne',
      customerPhone: '514-555-0034',
      deviceType: 'TABLETTE',
      deviceBrand: 'Amazon',
      deviceModel: 'Fire HD 10 (2023)',
      deviceSerial: 'AMZ-FHD10-S1234',
      deviceOs: 'FireOS 7',
      conditionNotes: 'Tablette en etat moyen, ecran raye.',
      accessories: ['Chargeur USB-C'],
      conditionChecklist: {
        'Ecran intact': true,
        'Haut-parleurs': true,
        'Port USB-C': true,
        'Boutons': true,
      },
      reportedIssue: 'La tablette ne s\'allume plus du tout. Aucune reaction au bouton power ni a la charge.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'DECLINE',
      termsAccepted: true,
      termsAcceptedAt: twentyFiveDaysAgo,
      intakeDate: twentyFiveDaysAgo,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Carte mere grillee. Cout de reparation superieur au prix d\'achat. Client informe mais ne donne pas suite.',
      estimatedCost: 150.00,
      diagnosticFee: 45.00,
      abandonedDate: tenDaysAgo,
      warrantyDays: 0,
    },
  });

  // WO28: ANNULE - Reseau equip 3 days ago (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260328',
      status: 'ANNULE',
      priority: 'NORMALE',
      customerId: customer12.id,
      customerName: 'Geneviève Dufresne - Boutique Mode Gigi',
      customerPhone: '514-555-0021',
      customerEmail: 'client12@example.com',
      deviceType: 'RESEAU_EQUIP',
      deviceBrand: 'TP-Link',
      deviceModel: 'Archer AX73',
      deviceSerial: 'TPL-AX73-T5678',
      conditionNotes: 'Routeur en bon etat.',
      accessories: ['Cable alimentation', 'Cable RJ45'],
      conditionChecklist: {
        'Antennes intactes': true,
        'Ports RJ45': true,
        'LED statut': true,
      },
      reportedIssue: 'Le WiFi decroche toutes les heures. Les appareils doivent se reconnecter manuellement.',
      serviceCategory: 'RESEAU',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: threeDaysAgo,
      intakeDate: threeDaysAgo,
      intakeById: admin.id,
      diagnosticFee: 0,
      warrantyDays: 0,
    },
  });

  // WO29: RECEPTION - Autre (peripherique) today
  const wo29 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260329',
      status: 'RECEPTION',
      priority: 'BASSE',
      customerId: customer22.id,
      customerName: 'Annie Ouellet - Centre de Massothérapie Zen',
      customerPhone: '514-555-0031',
      customerEmail: 'client22@example.com',
      deviceType: 'AUTRE',
      deviceBrand: 'Clover',
      deviceModel: 'Station Duo',
      deviceSerial: 'CLV-DUO-U9012',
      conditionNotes: 'Terminal de paiement en bon etat physique.',
      accessories: ['Cable alimentation', 'Cable Ethernet', 'Rouleau de papier'],
      conditionChecklist: {
        'Ecran tactile OK': true,
        'Imprimante recus': true,
        'Lecteur carte': true,
        'NFC/sans contact': true,
      },
      reportedIssue: 'Le terminal de paiement affiche "Erreur de connexion" depuis 2 jours. Impossible de prendre les paiements par carte.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: now,
      intakeDate: now,
      estimatedPickupDate: twoDaysFromNow,
      intakeById: tech1.id,
      diagnosticFee: 35.00,
      warrantyDays: 30,
    },
  });

  // WO30: DIAGNOSTIC - Laptop 4 days ago
  const wo30 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260330',
      status: 'DIAGNOSTIC',
      priority: 'HAUTE',
      customerId: customer20.id,
      customerName: 'Catherine Brassard - Salon de Coiffure Belle Tête',
      customerPhone: '438-555-0029',
      customerEmail: 'client20@example.com',
      deviceType: 'LAPTOP',
      deviceBrand: 'HP',
      deviceModel: 'Pavilion 15-eg',
      deviceSerial: 'HP-PAV15-V3456',
      deviceColor: 'Rose dore',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Quelques egratignures cosmetiques.',
      accessories: ['Chargeur HP 45W'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Batterie presente': true,
        'Chargeur inclus': true,
      },
      reportedIssue: 'Le logiciel de reservation du salon plante constamment. Les rendez-vous disparaissent parfois de la base de donnees.',
      serviceCategory: 'LOGICIEL',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: fourDaysAgo,
      intakeDate: fourDaysAgo,
      estimatedPickupDate: fiveDaysFromNow,
      intakeById: admin.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Corruption de la base de donnees SQLite du logiciel. Secteurs defectueux sur le disque HDD.',
      diagnosticFee: 45.00,
      warrantyDays: 30,
    },
  });

  // WO31: EN_REPARATION - Desktop 10 days ago
  const wo31 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260331',
      status: 'EN_REPARATION',
      priority: 'NORMALE',
      customerId: customer24.id,
      customerName: 'Julie Paradis - Fleuriste Paradis',
      customerPhone: '514-555-0033',
      customerEmail: 'client24@example.com',
      deviceType: 'DESKTOP',
      deviceBrand: 'Dell',
      deviceModel: 'OptiPlex 7010',
      deviceSerial: 'DL-OPT7010-W7890',
      deviceOs: 'Windows 11 Pro',
      conditionNotes: 'Tour de bureau en bon etat general.',
      accessories: ['Cable alimentation', 'Clavier', 'Souris'],
      conditionChecklist: {
        'Chassis intact': true,
        'Ventilateurs fonctionnels': true,
        'Ports USB': true,
        'Lecteur carte SD': true,
      },
      reportedIssue: 'L\'ordinateur redemarre tout seul de maniere aleatoire. Parfois en plein milieu d\'une commande client. Tres genante pour le commerce.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: tenDaysAgo,
      intakeDate: tenDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Alimentation defectueuse - tension instable sur le rail 12V. Condensateurs gonfles.',
      repairNotes: 'Remplacement de l\'alimentation en cours. Nouvelle alimentation 80+ Gold installee.',
      estimatedCost: 160.00,
      depositAmount: 50.00,
      partsUsed: [
        { name: 'Alimentation Corsair CX450M 80+ Bronze', cost: 65.00, type: 'AFTERMARKET' },
      ],
      diagnosticFee: 45.00,
      warrantyDays: 90,
    },
  });

  // WO32: ATTENTE_APPROBATION - Telephone 5 days ago
  const wo32 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260332',
      status: 'ATTENTE_APPROBATION',
      priority: 'NORMALE',
      customerId: customer17.id,
      customerName: 'Patrick Desjardins',
      customerPhone: '514-555-0026',
      customerEmail: 'client17@example.com',
      deviceType: 'TELEPHONE',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 14',
      deviceSerial: 'F2LY98765432',
      deviceColor: 'Bleu',
      deviceOs: 'iOS 17.3',
      conditionNotes: 'Appareil en bon etat, avec etui de protection.',
      accessories: ['Chargeur Lightning'],
      conditionChecklist: {
        'Ecran intact': true,
        'Boutons fonctionnels': true,
        'Appareil photo': true,
        'Face ID': true,
      },
      reportedIssue: 'La batterie ne tient plus que 3 heures. Le telephone s\'eteint a 20% de batterie.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'CLIENT_FAIT',
      termsAccepted: true,
      termsAcceptedAt: fiveDaysAgo,
      intakeDate: fiveDaysAgo,
      intakeById: tech2.id,
      technicianId: tech2.id,
      diagnosticNotes: 'Batterie a 67% de sa capacite originale (cycles: 1247). Remplacement recommande.',
      estimatedCost: 130.00,
      diagnosticFee: 0,
      warrantyDays: 90,
    },
  });

  // WO33: APPROUVE - TOUT_EN_UN 8 days ago
  const wo33 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260333',
      status: 'APPROUVE',
      priority: 'HAUTE',
      customerId: customer22.id,
      customerName: 'Annie Ouellet - Centre de Massothérapie Zen',
      customerPhone: '514-555-0031',
      customerEmail: 'client22@example.com',
      deviceType: 'TOUT_EN_UN',
      deviceBrand: 'HP',
      deviceModel: 'All-in-One 27-cr',
      deviceSerial: 'HP-AIO27-X1234',
      deviceColor: 'Blanc coquillage',
      deviceOs: 'Windows 11 Home',
      conditionNotes: 'Appareil en bon etat, ecran propre.',
      accessories: ['Clavier HP', 'Souris HP', 'Cable alimentation'],
      conditionChecklist: {
        'Ecran intact': true,
        'Clavier fonctionnel': true,
        'Webcam': true,
        'Haut-parleurs': true,
        'Ports USB': true,
      },
      reportedIssue: 'L\'ecran clignote de maniere aleatoire. Parfois completement noir pendant 2-3 secondes puis revient.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: eightDaysAgo,
      intakeDate: eightDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Retro-eclairage LED defectueux. Remplacement du ruban LED necessaire.',
      estimatedCost: 280.00,
      maxAuthorizedSpend: 300.00,
      diagnosticFee: 45.00,
      warrantyDays: 60,
    },
  });

  // WO34: REMIS - Laptop 30 days ago (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260334',
      status: 'REMIS',
      priority: 'URGENTE',
      customerId: customer14.id,
      customerName: 'Mélanie Savard - Agence de Voyage Savard',
      customerPhone: '450-555-0023',
      customerEmail: 'client14@example.com',
      deviceType: 'LAPTOP',
      deviceBrand: 'Lenovo',
      deviceModel: 'ThinkPad T14s Gen 4',
      deviceSerial: 'LNV-T14S-Y5678',
      deviceColor: 'Noir tonnerre',
      deviceOs: 'Windows 11 Pro',
      reportedIssue: 'Ecran noir apres mise a jour Windows. Le portable demarre (LED allumee) mais rien a l\'ecran.',
      serviceCategory: 'LOGICIEL',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: thirtyDaysAgo,
      intakeDate: thirtyDaysAgo,
      intakeById: admin.id,
      technicianId: tech1.id,
      diagnosticNotes: 'Pilote GPU corrompu apres Windows Update. Demarrage en mode sans echec OK.',
      repairNotes: 'Pilote GPU reinstalle. Windows Update problematique desinstalle. Mise a jour bloquee.',
      estimatedCost: 80.00,
      finalCost: 80.00,
      completedDate: twentyFiveDaysAgo,
      pickupDate: twentyDaysAgo,
      warrantyStartDate: twentyDaysAgo,
      warrantyDays: 30,
    },
  });

  // WO35: PRET - Desktop 20 days ago
  const wo35 = await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260335',
      status: 'PRET',
      priority: 'NORMALE',
      customerId: customer13.id,
      customerName: 'Alain Bergeron',
      customerPhone: '450-555-0022',
      customerEmail: 'client13@example.com',
      deviceType: 'DESKTOP',
      deviceBrand: 'Custom',
      deviceModel: 'Tour bureautique personnalisee',
      deviceSerial: 'CUSTOM-2023-BRG',
      deviceOs: 'Windows 10 Pro',
      conditionNotes: 'Tour en etat moyen, poussiereuse.',
      accessories: ['Cable alimentation'],
      conditionChecklist: {
        'Chassis intact': true,
        'Ventilateurs fonctionnels': true,
        'Ports USB': true,
      },
      reportedIssue: 'Mise a niveau demandee: ajout de RAM et remplacement du disque dur par un SSD.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'ATELIER_FAIT',
      termsAccepted: true,
      termsAcceptedAt: twentyDaysAgo,
      intakeDate: twentyDaysAgo,
      intakeById: tech1.id,
      technicianId: tech2.id,
      diagnosticNotes: 'PC fonctionnel mais lent. HDD 500GB a 85% capacite. 4GB RAM insuffisant.',
      repairNotes: 'SSD 1TB installe, 16GB RAM ajoutee. Windows migre. Nettoyage complet et mise a jour.',
      estimatedCost: 280.00,
      finalCost: 260.00,
      completedDate: fifteenDaysAgo,
      estimatedPickupDate: twelveDaysAgo,
      partsUsed: [
        { name: 'SSD Kingston A400 1TB', cost: 80.00, type: 'AFTERMARKET' },
        { name: 'RAM DDR4 16GB (2x8GB) Crucial', cost: 55.00, type: 'AFTERMARKET' },
      ],
      warrantyDays: 60,
    },
  });

  // WO36: ANNULE - Telephone 2 days ago (terminal)
  await prisma.workOrder.create({
    data: {
      orderNumber: 'BDT-260336',
      status: 'ANNULE',
      priority: 'NORMALE',
      customerId: customer25.id,
      customerName: 'Robert Champagne',
      customerPhone: '514-555-0034',
      deviceType: 'TELEPHONE',
      deviceBrand: 'Motorola',
      deviceModel: 'Moto G Power 5G',
      deviceSerial: 'MOT-GP5G-A1234',
      deviceColor: 'Gris mineral',
      deviceOs: 'Android 14',
      conditionNotes: 'Telephone en bon etat.',
      accessories: ['Chargeur USB-C'],
      conditionChecklist: {
        'Ecran intact': true,
        'Boutons fonctionnels': true,
        'Appareil photo': true,
      },
      reportedIssue: 'Le wifi ne se connecte plus. Le bluetooth fonctionne mais le wifi reste en recherche.',
      serviceCategory: 'REPARATION',
      dataBackupConsent: 'NON_APPLICABLE',
      termsAccepted: true,
      termsAcceptedAt: twoDaysAgo,
      intakeDate: twoDaysAgo,
      intakeById: admin.id,
      diagnosticFee: 0,
      warrantyDays: 0,
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
      // New work order notes (10 more)
      {
        workOrderId: wo17.id,
        authorId: admin.id,
        content: 'Appareil recu. Port de charge visuellement lache. Diagnostic planifie pour demain matin.',
        isInternal: false,
      },
      {
        workOrderId: wo18.id,
        authorId: tech2.id,
        content: 'Note interne: HDD Seagate 1TB presque plein. Recommander SSD 500GB Samsung + nettoyage des programmes au demarrage.',
        isInternal: true,
      },
      {
        workOrderId: wo19.id,
        authorId: tech2.id,
        content: 'Scan de recuperation termine. 1847 photos sur 2100 recuperables. En attente de l\'approbation du client pour proceder.',
        isInternal: false,
      },
      {
        workOrderId: wo22.id,
        authorId: tech1.id,
        content: 'Module memoire ECC remplace. Demarrage OK. Verification de l\'integrite des fichiers en cours avec chkdsk.',
        isInternal: true,
      },
      {
        workOrderId: wo22.id,
        authorId: admin.id,
        content: 'Garderie informee que le serveur sera pret demain. Ils ont un backup sur cle USB en attendant.',
        isInternal: false,
      },
      {
        workOrderId: wo23.id,
        authorId: tech1.id,
        content: 'SSD installe et Windows reinstalle. Donnees utilisateur restaurees depuis le vieux SSD. Lancement de 48h de tests de stabilite.',
        isInternal: true,
      },
      {
        workOrderId: wo24.id,
        authorId: tech2.id,
        content: 'Ecran OLED remplace avec succes. Client appele pour ramassage - pas de reponse, message vocal laisse.',
        isInternal: false,
      },
      {
        workOrderId: wo31.id,
        authorId: tech1.id,
        content: 'Alimentation remplacee. Tests de stress en cours (Prime95 + FurMark). Aucun redemarrage apres 2 heures.',
        isInternal: true,
      },
      {
        workOrderId: wo33.id,
        authorId: tech1.id,
        content: 'Client approuve la reparation a 280$. Ruban LED commande, disponible en 2-3 jours.',
        isInternal: false,
      },
      {
        workOrderId: wo35.id,
        authorId: tech2.id,
        content: 'Mise a niveau terminee. PC demarre en 12 secondes vs 4 minutes avant. Client contacte pour ramassage.',
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
  console.log(`  Users: 28 (1 admin, 2 technicians, 25 customers)`);
  console.log(`  Tickets: 30`);
  console.log(`  Appointments: 18`);
  console.log(`  Messages: 25`);
  console.log(`  Notifications: 18`);
  console.log(`  Work Orders: 36`);
  console.log(`  Work Order Notes: 22`);
}

// Run when called directly (prisma db seed)
seedDemoData()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
