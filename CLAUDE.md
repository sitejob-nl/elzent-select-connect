# Resid

Besloten vastgoedplatform voor beleggers. Twee rollen: klant (belegger) en beheerder (Elzent Estates).
"Powered by Elzent Estates" — klein vermeld.

## Stack

- **Frontend**: React 18 + TypeScript + Vite (port 8080)
- **Styling**: Tailwind CSS 3 + shadcn/ui + Radix UI + Lucide icons
- **Fonts**: Playfair Display (headings), Lato (body)
- **Kleuren**: Goud #978257 (primary), navy (secondary), donkere accenten. NIET groen.
- **Backend**: Supabase (Frankfurt, project: lvueuukiekykudfsvnmk)
- **Auth**: Supabase Auth (email/wachtwoord), geen open registratie — admin keurt aanvragen goed
- **State**: React Query (TanStack) voor server state, useState voor lokaal
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validatie
- **Testing**: Vitest (unit), Playwright (e2e)

## Commands

- `npm run dev` — dev server op port 8080
- `npm run build` — productie build
- `npm run test` — unit tests
- `npm run lint` — ESLint

## Conventions

- UI-teksten in het Nederlands
- Code (variabelen, functies, comments) in het Engels
- Components in PascalCase, hooks met use-prefix
- Bestanden: PascalCase voor components/pages, camelCase voor hooks/utils
- shadcn/ui componenten in src/components/ui/
- Pagina's in src/pages/
- Supabase types auto-gegenereerd in src/integrations/supabase/types.ts

## Architecture

- src/pages/ — route pagina's
- src/components/ — herbruikbare componenten + ui/
- src/hooks/ — custom React hooks
- src/contexts/ — React context providers
- src/integrations/supabase/ — Supabase client + types
- src/lib/ — utilities
- supabase/migrations/ — database migraties

## Key Decisions

- Mobile-first design
- Beleggers kunnen NIET zelf registreren — access request flow
- "Exclusief aanbod" (niet "off-market")
- Geen biedingssysteem, wel "interesse melden"
- Schaarste-indicator: "Dit object is X keer bekeken"
- Matchscore als Supabase database function (niet client-side)
- Soft delete (deleted_at) op properties en profiles
- moddatetime triggers op alle tabellen
- Bij match: automatisch email + WhatsApp notificatie
- AI chatbot = LATER
- Platform en website zijn strikt gescheiden
