-- ============================================================
-- Migration: 20260419000001_image_tables_sync.sql
-- Purpose:   Schema-sync for image-related tables that live on the
--            hosted DB but were never checked into migrations/.
--            Uses CREATE TABLE IF NOT EXISTS so existing data is
--            preserved.
-- Scope:     property_images only. Storage bucket creation lives
--            in 20260419000000_property_images_storage.sql.
-- ============================================================

-- ------------------------------------------------------------
-- property_images
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_images (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url         text        NOT NULL,
  alt_text    text,
  is_hero     boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id
  ON public.property_images(property_id);

-- Optional: partial unique index ensuring at most one hero per
-- property. Safe to re-apply because "IF NOT EXISTS".
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_images_one_hero_per_property
  ON public.property_images(property_id)
  WHERE is_hero = true;

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Policies — mirror property_timeline pattern.
-- Drop-if-exists lets us re-run the migration safely; IF NOT EXISTS
-- isn't supported on CREATE POLICY in older Postgres versions.
DROP POLICY IF EXISTS "property_images_select_published"  ON public.property_images;
DROP POLICY IF EXISTS "property_images_insert_admin"      ON public.property_images;
DROP POLICY IF EXISTS "property_images_update_admin"      ON public.property_images;
DROP POLICY IF EXISTS "property_images_delete_admin"      ON public.property_images;

CREATE POLICY "property_images_select_published"
  ON public.property_images FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.status = 'published'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "property_images_insert_admin"
  ON public.property_images FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "property_images_update_admin"
  ON public.property_images FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "property_images_delete_admin"
  ON public.property_images FOR DELETE
  TO authenticated
  USING (public.is_admin());
