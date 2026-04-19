-- ============================================================
-- Migration: 20260419000000_property_images_storage.sql
-- Purpose:   Create the `property-images` storage bucket used by
--            the admin photo uploader / client-facing carousel.
--            Public read, authenticated admin-only write.
-- ============================================================

-- ------------------------------------------------------------
-- Bucket
-- ------------------------------------------------------------
-- Public read keeps <img src=""> simple and avoids signed-URL
-- refresh overhead. Property photos are shown to all authenticated
-- belegger accounts anyway, so the privacy gain of signed URLs is
-- marginal versus the implementation cost.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------
-- Storage RLS policies
-- ------------------------------------------------------------
-- Drop then create so the migration is idempotent across re-runs.

DROP POLICY IF EXISTS "property_images_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "property_images_admin_insert"   ON storage.objects;
DROP POLICY IF EXISTS "property_images_admin_update"   ON storage.objects;
DROP POLICY IF EXISTS "property_images_admin_delete"   ON storage.objects;

-- Public SELECT (anon + authenticated) — matches public=true bucket
CREATE POLICY "property_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'property-images');

-- Admin-only INSERT
CREATE POLICY "property_images_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND public.is_admin());

-- Admin-only UPDATE (rename / metadata tweaks)
CREATE POLICY "property_images_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'property-images' AND public.is_admin());

-- Admin-only DELETE
CREATE POLICY "property_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images' AND public.is_admin());
