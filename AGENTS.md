# Churchy — monorepo

SaaS de préparation et publication de célébrations religieuses. npm workspaces + Turborepo.

```
apps/api         @churchy/api    NestJS + Prisma + PostgreSQL (schéma: apps/api/prisma)
apps/web         @churchy/web    Next.js App Router + shadcn/ui
apps/notifications @churchy/notifications microservice worker BullMQ (sans HTTP)
packages/shared  @churchy/shared types, enums, DTO, schemas Zod
packages/contracts @churchy/contracts noms de files BullMQ + payloads de jobs (Zod)
docs/charte      charte graphique
archive/mobile   app Expo archivée, ignorée par git
```

## Commandes (racine)
```bash
npm install            # une seule installation pour tout le monorepo
npm run infra:up       # postgres + redis (docker compose)
npm run build          # turbo : shared d'abord, puis api/web
npm run typecheck
npm run dev -w @churchy/api   # ou -w @churchy/web
```

## Ports de dev
web 3200 · api 3201 (Swagger: /api/docs) · postgres 5433 · redis 6380

## Files de jobs (BullMQ)
Les noms de files et payloads sont dans `@churchy/contracts`. L'API est le **producteur** :
`NotificationsService` enfile par ex. `celebration.published` à la publication d'une célébration.
Le **consommateur** est le microservice `apps/notifications` (NestJS sans HTTP, `NotificationsProcessor`).
Sans worker démarré, les jobs restent en file dans Redis et sont traités au prochain démarrage.
Pour l'instant le worker ne fait que journaliser : l'envoi réel (email/push) reste à écrire.
Lancer : `npm run start:dev -w @churchy/notifications`. Note : BullMQ interdit `:` dans un `jobId`.

## Tests
| Quoi | Outil | Commande |
|---|---|---|
| shared, contracts, web (unitaires + composants) | Vitest (+ Testing Library, jsdom) | `npm test -w @churchy/web` |
| api, notifications (unitaires, tout mocké) | Jest + ts-jest | `npm test -w @churchy/api` |
| api fonctionnel | Jest + supertest, vraie app Nest, base `churchy_test`, Redis db 15 | `npm run test:e2e -w @churchy/api` |
| web fonctionnel | Playwright (Chrome système), web 3210 + api 3211 + base `churchy_test` | `npm run test:e2e -w @churchy/web` |

- Tout lancer : `npm test` (unitaires) et `npm run test:e2e` (fonctionnels) à la racine. Postgres + Redis doivent tourner (`npm run infra:up`).
- La base `churchy_test` est créée/migrée/vidée automatiquement (`apps/api/scripts/reset-test-db.js`, qui refuse toute base dont le nom ne contient pas « test »). La base de dev n'est jamais touchée.
- Convention : fichiers `*.spec.ts(x)` à côté du code ; tests fonctionnels API dans `apps/api/test/*.e2e-spec.ts`, web dans `apps/web/e2e/*.spec.ts`.
- `it.failing` = faille connue documentée par un test (autorisations par paroisse, `app.e2e-spec.ts`) ; le retirer une fois corrigée.
- En CI : `npx playwright install chromium` et `PW_CHANNEL=chromium`.

## Règles de travail (obligatoires)

### 1. Tout changement de code est consolidé par des tests
Toute modification ou tout ajout de code (fonctionnalité, correction, refactoring) doit être accompagné de tests
qui le consolident, dans le même commit :
- logique métier, service, schéma, utilitaire, composant → **test unitaire** (`*.spec.ts(x)`) ;
- route d'API, parcours utilisateur, flux entre services (API → file BullMQ → worker) → **test fonctionnel**
  (`apps/api/test/*.e2e-spec.ts`, `apps/web/e2e/*.spec.ts`) ;
- correction de bug → un **test de non-régression** qui échoue avant le correctif et passe après ;
- ne jamais supprimer ni affaiblir un test pour faire passer une modification : corriger le code ou
  discuter du comportement attendu.

### 2. Précommit avant chaque commit
Avant chaque commit, le précommit (hook Husky `.husky/pre-commit`, lancé automatiquement par `git commit`)
exécute dans cet ordre, et bloque le commit au moindre échec :
1. **cohérence `CLAUDE.md` / `AGENTS.md`** (`npm run docs:sync` pour les resynchroniser) ;
2. **lint + formatage** des fichiers indexés : ESLint `--fix` puis Prettier `--write` (lint-staged) ;
3. **typecheck** de tous les workspaces (`npm run typecheck`) ;
4. **tests unitaires** de tous les workspaces (`npm test`).

- Même contrôle à la main : `npm run precommit`. Outils seuls : `npm run lint`, `npm run format`, `npm run format:check`.
- Ne jamais contourner le hook (`--no-verify`) : corriger la cause.
- Les tests fonctionnels (`npm run test:e2e`) demandent Postgres + Redis et ne font pas partie du hook :
  les lancer avant de pousser dès qu'un changement touche l'API, le web ou les files de jobs.
- Les fichiers indexés sont reformatés/corrigés par le hook : les relire avant de valider le commit.

### 3. CLAUDE.md et AGENTS.md
Ces deux fichiers contiennent exactement le même contenu (chaque dossier qui a un `CLAUDE.md` a un `AGENTS.md`
identique). Éditer **CLAUDE.md**, puis lancer `npm run docs:sync`.

## Cible
Microservices dans ce même repo avec file de jobs BullMQ (Redis). L'API reste un monolithe modulaire ;
un service n'est extrait que lorsqu'un besoin réel l'impose (premier cas : notifications). Voir le CLAUDE.md de chaque app pour les détails.
