const { p, strong, em, lines } = require('./html');

const psalm = (ref, occasion, refrain, verses) =>
  [
    p(em(`${ref} · ${occasion} · paraphrase de démonstration`)),
    p(`${strong('Refrain :')} ${refrain}`),
    ...verses.map((v) => lines(v)),
    p(em('Reprise du refrain par l’assemblée.')),
  ].join('');

module.exports = [
  [
    'Psaume 22 — Le Seigneur est mon berger',
    psalm(
      'Ps 22',
      '4e dimanche de Pâques, funérailles',
      'Le Seigneur est mon berger : je ne manque de rien.',
      [
        [
          'Il me conduit vers des eaux paisibles,',
          'il me fait reposer sur des prairies d’herbe fraîche.',
          'Il refait mes forces et me guide sur le bon chemin.',
        ],
        [
          'Même dans la vallée de l’ombre, je ne crains aucun mal,',
          'car tu es avec moi : ton bâton me rassure.',
        ],
        [
          'Tu prépares la table pour moi, face à mes adversaires,',
          'ma coupe déborde, ta bonté m’accompagne chaque jour.',
        ],
      ],
    ),
  ],
  [
    'Psaume 8 — Que ton nom est grand',
    psalm(
      'Ps 8',
      'solennité de la Sainte Trinité',
      'Que ton nom est grand, Seigneur, sur toute la terre !',
      [
        [
          'Quand je regarde le ciel, œuvre de tes doigts,',
          'la lune et les étoiles que tu as fixées,',
          'qu’est-ce que l’homme pour que tu penses à lui ?',
        ],
        [
          'Tu l’as fait si peu inférieur aux anges,',
          'tu l’as couronné de gloire et d’honneur,',
          'tu lui as confié les œuvres de tes mains.',
        ],
      ],
    ),
  ],
  [
    'Psaume 26 — Le Seigneur est ma lumière',
    psalm(
      'Ps 26',
      '3e dimanche du temps ordinaire, Carême',
      'Le Seigneur est ma lumière et mon salut.',
      [
        [
          'Le Seigneur est ma lumière et mon salut :',
          'de qui aurais-je crainte ? Il est le rempart de ma vie.',
        ],
        [
          'Une chose que je demande, que je cherche :',
          'habiter la maison du Seigneur tous les jours de ma vie.',
        ],
        [
          'J’en suis sûr, je verrai les bontés du Seigneur',
          'sur la terre des vivants. Espère le Seigneur, sois fort !',
        ],
      ],
    ),
  ],
  [
    'Psaume 33 — Goûtez et voyez',
    psalm(
      'Ps 33',
      'communion, 19e dimanche du temps ordinaire',
      'Goûtez et voyez : le Seigneur est bon.',
      [
        ['Je bénirai le Seigneur en tout temps,', 'sa louange sera toujours sur mes lèvres.'],
        [
          'Mon âme se glorifie dans le Seigneur :',
          'que les pauvres m’entendent et soient en fête.',
        ],
        ['Cherchez le Seigneur, il vous répond,', 'il vous délivre de toutes vos frayeurs.'],
      ],
    ),
  ],
  [
    'Psaume 41 — Mon âme a soif',
    psalm(
      'Ps 41',
      'veillée pascale, Carême',
      'Mon âme a soif du Dieu vivant : quand pourrai-je voir sa face ?',
      [
        ['Comme la biche désire l’eau vive,', 'ainsi mon âme te désire, ô mon Dieu.'],
        [
          'Envoie ta lumière et ta vérité : qu’elles me guident,',
          'qu’elles me conduisent à ta montagne sainte.',
        ],
        [
          'J’irai jusqu’à l’autel de Dieu, vers Dieu qui est ma joie,',
          'et je te rendrai grâce, Seigneur, mon Dieu.',
        ],
      ],
    ),
  ],
  [
    'Psaume 50 — Pitié, Seigneur',
    psalm(
      'Ps 50',
      '1er dimanche de Carême, mercredi des Cendres',
      'Pitié, Seigneur, car nous avons péché.',
      [
        [
          'Pitié pour moi, mon Dieu, dans ton amour,',
          'selon ta grande miséricorde, efface mon péché.',
        ],
        ['Lave-moi tout entier de ma faute,', 'purifie-moi de mon offense.'],
        ['Crée en moi un cœur pur, ô mon Dieu,', 'renouvelle en moi un esprit ferme.'],
      ],
    ),
  ],
  [
    'Psaume 62 — Mon âme est assoiffée de toi',
    psalm('Ps 62', '12e dimanche du temps ordinaire', 'Mon âme a soif de toi, Seigneur mon Dieu.', [
      [
        'Dieu, tu es mon Dieu, je te cherche dès l’aurore,',
        'mon âme a soif de toi comme une terre aride, sans eau.',
      ],
      ['Ton amour vaut mieux que la vie :', 'mes lèvres diront ta louange.'],
      ['Toute ma vie je vais te bénir,', 'lever les mains en invoquant ton nom.'],
    ]),
  ],
  [
    'Psaume 83 — Heureux les habitants de ta maison',
    psalm(
      'Ps 83',
      'dédicace d’une église, 30e dimanche',
      'Heureux les habitants de ta maison, Seigneur !',
      [
        [
          'Que tes demeures sont aimables, Seigneur de l’univers !',
          'Mon âme s’épuise à désirer les parvis du Seigneur.',
        ],
        [
          'Même le passereau trouve une maison, l’hirondelle un nid,',
          'près de tes autels, Seigneur, mon roi et mon Dieu.',
        ],
        [
          'Un jour dans tes parvis vaut mieux que mille ailleurs,',
          'je préfère le seuil de la maison de Dieu.',
        ],
      ],
    ),
  ],
  [
    'Psaume 94 — Aujourd’hui, écoutez sa voix',
    psalm(
      'Ps 94',
      'invitatoire, 3e dimanche de Carême',
      'Aujourd’hui, ne fermez pas votre cœur, mais écoutez la voix du Seigneur.',
      [
        ['Venez, crions de joie pour le Seigneur,', 'acclamons le rocher de notre salut.'],
        [
          'Entrez, inclinons-nous, prosternons-nous,',
          'car il est notre Dieu, nous sommes son peuple.',
        ],
        ['Ne fermez pas votre cœur comme au désert,', 'quand vos pères m’ont mis à l’épreuve.'],
      ],
    ),
  ],
  [
    'Psaume 99 — Nous sommes son peuple',
    psalm(
      'Ps 99',
      'entrée, 4e dimanche du temps ordinaire',
      'Nous sommes son peuple, son troupeau.',
      [
        [
          'Acclamez le Seigneur, terre entière,',
          'servez-le dans l’allégresse, venez à lui avec des chants de joie.',
        ],
        ['Sachez que le Seigneur est Dieu :', 'il nous a faits, et nous sommes à lui.'],
        [
          'Entrez dans ses portes en rendant grâce,',
          'dans ses cours avec la louange : bénissez son nom.',
        ],
      ],
    ),
  ],
  [
    'Psaume 102 — Le Seigneur est tendresse et pitié',
    psalm(
      'Ps 102',
      '8e dimanche du temps ordinaire, Carême',
      'Le Seigneur est tendresse et pitié.',
      [
        ['Bénis le Seigneur, ô mon âme,', 'n’oublie aucun de ses bienfaits.'],
        ['Il pardonne toutes tes offenses,', 'il guérit toute maladie.'],
        [
          'Comme un père a de la tendresse pour ses fils,',
          'le Seigneur a de la tendresse pour ceux qui le craignent.',
        ],
      ],
    ),
  ],
  [
    'Psaume 103 — Seigneur, envoie ton Esprit',
    psalm(
      'Ps 103',
      'dimanche de Pentecôte, confirmation',
      'Seigneur, envoie ton Esprit qui renouvelle la face de la terre.',
      [
        [
          'Bénis le Seigneur, ô mon âme, Seigneur mon Dieu, tu es si grand !',
          'Que de richesses dans tes œuvres : la terre en est remplie.',
        ],
        [
          'Tu reprends leur souffle, ils expirent et retournent à leur poussière ;',
          'tu envoies ton souffle, ils sont créés.',
        ],
        ['Gloire au Seigneur à tout jamais !', 'Que le Seigneur se réjouisse de son œuvre.'],
      ],
    ),
  ],
  [
    'Psaume 112 — Béni soit le nom du Seigneur',
    psalm(
      'Ps 112',
      'vêpres, 25e dimanche du temps ordinaire',
      'Béni soit le nom du Seigneur, maintenant et à jamais !',
      [
        [
          'Louez, serviteurs du Seigneur, louez le nom du Seigneur !',
          'Béni soit le nom du Seigneur, maintenant et pour les siècles.',
        ],
        [
          'Du levant au couchant du soleil, loué soit le nom du Seigneur !',
          'Le Seigneur domine tous les peuples.',
        ],
        [
          'Il relève le faible de la poussière,',
          'il tire le pauvre de la misère pour l’asseoir parmi les princes.',
        ],
      ],
    ),
  ],
  [
    'Psaume 117 — Éternel est son amour',
    psalm(
      'Ps 117',
      'jour de Pâques, 2e dimanche de Pâques',
      'Rendez grâce au Seigneur, car il est bon, éternel est son amour.',
      [
        [
          'Que le dise la maison d’Israël :',
          'éternel est son amour !',
          'Que le dise la maison d’Aaron : éternel est son amour !',
        ],
        [
          'Le Seigneur est ma force et mon chant, il est pour moi le salut.',
          'Des cris de joie, de victoire, dans les tentes des justes.',
        ],
        [
          'La pierre qu’avaient rejetée les bâtisseurs',
          'est devenue la pierre d’angle : c’est l’œuvre du Seigneur.',
        ],
      ],
    ),
  ],
  [
    'Psaume 121 — Dans la joie, nous irons',
    psalm(
      'Ps 121',
      '1er dimanche de l’Avent, pèlerinage',
      'Dans la joie, nous irons à la maison du Seigneur.',
      [
        [
          'Quelle joie quand on m’a dit : « Nous irons à la maison du Seigneur ! »',
          'Maintenant notre marche prend fin devant tes portes, Jérusalem.',
        ],
        [
          'Jérusalem, te voici dans tes murs, ville où tout ensemble ne fait qu’un,',
          'là qu’ils montent, les peuples, les tribus du Seigneur.',
        ],
        [
          'Appelez le bonheur sur Jérusalem :',
          'que tes demeures soient dans la paix et la sécurité.',
        ],
      ],
    ),
  ],
  [
    'Psaume 129 — Près du Seigneur est l’amour',
    psalm(
      'Ps 129',
      'défunts, 5e dimanche de Carême',
      'Près du Seigneur est l’amour, près de lui abonde le rachat.',
      [
        ['Des profondeurs je crie vers toi, Seigneur,', 'Seigneur, écoute mon appel !'],
        [
          'Si tu retiens les fautes, Seigneur, Seigneur, qui subsistera ?',
          'Mais près de toi se trouve le pardon.',
        ],
        ['J’espère le Seigneur, mon âme espère sa parole,', 'plus que la garde n’attend l’aurore.'],
      ],
    ),
  ],
  [
    'Psaume 144 — Je bénirai ton nom toujours',
    psalm('Ps 144', '14e dimanche du temps ordinaire', 'Je bénirai ton nom toujours et à jamais.', [
      ['Je t’exalterai, mon Dieu, mon Roi,', 'je bénirai ton nom toujours et à jamais.'],
      ['Le Seigneur est tendresse et pitié,', 'lent à la colère et plein d’amour.'],
      ['Le Seigneur est bon envers tous,', 'ses tendresses vont à toutes ses œuvres.'],
    ]),
  ],
  [
    'Psaume 145 — Le Seigneur fait justice',
    psalm('Ps 145', '26e dimanche du temps ordinaire', 'Le Seigneur fait justice aux opprimés.', [
      [
        'Il garde à jamais sa fidélité,',
        'il fait justice aux opprimés, aux affamés il donne le pain.',
      ],
      ['Le Seigneur délie les enchaînés,', 'le Seigneur ouvre les yeux des aveugles.'],
      [
        'Le Seigneur protège l’étranger, il soutient la veuve et l’orphelin,',
        'il égare les pas du méchant.',
      ],
    ]),
  ],
  [
    'Psaume 150 — Que tout ce qui respire loue le Seigneur',
    psalm(
      'Ps 150',
      'action de grâce, fêtes patronales',
      'Alléluia ! Que tout ce qui respire loue le Seigneur !',
      [
        [
          'Louez Dieu dans son temple saint, louez-le au ciel de sa puissance,',
          'louez-le pour ses actions éclatantes.',
        ],
        [
          'Louez-le sur la harpe et la cithare, louez-le par la danse et le tambourin,',
          'louez-le avec les cordes et les flûtes.',
        ],
        [
          'Louez-le par les cymbales sonores, louez-le par les cymbales triomphantes,',
          'que tout ce qui respire loue le Seigneur !',
        ],
      ],
    ),
  ],
  [
    'Psaume 135 — Éternel est son amour',
    psalm('Ps 135', 'action de grâce, remerciement pour la récolte', 'Éternel est son amour !', [
      ['Rendez grâce au Seigneur, car il est bon,', 'car éternel est son amour.'],
      ['Lui qui fit les cieux avec sagesse,', 'lui qui étendit la terre sur les eaux.'],
      ['Lui qui donne la nourriture à tout vivant,', 'rendez grâce au Dieu du ciel !'],
    ]),
  ],
];
