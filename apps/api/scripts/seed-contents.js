/**
 * Données de démonstration : 20 contenus de chaque type dans une paroisse (bibliothèque de contenus).
 * Usage : node scripts/seed-contents.js "<fragment du nom de la paroisse>"   (défaut : Vogt)
 * Idempotent : un contenu (paroisse + type + titre) déjà présent n'est pas recréé.
 * Utilise DATABASE_URL de apps/api/.env : à n'utiliser que sur la base de développement.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const p = (t) => `<p>${t}</p>`;
const lines = (arr) => arr.map(p).join('');

const SONGS = [
  'Venez, chantons notre Dieu',
  'Peuple de lumière',
  'Tu es là au cœur de nos vies',
  'Gloire à Dieu',
  'Seigneur, prends pitié',
  'Sanctus de la messe de Saint Boniface',
  'Agneau de Dieu',
  'Ubi caritas',
  'Ô Seigneur, à toi la gloire',
  'Que vive mon âme à te louer',
  'Acclamez Dieu, toute la terre',
  'Entre tes mains',
  'Je veux chanter ton amour',
  'Christ aujourd’hui nous appelle',
  'Marie, témoin d’une espérance',
  'Dieu nous accueille en sa maison',
  'Béni sois-tu',
  'Allez dire à tous les hommes',
  'Louange et gloire à ton nom',
  'Nous chanterons pour toi',
];
const PSALMS = [
  ['Ps 22', 'Le Seigneur est mon berger : je ne manque de rien.'],
  ['Ps 8', 'Que ton nom est grand sur toute la terre !'],
  ['Ps 23', 'Le Seigneur est mon berger.'],
  ['Ps 26', 'Le Seigneur est ma lumière et mon salut.'],
  ['Ps 33', 'Goûtez et voyez : le Seigneur est bon.'],
  ['Ps 41', 'Mon âme a soif du Dieu vivant.'],
  ['Ps 50', 'Pitié, Seigneur, car nous avons péché.'],
  ['Ps 62', 'Mon âme a soif de toi, Seigneur, mon Dieu.'],
  ['Ps 83', 'Heureux les habitants de ta maison !'],
  ['Ps 94', 'Aujourd’hui, ne fermez pas votre cœur, mais écoutez la voix du Seigneur.'],
  ['Ps 99', 'Nous sommes son peuple, son troupeau.'],
  ['Ps 102', 'Le Seigneur est tendresse et pitié.'],
  ['Ps 103', 'Seigneur, envoie ton Esprit qui renouvelle la face de la terre.'],
  ['Ps 112', 'Béni soit le nom du Seigneur, maintenant et à jamais !'],
  ['Ps 117', 'Rendez grâce au Seigneur, car il est bon, éternel est son amour.'],
  ['Ps 121', 'Dans la joie, nous irons à la maison du Seigneur.'],
  ['Ps 129', 'Près du Seigneur est l’amour, près de lui abonde le rachat.'],
  ['Ps 144', 'Je bénirai ton nom toujours et à jamais.'],
  ['Ps 145', 'Le Seigneur fait justice aux opprimés.'],
  ['Ps 150', 'Que tout ce qui respire loue le Seigneur !'],
];
const GOSPELS = [
  ['Mt 5, 1-12a', 'Les Béatitudes'],
  ['Mt 6, 1-6.16-18', 'Aumône, prière et jeûne'],
  ['Mt 13, 1-23', 'La parabole du semeur'],
  ['Mt 14, 22-33', 'Jésus marche sur les eaux'],
  ['Mt 22, 34-40', 'Le plus grand commandement'],
  ['Mc 1, 14-20', 'L’appel des premiers disciples'],
  ['Mc 4, 35-41', 'La tempête apaisée'],
  ['Mc 10, 46-52', 'La guérison de Bartimée'],
  ['Lc 1, 26-38', 'L’Annonciation'],
  ['Lc 2, 1-14', 'La naissance de Jésus'],
  ['Lc 10, 25-37', 'Le bon Samaritain'],
  ['Lc 15, 1-3.11-32', 'Le fils prodigue'],
  ['Lc 19, 1-10', 'Zachée'],
  ['Lc 24, 13-35', 'Les disciples d’Emmaüs'],
  ['Jn 1, 1-18', 'Le Verbe s’est fait chair'],
  ['Jn 3, 14-21', 'Dieu a tant aimé le monde'],
  ['Jn 6, 1-15', 'La multiplication des pains'],
  ['Jn 10, 11-18', 'Le bon pasteur'],
  ['Jn 15, 9-17', 'Demeurez dans mon amour'],
  ['Jn 20, 1-9', 'Le tombeau vide'],
];
const READINGS = [
  ['Gn 1, 1-5', 'Au commencement'],
  ['Gn 22, 1-18', 'Le sacrifice d’Abraham'],
  ['Ex 3, 1-8a.13-15', 'Le buisson ardent'],
  ['Ex 20, 1-17', 'Les dix paroles'],
  ['Dt 30, 15-20', 'Choisis la vie'],
  ['1 R 19, 9a.11-13a', 'Élie à l’Horeb'],
  ['Is 6, 1-8', 'La vocation d’Isaïe'],
  ['Is 9, 1-6', 'Un enfant nous est né'],
  ['Is 55, 1-11', 'Venez, achetez sans argent'],
  ['Jr 1, 4-10', 'La vocation de Jérémie'],
  ['Ez 37, 1-14', 'Les ossements desséchés'],
  ['Sg 3, 1-9', 'Les âmes des justes'],
  ['Rm 8, 14-17', 'Fils de Dieu par l’Esprit'],
  ['Rm 12, 1-8', 'Un sacrifice vivant'],
  ['1 Co 12, 12-30', 'Un seul corps, plusieurs membres'],
  ['1 Co 13, 1-13', 'Hymne à la charité'],
  ['Ga 5, 16-25', 'Les fruits de l’Esprit'],
  ['Ep 4, 1-6', 'Un seul Corps, un seul Esprit'],
  ['Ph 2, 6-11', 'Hymne au Christ'],
  ['Jc 2, 14-26', 'La foi sans les œuvres'],
];
const PRAYERS = [
  'Notre Père',
  'Je vous salue Marie',
  'Gloire au Père',
  'Je crois en Dieu (Credo des Apôtres)',
  'Je confesse à Dieu',
  'Acte de contrition',
  'Prière à l’Esprit Saint',
  'Prière de saint François',
  'Souvenez-vous, ô très pieuse Vierge Marie',
  'Ange de Dieu',
  'Prière avant le repas',
  'Prière après le repas',
  'Prière du matin',
  'Prière du soir',
  'Angélus',
  'Salve Regina',
  'Magnificat',
  'Prière à saint Joseph',
  'Prière pour les vocations',
  'Prière pour la paroisse',
];
const UNIVERSAL = [
  'Pour l’Église',
  'Pour les responsables des nations',
  'Pour les malades',
  'Pour les familles',
  'Pour les jeunes',
  'Pour les défunts',
  'Pour la paix',
  'Pour les migrants',
  'Pour les prêtres et les vocations',
  'Pour les catéchumènes',
  'Pour les personnes seules',
  'Pour les enfants de la communauté',
  'Pour la création',
  'Pour l’unité des chrétiens',
  'Pour les personnes en deuil',
  'Pour ceux qui souffrent de la faim',
  'Pour les enseignants et les élèves',
  'Pour les couples qui se préparent au mariage',
  'Pour notre paroisse',
  'Action de grâce',
];
const ANNOUNCEMENTS = [
  'Quête impérée',
  'Horaires de la semaine sainte',
  'Inscriptions au catéchisme',
  'Réunion du conseil paroissial',
  'Messe des familles',
  'Pèlerinage paroissial',
  'Répétition de la chorale',
  'Collecte de vivres',
  'Retraite des jeunes',
  'Préparation au baptême',
  'Préparation au mariage',
  'Adoration eucharistique',
  'Chemin de croix',
  'Fête patronale',
  'Confessions avant Noël',
  'Kermesse paroissiale',
  'Nettoyage de l’église',
  'Rencontre des servants d’autel',
  'Veillée de prière',
  'Sortie des anciens',
];
const FREE = [
  'Mot d’accueil',
  'Introduction à la messe',
  'Monition d’entrée',
  'Invitation à la prière',
  'Mot de bienvenue aux nouveaux',
  'Présentation des offrandes',
  'Invitation à la communion',
  'Mot de fin de messe',
  'Envoi en mission',
  'Témoignage de foi',
  'Méditation après la communion',
  'Prière de bénédiction des familles',
  'Prière pour les rentrées',
  'Texte de la veillée pascale',
  'Mot du curé',
  'Lecture du message du pape',
  'Remerciements aux bénévoles',
  'Intentions de messe',
  'Rite de la lumière',
  'Consignes pratiques',
];

const build = {
  SONG: SONGS.map((t, i) => [
    t,
    lines([
      `<strong>Refrain</strong>`,
      `${t}, nous te louons et nous te bénissons.`,
      `<strong>Couplet ${(i % 3) + 1}</strong>`,
      'Ta parole éclaire nos pas, ta paix nous rassemble.',
    ]),
  ]),
  PSALM: PSALMS.map(([ref, refrain]) => [
    `Psaume — ${ref}`,
    lines([`<strong>Refrain :</strong> ${refrain}`, `Référence : ${ref}`]),
  ]),
  GOSPEL: GOSPELS.map(([ref, name]) => [
    `Évangile — ${name}`,
    lines([
      `Évangile de Jésus Christ selon saint ${ref.startsWith('Mt') ? 'Matthieu' : ref.startsWith('Mc') ? 'Marc' : ref.startsWith('Lc') ? 'Luc' : 'Jean'} (${ref})`,
      `Passage : ${name}.`,
      'Acclamons la Parole de Dieu.',
    ]),
  ]),
  READING: READINGS.map(([ref, name]) => [
    `Lecture — ${name}`,
    lines([`Lecture (${ref})`, `Passage : ${name}.`, 'Parole du Seigneur.']),
  ]),
  PRAYER: PRAYERS.map((t) => [
    t,
    lines([`<strong>${t}</strong>`, 'Texte de la prière à compléter par la paroisse.', 'Amen.']),
  ]),
  UNIVERSAL_PRAYER: UNIVERSAL.map((t) => [
    `Intention — ${t}`,
    lines([
      `<strong>${t}</strong>`,
      `Seigneur, nous te prions ${t.charAt(0).toLowerCase()}${t.slice(1)}.`,
      'Nous t’en prions, Seigneur.',
    ]),
  ]),
  ANNOUNCEMENT: ANNOUNCEMENTS.map((t) => [
    t,
    lines([
      `<strong>${t}</strong>`,
      'Merci de noter cette information et de la partager autour de vous.',
    ]),
  ]),
  FREE_TEXT: FREE.map((t) => [
    t,
    lines([`<strong>${t}</strong>`, 'Texte libre à adapter selon la célébration.']),
  ]),
};

async function main() {
  const fragment = process.argv[2] ?? 'Vogt';
  const prisma = new PrismaClient();
  try {
    const parish = await prisma.parish.findFirst({
      where: { name: { contains: fragment, mode: 'insensitive' } },
    });
    if (!parish) throw new Error(`Aucune paroisse dont le nom contient « ${fragment} »`);
    const admin = await prisma.parishMember.findFirst({
      where: { parishId: parish.id, role: 'PARISH_ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) throw new Error('Cette paroisse n’a pas d’administrateur');
    let created = 0;
    for (const [type, items] of Object.entries(build)) {
      if (items.length !== 20) throw new Error(`${type} : ${items.length} contenus au lieu de 20`);
      for (const [title, body] of items) {
        const exists = await prisma.content.findFirst({
          where: { parishId: parish.id, type, title },
        });
        if (exists) continue;
        await prisma.content.create({
          data: {
            parishId: parish.id,
            type,
            title,
            body,
            language: 'fr',
            tags: [],
            createdById: admin.userId,
          },
        });
        created++;
      }
    }
    console.log(
      `Paroisse « ${parish.name} » : ${created} contenus créés (${Object.keys(build).length} types × 20).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
