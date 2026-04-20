-- ============================================================
-- Migration: 20260421000000_taxonomy_signup.sql
-- Purpose:   Fase 1 van meeting-wijzigingen (20 apr 2026)
--   1. Optioneel phone-veld op access_requests
--   2. Nieuwe admin_regions tabel zodat admin extra steden kan
--      toevoegen bovenop de hardcoded G10-set in taxonomy.ts
--   3. Data-migratie: bestaande 'woning' → 'grondgebonden'
--   4. Nieuwe CHECK-constraint op properties.property_type met
--      de finale set van 8 types (zorg toegevoegd, woning weg)
-- ============================================================

-- ------------------------------------------------------------
-- 1. phone op access_requests
-- ------------------------------------------------------------
ALTER TABLE public.access_requests
  ADD COLUMN IF NOT EXISTS phone text;

-- ------------------------------------------------------------
-- 2. admin_regions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_regions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_regions_select_authenticated" ON public.admin_regions;
CREATE POLICY "admin_regions_select_authenticated"
  ON public.admin_regions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_regions_write_admin" ON public.admin_regions;
CREATE POLICY "admin_regions_write_admin"
  ON public.admin_regions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 3. Data-migratie: woning → grondgebonden
-- Meeting (20 apr 2026): "woning en grondgebonden zijn hetzelfde"
-- ------------------------------------------------------------
UPDATE public.properties
  SET property_type = 'grondgebonden'
  WHERE property_type = 'woning';

-- ------------------------------------------------------------
-- 4. Herdefinieer CHECK op properties.property_type
--    Finale set: appartement, commercieel, gemengd, nieuwbouw,
--                transformatie, kamerverhuur, grondgebonden, zorg
-- ------------------------------------------------------------
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_property_type_check
  CHECK (
    property_type IS NULL OR property_type IN (
      'appartement','commercieel','gemengd','nieuwbouw',
      'transformatie','kamerverhuur','grondgebonden','zorg'
    )
  );
