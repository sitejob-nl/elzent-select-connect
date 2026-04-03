-- ============================================================
-- Migration: 20260403100000_security_hardening.sql
-- Purpose:   Pre-production security hardening
-- ============================================================

-- ------------------------------------------------------------
-- CRITICAL 1: Prevent non-admins from changing their own role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to change role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- ------------------------------------------------------------
-- CRITICAL 4: Guard calculate_match_score against arbitrary
-- profile_id — only own profile or admin can call
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

  -- Regio match: city in regions array (30 pts)
  IF array_length(v_prefs.regions, 1) IS NOT NULL
     AND v_prop.city = ANY(v_prefs.regions)
  THEN
    v_score := v_score + 30;
  END IF;

  -- Type match: property_type in property_types array (25 pts)
  IF array_length(v_prefs.property_types, 1) IS NOT NULL
     AND v_prop.property_type IS NOT NULL
     AND v_prop.property_type = ANY(v_prefs.property_types)
  THEN
    v_score := v_score + 25;
  END IF;

  -- Budget match: price between min and max (25 pts)
  IF v_prop.price IS NOT NULL THEN
    IF v_prefs.budget_min IS NOT NULL AND v_prefs.budget_max IS NOT NULL THEN
      IF v_prop.price >= v_prefs.budget_min AND v_prop.price <= v_prefs.budget_max THEN
        v_score := v_score + 25;
      END IF;
    ELSIF v_prefs.budget_max IS NOT NULL THEN
      IF v_prop.price <= v_prefs.budget_max THEN
        v_score := v_score + 25;
      END IF;
    ELSIF v_prefs.budget_min IS NOT NULL THEN
      IF v_prop.price >= v_prefs.budget_min THEN
        v_score := v_score + 25;
      END IF;
    END IF;
  END IF;

  -- BAR match: bar_percentage >= min_bar (20 pts)
  IF v_prefs.min_bar IS NOT NULL
     AND v_prop.bar_percentage IS NOT NULL
     AND v_prop.bar_percentage >= v_prefs.min_bar
  THEN
    v_score := v_score + 20;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

-- ------------------------------------------------------------
-- HIGH 5: Prevent duplicate access requests by email
-- ------------------------------------------------------------
ALTER TABLE public.access_requests
  ADD CONSTRAINT access_requests_email_unique UNIQUE (email);

-- ------------------------------------------------------------
-- HIGH 7: Fix property_view_counts to exclude drafts/archived
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.property_view_counts AS
SELECT
  p.id AS property_id,
  p.slug,
  p.title,
  COUNT(al.id) FILTER (WHERE al.action = 'view') AS view_count
FROM public.properties p
LEFT JOIN public.activity_log al
  ON al.property_id = p.id
WHERE p.status = 'published' AND p.deleted_at IS NULL
GROUP BY p.id, p.slug, p.title;

-- ------------------------------------------------------------
-- HIGH 8: Add WITH CHECK to profiles_update_admin
-- ------------------------------------------------------------
DROP POLICY "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- MEDIUM 9: Fix activity_log INSERT policy
-- Remove NULL profile_id allowance, require published property
-- ------------------------------------------------------------
DROP POLICY "activity_log_insert_authenticated" ON public.activity_log;
CREATE POLICY "activity_log_insert_authenticated"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND (
      property_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.properties
        WHERE id = property_id
          AND status = 'published'
          AND deleted_at IS NULL
      )
    )
  );

-- ------------------------------------------------------------
-- MEDIUM 5: Allow users to delete their own notifications
-- ------------------------------------------------------------
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());
