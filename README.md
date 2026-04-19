# Resid

Besloten vastgoedplatform voor beleggers. Gebouwd voor en door Elzent Estates.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Radix
- Supabase (Auth, Postgres, Edge Functions, Storage)
- React Query, React Hook Form + Zod, React Router

## Development

```bash
npm install
npm run dev        # http://localhost:8080
npm run build
npm run lint
npm run test
```

Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` (zie Supabase project settings).

## Project-specifieke conventies

Zie `CLAUDE.md` voor de volledige lijst.
