# @churchy/shared (packages/shared)

Package TypeScript partagé pour le SaaS **Churchy** (gestion de célébrations religieuses).

## Role

Ce package est la source de vérité des contrats de données entre les trois applications :

| Repo | Usage |
|------|-------|
| `apps/api` (NestJS) | Validation des corps de requête, typage des entités |
| `apps/web` (Next.js) | Typage des appels API, validation des formulaires |

## Structure

```
src/
├── enums/          # Enums TypeScript (UserRole, ParishRole, ContentType, etc.)
├── types/          # Interfaces métier (User, Parish, Content, Celebration, etc.)
├── dto/            # Types de transfert (re-exports des inférences Zod + interfaces auth)
├── schemas/        # Schémas Zod pour validation runtime
└── constants/      # Constantes métier (langues, étapes messe, préfixes API)
```

## Conventions TypeScript

- `strict: true` dans tous les `tsconfig.json`
- Les types sont séparés des schémas : les `types/` décrivent les entités persistées (avec `Date`), les `schemas/` décrivent les payloads entrants (avec `string` datetime)
- Les DTOs dans `dto/` sont de simples re-exports des types inférés par Zod + quelques interfaces complémentaires (ex. `AuthResponse`)
- Aucune logique métier dans ce package : uniquement des types, enums, schémas et constantes

## Utilisation dans les autres repos

### Via chemin local (développement monorepo)

Les apps du monorepo déclarent la dépendance en workspace npm :

```json
{
  "dependencies": {
    "@churchy/shared": "*"
  }
}
```

Puis dans le code :

```ts
import { UserRole, createParishSchema, type Parish } from '@churchy/shared';
```

Après une modification, rebuilder le package : `npm run build -w @churchy/shared`.

## Scripts

```bash
npm run build        # Compile vers dist/ (CommonJS + declarations)
npm run build:watch  # Watch mode
npm run typecheck    # Vérifie les types sans émettre
```

## Ajouter un nouvel enum ou type

1. Créer le fichier dans le dossier correspondant (`src/enums/`, `src/types/`, etc.)
2. L'exporter depuis le `index.ts` du dossier
3. Le barrel `src/index.ts` re-exporte automatiquement via `export * from './enums'`, etc.
4. Relancer `npm run build` dans ce package
5. Les consommateurs voient immédiatement le nouveau type (en mode `file:`)

## Ajouter un nouveau schéma Zod

1. Créer dans `src/schemas/mon-domaine.schema.ts`
2. Exporter le schéma ET le type inféré (`export type MonDto = z.infer<typeof monSchema>`)
3. Si le DTO a des champs supplémentaires non présents dans le schéma (ex. tokens JWT), les ajouter dans `src/dto/mon-domaine.dto.ts`
4. Exporter depuis les `index.ts` respectifs

## Notes importantes

- Ce package compile en **CommonJS** pour compatibilité maximale (NestJS, Next.js, Metro/RN)
- La dépendance `zod` est en `dependencies` (pas `devDependencies`) car les schémas sont utilisés à runtime par les consommateurs
- Les `Date` dans les interfaces `types/` correspondent aux objets retournés par l'API ; les payloads entrants (schemas Zod) utilisent `z.string().datetime()` pour la sérialisation JSON

> Règles communes (tests obligatoires pour tout changement, précommit lint/format/typecheck/tests) : voir le `CLAUDE.md` à la racine du dépôt.
