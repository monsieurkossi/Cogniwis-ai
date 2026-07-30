# Cogniwis MVP

Strategic Decision OS pour indépendants — conversation avec Oni → diagnostic 7 piliers → action guidée.

## Stack

- Next.js 16 (App Router, `src/`, Turbopack)
- TypeScript
- Tailwind CSS v4 (thème CSS-first dans `src/app/globals.css`)
- Supabase (Auth + Postgres + RLS)
- Anthropic Claude (`claude-sonnet-5`)
- Red Hat Display (via `next/font/google`)

## Démarrage

```bash
cp .env.local.example .env.local
# Renseigne NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY (optionnel), ANTHROPIC_API_KEY

# Dans Supabase → SQL Editor, exécuter :
#   supabase/schema.sql

npm install
npm run dev
```

## Flux MVP

1. `/chat` — l'utilisateur discute avec Oni (streaming). Après 5–8 échanges,
   Oni produit un récap préfixé `RECAP` que l'app détecte.
2. Récap validé → si connecté, la conversation est sauvegardée puis
   redirection vers `/diagnostic`. Sinon la conversation est stockée
   temporairement dans `localStorage` (`cogniwis:pending-conversation`)
   et migrée dans Supabase après création du compte via `/auth/signup`.
3. `/diagnostic` — POST `/api/diagnostic` génère et sauvegarde le JSON
   diagnostic (verdict, recadrage, 7 piliers, priorité, règles activées).
4. `/action` — POST `/api/action` génère la 1ʳᵉ action pour le pilier
   prioritaire, avec messages personnalisés par client (livrable copiable).

## Structure

```
src/
├── app/
│   ├── layout.tsx           font Red Hat Display + Navbar
│   ├── page.tsx             landing / redirect si connecté
│   ├── chat/page.tsx
│   ├── diagnostic/page.tsx
│   ├── action/page.tsx
│   ├── auth/{login,signup}/page.tsx
│   └── api/{chat,diagnostic,action}/route.ts
├── components/              15 composants UI
├── lib/
│   ├── anthropic.ts
│   ├── supabase/{client,server,middleware}.ts
│   ├── prompts/oni-system.ts    system prompt + phases diagnostic/action
│   └── types.ts
└── proxy.ts                 auth guard (Next 16 : middleware.ts renommé)

supabase/schema.sql          tables + RLS + trigger auto-profile
```

## Notes

- `proxy.ts` protège `/diagnostic` et `/action` et rebalance les auth routes
  vers `/diagnostic` si déjà connecté.
- Les 3 routes API tournent sur `runtime = "nodejs"` (SDK Anthropic).
- Les diagnostics et actions sont réutilisés s'ils existent déjà pour éviter
  de rebrûler des tokens à chaque rechargement de page.
