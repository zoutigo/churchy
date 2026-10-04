# @churchy/api — NestJS Backend (apps/api)

Backend REST du SaaS Churchy. Gestion des célébrations religieuses.

## Lancer le projet

```bash
cp .env.example .env
# Editer .env avec vos valeurs PostgreSQL
npm install
npm run prisma:migrate
npm run start:dev
# API sur http://localhost:3201/api
# Swagger sur http://localhost:3201/api/docs
```

## Structure des modules

```
src/
├── common/          # Guards, decorators, filters, pipes réutilisables
├── prisma/          # PrismaService (global)
├── modules/
│   ├── auth/        # register, login, refresh, logout, me, forgot/reset-password, verify-email, resend-verification
│   ├── notifications/ # producteur BullMQ (emails, publication) — le consommateur est apps/notifications
│   ├── users/       # GET /api/users/me
│   ├── parishes/    # création, identité publique (PATCH), mes paroisses
│   ├── parish-members/ # Invitation et gestion des membres
│   ├── contents/    # Bibliothèque de contenus liturgiques
│   ├── celebration-templates/ # Modèles de célébration + étapes
│   ├── celebrations/ # Séries, dates (occurrences), feuilles de préparation (voir CLAUDE.md racine)
│   ├── announcements/ activities/ # annonces et activités (écriture EDITORS)
│   ├── contact/     # POST /contact → file BullMQ
│   └── public/      # Lecture publique sans auth (PublicService : vues publiques uniquement)
└── health/          # GET /api/health
```

## Patterns clés

### Validation Zod
```ts
@Body(new ZodValidationPipe(mySchema)) dto: MyDto
```
Toujours utiliser `ZodValidationPipe` avec les schemas de `@churchy/shared`.

### Protection JWT
```ts
@UseGuards(JwtAuthGuard)
@CurrentUser() user: AuthUser   // entité Prisma User ; ne jamais la renvoyer telle quelle (passwordHash)
```
Le JWT d'accès est lu dans le cookie httpOnly `churchy_at` (ou l'en-tête `Authorization: Bearer`).
Voir la section « Authentification » du `CLAUDE.md` racine (refresh rotatif, cookies, reset, vérification).

### Protection rôle paroisse (obligatoire pour toute ressource de paroisse)
```ts
@UseGuards(JwtAuthGuard, ParishRolesGuard)        // au niveau du contrôleur
@ParishAccess(EDITORS)                            // parishId dans l'URL
@ParishAccess(EDITORS, 'celebration')             // :id est une célébration → paroisse retrouvée via elle
@ParishAccess(EDITORS, 'template', 'templateId')  // autre nom de paramètre
```
Types de ressources : `parish` (défaut), `template`, `templateStep`, `content`, `celebration`, `occurrence`, `sheet`. Groupes de rôles :
`ALL_MEMBERS` (lecture), `EDITORS` (écriture/publication), `ADMINS` (membres). Un identifiant d'une autre
paroisse ne doit jamais contourner le contrôle : les services vérifient aussi l'appartenance à la paroisse
(ex. modèle ou contenu d'une autre paroisse refusé). Toute nouvelle route doit avoir des tests d'autorisation
dans `test/authorization.e2e-spec.ts`.

## Ajouter un module

1. Créer `src/modules/mon-module/`
2. Créer `mon-module.service.ts`, `mon-module.controller.ts`, `mon-module.module.ts`
3. Importer dans `app.module.ts`

## Lien avec @churchy/shared

`@churchy/shared` est un workspace npm (`packages/shared`), installé via `npm install` à la racine du monorepo.
Après modification de `packages/shared` : `npm run build -w @churchy/shared` (ou `npm run build` à la racine), puis redémarrer l'API.

## Variables d'environnement requises

Validées au démarrage par `src/config/env.ts` (l'API refuse de démarrer si la configuration est invalide) ;
`.env` est chargé par `dotenv` (premier import de `main.ts`).

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — **obligatoire**, 16 caractères minimum, aucune valeur de secours (`openssl rand -hex 32`) ;
  refusé en production s'il ressemble à un exemple
- `ACCESS_TOKEN_TTL_SECONDS` — durée du JWT d'accès (défaut : 900)
- `REFRESH_TOKEN_TTL_DAYS` — durée de la session (défaut : 30)
- `PORT` — Port (défaut: 3201)
- `FRONTEND_URL` — origine du site web : CORS avec cookies et liens des emails (défaut : http://localhost:3200)
- `AUTH_THROTTLE_LIMIT` / `THROTTLE_LIMIT` — requêtes par minute et par IP (routes d'auth sensibles / reste)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` — file BullMQ (défaut : localhost, 6380, 0)

> Règles communes (tests obligatoires pour tout changement, précommit lint/format/typecheck/tests) : voir le `CLAUDE.md` à la racine du dépôt.
