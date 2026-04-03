-- ============================================================
-- Seed: Demo data voor Resid
-- Draait automatisch na migraties bij `supabase db reset`
-- ============================================================

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id    uuid := gen_random_uuid();
  v_pieter_id   uuid := gen_random_uuid();
  v_maria_id    uuid := gen_random_uuid();
  v_prop1       uuid := gen_random_uuid();
  v_prop2       uuid := gen_random_uuid();
  v_prop3       uuid := gen_random_uuid();
  v_prop4       uuid := gen_random_uuid();
  v_prop5       uuid := gen_random_uuid();
  v_prop6       uuid := gen_random_uuid();
  v_prop7       uuid := gen_random_uuid();
  v_prop8       uuid := gen_random_uuid();
  v_prop9       uuid := gen_random_uuid();
  v_prop10      uuid := gen_random_uuid();
  v_hashed_pw   text;
BEGIN

  -- Hash the demo password once
  v_hashed_pw := crypt('Demo2026!', gen_salt('bf'));

  -- ============================================================
  -- AUTH USERS
  -- ============================================================
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES
    (v_admin_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@resid.nl',     v_hashed_pw, now(), '{"full_name": "Willem van der Berg"}'::jsonb,  now(), now(), '', ''),
    (v_pieter_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'belegger@resid.nl',  v_hashed_pw, now(), '{"full_name": "Pieter Janssen"}'::jsonb,       now(), now(), '', ''),
    (v_maria_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'belegger2@resid.nl', v_hashed_pw, now(), '{"full_name": "Maria de Vries"}'::jsonb,       now(), now(), '', '');

  -- handle_new_user trigger creates profiles with role='client'
  -- Now promote admin
  UPDATE public.profiles
  SET role = 'admin', company = 'Elzent Estates', phone = '+31 6 12345678'
  WHERE id = v_admin_id;

  -- Update client profiles with extra info
  UPDATE public.profiles
  SET company = 'Janssen Vastgoed B.V.', phone = '+31 6 98765432'
  WHERE id = v_pieter_id;

  UPDATE public.profiles
  SET company = 'De Vries Investments', phone = '+31 6 55566677'
  WHERE id = v_maria_id;

  -- ============================================================
  -- AUTH IDENTITIES (required by Supabase Auth)
  -- ============================================================
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin_id,  v_admin_id::text,  json_build_object('sub', v_admin_id,  'email', 'admin@resid.nl',     'full_name', 'Willem van der Berg')::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), v_pieter_id, v_pieter_id::text, json_build_object('sub', v_pieter_id, 'email', 'belegger@resid.nl',  'full_name', 'Pieter Janssen')::jsonb,       'email', now(), now(), now()),
    (gen_random_uuid(), v_maria_id,  v_maria_id::text,  json_build_object('sub', v_maria_id,  'email', 'belegger2@resid.nl', 'full_name', 'Maria de Vries')::jsonb,       'email', now(), now(), now());

  -- ============================================================
  -- CLIENT PREFERENCES
  -- ============================================================
  INSERT INTO public.client_preferences (profile_id, regions, property_types, budget_min, budget_max, min_bar, notify_email, notify_whatsapp)
  VALUES
    (v_pieter_id, ARRAY['Eindhoven', 'Den Bosch'], ARRAY['woning', 'appartement'], 200000, 500000, 5.0, true, false),
    (v_maria_id,  ARRAY['Breda', 'Eindhoven'],     ARRAY['commercieel', 'gemengd'], 400000, 1200000, 4.0, true, true);

  -- ============================================================
  -- PROPERTIES (10 stuks: 6 published, 2 draft, 2 archived)
  -- ============================================================
  INSERT INTO public.properties (id, slug, title, location, city, description, price, property_type, units, surface_area, bar_percentage, status, tags, created_by)
  VALUES
    -- Published
    (v_prop1, 'woonblok-strijp-s',
     'Woonblok Strijp-S', 'Torenallee 40, Eindhoven', 'Eindhoven',
     'Modern woonblok op Strijp-S met 6 appartementen. Volledig gerenoveerd in 2024, uitstekende huurders. Loopafstand van het centrum en Eindhoven Centraal.',
     475000, 'appartement', 6, 420, 6.2, 'published',
     ARRAY['gerenoveerd', 'stadscentrum', 'huurgarantie'], v_admin_id),

    (v_prop2, 'herenhuis-den-bosch',
     'Herenhuis Vughterstraat', 'Vughterstraat 112, Den Bosch', 'Den Bosch',
     'Monumentaal herenhuis in het hart van Den Bosch. Gesplitst in 3 zelfstandige wooneenheden. Rijksmonumentstatus met bijbehorende fiscale voordelen.',
     385000, 'woning', 3, 280, 5.8, 'published',
     ARRAY['monument', 'binnenstad', 'fiscaal voordeel'], v_admin_id),

    (v_prop3, 'winkelruimte-breda',
     'Winkelruimte Ginnekenstraat', 'Ginnekenstraat 78, Breda', 'Breda',
     'Prominente winkelruimte in de populairste winkelstraat van Breda. Langlopend huurcontract met landelijke retailketen. Triple net huurovereenkomst.',
     890000, 'commercieel', 1, 180, 7.1, 'published',
     ARRAY['A1-locatie', 'triple net', 'langlopend contract'], v_admin_id),

    (v_prop4, 'appartementen-woensel',
     'Appartementencomplex Woensel', 'Woenselse Markt 15, Eindhoven', 'Eindhoven',
     'Complex van 8 studio-appartementen nabij Woensel XL. Ideaal voor starters en expats. Gemiddelde bezettingsgraad 97% over de afgelopen 3 jaar.',
     320000, 'appartement', 8, 340, 5.4, 'published',
     ARRAY['studentenstad', 'hoge bezetting', 'expats'], v_admin_id),

    (v_prop5, 'gemengd-gebruik-breda',
     'Gemengd Gebruik Haven', 'Havenstraat 22, Breda', 'Breda',
     'Pand met winkelruimte op de begane grond en 4 bovenwoningen. Gelegen aan de vernieuwde Breda Haven. Alle units verhuurd.',
     650000, 'gemengd', 5, 510, 5.9, 'published',
     ARRAY['gemengd gebruik', 'havengebied', 'volledig verhuurd'], v_admin_id),

    (v_prop6, 'rijwoning-eindhoven',
     'Beleggingswoning Gestel', 'Gestelsedijk 88, Eindhoven', 'Eindhoven',
     'Ruime rijwoning in de gewilde wijk Gestel. Verhuurd aan langzittende huurder. Groot achtertuin en eigen parkeerplaats.',
     275000, 'woning', 1, 125, 4.8, 'published',
     ARRAY['eengezinswoning', 'rustige wijk', 'langzittende huurder'], v_admin_id),

    -- Draft
    (v_prop7, 'nieuwbouw-meerhoven',
     'Nieuwbouwproject Meerhoven', 'Meerhovendreef, Eindhoven', 'Eindhoven',
     'Nieuwbouwproject met 12 energieneutrale woningen. Verwachte oplevering Q3 2026. Voorverkoop exclusief via Resid.',
     1500000, 'woning', 12, 960, 4.5, 'draft',
     ARRAY['nieuwbouw', 'energieneutraal', 'exclusief'], v_admin_id),

    (v_prop8, 'kantoorpand-den-bosch',
     'Kantoorpand Paleiskwartier', 'Onderwijsboulevard 3, Den Bosch', 'Den Bosch',
     'Modern kantoorpand in het Paleiskwartier. Geschikt voor herontwikkeling naar woningen. Vergunningstraject loopt.',
     780000, 'commercieel', 1, 640, 3.2, 'draft',
     ARRAY['herontwikkeling', 'kantoor naar wonen', 'vergunning'], v_admin_id),

    -- Archived
    (v_prop9, 'verkocht-stationsweg-breda',
     'Appartementenblok Stationsweg', 'Stationsweg 45, Breda', 'Breda',
     'VERKOCHT — Blok van 4 appartementen nabij Breda Centraal. Verkocht aan institutionele belegger in februari 2026.',
     420000, 'appartement', 4, 260, 5.6, 'archived',
     ARRAY['verkocht', 'station'], v_admin_id),

    (v_prop10, 'verkocht-stratumseind',
     'Horeca-unit Stratumseind', 'Stratumseind 50, Eindhoven', 'Eindhoven',
     'VERKOCHT — Horecapand aan het Stratumseind. Verkocht in januari 2026.',
     550000, 'commercieel', 1, 150, 8.3, 'archived',
     ARRAY['verkocht', 'horeca'], v_admin_id);

  -- ============================================================
  -- PROPERTY TIMELINE (voor een paar published properties)
  -- ============================================================
  INSERT INTO public.property_timeline (property_id, step_title, step_description, step_date, step_order, is_active)
  VALUES
    (v_prop1, 'Aangeboden',       'Object beschikbaar gesteld op Resid',       '2026-02-15', 1, false),
    (v_prop1, 'Bezichtigingen',   'Bezichtigingen gepland met geïnteresseerden', '2026-03-01', 2, true),
    (v_prop1, 'Due diligence',    'Financiële en technische inspectie',         '2026-03-15', 3, false),
    (v_prop1, 'Overdracht',       'Notariële overdracht',                       '2026-04-15', 4, false),

    (v_prop3, 'Aangeboden',       'Object beschikbaar gesteld op Resid',       '2026-01-10', 1, false),
    (v_prop3, 'Interesse',        'Meerdere partijen hebben interesse gemeld', '2026-01-25', 2, false),
    (v_prop3, 'Onderhandeling',   'In onderhandeling met geselecteerde partij', '2026-02-10', 3, true),
    (v_prop3, 'Due diligence',    'Financiële en technische inspectie',         '2026-03-01', 4, false);

  -- ============================================================
  -- ACTIVITY LOG (views voor schaarste-indicator)
  -- ============================================================
  INSERT INTO public.activity_log (profile_id, property_id, action, metadata, created_at)
  VALUES
    -- Pieter bekijkt properties
    (v_pieter_id, v_prop1, 'view', '{}', now() - interval '7 days'),
    (v_pieter_id, v_prop1, 'view', '{}', now() - interval '3 days'),
    (v_pieter_id, v_prop1, 'view', '{}', now() - interval '1 day'),
    (v_pieter_id, v_prop2, 'view', '{}', now() - interval '5 days'),
    (v_pieter_id, v_prop2, 'view', '{}', now() - interval '2 days'),
    (v_pieter_id, v_prop4, 'view', '{}', now() - interval '6 days'),
    (v_pieter_id, v_prop4, 'view', '{}', now() - interval '4 days'),
    (v_pieter_id, v_prop4, 'view', '{}', now() - interval '1 day'),
    (v_pieter_id, v_prop4, 'view', '{}', now() - interval '12 hours'),
    (v_pieter_id, v_prop5, 'view', '{}', now() - interval '3 days'),
    (v_pieter_id, v_prop6, 'view', '{}', now() - interval '1 day'),

    -- Maria bekijkt properties
    (v_maria_id, v_prop1, 'view', '{}', now() - interval '4 days'),
    (v_maria_id, v_prop3, 'view', '{}', now() - interval '6 days'),
    (v_maria_id, v_prop3, 'view', '{}', now() - interval '3 days'),
    (v_maria_id, v_prop3, 'view', '{}', now() - interval '1 day'),
    (v_maria_id, v_prop3, 'view', '{}', now() - interval '6 hours'),
    (v_maria_id, v_prop5, 'view', '{}', now() - interval '5 days'),
    (v_maria_id, v_prop5, 'view', '{}', now() - interval '2 days'),
    (v_maria_id, v_prop5, 'view', '{}', now() - interval '1 day'),
    (v_maria_id, v_prop6, 'view', '{}', now() - interval '3 days');

  -- ============================================================
  -- FAVORITES
  -- ============================================================
  INSERT INTO public.favorites (profile_id, property_id)
  VALUES
    -- Pieter: 3 favorieten
    (v_pieter_id, v_prop1),
    (v_pieter_id, v_prop2),
    (v_pieter_id, v_prop4),
    -- Maria: 2 favorieten
    (v_maria_id, v_prop3),
    (v_maria_id, v_prop5);

  -- ============================================================
  -- INTEREST REQUESTS (3 stuks, mix status)
  -- ============================================================
  INSERT INTO public.interest_requests (profile_id, property_id, message, status)
  VALUES
    (v_pieter_id, v_prop1, 'Graag meer informatie over het huurrendement en de staat van onderhoud. Kan ik een bezichtiging inplannen?', 'pending'),
    (v_pieter_id, v_prop2, 'Interessant object. Wat zijn de maandelijkse servicekosten en is er een VvE?', 'contacted'),
    (v_maria_id,  v_prop3, 'Wij willen graag een bod uitbrengen. Kunnen we de huurovereenkomsten inzien?', 'closed');

  -- ============================================================
  -- LEADS (5 stuks, mix status)
  -- ============================================================
  INSERT INTO public.leads (name, email, phone, company, message, source, status)
  VALUES
    ('Jan de Groot',       'jan.degroot@gmail.com',       '+31 6 11122233', 'De Groot Beheer',     'Geïnteresseerd in vastgoedbeleggingen in Noord-Brabant.',          'website',  'new'),
    ('Sandra Vermeulen',   'sandra@vermeulen-invest.nl',  '+31 6 44455566', 'Vermeulen Invest',    'Doorverwezen door collega-belegger. Zoek naar panden in Breda.',   'referral', 'new'),
    ('Henk Bakker',        'h.bakker@outlook.com',        '+31 6 77788899', NULL,                  'Starter in vastgoedbelegging, zoek begeleiding.',                 'linkedin', 'invited'),
    ('Fatima El Amrani',   'f.elamrani@hotmail.com',      '+31 6 33344455', 'El Amrani Properties', 'Portfolio uitbreiden met objecten in Brabant.',                   'website',  'invited'),
    ('Koen van Dijk',      'koen@vandijkgroep.nl',        '+31 6 99900011', 'Van Dijk Groep',      'Eerder samengewerkt, maar momenteel geen interesse meer.',        'referral', 'archived');

  -- ============================================================
  -- ACCESS REQUESTS (3 stuks, mix status)
  -- ============================================================
  INSERT INTO public.access_requests (email, name, company, message, status, reviewed_by)
  VALUES
    ('tom.peters@outlook.com',   'Tom Peters',      'Peters Capital',     'Ik investeer al 10 jaar in vastgoed en zoek nieuwe kansen in Brabant.', 'pending',  NULL),
    ('lisa@janssenholding.nl',   'Lisa Janssen',     'Janssen Holding',   'Graag toegang tot het platform. Referentie: Pieter Janssen.',            'approved', v_admin_id),
    ('r.smits@gmail.com',        'Robert Smits',     NULL,                'Wil graag kijken naar beleggingspanden.',                               'rejected', v_admin_id);

  -- ============================================================
  -- NOTIFICATIONS (een paar in-app notificaties)
  -- ============================================================
  INSERT INTO public.notifications (profile_id, type, title, body, channel, created_at)
  VALUES
    (v_pieter_id, 'new_match',   'Nieuw object: Woonblok Strijp-S',           'Woonblok Strijp-S in Eindhoven (€ 475K, BAR 6.2%) matcht 80% met uw profiel.',       'in_app', now() - interval '5 days'),
    (v_pieter_id, 'new_match',   'Nieuw object: Appartementencomplex Woensel', 'Appartementencomplex Woensel in Eindhoven (€ 320K, BAR 5.4%) matcht 55% met uw profiel.', 'in_app', now() - interval '3 days'),
    (v_maria_id,  'new_match',   'Nieuw object: Winkelruimte Ginnekenstraat',  'Winkelruimte Ginnekenstraat in Breda (€ 890K, BAR 7.1%) matcht 75% met uw profiel.',  'in_app', now() - interval '4 days'),
    (v_maria_id,  'new_match',   'Nieuw object: Gemengd Gebruik Haven',        'Gemengd Gebruik Haven in Breda (€ 650K, BAR 5.9%) matcht 100% met uw profiel.',      'in_app', now() - interval '2 days');

END $$;
