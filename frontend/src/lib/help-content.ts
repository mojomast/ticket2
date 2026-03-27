// help-content.ts — Complete help content for all pages and roles in Valitek v2
// All content is in French (primary language of the application)

export interface HelpSection {
  heading: string;
  content: string;
}

export interface HelpArticle {
  title: string;
  description: string;
  sections: HelpSection[];
  tips?: string[];
}

// Key format: "ROLE:pageKey" or "GENERAL:pageKey" for shared content
const helpContent: Record<string, HelpArticle> = {

  // ============================================================
  //  ADMIN PAGES
  // ============================================================

  'ADMIN:admin-dashboard': {
    title: 'Tableau de bord administrateur',
    description:
      "Le tableau de bord vous offre une vue d'ensemble de l'activité de votre atelier. Vous y trouverez les indicateurs clés (billets actifs, devis en attente, rendez-vous du jour, bons de travail ouverts), la liste des billets récents et les prochains rendez-vous planifiés.",
    sections: [
      {
        heading: 'Cartes de statistiques',
        content:
          "Les quatre cartes en haut de la page résument les métriques essentielles : billets actifs, devis en attente de réponse client, rendez-vous prévus aujourd'hui et bons de travail ouverts. Cliquez sur une carte pour accéder directement à la page correspondante. Les chiffres se mettent à jour automatiquement à chaque visite de la page.",
      },
      {
        heading: 'Billets récents',
        content:
          "La section « Billets récents » affiche les derniers billets créés ou modifiés. Chaque ligne indique le numéro, le titre, le statut et la priorité. Cliquez sur un billet pour ouvrir sa fiche détaillée. Utilisez le lien « Voir tous les billets » pour accéder à la liste complète avec tous les filtres disponibles.",
      },
      {
        heading: 'Rendez-vous à venir',
        content:
          "La section « Rendez-vous à venir » liste les prochains rendez-vous planifiés avec le client, la date, l'heure et le technicien assigné. Les rendez-vous sont triés par date croissante. Un code couleur indique le statut : bleu pour planifié, vert pour confirmé, jaune pour en attente de confirmation.",
      },
      {
        heading: 'Navigation rapide',
        content:
          "Utilisez le menu latéral pour accéder à toutes les sections : Billets, Kanban, Calendrier, Clients, Techniciens, Bons de travail, Paramètres et Sauvegardes. Le tableau de bord est votre point de départ quotidien pour surveiller l'ensemble de l'activité de l'atelier et prioriser les tâches de la journée.",
      },
    ],
    tips: [
      "Consultez le tableau de bord en début de journée pour avoir un aperçu rapide des priorités.",
      "Cliquez sur les cartes de statistiques pour accéder directement aux listes filtrées correspondantes.",
      "Les rendez-vous du jour sont mis en évidence pour faciliter la planification matinale.",
      "Appuyez sur « ? » ou « F1 » pour afficher l'aide contextuelle à tout moment.",
    ],
  },

  'ADMIN:admin-tickets': {
    title: 'Gestion des billets',
    description:
      "Cette page affiche la liste complète de tous les billets de service. Vous pouvez rechercher, filtrer par statut, priorité, catégorie, technicien ou mode de service, et créer de nouveaux billets. Le tableau présente toutes les informations essentielles en un coup d'œil.",
    sections: [
      {
        heading: 'Recherche et filtres',
        content:
          "Utilisez la barre de recherche en haut pour trouver un billet par numéro, titre ou nom de client. Les filtres déroulants vous permettent de restreindre la liste par statut (Nouveau, Devis envoyé, Approuvé, etc.), priorité (Basse, Moyenne, Haute, Urgente), catégorie de service, technicien assigné et mode (Sur site, En atelier, À distance). Combinez plusieurs filtres pour affiner les résultats. Le bouton « Réinitialiser » efface tous les filtres actifs.",
      },
      {
        heading: 'Tableau des billets',
        content:
          "Le tableau affiche les colonnes : numéro (#), titre, client, statut, priorité, catégorie, mode, technicien et date de création. Cliquez sur l'en-tête d'une colonne pour trier les résultats. Cliquez sur une ligne pour ouvrir la fiche détaillée du billet. La pagination en bas permet de naviguer entre les pages de résultats lorsque la liste contient beaucoup de billets.",
      },
      {
        heading: 'Créer un nouveau billet',
        content:
          "Cliquez sur le bouton « + Nouveau billet » en haut à droite pour ouvrir le formulaire de création. Renseignez le client (sélection ou création rapide), le titre, la description détaillée du problème, la catégorie de service, le mode d'intervention et la priorité. Vous pouvez assigner un technicien immédiatement ou le faire ultérieurement depuis la fiche détaillée du billet.",
      },
      {
        heading: 'Statuts des billets',
        content:
          "Les billets suivent un cycle de vie structuré : NOUVEAU → DEVIS_ENVOYÉ → APPROUVÉ → PLANIFIÉ → EN_COURS → TERMINÉ. Des statuts spéciaux existent également : EN_ATTENTE_DEVIS (devis en préparation), REFUSÉ (devis refusé par le client) et ANNULÉ. Chaque statut est affiché avec un badge de couleur distincte pour un repérage rapide dans le tableau.",
      },
      {
        heading: 'Pagination et tri',
        content:
          "La pagination en bas de la page vous permet de naviguer entre les pages de résultats. Utilisez les boutons « Précédent » et « Suivant » ou cliquez directement sur un numéro de page. Les colonnes du tableau sont triables en cliquant sur leurs en-têtes. Le tri combiné aux filtres permet de retrouver n'importe quel billet rapidement.",
      },
    ],
    tips: [
      "Utilisez la combinaison de filtres statut + priorité pour identifier rapidement les billets urgents en attente.",
      "Le champ de recherche accepte les numéros de billet (ex : TKT-260101) pour un accès direct.",
      "Les billets sans technicien assigné apparaissent avec la mention « Non assigné » — pensez à les attribuer rapidement.",
      "Réinitialisez tous les filtres en cliquant sur « Réinitialiser » pour revenir à la vue complète.",
    ],
  },

  'ADMIN:admin-ticket-detail': {
    title: 'Détail du billet',
    description:
      "La page de détail du billet est le centre de gestion complet d'un billet de service. Vous y gérez le cycle de vie complet : transitions de statut, assignation de technicien, devis, bloqueurs, rendez-vous, propositions de dates, messages et notes internes. C'est la page la plus riche de l'application.",
    sections: [
      {
        heading: 'Statut et transitions',
        content:
          "Le statut actuel est affiché en haut de la page avec un badge de couleur. Les boutons de transition disponibles apparaissent juste en dessous et dépendent du statut actuel. Par exemple, depuis « Nouveau », vous pouvez passer à « Devis envoyé » ou « Approuvé ». Cliquez sur un bouton de transition pour changer le statut. Une confirmation peut être demandée pour certaines transitions irréversibles comme « Annulé ».",
      },
      {
        heading: 'Assignation du technicien',
        content:
          "Le menu déroulant « Technicien assigné » permet de sélectionner un technicien parmi ceux disponibles et actifs. Vous pouvez changer l'assignation à tout moment selon la charge de travail ou les compétences requises. Le technicien recevra une notification lors de son assignation. Seuls les techniciens avec le statut actif apparaissent dans la liste déroulante.",
      },
      {
        heading: 'Gestion des devis',
        content:
          "Dans la section « Devis », cliquez sur « Créer un devis » pour saisir le montant estimé et les détails des travaux proposés. Une fois créé, cliquez sur « Envoyer le devis » pour notifier le client par email. Le client pourra alors approuver ou refuser le devis depuis son portail. Le statut du billet passera automatiquement à « Devis envoyé », puis à « Approuvé » si le client accepte.",
      },
      {
        heading: 'Gestion des bloqueurs',
        content:
          "Les bloqueurs signalent un obstacle empêchant l'avancement du billet. Cliquez sur « Ajouter un bloqueur » pour décrire le problème (pièce manquante, attente de réponse client, information technique requise, etc.). Chaque bloqueur peut être résolu individuellement en cliquant sur « Résoudre ». Les bloqueurs actifs sont mis en évidence en rouge pour attirer l'attention de toute l'équipe.",
      },
      {
        heading: 'Planification de rendez-vous',
        content:
          "La section « Rendez-vous » offre deux options : planifier directement un rendez-vous en choisissant la date, l'heure et le technicien, ou envoyer des propositions de dates au client. Pour les propositions, ajoutez plusieurs créneaux horaires et cliquez sur « Envoyer les propositions ». Le client recevra une notification et pourra choisir le créneau qui lui convient le mieux.",
      },
      {
        heading: 'Système de propositions de dates',
        content:
          "Lorsque vous envoyez des propositions de dates, le client peut accepter l'un des créneaux proposés, refuser toutes les propositions, ou contre-proposer de nouvelles dates. Si le client contre-propose, vous verrez ses suggestions dans la section « Propositions » et pourrez les confirmer ou proposer d'autres créneaux. Ce cycle de négociation continue jusqu'à ce qu'un créneau soit mutuellement accepté.",
      },
      {
        heading: 'Fil de messages et notes internes',
        content:
          "Le fil de messages en bas de la page affiche toutes les communications liées au billet, triées chronologiquement. Tapez votre message dans la zone de texte et cliquez sur « Envoyer ». Le toggle « Note interne » permet de rédiger des notes visibles uniquement par les administrateurs et techniciens — elles n'apparaîtront pas dans le portail client. Les notes internes sont affichées avec un fond jaune pâle distinct.",
      },
      {
        heading: "Panneau d'informations client et billet",
        content:
          "Le panneau latéral affiche les informations du billet (priorité, catégorie, mode d'intervention, dates de création et de dernière modification) ainsi que les coordonnées du client (nom complet, adresse email, numéro de téléphone, entreprise). Ces informations sont accessibles rapidement sans quitter la page, facilitant la communication directe avec le client.",
      },
    ],
    tips: [
      "Utilisez les notes internes pour communiquer avec les techniciens sans que le client ne voie les échanges.",
      "Envoyez au moins 3 propositions de dates pour maximiser les chances que le client en accepte une.",
      "Résolvez les bloqueurs dès que possible — ils sont visibles par toute l'équipe et bloquent l'avancement.",
      "Consultez le panneau d'informations client pour contacter directement le client par téléphone si nécessaire.",
    ],
  },

  'ADMIN:admin-kanban': {
    title: 'Vue Kanban des billets',
    description:
      "La vue Kanban affiche vos billets sous forme de colonnes organisées par statut. Chaque colonne représente une étape du cycle de vie du billet, offrant une vision claire et immédiate de l'avancement de tous les billets en un coup d'œil.",
    sections: [
      {
        heading: 'Organisation des colonnes',
        content:
          "Les colonnes sont disposées de gauche à droite dans l'ordre logique du cycle de vie : Nouveau, Devis envoyé, Approuvé, Planifié, En cours, Terminé. Les colonnes de statuts spéciaux (Refusé, Annulé) sont affichées séparément. Chaque colonne affiche le nombre de billets qu'elle contient dans un badge numérique sur l'en-tête.",
      },
      {
        heading: 'Cartes de billets',
        content:
          "Chaque carte affiche le numéro du billet, le titre, le client, la priorité et le technicien assigné. Les badges de priorité utilisent des couleurs distinctes : rouge pour urgente, orange pour haute, jaune pour moyenne, gris pour basse. Cliquez sur n'importe quelle carte pour ouvrir directement la fiche détaillée du billet correspondant.",
      },
      {
        heading: "Identifier les goulots d'étranglement",
        content:
          "La vue Kanban est un outil visuel puissant pour identifier les goulots d'étranglement dans votre processus. Une colonne avec beaucoup de cartes indique un retard à cette étape du cycle de vie. Par exemple, de nombreuses cartes dans « Devis envoyé » signifient que des clients n'ont pas encore répondu. Utilisez cette information pour prioriser vos actions.",
      },
      {
        heading: 'Filtrage des cartes',
        content:
          "Vous pouvez filtrer les cartes affichées par technicien ou par priorité pour concentrer votre attention sur un sous-ensemble de billets. Les filtres sont appliqués à toutes les colonnes simultanément, offrant une vue filtrée cohérente du tableau complet.",
      },
    ],
    tips: [
      "Utilisez la vue Kanban en réunion d'équipe pour faire un point rapide sur l'avancement de chaque billet.",
      "Une colonne surchargée signale un goulot d'étranglement — réaffectez les billets ou ajustez les priorités.",
      "Cliquez sur une carte pour accéder directement au détail du billet et effectuer les actions nécessaires.",
      "Comparez la vue Kanban avec la vue liste pour avoir deux perspectives complémentaires sur votre activité.",
    ],
  },

  'ADMIN:admin-calendar': {
    title: 'Calendrier des rendez-vous',
    description:
      "Le calendrier mensuel affiche tous les rendez-vous planifiés pour l'ensemble des techniciens. Naviguez entre les mois, identifiez les journées chargées et consultez les détails de chaque rendez-vous directement depuis la vue calendrier.",
    sections: [
      {
        heading: 'Navigation mensuelle',
        content:
          "Utilisez les flèches « ← » et « → » en haut du calendrier pour naviguer entre les mois. Le bouton « Aujourd'hui » ramène instantanément à la vue du mois courant avec la date du jour mise en évidence. Le mois et l'année affichés sont mis à jour automatiquement dans l'en-tête du calendrier.",
      },
      {
        heading: 'Affichage des rendez-vous',
        content:
          "Chaque rendez-vous apparaît sur la date correspondante avec un code couleur selon son statut : bleu pour planifié, vert pour confirmé, jaune pour en attente de confirmation, gris pour terminé, rouge pour annulé. Le nom du client et l'heure sont affichés directement sur la cellule du jour pour une lecture rapide.",
      },
      {
        heading: 'Consulter les détails',
        content:
          "Cliquez sur un rendez-vous dans le calendrier pour afficher ses détails complets : client, technicien assigné, heure de début, durée estimée, adresse d'intervention et notes éventuelles. Depuis cette vue détaillée, vous pouvez accéder directement au billet associé ou modifier les informations du rendez-vous.",
      },
      {
        heading: 'Planification et disponibilité',
        content:
          "Le calendrier vous aide à identifier les créneaux disponibles pour planifier de nouveaux rendez-vous. Les jours avec beaucoup de rendez-vous sont visuellement plus chargés, ce qui permet d'éviter la surcharge. Vérifiez systématiquement la disponibilité avant de proposer des créneaux à un client pour éviter les conflits.",
      },
    ],
    tips: [
      "Consultez le calendrier avant de proposer des dates de rendez-vous à un client pour vérifier les disponibilités.",
      "Les couleurs des rendez-vous permettent d'identifier rapidement leur statut sans cliquer dessus.",
      "Utilisez la vue mensuelle pour anticiper la charge de travail de la semaine à venir.",
      "Cliquez sur n'importe quelle date pour voir le détail de tous les rendez-vous programmés ce jour-là.",
    ],
  },

  'ADMIN:admin-clients': {
    title: 'Gestion des clients',
    description:
      "Cette page vous permet de gérer tous les clients de votre atelier. Consultez la liste complète, recherchez un client par nom ou email, créez de nouveaux profils et modifiez les informations existantes. Chaque fiche client est liée à ses billets de service.",
    sections: [
      {
        heading: 'Liste des clients',
        content:
          "Le tableau affiche les colonnes : nom, email, téléphone, entreprise et nombre de billets associés. Cliquez sur l'en-tête d'une colonne pour trier les résultats par ordre croissant ou décroissant. La barre de recherche permet de trouver un client par nom, adresse email ou nom d'entreprise. Cliquez sur une ligne pour ouvrir les détails complets du client.",
      },
      {
        heading: 'Créer un nouveau client',
        content:
          "Cliquez sur le bouton « + Nouveau client » pour ouvrir le formulaire de création dans une boîte de dialogue. Renseignez le nom complet, l'adresse email (doit être unique), le numéro de téléphone, l'entreprise (champ optionnel) et l'adresse postale. Validez avec « Créer » pour enregistrer le nouveau profil client.",
      },
      {
        heading: "Modifier les informations d'un client",
        content:
          "Depuis la fiche d'un client, vous pouvez modifier toutes ses informations : nom, email, téléphone, entreprise et adresse. Les modifications sont enregistrées après validation du formulaire. Vérifiez que l'email est correct car il est utilisé pour les notifications automatiques et les communications liées aux billets.",
      },
      {
        heading: 'Types de clients',
        content:
          "Les clients sont catégorisés en type résidentiel (particulier) ou commercial (entreprise). Le type de client peut influencer certains paramètres de service et de facturation. Les clients commerciaux ont généralement un volume plus élevé de demandes et peuvent bénéficier d'accords de niveau de service spécifiques.",
      },
    ],
    tips: [
      "Recherchez par nom ou email avant de créer un nouveau client pour éviter les doublons.",
      "Le nombre de billets affiché indique l'historique de service — utile pour évaluer la fidélité du client.",
      "Vérifiez et mettez à jour l'adresse email des clients régulièrement, c'est le canal principal de communication.",
      "Les clients avec 0 billet peuvent être des profils récemment créés qui n'ont pas encore soumis de demande.",
    ],
  },

  'ADMIN:admin-technicians': {
    title: 'Gestion des techniciens',
    description:
      "Cette page permet de gérer l'équipe de techniciens : créer de nouveaux comptes, configurer les permissions individuelles, définir les spécialités et activer ou désactiver des comptes. Chaque technicien dispose de permissions granulaires qui contrôlent précisément ses capacités dans l'application.",
    sections: [
      {
        heading: 'Liste des techniciens',
        content:
          "Le tableau affiche les techniciens avec leur nom, email, spécialités et statut (actif ou inactif). Les techniciens inactifs ne peuvent pas se connecter à l'application et n'apparaissent pas dans les listes d'assignation de billets ou de rendez-vous. Cliquez sur un technicien pour modifier ses informations et gérer ses permissions.",
      },
      {
        heading: 'Créer un nouveau technicien',
        content:
          "Cliquez sur « + Nouveau technicien » pour ouvrir le formulaire de création. Renseignez le nom complet, l'adresse email et les spécialités du technicien (réparation matérielle, diagnostic logiciel, configuration réseau, etc.). Le technicien recevra un email avec ses identifiants de connexion au portail technicien. Configurez ensuite ses permissions selon son niveau de responsabilité.",
      },
      {
        heading: 'Configuration des permissions',
        content:
          "Chaque technicien possède cinq permissions individuelles configurables avec des interrupteurs : « Peut accepter les billets » autorise l'auto-assignation de billets, « Peut fermer les billets » permet de marquer un billet comme terminé, « Peut envoyer des devis » autorise la création et l'envoi de devis aux clients, « Peut annuler les rendez-vous » permet l'annulation de rendez-vous, et « Peut voir tous les billets » donne accès à l'ensemble des billets (pas seulement ceux assignés au technicien).",
      },
      {
        heading: 'Activation et désactivation de comptes',
        content:
          "Utilisez l'interrupteur « Actif » pour activer ou désactiver un compte technicien. Un technicien désactivé ne peut plus se connecter à l'application mais tout son historique d'interventions et de notes est conservé. Les billets et bons de travail assignés à un technicien désactivé doivent être réassignés manuellement à un autre technicien actif.",
      },
    ],
    tips: [
      "Configurez les permissions progressivement — un technicien junior peut commencer avec des permissions limitées.",
      "Désactivez un compte plutôt que de le supprimer pour conserver l'historique complet des interventions.",
      "Vérifiez régulièrement que les permissions correspondent aux responsabilités réelles de chaque technicien.",
      "Les spécialités sont informatives — elles aident à choisir le bon technicien pour chaque type de billet.",
    ],
  },

  'ADMIN:admin-settings': {
    title: "Paramètres de l'application",
    description:
      "La page des paramètres vous permet de configurer les options générales de l'application Valitek. Vous pouvez y modifier la langue de l'interface, gérer les paramètres de notification et personnaliser d'autres aspects du fonctionnement de l'application.",
    sections: [
      {
        heading: "Langue de l'interface",
        content:
          "Le sélecteur de langue permet de basculer entre le français (FR) et l'anglais (EN). La modification s'applique immédiatement à toute l'interface utilisateur. La langue choisie est enregistrée dans votre profil et sera conservée à votre prochaine connexion. Le français est la langue par défaut de l'application.",
      },
      {
        heading: 'Paramètres généraux',
        content:
          "Les paramètres généraux incluent les options de personnalisation globales de l'application. Modifiez les valeurs selon les besoins de votre atelier et cliquez sur « Enregistrer » pour appliquer les changements. Certains paramètres peuvent nécessiter un rechargement de la page pour prendre pleinement effet.",
      },
      {
        heading: 'Configuration des notifications',
        content:
          "Configurez quels événements déclenchent des notifications par email : création de nouveaux billets, changements de statut, messages des clients, confirmations de rendez-vous et mises à jour de bons de travail. Vous pouvez activer ou désactiver chaque type de notification individuellement pour contrôler le volume d'alertes reçues.",
      },
    ],
    tips: [
      "Le français est la langue recommandée pour une utilisation au Québec et en France.",
      "Les modifications de paramètres sont enregistrées automatiquement après confirmation.",
      "Vérifiez les paramètres de notification pour ne manquer aucun événement important.",
    ],
  },

  'ADMIN:admin-backups': {
    title: 'Gestion des sauvegardes',
    description:
      "La page de sauvegardes vous permet de gérer les sauvegardes de la base de données de l'application. Créez des sauvegardes manuelles, consultez l'historique des sauvegardes existantes, téléchargez-les ou restaurez une sauvegarde antérieure en cas de besoin.",
    sections: [
      {
        heading: 'Créer une sauvegarde',
        content:
          "Cliquez sur le bouton « Créer une sauvegarde » pour lancer une sauvegarde manuelle complète de la base de données. La sauvegarde inclut toutes les données : billets, clients, techniciens, rendez-vous, bons de travail, messages et paramètres. Le processus peut prendre quelques secondes selon le volume de données. Un indicateur de progression s'affiche pendant l'opération.",
      },
      {
        heading: 'Liste des sauvegardes existantes',
        content:
          "Le tableau affiche toutes les sauvegardes disponibles avec la date de création, la taille du fichier et le statut de chaque sauvegarde. Les sauvegardes les plus récentes apparaissent en premier. Chaque ligne propose deux actions : télécharger la sauvegarde sur votre ordinateur ou la restaurer pour revenir à cet état antérieur.",
      },
      {
        heading: 'Restaurer une sauvegarde',
        content:
          "Pour restaurer une sauvegarde, cliquez sur le bouton « Restaurer » sur la ligne correspondante. ATTENTION : la restauration remplacera intégralement toutes les données actuelles par celles contenues dans la sauvegarde sélectionnée. Une confirmation explicite est demandée avant la restauration. Cette action est irréversible — créez impérativement une sauvegarde de l'état actuel avant de restaurer une ancienne version.",
      },
      {
        heading: 'Télécharger une sauvegarde',
        content:
          "Cliquez sur « Télécharger » pour enregistrer une copie du fichier de sauvegarde sur votre ordinateur local. Conservez les sauvegardes téléchargées dans un emplacement sûr (disque externe, stockage cloud) pour une protection supplémentaire contre la perte de données en cas de défaillance du serveur.",
      },
    ],
    tips: [
      "Effectuez une sauvegarde avant toute opération majeure : mise à jour de l'application, migration de données, etc.",
      "Conservez au moins une copie de sauvegarde en dehors du serveur pour la sécurité des données.",
      "Créez systématiquement une sauvegarde de l'état actuel avant de restaurer une ancienne sauvegarde.",
      "Planifiez des sauvegardes régulières (quotidiennes ou hebdomadaires) pour minimiser le risque de perte de données.",
    ],
  },

  // ============================================================
  //  ADMIN — WORK ORDERS
  // ============================================================

  'ADMIN:admin-workorders': {
    title: 'Tableau de bord des bons de travail',
    description:
      "Le tableau de bord des bons de travail affiche tous les bons de travail en cours sous forme de Kanban ou de liste. En tant qu'administrateur, vous avez une vue complète sur tous les bons de travail de l'atelier, tous techniciens confondus. Gérez la file de réparation, identifiez les retards et créez de nouvelles réceptions.",
    sections: [
      {
        heading: 'Vue Kanban',
        content:
          "La vue Kanban organise les bons de travail en colonnes par statut : Réception, Diagnostic, Attente approbation, Approuvé, Attente pièces, En réparation, Vérification, Prêt et Remis. Les colonnes Refusé, Abandonné et Annulé sont affichées séparément. Chaque carte montre le numéro du BDT, le type d'appareil, le nom du client et le badge d'ancienneté coloré.",
      },
      {
        heading: 'Vue liste',
        content:
          "Basculez en vue liste avec le toggle en haut à droite pour un affichage tabulaire détaillé. La liste affiche le numéro, le client, l'appareil (type, marque, modèle), le statut, le technicien assigné, la priorité et la date de réception. Utilisez cette vue pour les recherches détaillées, le tri par colonnes et l'export de données.",
      },
      {
        heading: "Badges d'ancienneté",
        content:
          "Chaque bon de travail affiche un badge coloré indiquant son ancienneté depuis la réception : vert pour moins de 3 jours, jaune pour 3 à 7 jours, orange pour 7 à 14 jours et rouge pour plus de 14 jours. Ces badges permettent d'identifier rapidement les bons de travail qui nécessitent une attention prioritaire et de réduire les délais de réparation.",
      },
      {
        heading: 'Recherche et filtres',
        content:
          "La barre de recherche permet de trouver un bon de travail par numéro (ex : BDT-260317), nom de client ou description d'appareil. Le filtre de statut permet de masquer ou afficher certains statuts pour concentrer la vue sur les étapes qui vous intéressent. Combinez la recherche textuelle et les filtres de statut pour cibler précisément les bons de travail souhaités.",
      },
      {
        heading: 'Créer une nouvelle réception',
        content:
          "Cliquez sur le bouton « + Nouvelle réception » en haut de la page pour ouvrir le formulaire de prise en charge d'un nouvel appareil. Ce bouton lance le processus complet d'intake (formulaire en 6 sections) qui créera un nouveau bon de travail au statut initial « Réception ».",
      },
    ],
    tips: [
      "Les badges rouges (> 14 jours) signalent des bons de travail en retard — traitez-les en priorité absolue.",
      "Utilisez la vue Kanban pour les réunions d'équipe et la vue liste pour les recherches et analyses précises.",
      "En tant qu'administrateur, vous voyez les BDT de tous les techniciens — idéal pour la répartition de la charge de travail.",
      "Filtrez par statut « Attente pièces » pour suivre les commandes en cours et anticiper les délais.",
    ],
  },

  'ADMIN:admin-workorder-intake': {
    title: "Nouvelle réception — Formulaire d'intake",
    description:
      "Le formulaire d'intake permet de documenter exhaustivement la prise en charge d'un nouvel appareil en atelier. Ce formulaire en six sections guide la réception complète : identification du client, informations sur l'appareil, évaluation de l'état physique, inventaire des accessoires, consentements relatifs aux données et estimations financières.",
    sections: [
      {
        heading: 'Section 1 — Recherche du client',
        content:
          "Commencez par rechercher le client existant via le champ d'auto-complétion. Tapez le nom, l'adresse email ou le numéro de téléphone pour trouver un client dans la base de données. Les résultats s'affichent en temps réel pendant la saisie. Si le client n'existe pas encore, cliquez sur « Créer un nouveau client » pour remplir un formulaire de création rapide sans quitter la page d'intake.",
      },
      {
        heading: "Section 2 — Informations sur l'appareil",
        content:
          "Renseignez le type d'appareil en sélectionnant dans la liste déroulante : ordinateur portable, ordinateur de bureau, tablette, téléphone, imprimante, serveur, équipement réseau ou autre. Saisissez ensuite la marque, le modèle exact, le numéro de série et décrivez l'état général de l'appareil à la réception. Soyez précis sur le modèle pour faciliter la recherche ultérieure de pièces de rechange.",
      },
      {
        heading: "Section 3 — Évaluation de l'état physique",
        content:
          "Évaluez l'état de chaque composant de l'appareil : écran (rayures, fissures, pixels morts), clavier (touches manquantes, usure), batterie (gonflement, autonomie), ports (USB, HDMI, charge), boîtier (bosses, rayures), etc. Utilisez les interrupteurs pour indiquer si chaque composant est fonctionnel, endommagé ou absent. Cette évaluation protège juridiquement l'atelier en documentant l'état initial de l'appareil.",
      },
      {
        heading: 'Section 4 — Inventaire des accessoires',
        content:
          "Cochez les accessoires remis avec l'appareil : chargeur/adaptateur secteur, câble de données, souris, clavier externe, sacoche/étui, etc. Documentez précisément chaque accessoire reçu pour éviter les litiges lors de la remise de l'appareil au client. Ajoutez des notes pour les accessoires non standards ou les objets personnels confiés avec l'appareil.",
      },
      {
        heading: 'Section 5 — Consentement et sauvegarde des données',
        content:
          "Indiquez le choix du client concernant la gestion de ses données personnelles : « Le client fait sa propre sauvegarde » (client_fait), « L'atelier effectue la sauvegarde » (atelier_fait), « Le client décline la sauvegarde » (decline) ou « Non applicable » (non_applicable). Obtenez le consentement explicite et documenté du client pour toute manipulation de ses données personnelles avant de commencer les travaux.",
      },
      {
        heading: 'Section 6 — Estimation financière',
        content:
          "Saisissez l'estimation préliminaire du coût de réparation et le montant du dépôt demandé au client, le cas échéant. Ces montants sont indicatifs et pourront être ajustés après le diagnostic complet. Le dépôt est optionnel mais recommandé pour les réparations potentiellement coûteuses. Le montant final sera confirmé par le devis envoyé après le diagnostic.",
      },
      {
        heading: 'Description du problème',
        content:
          "Décrivez le problème rapporté par le client de manière détaillée et structurée. Incluez les symptômes observés, les circonstances d'apparition (depuis quand, après quel événement), la fréquence du problème et toute information contextuelle pertinente. Plus la description est précise, plus le diagnostic sera efficace et rapide.",
      },
    ],
    tips: [
      "Photographiez l'appareil à la réception pour documenter visuellement les dommages préexistants.",
      "Notez toujours le numéro de série — il est essentiel pour les vérifications de garantie et le suivi des pièces.",
      "Faites signer le formulaire de consentement de sauvegarde des données au client avant de commencer les travaux.",
      "L'évaluation détaillée de l'état physique à la réception vous protège en cas de litige avec le client.",
    ],
  },

  'ADMIN:admin-workorder-detail': {
    title: 'Détail du bon de travail',
    description:
      "La page de détail du bon de travail affiche toutes les informations relatives à la réparation d'un appareil. En tant qu'administrateur, vous avez accès complet à la gestion du cycle de vie : transitions de statut, création et envoi de devis, notes de diagnostic, notes de réparation, gestion des pièces, notes internes et communication avec le client.",
    sections: [
      {
        heading: 'Statut et transitions',
        content:
          "Le statut actuel est affiché en haut avec un badge coloré. Les boutons de transition proposent les prochains statuts possibles selon l'état actuel du BDT. Le cycle complet est : Réception → Diagnostic → Attente approbation → Approuvé → Attente pièces → En réparation → Vérification → Prêt → Remis. Des transitions directes vers Refusé, Abandonné ou Annulé sont possibles à certaines étapes selon les règles métier.",
      },
      {
        heading: "Informations sur l'appareil",
        content:
          "La section « Appareil » affiche le type d'appareil, la marque, le modèle, le numéro de série et l'état documenté à la réception. Ces informations ont été saisies lors de l'intake et sont en lecture seule sur cette page. Consultez-les pour identifier précisément l'appareil et vérifier les informations de garantie.",
      },
      {
        heading: 'Gestion du devis',
        content:
          "Créez un devis en saisissant le montant total et le détail des réparations proposées (main-d'œuvre, pièces, services). Cliquez sur « Envoyer le devis » pour notifier le client par email. Le statut du BDT passera automatiquement à « Attente approbation ». Si le client approuve, le statut avance à « Approuvé ». S'il refuse, le BDT passe à « Refusé » et l'appareil sera restitué en l'état.",
      },
      {
        heading: 'Notes de diagnostic',
        content:
          "Documentez les résultats du diagnostic dans la section dédiée. Indiquez les tests effectués, les problèmes identifiés, les composants défectueux et les solutions de réparation proposées. Ces notes de diagnostic sont essentielles pour la traçabilité du processus et pour justifier le montant du devis auprès du client.",
      },
      {
        heading: 'Gestion des pièces de rechange',
        content:
          "Ajoutez les pièces nécessaires à la réparation avec le bouton « Ajouter une pièce ». Pour chaque pièce, renseignez le nom, la référence fabricant et le coût unitaire. Les coûts des pièces sont additionnés automatiquement au coût total de la réparation. Supprimez une pièce ajoutée par erreur avec le bouton de suppression sur sa ligne.",
      },
      {
        heading: 'Notes de réparation',
        content:
          "Documentez les travaux effectués dans les notes de réparation : composants remplacés, logiciels installés ou réinstallés, configurations modifiées, mises à jour appliquées, tests de vérification réalisés et résultats obtenus. Ces notes constituent le rapport d'intervention final qui sera partagé avec le client.",
      },
      {
        heading: 'Notes internes vs notes visibles',
        content:
          "Le toggle « Note interne » permet de rédiger des notes visibles uniquement par l'équipe (administrateurs et techniciens). Les notes créées sans ce flag seront visibles par le client dans son portail. Utilisez les notes internes pour les observations techniques détaillées, les échanges entre collègues ou les commentaires sensibles non destinés au client.",
      },
      {
        heading: 'Historique et chronologie',
        content:
          "La chronologie en bas de page affiche l'historique complet et horodaté du bon de travail : chaque changement de statut, chaque note ajoutée, chaque devis envoyé et chaque réponse du client. Cette chronologie offre une traçabilité complète du processus de réparation, de la réception à la remise.",
      },
    ],
    tips: [
      "Documentez chaque étape de la réparation pour constituer un historique complet et exploitable.",
      "Utilisez les notes internes pour les observations techniques non destinées au client.",
      "Vérifiez le coût total (pièces + main-d'œuvre) avant d'envoyer le devis au client.",
      "Ne passez au statut « Prêt » qu'après avoir vérifié le bon fonctionnement complet de l'appareil réparé.",
    ],
  },

  'ADMIN:admin-knowledge-base': {
    title: 'Base de connaissances',
    description:
      "La base de connaissances centralise tous les articles de référence de votre atelier : guides de dépannage, procédures internes, fiches techniques et solutions aux problèmes fréquents. Recherchez, créez et organisez vos articles par catégories et étiquettes pour constituer une documentation exploitable par toute l'équipe.",
    sections: [
      {
        heading: 'Parcourir et rechercher les articles',
        content:
          "Utilisez la barre de recherche pour trouver un article par mot-clé, titre ou contenu. Les résultats s'affichent en temps réel pendant la saisie. Vous pouvez également parcourir les articles en les filtrant par catégorie ou par étiquette pour explorer un domaine technique précis. La liste affiche le titre, la catégorie, la date de dernière modification et le statut de visibilité de chaque article.",
      },
      {
        heading: 'Créer un article',
        content:
          "Cliquez sur « + Nouvel article » pour ouvrir l'éditeur de création. Renseignez le titre, choisissez une catégorie, rédigez le contenu en Markdown et ajoutez des étiquettes pertinentes. Un bon article est structuré avec des titres clairs, des étapes numérotées et des exemples concrets. Enregistrez en brouillon pour y revenir plus tard ou publiez directement.",
      },
      {
        heading: 'Catégories et étiquettes',
        content:
          "Les catégories organisent vos articles par thème principal (matériel, logiciel, réseau, procédures internes, etc.) tandis que les étiquettes permettent un classement transversal plus fin. Attribuez au moins une catégorie et quelques étiquettes pertinentes à chaque article pour faciliter la recherche et la navigation dans la base de connaissances.",
      },
      {
        heading: 'Visibilité des articles',
        content:
          "Chaque article possède un statut de visibilité : « Public » est accessible aux clients depuis leur portail, « Interne » est réservé aux administrateurs et techniciens, et « Brouillon » n'est visible que par son auteur. Utilisez le statut interne pour les procédures confidentielles et le statut public pour les guides destinés aux clients.",
      },
    ],
    tips: [
      "Créez des articles pour les problèmes récurrents afin de capitaliser sur les solutions déjà trouvées.",
      "Utilisez des étiquettes cohérentes (ex : « windows », « imprimante », « réseau ») pour faciliter les recherches futures.",
      "Les articles publics réduisent le nombre de demandes de support en permettant aux clients de résoudre eux-mêmes les problèmes courants.",
    ],
  },

  'ADMIN:admin-kb-article-detail': {
    title: "Détail de l'article — Base de connaissances",
    description:
      "Cette page permet de consulter et de modifier un article de la base de connaissances. Éditez le contenu en Markdown, gérez les liens vers les entités associées (billets, bons de travail, clients), définissez le flux de publication et organisez l'article avec des étiquettes.",
    sections: [
      {
        heading: 'Édition du contenu',
        content:
          "Le contenu de l'article est rédigé en Markdown, ce qui permet de structurer le texte avec des titres, des listes, des blocs de code et des liens. L'aperçu en temps réel affiche le rendu final pendant que vous tapez. Utilisez les titres (## et ###) pour structurer clairement les sections et faciliter la lecture.",
      },
      {
        heading: 'Liens vers les entités',
        content:
          "Associez l'article à des billets, des bons de travail ou des fiches client existants pour créer des références croisées. Ces liens permettent de retrouver rapidement l'article depuis le contexte d'un billet ou d'un BDT, et inversement. Ajoutez ou retirez les liens via le panneau latéral de la page de détail.",
      },
      {
        heading: 'Flux de publication',
        content:
          "Un article passe par trois états : « Brouillon » pendant la rédaction, « Interne » une fois finalisé pour l'équipe technique, et « Public » lorsqu'il est prêt à être consulté par les clients. Vous pouvez revenir à un état antérieur à tout moment si l'article nécessite des corrections ou une mise à jour importante.",
      },
      {
        heading: 'Gestion des étiquettes',
        content:
          "Ajoutez des étiquettes pour classer l'article de manière transversale. Tapez le nom d'une étiquette existante ou créez-en une nouvelle directement depuis le champ de saisie. Supprimez une étiquette en cliquant sur la croix à côté de son nom. Des étiquettes bien choisies améliorent considérablement la trouvabilité de l'article dans les recherches.",
      },
    ],
    tips: [
      "Structurez vos articles avec des titres et des sous-titres clairs pour une lecture rapide et efficace.",
      "Liez l'article aux billets ou BDT concernés pour que l'équipe retrouve facilement la documentation pertinente.",
      "Relisez l'article en mode aperçu avant de le passer en statut public pour vérifier la mise en forme Markdown.",
    ],
  },

  'ADMIN:admin-client-detail': {
    title: 'Fiche client détaillée',
    description:
      "La fiche client regroupe toutes les informations relatives à un client : coordonnées, historique complet des billets de service, bons de travail associés et notes internes. C'est votre référence centrale pour consulter le parcours d'un client et gérer la relation de service.",
    sections: [
      {
        heading: 'Informations du client',
        content:
          "La section principale affiche le nom complet, l'adresse email, le numéro de téléphone, l'entreprise et l'adresse postale du client. Ces informations sont essentielles pour la communication et la planification des interventions sur site. Vérifiez régulièrement que les coordonnées sont à jour.",
      },
      {
        heading: 'Historique des billets',
        content:
          "La section « Billets » liste tous les billets de service créés pour ce client, triés du plus récent au plus ancien. Chaque ligne indique le numéro, le titre, le statut et la date de création. Cliquez sur un billet pour accéder directement à sa fiche détaillée. Cet historique vous donne une vision globale des demandes passées et en cours du client.",
      },
      {
        heading: 'Bons de travail associés',
        content:
          "La section « Bons de travail » affiche les BDT liés aux appareils déposés par ce client. Vous y retrouvez le type d'appareil, le statut de la réparation et la date de réception. Cliquez sur un BDT pour consulter le détail complet de la prise en charge et de la réparation.",
      },
      {
        heading: 'Notes client',
        content:
          "Ajoutez des notes internes sur le client en cliquant sur « Ajouter une note ». Les notes permettent de consigner des informations importantes : préférences du client, historique de communication, particularités techniques de son parc informatique, etc. Épinglez les notes les plus importantes en haut de la liste pour qu'elles soient immédiatement visibles par toute l'équipe.",
      },
      {
        heading: 'Modifier les coordonnées',
        content:
          "Cliquez sur le bouton d'édition pour modifier les coordonnées du client. Mettez à jour le nom, l'email, le téléphone, l'entreprise ou l'adresse selon les nouvelles informations fournies par le client. Les modifications sont enregistrées immédiatement après validation du formulaire.",
      },
    ],
    tips: [
      "Consultez l'historique des billets avant de créer une nouvelle demande pour vérifier si un problème similaire a déjà été traité.",
      "Épinglez les notes critiques (ex : conditions de garantie, accès spéciaux) pour qu'elles soient visibles en priorité.",
      "Maintenez les coordonnées à jour — un email ou un téléphone incorrect retarde les communications et les interventions.",
    ],
  },

  'ADMIN:admin-worksheets': {
    title: 'Gestion des feuilles de travail',
    description:
      "Cette page affiche la liste de toutes les feuilles de travail de l'atelier. Filtrez par statut, recherchez par numéro ou client, identifiez les feuilles à forte valeur et créez de nouvelles feuilles de travail pour documenter les interventions réalisées.",
    sections: [
      {
        heading: 'Filtrage par statut',
        content:
          "Utilisez les filtres de statut pour afficher uniquement les feuilles de travail qui vous intéressent : « Brouillon » pour les feuilles en cours de rédaction, « Soumise » pour celles en attente de révision, « Approuvée » pour les feuilles validées, « Révisée » pour celles retournées avec des corrections demandées, « Facturée » pour les feuilles dont la facture a été émise, et « Annulée » pour les feuilles abandonnées.",
      },
      {
        heading: 'Recherche et tri',
        content:
          "La barre de recherche accepte les numéros de feuille de travail, les noms de client et les noms de technicien. Combinez la recherche avec les filtres de statut pour cibler rapidement une feuille spécifique. Le tableau est triable par colonnes pour organiser la liste selon vos besoins d'analyse.",
      },
      {
        heading: 'Alertes de haute valeur',
        content:
          "Les feuilles de travail dont le montant total dépasse un certain seuil sont signalées par un indicateur visuel distinctif. Ces alertes vous permettent d'identifier rapidement les interventions à forte valeur financière qui méritent une attention particulière lors de la révision et de l'approbation.",
      },
      {
        heading: 'Créer une feuille de travail',
        content:
          "Cliquez sur « + Nouvelle feuille de travail » pour créer une feuille associée à un bon de travail ou un billet existant. La feuille de travail permet de documenter en détail les heures de main-d'œuvre, les pièces utilisées, les frais de déplacement et les notes d'intervention pour constituer un dossier de facturation complet.",
      },
    ],
    tips: [
      "Filtrez par statut « Soumise » quotidiennement pour traiter les feuilles en attente de votre approbation.",
      "Les feuilles au statut « Révisée » nécessitent des corrections du technicien — suivez-les pour éviter les retards de facturation.",
      "Utilisez les alertes de haute valeur pour prioriser la vérification des feuilles les plus significatives financièrement.",
    ],
  },

  'ADMIN:admin-worksheet-detail': {
    title: 'Détail de la feuille de travail',
    description:
      "La page de détail d'une feuille de travail offre une vue complète de l'intervention : entrées de main-d'œuvre, pièces utilisées, frais de déplacement, notes internes et externes, suivis, totaux financiers et signatures. En tant qu'administrateur, vous pouvez réviser, approuver, facturer ou annuler la feuille.",
    sections: [
      {
        heading: "Entrées de main-d'œuvre, pièces et déplacement",
        content:
          "Les trois sections principales détaillent respectivement les heures de travail (technicien, durée, taux horaire), les pièces utilisées (nom, quantité, coût unitaire) et les frais de déplacement (distance, tarif kilométrique). Chaque ligne affiche le sous-total calculé automatiquement. Consultez ces sections pour vérifier la cohérence et l'exactitude des données saisies par le technicien.",
      },
      {
        heading: 'Modification en ligne des entrées',
        content:
          "Cliquez sur une entrée pour la modifier directement dans le tableau. Vous pouvez ajuster les durées, les quantités, les tarifs et les descriptions avant d'approuver la feuille. Les modifications sont enregistrées immédiatement. Cette fonctionnalité permet de corriger les erreurs sans retourner la feuille au technicien pour des ajustements mineurs.",
      },
      {
        heading: 'Notes et suivis',
        content:
          "Les notes internes sont visibles uniquement par l'équipe, tandis que les notes externes seront incluses dans le document final remis au client. Utilisez les suivis pour planifier des actions liées à cette intervention (rappel client, commande de pièces supplémentaires, visite de contrôle). Chaque suivi peut être marqué comme complété.",
      },
      {
        heading: 'Transitions de statut',
        content:
          "Les boutons de transition vous permettent de faire avancer la feuille dans son cycle de vie. Depuis « Soumise », vous pouvez « Approuver » si tout est conforme, « Réviser » pour demander des corrections au technicien, ou « Annuler » la feuille. Une feuille approuvée peut ensuite être passée au statut « Facturée » une fois la facture émise au client.",
      },
      {
        heading: 'Génération PDF et totaux financiers',
        content:
          "Le bouton « Générer PDF » crée un document professionnel récapitulant l'ensemble de l'intervention : détail des travaux, pièces, déplacements et totaux. La section des totaux affiche le sous-total de chaque catégorie (main-d'œuvre, pièces, déplacement), les taxes applicables et le montant total TTC. Vérifiez ces montants avant de générer le PDF final.",
      },
      {
        heading: 'Signatures',
        content:
          "La section signatures permet de visualiser les signatures du technicien et du client apposées sur la feuille de travail. Les signatures attestent de l'accord des deux parties sur les travaux effectués et les montants facturés. Vérifiez la présence des signatures requises avant de passer la feuille au statut « Facturée ».",
      },
    ],
    tips: [
      "Vérifiez les totaux financiers et les taux horaires avant d'approuver une feuille de travail.",
      "Utilisez la modification en ligne pour corriger les petites erreurs sans retourner la feuille au technicien.",
      "Générez le PDF uniquement lorsque la feuille est approuvée et que toutes les informations sont définitives.",
    ],
  },

  // ============================================================
  //  TECHNICIAN PAGES
  // ============================================================

  'TECHNICIAN:tech-dashboard': {
    title: 'Tableau de bord technicien',
    description:
      "Votre tableau de bord affiche un résumé personnalisé de votre charge de travail : billets qui vous sont assignés, rendez-vous à venir et bons de travail en cours dans l'atelier. Consultez-le chaque matin pour planifier efficacement votre journée de travail.",
    sections: [
      {
        heading: 'Billets assignés',
        content:
          "La carte « Billets assignés » indique le nombre total de billets actifs qui vous sont personnellement attribués. Cliquez dessus pour accéder directement à votre liste de billets filtrée. Les billets sont classés par priorité décroissante et par date d'échéance pour vous aider à déterminer l'ordre de traitement.",
      },
      {
        heading: 'Prochains rendez-vous',
        content:
          "La section « Rendez-vous à venir » liste vos prochains rendez-vous avec les clients : date, heure précise, lieu d'intervention et nom du client. Préparez chaque intervention en consultant au préalable le détail du billet associé, notamment la description du problème et l'historique des échanges avec le client.",
      },
      {
        heading: 'Bons de travail en cours',
        content:
          "La section « Bons de travail » affiche les bons de travail que vous traitez actuellement en atelier. Les badges d'ancienneté colorés (vert, jaune, orange, rouge) indiquent depuis combien de temps chaque BDT est ouvert. Priorisez systématiquement les badges orange et rouges qui signalent des retards à corriger.",
      },
      {
        heading: 'Résumé de la journée',
        content:
          "Le tableau de bord résume votre journée complète : nombre de billets à traiter, rendez-vous planifiés et BDT urgents nécessitant une attention immédiate. Utilisez ces informations chaque matin pour organiser vos priorités, planifier vos déplacements et gérer votre emploi du temps efficacement.",
      },
    ],
    tips: [
      "Consultez votre tableau de bord dès le début de chaque journée de travail pour planifier vos interventions.",
      "Traitez en priorité les billets de priorité « Haute » et « Urgente » avant les priorités moyennes et basses.",
      "Les badges de couleur sur les BDT vous aident à identifier visuellement les réparations en retard.",
      "Cliquez sur n'importe quel élément du tableau de bord pour accéder directement à sa fiche détaillée.",
    ],
  },

  'TECHNICIAN:tech-tickets': {
    title: 'Mes billets assignés',
    description:
      "Cette page affiche les billets de service qui vous sont personnellement assignés. Vous pouvez filtrer par statut, priorité et catégorie de service pour organiser efficacement votre travail quotidien. Les billets sont listés avec toutes les informations essentielles pour une prise en charge rapide.",
    sections: [
      {
        heading: 'Liste de vos billets',
        content:
          "Le tableau affiche uniquement les billets qui vous sont assignés par l'administrateur. Les colonnes incluent le numéro du billet, le titre, le nom du client, le statut actuel, la priorité, la catégorie de service et le mode d'intervention (sur site, en atelier, à distance). Cliquez sur une ligne pour ouvrir la fiche détaillée du billet.",
      },
      {
        heading: 'Filtres et recherche',
        content:
          "Utilisez les filtres déroulants pour restreindre la liste : par statut (En cours, Planifié, Nouveau, etc.), par priorité (Urgente, Haute, Moyenne, Basse) ou par catégorie de service. La barre de recherche accepte les numéros de billet et les noms de client. Combinez les filtres pour localiser rapidement un billet spécifique dans votre liste.",
      },
      {
        heading: 'Indicateurs de priorité',
        content:
          "Les priorités sont affichées par badges de couleur pour un repérage visuel instantané : rouge pour urgente, orange pour haute, jaune pour moyenne et gris pour basse. Traitez toujours les billets par ordre de priorité décroissante, en commençant systématiquement par les urgences et les priorités hautes.",
      },
    ],
    tips: [
      "Filtrez par statut « En cours » pour voir uniquement les billets sur lesquels vous travaillez activement.",
      "Les billets de priorité « Urgente » doivent être traités en premier, avant toute autre tâche.",
      "Si vous ne pouvez pas avancer sur un billet, ajoutez un bloqueur pour informer l'administrateur et l'équipe.",
      "Vérifiez régulièrement vos billets au statut « Planifié » pour préparer les prochaines interventions à l'avance.",
    ],
  },

  'TECHNICIAN:tech-ticket-detail': {
    title: 'Détail du billet',
    description:
      "La page de détail vous permet de gérer un billet de service qui vous est assigné. Selon les permissions accordées par l'administrateur, vous pouvez changer le statut, communiquer avec le client, ajouter des notes internes, signaler des bloqueurs et, si autorisé, envoyer des devis ou gérer les rendez-vous.",
    sections: [
      {
        heading: 'Statut et transitions',
        content:
          "Le statut actuel du billet est affiché en haut de la page. Les boutons de transition disponibles dépendent directement de vos permissions : si « Peut accepter les billets » est activée, vous pouvez faire avancer le statut du billet. Si « Peut fermer les billets » est activée, vous pouvez marquer un billet comme terminé. Si ces permissions ne vous sont pas accordées, demandez à l'administrateur de changer le statut.",
      },
      {
        heading: 'Gestion des devis',
        content:
          "Si la permission « Peut envoyer des devis » vous est accordée par l'administrateur, vous pouvez créer et envoyer des devis au client directement depuis cette page. Saisissez le montant estimé et les détails des travaux, puis cliquez sur « Envoyer le devis ». Si vous n'avez pas cette permission, la section devis sera affichée en lecture seule et vous devrez demander à l'administrateur de créer le devis.",
      },
      {
        heading: 'Messages et notes internes',
        content:
          "Le fil de messages permet de communiquer avec le client et l'équipe technique. Tous les échanges sont visibles chronologiquement. Le toggle « Note interne » vous permet d'écrire des messages visibles uniquement par l'équipe technique et les administrateurs — le client ne les verra pas. Les messages normaux (sans le toggle) sont visibles par le client dans son portail.",
      },
      {
        heading: 'Signalement de bloqueurs',
        content:
          "Si vous rencontrez un obstacle empêchant l'avancement du billet (pièce manquante, attente d'information du client, accès impossible, etc.), ajoutez un bloqueur en cliquant sur « Ajouter un bloqueur ». Décrivez clairement le problème rencontré. L'administrateur sera automatiquement notifié. Résolvez le bloqueur en cliquant sur « Résoudre » dès que l'obstacle est levé.",
      },
      {
        heading: 'Section rendez-vous',
        content:
          "La section rendez-vous affiche les rendez-vous planifiés pour ce billet avec les détails de date, heure et lieu. Si la permission « Peut annuler les rendez-vous » est activée pour votre compte, vous pouvez annuler un rendez-vous en cas de besoin. Sinon, contactez l'administrateur. Les propositions de dates et la négociation avec le client sont gérées par l'administrateur.",
      },
      {
        heading: 'Informations du billet et du client',
        content:
          "Le panneau d'informations latéral affiche la priorité, la catégorie de service, le mode d'intervention, les dates de création et modification, ainsi que les coordonnées complètes du client (nom, email, téléphone, adresse). Consultez systématiquement ces informations avant de commencer une intervention, notamment l'adresse du client pour les interventions sur site.",
      },
    ],
    tips: [
      "Utilisez les notes internes pour communiquer des détails techniques à l'équipe sans inquiéter le client.",
      "Ajoutez un bloqueur immédiatement dès que vous identifiez un obstacle — ne le gardez pas pour vous.",
      "Contactez l'administrateur si vous avez besoin de permissions supplémentaires pour un billet spécifique.",
      "Consultez l'historique complet des messages avant de contacter le client pour éviter les répétitions.",
    ],
  },

  'TECHNICIAN:tech-schedule': {
    title: 'Mon emploi du temps',
    description:
      "Cette page affiche votre calendrier personnel avec tous vos rendez-vous planifiés. Visualisez votre emploi du temps sur le mois entier, préparez vos interventions à l'avance et consultez les détails de chaque rendez-vous directement depuis le calendrier.",
    sections: [
      {
        heading: 'Vue du calendrier',
        content:
          "Votre calendrier personnel affiche uniquement vos propres rendez-vous, pas ceux des autres techniciens. Naviguez entre les mois avec les flèches « ← » et « → ». Les rendez-vous sont affichés avec un code couleur selon leur statut : bleu pour planifié, vert pour confirmé, jaune pour en attente de confirmation, gris pour terminé, rouge pour annulé.",
      },
      {
        heading: "Détails d'un rendez-vous",
        content:
          "Cliquez sur un rendez-vous pour afficher ses détails complets : nom du client, heure de début, durée estimée de l'intervention, adresse complète et notes éventuelles. Depuis cette vue détaillée, vous pouvez accéder directement au billet associé pour préparer votre intervention en consultant la description du problème et l'historique.",
      },
      {
        heading: 'Planification et optimisation de la journée',
        content:
          "Utilisez la vue du calendrier pour planifier vos déplacements et optimiser votre itinéraire entre les différentes interventions de la journée. Vérifiez les rendez-vous du lendemain en fin de journée pour préparer le matériel nécessaire. Les rendez-vous au statut « Confirmé » sont définitifs et prioritaires sur les rendez-vous « Planifié ».",
      },
    ],
    tips: [
      "Vérifiez votre emploi du temps chaque matin et la veille au soir pour anticiper la journée.",
      "Préparez votre matériel en consultant les détails du billet associé à chaque rendez-vous.",
      "Les rendez-vous « en attente » ne sont pas encore confirmés par le client — ils peuvent être modifiés ou annulés.",
      "Signalez immédiatement à l'administrateur tout conflit d'horaire entre deux rendez-vous.",
    ],
  },

  // ============================================================
  //  TECHNICIAN — WORK ORDERS
  // ============================================================

  'TECHNICIAN:tech-workorders': {
    title: 'Mes bons de travail',
    description:
      "Cette page affiche les bons de travail qui vous sont assignés en atelier. Suivez l'avancement de vos réparations grâce à la vue Kanban ou liste, identifiez les priorités grâce aux badges d'ancienneté colorés et créez de nouvelles réceptions d'appareils.",
    sections: [
      {
        heading: 'Vue Kanban',
        content:
          "La vue Kanban organise vos bons de travail en colonnes par statut : Réception, Diagnostic, Attente approbation, Approuvé, Attente pièces, En réparation, Vérification, Prêt et Remis. Chaque carte affiche le numéro du BDT, le type d'appareil, le nom du client et le badge d'ancienneté coloré. Cliquez sur une carte pour ouvrir le détail complet du bon de travail.",
      },
      {
        heading: 'Vue liste',
        content:
          "Utilisez le toggle en haut à droite pour basculer en vue liste tabulaire. Le tableau affiche le numéro du BDT, le client, l'appareil (type et modèle), le statut actuel, la priorité et la date de réception. Triez par n'importe quelle colonne et utilisez la barre de recherche pour trouver rapidement un BDT spécifique.",
      },
      {
        heading: "Badges d'ancienneté",
        content:
          "Les badges de couleur sur chaque carte indiquent depuis combien de temps un BDT est ouvert : vert pour moins de 3 jours (dans les temps), jaune pour 3 à 7 jours (à surveiller), orange pour 7 à 14 jours (en retard) et rouge pour plus de 14 jours (retard critique). Concentrez vos efforts sur les badges orange et rouges pour réduire les délais de réparation.",
      },
      {
        heading: 'Créer une nouvelle réception',
        content:
          "Cliquez sur « + Nouvelle réception » pour prendre en charge un nouvel appareil en atelier. Le formulaire d'intake en 6 sections vous guidera à travers toutes les étapes de documentation. Le bon de travail sera créé automatiquement au statut « Réception » et assigné à votre compte.",
      },
    ],
    tips: [
      "Priorisez les BDT avec des badges rouges — ce sont des réparations qui accusent un retard important.",
      "Passez au statut suivant dès qu'une étape est terminée pour maintenir le flux de travail à jour dans le Kanban.",
      "Utilisez la recherche pour retrouver rapidement un BDT par son numéro ou le nom du client.",
      "La vue Kanban est idéale pour visualiser d'un coup d'œil votre charge de travail globale en atelier.",
    ],
  },

  'TECHNICIAN:tech-workorder-intake': {
    title: "Nouvelle réception — Formulaire d'intake",
    description:
      "Le formulaire d'intake permet de documenter rigoureusement la prise en charge d'un nouvel appareil confié par un client. Suivez les six sections structurées pour enregistrer toutes les informations nécessaires : client, appareil, état physique, accessoires, consentement pour les données et estimations financières.",
    sections: [
      {
        heading: 'Section 1 — Recherche du client',
        content:
          "Tapez le nom, l'email ou le téléphone du client dans le champ de recherche avec auto-complétion. Le système propose des correspondances en temps réel parmi les clients existants de la base de données. Sélectionnez le client correspondant. Si le client n'est pas encore enregistré, cliquez sur « Créer un nouveau client » pour remplir un formulaire de création rapide.",
      },
      {
        heading: "Section 2 — Informations sur l'appareil",
        content:
          "Sélectionnez le type d'appareil dans la liste déroulante (ordinateur portable, ordinateur de bureau, tablette, téléphone, imprimante, serveur, équipement réseau, autre). Renseignez la marque, le modèle exact tel qu'indiqué sur l'appareil et le numéro de série. Décrivez l'état physique général de l'appareil tel que constaté à la réception.",
      },
      {
        heading: "Section 3 — Évaluation de l'état physique",
        content:
          "Passez en revue chaque composant principal de l'appareil (écran, clavier, batterie, ports, boîtier) et indiquez son état avec les interrupteurs dédiés. Cette évaluation est critique pour la protection de l'atelier — elle documente formellement l'état de l'appareil avant toute intervention, ce qui prévient les litiges si le client conteste l'état après la réparation.",
      },
      {
        heading: 'Section 4 — Accessoires et consentement',
        content:
          "Cochez chaque accessoire remis avec l'appareil (chargeur, câble, souris, etc.) pour créer un inventaire précis. Dans la section consentement de sauvegarde des données, sélectionnez l'option choisie par le client : sauvegarde faite par le client, sauvegarde faite par l'atelier, client décline la sauvegarde, ou non applicable. Faites confirmer verbalement par le client avant de valider.",
      },
      {
        heading: 'Section 5 — Estimation financière et description du problème',
        content:
          "Saisissez une estimation préliminaire du coût de réparation et un éventuel montant de dépôt. Puis décrivez de manière détaillée le problème rapporté par le client : symptômes observés, contexte d'apparition du problème, tentatives de résolution déjà effectuées par le client et toute information pertinente pour le diagnostic.",
      },
    ],
    tips: [
      "Vérifiez toujours le numéro de série — il se trouve souvent sous l'appareil ou dans les paramètres système.",
      "Documentez scrupuleusement les rayures et dommages physiques existants pour vous protéger.",
      "Obtenez le consentement explicite du client avant toute manipulation de ses données personnelles.",
      "Soyez le plus précis possible dans la description du problème — cela accélère considérablement le diagnostic.",
    ],
  },

  'TECHNICIAN:tech-workorder-detail': {
    title: 'Détail du bon de travail',
    description:
      "La page de détail du bon de travail vous permet de suivre et de documenter intégralement la réparation d'un appareil confié à l'atelier. Faites avancer le statut du BDT, ajoutez des notes de diagnostic et de réparation, gérez les pièces utilisées et communiquez avec le client via les notes visibles.",
    sections: [
      {
        heading: 'Statut et transitions',
        content:
          "Le statut actuel du BDT est affiché en haut de la page avec un badge coloré. Les boutons de transition proposent les prochains statuts possibles selon l'état actuel. Par exemple, depuis « Diagnostic », vous pouvez passer à « Attente approbation » si un devis est nécessaire, ou directement à « Approuvé » si le client a déjà donné son accord. Suivez le flux normal : Réception → Diagnostic → Attente approbation → Approuvé → En réparation → Vérification → Prêt.",
      },
      {
        heading: 'Notes de diagnostic',
        content:
          "Documentez vos constatations techniques dans les notes de diagnostic. Décrivez les tests effectués, les composants vérifiés, les problèmes identifiés et les solutions de réparation envisagées. Ces notes servent de base pour la rédaction du devis et de référence pendant la phase de réparation.",
      },
      {
        heading: 'Notes de réparation',
        content:
          "Pendant et après la réparation, documentez chaque travail effectué : pièces remplacées avec leurs références, logiciels installés ou réinstallés, configurations système modifiées, pilotes mis à jour, tests de vérification réalisés et résultats obtenus. Ces notes constituent le rapport d'intervention final communiqué au client.",
      },
      {
        heading: 'Gestion des pièces utilisées',
        content:
          "Ajoutez les pièces utilisées ou nécessaires via le bouton « Ajouter une pièce ». Indiquez le nom de la pièce, la référence fabricant et le coût unitaire pour chaque élément. Si une pièce doit être commandée auprès d'un fournisseur, passez le BDT en statut « Attente pièces » et mettez à jour le statut dès réception de la pièce.",
      },
      {
        heading: 'Notes internes et notes visibles par le client',
        content:
          "Utilisez le toggle « Note interne » pour écrire des commentaires réservés exclusivement à l'équipe technique. Les notes créées sans activer ce toggle seront visibles par le client dans son portail. Utilisez les notes visibles pour informer le client de l'avancement de la réparation et les notes internes pour les détails techniques entre collègues.",
      },
      {
        heading: 'Chronologie du bon de travail',
        content:
          "La chronologie en bas de page retrace intégralement l'historique du bon de travail : chaque changement de statut avec horodatage, notes ajoutées, devis envoyés et réponses du client. Consultez-la pour comprendre le parcours complet du BDT et identifier la durée de chaque étape.",
      },
    ],
    tips: [
      "Documentez chaque étape de la réparation — un historique complet facilite le suivi et la résolution de litiges éventuels.",
      "Passez en statut « Attente pièces » dès qu'une commande est nécessaire pour garder le Kanban à jour.",
      "Utilisez les notes visibles pour tenir le client informé de l'avancement sans avoir besoin de l'appeler.",
      "Effectuez un test complet et approfondi avant de passer en statut « Prêt » pour éviter les retours en atelier.",
    ],
  },

  'TECHNICIAN:tech-worksheets': {
    title: 'Mes feuilles de travail',
    description:
      "Cette page affiche vos feuilles de travail personnelles. Consultez l'état de vos feuilles soumises, créez de nouvelles feuilles à partir de vos bons de travail ou billets assignés, et filtrez par statut pour organiser votre travail de documentation.",
    sections: [
      {
        heading: 'Mes feuilles de travail',
        content:
          "Le tableau liste toutes les feuilles de travail que vous avez créées, triées par date de création décroissante. Chaque ligne affiche le numéro de référence, le bon de travail ou billet associé, le client, le statut actuel et le montant total. Cliquez sur une feuille pour ouvrir sa page de détail et y ajouter des entrées ou la soumettre pour approbation.",
      },
      {
        heading: 'Filtres par statut',
        content:
          "Filtrez vos feuilles par statut pour vous concentrer sur celles qui nécessitent votre attention. Les feuilles au statut « Brouillon » sont en cours de rédaction et doivent être complétées. Les feuilles « Révisée » ont été retournées par l'administrateur avec des corrections demandées — traitez-les en priorité. Les feuilles « Soumise » et « Approuvée » sont en attente de traitement par l'administration.",
      },
      {
        heading: 'Créer une feuille de travail',
        content:
          "Cliquez sur « + Nouvelle feuille de travail » pour créer une feuille associée à un bon de travail ou un billet existant. Sélectionnez le BDT ou le billet concerné dans la liste déroulante. La feuille est créée au statut « Brouillon » et vous pouvez immédiatement y ajouter des entrées de main-d'œuvre, de pièces et de déplacement.",
      },
    ],
    tips: [
      "Créez votre feuille de travail dès le début de l'intervention pour ne pas oublier de détails.",
      "Traitez rapidement les feuilles au statut « Révisée » pour ne pas retarder le processus de facturation.",
      "Soumettez vos feuilles complètes en fin de journée pour un traitement administratif rapide.",
    ],
  },

  'TECHNICIAN:tech-worksheet-detail': {
    title: 'Détail de ma feuille de travail',
    description:
      "Cette page vous permet de documenter en détail votre intervention : saisissez les heures de main-d'œuvre (via le chronomètre ou manuellement), ajoutez les pièces utilisées et les frais de déplacement, rédigez des notes et soumettez la feuille pour approbation une fois complétée.",
    sections: [
      {
        heading: "Entrées de main-d'œuvre",
        content:
          "Ajoutez vos heures de travail de deux façons : utilisez le chronomètre intégré pour enregistrer le temps en direct pendant l'intervention, ou saisissez manuellement la durée après coup. Pour chaque entrée, indiquez la description des travaux effectués et le taux horaire applicable. Le sous-total est calculé automatiquement.",
      },
      {
        heading: 'Ajout de pièces',
        content:
          "Documentez chaque pièce utilisée pendant l'intervention en cliquant sur « Ajouter une pièce ». Renseignez le nom de la pièce, la référence, la quantité et le coût unitaire. Soyez précis dans les descriptions pour faciliter la vérification par l'administrateur et la compréhension du client sur la facture finale.",
      },
      {
        heading: 'Frais de déplacement',
        content:
          "Si l'intervention nécessite un déplacement, ajoutez une entrée de déplacement avec la distance parcourue et le tarif kilométrique applicable. Les frais de déplacement sont intégrés au total de la feuille de travail. Indiquez clairement l'adresse de départ et d'arrivée dans la description.",
      },
      {
        heading: 'Notes et suivis',
        content:
          "Rédigez des notes pour documenter le contexte de l'intervention, les observations techniques ou les recommandations pour le client. Les notes internes sont réservées à l'équipe, les notes externes seront visibles par le client. Ajoutez des suivis si des actions complémentaires sont nécessaires après l'intervention.",
      },
      {
        heading: 'Soumission pour approbation',
        content:
          "Lorsque toutes les entrées sont saisies et les notes rédigées, cliquez sur « Soumettre » pour envoyer la feuille à l'administrateur pour révision et approbation. Vérifiez attentivement toutes les informations avant la soumission. Une fois soumise, vous ne pourrez plus modifier la feuille sauf si elle vous est retournée au statut « Révisée ».",
      },
      {
        heading: 'Consultation du PDF',
        content:
          "Cliquez sur « Voir PDF » pour afficher ou télécharger le document récapitulatif de la feuille de travail. Le PDF reprend l'ensemble des entrées, notes et totaux dans un format professionnel. Vous pouvez consulter le PDF à tout moment, y compris lorsque la feuille est encore au statut brouillon, pour vérifier la présentation finale.",
      },
    ],
    tips: [
      "Utilisez le chronomètre pendant l'intervention pour un suivi précis du temps de travail.",
      "Vérifiez chaque entrée (durée, quantité, tarif) avant de soumettre pour éviter les retours en révision.",
      "Ajoutez des notes détaillées — elles facilitent l'approbation et constituent un historique technique précieux.",
    ],
  },

  // ============================================================
  //  CUSTOMER PAGES
  // ============================================================

  'CUSTOMER:customer-dashboard': {
    title: 'Mon tableau de bord',
    description:
      "Bienvenue dans votre espace client Valitek. Ce tableau de bord vous offre une vue d'ensemble de toutes vos demandes de service : billets en cours de traitement, prochains rendez-vous planifiés et bons de travail pour vos appareils actuellement en réparation dans notre atelier.",
    sections: [
      {
        heading: 'Vos billets en cours',
        content:
          "La section « Mes billets » affiche un résumé de vos demandes de service actives. Chaque billet indique son statut actuel : en attente, devis envoyé, en cours de traitement, terminé, etc. Cliquez sur un billet pour accéder à sa fiche détaillée, consulter les messages de l'équipe technique et communiquer directement avec notre équipe.",
      },
      {
        heading: 'Rendez-vous à venir',
        content:
          "Vos prochains rendez-vous avec notre équipe technique sont affichés avec la date, l'heure et l'adresse de l'intervention. Vérifiez régulièrement cette section pour ne manquer aucun rendez-vous. Si des propositions de créneaux sont en attente de votre réponse, elles seront mises en évidence avec une alerte.",
      },
      {
        heading: 'Bons de travail actifs',
        content:
          "Si vous avez des appareils déposés en réparation dans notre atelier, cette section affiche leur statut actuel en temps réel. Suivez l'avancement de chaque réparation : diagnostic en cours, réparation en cours, vérification finale, appareil prêt à être récupéré. Vous recevrez des notifications automatiques aux étapes importantes.",
      },
      {
        heading: 'Notifications et alertes',
        content:
          "Les notifications vous informent des changements importants concernant vos demandes : nouveau devis à approuver, changement de statut de votre billet, message de l'équipe technique, rendez-vous confirmé ou modifié. Consultez-les régulièrement pour rester informé de l'avancement de toutes vos demandes.",
      },
    ],
    tips: [
      "Visitez votre tableau de bord régulièrement pour suivre l'avancement de vos demandes de service.",
      "Répondez rapidement aux devis et propositions de rendez-vous pour accélérer le traitement de votre demande.",
      "Cliquez sur un billet ou un bon de travail pour obtenir tous les détails et communiquer avec l'équipe.",
      "Appuyez sur « ? » ou « F1 » à tout moment pour afficher l'aide contextuelle de la page.",
    ],
  },

  'CUSTOMER:customer-tickets': {
    title: 'Mes billets de service',
    description:
      "Cette page liste toutes vos demandes de service passées et en cours. Consultez l'historique complet de vos billets, suivez leur avancement en temps réel et créez de nouvelles demandes de service. Chaque billet représente une intervention ou un service demandé à notre équipe technique.",
    sections: [
      {
        heading: 'Liste de vos billets',
        content:
          "Le tableau affiche tous vos billets de service avec le numéro de référence, le titre de la demande, le statut actuel, la priorité attribuée et la date de création. Les billets les plus récents apparaissent en premier dans la liste. Cliquez sur n'importe quel billet pour ouvrir sa fiche détaillée et consulter les messages échangés avec l'équipe.",
      },
      {
        heading: 'Créer une nouvelle demande de service',
        content:
          "Cliquez sur le bouton « + Nouvelle demande » pour créer un billet de service. Décrivez votre problème en détail : quel appareil est concerné, quel symptôme vous observez, depuis combien de temps le problème existe, dans quelles circonstances il se manifeste. Plus votre description est précise et détaillée, plus notre diagnostic sera rapide et efficace. Choisissez la catégorie qui correspond le mieux à votre besoin.",
      },
      {
        heading: 'Comprendre les statuts de vos billets',
        content:
          "Vos billets passent par plusieurs étapes clairement identifiées : « Nouveau » signifie que votre demande a été reçue et enregistrée. « Devis envoyé » signifie qu'un devis est en attente de votre approbation. « Approuvé » signifie que le travail est autorisé et sera planifié. « Planifié » signifie qu'un rendez-vous ou une intervention est fixé. « En cours » signifie que le technicien travaille activement sur votre demande. « Terminé » signifie que le service est achevé.",
      },
      {
        heading: 'Actions requises de votre part',
        content:
          "Certains billets nécessitent une action de votre part pour continuer. Un billet au statut « Devis envoyé » attend votre approbation ou votre refus du devis proposé. Un billet avec des propositions de rendez-vous attend que vous choisissiez un créneau parmi ceux proposés. Traitez ces actions rapidement pour ne pas retarder le processus de service.",
      },
    ],
    tips: [
      "Décrivez votre problème avec le maximum de détails pour accélérer le diagnostic et le traitement.",
      "Répondez aux devis dès que possible — votre approbation est nécessaire pour démarrer les travaux.",
      "Consultez les messages de l'équipe technique pour des mises à jour régulières sur votre demande.",
      "Gardez vos coordonnées (email, téléphone) à jour dans votre profil pour recevoir toutes les notifications.",
    ],
  },

  'CUSTOMER:customer-ticket-detail': {
    title: 'Détail de ma demande de service',
    description:
      "Cette page vous permet de suivre en détail l'avancement de votre demande de service. Consultez le statut actuel, échangez des messages avec l'équipe technique, approuvez ou refusez les devis proposés, et gérez les propositions de rendez-vous.",
    sections: [
      {
        heading: 'Suivi du statut',
        content:
          "Le statut actuel de votre billet est affiché en haut de la page avec un badge de couleur clairement visible. Chaque étape du processus de traitement est identifiable pour que vous puissiez suivre l'avancement de votre demande. Les changements de statut sont accompagnés de la date et de l'heure exactes de chaque transition.",
      },
      {
        heading: 'Approbation ou refus des devis',
        content:
          "Lorsqu'un devis vous est envoyé par notre équipe, il apparaît dans la section « Devis » avec le montant total et le détail des travaux proposés. Cliquez sur « Approuver » pour autoriser les travaux au montant indiqué. Cliquez sur « Refuser » si vous ne souhaitez pas donner suite à cette proposition. Si vous avez des questions sur le devis, envoyez d'abord un message à l'équipe avant de prendre votre décision.",
      },
      {
        heading: 'Gestion des propositions de rendez-vous',
        content:
          "Lorsque des créneaux de rendez-vous vous sont proposés par l'équipe, ils apparaissent dans la section « Propositions » avec la date et l'heure de chaque option. Cliquez sur « Accepter » à côté du créneau qui vous convient le mieux. Si aucun créneau proposé ne correspond à vos disponibilités, cliquez sur « Contre-proposer » pour suggérer de nouvelles dates et heures qui vous arrangent.",
      },
      {
        heading: "Échange de messages avec l'équipe",
        content:
          "Le fil de messages vous permet de communiquer directement avec l'équipe technique responsable de votre demande. Posez vos questions, fournissez des informations supplémentaires demandées ou répondez aux questions de l'équipe. Tapez votre message dans la zone de texte en bas et cliquez sur « Envoyer ». Vous recevrez une notification par email lorsque l'équipe vous répond.",
      },
      {
        heading: 'Informations de votre demande',
        content:
          "Le panneau d'informations affiche le résumé complet de votre demande : catégorie de service sélectionnée, priorité attribuée, mode d'intervention prévu (sur site, en atelier ou à distance) et dates importantes. Ces informations vous permettent de retrouver facilement les détails de votre demande à tout moment.",
      },
    ],
    tips: [
      "Répondez aux devis et propositions de rendez-vous dès que possible pour accélérer le traitement de votre demande.",
      "Utilisez les messages pour poser des questions sur le devis avant de l'approuver ou le refuser.",
      "Si aucun créneau proposé ne vous convient, utilisez la fonction de contre-proposition pour suggérer vos disponibilités.",
      "Consultez régulièrement les messages — l'équipe technique peut avoir besoin d'informations complémentaires de votre part.",
    ],
  },

  'CUSTOMER:customer-appointments': {
    title: 'Mes rendez-vous',
    description:
      "Cette page liste tous vos rendez-vous passés et à venir avec notre équipe technique. Consultez les détails de chaque rendez-vous, vérifiez les informations pratiques (date, heure, adresse) et gérez les propositions de créneaux en attente de votre réponse.",
    sections: [
      {
        heading: 'Liste de vos rendez-vous',
        content:
          "Le tableau affiche vos rendez-vous avec la date, l'heure, le statut actuel et le billet de service associé. Les rendez-vous sont triés par date, les plus proches apparaissant en premier. Les statuts possibles sont : Demandé (en attente de confirmation), Planifié (date fixée), Confirmé (confirmé par les deux parties), En cours (intervention en cours), Terminé (intervention achevée) et Annulé.",
      },
      {
        heading: 'Propositions en attente de réponse',
        content:
          "Si des propositions de créneaux horaires sont en attente de votre réponse, elles apparaissent en haut de la page avec une alerte bien visible. Cliquez sur la proposition pour consulter les créneaux disponibles proposés par l'équipe. Choisissez celui qui vous convient le mieux en cliquant sur « Accepter », ou contre-proposez de nouvelles dates si aucun créneau ne correspond.",
      },
      {
        heading: "Détails d'un rendez-vous",
        content:
          "Cliquez sur un rendez-vous pour afficher ses détails complets : adresse exacte de l'intervention, nom du technicien assigné, durée estimée de l'intervention et notes éventuelles. Préparez-vous en vérifiant l'adresse et l'heure la veille du rendez-vous pour éviter tout retard.",
      },
      {
        heading: 'Modification ou annulation',
        content:
          "Si vous devez modifier ou annuler un rendez-vous confirmé, contactez notre équipe dès que possible via les messages du billet de service associé. Nous reprogrammerons un nouveau créneau selon vos disponibilités. Plus vous nous prévenez tôt, plus il sera facile de trouver un nouveau créneau convenable.",
      },
    ],
    tips: [
      "Vérifiez l'adresse et l'heure de votre prochain rendez-vous la veille pour éviter tout retard ou malentendu.",
      "Répondez rapidement aux propositions de créneaux pour sécuriser la date et l'heure qui vous conviennent.",
      "En cas d'empêchement de dernière minute, prévenez-nous le plus tôt possible pour reprogrammer sans délai.",
      "Consultez le billet associé au rendez-vous pour comprendre le contexte et la nature de l'intervention prévue.",
    ],
  },

  'CUSTOMER:customer-workorders': {
    title: 'Mes bons de travail',
    description:
      "Cette page affiche les bons de travail liés à vos appareils actuellement déposés en réparation dans notre atelier. Suivez l'avancement de chaque réparation en temps réel, depuis le dépôt initial de l'appareil jusqu'à sa récupération une fois réparé.",
    sections: [
      {
        heading: 'Liste de vos bons de travail',
        content:
          "Chaque bon de travail représente un appareil que vous avez confié à notre atelier pour réparation. Le tableau affiche le numéro de référence du BDT, la description de l'appareil (type, marque, modèle), le statut actuel de la réparation et la date de dépôt de l'appareil. Les bons de travail actifs (en cours de traitement) apparaissent en premier.",
      },
      {
        heading: 'Comprendre les étapes de réparation',
        content:
          "Les étapes de réparation sont clairement identifiées : « Réception » signifie que votre appareil a été reçu et enregistré. « Diagnostic » signifie que notre technicien examine l'appareil. « Attente approbation » signifie qu'un devis vous a été envoyé et attend votre réponse. « Approuvé » signifie que la réparation est autorisée. « Attente pièces » signifie que des pièces sont en commande. « En réparation » signifie que les travaux sont en cours. « Vérification » signifie que des tests finaux sont effectués. « Prêt » signifie que la réparation est terminée et que votre appareil est prêt à être récupéré.",
      },
      {
        heading: 'Actions requises de votre part',
        content:
          "Si un bon de travail affiche le statut « Attente approbation », un devis de réparation attend votre réponse. Ouvrez le détail du BDT pour consulter le montant et le détail des travaux proposés, puis approuvez ou refusez le devis. Votre réponse rapide permet à l'équipe de poursuivre la réparation ou de préparer la restitution de l'appareil.",
      },
    ],
    tips: [
      "Un statut « Prêt » signifie que votre appareil est prêt — venez le récupérer dès que possible pour libérer de l'espace.",
      "Approuvez ou refusez les devis rapidement pour ne pas retarder le processus de réparation.",
      "Consultez les notes visibles sur chaque BDT pour suivre en détail les étapes de la réparation.",
      "Contactez-nous via les messages du billet associé si vous avez des questions sur une réparation en cours.",
    ],
  },

  'CUSTOMER:customer-workorder-detail': {
    title: 'Détail de mon bon de travail',
    description:
      "Cette page affiche les détails complets de votre bon de travail : informations sur l'appareil confié, statut actuel de la réparation, chronologie des événements, devis proposé et notes de l'équipe technique. Suivez l'avancement de la réparation et gérez les devis directement depuis cette page.",
    sections: [
      {
        heading: 'Statut et progression de la réparation',
        content:
          "Le statut actuel de votre bon de travail est affiché en haut de la page avec un badge coloré bien visible. La progression depuis le dépôt initial de l'appareil est représentée visuellement pour que vous puissiez comprendre instantanément où en est la réparation. Chaque changement de statut est accompagné de la date et de l'heure précises.",
      },
      {
        heading: "Informations sur votre appareil",
        content:
          "La section « Appareil » affiche le type, la marque, le modèle et le numéro de série de votre appareil tels que documentés lors du dépôt. Vérifiez que ces informations correspondent bien à l'appareil que vous avez confié. En cas d'erreur ou d'incohérence, contactez-nous immédiatement via les messages.",
      },
      {
        heading: 'Devis et approbation',
        content:
          "Si un devis a été établi par notre équipe, il est affiché avec le montant total, le détail des pièces nécessaires et le coût de la main-d'œuvre. Cliquez sur « Approuver » pour autoriser la réparation au montant indiqué et permettre à l'équipe de commencer les travaux. Cliquez sur « Refuser » si vous ne souhaitez pas donner suite — dans ce cas, votre appareil vous sera restitué en l'état actuel.",
      },
      {
        heading: 'Chronologie complète des événements',
        content:
          "La chronologie retrace toutes les étapes de la prise en charge de votre appareil : réception et inspection initiale, résultats du diagnostic, envoi et réponse au devis, début des travaux de réparation, vérification finale et mise à disposition. Chaque événement est horodaté pour une transparence totale sur le processus.",
      },
      {
        heading: "Notes et communications de l'équipe technique",
        content:
          "Les notes rédigées par l'équipe technique et destinées à vous informer apparaissent dans cette section. Elles peuvent contenir des informations détaillées sur le diagnostic, la description des travaux effectués, des recommandations d'utilisation ou d'entretien. Lisez-les attentivement pour comprendre ce qui a été fait sur votre appareil.",
      },
    ],
    tips: [
      "Vérifiez que les informations de votre appareil (marque, modèle, numéro de série) sont correctes dès le dépôt.",
      "Approuvez le devis rapidement pour que la réparation puisse commencer sans délai supplémentaire.",
      "Lisez les notes de l'équipe technique pour comprendre en détail les travaux effectués sur votre appareil.",
      "Récupérez votre appareil dès que le statut passe à « Prêt » pour libérer de l'espace en atelier.",
    ],
  },

  'CUSTOMER:customer-worksheets': {
    title: 'Mes feuilles de travail',
    description:
      "Cette page vous permet de consulter les feuilles de travail associées à vos bons de travail. Chaque feuille détaille les travaux effectués sur votre appareil, les pièces utilisées et les frais associés. Vous pouvez suivre l'avancement de la documentation et télécharger les récapitulatifs en PDF.",
    sections: [
      {
        heading: 'Consulter vos feuilles de travail',
        content:
          "Le tableau affiche les feuilles de travail liées à vos bons de travail en atelier. Chaque ligne indique le numéro de référence, le bon de travail associé, le statut actuel et le montant total. Cliquez sur une feuille pour consulter le détail complet des travaux, des pièces et des frais de déplacement facturés.",
      },
      {
        heading: 'Comprendre les statuts',
        content:
          "Les feuilles de travail passent par plusieurs statuts : « Brouillon » signifie que le technicien est en train de documenter l'intervention. « Soumise » signifie que la feuille est en cours de révision par l'équipe. « Approuvée » signifie que les travaux et les montants ont été validés. « Facturée » signifie que la facture correspondante a été émise. Seules les feuilles approuvées ou facturées reflètent les montants définitifs.",
      },
      {
        heading: 'Télécharger le PDF',
        content:
          "Lorsqu'une feuille de travail est approuvée ou facturée, vous pouvez télécharger le récapitulatif complet au format PDF. Ce document détaille les heures de main-d'œuvre, les pièces utilisées, les frais de déplacement et les totaux. Conservez ce PDF pour vos archives personnelles ou pour vos besoins comptables.",
      },
    ],
    tips: [
      "Consultez les feuilles de travail approuvées pour comprendre le détail des travaux effectués sur votre appareil.",
      "Téléchargez le PDF dès que la feuille est finalisée pour conserver une trace complète de l'intervention.",
      "Si un montant vous semble incorrect, contactez l'équipe via les messages de votre billet ou bon de travail.",
    ],
  },

  'CUSTOMER:customer-worksheet-detail': {
    title: 'Détail de la feuille de travail',
    description:
      "Cette page affiche le détail complet d'une feuille de travail liée à la réparation de votre appareil. Consultez les heures de main-d'œuvre, les pièces remplacées, les frais de déplacement, les totaux calculés et les signatures des intervenants. Téléchargez le récapitulatif en PDF pour vos archives.",
    sections: [
      {
        heading: "Main-d'œuvre, pièces et déplacement",
        content:
          "Les trois sections principales détaillent les travaux réalisés. La section main-d'œuvre indique la durée et la description de chaque intervention. La section pièces liste les composants remplacés avec leurs quantités et coûts unitaires. La section déplacement détaille les frais de transport le cas échéant. Chaque section affiche le sous-total correspondant.",
      },
      {
        heading: 'Comprendre les totaux',
        content:
          "La section des totaux récapitule le coût de l'intervention : sous-total main-d'œuvre, sous-total pièces, sous-total déplacement, taxes applicables et montant total TTC. Ces montants correspondent au détail affiché dans les sections précédentes. Le montant total TTC est le montant final qui vous sera facturé.",
      },
      {
        heading: 'Signatures',
        content:
          "La section signatures affiche les signatures apposées par le technicien ayant réalisé l'intervention et, le cas échéant, votre propre signature confirmant la réception des travaux. Les signatures attestent de l'accord mutuel sur les travaux effectués et les montants facturés.",
      },
      {
        heading: 'Télécharger le PDF',
        content:
          "Cliquez sur « Télécharger PDF » pour obtenir un document récapitulatif complet au format PDF. Ce document professionnel reprend l'ensemble des informations de la feuille de travail : détail des interventions, pièces, déplacements, totaux et signatures. Conservez-le pour vos archives ou transmettez-le à votre comptable.",
      },
    ],
    tips: [
      "Vérifiez que les pièces listées et les heures de travail correspondent aux travaux convenus lors de l'approbation du devis.",
      "Téléchargez et conservez le PDF comme justificatif pour vos archives comptables ou fiscales.",
      "En cas de question sur un montant ou une ligne de la feuille, contactez l'équipe via les messages du billet associé.",
    ],
  },

  // ============================================================
  //  GENERAL (SHARED) PAGES
  // ============================================================

  'GENERAL:profile': {
    title: 'Mon profil',
    description:
      "La page de profil vous permet de consulter et modifier vos informations personnelles. Mettez à jour votre nom, votre adresse email et votre numéro de téléphone. Vous pouvez également changer votre mot de passe pour renforcer la sécurité de votre compte.",
    sections: [
      {
        heading: 'Informations personnelles',
        content:
          "Modifiez votre nom complet, votre adresse email et votre numéro de téléphone dans les champs correspondants. Cliquez sur « Enregistrer » pour sauvegarder vos modifications. L'adresse email est utilisée pour la connexion à l'application et pour recevoir les notifications — assurez-vous qu'elle est correcte et que vous y avez accès.",
      },
      {
        heading: 'Changement de mot de passe',
        content:
          "Pour changer votre mot de passe, saisissez d'abord votre mot de passe actuel pour vérification, puis le nouveau mot de passe souhaité deux fois (pour confirmation). Le mot de passe doit respecter les règles de sécurité minimales : longueur suffisante et complexité adéquate. Cliquez sur « Changer le mot de passe » pour valider la modification.",
      },
      {
        heading: 'Sécurité du compte',
        content:
          "Pour maintenir la sécurité de votre compte, changez votre mot de passe régulièrement. Ne partagez jamais vos identifiants de connexion (email et mot de passe) avec d'autres personnes. Si vous suspectez un accès non autorisé à votre compte, changez immédiatement votre mot de passe et contactez un administrateur.",
      },
    ],
    tips: [
      "Gardez votre adresse email à jour — c'est le moyen principal de recevoir les notifications de l'application.",
      "Utilisez un mot de passe fort : au moins 8 caractères avec un mélange de lettres, chiffres et symboles.",
      "Changez votre mot de passe régulièrement, idéalement au moins tous les 3 mois.",
    ],
  },

  'GENERAL:landing': {
    title: 'Bienvenue sur Valitek',
    description:
      "Valitek est votre plateforme complète de gestion de services informatiques. Soumettez des demandes de réparation, suivez l'avancement de vos billets en temps réel et communiquez directement avec notre équipe technique. Connectez-vous pour accéder à votre espace ou soumettez une demande de service sans créer de compte.",
    sections: [
      {
        heading: 'Se connecter à votre espace',
        content:
          "Si vous possédez déjà un compte Valitek, cliquez sur « Se connecter » pour accéder à votre espace personnel. Depuis votre espace, vous pourrez suivre vos billets de service, consulter vos rendez-vous et surveiller l'avancement de vos bons de travail en atelier. Votre rôle (administrateur, technicien ou client) détermine les fonctionnalités qui vous sont accessibles.",
      },
      {
        heading: 'Créer un compte',
        content:
          "Si c'est votre première visite sur Valitek, vous pouvez créer un compte client pour accéder au portail complet de suivi de vos demandes. Renseignez votre nom, votre adresse email et choisissez un mot de passe. Une fois inscrit, vous pourrez créer des billets de service et suivre intégralement leur avancement.",
      },
      {
        heading: 'Demande de service sans compte',
        content:
          "Vous pouvez soumettre une demande de service rapidement sans avoir besoin de créer un compte Valitek en utilisant le formulaire de demande publique. Renseignez simplement vos coordonnées et décrivez votre problème. Notre équipe vous contactera dans les meilleurs délais pour donner suite à votre demande.",
      },
      {
        heading: 'Nos services informatiques',
        content:
          "Valitek offre une gamme complète de services de réparation et de support informatique : diagnostic matériel et logiciel, remplacement de composants défectueux, installation et configuration de logiciels, mise en place et dépannage réseau, récupération de données et bien plus encore. Nous intervenons selon trois modes : sur site chez le client, en atelier ou à distance.",
      },
    ],
    tips: [
      "Créez un compte client pour bénéficier d'un suivi complet et en temps réel de vos demandes de service.",
      "Vous pouvez aussi soumettre une demande rapidement sans compte via le formulaire de demande publique.",
      "Conservez vos identifiants de connexion en lieu sûr pour un accès rapide et sécurisé à votre espace.",
    ],
  },

  'GENERAL:login': {
    title: 'Connexion à Valitek',
    description:
      "Connectez-vous à votre espace Valitek en saisissant votre adresse email et votre mot de passe. Selon votre rôle dans l'application (administrateur, technicien ou client), vous serez automatiquement redirigé vers le portail correspondant à vos fonctions.",
    sections: [
      {
        heading: 'Se connecter',
        content:
          "Saisissez votre adresse email dans le premier champ et votre mot de passe dans le second champ. Cliquez sur le bouton « Se connecter » pour accéder à votre espace. Vous serez automatiquement redirigé vers votre tableau de bord personnalisé selon votre rôle : tableau de bord administrateur, tableau de bord technicien ou tableau de bord client.",
      },
      {
        heading: 'Mot de passe oublié',
        content:
          "Si vous avez oublié votre mot de passe, contactez un administrateur de l'application pour qu'il réinitialise votre accès. Pour des raisons de sécurité, les mots de passe ne peuvent pas être récupérés directement — un nouveau mot de passe temporaire vous sera attribué que vous pourrez ensuite modifier dans votre profil.",
      },
      {
        heading: 'Résolution des problèmes de connexion',
        content:
          "Si vous ne parvenez pas à vous connecter, vérifiez d'abord que votre adresse email est correctement saisie (attention aux majuscules, aux espaces et aux caractères spéciaux). Vérifiez également que la touche Verr. Maj. n'est pas activée. Si le problème persiste, votre compte a peut-être été désactivé par un administrateur. Contactez le support pour vérifier l'état de votre compte.",
      },
    ],
    tips: [
      "Vérifiez que la touche Verrouillage Majuscules (Caps Lock) n'est pas activée lors de la saisie du mot de passe.",
      "Utilisez l'adresse email exacte avec laquelle votre compte Valitek a été initialement créé.",
      "Contactez un administrateur si votre compte est bloqué ou si vous avez oublié vos identifiants.",
    ],
  },

  'GENERAL:service-request': {
    title: 'Demande de service publique',
    description:
      "Ce formulaire vous permet de soumettre une demande de service informatique sans avoir besoin de posséder un compte Valitek. Remplissez vos coordonnées et décrivez votre problème en détail — notre équipe technique vous contactera dans les plus brefs délais pour donner suite à votre demande.",
    sections: [
      {
        heading: 'Vos coordonnées',
        content:
          "Renseignez votre nom complet, votre adresse email et votre numéro de téléphone. Ces informations sont indispensables pour que notre équipe puisse vous contacter, vous envoyer un accusé de réception et vous tenir informé de l'avancement de votre demande. L'adresse email est le moyen de communication principal utilisé par notre équipe.",
      },
      {
        heading: 'Description détaillée du problème',
        content:
          "Décrivez votre problème de manière aussi détaillée que possible : quel appareil est concerné (type, marque, modèle), quels symptômes observez-vous, depuis combien de temps le problème existe, dans quelles circonstances il se manifeste, et si des tentatives de résolution ont déjà été effectuées. Plus votre description est précise, plus notre équipe pourra préparer une réponse adaptée.",
      },
      {
        heading: 'Catégorie de service',
        content:
          "Sélectionnez la catégorie qui correspond le mieux à votre besoin dans la liste déroulante : réparation matérielle, problème logiciel, dépannage réseau, récupération de données, installation de logiciel ou matériel, maintenance préventive, consultation technique, etc. Ce choix aide notre équipe à orienter immédiatement votre demande vers le technicien spécialisé.",
      },
      {
        heading: 'Envoi et confirmation de la demande',
        content:
          "Une fois tous les champs remplis, cliquez sur « Envoyer la demande » pour soumettre votre formulaire. Vous recevrez un email de confirmation automatique avec un numéro de référence unique pour votre demande. Notre équipe examinera votre demande et vous contactera rapidement pour planifier l'intervention ou demander des informations complémentaires si nécessaire.",
      },
    ],
    tips: [
      "Incluez le type, la marque et le modèle de votre appareil dans la description pour accélérer le diagnostic.",
      "Fournissez un numéro de téléphone joignable pendant les heures ouvrables pour faciliter la prise de contact.",
      "Vérifiez votre boîte email (y compris le dossier spam/courrier indésirable) pour l'email de confirmation.",
      "Créez un compte Valitek après votre première demande pour un suivi en ligne complet de toutes vos interventions.",
    ],
  },
};

/**
 * Retrieve the help article for a given page key and user role.
 *
 * Resolution order:
 *  1. Exact match: `${role}:${pageKey}`
 *  2. General match: `GENERAL:${pageKey}`
 *  3. Profile fallback: if pageKey ends with '-profile', try `GENERAL:profile`
 *  4. null
 */
export function getHelpContent(
  pageKey: string,
  role?: string | null,
): HelpArticle | null {
  // 1. Try exact role:pageKey match
  if (role) {
    const roleKey = `${role}:${pageKey}`;
    if (helpContent[roleKey]) {
      return helpContent[roleKey];
    }
  }

  // 2. Try GENERAL:pageKey match
  const generalKey = `GENERAL:${pageKey}`;
  if (helpContent[generalKey]) {
    return helpContent[generalKey];
  }

  // 3. Profile fallback — all profile pages share the same content
  if (pageKey.endsWith('-profile') || pageKey === 'profile') {
    return helpContent['GENERAL:profile'] || null;
  }

  return null;
}

export default helpContent;
