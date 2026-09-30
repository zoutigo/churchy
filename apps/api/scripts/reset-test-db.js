/**
 * Prépare la base de test : applique les migrations puis vide toutes les tables.
 * Garde-fou : refuse de tourner si le nom de la base ne contient pas "test".
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

async function resetTestDb() {
  const dbName = new URL(process.env.DATABASE_URL ?? '').pathname.replace('/', '');
  if (!dbName.includes('test')) {
    throw new Error(`Refus de réinitialiser "${dbName}" : le nom de la base doit contenir "test".`);
  }

  // migrate deploy crée la base si elle n'existe pas, puis applique les migrations
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
    env: process.env,
  });

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length) {
      const list = rows.map((r) => `"${r.tablename}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { resetTestDb };

if (require.main === module) {
  require('../test/test-env');
  resetTestDb().then(
    () => console.log('Base de test prête.'),
    (err) => {
      console.error(err.message);
      process.exit(1);
    },
  );
}
