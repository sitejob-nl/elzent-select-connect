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
