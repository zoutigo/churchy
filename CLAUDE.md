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

## Cible
Microservices dans ce même repo avec file de jobs BullMQ (Redis). L'API reste un monolithe modulaire ;
un service n'est extrait que lorsqu'un besoin réel l'impose (premier cas : notifications). Voir le CLAUDE.md de chaque app pour les détails.
