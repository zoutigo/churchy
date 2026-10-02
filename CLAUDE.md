# Churchy — monorepo

SaaS de préparation et publication de célébrations religieuses. npm workspaces + Turborepo.

```
apps/api         @churchy/api    NestJS + Prisma + PostgreSQL (schéma: apps/api/prisma)
apps/web         @churchy/web    Next.js App Router + shadcn/ui
apps/notifications @churchy/notifications microservice worker BullMQ (sans HTTP) : envoie les emails
packages/shared  @churchy/shared types, enums, DTO, schemas Zod
packages/contracts @churchy/contracts noms de files BullMQ + payloads de jobs (Zod)
docs/charte      charte graphique
archive/mobile   app Expo archivée, ignorée par git
```

## Commandes (racine)
```bash
npm install            # une seule installation pour tout le monorepo
npm run infra:up       # postgres + redis + mailpit (docker compose, attend qu'ils soient prêts)
npm run build          # turbo : shared d'abord, puis api/web
npm run typecheck
npm run dev -w @churchy/api   # ou -w @churchy/web, -w @churchy/notifications
```
Première installation : copier `apps/api/.env.example` → `apps/api/.env` (et générer un `JWT_SECRET`
aléatoire : `openssl rand -hex 32`), `apps/web/.env.local.example` → `.env.local`,
`apps/notifications/.env.example` → `.env`, puis `npx prisma migrate dev` dans `apps/api`.

## Ports de dev
web 3200 · api 3201 (Swagger: /api/docs) · postgres 5433 · redis 6380 · SMTP Mailpit 1025 ·
**Mailpit (emails reçus) http://localhost:8025**. Tests fonctionnels : web 3210 · api 3211.

## Authentification
Session par **cookies**, jamais de jeton lisible par le JavaScript du site :
- `churchy_at` : JWT d'accès, court (15 min), httpOnly, `SameSite=Lax`, envoyé à toute l'API ;
- `churchy_rt` : refresh token opaque (30 jours), httpOnly, limité au chemin `/api/auth`, **stocké haché**
  en base (`RefreshToken`) et **rotatif** : chaque `POST /auth/refresh` révoque l'ancien jeton. Rejouer un
  ancien jeton (hors d'un délai de tolérance de 10 s entre onglets) révoque toute la session (vol probable) ;
- `churchy_session=1` : indicateur sans secret, **lisible** par le site (middleware + `AuthProvider`), pour ne
  pas interroger l'API à chaque visiteur anonyme.

Routes (`apps/api/src/modules/auth`) : `register`, `login`, `refresh`, `logout` (révoque côté serveur), `me`,
`forgot-password`, `reset-password` (à usage unique, 1 h, déconnecte toutes les sessions), `verify-email`
(24 h), `resend-verification`. Les réponses ne contiennent **aucun jeton** dans le corps. Le header
`Authorization: Bearer` reste accepté pour les clients non navigateur. Les emails sont normalisés en minuscules.
Les routes sensibles sont limitées (`AUTH_THROTTLE_LIMIT`, 10/min/IP par défaut) ; helmet est actif ; CORS
n'autorise que `FRONTEND_URL`, avec credentials.

**Configuration** (`apps/api/src/config/env.ts`, validée au démarrage, aucune valeur de secours) :
`JWT_SECRET` obligatoire (16 car. min., refusé en production s'il ressemble à un exemple),
`ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `FRONTEND_URL`, `AUTH_THROTTLE_LIMIT`, `THROTTLE_LIMIT`.
En production : `NODE_ENV=production` (cookies `Secure`), web et API sur le même domaine racine (cookies
`SameSite=Lax`), et `trust proxy` si l'API est derrière un reverse proxy (limitation par IP).

**Autorisations par paroisse** : `@ParishAccess(ROLES, kind?, param?)` + `ParishRolesGuard`
(`apps/api/src/common`). Le guard retrouve la paroisse via l'URL **ou via la ressource visée** (célébration,
modèle, contenu, étape) pour qu'un identifiant d'une autre paroisse ne contourne pas le contrôle.
`ALL_MEMBERS` (lecture) = ADMIN, PREPARER, READER, VIEWER ; `EDITORS` (écriture, publication) = ADMIN, PREPARER ;
`ADMINS` (membres) = ADMIN ; `SUPER_ADMIN` passe partout. Les services vérifient aussi l'isolation (modèle ou
contenu d'une autre paroisse refusé). Toute nouvelle route qui touche une ressource de paroisse doit porter
`@ParishAccess`.

**Web** : `AuthProvider` (contexte) + `useAuth`, `middleware.ts` (redirige les pages privées sans session vers
`/login?next=…` ; `next` est validé par `safeNextPath`), `AuthGuard` (filet côté client), client API
(`lib/api/client.ts`) qui rafraîchit la session en silence sur un 401 (un seul refresh partagé) et émet
`churchy:session-expired` si c'est impossible. Pages : `/login`, `/register`, `/forgot-password`,
`/reset-password?token=`, `/verify-email?token=`. Le `next` n'est jamais mémorisé après une déconnexion volontaire.

## Site public (sans authentification)
Pages servies par le web (rendu serveur, `force-dynamic`, URL **par id** de paroisse, pas par slug) :
`/` (landing : recherche en premier), `/paroisses?q=&page=` (résultats), `/paroisses/[id]` (mini-site : accueil,
`/messes`, `/messes/[celebrationId]`, `/annonces`, `/activites`), `/pour-les-paroisses`, `/a-propos`, `/contact`,
`/conditions-generales`, `/confidentialite`, `/mentions-legales` (textes légaux **provisoires** : à faire valider).
L'API expose `GET /api/public/parishes` (recherche paginée : tous les mots dans nom/ville/quartier/église/adresse,
insensible à la casse mais **pas aux accents**), `/public/parishes/:id` (+ `/celebrations`, `/announcements`,
`/activities`), `/public/celebrations/:id` et `POST /api/contact` (limité comme l'auth, piège à robots `website`).
Ces routes n'ont volontairement **pas** de `@ParishAccess` : elles ne renvoient que des vues publiques
(`PublicService`, liste blanche de champs, types `Public*` de `@churchy/shared`), jamais les entités Prisma.
- Une célébration est visible si elle est **publiée** (« feuille disponible ») ou **brouillon annoncé**
  (`announced`, « feuille en préparation », sans déroulement). Brouillons non annoncés et archivées : 404.
- « À venir » = depuis 3 h avant l'heure de début. Les dates sont formatées dans le fuseau du serveur web
  (le fuseau d'une paroisse n'est pas modélisé).
- Les paroisses sont toutes publiques pour l'instant (pas de drapeau de visibilité).
- Gestion : `PATCH /parishes/:id` (identité publique, ADMINS), `announcements` et `activities` (`/parishes/:parishId/…`,
  lecture ALL_MEMBERS, écriture/suppression EDITORS), `PATCH /celebrations/:id/announced`.
- Les pages sont rendues par le serveur web : toutes les requêtes publiques partent de **la même IP**. En production,
  transmettre l'IP du visiteur (`X-Forwarded-For` + `trust proxy`) pour que la limite `THROTTLE_LIMIT` ne
  s'applique pas à l'ensemble des visiteurs.

## Files de jobs (BullMQ)
Les noms de files et payloads sont dans `@churchy/contracts`. L'API est le **producteur** :
`NotificationsService` enfile `celebration.published` (publication d'une célébration),
`auth.email-verification-requested` et `auth.password-reset-requested` (liens à usage unique : jobs sans
rétention une fois traités) et `contact.message-received` (page Contact : le worker l'envoie à `CONTACT_EMAIL`,
avec `Reply-To` = visiteur ; données personnelles, supprimées une fois traitées).
Le **consommateur** est le microservice `apps/notifications` (NestJS sans HTTP, `NotificationsProcessor`) :
il envoie les emails d'authentification via SMTP (`MailService`, nodemailer ; Mailpit en local). Pour
`celebration.published` il ne fait encore que journaliser (prévenir les fidèles : à définir).
Sans worker démarré, les jobs restent en file dans Redis et sont traités au prochain démarrage.
Lancer : `npm run start:dev -w @churchy/notifications`. Note : BullMQ interdit `:` dans un `jobId`.

## Déploiement (VPS OVH)
Site : **https://churchy.tigilabs.com** (DNS OVH : enregistrement A `churchy` → IP du VPS). Une seule origine :
nginx envoie `/api/*` à l'API et le reste au web, donc pas de CORS et cookies de session sans attribut `Domain`.
Le VPS (`ssh vps-ovh`, user `ubuntu`) héberge d'autres projets (scolive, tigilabs, taxi-tignieu…) : **ne jamais
toucher à leurs conf nginx / conteneurs**. Modèle repris de scolive/tigilabs :
- code dans `~/apps/churchy`, compose `docker/docker-compose.vps.yml` (projet `churchy` : `web`, `api`,
  `notifications`, `redis`), secrets dans `docker/.env` (jamais commité, modèle `docker/.env.example`) ;
- **nginx central** (conteneur `nginx-proxy`, `~/infra/nginx`, réseau Docker `proxy`) : vhost
  `~/infra/nginx/conf.d/churchy.tigilabs.com.conf` (copie versionnée : `docker/nginx/`), joint les services via
  les alias `churchy-web:3200` et `churchy-api:3201`. Swagger (`/api/docs`) y est masqué (404) ;
- **Postgres central** (`postgres-central`, réseau `db`) : base `churchy`, utilisateur dédié ; Redis propre au projet ;
- **HTTPS** : certbot en webroot (`~/infra/nginx/certbot`), renouvellement par la crontab de `ubuntu`. Nouveau
  certificat : installer d'abord `churchy.tigilabs.com.phase1-http-only`, `nginx -t`, recharger, `certbot certonly
  --webroot -w /var/www/certbot -d churchy.tigilabs.com`, puis installer la conf complète ;
- après toute modif nginx : `docker exec nginx-proxy nginx -t` puis recharger (`nginx -s reload`) ;
- production : `NODE_ENV=production`, `TRUST_PROXY_HOPS=1` (l'API lit l'IP cliente dans `X-Forwarded-For`, que nginx
  **écrase** avec `$remote_addr`), `THROTTLE_LIMIT` élevé car le rendu serveur du web appelle l'API depuis une seule
  IP Docker (`API_INTERNAL_URL=http://api:3201/api`, sans repasser par nginx) ;
- `NEXT_PUBLIC_API_URL` est **inlinée au build** du web (build arg) : la changer impose de reconstruire l'image ;
- mise à jour : `docker compose -f docker/docker-compose.vps.yml --env-file docker/.env build`, puis
  `run --rm api npx prisma migrate deploy` (avant de démarrer le nouveau code), puis `up -d`.

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
- Les tests fonctionnels lisent les emails d'authentification directement dans la file Redis (db 15) : pas besoin de serveur SMTP.
- Sélecteurs Playwright : préférer `getByRole` / `getByLabel(…, { exact: true })` (le bouton « Afficher le mot de passe » partage des mots avec le libellé du champ).
- Piège Vitest : `beforeEach(() => mock.mockReset())` renvoie la fonction mock, que Vitest appelle ensuite comme nettoyage ; utiliser des accolades.
- En CI : `npx playwright install chromium` et `PW_CHANNEL=chromium`.

## Règles de travail (obligatoires)

### 0. Branche de travail : `dev`
Tous les travaux (code, tests, documentation) se font **toujours dans la branche `dev`**, jamais directement
sur `main`. Vérifier la branche courante (`git branch --show-current`) avant de modifier quoi que ce soit ;
si on n'est pas sur `dev`, basculer dessus (`git switch dev`, ou la créer depuis `main` si elle n'existe pas).
`main` ne reçoit que des fusions de `dev`.

### 1. Tout changement de code est consolidé par des tests
Toute modification ou tout ajout de code (fonctionnalité, correction, refactoring) doit être accompagné de tests
qui le consolident, dans le même commit :
- logique métier, service, schéma, utilitaire, composant → **test unitaire** (`*.spec.ts(x)`) ;
- route d'API, parcours utilisateur, flux entre services (API → file BullMQ → worker) → **test fonctionnel**
  (`apps/api/test/*.e2e-spec.ts`, `apps/web/e2e/*.spec.ts`) ;
- correction de bug → un **test de non-régression** qui échoue avant le correctif et passe après ;
- ne jamais supprimer ni affaiblir un test pour faire passer une modification : corriger le code ou
  discuter du comportement attendu.

### 1 bis. UI : responsive mobile first, traité et testé
Toute création ou modification d'interface (page, composant, formulaire, navigation) doit traiter **et tester**
le responsive sur les trois vues : **mobile, tablette et desktop**. Logique **mobile first** : on conçoit
d'abord la vue mobile, puis on adapte les vues tablette et desktop pour qu'elles soient chacune **ergonomiques
dans leur contexte** (taille d'écran, pointeur tactile ou souris, zones de clic, lisibilité).
- Les trois vues n'ont **pas** à se ressembler : la mise en page desktop peut être radicalement différente de
  celle du mobile (navigation latérale vs barre basse, tableau vs cartes, panneaux côte à côte, etc.). Ne pas
  simplement étirer ou réduire la vue mobile.
- Utiliser le plugin/skill de design front (`frontend-design:frontend-design`) pour les choix de mise en page
  et de design.
- Vérifier visuellement les trois vues dans le navigateur (claude-in-chrome, redimensionnement de fenêtre) et
  couvrir les parcours par des tests Playwright avec des viewports mobile, tablette et desktop (voir règle 1).

### 2. Précommit avant chaque commit
Avant chaque commit, le précommit (hook Husky `.husky/pre-commit`, lancé automatiquement par `git commit`)
exécute dans cet ordre, et bloque le commit au moindre échec :
1. **cohérence `CLAUDE.md` / `AGENTS.md`** (`npm run docs:sync` pour les resynchroniser) ;
2. **lint + formatage** des fichiers indexés : ESLint `--fix` puis Prettier `--write` (lint-staged) ;
3. **typecheck** de tous les workspaces (`npm run typecheck`) ;
4. **tests unitaires** de tous les workspaces (`npm test`) ;
5. **tests fonctionnels** : API (supertest, base `churchy_test`) puis web (Playwright)
   (`npm run test:e2e`). Postgres + Redis sont démarrés automatiquement (`npm run infra:up`, qui attend
   qu'ils soient prêts) ; Docker doit donc être lancé.

- Même contrôle à la main : `npm run precommit`. Outils seuls : `npm run lint`, `npm run format`, `npm run format:check`.
- **Si le précommit révèle un problème, il faut le corriger soi-même, dans le code, avant de commiter** :
  erreur ou avertissement de lint, fichier mal formaté, erreur de typecheck, test en échec. On ne se contente pas
  de le signaler, on ne le laisse pas « pour plus tard » et on ne supprime ni n'affaiblit la règle ou le test.
  Puis on relance le précommit jusqu'à ce qu'il soit entièrement vert.
- Ne jamais contourner le hook (`--no-verify`) : corriger la cause.
- Les fichiers indexés sont reformatés/corrigés par le hook : les relire avant de valider le commit.

### 2 bis. Fin de travail : précommit complet, commit, push, suivi du CI
À la fin de **chaque** travail, sans qu'on ait à le demander :
1. lancer le **précommit complet** (`npm run precommit`) et corriger tout problème (règle 2) ;
2. **commiter** dans `dev` (le hook rejoue le précommit) puis **pousser** (`git push origin dev`) ;
3. **suivre le CI de la branche `dev`** (GitHub Actions, `gh run list --branch dev` / `gh run watch`) jusqu'à
   sa fin (workflow `ci.yml`, voir « CI » ci-dessous) ;
4. **si le CI échoue** : lire les logs (`gh run view --log-failed`), corriger la cause dans le code (jamais en
   supprimant ni en affaiblissant un test, jamais de `--no-verify`), recommiter, repousser et suivre à nouveau
   le CI, jusqu'à ce qu'il soit vert. Le travail n'est terminé que lorsque le CI de `dev` est vert.

#### CI (GitHub Actions, `.github/workflows`)
- `ci.yml` (push sur `dev`, PR vers `dev`/`main`) : **tous** les contrôles et tests — cohérence CLAUDE.md/AGENTS.md,
  lint, format, typecheck, build, tests unitaires, tests fonctionnels API et web. Jobs **en parallèle** : `quality`,
  `unit`, `e2e-api`, et `e2e-web` **découpé en shards dont le nombre suit la taille de la suite** (job `e2e-web-plan` :
  `apps/web/scripts/e2e-shards.mjs`, 20 tests par shard, 8 shards max, `fullyParallel` → découpage par test ; les tests
  Playwright doivent donc rester **indépendants**, avec des données uniques). Postgres + Redis en services pour les e2e. Ne déploie rien.
- `deploy-vps.yml` (push et PR sur `main`) : contrôles **basiques** seulement (docs, lint, format, typecheck, build), puis, sur
  push uniquement, **déploiement** sur le VPS. `main` ne reçoit que des fusions de `dev` déjà vert.

### 3. CLAUDE.md et AGENTS.md
Ces deux fichiers contiennent exactement le même contenu (chaque dossier qui a un `CLAUDE.md` a un `AGENTS.md`
identique). Éditer **CLAUDE.md**, puis lancer `npm run docs:sync`.

## Cible
Microservices dans ce même repo avec file de jobs BullMQ (Redis). L'API reste un monolithe modulaire ;
un service n'est extrait que lorsqu'un besoin réel l'impose (premier cas : notifications). Voir le CLAUDE.md de chaque app pour les détails.
