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
- **UX minor** — `onError` handler on gallery `<img>`s to render a
  graceful fallback icon when an upload URL 404s.
- **A11y minor** — On lightbox open, `tabIndex={-1}` + `ref.focus()` on
  the carousel region for nicer keyboard UX (currently
  `onOpenAutoFocus` is prevented entirely).

## Task 3 (Favorites page) follow-ups

- **Small-screen (320px) label wrap** — 4 bottom-nav items with
  `px-4 py-2` at 320px viewport can wrap the "Mijn Profiel" label. Test
  on iPhone SE; if it breaks, reduce `px-2` or shorten labels.
- **Pagination on FavorietenPage** — belegger with 50+ favorites →
  consider pagination or virtual scroll. Non-issue at launch.
