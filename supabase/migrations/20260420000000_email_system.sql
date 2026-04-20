-- =========================================================================
-- Email system foundation (Task 8)
-- Adds DB-backed transactional email templates + a per-send audit log.
-- Templates are admin-editable from the Admin UI; edge functions render them
-- and insert a row into email_logs on every send attempt. A later task wires
-- a Resend webhook that updates log rows by resend_id.
-- =========================================================================

-- email_templates: admin-editable transactional mail templates
CREATE TABLE public.email_templates (
  slug        text         PRIMARY KEY,
  subject     text         NOT NULL,
  html        text         NOT NULL,
  variables   jsonb        NOT NULL DEFAULT '[]'::jsonb,
  description text,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- RLS: admin read/write only. No belegger access.
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;
CREATE POLICY "email_templates_admin_all"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- email_logs: one row per send attempt; webhook updates status later
CREATE TABLE public.email_logs (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email        text         NOT NULL,
  to_profile_id   uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  template_slug   text         REFERENCES public.email_templates(slug) ON DELETE SET NULL,
  subject         text         NOT NULL,
  variables_used  jsonb        NOT NULL DEFAULT '{}'::jsonb,
  resend_id       text,
  status          text         NOT NULL DEFAULT 'queued',
  error_message   text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  opened_at       timestamptz,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT email_logs_status_check CHECK (
    status IN ('queued','sent','delivered','bounced','complained','failed','opened','clicked')
  )
);

CREATE INDEX idx_email_logs_resend_id      ON public.email_logs(resend_id) WHERE resend_id IS NOT NULL;
CREATE INDEX idx_email_logs_to_profile_id  ON public.email_logs(to_profile_id);
CREATE INDEX idx_email_logs_template_slug  ON public.email_logs(template_slug);
CREATE INDEX idx_email_logs_created_at     ON public.email_logs(created_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_admin_select" ON public.email_logs;
CREATE POLICY "email_logs_admin_select"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
-- No INSERT/UPDATE policy — writes only happen via edge functions using service role.

-- =========================================================================
-- Seed initial templates.
-- HTML is ported verbatim from the inline strings that previously lived in
-- edge functions (notify-new-match, approve-access-request). Dynamic parts
-- are swapped for {{placeholder}} tokens; the shared helper
-- (supabase/functions/_shared/email.ts) does the substitution.
-- =========================================================================

INSERT INTO public.email_templates (slug, subject, description, variables, html) VALUES
(
  'new_match',
  'Nieuwe match: {{property_title}}',
  'Verzonden naar beleggers wanneer een nieuw object gepubliceerd wordt dat bij hun profiel past (edge function: notify-new-match).',
  '[
    {"name":"user_name","description":"Volledige naam van de belegger","required":true},
    {"name":"match_score","description":"Matchpercentage (bv. 87)","required":true},
    {"name":"property_title","description":"Titel van het object","required":true},
    {"name":"property_city","description":"Stad","required":true},
    {"name":"property_type","description":"Type vastgoed","required":false},
    {"name":"property_price","description":"Geformatteerde prijs (bv. € 1.2M)","required":false},
    {"name":"property_bar","description":"BAR percentage","required":false},
    {"name":"property_slug","description":"Slug voor CTA-link","required":true},
    {"name":"app_url","description":"Basis-URL van de app (bv. https://app.resid.nl)","required":true}
  ]'::jsonb,
  '<div style="font-family: ''Helvetica Neue'', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 24px 32px;">
            <h1 style="color: #978257; font-size: 24px; margin: 0;">Resid</h1>
          </div>
          <div style="padding: 32px; background: #ffffff;">
            <p style="color: #333; font-size: 16px;">Beste {{user_name}},</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Er is een nieuw object beschikbaar dat <strong>{{match_score}}%</strong> matcht met uw investeringsprofiel.
            </p>
            <div style="background: #f8f7f4; border-left: 3px solid #978257; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
              <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 8px;">{{property_title}}</h2>
              <p style="color: #666; font-size: 14px; margin: 0;">{{property_city}} &middot; {{property_type}}</p>
              <p style="color: #978257; font-size: 16px; font-weight: bold; margin: 12px 0 0;">
                {{property_price}} &middot; BAR {{property_bar}}%
              </p>
            </div>
            <a href="{{app_url}}/aanbod/{{property_slug}}" style="display: inline-block; background: #978257; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Bekijk Object &rarr;
            </a>
          </div>
          <div style="padding: 16px 32px; background: #f8f7f4; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0;">Resid &middot; Powered by Elzent Estates</p>
          </div>
        </div>'
),
(
  'invite',
  'U bent uitgenodigd voor Resid',
  'Verzonden na goedkeuring van een access-request. Bevat een link naar /wachtwoord-instellen?token=... — token komt uit Supabase generateLink (fase 3).',
  '[
    {"name":"user_name","description":"Volledige naam","required":true},
    {"name":"accept_url","description":"Volledige URL inclusief token","required":true},
    {"name":"app_url","description":"Basis-URL","required":true}
  ]'::jsonb,
  '<div style="font-family: Helvetica Neue, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #1a1a2e; padding: 24px 32px;"><h1 style="color: #978257; font-size: 24px; margin: 0;">Resid</h1></div><div style="padding: 32px; background: #ffffff;"><p style="color: #333; font-size: 16px;">Welkom {{user_name}},</p><p style="color: #666; font-size: 14px; line-height: 1.6;">Uw toegang tot het Resid platform is goedgekeurd. Klik hieronder om uw wachtwoord in te stellen en uw account te activeren.</p><a href="{{accept_url}}" style="display: inline-block; background: #978257; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Wachtwoord instellen &rarr;</a><p style="color: #999; font-size: 12px; margin-top: 32px;">Werkt de knop niet? Kopieer deze link: {{accept_url}}</p></div><div style="padding: 16px 32px; background: #f8f7f4; text-align: center;"><p style="color: #999; font-size: 11px; margin: 0;">Resid &middot; Powered by Elzent Estates</p></div></div>'
),
(
  'password_reset',
  'Stel een nieuw wachtwoord in voor Resid',
  'Verzonden wanneer de belegger "Wachtwoord vergeten" klikt. Bevat een link naar /wachtwoord-instellen?token=... — token komt uit Supabase generateLink (fase 3).',
  '[
    {"name":"user_name","description":"Volledige naam (valt terug op \"Investeerder\")","required":true},
    {"name":"reset_url","description":"Volledige URL inclusief token","required":true},
    {"name":"app_url","description":"Basis-URL","required":true}
  ]'::jsonb,
  '<div style="font-family: Helvetica Neue, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #1a1a2e; padding: 24px 32px;"><h1 style="color: #978257; font-size: 24px; margin: 0;">Resid</h1></div><div style="padding: 32px; background: #ffffff;"><p style="color: #333; font-size: 16px;">Beste {{user_name}},</p><p style="color: #666; font-size: 14px; line-height: 1.6;">U heeft een wachtwoord-herstel aangevraagd. Klik hieronder om een nieuw wachtwoord in te stellen.</p><a href="{{reset_url}}" style="display: inline-block; background: #978257; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Nieuw wachtwoord instellen &rarr;</a><p style="color: #999; font-size: 12px; margin-top: 32px;">Geen wachtwoord-herstel aangevraagd? Negeer deze mail.</p></div><div style="padding: 16px 32px; background: #f8f7f4; text-align: center;"><p style="color: #999; font-size: 11px; margin: 0;">Resid &middot; Powered by Elzent Estates</p></div></div>'
);
