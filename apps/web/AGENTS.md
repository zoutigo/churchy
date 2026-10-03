# @churchy/web — Next.js Frontend (apps/web)

Frontend Next.js App Router du SaaS Churchy.

## Lancer le projet

```bash
cp .env.local.example .env.local
npm install
# Installer les composants shadcn nécessaires (voir ci-dessous)
npm run dev
# Web sur http://localhost:3200
```

## Installer les composants shadcn

```bash
npx shadcn@latest init
npx shadcn@latest add button input label form select textarea toast dialog card dropdown-menu alert
```
(les composants sont déjà générés dans `src/components/ui`.)

## Standard UI OBLIGATOIRE — shadcn + RHF + Zod

**Tous les formulaires DOIVENT suivre ce pattern :**

```tsx
const form = useForm<MyDto>({
  resolver: zodResolver(mySchema),   // schema depuis @churchy/shared
  defaultValues: { ... },
  mode: 'onChange',                  // validation en temps réel
});

// Dans le JSX :
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input {...field} />         {/* border rouge auto si invalide */}
          </FormControl>
          <FormMessage />               {/* message d'erreur en rouge */}
        </FormItem>
      )}
    />
  </form>
</Form>
```

**Règles :**
- `mode: 'onChange'` → validation en temps réel, border rouge si invalide
- `<FormMessage />` → affiche l'erreur Zod sous le champ en couleur destructive
- Toujours utiliser les composants shadcn existants (jamais recréer)
- Erreurs globales → `form.setError('root', { message })` + afficher avec `form.formState.errors.root`
- **Retour d'information (obligatoire, voir « Toasts et erreurs » ci-dessous)** : toast de succès après chaque action réussie, `handleSubmitError` dans chaque `catch`.

## Architecture

```
src/
├── app/              # Pages Next.js App Router
│   ├── (auth)/       # login, register, forgot-password, reset-password, verify-email
│   ├── dashboard/    # Dashboard admin/préparateur (protégé : middleware + AuthGuard)
│   └── (public)/     # Site public : landing, /paroisses (+ [parishId]/messes|annonces|activites), contact, légal
├── middleware.ts     # redirige les pages privées sans session, et /login & co. si session
├── components/
│   ├── ui/           # Composants shadcn + PasswordInput, ErrorNotice (alert : variantes success/warning)
│   ├── auth/         # AuthProvider, AuthGuard, AuthCard, formulaires, EmailVerificationBanner, VerifyEmail
│   ├── public/       # PublicHeader/Footer, ParishSearchForm (GET), CelebrationItem, SheetCard, ContactForm…
│   ├── news/         # Formulaires annonces/activités du tableau de bord, DeleteButton (suppression en 2 temps)
│   ├── parish/       # ParishCard, CreateParishForm, ParishInfoForm
│   ├── rich-text/    # RichTextEditor (Tiptap, champ de formulaire), RichContent (rendu public)
│   ├── content/      # ContentForm (création + modification), filter (recherche/type), content-labels
│   ├── celebration/  # CelebrationCard, CreateCelebrationForm
│   └── layout/       # Sidebar (≥ md), MobileNav (< md), Header (menu utilisateur), PageHeader, FormView
├── lib/api/          # Clients API typés ; client.ts gère cookies + refresh silencieux
├── lib/notify.ts     # notify.success / notify.error : les toasts de toute l'application
├── lib/forms/        # submit-error.ts : handleSubmitError (erreurs API → champs / message général + toast)
├── lib/auth/         # session.ts : indicateur de session (cookie lisible) + safeNextPath
└── hooks/            # useAuth (contexte AuthProvider), useParish
```

## Authentification côté web

Aucun jeton n'est manipulé par le JavaScript : ils sont dans des cookies httpOnly posés par l'API
(voir « Authentification » dans le `CLAUDE.md` racine). Le site ne voit que `churchy_session=1`.

- `AuthProvider` (dans `app/layout.tsx`) expose `useAuth()` : `user`, `initializing`, `loading`,
  `sessionExpired`, `loggedOut`, `login`, `register`, `logout`, `refreshUser`. Il n'appelle `/auth/me` que si
  le cookie `churchy_session` existe.
- `lib/api/client.ts` : `credentials: 'include'` ; sur 401, **un seul** `POST /auth/refresh` partagé puis la
  requête est rejouée une fois ; en cas d'échec, l'événement `churchy:session-expired` est émis. Les erreurs
  sont des `ApiError` (message lisible + `status`).
- `middleware.ts` ne valide pas la session (l'API le fait) : il évite d'afficher le privé sans session.
  `/login?expired=1` n'est jamais redirigé (évite une boucle avec un cookie périmé).
- Redirection après connexion : `?next=` **toujours** passé par `safeNextPath` (jamais d'URL externe).
  Une déconnexion volontaire retourne à `/login` sans `next`.
- Tout écran qui charge des données doit gérer l'erreur (`ErrorNotice`) : pas de `.then()` sans `.catch()`.
- Champs mot de passe : `PasswordInput` (bouton afficher/masquer). Les `Input` invalides prennent une
  bordure rouge via `aria-invalid` (posé par `FormControl`).

## Tableau de bord : formulaires
- Les formulaires ne sont **jamais ouverts par défaut** : la page affiche les données, et un bouton (« + Nouveau… »,
  « Modifier ») ouvre le formulaire dans un `FormView` qui **remplace** la liste (mobile, tablette et desktop) avec un
  bouton « Retour ». `FormView` est centré (`max-w-5xl`) ; les champs courts se rangent en colonnes dès `sm`/`md`,
  l'éditeur de texte riche prend toute la largeur (hauteur mini 14/22/26 rem). `PageHeader` porte titre + action.
- Les couleurs de `tailwind.config.ts` doivent couvrir tous les jetons utilisés (`bg-popover` manquant rendait les
  listes déroulantes transparentes) ; test : `components/ui/popover-theme.spec.tsx`, e2e `dashboard-forms.spec.ts`.

## Toasts et erreurs (obligatoire, partout)
- **Toute action de l'utilisateur** (création, modification, suppression, publication, envoi) annonce son résultat
  par un toast via `notify` (`lib/notify.ts`) : `notify.success('Titre court', 'détail facultatif')` après un succès,
  `notify.error(…)` après un échec. Ne jamais appeler `toast()` directement, ni laisser une action réussir en silence.
  Succès : vert, 4 s ; erreur : rouge, 7 s. Le `Toaster` est monté une fois dans `app/layout.tsx`.
- **Tout `catch` d'un envoi de formulaire appelle `handleSubmitError(form, err, 'Texte de repli')`** (`lib/forms/submit-error.ts`) :
  les erreurs de validation Zod renvoyées par l'API (`ApiError.fieldErrors`) s'affichent sous les champs concernés,
  toute autre erreur (403, 404, 500, réseau) devient le message général du formulaire (`root`), et un toast d'erreur
  est émis. Pour une action hors formulaire (ex. suppression) : `notify.error(titre, errorMessage(err, 'repli'))`.
  Ne pas remplacer toute la page par une `ErrorNotice` sur un échec d'action : elle est réservée aux erreurs de chargement.
- `lib/api/client.ts` : `ApiError` porte `status` et `fieldErrors` ; un serveur injoignable donne `ApiError` (status 0,
  « Impossible de joindre le serveur ») ; une réponse sans corps (suppression) n'est pas une erreur.
- Un écran qui confirme déjà par lui-même (ex. page « Message envoyé » du contact) garde sa confirmation, avec un toast
  de titre différent pour ne pas dupliquer le texte.
- Tests : unitaire du formulaire (succès → `notify.success`, erreur API → message + `notify.error`, validation Zod),
  et e2e avec `page.route` pour simuler 400 (`fieldErrors`), 500 et panne réseau (voir `e2e/contents-library.spec.ts` ;
  localiser un toast avec `ol > li[data-state="open"]` : le `<li>` Radix n'a pas de rôle et son relais pour lecteurs d'écran a `role="status"`).

## Bibliothèque de contenus
`/dashboard/parishes/[id]/contents` : liste avec recherche (titre + texte, sans casse ni accents) et filtre par type
(`components/content/filter.ts`), pagination « Afficher plus » par 24 ; chaque carte mène à `/contents/[contentId]`
(lecture, **Modifier** → `ContentForm` prérempli, **Supprimer** en deux temps). L'API réserve modification et
suppression à l'**auteur** du contenu : les boutons ne sont affichés qu'à lui. Données de démonstration (réalistes : chants et prières universelles complets, psaumes, évangiles et lectures
résumés, 20 annonces publiques, 18 activités à venir) : `npm run seed:contents -w @churchy/api -- "<fragment du nom de paroisse>" [--reset]`
(données dans `apps/api/scripts/seed/`, contenus marqués du tag `demo`, idempotent, base de dev ; ce que l'utilisateur a saisi n'est jamais
modifié ; garde-fous : `apps/api/src/seed-data.spec.ts`). Les textes sont des originaux ou des résumés, pas des textes liturgiques officiels.

## Ajouter un composant shadcn

```bash
npx shadcn@latest add <component-name>
```

## Lien avec @churchy/shared

`@churchy/shared` est un workspace npm (`packages/shared`).
Après modification : `npm run build -w @churchy/shared`.

## Routes principales

- `/` — Landing publique (recherche de paroisse) ; `/paroisses`, `/paroisses/[id]/…` — voir « Site public » du CLAUDE.md racine
- `/login` `/register` `/forgot-password` `/reset-password?token=` `/verify-email?token=` — Auth
- `/dashboard` — Dashboard (requiert auth)
- `/dashboard/parishes` — Liste paroisses
- `/dashboard/parishes/[id]` — Détail paroisse
- `/dashboard/parishes/[id]/contents` — Bibliothèque
- `/dashboard/parishes/[id]/templates` — Modèles
- `/dashboard/parishes/[id]/celebrations` — Célébrations
- `/p/[slug]` — Page publique paroisse
- `/p/[slug]/celebrations/[id]` — Célébration publique

> Règles communes (tests obligatoires pour tout changement, précommit lint/format/typecheck/tests) : voir le `CLAUDE.md` à la racine du dépôt.

## Site public — conventions
- Pages serveur (`lib/api/public.api.ts`, `orNotFound` → 404 Next) ; `(public)/layout.tsx` est `force-dynamic`.
- Responsive : mobile d'abord. En-tête = logo + menu repliable (< `md`) / liens en ligne (≥ `md`) ; fiche pratique de
  la paroisse dans la page (mobile, tablette) / colonne latérale collante (≥ `lg`) ; sous-navigation de paroisse en
  onglets défilants. Aucun défilement horizontal (testé en e2e sur 390, 820 et 1366 px).
- La recherche est un `<form method="get" action="/paroisses">` : elle marche sans JavaScript.
- Élément de marque : la « feuille » (`SheetCard`, classes `.sheet` / `.sheet-shadow`).
- Les champs `datetime-local` donnent une heure locale sans fuseau : passer par `lib/datetime.ts`
  (`localInputToIso`) avant d'appeler l'API.
