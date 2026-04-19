# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Resid

Besloten vastgoedplatform voor beleggers. Twee rollen: klant (belegger) en beheerder (Elzent Estates).
"Powered by Elzent Estates" — klein vermeld.

## Stack

- **Frontend**: React 18 + TypeScript + Vite (port 8080)
- **Styling**: Tailwind CSS 3 + shadcn/ui + Radix UI + Lucide icons
- **Fonts**: Playfair Display (headings), Lato (body)
- **Kleuren**: Goud `#978257` (primary), navy (secondary), amber waar geel/oranje nodig is. **NIET groen** — geen `emerald-*` of `green-*` tailwind classes, ook niet voor success/approved badges.
- **Backend**: Supabase (Frankfurt, project: `lvueuukiekykudfsvnmk`)
- **Auth**: Supabase Auth (email/wachtwoord), geen open registratie — admin keurt aanvragen goed via edge function
- **State**: React Query (TanStack) voor server state, useState voor lokaal
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest (unit), Playwright (e2e, vanilla `@playwright/test`)

## Commands

- `npm run dev` — dev server op port 8080
- `npm run build` — productie build
- `npm run test` / `npm run test:watch` — Vitest
- `npm run lint` — ESLint
- `npx playwright test tests/` — e2e (config in `playwright.config.ts`)

### Environment

Copy `.env.example` → `.env.local`. Required:
- `VITE_SUPABASE_URL=https://lvueuukiekykudfsvnmk.supabase.co`
- `VITE_SUPABASE_ANON_KEY=…` (from Supabase dashboard → API keys)

### Supabase CLI deploys

Edge functions: `supabase functions deploy <name> --project-ref lvueuukiekykudfsvnmk`
Migrations: `supabase db push` (or via Supabase MCP `apply_migration`)

## Conventions

- UI-teksten in het Nederlands, code (identifiers, comments) in het Engels
- Components PascalCase, hooks met `use`-prefix
- shadcn/ui componenten in `src/components/ui/`
- Supabase types auto-gegenereerd in `src/integrations/supabase/types.ts` — regen via MCP `generate_typescript_types` of `supabase gen types typescript --project-id lvueuukiekykudfsvnmk`
- Mobile-first layout

## Architecture

```
src/
  pages/              route pages (admin/ for /admin/*)
  components/         shared components + ui/ (shadcn)
  hooks/              useAdmin.ts (admin mutations), useProperties.ts, useFavorites.ts, useInterest.ts, usePreferences.ts
  contexts/           AuthContext, ThemeContext
  integrations/supabase/   client.ts + types.ts (generated)
  lib/                taxonomy.ts, utils.ts
supabase/
  functions/
    _shared/cors.ts           ALLOWED_ORIGINS whitelist — add new origins here
    approve-access-request/   admin-gated: invites user + marks access_request approved
    notify-new-match/         admin-gated: sends email + whatsapp (stub) on new publish
  migrations/                 chronological SQL migrations
```

## Taxonomy (single source of truth)

`src/lib/taxonomy.ts` exports:
- `REGIONS` — 4 cities (Eindhoven, 's-Hertogenbosch, Tilburg, Breda)
- `PROPERTY_TYPES` — **8 canonical lowercase values** (woning, appartement, commercieel, gemengd, nieuwbouw, transformatie, kamerverhuur, grondgebonden) + NL display labels
- `propertyTypeLabel(value)` — always use this for rendering

The DB has a CHECK constraint on `properties.property_type` limiting it to these 8 values (or NULL). Don't add new types without updating both the taxonomy module AND the CHECK constraint.

## Matching + Notifications

### Match scores
- DB functions `calculate_match_score(profile, property)` (scalar) and `calculate_match_scores_for_profile(profile)` (batch, returns table).
- Both are `SECURITY DEFINER` with a guard: callers can only compute scores for their own profile unless they're admin.
- **Lists must use the batch RPC** (`useProperties` does this); detail pages use the scalar.

### Publish notifications
- `useUpsertProperty` fetches the previous `status` before UPDATE and only invokes `notify-new-match` on **draft → published transition** (or a brand-new published insert). Editing an already-published property must never re-mail clients. If the prev-status read fails, defaults to "published" (safer to under-notify than to re-spam).
- `notify-new-match` respects `client_preferences.notify_email` and `notify_whatsapp` independently. Email via Resend (if `RESEND_API_KEY` set). **WhatsApp is a stub** (logs intent, inserts notification row with `channel='whatsapp'`) — to go live, implement `sendWhatsappStub` in `supabase/functions/notify-new-match/index.ts` with Twilio/Meta WhatsApp Business and a `WHATSAPP_PROVIDER_KEY` env var.

## Edge function conventions

Every function under `supabase/functions/` follows the same pattern (see `approve-access-request/index.ts` as canonical):
1. `getCorsHeaders` from `_shared/cors.ts` (OPTIONS preflight → `"ok"`)
2. Bearer token → `auth.getUser(token)` → profile-lookup → assert `role === 'admin'` for admin-only endpoints
3. Deploy with `verify_jwt: true` by default

Adding a new allowed origin: edit `ALLOWED_ORIGINS` in `_shared/cors.ts` and redeploy every function that uses it (shared file gets bundled per-function).

## Key decisions

- Beleggers kunnen NIET zelf registreren — `access_requests` flow; approval gaat via `approve-access-request` edge function (niet een plain DB update), dat maakt de auth-user + profiles row + stuurt invite.
- "Exclusief aanbod" (niet "off-market")
- Geen biedingssysteem — wel "interesse melden" (`interest_requests` tabel)
- Schaarste-indicator: "Dit object is X keer bekeken" — komt uit `property_view_counts` view, gevoed door `activity_log` inserts met `action='view'` (fire-and-forget in `useProperty`)
- Soft delete (`deleted_at`) op properties en profiles — query filters altijd `.is("deleted_at", null)`
- moddatetime triggers op alle tabellen
- Platform (`/`) en marketingwebsite (elzent.nl) zijn strikt gescheiden
- AI chatbot = later
