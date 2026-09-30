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
npx shadcn@latest add button input label form select textarea toast dialog card
```

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
│   ├── (auth)/       # Login, Register (layout sans sidebar)
│   ├── dashboard/    # Dashboard admin/préparateur
│   └── p/[slug]/     # Pages publiques paroisse
├── components/
│   ├── ui/           # Composants shadcn (NE PAS MODIFIER)
│   ├── auth/         # LoginForm, RegisterForm
│   ├── parish/       # ParishCard, CreateParishForm
│   ├── content/      # CreateContentForm, ContentCard
│   ├── celebration/  # CelebrationCard, CreateCelebrationForm
│   └── layout/       # Sidebar, Header
├── lib/api/          # Clients API typés (auth, parishes, contents, celebrations)
├── lib/auth/         # session.ts (localStorage token)
└── hooks/            # useAuth, useParish
```

## Ajouter un composant shadcn

```bash
npx shadcn@latest add <component-name>
```

## Lien avec @churchy/shared

`@churchy/shared` est un workspace npm (`packages/shared`).
Après modification : `npm run build -w @churchy/shared`.

## Routes principales

- `/` — Landing page publique
- `/login` `/register` — Auth
- `/dashboard` — Dashboard (requiert auth)
- `/dashboard/parishes` — Liste paroisses
- `/dashboard/parishes/[id]` — Détail paroisse
- `/dashboard/parishes/[id]/contents` — Bibliothèque
- `/dashboard/parishes/[id]/templates` — Modèles
- `/dashboard/parishes/[id]/celebrations` — Célébrations
- `/p/[slug]` — Page publique paroisse
- `/p/[slug]/celebrations/[id]` — Célébration publique

> Règles communes (tests obligatoires pour tout changement, précommit lint/format/typecheck/tests) : voir le `CLAUDE.md` à la racine du dépôt.
