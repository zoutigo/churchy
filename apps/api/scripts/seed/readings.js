const { p, em, strong } = require('./html');

/** Lecture de démonstration : introduction, récit résumé, conclusion « Parole du Seigneur ». */
const reading = (ref, when, intro, paras) =>
  [
    p(em(`${ref} · ${when} · texte résumé pour la démonstration (non liturgique)`)),
    p(strong(intro)),
    ...paras.map(p),
    p(strong('Parole du Seigneur. — Nous rendons grâce à Dieu.')),
  ].join('');

module.exports = [
  [
    'Lecture — Au commencement (Genèse)',
    reading('Gn 1, 1-5 ; 1, 26-31', 'veillée pascale', 'Lecture du livre de la Genèse', [
      'Au commencement, Dieu créa le ciel et la terre. La terre était informe et vide, les ténèbres couvraient l’abîme, et l’Esprit de Dieu planait sur les eaux.',
      'Dieu dit : « Que la lumière soit ! » Et la lumière fut. Dieu vit que la lumière était bonne ; il sépara la lumière des ténèbres. Il appela la lumière « jour » et les ténèbres « nuit ». Il y eut un soir, il y eut un matin : premier jour.',
      'Puis Dieu créa l’homme à son image, homme et femme il les créa. Et Dieu vit tout ce qu’il avait fait : cela était très bon.',
    ]),
  ],
  [
    'Lecture — Le sacrifice d’Abraham',
    reading(
      'Gn 22, 1-18',
      '2e dimanche de Carême, veillée pascale',
      'Lecture du livre de la Genèse',
      [
        'Dieu mit Abraham à l’épreuve. Il lui dit : « Abraham ! » Il répondit : « Me voici. » — « Prends ton fils, ton unique, Isaac, celui que tu aimes, va au pays de Moriah et offre-le en sacrifice sur la montagne que je t’indiquerai. »',
        'Abraham se leva de bon matin, prit du bois, son fils Isaac, et partit. Sur le chemin, Isaac demanda : « Père, voici le feu et le bois ; où est l’agneau pour l’holocauste ? » Abraham répondit : « Dieu y pourvoira, mon fils. »',
        'Au moment où il étendait la main, l’ange du Seigneur l’appela du ciel : « Abraham, ne porte pas la main sur l’enfant ! Je sais maintenant que tu crains Dieu : tu ne m’as pas refusé ton fils, ton unique. »',
      ],
    ),
  ],
  [
    'Lecture — Le buisson ardent',
    reading('Ex 3, 1-8a.13-15', '3e dimanche de Carême', 'Lecture du livre de l’Exode', [
      'Moïse était berger du troupeau de son beau-père Jéthro. Il mena le troupeau au-delà du désert et parvint à l’Horeb, la montagne de Dieu. L’ange du Seigneur lui apparut dans la flamme d’un buisson : le buisson brûlait sans se consumer.',
      'Dieu l’appela : « Moïse ! Moïse ! — Me voici. — N’approche pas d’ici : retire tes sandales, car le lieu où tu te tiens est une terre sainte. J’ai vu la misère de mon peuple en Égypte, j’ai entendu ses cris, je connais ses souffrances. Je descends pour le délivrer. »',
      'Moïse demande son nom. Dieu répond : « Je suis celui qui suis. Tu parleras ainsi aux fils d’Israël : “Celui qui s’appelle ‘Je suis’ m’a envoyé vers vous.” »',
    ]),
  ],
  [
    'Lecture — Les dix paroles',
    reading('Ex 20, 1-17', '3e dimanche de Carême', 'Lecture du livre de l’Exode', [
      'Dieu prononça toutes les paroles que voici : « Je suis le Seigneur ton Dieu, qui t’ai fait sortir du pays d’Égypte, de la maison d’esclavage. Tu n’auras pas d’autres dieux que moi. »',
      'Tu ne prononceras pas à tort le nom du Seigneur. Tu feras du sabbat un jour consacré à Dieu. Honore ton père et ta mère. Tu ne commettras pas de meurtre, tu ne commettras pas d’adultère, tu ne commettras pas de vol, tu ne porteras pas de faux témoignage contre ton prochain, tu ne convoiteras pas la maison de ton prochain.',
      'Ces paroles sont un chemin de liberté donné à un peuple libéré : elles protègent l’alliance avec Dieu et la vie fraternelle.',
    ]),
  ],
  [
    'Lecture — Choisis la vie',
    reading('Dt 30, 15-20', '6e dimanche du temps ordinaire', 'Lecture du livre du Deutéronome', [
      'Moïse disait au peuple : « Vois, je mets aujourd’hui devant toi la vie et le bonheur, ou bien la mort et le malheur. Si tu écoutes les commandements du Seigneur ton Dieu, tu vivras et tu deviendras nombreux. »',
      '« Mais si ton cœur se détourne et refuse d’écouter, si tu te laisses entraîner à te prosterner devant d’autres dieux, je vous le déclare : vous périrez. J’ai mis devant toi la vie et la mort, la bénédiction et la malédiction. Choisis donc la vie, pour que vous viviez, toi et ta descendance. »',
    ]),
  ],
  [
    'Lecture — Élie à l’Horeb',
    reading(
      '1 R 19, 9a.11-13a',
      '19e dimanche du temps ordinaire',
      'Lecture du premier livre des Rois',
      [
        'Élie, arrivé à l’Horeb, la montagne de Dieu, entra dans une caverne pour y passer la nuit. La parole du Seigneur lui fut adressée : « Sors et tiens-toi sur la montagne devant le Seigneur. Il va passer. »',
        'Il y eut un ouragan, si fort qu’il fendait les montagnes ; mais le Seigneur n’était pas dans l’ouragan. Puis un tremblement de terre, mais le Seigneur n’était pas dans le tremblement de terre. Puis un feu ; le Seigneur n’était pas dans le feu.',
        'Et après le feu, le murmure d’une brise légère. Quand Élie l’entendit, il se couvrit le visage avec son manteau, sortit et se tint à l’entrée de la caverne.',
      ],
    ),
  ],
  [
    'Lecture — La vocation d’Isaïe',
    reading(
      'Is 6, 1-2a.3-8',
      '5e dimanche du temps ordinaire',
      'Lecture du livre du prophète Isaïe',
      [
        'L’année de la mort du roi Ozias, je vis le Seigneur : il siégeait sur un trône très élevé ; les pans de son manteau remplissaient le Temple. Des séraphins se tenaient au-dessus de lui, et ils criaient l’un à l’autre : « Saint, saint, saint est le Seigneur de l’univers ! Toute la terre est remplie de sa gloire. »',
        'Je dis alors : « Malheur à moi ! je suis perdu, car je suis un homme aux lèvres impures. » L’un des séraphins vola vers moi, tenant un charbon brûlant, toucha ma bouche : « Ta faute est enlevée, ton péché est pardonné. »',
        'J’entendis la voix du Seigneur : « Qui enverrai-je ? Qui sera notre messager ? » Et j’ai répondu : « Me voici : envoie-moi ! »',
      ],
    ),
  ],
  [
    'Lecture — Un enfant nous est né',
    reading('Is 9, 1-6', 'messe de la nuit de Noël', 'Lecture du livre du prophète Isaïe', [
      'Le peuple qui marchait dans les ténèbres a vu une grande lumière ; sur ceux qui habitaient le pays de l’ombre, une lumière a resplendi. Tu as prodigué la joie, tu as fait grandir l’allégresse.',
      'Car le joug qui pesait sur lui, le bâton qui meurtrissait son épaule, tu les as brisés. Oui, un enfant nous est né, un fils nous est donné ! Sur son épaule est le signe du pouvoir ; son nom est proclamé : Conseiller-merveilleux, Dieu-fort, Père-éternel, Prince-de-la-paix.',
      'Pour que s’étende son pouvoir, pour que s’établisse une paix sans fin, il aura le droit et la justice, dès maintenant et pour toujours.',
    ]),
  ],
  [
    'Lecture — Venez, achetez sans argent',
    reading(
      'Is 55, 1-11',
      'veillée pascale, 18e dimanche du temps ordinaire',
      'Lecture du livre du prophète Isaïe',
      [
        'Vous tous qui avez soif, venez, voici de l’eau ! Même si vous n’avez pas d’argent, venez acheter du vin et du lait sans rien payer. Pourquoi dépenser votre argent pour ce qui ne nourrit pas ? Écoutez-moi bien, et vous mangerez de bonnes choses.',
        'Cherchez le Seigneur tant qu’il se laisse trouver. Que le méchant abandonne son chemin, et il sera pardonné. Car mes pensées ne sont pas vos pensées, mes chemins ne sont pas vos chemins.',
        'Comme la pluie et la neige descendent du ciel et n’y retournent pas sans avoir arrosé la terre, ainsi ma parole ne me reviendra pas sans effet : elle accomplira ce que je veux.',
      ],
    ),
  ],
  [
    'Lecture — La vocation de Jérémie',
    reading(
      'Jr 1, 4-10',
      '4e dimanche du temps ordinaire',
      'Lecture du livre du prophète Jérémie',
      [
        'La parole du Seigneur me fut adressée : « Avant même de te façonner dans le sein de ta mère, je te connaissais ; avant que tu viennes au jour, je t’avais consacré, je fis de toi un prophète pour les nations. »',
        'Je répondis : « Ah ! Seigneur Dieu, je ne sais pas parler, je suis un enfant. » Le Seigneur me dit : « Ne dis pas : “Je suis un enfant.” Là où je t’envoie, tu iras ; ce que je t’ordonne, tu le diras. N’aie pas peur, car je suis avec toi pour te délivrer. »',
        'Le Seigneur étendit la main, toucha ma bouche et me dit : « Voici que je mets dans ta bouche mes paroles. »',
      ],
    ),
  ],
  [
    'Lecture — Les ossements desséchés',
    reading('Ez 37, 1-14', '5e dimanche de Carême', 'Lecture du livre du prophète Ézékiel', [
      'La main du Seigneur fut sur moi, et son esprit me conduisit au milieu d’une vallée remplie d’ossements très nombreux et très desséchés. « Fils d’homme, ces ossements vont-ils revivre ? — Seigneur, tu le sais. »',
      '« Prophétise sur ces ossements : Ossements desséchés, écoutez la parole du Seigneur. Je vais faire entrer en vous le souffle, et vous vivrez. » Il y eut un grand bruit, les os se rapprochèrent, des nerfs apparurent, la chair se forma, puis la peau les recouvrit. Le souffle vint, et ils se dressèrent, une armée immense.',
      '« Je mettrai en vous mon esprit, et vous vivrez, et je vous installerai sur votre terre. Vous saurez que je suis le Seigneur. »',
    ]),
  ],
  [
    'Lecture — Les âmes des justes',
    reading(
      'Sg 3, 1-9',
      'funérailles, commémoration des défunts',
      'Lecture du livre de la Sagesse',
      [
        'La vie des justes est dans la main de Dieu, aucun tourment n’a de prise sur eux. Aux yeux des insensés, ils ont paru mourir ; leur départ est regardé comme un malheur, leur éloignement, comme une destruction. Mais ils sont dans la paix.',
        'Aux yeux des hommes, ils subissaient un châtiment, mais l’espérance de l’immortalité les comblait. Après de faibles peines, ils recevront de grands bienfaits, car Dieu les a mis à l’épreuve et les a trouvés dignes de lui.',
        'Ceux qui ont confiance en lui comprendront la vérité, et les fidèles demeureront près de lui dans l’amour, car il réserve grâce et miséricorde à ses élus.',
      ],
    ),
  ],
  [
    'Lecture — Fils de Dieu par l’Esprit',
    reading(
      'Rm 8, 14-17',
      'solennité de la Sainte Trinité, Pentecôte',
      'Lecture de la lettre de saint Paul apôtre aux Romains',
      [
        'Frères, tous ceux qui se laissent conduire par l’Esprit de Dieu sont fils de Dieu. Vous n’avez pas reçu un esprit qui fait de vous des esclaves et vous ramène à la peur ; mais vous avez reçu un Esprit qui fait de vous des fils ; et c’est en lui que nous crions « Abba ! », c’est-à-dire : Père !',
        'C’est donc l’Esprit Saint lui-même qui atteste à notre esprit que nous sommes enfants de Dieu. Puisque nous sommes enfants, nous sommes héritiers : héritiers de Dieu, héritiers avec le Christ, si du moins nous souffrons avec lui pour être avec lui dans la gloire.',
      ],
    ),
  ],
  [
    'Lecture — Un sacrifice vivant',
    reading(
      'Rm 12, 1-8',
      '22e dimanche du temps ordinaire',
      'Lecture de la lettre de saint Paul apôtre aux Romains',
      [
        'Frères, je vous exhorte, par la tendresse de Dieu, à vous offrir vous-mêmes en sacrifice vivant, saint, capable de plaire à Dieu : c’est là pour vous la juste manière de lui rendre un culte. Ne vous modelez pas sur le monde présent, mais transformez-vous en renouvelant votre façon de penser.',
        'Comme dans un seul corps nous avons plusieurs membres, ainsi, nous qui sommes plusieurs, nous sommes un seul corps dans le Christ. Nous avons des dons différents : celui qui enseigne, qu’il enseigne ; celui qui exhorte, qu’il exhorte ; celui qui donne, qu’il donne avec simplicité ; celui qui exerce la miséricorde, qu’il le fasse avec joie.',
      ],
    ),
  ],
  [
    'Lecture — Un seul corps, plusieurs membres',
    reading(
      '1 Co 12, 12-30',
      '3e dimanche du temps ordinaire',
      'Lecture de la première lettre de saint Paul apôtre aux Corinthiens',
      [
        'Frères, prenons une comparaison : notre corps est un, il a pourtant plusieurs membres, et tous les membres, malgré leur nombre, ne forment qu’un seul corps. Il en est de même pour le Christ. C’est dans un unique Esprit que nous tous avons été baptisés pour former un seul corps.',
        'L’œil ne peut pas dire à la main : « Je n’ai pas besoin de toi » ; ni la tête aux pieds. Au contraire, les membres du corps qui paraissent les plus faibles sont indispensables. Si un membre souffre, tous les membres partagent sa souffrance ; si un membre est à l’honneur, tous partagent sa joie.',
        'Or, vous êtes corps du Christ et, chacun pour votre part, vous êtes membres de ce corps.',
      ],
    ),
  ],
  [
    'Lecture — Hymne à la charité',
    reading(
      '1 Co 13, 1-13',
      '4e dimanche du temps ordinaire, mariages',
      'Lecture de la première lettre de saint Paul apôtre aux Corinthiens',
      [
        'Frères, j’aurais beau parler les langues des hommes et celle des anges, si je n’ai pas la charité, je ne suis qu’un cuivre qui résonne ou une cymbale retentissante. Quand j’aurais le don de prophétie, la plénitude de la foi, si je n’ai pas la charité, je ne suis rien.',
        'La charité est patiente, la charité rend service, elle ne jalouse pas, elle ne se vante pas, elle ne s’enfle pas d’orgueil ; elle ne fait rien d’inconvenant, ne cherche pas son intérêt, ne s’emporte pas, ne ressasse pas le mal. Elle excuse tout, elle croit tout, elle espère tout, elle supporte tout.',
        'Les prophéties seront dépassées, le don des langues cessera. Maintenant donc demeurent foi, espérance et charité, ces trois-là ; mais la plus grande des trois, c’est la charité.',
      ],
    ),
  ],
  [
    'Lecture — Un seul Corps, un seul Esprit',
    reading(
      'Ep 4, 1-6',
      '18e dimanche du temps ordinaire',
      'Lecture de la lettre de saint Paul apôtre aux Éphésiens',
      [
        'Frères, moi qui suis prisonnier à cause du Seigneur, je vous encourage à vous conduire d’une manière digne de l’appel que vous avez reçu : avec humilité, douceur et patience, supportez-vous les uns les autres avec amour. Ayez soin de garder l’unité dans l’Esprit par le lien de la paix.',
        'Il y a un seul Corps et un seul Esprit, comme il y a une seule espérance au terme de l’appel que vous avez reçu. Un seul Seigneur, une seule foi, un seul baptême. Un seul Dieu et Père de tous, au-dessus de tous, par tous, et en tous.',
      ],
    ),
  ],
  [
    'Lecture — Hymne au Christ',
    reading(
      'Ph 2, 6-11',
      'dimanche des Rameaux, Exaltation de la Croix',
      'Lecture de la lettre de saint Paul apôtre aux Philippiens',
      [
        'Le Christ Jésus, ayant la condition de Dieu, ne retint pas jalousement le rang qui l’égalait à Dieu. Mais il s’anéantit lui-même, prenant la condition de serviteur, devenant semblable aux hommes. Reconnu homme à son aspect, il s’est abaissé, devenant obéissant jusqu’à la mort, et à la mort sur une croix.',
        'C’est pourquoi Dieu l’a exalté : il l’a doté du Nom qui est au-dessus de tout nom, afin qu’au nom de Jésus tout genou fléchisse, au ciel, sur terre et aux enfers, et que toute langue proclame : « Jésus Christ est Seigneur », à la gloire de Dieu le Père.',
      ],
    ),
  ],
  [
    'Lecture — La foi sans les œuvres',
    reading(
      'Jc 2, 14-26',
      '24e dimanche du temps ordinaire',
      'Lecture de la lettre de saint Jacques',
      [
        'Mes frères, si quelqu’un prétend avoir la foi sans la mettre en œuvre, à quoi cela sert-il ? Cette foi peut-elle le sauver ? Supposons qu’un frère ou une sœur n’ait pas de quoi s’habiller, ni de quoi manger tous les jours. Si l’un de vous leur dit : « Allez en paix, mettez-vous au chaud, mangez à votre faim », sans leur donner ce qui est nécessaire à leur corps, à quoi cela sert-il ?',
        'Ainsi, la foi, si elle n’est pas mise en œuvre, est bel et bien morte. Montre-moi donc ta foi sans les œuvres ; moi, c’est par mes œuvres que je te montrerai ma foi.',
      ],
    ),
  ],
  [
    'Lecture — Les Actes : la première communauté',
    reading('Ac 2, 42-47', '2e dimanche de Pâques', 'Lecture du livre des Actes des Apôtres', [
      'Les frères étaient assidus à l’enseignement des Apôtres et à la communion fraternelle, à la fraction du pain et aux prières. La crainte de Dieu était dans tous les cœurs, et les Apôtres faisaient beaucoup de prodiges et de signes.',
      'Tous les croyants vivaient ensemble, et ils avaient tout en commun ; ils vendaient leurs propriétés et leurs biens, et en partageaient le produit entre tous en fonction des besoins de chacun. Chaque jour, d’un seul cœur, ils fréquentaient le Temple, ils rompaient le pain dans leurs maisons, et ils prenaient leur nourriture avec allégresse et simplicité de cœur.',
      'Ils louaient Dieu et avaient la faveur de tout le peuple. Chaque jour, le Seigneur leur adjoignait ceux qui allaient être sauvés.',
    ]),
  ],
];
