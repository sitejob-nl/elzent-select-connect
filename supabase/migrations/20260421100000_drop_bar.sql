-- ============================================================
-- Migration: 20260421100000_drop_bar.sql
-- Purpose:   Fase 2 — BAR / budget volledig uit DB halen
--   Meeting 20 apr 2026: "BAR kunnen we niet garanderen — moet
--   helemaal weg uit UI en schema. Platform toont alleen circa-
--   prijs + circa-huurinkomsten."
--
-- 1. calculate_match_score (en batch-variant) herbouwen zonder
--    budget/BAR-wegingen. Regio + type nu elk 50 pts.
-- 2. Drop kolommen: properties.bar_percentage,
--    client_preferences.budget_min / budget_max / min_bar
-- 3. Voeg properties.rental_income_annual (integer) toe —
--    admin vult deze handmatig in; vervangt de BAR×prijs-
--    afleiding die op DetailPage stond.
-- 4. Template `new_match` schoonpoetsen: weg met {{property_bar}}.
-- ============================================================

-- ------------------------------------------------------------
-- 1a. Scalar match-score: alleen regio + type
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_match_score(
  p_profile_id  uuid,
  p_property_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs   public.client_preferences%ROWTYPE;
  v_prop    public.properties%ROWTYPE;
  v_score   integer := 0;
BEGIN
  -- Auth guard: only own profile or admin
  IF p_profile_id != auth.uid() AND NOT public.is_admin() THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_prefs
  FROM public.client_preferences
  WHERE profile_id = p_profile_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_prop
  FROM public.properties
  WHERE id = p_property_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Regio match: 50 pts
  IF array_length(v_prefs.regions, 1) IS NOT NULL
     AND v_prop.city = ANY(v_prefs.regions)
  THEN
    v_score := v_score + 50;
  END IF;

  -- Type match: 50 pts
  IF array_length(v_prefs.property_types, 1) IS NOT NULL
     AND v_prop.property_type IS NOT NULL
     AND v_prop.property_type = ANY(v_prefs.property_types)
  THEN
    v_score := v_score + 50;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

-- ------------------------------------------------------------
-- 1b. Batch match-score: zelfde wegingen, geen BAR/budget meer
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_match_scores_for_profile(
  p_profile_id uuid
)
RETURNS TABLE (property_id uuid, score integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs public.client_preferences%ROWTYPE;
BEGIN
  -- Auth guard: only own profile or admin
  IF p_profile_id != auth.uid() AND NOT public.is_admin() THEN
    RETURN;
  END IF;

  SELECT * INTO v_prefs
  FROM public.client_preferences
  WHERE profile_id = p_profile_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    LEAST(
      CASE
        WHEN array_length(v_prefs.regions, 1) IS NOT NULL
         AND p.city = ANY(v_prefs.regions)
        THEN 50 ELSE 0
      END
      +
      CASE
        WHEN array_length(v_prefs.property_types, 1) IS NOT NULL
         AND p.property_type IS NOT NULL
         AND p.property_type = ANY(v_prefs.property_types)
        THEN 50 ELSE 0
      END,
      100
    )::integer AS score
  FROM public.properties p
  WHERE p.status = 'published' AND p.deleted_at IS NULL;
END;
$$;

-- ------------------------------------------------------------
-- 2. Drop BAR/budget kolommen
-- ------------------------------------------------------------
ALTER TABLE public.properties
  DROP COLUMN IF EXISTS bar_percentage;

ALTER TABLE public.client_preferences
  DROP COLUMN IF EXISTS budget_min;

ALTER TABLE public.client_preferences
  DROP COLUMN IF EXISTS budget_max;

ALTER TABLE public.client_preferences
  DROP COLUMN IF EXISTS min_bar;

-- ------------------------------------------------------------
-- 3. Nieuwe rental_income_annual kolom (vervangt BAR×prijs)
-- ------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rental_income_annual integer;

-- ------------------------------------------------------------
-- 4. Template `new_match`: BAR-regel + variabele eruit
-- ------------------------------------------------------------
UPDATE public.email_templates
  SET html = REPLACE(
    html,
    '<p style="color: #978257; font-size: 16px; font-weight: bold; margin: 12px 0 0;">
                {{property_price}} &middot; BAR {{property_bar}}%
              </p>',
    '<p style="color: #978257; font-size: 16px; font-weight: bold; margin: 12px 0 0;">
                {{property_price}}
              </p>'
  )
  WHERE slug = 'new_match';

-- Verwijder {{property_bar}} uit de variables-lijst (jsonb filter op name)
UPDATE public.email_templates
  SET variables = (
    SELECT COALESCE(jsonb_agg(v), '[]'::jsonb)
    FROM jsonb_array_elements(variables) v
    WHERE v->>'name' <> 'property_bar'
  )
  WHERE slug = 'new_match';
