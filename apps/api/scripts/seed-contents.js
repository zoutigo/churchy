/**
 * Données de démonstration d'une paroisse : bibliothèque de contenus (20 par type), 20 annonces publiques et
 * 18 activités, tous réalistes. Usage : node scripts/seed-contents.js "<fragment du nom de la paroisse>" [--reset]
 * (défaut : Vogt). Idempotent : les données de démonstration (contenus marqués du tag « demo », annonces et
 * activités de même titre) sont mises à jour, jamais dupliquées ; ce que l'utilisateur a saisi n'est pas touché.
 * `--reset` supprime d'abord les données de démonstration. Utilise DATABASE_URL de apps/api/.env : base de dev.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { announcements, activities, at } = require('./seed/news');

const DEMO_TAG = 'demo';
const TYPES = {
  SONG: require('./seed/songs'),
  PSALM: require('./seed/psalms'),
  GOSPEL: require('./seed/gospels'),
  READING: require('./seed/readings'),
  PRAYER: require('./seed/prayers'),
  UNIVERSAL_PRAYER: require('./seed/universal'),
  ANNOUNCEMENT: require('./seed/announcement-texts'),
  FREE_TEXT: require('./seed/free-texts'),
};
/** Anciennes données minimalistes (première version du script) : remplacées par les nouvelles. */
const LEGACY_MARKERS = [
  'Texte de la prière à compléter',
  'Texte libre à adapter selon la célébration',
  'Merci de noter cette information et de la partager',
  'Ta parole éclaire nos pas, ta paix nous rassemble',
  'Nous t’en prions, Seigneur.',
  'Acclamons la Parole de Dieu.</p>',
  'Référence : Ps',
  'Passage : ',
];

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const fragment = args.find((a) => !a.startsWith('--')) ?? 'Vogt';
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
    const by = admin.userId;

    for (const [type, items] of Object.entries(TYPES)) {
      if (items.length !== 20) throw new Error(`${type} : ${items.length} contenus au lieu de 20`);
    }
    if (announcements.length < 20 || activities.length < 15)
      throw new Error('Pas assez d’annonces ou d’activités');

    const removedLegacy = await prisma.content.deleteMany({
      where: {
        parishId: parish.id,
        tags: { isEmpty: true },
        OR: LEGACY_MARKERS.map((m) => ({ body: { contains: m } })),
      },
    });
    if (reset) {
      await prisma.content.deleteMany({ where: { parishId: parish.id, tags: { has: DEMO_TAG } } });
      await prisma.announcement.deleteMany({
        where: { parishId: parish.id, title: { in: announcements.map((a) => a[0]) } },
      });
      await prisma.activity.deleteMany({
        where: { parishId: parish.id, title: { in: activities.map((a) => a[0]) } },
      });
    }

    const stats = { created: 0, updated: 0, kept: 0 };
    for (const [type, items] of Object.entries(TYPES)) {
      for (const [title, body] of items) {
        const existing = await prisma.content.findFirst({
          where: { parishId: parish.id, type, title },
        });
        if (!existing) {
          await prisma.content.create({
            data: {
              parishId: parish.id,
              type,
              title,
              body,
              language: 'fr',
              tags: [DEMO_TAG],
              createdById: by,
            },
          });
          stats.created++;
        } else if (existing.tags.includes(DEMO_TAG)) {
          await prisma.content.update({ where: { id: existing.id }, data: { body } });
          stats.updated++;
        } else stats.kept++; // saisi par l'utilisateur : on n'y touche pas
      }
    }

    let news = 0;
    for (const [title, summary, paras, daysAgo] of announcements) {
      const body = paras.join('');
      const data = {
        summary,
        body,
        publishedAt: new Date(Date.now() - daysAgo * 24 * 3600 * 1000),
      };
      const existing = await prisma.announcement.findFirst({
        where: { parishId: parish.id, title },
      });
      if (existing) await prisma.announcement.update({ where: { id: existing.id }, data });
      else
        await prisma.announcement.create({
          data: { parishId: parish.id, title, createdById: by, ...data },
        });
      news++;
    }
    let acts = 0;
    for (const [title, paras, location, days, h, m] of activities) {
      const data = { description: paras.join(''), location, startsAt: at(days, h, m) };
      const existing = await prisma.activity.findFirst({ where: { parishId: parish.id, title } });
      if (existing) await prisma.activity.update({ where: { id: existing.id }, data });
      else
        await prisma.activity.create({
          data: { parishId: parish.id, title, createdById: by, ...data },
        });
      acts++;
    }
    console.log(
      `Paroisse « ${parish.name} » : contenus ${stats.created} créés, ${stats.updated} mis à jour, ${stats.kept} conservés ` +
        `(${removedLegacy.count} anciens gabarits supprimés) ; ${news} annonces ; ${acts} activités.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
