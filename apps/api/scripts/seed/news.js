const { p, ul } = require('./html');

const DAY = 24 * 3600 * 1000;
const at = (days, hour = 9, min = 0) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, min, 0, 0);
  return d;
};

/** Annonces publiques de la paroisse (page publique + tableau de bord) : titre, résumé, texte, publiée il y a N jours. */
const announcements = [
  [
    'Nouveaux horaires des messes dominicales',
    'À partir du mois prochain, la messe de 11 h est avancée à 10 h 30.',
    [
      p(
        'À partir du premier dimanche du mois prochain, la messe de <strong>11 h</strong> sera célébrée à <strong>10 h 30</strong>. Cet ajustement permet de laisser un peu de temps entre les célébrations, notamment pour le stationnement et l’accueil des familles.',
      ),
      p('Les autres horaires ne changent pas :'),
      ul(['Samedi 18 h (veille du dimanche)', 'Dimanche 7 h 30, 9 h et 10 h 30']),
    ],
    1,
  ],
  [
    'Inscriptions au catéchisme : année 2026-2027',
    'Les inscriptions pour les enfants de 7 à 14 ans sont ouvertes jusqu’à fin octobre.',
    [
      p(
        'Les inscriptions au catéchisme sont ouvertes au secrétariat paroissial, <strong>les mardis et samedis de 9 h à 12 h</strong>, jusqu’à fin octobre.',
      ),
      p(
        'Pièces à fournir : une photo d’identité, la copie de l’acte de naissance, l’acte de baptême si l’enfant est baptisé, et une participation de 3 000 FCFA.',
      ),
      p(
        'Les séances ont lieu le samedi de 9 h à 10 h 30, par tranches d’âge. Une réunion d’information pour les parents aura lieu le samedi suivant la rentrée, à 11 h, dans l’église.',
      ),
    ],
    2,
  ],
  [
    'Rentrée de la chorale Sainte-Cécile',
    'La chorale recrute de nouvelles voix, notamment des hommes. Aucune audition requise.',
    [
      p(
        'La chorale paroissiale Sainte-Cécile reprend ses répétitions <strong>chaque vendredi à 18 h</strong>. Elle anime les messes dominicales de 9 h et les grandes fêtes.',
      ),
      p(
        'Nous cherchons de nouveaux choristes, <strong>en particulier des voix d’hommes</strong> (basses et ténors). Aucune audition n’est demandée, il suffit d’aimer chanter et d’être fidèle aux répétitions.',
      ),
      p('Venez essayer un vendredi : l’accueil est chaleureux.'),
    ],
    3,
  ],
  [
    'Pèlerinage paroissial au sanctuaire de Mvolyé',
    'Une journée de prière, de marche et de partage, avec départ en car depuis la paroisse.',
    [
      p('La paroisse organise un pèlerinage au <strong>sanctuaire marial de Mvolyé</strong>.'),
      ul([
        'Date : samedi 12 du mois prochain',
        'Départ : 6 h 30, parvis de l’église ; retour vers 18 h',
        'Programme : chemin de prière, messe, déjeuner partagé, temps libre',
        'Participation : 3 500 FCFA (car et repas)',
      ]),
      p('Inscriptions à la sacristie avant le 5. Places limitées à 60 personnes.'),
    ],
    4,
  ],
  [
    'Travaux de réfection de la toiture : appel à la générosité',
    'Le conseil économique lance une campagne pour financer la réparation de la toiture de l’église.',
    [
      p(
        'Après les fortes pluies de la saison, la toiture de l’église présente plusieurs fuites. Le conseil économique a fait établir un devis de <strong>8 500 000 FCFA</strong>.',
      ),
      p(
        'Nous faisons appel à la générosité de chacun : chaque dimanche de ce mois, une quête spéciale sera faite. Il est aussi possible de remettre un don au secrétariat, un reçu vous sera délivré.',
      ),
      p(
        'Un tableau d’affichage à l’entrée de l’église indiquera l’avancement de la collecte. Merci pour votre soutien !',
      ),
    ],
    5,
  ],
  [
    'Veillée de prière pour la paix',
    'Rejoignons-nous vendredi soir pour une veillée de prière, de chants et d’adoration.',
    [
      p(
        'Vendredi à <strong>20 h</strong>, veillée de prière pour la paix dans notre pays et dans le monde, avec chants, lectures, temps de silence et adoration du Saint-Sacrement.',
      ),
      p('Elle se terminera à 22 h. Venez avec une bougie si vous le pouvez.'),
    ],
    6,
  ],
  [
    'Quête impérée pour la formation des séminaristes',
    'Ce dimanche, la quête est destinée aux grands séminaires du diocèse.',
    [
      p(
        'Comme chaque année, la quête de ce dimanche est <strong>impérée</strong> en faveur de la formation des futurs prêtres du diocèse. Chacun donne selon ses moyens.',
      ),
      p('Merci aussi de prier pour les vocations sacerdotales et religieuses.'),
    ],
    7,
  ],
  [
    'Collecte de vivres pour les familles en difficulté',
    'Une corbeille est installée au fond de l’église pour recueillir riz, huile, farine et savon.',
    [
      p(
        'La conférence Saint-Vincent-de-Paul organise une collecte de vivres pour les familles les plus fragiles de la paroisse.',
      ),
      ul([
        'Riz, huile, farine, haricots, sucre',
        'Savon, produits d’hygiène, lait pour bébé',
        'Cahiers et fournitures scolaires',
      ]),
      p(
        'Les dons peuvent être déposés dans la corbeille au fond de l’église ou remis au secrétariat. Distribution le dernier samedi du mois.',
      ),
    ],
    8,
  ],
  [
    'Messe des familles : premier dimanche du mois',
    'Une messe animée par les enfants, suivie d’un goûter sur le parvis.',
    [
      p(
        'Chaque <strong>premier dimanche du mois, à 9 h</strong>, la messe est animée par les enfants du catéchisme et leurs familles. Les enfants sont invités à apporter un dessin pour l’offertoire.',
      ),
      p(
        'Un goûter fraternel suit la messe sur le parvis. Chacun peut apporter un gâteau ou une boisson à partager.',
      ),
    ],
    9,
  ],
  [
    'Préparation au mariage : prochaine session',
    'Une session de quatre rencontres pour les fiancés, à partir du samedi 20.',
    [
      p(
        'La prochaine session de préparation au mariage commence le <strong>samedi 20 à 14 h</strong> et se compose de quatre rencontres, à la salle paroissiale.',
      ),
      p(
        'Les fiancés doivent s’inscrire au moins deux mois avant la date souhaitée du mariage, en prenant rendez-vous avec l’abbé responsable au secrétariat.',
      ),
    ],
    10,
  ],
  [
    'Préparation au baptême des petits enfants',
    'Réunion pour les parents, parrains et marraines le deuxième samedi du mois.',
    [
      p(
        'Les parents qui souhaitent faire baptiser leur enfant sont invités à la réunion de préparation le <strong>deuxième samedi du mois à 15 h</strong>, à la salle paroissiale. Merci de venir avec le parrain et la marraine.',
      ),
      p(
        'Les baptêmes sont célébrés le premier dimanche du mois, à l’issue de la messe de 10 h 30.',
      ),
    ],
    11,
  ],
  [
    'Adoration eucharistique chaque jeudi',
    'La chapelle est ouverte tous les jeudis de 17 h à 19 h pour un temps de prière silencieuse.',
    [
      p(
        'Chaque jeudi, de <strong>17 h à 19 h</strong>, le Saint-Sacrement est exposé dans la chapelle. Venez prier seul, en famille ou en groupe. L’adoration se termine par la bénédiction à 19 h.',
      ),
    ],
    12,
  ],
  [
    'Retraite des jeunes : « Ose la confiance »',
    'Un week-end pour les 15-25 ans au centre spirituel d’Akono.',
    [
      p(
        'Un week-end de retraite est proposé aux jeunes de <strong>15 à 25 ans</strong>, du vendredi 18 h au dimanche 16 h, au centre spirituel d’Akono.',
      ),
      p(
        'Au programme : témoignages, ateliers, messe, veillée, temps de détente. Participation : 5 000 FCFA (hébergement et repas). Inscriptions auprès de l’aumônier avant le 10.',
      ),
    ],
    13,
  ],
  [
    'Fête patronale : programme du week-end',
    'Veillée samedi, messe solennelle dimanche, repas partagé.',
    [
      p('Notre paroisse célèbre sa fête patronale ce week-end :'),
      ul([
        'Samedi 18 h : veillée de prière et chapelet',
        'Dimanche 10 h : messe solennelle présidée par notre évêque',
        'Dimanche 12 h : repas partagé sur le parvis (chacun apporte un plat)',
      ]),
      p('Tous les paroissiens et leurs amis sont les bienvenus.'),
    ],
    14,
  ],
  [
    'Horaires des célébrations de Noël',
    'Messe de la nuit à 22 h, messe du jour à 10 h, confessions toute la semaine.',
    [
      p('Les horaires de Noël :'),
      ul([
        '24 décembre : messe de la nuit à 22 h (veillée de chants dès 21 h 30)',
        '25 décembre : messes à 7 h 30 et 10 h',
        'Confessions : tous les jours de 17 h à 18 h 30 dans la semaine précédant Noël',
      ]),
      p('La crèche vivante des enfants du catéchisme aura lieu le 24 décembre à 17 h.'),
    ],
    15,
  ],
  [
    'Kermesse paroissiale : les bénévoles sont attendus',
    'Jeux, stands, tombola et musique le dimanche 20 après la messe.',
    [
      p(
        'La kermesse annuelle se tiendra le <strong>dimanche 20, après la messe de 10 h 30</strong>, sur le terrain de la paroisse : jeux pour enfants, stands de gâteaux et de boissons, tombola, musique.',
      ),
      p(
        'Nous recherchons des bénévoles pour l’installation (dès 7 h), la tenue des stands et le rangement. Contactez le secrétariat ou la responsable des festivités.',
      ),
    ],
    16,
  ],
  [
    'Sortie des anciens à Ebolowa',
    'Messe, déjeuner partagé et visite du marché pour les 60 ans et plus.',
    [
      p(
        'Le groupe des anciens organise une sortie à <strong>Ebolowa</strong> le jeudi qui suit la fête. Départ à 8 h en car du parvis de l’église.',
      ),
      p(
        'Au programme : messe, déjeuner partagé, visite du marché. Inscription avant mardi auprès de la responsable du groupe.',
      ),
    ],
    17,
  ],
  [
    'Nettoyage de l’église et des abords',
    'Samedi matin, chacun est invité à donner un coup de main avec balais et seaux.',
    [
      p(
        'Grand nettoyage de l’église et du parvis <strong>samedi de 8 h à 11 h</strong>. Merci d’apporter balais, seaux et chiffons. Un petit déjeuner sera offert à tous les participants.',
      ),
    ],
    18,
  ],
  [
    'Nouveau secrétariat : horaires d’ouverture',
    'Le secrétariat paroissial est ouvert du mardi au samedi, matin et après-midi.',
    [
      p('Le secrétariat paroissial est ouvert :'),
      ul([
        'Mardi, jeudi, vendredi : 9 h – 12 h et 15 h – 17 h',
        'Mercredi : 9 h – 12 h',
        'Samedi : 9 h – 12 h',
      ]),
      p(
        'Vous pouvez y demander un certificat de baptême, déposer une intention de messe ou prendre rendez-vous avec un prêtre.',
      ),
    ],
    19,
  ],
  [
    'Appel aux catéchistes et aux animateurs',
    'La paroisse recherche des adultes disponibles pour accompagner les enfants et les jeunes.',
    [
      p(
        'Pour répondre au nombre croissant d’enfants inscrits, nous cherchons de <strong>nouveaux catéchistes et animateurs</strong>. Aucune qualification particulière n’est exigée : de la disponibilité (une demi-journée par semaine), l’envie de transmettre, et la volonté de se former.',
      ),
      p(
        'Une formation est assurée par le diocèse. Contactez le responsable du catéchisme après la messe.',
      ),
    ],
    20,
  ],
];

/** Activités et événements : titre, description, lieu, jours par rapport à aujourd'hui, heure. */
const activities = [
  [
    'Pèlerinage paroissial au sanctuaire de Mvolyé',
    [
      p(
        'Une journée de marche, de prière et de partage. Départ en car, messe au sanctuaire, déjeuner partagé.',
      ),
      p('<strong>Inscription obligatoire</strong> avant le 5 ; participation de 3 500 FCFA.'),
    ],
    'Sanctuaire marial de Mvolyé',
    12,
    6,
    30,
  ],
  [
    'Retraite des jeunes : « Ose la confiance »',
    [
      p(
        'Un week-end de retraite pour les 15-25 ans : témoignages, ateliers, messe, veillée. Animé par l’aumônier et des jeunes adultes de la paroisse.',
      ),
    ],
    'Centre spirituel d’Akono',
    17,
    18,
    0,
  ],
  [
    'Veillée de prière pour la paix',
    [
      p(
        'Chants, lectures bibliques, silence et adoration du Saint-Sacrement. Venez avec une bougie.',
      ),
    ],
    'Église paroissiale',
    6,
    20,
    0,
  ],
  [
    'Kermesse paroissiale',
    [
      p(
        'Jeux pour enfants, stands de gâteaux et de boissons, tombola, concerts de la chorale et des groupes de jeunes.',
      ),
      p('Les bénéfices sont destinés aux travaux de la toiture de l’église.'),
    ],
    'Terrain de la paroisse',
    20,
    12,
    0,
  ],
  [
    'Repas fraternel de la fête patronale',
    [
      p(
        'Après la messe solennelle, repas partagé : chaque famille apporte un plat. Boissons offertes par la paroisse.',
      ),
    ],
    'Parvis de l’église',
    14,
    12,
    30,
  ],
  [
    'Répétition de la chorale Sainte-Cécile',
    [
      p(
        'Répétition hebdomadaire. Les nouveaux choristes sont les bienvenus, sans audition. Préparation des chants de l’Avent.',
      ),
    ],
    'Église paroissiale',
    3,
    18,
    0,
  ],
  [
    'Rencontre du groupe de prière du renouveau',
    [p('Louange, enseignement, prière pour les malades et temps de partage. Ouvert à tous.')],
    'Salle paroissiale',
    4,
    17,
    30,
  ],
  [
    'Conférence : la Bible au quotidien',
    [
      p(
        'Conférence de l’abbé responsable suivie d’échanges : comment lire la Bible chez soi, avec ses enfants, avec ses voisins.',
      ),
    ],
    'Salle paroissiale',
    9,
    18,
    30,
  ],
  [
    'Session de préparation au mariage — rencontre 1',
    [
      p(
        'Première rencontre de la session de préparation au mariage pour les fiancés. Thème : se connaître, se reconnaître.',
      ),
    ],
    'Salle paroissiale',
    10,
    14,
    0,
  ],
  [
    'Préparation au baptême des petits enfants',
    [p('Réunion d’information et de préparation pour les parents, parrains et marraines.')],
    'Salle paroissiale',
    11,
    15,
    0,
  ],
  [
    'Collecte et distribution de vivres',
    [
      p(
        'Tri et distribution des denrées collectées par la conférence Saint-Vincent-de-Paul. Bénévoles bienvenus dès 8 h 30.',
      ),
    ],
    'Local de la conférence Saint-Vincent-de-Paul',
    8,
    9,
    0,
  ],
  [
    'Chemin de croix animé par les jeunes',
    [p('Chemin de croix dans l’église, avec méditations préparées par l’aumônerie des jeunes.')],
    'Église paroissiale',
    15,
    17,
    30,
  ],
  [
    'Matinée de nettoyage de l’église',
    [
      p(
        'Nettoyage de l’église, du parvis et de la sacristie. Apporter balais, seaux et chiffons. Petit déjeuner offert.',
      ),
    ],
    'Église paroissiale',
    18,
    8,
    0,
  ],
  [
    'Sortie des anciens à Ebolowa',
    [
      p(
        'Messe, déjeuner partagé et visite du marché pour le groupe des 60 ans et plus. Car au départ du parvis à 8 h.',
      ),
    ],
    'Ebolowa',
    19,
    8,
    0,
  ],
  [
    'Messe des familles et goûter',
    [
      p(
        'Messe animée par les enfants du catéchisme et leurs familles, suivie d’un goûter sur le parvis.',
      ),
    ],
    'Église paroissiale',
    7,
    9,
    0,
  ],
  [
    'Rencontre des servants d’autel',
    [
      p(
        'Formation et répétition de la liturgie avec l’abbé responsable. Les garçons et filles à partir de 9 ans peuvent rejoindre le groupe.',
      ),
    ],
    'Sacristie',
    5,
    10,
    0,
  ],
  [
    'Tournoi de football inter-quartiers',
    [
      p(
        'Tournoi amical entre les équipes des communautés ecclésiales de base de la paroisse. Remise des coupes à 17 h.',
      ),
    ],
    'Terrain de sport d’Etoudi',
    24,
    8,
    0,
  ],
  [
    'Soirée cinéma : film biblique pour les enfants',
    [
      p(
        'Projection d’un film pour les enfants du catéchisme, suivie d’un temps d’échange et d’un goûter.',
      ),
    ],
    'Salle paroissiale',
    13,
    16,
    0,
  ],
];

module.exports = { announcements, activities, at };
