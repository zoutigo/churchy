const { p, em, lines } = require('./html');

const prayer = (note, paras) =>
  [p(em(note)), ...paras.map((x) => (Array.isArray(x) ? lines(x) : p(x)))].join('');

/** Prières traditionnelles (domaine commun) et prières de la vie paroissiale. */
module.exports = [
  [
    'Je vous salue Marie',
    prayer('Prière à Marie · chapelet, Angélus', [
      [
        'Je vous salue, Marie, pleine de grâce ;',
        'le Seigneur est avec vous.',
        'Vous êtes bénie entre toutes les femmes',
        'et Jésus, le fruit de vos entrailles, est béni.',
      ],
      [
        'Sainte Marie, Mère de Dieu,',
        'priez pour nous, pauvres pécheurs,',
        'maintenant et à l’heure de notre mort.',
        'Amen.',
      ],
    ]),
  ],
  [
    'Notre Père',
    prayer('Prière du Seigneur · messe, chapelet, prière personnelle', [
      [
        'Notre Père, qui es aux cieux,',
        'que ton nom soit sanctifié,',
        'que ton règne vienne,',
        'que ta volonté soit faite sur la terre comme au ciel.',
        'Donne-nous aujourd’hui notre pain de ce jour,',
        'pardonne-nous nos offenses,',
        'comme nous pardonnons aussi à ceux qui nous ont offensés,',
        'et ne nous laisse pas entrer en tentation,',
        'mais délivre-nous du Mal.',
        'Amen.',
      ],
    ]),
  ],
  [
    'Gloire au Père',
    prayer('Doxologie · fin des psaumes, chapelet', [
      ['Gloire au Père, et au Fils, et au Saint-Esprit,', 'pour les siècles des siècles.', 'Amen.'],
    ]),
  ],
  [
    'Symbole des Apôtres (Credo)',
    prayer('Profession de foi · dimanches et fêtes, baptêmes', [
      [
        'Je crois en Dieu, le Père tout-puissant, créateur du ciel et de la terre.',
        'Et en Jésus Christ, son Fils unique, notre Seigneur,',
        'qui a été conçu du Saint-Esprit, est né de la Vierge Marie,',
        'a souffert sous Ponce Pilate, a été crucifié, est mort et a été enseveli,',
        'est descendu aux enfers, le troisième jour est ressuscité des morts,',
        'est monté aux cieux, est assis à la droite de Dieu le Père tout-puissant,',
        'd’où il viendra juger les vivants et les morts.',
      ],
      [
        'Je crois en l’Esprit Saint, à la sainte Église catholique,',
        'à la communion des saints, à la rémission des péchés,',
        'à la résurrection de la chair, à la vie éternelle.',
        'Amen.',
      ],
    ]),
  ],
  [
    'Je confesse à Dieu',
    prayer('Acte pénitentiel · début de la messe', [
      [
        'Je confesse à Dieu tout-puissant,',
        'je reconnais devant mes frères que j’ai péché en pensée, en parole,',
        'par action et par omission ;',
        'oui, j’ai vraiment péché.',
      ],
      [
        'C’est pourquoi je supplie la Vierge Marie, les anges et tous les saints,',
        'et vous aussi, mes frères, de prier pour moi le Seigneur notre Dieu.',
      ],
    ]),
  ],
  [
    'Acte de contrition',
    prayer('Sacrement de la réconciliation · examen du soir', [
      'Mon Dieu, j’ai un très grand regret de t’avoir offensé, parce que tu es infiniment bon, infiniment aimable, et que le péché te déplaît.',
      'Je prends la ferme résolution, avec le secours de ta sainte grâce, de ne plus t’offenser et de faire pénitence.',
      'Pardonne-moi, Seigneur, par les mérites de Jésus Christ, ton Fils, mort pour nous sur la croix.',
    ]),
  ],
  [
    'Prière à l’Esprit Saint',
    prayer('Début de réunion, confirmation, rentrée pastorale', [
      [
        'Viens, Esprit Saint, remplis le cœur de tes fidèles,',
        'et allume en eux le feu de ton amour.',
        'Envoie ton Esprit et tout sera créé,',
        'et tu renouvelleras la face de la terre.',
      ],
      [
        'Ô Dieu, qui as instruit le cœur de tes fidèles par la lumière de l’Esprit Saint,',
        'donne-nous, par ce même Esprit, de goûter ce qui est droit',
        'et de jouir toujours de sa consolation.',
        'Par Jésus Christ, notre Seigneur. Amen.',
      ],
    ]),
  ],
  [
    'Prière de saint François (Seigneur, fais de moi un instrument de ta paix)',
    prayer('Prière attribuée à saint François · 4 octobre, réunions de paix', [
      [
        'Seigneur, fais de moi un instrument de ta paix.',
        'Là où est la haine, que je mette l’amour ;',
        'là où est l’offense, que je mette le pardon ;',
        'là où est la discorde, que je mette l’union ;',
        'là où est l’erreur, que je mette la vérité ;',
        'là où est le doute, que je mette la foi ;',
        'là où est le désespoir, que je mette l’espérance ;',
        'là où sont les ténèbres, que je mette ta lumière ;',
        'là où est la tristesse, que je mette la joie.',
      ],
      [
        'Ô Maître, que je ne cherche pas tant à être consolé qu’à consoler,',
        'à être compris qu’à comprendre, à être aimé qu’à aimer.',
        'Car c’est en donnant qu’on reçoit, c’est en pardonnant qu’on est pardonné,',
        'c’est en mourant qu’on ressuscite à la vie éternelle.',
      ],
    ]),
  ],
  [
    'Souvenez-vous, ô très pieuse Vierge Marie',
    prayer('Prière à Marie · neuvaine, mois de mai', [
      'Souvenez-vous, ô très pieuse Vierge Marie, qu’on n’a jamais entendu dire qu’aucun de ceux qui ont eu recours à votre protection, imploré votre assistance, réclamé votre secours, ait été abandonné.',
      'Animé d’une pareille confiance, ô Vierge des vierges, ô ma Mère, je viens à vous ; gémissant sous le poids de mes péchés, je me prosterne à vos pieds. Ô Mère du Verbe incarné, ne méprisez pas mes prières, mais écoutez-les favorablement et daignez les exaucer. Amen.',
    ]),
  ],
  [
    'Ange de Dieu',
    prayer('Prière à l’ange gardien · prière des enfants', [
      [
        'Ange de Dieu, qui es mon gardien,',
        'et à qui la bonté divine m’a confié,',
        'éclaire-moi, garde-moi, dirige-moi et gouverne-moi.',
        'Amen.',
      ],
    ]),
  ],
  [
    'Bénédicité (avant le repas)',
    prayer('Prière en famille ou en communauté', [
      [
        'Bénis-nous, Seigneur, bénis ce repas,',
        'ceux qui l’ont préparé, et procure du pain à ceux qui n’en ont pas.',
        'Par Jésus Christ, notre Seigneur. Amen.',
      ],
    ]),
  ],
  [
    'Grâces (après le repas)',
    prayer('Prière en famille ou en communauté', [
      [
        'Nous te rendons grâce, Seigneur, pour tous tes bienfaits,',
        'toi qui vis et règnes dans les siècles des siècles.',
        'Que les âmes des fidèles défunts, par la miséricorde de Dieu,',
        'reposent en paix. Amen.',
      ],
    ]),
  ],
  [
    'Prière du matin',
    prayer('Offrande de la journée', [
      [
        'Seigneur, en ce jour qui commence, je te remets ma vie.',
        'Donne-moi de la vivre dans la confiance et la simplicité.',
        'Que mes paroles soient justes, que mes gestes soient doux,',
        'que mon travail serve ceux que j’aime et ceux que je rencontrerai.',
      ],
      [
        'Garde ma famille, mes amis, ma paroisse, mon pays.',
        'Et si cette journée est difficile, donne-moi la force de tenir',
        'et la joie de t’avoir pour compagnon de route. Amen.',
      ],
    ]),
  ],
  [
    'Prière du soir',
    prayer('Relecture de la journée avant le sommeil', [
      [
        'Seigneur, la journée s’achève : merci pour ce que tu m’as donné de vivre.',
        'Je te confie ce qui s’est bien passé, et ce qui est resté inachevé.',
        'Pardonne-moi mes manquements, apaise mes inquiétudes,',
        'et donne-moi un repos qui me remette debout demain.',
      ],
      [
        'Veille sur ceux qui travaillent cette nuit, sur les malades, sur les voyageurs,',
        'sur ceux qui n’ont pas de toit.',
        'Dans tes mains, Seigneur, je remets mon esprit. Amen.',
      ],
    ]),
  ],
  [
    'Angélus',
    prayer('Prière de l’Annonciation · matin, midi, soir', [
      [
        'L’ange du Seigneur apporta l’annonce à Marie,',
        '— et elle conçut du Saint-Esprit.',
        'Je vous salue, Marie…',
      ],
      [
        'Voici la servante du Seigneur,',
        '— qu’il me soit fait selon ta parole.',
        'Je vous salue, Marie…',
      ],
      ['Et le Verbe s’est fait chair,', '— et il a habité parmi nous.', 'Je vous salue, Marie…'],
      [
        'Prie pour nous, sainte Mère de Dieu,',
        '— afin que nous soyons rendus dignes des promesses du Christ.',
      ],
      'Prions : Que ta grâce, Seigneur notre Père, se répande en nos cœurs ; par le message de l’ange, tu nous as fait connaître l’incarnation de ton Fils, conduis-nous, par sa passion et par sa croix, à la gloire de la résurrection. Par Jésus Christ, notre Seigneur. Amen.',
    ]),
  ],
  [
    'Salve Regina (Salut, ô Reine)',
    prayer('Antienne mariale · complies, fin du chapelet', [
      [
        'Salut, ô Reine, mère de miséricorde,',
        'notre vie, notre douceur et notre espérance, salut !',
        'Vers vous nous élevons nos cris, pauvres enfants d’Ève exilés.',
        'Vers vous nous soupirons, gémissant et pleurant dans cette vallée de larmes.',
      ],
      [
        'Ô vous, notre avocate, tournez vers nous vos regards miséricordieux,',
        'et, après cet exil, montrez-nous Jésus, le fruit béni de vos entrailles,',
        'ô clémente, ô miséricordieuse, ô douce Vierge Marie.',
      ],
    ]),
  ],
  [
    'Magnificat',
    prayer('Cantique de Marie · vêpres, fête de l’Assomption · Lc 1, 46-55 (paraphrase)', [
      [
        'Mon âme exalte le Seigneur, exulte mon esprit en Dieu, mon Sauveur !',
        'Il s’est penché sur son humble servante ;',
        'désormais, tous les âges me diront bienheureuse.',
      ],
      [
        'Le Puissant fit pour moi des merveilles ; saint est son nom !',
        'Son amour s’étend d’âge en âge sur ceux qui le craignent.',
      ],
      [
        'Il a déployé la force de son bras, il a dispersé les superbes.',
        'Il a renversé les puissants de leurs trônes, il a élevé les humbles.',
        'Il a comblé de biens les affamés, renvoyé les riches les mains vides.',
      ],
      [
        'Il relève Israël, son serviteur, il se souvient de son amour,',
        'de la promesse faite à nos pères, en faveur d’Abraham et de sa race, à jamais.',
      ],
    ]),
  ],
  [
    'Prière à saint Joseph',
    prayer('Prière à saint Joseph · 19 mars, 1er mai, prière des pères de famille', [
      'Glorieux saint Joseph, époux de Marie, accorde-nous ta protection paternelle. Toi que Dieu a choisi pour garder son Fils, veille sur nos familles, sur ceux qui travaillent, sur ceux qui n’ont pas d’emploi, sur les pères et sur ceux qui en tiennent lieu.',
      'Apprends-nous le silence qui écoute, la fidélité sans bruit, la confiance qui avance dans la nuit. Obtiens-nous une bonne mort, entourés de ceux que nous aimons. Amen.',
    ]),
  ],
  [
    'Prière pour les vocations',
    prayer('Journée mondiale de prière pour les vocations · 4e dimanche de Pâques', [
      [
        'Seigneur Jésus, bon Pasteur, tu appelles chacun par son nom.',
        'Suscite dans nos communautés des prêtres, des diacres, des religieux et des religieuses,',
        'des laïcs engagés au service de ton Évangile.',
      ],
      [
        'Donne à ceux que tu appelles le courage de répondre,',
        'et à nos familles la générosité de les accompagner.',
        'Que chaque baptisé découvre la mission que tu lui confies',
        'et la vive avec joie. Amen.',
      ],
    ]),
  ],
  [
    'Prière pour la paroisse',
    prayer('Prière de rentrée · conseil paroissial · fête patronale', [
      [
        'Père, tu rassembles ton peuple dans cette paroisse.',
        'Fais de nous une communauté accueillante, où chacun a sa place :',
        'les jeunes et les anciens, les familles et les personnes seules,',
        'les gens d’ici et ceux de passage.',
      ],
      [
        'Donne-nous l’audace d’aller vers ceux qui sont loin,',
        'la patience de porter ensemble nos différences,',
        'la joie de célébrer, la simplicité de servir.',
        'Bénis nos prêtres, nos catéchistes, nos chorales, nos équipes et nos bénévoles.',
        'Que notre paroisse soit une maison de prière et un foyer de fraternité. Amen.',
      ],
    ]),
  ],
];
