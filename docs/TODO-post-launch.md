# TODO — post-launch follow-ups

Items deferred from the Task 1 (admin image upload) code review on commit
`8bb7cd3`. Everything here is non-blocking for launch but should be
tracked so we don't lose them.

## PropertyImageManager / usePropertyImages

- **Issue #5** — Add a `storage_path` column to `property_images`,
  populate it on insert, and use it for deletes. Removes the need to
  parse the public URL in `useDeletePropertyImage` and makes bucket
  migrations safe.
- **Issue #6** — Blob URL cleanup in `PropertyImageManager` should use
  ref-based diffing instead of the current "revoke on unmount" effect,
  so previews of queue items removed mid-session are freed immediately.
- **Issue #8** — Drag-reorder currently awaits every `update` with
  `Promise.all`. Switch to `Promise.allSettled` and only send updates
  for rows whose `sort_order` actually changed.
- **Issue #9** — Hero toggle should detect the Postgres `23505` unique
  violation (partial unique index on `property_id WHERE is_hero`) and
  surface a clear Dutch message instead of the raw SQL error.
- **Issue #10** — Transactional set-hero: create a `set_hero_image(property_id, image_id)`
  RPC so the "clear all, set one" pair is a single statement. Kills the
  race window that #9 papers over.
- **Accessibility** — PropertyImageManager drop-zone needs keyboard
  affordances (`role="button"`, `tabIndex={0}`, Enter/Space activation)
  and a persistent grip-handle on focus so reorder is not mouse-only.
- **moddatetime** — `property_images` is missing an `updated_at` column
  and the `moddatetime` trigger. CLAUDE.md mandates this on every
  table; add both in the next migration.
- **Named export** — `PropertyImageManager` currently uses `export
  default`. Convert to a named export to match the rest of the
  components dir.

## Task 2 (Photo gallery) follow-ups

Items deferred from the Task 2 code review on commit `53cbf00`.
Critical + important issues are fixed in the follow-up commit; the
items below are defer-to-later polish.

- **Review #4** — `stopPropagation` on the hero overlay: resolved by
  Fix #3 (overlay is now `pointer-events-none` and lives outside the
  Carousel, so clicks/swipes pass through to the image-button).
- **Review #5** — Effect-based hero ↔ lightbox sync could be refactored
  to an imperative `scrollTo` inside `onOpenChange`. Works today;
  optimize later.
- **Review #7** — Prop surface: refactor `PropertyPhotoGallery` to
  accept `overlay: ReactNode` instead of
  `isNew / matchScore / propertyType / viewCount`. Do this before a
  second consumer appears.
- **Review #10** — Verify via React DevTools that the lightbox Carousel
  doesn't mount before first open (Radix Portal + DialogContent
  should handle this, but confirm).
- **A11y minor** — Add a `<DialogDescription>` inside `VisuallyHidden`
  to silence the Radix warning and give SR users instructions
  ("Gebruik pijltjestoetsen om te navigeren. Druk op Escape om te
  sluiten.").
- **A11y minor** — Hero image inside `<button>` — add
  `aria-hidden="true"` on the inner `<img>` to avoid screen-reader
  double-reads (image alt + button label).
- **DRY minor** — Hero height `h-64 sm:h-80 lg:h-96` is duplicated
  across the container, Carousel, CarouselContent and CarouselItem;
  extract to a local constant.
- **UX minor** — `onError` handler on gallery `<img>`s to render a
  graceful fallback icon when an upload URL 404s.
- **A11y minor** — On lightbox open, `tabIndex={-1}` + `ref.focus()` on
  the carousel region for nicer keyboard UX (currently
  `onOpenAutoFocus` is prevented entirely).

## Task 3 (Favorites page) follow-ups

- **Error-state UI** — both `FavorietenPage`, `AanbodPage`, and
  `DashboardPage` show the empty state when `useProperties` /
  `useFavorites` / `useInterestRequests` error (network/RLS). Users
  think data is missing when it's actually a fetch failure. Implement a
  shared `<ErrorState onRetry={...} />` component and wire it into all
  three pages in one sweep.
- **Mobile nav highlight inconsistency** — `AppLayout.tsx` mobile
  bottom-nav uses exact `===` path match while desktop uses
  `startsWith(path + "/")`. When sub-routes are added later, mobile
  won't highlight. Align both to the desktop rule.
- **Small-screen (320px) label wrap** — 4 bottom-nav items with
  `px-4 py-2` at 320px viewport can wrap the "Mijn Profiel" label. Test
  on iPhone SE; if it breaks, reduce `px-2` or shorten labels.
- **Pagination on FavorietenPage** — belegger with 50+ favorites →
  consider pagination or virtual scroll. Non-issue at launch.
