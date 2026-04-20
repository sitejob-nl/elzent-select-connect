-- ============================================================
-- Migration: 20260421200000_interest_confirm.sql
-- Purpose:   Fase 3 — Interesse-flow met bevestigingsdialog
--   1. Status-enum op interest_requests iets breder zodat admin
--      "goedkeuren" → contacted → closed_won/lost kan zetten.
--      (Fase 4 breidt dit later uit met documents_sent en
--      proposal_made wanneer die flow komt.)
--   2. Nieuwe email-templates: interest_confirmation (naar
--      belegger) + admin_interest_notification (naar admin).
--   3. platform_settings key-value tabel voor o.a. het admin-
--      notificatie-adres (staat niet in env zodat Elzent het
--      zelf kan updaten zonder een redeploy).
-- ============================================================

-- ------------------------------------------------------------
-- 1. interest_requests status-enum verbreden
-- ------------------------------------------------------------
ALTER TABLE public.interest_requests
  DROP CONSTRAINT IF EXISTS interest_requests_status_check;

ALTER TABLE public.interest_requests
  ADD CONSTRAINT interest_requests_status_check
  CHECK (status IN ('pending','contacted','closed_won','closed_lost'));

-- Eventuele oude rows met status 'closed' mappen we naar 'closed_lost'
-- (conservatief; won is zelden de default).
UPDATE public.interest_requests
  SET status = 'closed_lost'
  WHERE status = 'closed';

-- ------------------------------------------------------------
-- 2. Email templates: interest_confirmation + admin_interest_notification
-- ------------------------------------------------------------
INSERT INTO public.email_templates (slug, subject, description, variables, html) VALUES
(
  'interest_confirmation',
  'Bedankt voor je interesse in {{property_title}}',
  'Verzonden naar belegger direct na het tonen van interesse (edge function: notify-interest). Bevat een CTA naar het object.',
  '[
    {"name":"user_name","description":"Volledige naam","required":true},
    {"name":"property_title","description":"Titel van het object","required":true},
    {"name":"property_city","description":"Stad","required":false},
    {"name":"property_slug","description":"Slug voor CTA-link","required":true},
    {"name":"app_url","description":"Basis-URL van de app","required":true}
  ]'::jsonb,
  '<div style="font-family: Helvetica Neue, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #1a1a2e; padding: 24px 32px;">
      <h1 style="color: #978257; font-size: 24px; margin: 0;">Resid</h1>
    </div>
    <div style="padding: 32px; background: #ffffff;">
      <p style="color: #333; font-size: 16px;">Beste {{user_name}},</p>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        Bedankt voor uw interesse in <strong>{{property_title}}</strong>{{property_city}}.
        Wij nemen binnen 48 uur persoonlijk contact met u op om de vervolgstappen te bespreken.
      </p>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        Alvast benieuwd naar het object? Bekijk het opnieuw via onderstaande knop.
      </p>
      <a href="{{app_url}}/aanbod/{{property_slug}}" style="display: inline-block; background: #978257; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">
        Bekijk object &rarr;
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        Alle getoonde prijzen en kerngetallen zijn indicatief en onder voorbehoud.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f8f7f4; text-align: center;">
      <p style="color: #999; font-size: 11px; margin: 0;">Resid &middot; Powered by Elzent Estates</p>
    </div>
  </div>'
),
(
  'admin_interest_notification',
  'Nieuwe interesse: {{property_title}} — {{user_name}}',
  'Verzonden naar het admin-notificatie-adres wanneer een belegger interesse toont. Bevat klantgegevens + bericht + link naar admin-panel.',
  '[
    {"name":"user_name","description":"Volledige naam van belegger","required":true},
    {"name":"user_email","description":"E-mail van belegger","required":true},
    {"name":"user_phone","description":"Telefoonnummer (optioneel)","required":false},
    {"name":"property_title","description":"Titel van het object","required":true},
    {"name":"property_slug","description":"Slug van het object","required":true},
    {"name":"message","description":"Bericht dat de belegger heeft meegegeven","required":false},
    {"name":"admin_url","description":"Deep-link naar het admin-panel","required":true}
  ]'::jsonb,
  '<div style="font-family: Helvetica Neue, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #1a1a2e; padding: 24px 32px;">
      <h1 style="color: #978257; font-size: 20px; margin: 0;">Resid — Admin</h1>
    </div>
    <div style="padding: 32px; background: #ffffff;">
      <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Nieuwe interesse</p>
      <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 16px;">{{property_title}}</h2>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
        <tr><td style="padding: 6px 0; color: #666; width: 130px;">Naam</td><td style="padding: 6px 0;">{{user_name}}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">E-mail</td><td style="padding: 6px 0;"><a href="mailto:{{user_email}}" style="color: #978257;">{{user_email}}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Telefoon</td><td style="padding: 6px 0;">{{user_phone}}</td></tr>
      </table>

      <div style="background: #f8f7f4; border-left: 3px solid #978257; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #666; font-size: 13px; margin: 0 0 4px;">Bericht van de belegger:</p>
        <p style="color: #333; font-size: 14px; margin: 0; white-space: pre-wrap;">{{message}}</p>
      </div>

      <a href="{{admin_url}}" style="display: inline-block; background: #978257; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">
        Open in admin &rarr;
      </a>
    </div>
  </div>'
);

-- ------------------------------------------------------------
-- 3. platform_settings key-value tabel
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_admin_all" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_all"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Edge functions lezen met service-role key, dus geen anon-policy nodig.
-- Zet het default admin-adres; pas bij runtime aan via admin UI of een
-- follow-up migration.
INSERT INTO public.platform_settings (key, value) VALUES
  ('admin_notification_email', 'admin@elzentestates.nl')
ON CONFLICT (key) DO NOTHING;
