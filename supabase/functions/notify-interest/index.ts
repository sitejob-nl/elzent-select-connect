// notify-interest
// Triggered by the belegger after confirming "Interesse tonen" in the UI.
// Sends two mails in parallel:
//   1. interest_confirmation — naar de belegger zelf (je aanvraag is binnen).
//   2. admin_interest_notification — naar het admin-notificatie-adres uit
//      platform_settings, zodat Elzent direct ziet wie interesse heeft.
//
// Auth: verify_jwt is enabled (see config.toml). We additionally require
// that the caller owns the interest_request they're notifying for,
// preventing someone from spamming admin-mails with other users' rows.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// TODO: move to env var once we run multiple environments (staging etc.).
const APP_URL = "https://app.resid.nl";

interface NotifyPayload {
  interest_request_id: string;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let payload: NotifyPayload;
    try {
      payload = (await req.json()) as NotifyPayload;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { interest_request_id } = payload;
    if (!interest_request_id) {
      return new Response(
        JSON.stringify({ error: "interest_request_id is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Load the interest + joined profile + property. Using the service role
    // client so RLS doesn't get in the way of the admin-side lookups (we
    // enforce ownership ourselves below).
    const { data: interest, error: interestErr } = await supabaseAdmin
      .from("interest_requests")
      .select(`
        id,
        message,
        profile_id,
        property_id,
        profile:profiles!interest_requests_profile_id_fkey (full_name, email, phone),
        property:properties!interest_requests_property_id_fkey (title, slug, city)
      `)
      .eq("id", interest_request_id)
      .single();

    if (interestErr || !interest) {
      return new Response(
        JSON.stringify({ error: "Interest request niet gevonden." }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (interest.profile_id !== caller.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // The joined `profile` / `property` fields may arrive as an object or
    // a single-element array depending on the PostgREST version; normalize
    // so the downstream template payload stays flat.
    type ProfileJoin = { full_name: string | null; email: string | null; phone: string | null };
    type PropertyJoin = { title: string; slug: string; city: string | null };
    const profileRow = Array.isArray(interest.profile) ? interest.profile[0] : interest.profile;
    const propertyRow = Array.isArray(interest.property) ? interest.property[0] : interest.property;
    const p = profileRow as ProfileJoin | undefined;
    const pr = propertyRow as PropertyJoin | undefined;
    const beleggerEmail = p?.email ?? null;
    const beleggerName = p?.full_name ?? null;
    const beleggerPhone = p?.phone ?? null;
    const propertyTitle = pr?.title ?? "";
    const propertySlug = pr?.slug ?? "";
    const propertyCity = pr?.city ?? null;

    if (!beleggerEmail || !propertyTitle) {
      return new Response(
        JSON.stringify({ error: "Incomplete interest data." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Admin-notificatie-adres uit platform_settings (fallback voor het geval
    // iemand de seed-rij heeft verwijderd).
    const { data: setting } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "admin_notification_email")
      .maybeSingle();
    const adminEmail = setting?.value || "admin@elzentestates.nl";

    // Fire both emails in parallel; failures are logged in email_logs by
    // the shared helper.
    const cityLabel = propertyCity ? ` (${propertyCity})` : "";
    const results = await Promise.allSettled([
      sendTemplatedEmail({
        supabase: supabaseAdmin,
        templateSlug: "interest_confirmation",
        to: beleggerEmail,
        toProfileId: caller.id,
        variables: {
          user_name: beleggerName || "belegger",
          property_title: propertyTitle,
          property_city: cityLabel,
          property_slug: propertySlug,
          app_url: APP_URL,
        },
      }),
      sendTemplatedEmail({
        supabase: supabaseAdmin,
        templateSlug: "admin_interest_notification",
        to: adminEmail,
        variables: {
          user_name: beleggerName || "(geen naam)",
          user_email: beleggerEmail,
          user_phone: beleggerPhone || "(niet opgegeven)",
          property_title: propertyTitle,
          property_slug: propertySlug,
          message: interest.message || "(geen bericht)",
          admin_url: `${APP_URL}/admin/aanbod`,
        },
      }),
    ]);

    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0) {
      console.error("[notify-interest] one or more mails failed", failed);
    }

    return new Response(
      JSON.stringify({
        message: "Interesse-notificaties verstuurd.",
        sent_to: [beleggerEmail, adminEmail],
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-interest unexpected error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
