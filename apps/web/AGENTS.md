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

## Architecture

```
src/
├── app/              # Pages Next.js App Router
│   ├── (auth)/       # login, register, forgot-password, reset-password, verify-email
│   ├── dashboard/    # Dashboard admin/préparateur (protégé : middleware + AuthGuard)
│   └── p/[slug]/     # Pages publiques paroisse
├── middleware.ts     # redirige les pages privées sans session, et /login & co. si session
├── components/
│   ├── ui/           # Composants shadcn + PasswordInput, ErrorNotice (alert : variantes success/warning)
│   ├── auth/         # AuthProvider, AuthGuard, AuthCard, formulaires, EmailVerificationBanner, VerifyEmail
│   ├── parish/       # ParishCard, CreateParishForm
│   ├── content/      # CreateContentForm, ContentCard
│   ├── celebration/  # CelebrationCard, CreateCelebrationForm
│   └── layout/       # Sidebar, Header (menu utilisateur), SiteHeader + HeroActions (landing)
├── lib/api/          # Clients API typés ; client.ts gère cookies + refresh silencieux
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

## Ajouter un composant shadcn

```bash
npx shadcn@latest add <component-name>
```

## Lien avec @churchy/shared

`@churchy/shared` est un workspace npm (`packages/shared`).
Après modification : `npm run build -w @churchy/shared`.

## Routes principales

- `/` — Landing page publique
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
