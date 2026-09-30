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
│   ├── auth/        # POST /api/auth/register, /login, GET /api/auth/me
│   ├── users/       # GET /api/users/me
│   ├── parishes/    # CRUD paroisses + recherche
│   ├── parish-members/ # Invitation et gestion des membres
│   ├── contents/    # Bibliothèque de contenus liturgiques
│   ├── celebration-templates/ # Modèles de célébration + étapes
│   ├── celebrations/ # Célébrations + publication
│   └── public/      # Routes publiques sans auth
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
@CurrentUser() user: any
```

### Protection rôle paroisse
```ts
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@ParishRoles(ParishRole.PARISH_ADMIN)
```
Le guard lit `req.params.parishId` ou `req.params.id` pour trouver la paroisse.

## Ajouter un module

1. Créer `src/modules/mon-module/`
2. Créer `mon-module.service.ts`, `mon-module.controller.ts`, `mon-module.module.ts`
3. Importer dans `app.module.ts`

## Lien avec @churchy/shared

`@churchy/shared` est un workspace npm (`packages/shared`), installé via `npm install` à la racine du monorepo.
Après modification de `packages/shared` : `npm run build -w @churchy/shared` (ou `npm run build` à la racine), puis redémarrer l'API.

## Variables d'environnement requises

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret JWT (changer en prod !)
- `JWT_EXPIRES_IN` — Durée token (défaut: 7d)
- `PORT` — Port (défaut: 3201)
- `FRONTEND_URL` — URL du frontend pour CORS

> Règles communes (tests obligatoires pour tout changement, précommit lint/format/typecheck/tests) : voir le `CLAUDE.md` à la racine du dépôt.
