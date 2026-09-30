#!/usr/bin/env node
/**
 * Garde AGENTS.md identique à CLAUDE.md, dans chaque dossier qui a un CLAUDE.md.
 * CLAUDE.md est la source : on édite celui-ci, puis `npm run docs:sync` recopie vers AGENTS.md.
 *   node scripts/agent-docs.mjs check   → échoue si un AGENTS.md diffère (utilisé par le précommit)
 *   node scripts/agent-docs.mjs sync    → recopie CLAUDE.md vers AGENTS.md
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const mode = process.argv[2] ?? 'check';
const files = execSync("git ls-files --cached --others --exclude-standard -- '*CLAUDE.md'", {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f && !f.startsWith('archive/') && !f.includes('node_modules/'));

const stale = [];
for (const claude of files) {
  const agents = join(dirname(claude), 'AGENTS.md');
  const same = existsSync(agents) && readFileSync(agents, 'utf8') === readFileSync(claude, 'utf8');
  if (same) continue;
  if (mode === 'sync') {
    copyFileSync(claude, agents);
    console.log(`synchronisé : ${agents}`);
  } else {
    stale.push(agents);
  }
}

if (stale.length) {
  console.error(`AGENTS.md différent de CLAUDE.md :\n  ${stale.join('\n  ')}`);
  console.error('→ lance `npm run docs:sync` puis ajoute les fichiers au commit.');
  process.exit(1);
}
