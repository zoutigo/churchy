// Calcule le découpage des tests Playwright pour le CI : le nombre de shards suit le nombre de tests,
// il n'y a donc rien à ajuster quand la suite grossit.
//   npx playwright test --list --reporter=json | node scripts/e2e-shards.mjs
// Affiche un JSON {"count":N,"total":T,"shard":[1..T]}, utilisable comme matrice GitHub Actions.
import { fileURLToPath } from 'node:url';

/** Nombre de tests visés par shard : au-delà, le surcoût fixe d'un job (~1 min 30) est amorti. */
export const TESTS_PER_SHARD = 20;
/** Plafond, pour ne pas lancer un nombre déraisonnable de jobs. */
export const MAX_SHARDS = 8;

/** Compte les tests d'un rapport `playwright test --list --reporter=json`. */
export function countTests(report) {
  const walk = (suite) =>
    (suite.specs ?? []).reduce((n, spec) => n + spec.tests.length, 0) +
    (suite.suites ?? []).reduce((n, child) => n + walk(child), 0);
  return (report.suites ?? []).reduce((n, suite) => n + walk(suite), 0);
}

export function planShards(count) {
  const total = Math.min(MAX_SHARDS, Math.max(1, Math.ceil(count / TESTS_PER_SHARD)));
  return { count, total, shard: Array.from({ length: total }, (_, i) => i + 1) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = '';
  process.stdin
    .on('data', (chunk) => (input += chunk))
    .on('end', () => {
      const count = countTests(JSON.parse(input));
      if (count === 0) {
        console.error('Aucun test Playwright trouvé');
        process.exit(1);
      }
      console.log(JSON.stringify(planShards(count)));
    });
}
