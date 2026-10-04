const { p, em, strong } = require('./html');

/** Prière universelle complète : invitation, intentions avec refrain de l'assemblée, oraison conclusive. */
function pu(occasion, response, invitation, intentions, conclusion) {
  return [
    p(em(occasion)),
    p(`${strong('Invitation (prêtre) :')} ${invitation}`),
    ...intentions.map(([lecteur, texte]) =>
      p(`${strong(`${lecteur} :`)} ${texte}<br>${em(`R/ ${response}`)}`),
    ),
    p(`${strong('Oraison (prêtre) :')} ${conclusion}`),
  ].join('');
}

const LECTEUR = 'Lecteur';
module.exports = [
  [
    'Prière universelle — Dimanche ordinaire (modèle 1)',
    pu(
      'Dimanche du temps ordinaire',
      'Seigneur, écoute-nous, Seigneur, exauce-nous.',
      'Frères et sœurs, confiants dans l’amour du Père, présentons-lui les besoins de l’Église et du monde.',
      [
        [
          LECTEUR,
          'Pour l’Église, rassemblée dans chaque paroisse : que l’Esprit Saint la garde fidèle à l’Évangile et proche des plus petits, prions le Seigneur.',
        ],
        [
          LECTEUR,
          'Pour les responsables de notre pays et des nations : qu’ils cherchent la justice, le bien commun et la paix, prions le Seigneur.',
        ],
        [
          LECTEUR,
          'Pour les malades, les personnes âgées et ceux qui les soignent : que la tendresse du Christ les soutienne chaque jour, prions le Seigneur.',
        ],
        [
          LECTEUR,
          'Pour notre assemblée et pour nos familles : que la Parole entendue nous rende plus attentifs les uns aux autres, prions le Seigneur.',
        ],
      ],
      'Père très bon, tu connais nos besoins avant même que nous te les exprimions ; exauce ces prières, par Jésus, le Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Dimanche ordinaire (modèle 2)',
    pu(
      'Dimanche du temps ordinaire',
      'Dieu de tendresse, écoute notre prière.',
      'Frères et sœurs, le Seigneur nous écoute : confions-lui, avec simplicité, tous ceux que nous portons dans notre cœur.',
      [
        [
          LECTEUR,
          'Pour le pape, notre évêque, les prêtres et les diacres : que le Seigneur les soutienne dans leur ministère, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui ont faim, ceux qui n’ont pas de travail, ceux qui n’ont pas de toit : que nous sachions partager ce que nous avons, prions.',
        ],
        [
          LECTEUR,
          'Pour les enfants de notre catéchisme et de notre aumônerie : qu’ils découvrent l’amitié de Jésus, prions.',
        ],
        [
          LECTEUR,
          'Pour les défunts de la semaine et pour ceux qui les pleurent : que le Seigneur les accueille dans sa lumière et console leurs proches, prions.',
        ],
      ],
      'Dieu de miséricorde, reçois les prières de ton peuple et donne-nous de vivre ce que nous demandons. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Avent',
    pu(
      'Temps de l’Avent',
      'Viens, Seigneur Jésus, viens nous sauver.',
      'En ce temps d’attente et de vigilance, tournons-nous vers le Seigneur qui vient.',
      [
        [
          LECTEUR,
          'Pour l’Église : qu’elle annonce avec joie que Dieu vient habiter notre histoire, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui attendent un enfant, une guérison, un travail, une réponse : que l’espérance ne les abandonne pas, prions.',
        ],
        [
          LECTEUR,
          'Pour les peuples en guerre ou en exil : que vienne le Prince de la paix, prions.',
        ],
        [
          LECTEUR,
          'Pour chacun de nous : que cet Avent nous aide à préparer le chemin du Seigneur par la prière et le partage, prions.',
        ],
      ],
      'Dieu notre Père, tu as envoyé ton Fils au milieu de nous ; accorde-nous de l’accueillir avec foi quand il viendra dans la gloire. Lui qui règne avec toi pour les siècles des siècles. Amen.',
    ),
  ],
  [
    'Prière universelle — Nuit de Noël',
    pu(
      'Messe de la nuit de Noël',
      'Seigneur, que ta paix descende sur la terre.',
      'Dans la joie de la naissance de Jésus, présentons à Dieu les prières du monde entier.',
      [
        [
          LECTEUR,
          'Pour l’Église : qu’elle soit, comme la crèche, un lieu où chacun trouve sa place, prions.',
        ],
        [
          LECTEUR,
          'Pour les enfants du monde, surtout ceux qui souffrent de la faim, de la violence ou de l’abandon : que chacun soit accueilli comme un don, prions.',
        ],
        [
          LECTEUR,
          'Pour les familles réunies cette nuit, et pour celles qui sont séparées ou en deuil : que la joie de Noël les rejoigne, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui travaillent cette nuit, qui veillent, soignent, protègent : que Dieu les garde, prions.',
        ],
      ],
      'Dieu qui as illuminé cette nuit de la gloire de ton Fils, exauce nos prières et conduis-nous à la lumière sans déclin. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Carême',
    pu(
      'Temps du Carême',
      'Seigneur, fais-nous revenir à toi.',
      'Dans ce temps de conversion, présentons au Père nos demandes avec un cœur humble.',
      [
        [
          LECTEUR,
          'Pour l’Église : qu’elle soit fidèle à la prière, au jeûne et au partage, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui se préparent au baptême à Pâques : que Dieu les accompagne sur leur chemin, prions.',
        ],
        [
          LECTEUR,
          'Pour les personnes qui ont blessé ou ont été blessées : que le pardon fasse son œuvre, prions.',
        ],
        [
          LECTEUR,
          'Pour notre communauté : que nos efforts de Carême profitent aux plus pauvres, prions.',
        ],
      ],
      'Dieu de bonté, regarde ton peuple en marche vers la Pâque et fais-nous grandir dans la conversion du cœur. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Veillée pascale',
    pu(
      'Veillée pascale',
      'Christ ressuscité, exauce-nous.',
      'Dans la joie de la Résurrection, confions au Christ vivant les besoins de tous les hommes.',
      [
        [
          LECTEUR,
          'Pour l’Église répandue dans le monde et pour les nouveaux baptisés de cette nuit : qu’ils vivent de la vie du Ressuscité, prions.',
        ],
        [
          LECTEUR,
          'Pour les gouvernants et les artisans de paix : que la justice triomphe de la violence, prions.',
        ],
        [
          LECTEUR,
          'Pour les malades, les prisonniers, les exilés : que la lumière de Pâques rejoigne leur nuit, prions.',
        ],
        [
          LECTEUR,
          'Pour tous ceux qui sont morts dans l’espérance de la résurrection : que Dieu les accueille dans sa joie, prions.',
        ],
      ],
      'Dieu éternel, toi qui as ressuscité ton Fils d’entre les morts, accorde-nous de vivre de sa vie et de la partager. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Pentecôte',
    pu(
      'Dimanche de Pentecôte',
      'Esprit Saint, viens, et renouvelle la face de la terre.',
      'Appelons l’Esprit du Seigneur sur l’Église et sur le monde.',
      [
        [
          LECTEUR,
          'Pour l’Église : que l’Esprit la garde unie dans la diversité des langues et des cultures, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui confessent leur foi dans la difficulté : que l’Esprit leur donne courage et sagesse, prions.',
        ],
        [
          LECTEUR,
          'Pour les jeunes qui reçoivent aujourd’hui le sacrement de confirmation : que les dons de l’Esprit portent du fruit dans leur vie, prions.',
        ],
        [
          LECTEUR,
          'Pour les responsables politiques : que l’Esprit de conseil les éclaire pour servir le bien de tous, prions.',
        ],
      ],
      'Père, tu as envoyé ton Esprit sur les apôtres réunis en prière ; accorde-nous le même Esprit pour que nous soyons témoins de ton Évangile. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Pour la paix',
    pu(
      'Journée de prière pour la paix · 1er janvier',
      'Seigneur, donne-nous ta paix.',
      'Dieu seul peut donner la paix. Demandons-lui d’en faire en nous des artisans.',
      [
        [
          LECTEUR,
          'Pour les pays et les régions déchirés par la violence : que cessent les armes et que reprenne le dialogue, prions.',
        ],
        [
          LECTEUR,
          'Pour les victimes de la guerre, les réfugiés et les déplacés : que nous sachions les accueillir, prions.',
        ],
        [
          LECTEUR,
          'Pour nos quartiers, nos villages et nos familles : que le pardon l’emporte sur la rancune, prions.',
        ],
        [
          LECTEUR,
          'Pour nous-mêmes : que nous soyons des artisans de paix par nos paroles et nos gestes, prions.',
        ],
      ],
      'Seigneur Dieu, source de toute paix, regarde ton peuple en prière et donne au monde la paix que seul tu peux donner. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Pour les malades',
    pu(
      'Dimanche de la santé · fête de Notre-Dame de Lourdes',
      'Seigneur, guéris et console ton peuple.',
      'Tournons-nous vers le Christ, médecin des corps et des cœurs, et présentons-lui ceux qui souffrent.',
      [
        [
          LECTEUR,
          'Pour les malades de notre paroisse, ceux qui sont à l’hôpital, à la maison ou en fin de vie : que le Seigneur les soutienne, prions.',
        ],
        [
          LECTEUR,
          'Pour les médecins, les infirmières, les aides-soignants et tous les soignants : que leur dévouement soit reconnu, prions.',
        ],
        [
          LECTEUR,
          'Pour les familles qui accompagnent un proche malade : qu’elles trouvent force et repos, prions.',
        ],
        [
          LECTEUR,
          'Pour tous ceux qui souffrent en silence de solitude ou de dépression : que nous soyons attentifs à leur détresse, prions.',
        ],
      ],
      'Dieu de tendresse, toi qui as pris soin des malades en Jésus, répands ta force sur ceux qui souffrent. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Pour les familles',
    pu(
      'Fête de la Sainte Famille · journée des familles',
      'Seigneur, bénis nos familles.',
      'Que Dieu bénisse chaque famille, avec ses joies et ses épreuves.',
      [
        [
          LECTEUR,
          'Pour les époux et les fiancés : que l’amour du Christ fortifie leur fidélité, prions.',
        ],
        [
          LECTEUR,
          'Pour les parents : que le Seigneur leur donne patience, sagesse et joie dans l’éducation de leurs enfants, prions.',
        ],
        [
          LECTEUR,
          'Pour les enfants et les adolescents : qu’ils grandissent dans la confiance et la liberté, prions.',
        ],
        [
          LECTEUR,
          'Pour les familles divisées, endeuillées ou en difficulté : que le Seigneur leur ouvre un chemin de réconciliation, prions.',
        ],
      ],
      'Dieu notre Père, tu as voulu que ton Fils grandisse dans une famille ; bénis nos foyers et garde-les unis dans ton amour. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Pour les jeunes',
    pu(
      'Journée mondiale de la jeunesse · rentrée de l’aumônerie',
      'Seigneur, accompagne ta jeunesse.',
      'Confions au Seigneur les jeunes de notre paroisse et du monde.',
      [
        [
          LECTEUR,
          'Pour les jeunes en quête de sens : qu’ils rencontrent des témoins qui les écoutent sans les juger, prions.',
        ],
        [
          LECTEUR,
          'Pour les élèves et étudiants en période d’examen : que le Seigneur leur donne sérénité et persévérance, prions.',
        ],
        [
          LECTEUR,
          'Pour les jeunes sans emploi ou sans perspective : que notre société leur ouvre des portes, prions.',
        ],
        [
          LECTEUR,
          'Pour les animateurs, catéchistes et accompagnateurs : qu’ils soient fidèles à leur mission, prions.',
        ],
      ],
      'Seigneur Jésus, toi qui as appelé de jeunes pêcheurs à te suivre, entends notre prière pour les jeunes d’aujourd’hui. Toi qui règnes pour les siècles des siècles. Amen.',
    ),
  ],
  [
    'Prière universelle — Funérailles',
    pu(
      'Messe de funérailles',
      'Seigneur, accueille-le dans ta paix.',
      'Dans la foi en la résurrection, prions pour notre frère (notre sœur) N. et pour tous ceux qui sont dans l’épreuve.',
      [
        [
          LECTEUR,
          'Pour N., qui nous a quittés : que le Seigneur l’accueille dans sa lumière et lui donne la joie sans fin, prions.',
        ],
        [
          LECTEUR,
          'Pour sa famille, ses amis et tous ceux qui le pleurent : que la foi les console et la fraternité les soutienne, prions.',
        ],
        [
          LECTEUR,
          'Pour tous nos défunts, surtout ceux qui n’ont personne pour prier pour eux : que Dieu les reçoive dans son amour, prions.',
        ],
        [
          LECTEUR,
          'Pour nous qui sommes encore sur la route : que le souvenir de nos défunts nous apprenne à vivre dans l’amour, prions.',
        ],
      ],
      'Dieu de miséricorde, tu ne nous laisses pas dans la nuit de la mort ; accueille notre frère (notre sœur) dans ton Royaume. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Mariage',
    pu(
      'Célébration de mariage',
      'Seigneur, entends nos prières.',
      'Prions le Seigneur pour N. et N. qui s’engagent aujourd’hui, et pour tous les couples du monde.',
      [
        [LECTEUR, 'Pour N. et N. : que leur amour soit fidèle, patient et joyeux, prions.'],
        [
          LECTEUR,
          'Pour leurs familles : qu’elles les entourent de bienveillance et de confiance, prions.',
        ],
        [
          LECTEUR,
          'Pour les couples qui traversent une épreuve : que le Seigneur leur redonne la tendresse des commencements, prions.',
        ],
        [
          LECTEUR,
          'Pour toute l’assemblée : que notre joie de ce jour soit partagée avec les plus pauvres, prions.',
        ],
      ],
      'Dieu notre Père, toi qui as créé l’homme et la femme pour s’aimer, bénis ce couple et conduis-le dans la paix. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Baptême',
    pu(
      'Célébration de baptême',
      'Seigneur, entends notre prière.',
      'Nous allons accueillir N. dans la famille des enfants de Dieu ; prions pour lui et pour toute l’Église.',
      [
        [
          LECTEUR,
          'Pour N. qui va être baptisé : qu’il grandisse dans la foi et l’amitié de Jésus, prions.',
        ],
        [
          LECTEUR,
          'Pour ses parents, son parrain et sa marraine : qu’ils lui transmettent l’Évangile par leur vie, prions.',
        ],
        [LECTEUR, 'Pour tous les baptisés : qu’ils soient fidèles à la grâce reçue, prions.'],
        [
          LECTEUR,
          'Pour les enfants du monde qui n’ont pas encore entendu parler de Jésus : que des témoins se lèvent, prions.',
        ],
      ],
      'Dieu notre Père, toi qui nous fais renaître par l’eau et l’Esprit Saint, accompagne cet enfant sur son chemin. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Rentrée paroissiale',
    pu(
      'Messe de rentrée de la paroisse · septembre',
      'Seigneur, rassemble ton peuple.',
      'En ce début d’année pastorale, confions au Seigneur notre communauté et ses projets.',
      [
        [
          LECTEUR,
          'Pour notre curé, ses vicaires et les membres du conseil paroissial : que l’Esprit les guide, prions.',
        ],
        [
          LECTEUR,
          'Pour les catéchistes, les animateurs, les chorales et toutes les équipes : que leur service porte du fruit, prions.',
        ],
        [
          LECTEUR,
          'Pour les nouveaux arrivants dans notre paroisse : qu’ils trouvent ici un accueil chaleureux, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui reprennent l’école ou le travail : que Dieu soit avec eux tous les jours, prions.',
        ],
      ],
      'Seigneur, toi qui as promis d’être au milieu de nous quand nous sommes réunis en ton nom, bénis cette nouvelle année pastorale. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Migrants et réfugiés',
    pu(
      'Journée mondiale du migrant et du réfugié',
      'Seigneur, ouvre nos cœurs à l’étranger.',
      'Le Seigneur nous demande d’accueillir l’étranger : prions pour tous ceux qui ont dû quitter leur terre.',
      [
        [
          LECTEUR,
          'Pour les migrants et les réfugiés qui risquent leur vie sur les routes : que Dieu les protège, prions.',
        ],
        [
          LECTEUR,
          'Pour les pays d’accueil et leurs dirigeants : qu’ils accueillent avec humanité et justice, prions.',
        ],
        [
          LECTEUR,
          'Pour les familles séparées par l’exil : que le Seigneur leur permette de se retrouver, prions.',
        ],
        [
          LECTEUR,
          'Pour nos communautés : que nous sachions voir dans l’étranger un frère, prions.',
        ],
      ],
      'Dieu, Père de tous les hommes, toi qui as connu l’exil en Jésus, accueille la prière de ton peuple. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Création et environnement',
    pu(
      'Temps pour la création · dimanche de la Création',
      'Seigneur, garde ta création.',
      'Le monde est un don de Dieu ; prions pour le protéger et le partager.',
      [
        [LECTEUR, 'Pour la terre, l’eau et l’air : que nous apprenions à en prendre soin, prions.'],
        [
          LECTEUR,
          'Pour les agriculteurs, les pêcheurs et tous ceux qui travaillent la terre : que le fruit de leur travail soit juste et partagé, prions.',
        ],
        [
          LECTEUR,
          'Pour les responsables qui décident de l’avenir de la planète : qu’ils agissent avec courage, prions.',
        ],
        [
          LECTEUR,
          'Pour chacun de nous : qu’un geste simple, aujourd’hui, devienne une habitude, prions.',
        ],
      ],
      'Dieu Créateur, tu as confié la terre à notre garde ; donne-nous un cœur reconnaissant et responsable. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Fête patronale',
    pu(
      'Fête du saint patron de la paroisse',
      'Seigneur, par l’intercession de notre saint patron, exauce-nous.',
      'En cette fête de notre paroisse, élevons vers le Seigneur notre prière confiante.',
      [
        [
          LECTEUR,
          'Pour notre paroisse, ses prêtres et ses fidèles : que l’exemple de notre saint patron soit pour nous un chemin d’Évangile, prions.',
        ],
        [
          LECTEUR,
          'Pour les familles de notre quartier : que la joie de cette fête les rapproche, prions.',
        ],
        [
          LECTEUR,
          'Pour les malades, les pauvres et tous ceux qui sont seuls dans notre paroisse : que nous ne les oublions pas, prions.',
        ],
        [
          LECTEUR,
          'Pour nos défunts, bienfaiteurs de la paroisse : que Dieu leur donne la paix, prions.',
        ],
      ],
      'Dieu notre Père, tu nous donnes dans les saints des amis et des modèles ; exauce notre prière par leur intercession. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Pour l’unité des chrétiens',
    pu(
      'Semaine de prière pour l’unité des chrétiens · janvier',
      'Seigneur, qu’ils soient un.',
      'Jésus a prié pour que tous soient un ; unissons notre prière à la sienne.',
      [
        [
          LECTEUR,
          'Pour toutes les Églises chrétiennes : qu’elles grandissent dans le respect mutuel et la communion, prions.',
        ],
        [
          LECTEUR,
          'Pour ceux qui travaillent au dialogue entre chrétiens et au rapprochement des religions : qu’ils soient soutenus par l’Esprit, prions.',
        ],
        [
          LECTEUR,
          'Pour les familles où les croyances sont différentes : que l’amour soit leur lien, prions.',
        ],
        [LECTEUR, 'Pour nous : que nous soyons sensibles à tout ce qui nous unit, prions.'],
      ],
      'Père, toi qui as voulu que tes enfants soient un, rassemble ce qui est dispersé et fais de nous un seul peuple. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
  [
    'Prière universelle — Action de grâce',
    pu(
      'Messe d’action de grâce · récolte, anniversaire, jubilé',
      'Nous te rendons grâce, Seigneur.',
      'Avant de demander, rendons grâce : notre Dieu est un Dieu qui comble ses enfants.',
      [
        [
          LECTEUR,
          'Pour les bienfaits reçus cette année, grands et petits : merci, Seigneur, nous te prions.',
        ],
        [
          LECTEUR,
          'Pour la vie de notre communauté, ses réussites et ses épreuves traversées ensemble : nous te rendons grâce.',
        ],
        [
          LECTEUR,
          'Pour ceux qui nous ont précédés dans la foi et nous ont transmis l’Évangile : nous te rendons grâce.',
        ],
        [
          LECTEUR,
          'Pour ceux qui ont encore besoin de ton secours : que ta bonté ne leur fasse pas défaut, nous te prions.',
        ],
      ],
      'Dieu notre Père, de qui vient tout bien, reçois notre action de grâce et continue de bénir ton peuple. Par Jésus Christ, notre Seigneur. Amen.',
    ),
  ],
];
