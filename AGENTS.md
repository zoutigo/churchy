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
npm run start:dev -w @churchy/api   # API ; web : npm run dev -w @churchy/web ; worker : npm run start:dev -w @churchy/notifications
```
Première installation : copier `apps/api/.env.example` → `apps/api/.env` (et générer un `JWT_SECRET`
aléatoire : `openssl rand -hex 32`), `apps/web/.env.local.example` → `.env.local`,
`apps/notifications/.env.example` → `.env`, puis `npx prisma migrate dev` dans `apps/api`.

## Ports de dev
web 3200 · api 3201 (Swagger: /api/docs) · postgres 5433 · redis 6380 · SMTP Mailpit 1025 ·
**Mailpit (emails reçus) http://localhost:8025**.
**Postgres, Redis et Mailpit ne sont publiés que sur `127.0.0.1`** (`docker-compose.yml`) : jamais sur toutes les interfaces (mot de passe de dev `password` : une base ouverte a déjà été piratée par un mineur de crypto). Garder `127.0.0.1:` devant chaque port publié.
**Sauvegarde de la base de dev** : `~/scripts/backup_churchy_dev.sh` (cron 1 h 30, dumps de `churchy_db` et `churchy_test` dans `~/backups/churchy-dev/`, 7 jours). Après un `git pull` qui ajoute une migration : `npx prisma migrate deploy` dans `apps/api` (sinon l'API répond 500 sur les tables manquantes). Tests fonctionnels : web 3210 · api 3211.

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

### Modes de connexion (email, téléphone + PIN, Google)
Un compte peut cumuler plusieurs moyens ; `AuthUserDto.methods` = `{ password, pin, google }`, `email` et `phone` peuvent être `null`
(`User.email` et `passwordHash` sont facultatifs : un compte par téléphone ou Google n'a ni l'un ni l'autre au départ).
- **Email + mot de passe** : l'inscription demande une confirmation (`registerFormSchema`, jamais envoyée à l'API).
- **Téléphone + PIN à 6 chiffres** (`PhoneAuthService`, table `UserPhoneCredential`) : `POST /auth/register/phone`, `/auth/login/phone`,
  `/auth/forgot-pin`, `/auth/reset-pin`. Numéro normalisé en E.164 (`phoneSchema`, `normalizeInternationalPhone`), PIN poivré puis haché (`pin-hash.ts` : HMAC-SHA256 avec `PIN_PEPPER`, bcrypt, préfixe `p1$` ; un haché d'avant le poivre reste valable et est refait à la connexion réussie ; poivre perdu = tous les PIN invalides) et refusé s'il est
  trop simple (`isWeakPin` : 000000, 123456…). **Le numéro n'est pas vérifié** (`verifiedAt` vide : pas encore de SMS) ; la connexion fonctionne quand même.
- **Verrouillage et audit** (`AuthSecurityService`) : échecs comptés par clé hachée (`AuthRateLimit`), atomiquement ; 5 échecs de PIN ou de preuve, 10 de mot de passe →
  verrou de 15 min (429 `tooManyAttempts`, même réponse pour un numéro inconnu). Journal `AuthAuditLog` (numéro masqué, jamais de secret).
- **Récupération du PIN** : pas de SMS pour l'instant. (1) lien envoyé à l'**email vérifié** du compte (job `auth.pin-reset-requested`, page `/reset-pin?token=`,
  même réponse que le compte existe ou non) ; (2) sans email : un **administrateur de la plateforme** (ADMIN ou SUPER_ADMIN, permission `platform.pin-reset`) obtient un lien de 24 h par
  `POST /admin/auth/pin-reset-link` (page `/platform/pin-reset`).
  Un PIN réinitialisé déconnecte toutes les sessions.
- **SMS (préparé, inactif)** : contrat `sms.requested` (`smsPayloadSchema`), `NotificationsService.smsRequested`, worker `SmsService` + `SMS_PROVIDER` (`log` seul pour
  l'instant, nom inconnu = refus au démarrage). Aucun producteur : brancher Orange/MTN = écrire un `SmsProvider`, puis un code à usage unique pour la récupération.
- **Google** (`GoogleAuthService`) : le web obtient un `idToken` (Google Identity Services ; script chargé seulement si `GET /auth/providers` annonce Google), l'API le
  **vérifie toujours** (`google-auth-library`, audience = `GOOGLE_CLIENT_ID` ; vérificateur remplaçable dans les tests) — ne jamais croire un identifiant envoyé par le client.
  Compte lié (`UserAuthIdentity`, clé = `sub`) → connexion ; aucun compte → création (email confirmé) ; **un compte email confirmé existe → jamais de fusion silencieuse** :
  réponse `link_required`, `POST /auth/google/link` exige le mot de passe (sans mot de passe : se connecter d'abord, lier depuis « Sécurité »). Si l'email du compte existant
  n'a **jamais été confirmé**, Google (qui le certifie) reprend le compte : mot de passe, PIN et sessions posés par un éventuel usurpateur sont supprimés.
  `GOOGLE_CLIENT_ID` vide = fonction désactivée (503, bouton masqué).
- **Sécurité du compte** (`AccountService`, page `/dashboard/security`) : ajouter un email (compte par téléphone), créer/changer le mot de passe, activer/changer le PIN,
  lier/délier Google (jamais le dernier moyen). Toute modification sensible exige une **preuve** (mot de passe actuel, sinon PIN actuel ; rien pour un compte uniquement
  Google) et, pour un mot de passe ou un PIN, coupe les autres sessions et en ouvre une neuve. Routes `PUT /auth/me/{email,password,phone-pin,google}`, `PATCH /auth/me/pin`, `POST /auth/me/google/unlink`.
- **Web** : `/login` et `/register` = Google (si activé) + onglets Email | Téléphone (`LoginPanel`, `RegisterPanel`) ; `PhoneNumberField` (pays + masque, valeur
  internationale), `PinInput` (chiffres seulement, pas de `maxLength` : il tronquerait un collage « 482 915 »). Pages `/forgot-pin`, `/reset-pin` (segments traduits, `AUTH_LINK_PATHS`).
- Limites connues : un numéro non vérifié peut être saisi par un tiers (le propriétaire réel sera bloqué à l'inscription tant qu'il n'y a pas de SMS) ; le PIN à 6 chiffres reste faible face à une attaque en ligne (le verrouillage est la protection principale).

### Rôles de plateforme (`UserRole`)
`SUPER_ADMIN > ADMIN > MODERATOR > USER`, **un seul rôle par compte**, rôles **fixes** : les permissions sont codées en dur dans
`@churchy/shared` (`platform-permissions.constants.ts`, `PLATFORM_PERMISSIONS`, `hasPlatformPermission(role, 'platform.users.read')`) ; le code teste des
**permissions**, jamais des noms de rôles. Les règles de hiérarchie sont les mêmes pour l'API (qui les impose) et le web (qui ne propose que ce qui est permis) :
- `canChangePlatformRole(acteur, cible, nouveau)` : SUPER_ADMIN gère tout ; ADMIN gère seulement MODERATOR ↔ USER, jamais un ADMIN ni un SUPER_ADMIN (il ne crée pas d'ADMIN) ;
  le **dernier SUPER_ADMIN actif** ne peut pas être retiré, même par lui-même (409 `platformLastSuperAdmin`, transaction sérialisable).
- `canSuspendAccount(acteur, cible, estSoi)` : SUPER_ADMIN suspend tous sauf lui-même ; ADMIN suspend MODERATOR et USER ; MODERATOR et USER personne.
- MODERATOR : accès à l'espace plateforme, messages de contact et contenus publics (permissions déclarées, outils à venir). ADMIN et MODERATOR lisent
  (**GET/HEAD seulement**) les données internes de toute paroisse (`ParishRolesGuard`, `request.parishRole = 'PLATFORM_STAFF'`, notes internes comprises) ;
  l'appartenance réelle à la paroisse passe d'abord (un ADMIN de plateforme qui est admin de sa paroisse garde l'écriture). SUPER_ADMIN passe partout, comme avant.
- API (`apps/api/src/modules/platform`) : `GET /platform/users?q=&page=`, `PATCH /platform/users/:id/role`, `POST /platform/users/:id/suspend|reinstate`, gardées par
  `PlatformPermissionGuard` + `@RequirePlatformPermission('…')` (sans décorateur le garde **refuse** : une route oubliée n'est jamais ouverte). Le rôle est lu **en base** à chaque requête
  (`JwtStrategy`), pas dans le JWT : un rôle retiré ou un compte suspendu perd l'accès tout de suite. `POST /admin/auth/pin-reset-link` demande `platform.pin-reset` (ADMIN et SUPER_ADMIN).
- **Suspension** (`User.suspendedAt`) : `JwtStrategy` refuse (401 `accountSuspended`), `AuthService.issueSession` — point de passage de toute connexion et de tout refresh — refuse (403), et la suspension
  révoque tous les refresh tokens. Un changement de rôle révoque aussi les sessions de la personne. Les deux sont journalisés (`AuthAuditLog` : `PLATFORM_ROLE_CHANGED`, `ACCOUNT_SUSPENDED`,
  `ACCOUNT_REINSTATED`, avec `actorId` et `detail` « ANCIEN>NOUVEAU »).
- Web : `PlatformSwitch` (interrupteur « Mon espace | Plateforme », `role="switch"`, dans `Header`, visible avec `platform.access`) ; le mode se déduit de l'URL, rien n'est mémorisé.
  `/platform` (comme `/dashboard` : sans préfixe de langue, `UNPREFIXED` de `i18n/paths.ts`, protégé par le middleware, `PlatformGuard` renvoie les comptes sans rôle à `/dashboard`) :
  accueil, `/platform/users` (comptes, rôle, suspension en deux temps ; cartes sur mobile, tableau dès `md`), `/platform/pin-reset` (l'ancienne adresse `/dashboard/admin/pin-reset` redirige).
  `Sidebar`/`MobileNav` prennent `area="platform"`, filtrés par permission. Après connexion (`afterLoginPath`) un compte de plateforme arrive **toujours sur `/platform`**, sauf `?next=` explicite.
  Premier SUPER_ADMIN : changer `User.role` en base (aucune route ne le fait, volontairement). Pas encore d'UI d'administration au-delà des comptes et du PIN.

**Configuration** (`apps/api/src/config/env.ts`, validée au démarrage, aucune valeur de secours) :
`GOOGLE_CLIENT_ID` (facultatif), `PIN_PEPPER` (poivre des PIN, 32 car. min., **obligatoire en production**), `JWT_SECRET` obligatoire (16 car. min., refusé en production s'il ressemble à un exemple),
`ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `FRONTEND_URL`, `AUTH_THROTTLE_LIMIT`, `THROTTLE_LIMIT`.
En production : `NODE_ENV=production` (cookies `Secure`), web et API sur le même domaine racine (cookies
`SameSite=Lax`), et `trust proxy` si l'API est derrière un reverse proxy (limitation par IP).

**Autorisations par paroisse** : `@ParishAccess('parish.xxx', kind?, param?)` + `ParishRolesGuard` (`apps/api/src/common`). Comme pour la
plateforme, le code teste une **permission** (`hasParishPermission(membre, perm)`, `parish-permissions.constants.ts` de `@churchy/shared`), jamais un nom de rôle.
Le guard retrouve la paroisse via l'URL **ou via la ressource visée** (célébration, modèle, contenu, étape) pour qu'un identifiant d'une autre paroisse ne contourne pas le contrôle.
`SUPER_ADMIN` passe partout ; ADMIN/MODERATOR de plateforme lisent en GET/HEAD (voir « Rôles de plateforme »). Les services vérifient aussi l'isolation. Toute nouvelle route
qui touche une ressource de paroisse doit porter `@ParishAccess` (test d'autorisation dans `test/authorization.e2e-spec.ts`).
- **Statut** (`ParishMember.status`) : `FAITHFUL` (fidèle, « Follower ») < `PARISHIONER` (paroissien, « Member ») < `PARISH_ADMIN` (plusieurs ; le dernier ne part pas : 409 `parishLastAdmin`,
  transaction sérialisable). **Responsabilités** (`duties`, cumulables, **réservées à un paroissien** : un fidèle n'en a jamais, rétrograder les efface) : `PREPARER`, `READER`, `ANNOUNCER`.
- **Permissions** : `parish.view` (tout fidèle : voir la paroisse) · `parish.view.members` (paroissien+ : annonces/activités « Paroissiens seulement ») · `parish.internal.read`
  (Lecteur, Préparateur, admin : séries, feuilles non publiées, modèles, contenus) · `parish.celebrations.write` (Préparateur, admin : préparer/publier, notes internes) ·
  `parish.announcements.write` (Rédacteur, admin) · `parish.manage` (admin : identité publique, membres, responsabilités). Un fidèle ne voit donc que le public.
- **Visibilité** (`ContentVisibility` `PUBLIC` | `MEMBERS`, sur `Announcement` et `Activity`, champ `visibility`, `PUBLIC` par défaut) : `GET /parishes/:id/announcements|activities` (`parish.view`)
  ne renvoie le « Paroissiens seulement » qu'à un paroissien ou plus (`canSeeMembersContent`) ; `PublicService` (site public, sans session) **filtre toujours `PUBLIC`**. Formulaires web : `VisibilityField`.
- **Devenir fidèle** : `POST /parishes/:id/follow` (connecté, sans validation, idempotent, limité comme l'authentification, `MAX_FAITHFUL_PARISHES` = 20 → 409 `parishFollowLimit`) ;
  le nom et le prénom sont ceux du **compte** (déjà demandés à l'inscription, jamais ressaisis) ; `GET /parishes/:id/membership` (mon statut, `status: null` si aucun) ;
  `DELETE /parishes/:id/follow` = se retirer **d'un cran** : paroissien/admin → fidèle (responsabilités effacées), fidèle → quitte (`{ membership: null }`) ; le dernier admin ne peut pas.
- **Gestion par l'admin** (`parish.manage`, `/parishes/:id/members`) : `GET ?q=&status=&page=` (30 par page ; **nom, prénom, date, statut, responsabilités — jamais d'email ni de téléphone**),
  `PATCH /:userId` (`{ status?, duties? }` : promotion fidèle → paroissien **immédiate**, sans invitation, plusieurs admins), `DELETE /:userId` (retrait sans blocage sauf dernier admin).
  L'ancien ajout par email n'existe plus (peu d'emails au Cameroun). Les paroissiens ne se voient pas entre eux. Favoris et statut de fidèle sont indépendants.
- Migration `parish_status_duties` : ancien `PARISH_ADMIN` → admin ; `PREPARER` → paroissien + Préparateur + Rédacteur (il écrivait aussi les annonces) ; `READER` → paroissien + Lecteur ; `VIEWER` → paroissien.
- Web : `FollowButton` (en-tête du mini-site d'une paroisse) — visiteur → `/login?next=` puis retour ; boîte de dialogue qui annonce « l'administrateur verra votre nom et prénom, pas votre email ni
  téléphone » + lien vers la confidentialité ; fidèle : « Ne plus suivre » ; paroissien : « Me retirer (redevenir fidèle) » ; admin : pas de retrait ici. `enums.parishStatus` / `enums.parishDuty`
  (`useLabels`). La politique de confidentialité a une section « Devenir fidèle d'une paroisse ».
- **Vue d'une paroisse dans `/dashboard`** (`/dashboard/parishes/[id]`, « Mes paroisses » liste gérées **et** suivies, avec le statut) : `useParishAccess(parishId)` lit `GET …/membership` et
  expose `can(permission)` (même `hasParishPermission` que l'API ; SUPER_ADMIN tout ; ADMIN/MODERATOR de plateforme sans appartenance : lecture seulement). Le web ne fait que **proposer** :
  sections Bibliothèque/Modèles/Célébrations = `parish.internal.read`, Annonces/Activités = `parish.view`, « Modifier » = `parish.manage`, ajout/suppression d'annonces et d'activités = `parish.announcements.write`.
  En-tête : `FollowButton` + `FavoriteButton` + lien vers le site public ; un non-admin voit un bandeau « réservée à ses administrateurs ». Un paroissien voit les annonces « Paroissiens seulement » dans la liste (l'API les renvoie).

**Web** : `AuthProvider` (contexte) + `useAuth`, `middleware.ts` (redirige les pages privées sans session vers
`/login?next=…` ; `next` est validé par `safeNextPath`), `AuthGuard` (filet côté client), client API
(`lib/api/client.ts`) qui rafraîchit la session en silence sur un 401 (un seul refresh partagé) et émet
`churchy:session-expired` si c'est impossible. Pages : `/login`, `/register`, `/forgot-password`,
`/reset-password?token=`, `/verify-email?token=`. Le `next` n'est jamais mémorisé après une déconnexion volontaire.

## Langues : français / anglais (i18n)
Le Cameroun est bilingue. Langues : `fr` (défaut) et `en` (`LOCALES`, `DEFAULT_LOCALE`, `isLocale` dans `@churchy/shared`).
- **URL** : le site public et l'authentification sont **préfixés** (`/fr/paroisses/12/messes`, `/en/parishes/12/masses`), avec
  des segments **traduits** (`apps/web/src/i18n/routing.ts`, `pathnames`). Les dossiers de `app/[locale]` gardent les chemins
  **internes** (`/paroisses/[parishId]/messes`, `/login`) ; `i18n/paths.ts` convertit interne ⇄ visible (fonctions pures, utilisées
  par le middleware). Le **tableau de bord (`/dashboard`) n'a pas de préfixe** : sa langue vient du compte (cookie). L'API est
  inchangée (`/api/…`) ; nginx n'a rien à savoir des langues.
- **Liens et navigation** : toujours `Link`, `useRouter`, `usePathname` de `@/i18n/link` (jamais `next/link` ni `next/navigation` pour
  ça) et écrire des chemins **internes** ; la langue courante est ajoutée (`localizeHref`). `/dashboard`, URL externes et ancres sont intacts.
  Hors composant client (action d'un `<form>`, métadonnées) : `localizeHref(locale, '/paroisses')` / `toLocalizedPath` de `i18n/paths.ts`.
- **Choix de la langue** : `/` et les anciennes URL sans préfixe → langue du cookie `NEXT_LOCALE` (1 an), sinon **français** ;
  `Accept-Language` n'est volontairement pas lu. Le middleware (`middleware.ts`) redirige (307 pour `/`, 308 pour les anciennes URL).
  Le visiteur change de langue avec `LanguageSwitcher` (FR | EN, en-tête public et tableau de bord) : vrais liens `hreflang`, cookie.
- **Compte** : `User.locale` (`fr` par défaut) fait foi. `POST /auth/register` accepte `locale` (langue de l'interface),
  `PATCH /auth/me/locale` la change ; `AuthUserDto.locale`. `LocaleSync` aligne le cookie sur le compte dès qu'il est connu et recharge
  le tableau de bord si besoin ; il ne redirige **jamais** le site public (une URL partagée reste explicite). Un changement de langue
  d'un connecté est enregistré en base (toast d'erreur si impossible, la langue change quand même).
- **Textes** : `next-intl`, `apps/web/messages/fr.json` et `en.json` (mêmes clés et mêmes variables : test `i18n/messages.spec.ts`).
  **Aucun texte en dur dans l'interface** : `useTranslations('espace')` (composants, y compris serveur non asynchrones) ou
  `getTranslations` (serveur asynchrone). Pluriels en ICU (`{count, plural, one {…} other {…}}`), liens dans un texte avec
  `t.rich` (`<link>…</link>`). Les valeurs de l'API (type de célébration, de contenu, état de feuille, sujet de contact) se
  traduisent par `useLabels()` (`i18n/labels.ts`) ou `getLabels()` (`labels.server.ts`) : clés `enums.*`. Jours : `weekdays.*`.
  `request.ts` : langue de l'URL, sinon cookie, sinon `fr`. Le client API envoie `Accept-Language` (page → `lang` ; rendu serveur → langue de la requête).
- **Dates** (`lib/format.ts`) : `formatDateLong(iso, { timeZone, locale })` ; `locale` vient de `useAppLocale()` (`i18n/locale.ts`,
  toujours une langue gérée) ou de `getLocale()` côté serveur. Français `fr-FR`, anglais `en-GB` (jour avant le mois, heure sur 24 h).
- **Métadonnées** : `pageMetadata` / `parishMetadata` (`lib/seo.ts`) donnent titre, description, `canonical`, `hreflang` (fr, en,
  x-default), Open Graph (`og:locale`, `alternateLocale`) et Twitter Card ; `staticPageMetadata` (`lib/seo.server.ts`) pour les pages
  statiques. L'image d'aperçu est **par langue** : `app/[locale]/opengraph-image.tsx` (`/fr/opengraph-image`, `/en/opengraph-image`).
  `[locale]/layout.tsx` porte un `NextIntlClientProvider` (recréé quand la langue change) et `HtmlLang` (tient `<html lang>` à jour
  en navigation). `app/global-error.tsx` est la seule page bilingue en dur (le layout racine a échoué).
- **Tests de composants** : `vitest.setup.ts` simule `useLocale`/`useTranslations` avec les vrais messages (français par défaut,
  `setTestLocale('en')` ; le traducteur est mémoïsé, comme dans next-intl, sinon les effets qui l'ont en dépendance bouclent) ;
  les `href` attendus sont ceux de la langue (`/fr/paroisses/p1`). `i18n/english.spec.tsx` vérifie l'interface en anglais.
- **Erreurs : codes stables** (`@churchy/shared`, `constants/error-codes.constants.ts`) : schémas Zod, planning (`SCHEDULE_WINDOW_MESSAGES`)
  et exceptions de l'API renvoient un **code** (`ERR.parishNotFound`, `ERR.emailInvalid`…), jamais une phrase. `errorText(code, locale)`
  le traduit (fr/en, `{max}` rempli ; un texte inconnu est rendu tel quel). Le client API traduit `ApiError.message` et les erreurs
  de champ avec la langue de la page ; `FormMessage` (et les erreurs écrites à la main : `useErrorText()` de `i18n/error-text.ts`)
  traduit les codes des schémas côté navigateur. **Nouveau message d'erreur = nouvelle entrée du catalogue (fr + en)**, puis `ERR.xxx`.
- **Emails** : les jobs d'authentification portent `locale` (`authLinkEmailPayloadSchema`, `fr` par défaut) = `User.locale` ; le worker
  (`apps/notifications/src/email-templates.ts`, textes `AUTH_TEXTS`) écrit sujet, texte, HTML (`lang`) et date dans cette langue. Le lien
  est celui de la langue du compte (`authLinkPath` de `@churchy/shared` : `/en/reset-password`, `/fr/reinitialisation` ; table vérifiée
  contre `routing.pathnames`). L'email de contact, destiné à l'équipe, reste en français.
- **Référencement** : `app/sitemap.ts` (pages statiques + 5 pages par paroisse, chacune dans les deux langues avec `hreflang` et `x-default` ; généré à la demande, 4 000 paroisses max ; API injoignable → pages statiques seules) et `app/robots.ts` (exclut `/api/`, `/dashboard`, authentification et favoris dans chaque langue). Logique dans `lib/sitemap.ts`, URL du site dans `lib/site.ts` (`NEXT_PUBLIC_SITE_URL`). Une page publique **nouvelle** s'ajoute à `STATIC_PATHS` ; une page privée à `PRIVATE_PATHS`.
- **Pages légales** (`LegalDocument`, `components/public`) : conditions, confidentialité et mentions légales sont des tableaux `sections` ({ title, paragraphs?, items?, after? }) dans `messages/*.json`, avec sommaire et ancres `#section-N`. Les faits propres à l'éditeur restent entre crochets `[À compléter : …]` (identité de l'éditeur, directeur de la publication, droit applicable) : bandeau « provisoire » à retirer une fois validés par un juriste.
- **Pays et régions** : la valeur enregistrée reste le nom **français** (identité stable) ; l'affichage passe par `countryLabel(nom, locale)` / `regionLabel(nom, locale)` (`@churchy/shared`, `geo.constants`). Un nom absent de la table (saisie libre) est rendu tel quel. Les villes et quartiers sont des noms propres, non traduits.
- **Domaine** : pour l'instant `churchy.tigilabs.com` ; le domaine définitif sera communiqué par le propriétaire (il suffira de changer `NEXT_PUBLIC_SITE_URL`).
- **Paramètres de requête** : le nom **interne** s'écrit dans le code (`?mois=`), `localizeHref` le rend visible dans la langue (`?month=` en anglais) ; table `QUERY_PARAMS` de `i18n/paths.ts`. Lecture côté serveur par `readQueryParam(searchParams, 'mois')` (accepte les deux noms : les anciens liens restent valides) ; `LanguageSwitcher` renomme le paramètre en changeant de langue (`localizeSearch`). Nouveau paramètre traduit = nouvelle entrée de la table.
- **Reste à faire** : rien de planifié côté i18n.

## Site public (sans authentification)
Pages servies par le web (rendu serveur, `force-dynamic`, URL **par id** de paroisse, pas par slug ; chemins ci-dessous = chemins **internes** en français, voir « Langues » pour les URL visibles `/fr/…` et `/en/…`) :
`/` (landing : recherche en premier), `/paroisses?q=&page=` (résultats), `/paroisses/[id]` (mini-site : accueil,
`/messes`, `/messes/[celebrationId]`, `/annonces`, `/activites`), `/pour-les-paroisses`, `/a-propos`, `/contact`,
`/conditions-generales`, `/confidentialite`, `/mentions-legales` (textes légaux **provisoires** : à faire valider).
L'API expose `GET /api/public/parishes` (recherche paginée : tous les mots dans nom/ville/quartier/église/adresse,
insensible à la casse mais **pas aux accents**), `/public/parishes/:id` (+ `/celebrations`, `/announcements`,
`/activities`), `/public/celebrations/:id` et `POST /api/contact` (limité comme l'auth, piège à robots `website`).
Ces routes n'ont volontairement **pas** de `@ParishAccess` : elles ne renvoient que des vues publiques
(`PublicService`, liste blanche de champs, types `Public*` de `@churchy/shared`), jamais les entités Prisma.
- Une **date** (occurrence) est visible si sa série est **annoncée** et non archivée : « feuille disponible » si la feuille
  de cette date est publiée, sinon « feuille en préparation » (sans déroulement). Une date **annulée** reste affichée comme
  telle (motif public, pas de déroulement). Séries non annoncées et archivées : 404. L'URL publique `/messes/[id]` porte l'id
  de la **date**.
- « À venir » = depuis 3 h avant l'heure de début. Les heures sont affichées dans le **fuseau de la paroisse** (`Parish.timezone`).
- **Calendrier public** : `GET /api/public/parishes/:id/calendar?month=AAAA-MM` (mois courant par défaut ; dates passées et
  annulées comprises) et page `/paroisses/[id]/calendrier?mois=` : grille dès `md`, liste des jours à célébration sur mobile.
- `description` (série) et `occurrenceDescription` (date) sont **publiques** (HTML nettoyé). Les **notes internes** ne sortent
  jamais : `PublicService` ne les sélectionne même pas (test de non-fuite dans les tests unitaires et e2e).
- Les paroisses sont toutes publiques pour l'instant (pas de drapeau de visibilité).
- Contact (facultatif) : `phone` et `email` de la paroisse. Le téléphone suit le format du pays (`PHONE_FORMATS` dans
  `@churchy/shared` : indicatif, regroupement, exemple) ; le champ web (`PhoneField`) affiche l'indicatif, un placeholder
  d'exemple et masque la saisie, et enregistre le numéro international (« +237 6 77 12 34 56 »). Pays sans format :
  saisie libre. Le contrôle « numéro complet » est côté formulaire (`withCompletePhone`) ; l'API n'exige que des
  caractères de numéro. Sur la page publique, téléphone et email sont des liens `tel:` / `mailto:`.
- Gestion : `PATCH /parishes/:id` (identité publique, ADMINS), `announcements` et `activities` (`/parishes/:parishId/…`,
  lecture `parish.view`, écriture/suppression `parish.announcements.write`, avec `visibility`), `PATCH /celebrations/:id/announced`.
- Les pages sont rendues par le serveur web : toutes les requêtes publiques partent de **la même IP**. En production,
  transmettre l'IP du visiteur (`X-Forwarded-For` + `trust proxy`) pour que la limite `THROTTLE_LIMIT` ne
  s'applique pas à l'ensemble des visiteurs.

## Paroisses favorites et aperçu des liens
- **Favoris** (`MAX_FAVORITE_PARISHES` = 10, `@churchy/shared`). **Visiteur** : ids dans le `localStorage` (`churchy:favorites`, `lib/favorites/storage.ts`),
  résumés demandés à `GET /api/public/parishes/summaries?ids=a,b,c` (public, ordre conservé, ids inconnus ignorés, 10 max).
  **Connecté** : table `FavoriteParish` (clé `userId+parishId`, cascade) ; routes `GET /favorites`, `PUT|DELETE /favorites/:parishId`
  (idempotentes, 409 au-delà de 10, 404 si paroisse inconnue), `POST /favorites/merge` (union sans doublon, surplus écarté).
  Pas de `@ParishAccess` : un favori n'est qu'un raccourci, il ne donne aucun droit (module `apps/api/src/modules/favorites`).
- Web : `FavoritesProvider` (dans `app/layout.tsx`, sous `AuthProvider`) + `useFavorites` / `useFavoriteItems`. À la connexion, les favoris de
  l'appareil sont **fusionnés dans le compte puis effacés de l'appareil** ; à la déconnexion l'appareil ne garde rien. `FavoriteButton`
  (étoile, sur les cartes de résultat et l'en-tête de paroisse), bloc `FavoritesShelf` sur la landing (rien sans favori), page `/favoris`,
  lien « Mes favoris » dans l'en-tête public (avec compteur). Dans le tableau de bord, `Sidebar`/`MobileNav` mènent à `/dashboard/favorites` (`DashboardFavorites`) : on ne quitte pas l'espace connecté ; « Voir la paroisse » et « Trouver une paroisse » y ouvrent le site public dans un **nouvel onglet** (`ParishResultCard newTab`).
- **Aperçu des liens partagés** (WhatsApp, Facebook, X…) : `metadataBase` (`NEXT_PUBLIC_SITE_URL`, défaut `https://churchy.tigilabs.com`), Open Graph +
  Twitter Card dans `app/layout.tsx`, image 1200×630 générée par `app/opengraph-image.tsx` (et `twitter-image.tsx`), métadonnées par paroisse
  (`lib/seo.ts` `parishMetadata`). Les réseaux mettent les aperçus en cache : après un changement, tester avec un lien `?v=2` ou le débogueur Facebook.

## Célébrations : séries, dates et feuilles de préparation
Trois niveaux (`apps/api/src/modules/celebrations`, schémas dans `@churchy/shared`) :
- **Série** (`Celebration`) : titre, type, lieu, `description` publique (texte riche), `internalNote` (**interne**), `announced`
  (visible du public : **toutes** ses dates), `defaultTemplateId` (modèle proposé), `archivedAt`.
- **Date** (`CelebrationOccurrence`, `startsAt` en UTC) : `description` (précision publique, ex. « l'évêque sera là »),
  `internalNote`, `status` `SCHEDULED`/`CANCELLED` + motif. Une date est créée par la série : dates ponctuelles ou
  **récurrence hebdomadaire** (début, fin, jours, heure) **dépliée en vraies dates** à la création.
- **Feuille** (`PreparationSheet`, 1 par date, **créée à la demande**) : depuis un modèle (par défaut celui de la série, ou un
  autre) ou **à la volée** (vide, étapes libres). Étapes (`CelebrationStep`) rapprochées par `key`.
Règles (toutes testées, unitaire + e2e) :
- **Le passé est immuable** : une date dont `startsAt <= maintenant` ne peut plus être modifiée, annulée, rétablie ni préparée
  (409) ; une série dont toutes les dates sont passées n'est plus modifiable. Création/prolongation : dates **à venir** et dans
  l'**horizon d'un an** (`scheduleHorizon`), sinon 400 avec l'erreur sous le champ `schedule`.
- **Heures locales** : le planning est saisi en date + heure locales et converti avec `Parish.timezone` (défaut selon le pays,
  `timezoneForCountry`) ; « chaque dimanche à 10 h » reste à 10 h au changement d'heure (`@churchy/shared` `schedule.ts`,
  partagé API + web pour l'aperçu).
- **Notes internes** : `canSeeInternalNotes` (ADMIN, PREPARER, SUPER_ADMIN) ; `ParishRolesGuard` pose `request.parishRole`
  (décorateur `@CurrentParishRole()`), les lecteurs ne reçoivent **pas la clé** `internalNote`.
- **Changer de modèle** (`PATCH /sheets/:id/template`, `dryRun` pour l'aperçu) : étapes rapprochées par `key` (contenu conservé),
  étapes manquantes ajoutées vides, étapes **vides** sans équivalent retirées, étapes **remplies** sans équivalent gardées comme
  étapes libres : rien n'est perdu en silence. `null` = détacher (à la volée).
- **Rappel de fin de série** : `endingSoon` (dernière date dans les 30 jours, `SERIES_END_REMINDER_DAYS`) → message box
  (`EndingSoonDialog`, une fois par session) et alerte sur la série ; `POST /celebrations/:id/occurrences` prolonge.
- Routes : `/parishes/:id/celebrations` (POST, GET), `/celebrations/:id` (GET, PATCH, `archive`, `unarchive`, `occurrences`),
  `/occurrences/:id` (GET, PATCH, `cancel`, `reinstate`, `sheet`), `/sheets/:id` (GET, `template`, `steps`, `steps/order`,
  `steps/:stepId`, `publish`, `unpublish`). Gardes : `@ParishAccess(…, 'celebration' | 'occurrence' | 'sheet')`.
- **Modèles** : `PATCH /templates/:id` (nom, type, description et liste **complète** des étapes dans l'ordre : une étape avec `id` garde sa clé, sans `id` elle est créée, absente elle est retirée ; les feuilles déjà créées gardent leurs étapes, qui deviennent libres) et `DELETE /templates/:id` (feuilles et séries détachées). Page web `/templates` : cartes repliées (titre + sous-titre), bouton pour déplier, Modifier, Supprimer en deux temps. **Publier une feuille ramène à la série.**
- Web : `/dashboard/parishes/[id]/celebrations` (liste + rappel), `/new`, `/[celebrationId]` (série et ses dates),
  `/[celebrationId]/dates/[occurrenceId]` (préparation : feuille + infos de la date), `/templates` (création de modèles).

## Retour d'information : toasts et erreurs (obligatoire)
Toute action de l'utilisateur annonce son résultat par un **toast** (`notify.success` / `notify.error`, `apps/web/src/lib/notify.ts`),
et tout échec d'envoi de formulaire passe par `handleSubmitError` (erreurs Zod de l'API sous les champs, autres erreurs en message
général + toast). Détails et tests à écrire : `apps/web/CLAUDE.md`, « Toasts et erreurs ». Une nouvelle action sans toast de
succès ni gestion d'erreur testée est incomplète.

## Texte riche (éditeur)
`RichTextEditor` (`apps/web/src/components/rich-text`, Tiptap) sert pour le contenu des chants/psaumes/lectures
(`Content.body`), des annonces (`body`) et des activités (`description`) ; `allowImages` (activités) ajoute les images
inline (bouton, collage, glisser-déposer : redimensionnées ≤ 1280 px, JPEG, **base64 dans le texte** — pas de stockage
de fichiers pour l'instant). Le texte est stocké en **HTML** dans les mêmes colonnes ; un ancien texte brut reste valide
(`isRichHtml`/`toRichHtml` dans `@churchy/shared`, affiché par `RichContent` sans être interprété).
- Le HTML est **nettoyé par l'API à l'écriture** (`sanitizeRichText`, liste blanche sanitize-html : pas de script, styles
  limités à couleur/surlignage/alignement, images `data:image` ou http(s) seulement) : le site public l'affiche tel quel.
  Toute nouvelle route qui accepte du texte riche doit passer par `sanitizeRichText`.
- Limites : `RICH_TEXT_MAX_LENGTH` (1,5 M caractères) ; corps JSON de l'API à 2 Mo ; nginx `client_max_body_size 5m`.
- Responsive : barre d'outils essentielle sur mobile (bouton « Plus d'options » pour le reste), ruban complet + compteur
  de mots dès `md`. Pour l'utiliser dans un autre champ : `<RichTextEditor value onChange … />` dans un `FormField`.
- Tests : jsdom n'a pas la géométrie utilisée par ProseMirror, d'où des polyfills dans `apps/web/vitest.setup.ts`.

## Files de jobs (BullMQ)
Les noms de files et payloads sont dans `@churchy/contracts`. L'API est le **producteur** :
`NotificationsService` enfile `celebration.published` (publication de la **feuille d'une date** ; `jobId` par date),
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
- `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_SITE_URL` sont **inlinées au build** du web (build args) : les changer impose de reconstruire l'image (`NEXT_PUBLIC_SITE_URL` = `https://churchy.tigilabs.com` dans `docker/.env`, aussi passée à l'exécution) ;
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

## Chantier en cours : rôles et permissions (à effacer au fur et à mesure)
Cette section est la référence du chantier. **Cocher la checklist à chaque étape** ; quand un lot est terminé, déplacer ses règles
vers les sections permanentes (Authentification, Autorisations par paroisse…) et **supprimer** le lot d'ici. Supprimer la section entière à la fin.

**Décisions restantes (lot 4)**
- Écran des membres (admin) : nom, prénom, date, statut, responsabilités (ni email ni téléphone), recherche, promotion immédiate, attribution des responsabilités, retrait ; l'API existe (`/parishes/:id/members`).
  Texte à ajouter : un fidèle/paroissien qui se retire redevient fidèle ; l'admin peut retirer sans blocage ; le dernier admin reste.

**Checklist** (chaque lot : tests unitaires + e2e API + Playwright 3 viewports + essais réels navigateur et API, précommit, push, CI `dev` vert)
- [x] Lot 1 — rôles plateforme (terminé, effacé de cette liste ; règles dans « Rôles de plateforme »)
- [x] Lot 2 — rôles de paroisse (terminé : migration, API fidèle/membres/responsabilités, visibilité, bouton « Devenir fidèle », confidentialité ; règles dans « Autorisations par paroisse »)
  - reste au lot 4 : **l'écran** d'administration des membres (liste, promotion, responsabilités, retrait) — l'API est déjà en place
- [x] Lot 3 — vue lecture seule d'une paroisse dans `/dashboard` (terminé ; règles dans « Autorisations par paroisse », Web)
- [ ] Lot 4 — liste des fidèles, promotion, retrait, quitter

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
5. **tests fonctionnels de l'API** (supertest, base `churchy_test` : `npm run test:e2e -w @churchy/api`).
   Postgres + Redis sont démarrés automatiquement (`npm run infra:up`, qui attend qu'ils soient prêts) ;
   Docker doit donc être lancé.

**Les tests Playwright (web) ne sont PAS dans le précommit** (trop longs : ~15 min) : ils tournent dans le CI de
`dev`, découpés en shards. On les écrit et on les maintient quand même (règle 1) ; pour les lancer en local :
`npm run test:e2e -w @churchy/web` (un fichier : `… -- e2e/public-site.spec.ts`). Un échec Playwright se
découvre donc dans le CI : le lire (`gh run view --log-failed`) et corriger (règle 2 bis).

- Même contrôle à la main : `npm run precommit`. Outils seuls : `npm run lint`, `npm run format`, `npm run format:check`.
- **Si le précommit révèle un problème, il faut le corriger soi-même, dans le code, avant de commiter** :
  erreur ou avertissement de lint, fichier mal formaté, erreur de typecheck, test en échec. On ne se contente pas
  de le signaler, on ne le laisse pas « pour plus tard » et on ne supprime ni n'affaiblit la règle ou le test.
  Puis on relance le précommit jusqu'à ce qu'il soit entièrement vert.
- Ne jamais contourner le hook (`--no-verify`) : corriger la cause.
- Les fichiers indexés sont reformatés/corrigés par le hook : les relire avant de valider le commit.

### 2 bis. Fin de travail : précommit complet, commit, push, suivi du CI
À la fin de **chaque** travail, sans qu'on ait à le demander :
1. lancer le **précommit** (`npm run precommit`, sans Playwright) et corriger tout problème (règle 2) ;
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
