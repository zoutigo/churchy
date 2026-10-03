const { p, strong, ul } = require('./html');

/** Annonces lues à la fin de la messe (type « Annonce » de la bibliothèque de contenus). */
const note = (titre, paras, liste) =>
  [p(strong(titre)), ...paras.map(p), ...(liste ? [ul(liste)] : [])].join('');

module.exports = [
  [
    'Annonce — Quête impérée',
    note('Quête impérée ce dimanche', [
      'Ce dimanche, la quête est impérée en faveur de la formation des séminaristes du diocèse. Merci de votre générosité habituelle.',
      'Des enveloppes sont à votre disposition à l’entrée de l’église.',
    ]),
  ],
  [
    'Annonce — Horaires de la Semaine sainte',
    note(
      'Horaires de la Semaine sainte',
      ['Voici les célébrations de la Semaine sainte dans notre paroisse :'],
      [
        'Dimanche des Rameaux : messes à 7 h 30, 9 h et 11 h, avec bénédiction des rameaux.',
        'Jeudi saint : messe de la Cène à 18 h, suivie de l’adoration jusqu’à 22 h.',
        'Vendredi saint : chemin de croix à 15 h, célébration de la Passion à 18 h.',
        'Samedi saint : veillée pascale à 19 h.',
        'Dimanche de Pâques : messes à 7 h 30, 9 h et 11 h.',
      ],
    ),
  ],
  [
    'Annonce — Inscriptions au catéchisme',
    note('Inscriptions au catéchisme', [
      'Les inscriptions pour l’année de catéchisme sont ouvertes pour tous les enfants à partir de 7 ans. Elles se font au secrétariat paroissial, les mardis et samedis de 9 h à 12 h.',
      'Pièces à fournir : une photo, l’acte de baptême (si l’enfant est déjà baptisé) et la participation de 2 000 FCFA aux frais de documents.',
    ]),
  ],
  [
    'Annonce — Réunion du conseil paroissial',
    note('Réunion du conseil paroissial', [
      'Les membres du conseil paroissial sont convoqués mardi à 18 h 30 à la salle paroissiale.',
      'Ordre du jour : bilan du trimestre, préparation de la fête patronale, point sur les travaux de la toiture.',
    ]),
  ],
  [
    'Annonce — Messe des familles',
    note('Messe des familles', [
      'Le premier dimanche du mois, à 9 h, messe animée par les enfants du catéchisme et leurs familles. Les enfants sont invités à apporter un dessin pour l’offertoire.',
      'Un goûter fraternel suivra sur le parvis.',
    ]),
  ],
  [
    'Annonce — Pèlerinage paroissial',
    note('Pèlerinage paroissial à Mvolyé', [
      'La paroisse organise un pèlerinage au sanctuaire marial de Mvolyé le samedi 12 du mois prochain. Départ en car à 6 h 30 du parvis de l’église, retour vers 18 h.',
      'Inscriptions auprès de la sacristie avant le 5, participation de 3 500 FCFA (transport et repas).',
    ]),
  ],
  [
    'Annonce — Répétition de la chorale',
    note('Répétition de la chorale', [
      'La chorale Sainte-Cécile répète chaque vendredi à 18 h dans l’église. Les personnes qui aiment chanter sont les bienvenues, sans audition.',
      'Nous cherchons en particulier des voix d’hommes (basses et ténors).',
    ]),
  ],
  [
    'Annonce — Collecte de vivres',
    note('Collecte de vivres pour les familles en difficulté', [
      'Tout ce mois, une corbeille est installée au fond de l’église pour recevoir riz, huile, farine, savon et produits d’hygiène.',
      'Les dons seront distribués par l’équipe de la conférence Saint-Vincent-de-Paul le dernier samedi du mois.',
    ]),
  ],
  [
    'Annonce — Retraite des jeunes',
    note('Retraite des jeunes (15-25 ans)', [
      'Un week-end de retraite est proposé aux jeunes de 15 à 25 ans, du vendredi 18 h au dimanche 16 h, au centre spirituel d’Akono. Thème : « Ose la confiance ».',
      'Participation : 5 000 FCFA. Inscriptions auprès de l’aumônier.',
    ]),
  ],
  [
    'Annonce — Préparation au baptême',
    note('Préparation au baptême des petits enfants', [
      'Les parents qui souhaitent faire baptiser leur enfant sont invités à une réunion de préparation le deuxième samedi du mois à 15 h, à la salle paroissiale. Merci de venir avec le parrain et la marraine.',
    ]),
  ],
  [
    'Annonce — Préparation au mariage',
    note('Session de préparation au mariage', [
      'La prochaine session de préparation au mariage commence le samedi 20, à 14 h, et comporte quatre rencontres. Les fiancés doivent s’inscrire au moins deux mois avant la date souhaitée.',
    ]),
  ],
  [
    'Annonce — Adoration eucharistique',
    note('Adoration eucharistique', [
      'Chaque jeudi, de 17 h à 19 h, le Saint-Sacrement est exposé dans la chapelle. Venez prier en silence, seul ou en famille.',
      'L’adoration se termine par la bénédiction à 19 h.',
    ]),
  ],
  [
    'Annonce — Chemin de croix du Carême',
    note('Chemin de croix du Carême', [
      'Pendant le Carême, chemin de croix tous les vendredis à 17 h 30 dans l’église. Chaque vendredi, un groupe de la paroisse (jeunes, mamans, chorale, CVAV) anime une station.',
    ]),
  ],
  [
    'Annonce — Fête patronale',
    note('Fête patronale de la paroisse', [
      'Notre paroisse fête son saint patron ce week-end. Samedi : veillée de prière à 18 h. Dimanche : messe solennelle à 10 h, présidée par notre évêque, suivie d’un repas partagé.',
      'Chacun est invité à apporter un plat à partager.',
    ]),
  ],
  [
    'Annonce — Confessions avant Noël',
    note('Confessions avant Noël', [
      'Des prêtres sont disponibles pour le sacrement de la réconciliation tous les jours de la semaine avant Noël, de 17 h à 18 h 30, et le samedi de 9 h à 12 h.',
      'Célébration pénitentielle communautaire le mercredi à 18 h.',
    ]),
  ],
  [
    'Annonce — Kermesse paroissiale',
    note('Kermesse paroissiale', [
      'La kermesse annuelle aura lieu le dimanche 20 après la messe de 10 h, sur le terrain de la paroisse : jeux pour enfants, stands de gâteaux, tombola, musique.',
      'Les bénévoles sont attendus dès 7 h pour l’installation.',
    ]),
  ],
  [
    'Annonce — Nettoyage de l’église',
    note('Journée de nettoyage de l’église', [
      'Samedi, de 8 h à 11 h, grand nettoyage de l’église et des abords. Merci d’apporter balais, seaux et bonne humeur. Un petit déjeuner sera offert à tous les participants.',
    ]),
  ],
  [
    'Annonce — Rencontre des servants d’autel',
    note('Rencontre des servants d’autel', [
      'Les servants d’autel et les jeunes qui souhaitent le devenir se retrouvent samedi à 10 h à la sacristie avec l’abbé responsable. Formation et répétition de la liturgie du dimanche.',
    ]),
  ],
  [
    'Annonce — Veillée de prière',
    note('Veillée de prière', [
      'Vendredi soir à 20 h, veillée de prière pour la paix et pour les malades, avec chants, lectures, temps de silence et adoration. Elle se terminera à 22 h.',
    ]),
  ],
  [
    'Annonce — Sortie des anciens',
    note('Sortie des anciens', [
      'Le groupe des « anciens » (60 ans et plus) organise une sortie le jeudi à Ebolowa : messe, déjeuner partagé et visite du marché. Départ à 8 h. S’inscrire auprès de la responsable avant mardi.',
    ]),
  ],
];
