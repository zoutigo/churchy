const { p, em, strong } = require('./html');

const AUTH = { Mt: 'Matthieu', Mc: 'Marc', Lc: 'Luc', Jn: 'Jean' };
/** Évangile de démonstration : récit résumé avec les formules d'introduction et de conclusion. */
const gospel = (ref, when, paras, reflection) =>
  [
    p(em(`${ref} · ${when} · texte résumé pour la démonstration (non liturgique)`)),
    p(strong(`Évangile de Jésus Christ selon saint ${AUTH[ref.slice(0, 2)]}`)),
    ...paras.map(p),
    p(strong('Acclamons la Parole de Dieu.')),
    p(`${em('Pistes pour l’homélie :')} ${reflection}`),
  ].join('');

module.exports = [
  [
    'Évangile — Les Béatitudes',
    gospel(
      'Mt 5, 1-12a',
      'Toussaint, 4e dimanche du temps ordinaire',
      [
        'Voyant la foule, Jésus gravit la montagne. Il s’assit, ses disciples s’approchèrent, et il se mit à les enseigner.',
        'Il proclame heureux les pauvres de cœur, ceux qui pleurent, les doux, ceux qui ont faim et soif de justice, les miséricordieux, les cœurs purs, les artisans de paix, ceux qui sont persécutés pour la justice.',
        'À chacun il promet le Royaume des cieux : la consolation, la terre, le rassasiement, la miséricorde, la vision de Dieu. « Soyez dans la joie et l’allégresse, car votre récompense est grande dans les cieux. »',
      ],
      'le bonheur selon Dieu renverse nos critères ; qui sont, autour de nous, les « pauvres de cœur » ?',
    ),
  ],
  [
    'Évangile — Aumône, prière et jeûne',
    gospel(
      'Mt 6, 1-6.16-18',
      'mercredi des Cendres',
      [
        'Jésus dit à ses disciples : « Prenez garde de ne pas accomplir vos bonnes œuvres devant les hommes pour vous faire remarquer. »',
        'Quand tu donnes, que ta main gauche ignore ce que fait ta droite. Quand tu pries, retire-toi dans ta chambre et prie ton Père dans le secret. Quand tu jeûnes, parfume-toi la tête et lave-toi le visage.',
        'Ton Père, qui voit dans le secret, te le rendra.',
      ],
      'entrer en Carême sans ostentation : partage, prière, jeûne comme chemin de vérité.',
    ),
  ],
  [
    'Évangile — La parabole du semeur',
    gospel(
      'Mt 13, 1-23',
      '15e dimanche du temps ordinaire',
      [
        'Ce jour-là, Jésus sortit de la maison et s’assit au bord du lac. Une foule si grande se rassembla qu’il monta dans une barque. Il leur dit beaucoup de choses en paraboles.',
        '« Un semeur sortit pour semer. Des grains tombèrent au bord du chemin : les oiseaux vinrent tout manger. D’autres sur le sol pierreux : ils levèrent vite, mais le soleil les brûla. D’autres dans les ronces : elles les étouffèrent. D’autres enfin dans la bonne terre : ils donnèrent du fruit, cent, soixante ou trente pour un. »',
        'Plus tard, il explique à ses disciples : la semence, c’est la Parole ; la terre, c’est le cœur de chacun.',
      ],
      'quelle terre suis-je aujourd’hui : chemin, pierres, ronces, ou bonne terre ?',
    ),
  ],
  [
    'Évangile — Jésus marche sur les eaux',
    gospel(
      'Mt 14, 22-33',
      '19e dimanche du temps ordinaire',
      [
        'Après la multiplication des pains, Jésus oblige ses disciples à monter dans la barque et à le précéder sur l’autre rive, pendant qu’il renvoie la foule. Il gravit la montagne pour prier, seul.',
        'Le soir, la barque est battue par les vagues. Vers la fin de la nuit, Jésus vient vers eux en marchant sur la mer. Ils crient de peur. « Courage, c’est moi, soyez sans crainte ! »',
        'Pierre veut le rejoindre ; il marche sur l’eau puis, effrayé par le vent, il s’enfonce : « Seigneur, sauve-moi ! » Jésus lui tend la main : « Homme de peu de foi, pourquoi as-tu douté ? »',
      ],
      'dans les tempêtes de nos vies, Jésus est là, la main tendue.',
    ),
  ],
  [
    'Évangile — Le plus grand commandement',
    gospel(
      'Mt 22, 34-40',
      '30e dimanche du temps ordinaire',
      [
        'Les pharisiens se réunirent. L’un d’eux, docteur de la Loi, lui posa une question pour le mettre à l’épreuve : « Maître, quel est le grand commandement de la Loi ? »',
        'Jésus répondit : « Tu aimeras le Seigneur ton Dieu de tout ton cœur, de toute ton âme et de tout ton esprit. Voilà le grand, le premier commandement. Et le second lui est semblable : tu aimeras ton prochain comme toi-même. »',
        'Tout, dans la Loi et les Prophètes, dépend de ces deux commandements.',
      ],
      'l’amour de Dieu et du prochain sont inséparables : où l’un manque, l’autre s’éteint.',
    ),
  ],
  [
    'Évangile — L’appel des premiers disciples',
    gospel(
      'Mc 1, 14-20',
      '3e dimanche du temps ordinaire',
      [
        'Après l’arrestation de Jean, Jésus partit pour la Galilée proclamer l’Évangile de Dieu : « Les temps sont accomplis : le règne de Dieu est tout proche. Convertissez-vous et croyez à l’Évangile. »',
        'Passant au bord du lac, il vit Simon et André qui jetaient leurs filets. « Venez derrière moi, je ferai de vous des pêcheurs d’hommes. » Aussitôt, laissant leurs filets, ils le suivirent.',
        'Un peu plus loin, il appela Jacques et Jean, qui réparaient leurs filets avec leur père Zébédée : ils le suivirent.',
      ],
      'l’appel du Christ vient au cœur de la vie quotidienne et demande une réponse immédiate.',
    ),
  ],
  [
    'Évangile — La tempête apaisée',
    gospel(
      'Mc 4, 35-41',
      '12e dimanche du temps ordinaire',
      [
        'Ce jour-là, le soir venu, Jésus dit à ses disciples : « Passons sur l’autre rive. » Ils l’emmenèrent dans la barque, tel qu’il était.',
        'Survint une violente tempête ; les vagues se jetaient sur la barque, qui se remplissait. Lui dormait sur un coussin à l’arrière. Ils le réveillent : « Maître, nous sommes perdus, cela ne te fait rien ? »',
        'Il se leva, interpella le vent : « Silence, tais-toi ! » Le vent tomba, et il se fit un grand calme. « Pourquoi avez-vous peur ? N’avez-vous pas encore la foi ? »',
      ],
      'la foi n’empêche pas les tempêtes, mais elle nous assure que le Christ est dans la barque.',
    ),
  ],
  [
    'Évangile — La guérison de Bartimée',
    gospel(
      'Mc 10, 46-52',
      '30e dimanche du temps ordinaire',
      [
        'Jésus sortait de Jéricho avec ses disciples et une foule nombreuse. Un mendiant aveugle, Bartimée, était assis au bord de la route. Apprenant que Jésus passe, il crie : « Fils de David, Jésus, prends pitié de moi ! »',
        'Beaucoup le rabrouent pour le faire taire, mais il crie plus fort. Jésus s’arrête : « Appelez-le. » On l’appelle : « Confiance, lève-toi ; il t’appelle. » L’aveugle jette son manteau, bondit et vient à Jésus.',
        '« Que veux-tu que je fasse pour toi ? — Rabbouni, que je voie ! — Va, ta foi t’a sauvé. » Aussitôt il retrouva la vue et le suivait sur la route.',
      ],
      'crier vers Jésus malgré les voix qui nous font taire ; jeter notre manteau pour le suivre.',
    ),
  ],
  [
    'Évangile — L’Annonciation',
    gospel(
      'Lc 1, 26-38',
      '4e dimanche de l’Avent, 25 mars',
      [
        'Le sixième mois, l’ange Gabriel fut envoyé par Dieu dans une ville de Galilée, Nazareth, à une jeune fille vierge, fiancée à Joseph, de la maison de David. Elle s’appelait Marie.',
        '« Je te salue, Comblée-de-grâce, le Seigneur est avec toi. » Troublée, Marie se demandait ce que signifiait cette salutation. L’ange lui dit : « Sois sans crainte, tu as trouvé grâce auprès de Dieu. Tu concevras et tu enfanteras un fils, tu lui donneras le nom de Jésus. »',
        '« Comment cela va-t-il se faire, puisque je ne connais pas d’homme ? — L’Esprit Saint viendra sur toi. » Marie dit alors : « Voici la servante du Seigneur ; que tout se passe pour moi selon ta parole. » Et l’ange la quitta.',
      ],
      'le oui de Marie, humble et libre, ouvre le monde à la venue du Sauveur.',
    ),
  ],
  [
    'Évangile — La naissance de Jésus',
    gospel(
      'Lc 2, 1-14',
      'messe de la nuit de Noël',
      [
        'En ce temps-là, parut un édit de l’empereur Auguste, ordonnant de recenser toute la terre. Joseph, avec Marie, son épouse enceinte, monta de Nazareth à Bethléem.',
        'Pendant qu’ils étaient là, le temps où elle devait enfanter fut accompli. Elle mit au monde son fils premier-né ; elle l’emmaillota et le coucha dans une mangeoire, car il n’y avait pas de place pour eux dans la salle commune.',
        'Dans la région, des bergers passaient la nuit dans les champs. L’ange du Seigneur leur dit : « Soyez sans crainte, je vous annonce une grande joie : aujourd’hui vous est né un Sauveur. » Et la troupe céleste louait Dieu : « Gloire à Dieu au plus haut des cieux, et paix sur la terre aux hommes qu’il aime. »',
      ],
      'Dieu se fait petit et pauvre ; la paix commence dans une étable.',
    ),
  ],
  [
    'Évangile — Le bon Samaritain',
    gospel(
      'Lc 10, 25-37',
      '15e dimanche du temps ordinaire',
      [
        'Un docteur de la Loi demande à Jésus : « Que dois-je faire pour avoir en héritage la vie éternelle ? » Et qui est mon prochain ? Jésus répond par un récit.',
        'Un homme descendait de Jérusalem à Jéricho : il tombe aux mains de bandits, qui le laissent à moitié mort. Un prêtre passe, le voit, et poursuit son chemin. Un lévite fait de même. Mais un Samaritain, en voyage, s’approche, soigne ses plaies, le charge sur sa monture, le conduit à l’auberge et paie pour lui.',
        '« Lequel a été le prochain de l’homme tombé aux mains des bandits ? — Celui qui a fait preuve de pitié. — Va, et toi aussi, fais de même. »',
      ],
      'le prochain n’est pas celui que j’ai choisi, mais celui dont je me fais proche.',
    ),
  ],
  [
    'Évangile — Le fils prodigue',
    gospel(
      'Lc 15, 1-3.11-32',
      '4e dimanche de Carême',
      [
        'Jésus dit cette parabole : « Un homme avait deux fils. Le plus jeune dit à son père : donne-moi la part d’héritage qui me revient. Il partit dans un pays lointain et dilapida sa fortune dans une vie de désordre. »',
        'Alors qu’il garde les porcs et meurt de faim, il rentre en lui-même : « Je vais retourner chez mon père. » Quand il est encore loin, son père l’aperçoit, est pris de pitié, court se jeter à son cou et l’embrasse. On met l’anneau au doigt du fils, on tue le veau gras, on fait la fête.',
        'Le fils aîné, en revenant des champs, s’indigne et refuse d’entrer. Le père sort lui parler : « Mon enfant, tout ce qui est à moi est à toi. Il fallait bien festoyer, car ton frère était mort et il est revenu à la vie. »',
      ],
      'le Père attend, court, pardonne ; et l’aîné est invité lui aussi à entrer dans la fête.',
    ),
  ],
  [
    'Évangile — Zachée',
    gospel(
      'Lc 19, 1-10',
      '31e dimanche du temps ordinaire',
      [
        'Jésus traversait la ville de Jéricho. Un homme du nom de Zachée, chef des collecteurs d’impôts et riche, cherchait à voir qui était Jésus, mais il était petit et la foule l’en empêchait. Il courut en avant et grimpa sur un sycomore.',
        'Arrivé là, Jésus leva les yeux : « Zachée, descends vite : aujourd’hui il faut que je demeure dans ta maison. » Il descendit vite et reçut Jésus avec joie. Tous murmuraient : « Il est entré chez un pécheur. »',
        'Zachée, debout, dit au Seigneur : « Je donne aux pauvres la moitié de mes biens, et si j’ai fait du tort à quelqu’un, je lui rends quatre fois plus. » Jésus dit : « Aujourd’hui, le salut est entré dans cette maison. »',
      ],
      'la rencontre avec Jésus convertit concrètement : partage et réparation.',
    ),
  ],
  [
    'Évangile — Les disciples d’Emmaüs',
    gospel(
      'Lc 24, 13-35',
      'soir de Pâques, 3e dimanche de Pâques',
      [
        'Le jour même, deux disciples faisaient route vers un village appelé Emmaüs. Ils parlaient de tout ce qui s’était passé. Jésus lui-même s’approcha, mais leurs yeux étaient aveuglés. « De quoi causez-vous donc en marchant ? » Ils s’arrêtèrent, tout tristes.',
        'Jésus leur explique, à partir de Moïse et de tous les Prophètes, ce qui le concernait dans toute l’Écriture. Arrivés près du village, ils le pressent : « Reste avec nous, car le soir approche. »',
        'À table, il prit le pain, dit la bénédiction, le rompit et le leur donna. Alors leurs yeux s’ouvrirent et ils le reconnurent. « Notre cœur n’était-il pas brûlant en nous tandis qu’il nous parlait en chemin ? » Ils partirent aussitôt pour Jérusalem annoncer la nouvelle.',
      ],
      'la Parole et le pain : les deux tables où le Ressuscité se laisse reconnaître.',
    ),
  ],
  [
    'Évangile — Le Verbe s’est fait chair',
    gospel(
      'Jn 1, 1-18',
      'jour de Noël',
      [
        'Au commencement était le Verbe, et le Verbe était auprès de Dieu, et le Verbe était Dieu. Tout est venu par lui à l’existence. En lui était la vie, et la vie était la lumière des hommes.',
        'La lumière brille dans les ténèbres, et les ténèbres ne l’ont pas arrêtée. Jean-Baptiste vient rendre témoignage à la lumière. Le Verbe était dans le monde, mais le monde ne l’a pas reconnu ; les siens ne l’ont pas reçu.',
        'Et le Verbe s’est fait chair, il a habité parmi nous, et nous avons vu sa gloire, gloire qu’il tient de son Père comme Fils unique, plein de grâce et de vérité. Dieu, personne ne l’a jamais vu : le Fils unique, lui, nous l’a fait connaître.',
      ],
      'Dieu a pris notre chair pour nous rejoindre.',
    ),
  ],
  [
    'Évangile — Dieu a tant aimé le monde',
    gospel(
      'Jn 3, 14-21',
      '4e dimanche de Carême',
      [
        'Jésus dit à Nicodème : « De même que le serpent de bronze fut élevé par Moïse dans le désert, ainsi faut-il que le Fils de l’homme soit élevé, afin que tout homme qui croit ait par lui la vie éternelle. »',
        '« Car Dieu a tant aimé le monde qu’il a donné son Fils unique : ainsi tout homme qui croit en lui ne périra pas, mais il obtiendra la vie éternelle. Dieu, en effet, n’a pas envoyé son Fils dans le monde pour juger le monde, mais pour que, par lui, le monde soit sauvé. »',
        'Celui qui fait la vérité vient à la lumière, pour qu’il soit manifeste que ses œuvres sont accomplies en Dieu.',
      ],
      'le cœur de l’Évangile : Dieu aime, donne, sauve ; nous sommes appelés à la lumière.',
    ),
  ],
  [
    'Évangile — La multiplication des pains',
    gospel(
      'Jn 6, 1-15',
      '17e dimanche du temps ordinaire',
      [
        'Jésus passa sur l’autre rive du lac de Galilée. Une grande foule le suivait. Il leva les yeux et dit à Philippe : « Où pourrions-nous acheter du pain pour qu’ils aient à manger ? » Philippe répond que deux cents pièces d’argent ne suffiraient pas.',
        'André, un autre disciple, dit : « Il y a ici un jeune garçon qui a cinq pains d’orge et deux poissons ; mais qu’est-ce que cela pour tant de monde ? » Jésus fit asseoir les gens sur l’herbe, prit les pains, rendit grâce et les distribua, de même pour les poissons.',
        'Tous mangèrent à leur faim, et l’on ramassa douze paniers de morceaux. Voyant le signe, les gens disaient : « C’est vraiment lui le Prophète. » Mais Jésus se retira seul dans la montagne.',
      ],
      'peu de chose, offert avec confiance, devient abondance quand le Christ le bénit.',
    ),
  ],
  [
    'Évangile — Le bon pasteur',
    gospel(
      'Jn 10, 11-18',
      '4e dimanche de Pâques',
      [
        'Jésus dit : « Moi, je suis le bon pasteur, le vrai berger, qui donne sa vie pour ses brebis. Le berger mercenaire, lui, voit venir le loup et s’enfuit, car il n’est pas le berger ; les brebis ne sont pas à lui. »',
        '« Moi, je suis le bon pasteur ; je connais mes brebis, et mes brebis me connaissent, comme le Père me connaît et que je connais le Père. Et je donne ma vie pour mes brebis. J’ai encore d’autres brebis qui ne sont pas de cet enclos : celles-là aussi, il faut que je les conduise. »',
        'Mon Père m’aime parce que je donne ma vie pour la reprendre. Nul ne me l’enlève : je la donne de moi-même.',
      ],
      'le pasteur connaît chacun par son nom ; l’Église est appelée à la même attention.',
    ),
  ],
  [
    'Évangile — Demeurez dans mon amour',
    gospel(
      'Jn 15, 9-17',
      '6e dimanche de Pâques',
      [
        'Jésus dit à ses disciples : « Comme le Père m’a aimé, moi aussi je vous ai aimés. Demeurez dans mon amour. Si vous gardez mes commandements, vous demeurerez dans mon amour. »',
        '« Je vous ai dit cela pour que ma joie soit en vous et que votre joie soit parfaite. Voici mon commandement : aimez-vous les uns les autres comme je vous ai aimés. Il n’y a pas de plus grand amour que de donner sa vie pour ceux qu’on aime. »',
        '« Je ne vous appelle plus serviteurs, mais amis. Ce n’est pas vous qui m’avez choisi, c’est moi qui vous ai choisis et établis pour que vous alliez, que vous portiez du fruit, et que votre fruit demeure. »',
      ],
      'être choisis comme amis du Christ : une joie qui se donne et porte du fruit.',
    ),
  ],
  [
    'Évangile — Le tombeau vide',
    gospel(
      'Jn 20, 1-9',
      'dimanche de Pâques',
      [
        'Le premier jour de la semaine, Marie Madeleine se rend au tombeau de grand matin, alors qu’il fait encore sombre. Elle voit que la pierre a été enlevée. Elle court trouver Simon-Pierre et l’autre disciple, celui que Jésus aimait : « On a enlevé le Seigneur de son tombeau, et nous ne savons pas où on l’a mis. »',
        'Pierre et l’autre disciple partent en courant. L’autre disciple arrive le premier ; il se penche et voit les linges posés à plat, mais n’entre pas. Pierre entre : il voit les linges, et le suaire qui avait recouvert la tête, non pas posé avec les linges, mais roulé à part.',
        'Alors l’autre disciple entra à son tour, il vit, et il crut. Jusque-là, en effet, les disciples n’avaient pas compris que, selon l’Écriture, il fallait que Jésus ressuscite d’entre les morts.',
      ],
      'la foi naît d’un signe discret : un tombeau vide, des linges rangés. Et d’une course.',
    ),
  ],
];
