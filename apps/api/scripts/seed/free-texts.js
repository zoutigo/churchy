const { p, strong, em, ul } = require('./html');

/** Textes libres pour la liturgie : mots d’accueil, monitions, introductions, envois. */
module.exports = [
  [
    'Mot d’accueil — messe dominicale',
    [
      p(strong('Mot d’accueil')),
      p(
        'Chers frères et sœurs, soyez les bienvenus dans cette église. Que vous soyez ici depuis toujours, ou de passage, vous êtes chez vous. Nous venons ensemble écouter la Parole de Dieu et partager le pain de la vie.',
      ),
      p(
        'Si vous êtes nouveau dans la paroisse, n’hésitez pas à vous signaler à la fin de la messe : nous serons heureux de vous accueillir.',
      ),
    ].join(''),
  ],
  [
    'Introduction à la messe — temps ordinaire',
    [
      p(em('À lire par le célébrant ou un animateur')),
      p(
        'Frères et sœurs, nous avons marché toute la semaine, chacun avec ses joies et ses soucis. Nous voici rassemblés pour déposer ce que nous portons devant Dieu. Il nous parle, il nous nourrit, il nous envoie. Ouvrons nos cœurs pour accueillir sa Parole.',
      ),
    ].join(''),
  ],
  [
    'Monition d’entrée — Avent',
    [
      p(em('Premier dimanche de l’Avent')),
      p(
        'Nous entrons aujourd’hui dans le temps de l’Avent : quatre semaines pour veiller et préparer notre cœur à la venue du Seigneur. Allumons la première bougie de la couronne : elle est signe de l’espérance qui nous met en route.',
      ),
    ].join(''),
  ],
  [
    'Monition d’entrée — Carême',
    [
      p(em('Mercredi des Cendres, 1er dimanche de Carême')),
      p(
        'Aujourd’hui commence le Carême. Pendant quarante jours, nous sommes invités à revenir à Dieu de tout notre cœur par la prière, le jeûne et le partage. Ne cherchons pas des exploits, mais la vérité de notre relation avec lui et avec nos frères.',
      ),
    ].join(''),
  ],
  [
    'Mot de bienvenue aux nouveaux paroissiens',
    [
      p(strong('Bienvenue !')),
      p(
        'Nous souhaitons aujourd’hui la bienvenue aux familles et aux personnes arrivées récemment dans notre paroisse. Nous vous invitons à nous rejoindre après la messe pour un temps de rencontre et à découvrir les différentes équipes : chorale, catéchisme, liturgie, entraide, jeunes.',
      ),
    ].join(''),
  ],
  [
    'Invitation à la prière universelle',
    [
      p(
        'Le Seigneur écoute ceux qui l’invoquent. Avec confiance, présentons-lui les besoins de l’Église, du monde, de notre communauté. Chaque intention sera suivie d’un temps de silence avant la réponse de l’assemblée.',
      ),
    ].join(''),
  ],
  [
    'Présentation des offrandes',
    [
      p(em('Moment de l’offertoire')),
      p(
        'Avec le pain et le vin, nous présentons au Seigneur le travail de nos mains, nos joies, nos peines, et les dons faits pour les pauvres et pour la vie de la paroisse. Que tout cela soit transformé par son amour.',
      ),
    ].join(''),
  ],
  [
    'Invitation à la communion',
    [
      p(
        'Heureux les invités au repas du Seigneur. Ceux qui souhaitent communier sont invités à s’avancer en procession, dans la paix et le recueillement. Ceux qui ne communient pas peuvent s’avancer pour recevoir une bénédiction, en croisant les bras sur la poitrine.',
      ),
    ].join(''),
  ],
  [
    'Méditation après la communion',
    [
      p(em('Temps de silence · 2 minutes')),
      p(
        'Seigneur, nous venons de te recevoir. Reste en nous comme un hôte discret et fidèle. Que ce pain nous donne la force d’aimer cette semaine, à la maison, au travail, dans la rue. Nous te confions ceux qui ne sont pas là aujourd’hui, les malades, les isolés.',
      ),
    ].join(''),
  ],
  [
    'Mot de fin de messe et annonces',
    [
      p(
        'Avant de nous envoyer, quelques informations pratiques pour la vie de la paroisse (voir les annonces de la semaine). Merci à tous ceux qui ont rendu cette célébration belle : la chorale, les lecteurs, les servants d’autel, l’équipe d’accueil, l’équipe de ménage.',
      ),
    ].join(''),
  ],
  [
    'Envoi en mission',
    [
      p(strong('Envoi')),
      p(
        'Allez en paix, glorifiez le Seigneur par votre vie. Vous avez entendu sa Parole, vous avez reçu son pain : soyez à votre tour, cette semaine, des signes de sa tendresse. Que la bénédiction de Dieu tout-puissant descende sur vous et y demeure toujours.',
      ),
    ].join(''),
  ],
  [
    'Témoignage de foi (modèle)',
    [
      p(em('À adapter selon la personne et le contexte')),
      p(
        'Je m’appelle N. et je viens témoigner de ce que Dieu a fait dans ma vie. Il y a quelques années, j’ai traversé une période difficile. C’est à la paroisse, dans un petit groupe de prière, que j’ai retrouvé confiance. Aujourd’hui, je sers au sein de l’équipe d’accueil, et je crois que le Seigneur ne laisse jamais personne seul.',
      ),
    ].join(''),
  ],
  [
    'Rite de la lumière — veillée pascale',
    [
      p(em('Nuit de Pâques, devant le feu nouveau')),
      p(
        'Frères et sœurs, en cette nuit très sainte où notre Seigneur Jésus Christ est passé de la mort à la vie, l’Église invite ses enfants dispersés à se rassembler pour veiller et prier. Allumons le cierge pascal : lumière du Christ !',
      ),
    ].join(''),
  ],
  [
    'Prière de bénédiction des familles',
    [
      p(
        'Seigneur, bénis chaque famille de cette assemblée. Bénis les parents qui se fatiguent pour leurs enfants, les enfants qui grandissent, les grands-parents qui transmettent, les personnes seules qui sont aussi ta famille. Donne-nous la paix à la maison, le pardon facile et le pain sur la table.',
      ),
    ].join(''),
  ],
  [
    'Prière pour la rentrée scolaire',
    [
      p(
        'Seigneur, nous te confions les élèves, les étudiants et leurs enseignants. Donne-leur le goût d’apprendre, le courage de persévérer et le respect les uns des autres. Bénis les parents qui s’efforcent de payer les frais de scolarité, et ouvre des portes à ceux qui n’en ont pas les moyens.',
      ),
    ].join(''),
  ],
  [
    'Mot du curé — début d’année pastorale',
    [
      p(strong('Mot du curé')),
      p(
        'Chers paroissiens, une nouvelle année pastorale s’ouvre. Je voudrais, avec vous, rendre grâce pour ce que nous avons vécu et nous donner trois priorités : mieux accueillir, mieux transmettre la foi aux jeunes, mieux servir les plus pauvres autour de nous.',
      ),
      ul([
        'Accueil : une équipe renforcée à l’entrée et au secrétariat.',
        'Jeunes : catéchisme, aumônerie, servants d’autel et chorale des jeunes.',
        'Solidarité : conférence Saint-Vincent-de-Paul et collecte mensuelle.',
      ]),
    ].join(''),
  ],
  [
    'Remerciements aux bénévoles',
    [
      p(
        'Un grand merci à toutes celles et ceux qui donnent de leur temps pour la paroisse : lecteurs, chantres, sacristains, catéchistes, équipes d’entretien, trésoriers, cuisinières des fêtes. Sans vous, rien ne serait possible. Que le Seigneur vous rende au centuple ce que vous donnez avec tant de générosité.',
      ),
    ].join(''),
  ],
  [
    'Intentions de messe de la semaine (modèle)',
    [
      p(em('À remplir chaque semaine')),
      ul([
        'Lundi 6 h 30 : pour la famille N.',
        'Mardi 6 h 30 : pour les malades de la paroisse.',
        'Mercredi 18 h : pour le repos de l’âme de N.',
        'Jeudi 6 h 30 : en action de grâce.',
        'Vendredi 18 h : pour la paix.',
        'Samedi 18 h : pour les défunts de la semaine.',
        'Dimanche : pour le peuple de Dieu confié à la paroisse.',
      ]),
    ].join(''),
  ],
  [
    'Consignes pratiques pour les célébrations',
    [
      p(strong('Pour le bon déroulement des célébrations')),
      ul([
        'Arriver quelques minutes avant le début pour s’installer sans bruit.',
        'Éteindre les téléphones portables.',
        'Les enfants sont les bienvenus : un espace leur est réservé à droite de la nef.',
        'Les quêtes sont ramassées pendant le chant d’offertoire.',
        'Le parking de la paroisse est réservé aux personnes âgées et handicapées.',
      ]),
    ].join(''),
  ],
  [
    'Introduction à la veillée de Noël',
    [
      p(em('Avant la messe de la nuit')),
      p(
        'Nous voici réunis pour veiller dans la nuit, comme les bergers. Ce soir, Dieu ne vient pas avec éclat : il vient dans la faiblesse d’un enfant. Laissons-nous rejoindre par sa simplicité, et chantons ensemble la joie de Noël.',
      ),
    ].join(''),
  ],
];
