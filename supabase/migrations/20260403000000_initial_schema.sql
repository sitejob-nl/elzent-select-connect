-- ============================================================
-- Migration: 20260403000000_initial_schema.sql
-- Project:   Resid — Vastgoedbeleggersplatform
-- ============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- is_admin(): checks whether the calling user has role = 'admin'
-- SECURITY DEFINER so it runs with the permissions of the owner,
-- preventing RLS recursion on the profiles table itself.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  full_name    text,
  email        text,
  company      text,
  phone        text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- client_preferences
-- ------------------------------------------------------------
CREATE TABLE public.client_preferences (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  regions           text[]      NOT NULL DEFAULT '{}',
  property_types    text[]      NOT NULL DEFAULT '{}',
  budget_min        integer,
  budget_max        integer,
  min_bar           decimal,
  notify_email      boolean     NOT NULL DEFAULT false,
  notify_whatsapp   boolean     NOT NULL DEFAULT false,
  notify_weekly     boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER client_preferences_updated_at
  BEFORE UPDATE ON public.client_preferences
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- properties
-- ------------------------------------------------------------
CREATE TABLE public.properties (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  location        text        NOT NULL,
  city            text        NOT NULL,
  description     text,
  price           integer,
  property_type   text,
  units           integer,
  surface_area    integer,
  bar_percentage  decimal,
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  image_url       text,
  tags            text[]      NOT NULL DEFAULT '{}',
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- property_timeline
-- ------------------------------------------------------------
CREATE TABLE public.property_timeline (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  step_title       text        NOT NULL,
  step_description text,
  step_date        date,
  step_order       integer     NOT NULL,
  is_active        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER property_timeline_updated_at
  BEFORE UPDATE ON public.property_timeline
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- favorites
-- ------------------------------------------------------------
CREATE TABLE public.favorites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, property_id)
);

-- ------------------------------------------------------------
-- interest_requests
-- ------------------------------------------------------------
CREATE TABLE public.interest_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  message     text,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER interest_requests_updated_at
  BEFORE UPDATE ON public.interest_requests
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- leads
-- ------------------------------------------------------------
CREATE TABLE public.leads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL,
  phone      text,
  company    text,
  message    text,
  source     text        NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'linkedin', 'referral', 'other')),
  status     text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'invited', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- access_requests
-- ------------------------------------------------------------
CREATE TABLE public.access_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  name        text        NOT NULL,
  company     text,
  message     text,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ------------------------------------------------------------
-- activity_log (append-only, no updated_at)
-- ------------------------------------------------------------
CREATE TABLE public.activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid        REFERENCES public.properties(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text,
  body       text,
  channel    text        NOT NULL CHECK (channel IN ('email', 'whatsapp', 'in_app')),
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- properties
CREATE INDEX idx_properties_city          ON public.properties(city);
CREATE INDEX idx_properties_property_type ON public.properties(property_type);
CREATE INDEX idx_properties_price         ON public.properties(price);
CREATE INDEX idx_properties_status        ON public.properties(status);
CREATE INDEX idx_properties_deleted_at    ON public.properties(deleted_at);
CREATE INDEX idx_properties_created_by    ON public.properties(created_by);

-- property_timeline
CREATE INDEX idx_property_timeline_property_id ON public.property_timeline(property_id);

-- favorites
CREATE INDEX idx_favorites_profile_id  ON public.favorites(profile_id);
CREATE INDEX idx_favorites_property_id ON public.favorites(property_id);

-- interest_requests
CREATE INDEX idx_interest_requests_profile_id  ON public.interest_requests(profile_id);
CREATE INDEX idx_interest_requests_property_id ON public.interest_requests(property_id);
CREATE INDEX idx_interest_requests_status      ON public.interest_requests(status);

-- activity_log (high-volume)
CREATE INDEX idx_activity_log_profile_id  ON public.activity_log(profile_id);
CREATE INDEX idx_activity_log_property_id ON public.activity_log(property_id);
CREATE INDEX idx_activity_log_created_at  ON public.activity_log(created_at);
CREATE INDEX idx_activity_log_action      ON public.activity_log(action);
CREATE INDEX idx_activity_log_property_action_time
  ON public.activity_log(property_id, action, created_at DESC);

-- access_requests
CREATE INDEX idx_access_requests_status ON public.access_requests(status);

-- notifications
CREATE INDEX idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX idx_notifications_read_at    ON public.notifications(read_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_timeline  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- profiles policies
-- ------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- client_preferences policies
-- ------------------------------------------------------------
CREATE POLICY "client_preferences_select_own"
  ON public.client_preferences FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "client_preferences_insert_own"
  ON public.client_preferences FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "client_preferences_update_own"
  ON public.client_preferences FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "client_preferences_delete_own"
  ON public.client_preferences FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- ------------------------------------------------------------
-- properties policies
-- ------------------------------------------------------------
CREATE POLICY "properties_select_published"
  ON public.properties FOR SELECT
  TO authenticated
  USING ((status = 'published' AND deleted_at IS NULL) OR public.is_admin());

CREATE POLICY "properties_insert_admin"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "properties_update_admin"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "properties_delete_admin"
  ON public.properties FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- property_timeline policies
-- ------------------------------------------------------------
CREATE POLICY "property_timeline_select_published"
  ON public.property_timeline FOR SELECT
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

CREATE POLICY "property_timeline_insert_admin"
  ON public.property_timeline FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "property_timeline_update_admin"
  ON public.property_timeline FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "property_timeline_delete_admin"
  ON public.property_timeline FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- favorites policies
-- ------------------------------------------------------------
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- ------------------------------------------------------------
-- interest_requests policies
-- ------------------------------------------------------------
CREATE POLICY "interest_requests_select_own_or_admin"
  ON public.interest_requests FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "interest_requests_insert_own"
  ON public.interest_requests FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "interest_requests_update_admin"
  ON public.interest_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- leads policies (admin only)
-- ------------------------------------------------------------
CREATE POLICY "leads_admin_all"
  ON public.leads FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- access_requests policies
-- ------------------------------------------------------------
CREATE POLICY "access_requests_insert_anon"
  ON public.access_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "access_requests_insert_authenticated"
  ON public.access_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "access_requests_select_admin"
  ON public.access_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "access_requests_update_admin"
  ON public.access_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- activity_log policies
-- ------------------------------------------------------------
CREATE POLICY "activity_log_select_own_or_admin"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "activity_log_insert_authenticated"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL OR public.is_admin());

-- ------------------------------------------------------------
-- notifications policies
-- ------------------------------------------------------------
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notifications_insert_admin"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- TRIGGER: auto-create profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- FUNCTION: calculate_match_score
-- ============================================================

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

-- ============================================================
-- VIEW: property_view_counts
-- ============================================================

CREATE OR REPLACE VIEW public.property_view_counts AS
SELECT
  p.id AS property_id,
  p.slug,
  p.title,
  COUNT(al.id) FILTER (WHERE al.action = 'view') AS view_count
FROM public.properties p
LEFT JOIN public.activity_log al
  ON al.property_id = p.id
GROUP BY p.id, p.slug, p.title;

GRANT SELECT ON public.property_view_counts TO authenticated;
