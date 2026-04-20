import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

const WHATSAPP_PROVIDER_KEY = Deno.env.get("WHATSAPP_PROVIDER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// TODO: move to env var once we run multiple environments (staging etc.).
const APP_URL = "https://app.resid.nl";

interface NotifyPayload {
  property_id: string;
}

interface MatchedClient {
  profileId: string;
  name: string;
  email: string | null;
  phone: string | null;
  score: number;
  wantsEmail: boolean;
  wantsWhatsapp: boolean;
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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { property_id } = (await req.json()) as NotifyPayload;
    if (!property_id) {
      return new Response(JSON.stringify({ error: "property_id is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: property, error: propError } = await supabaseAdmin
      .from("properties")
      .select("id, title, slug, city, price, property_type, bar_percentage")
      .eq("id", property_id)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (propError || !property) {
      return new Response(JSON.stringify({ error: "Property not found or not published" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch clients who opted in to EITHER email OR whatsapp notifications.
    const { data: clients } = await supabaseAdmin
      .from("client_preferences")
      .select("profile_id, notify_email, notify_whatsapp")
      .or("notify_email.eq.true,notify_whatsapp.eq.true");

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ message: "No clients opted in", emailsSent: 0, whatsappsSent: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const matched: MatchedClient[] = [];

    for (const client of clients) {
      const { data: score } = await supabaseAdmin.rpc("calculate_match_score", {
        p_profile_id: client.profile_id,
        p_property_id: property_id,
      });

      if (!score || score === 0) continue;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, email, phone, full_name")
        .eq("id", client.profile_id)
        .is("deleted_at", null)
        .single();

      if (!profile) continue;

      matched.push({
        profileId: profile.id,
        name: profile.full_name || "Investeerder",
        email: profile.email,
        phone: profile.phone,
        score,
        wantsEmail: !!client.notify_email,
        wantsWhatsapp: !!client.notify_whatsapp,
      });
    }

    if (matched.length === 0) {
      return new Response(JSON.stringify({ message: "No matching clients found", emailsSent: 0, whatsappsSent: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const formatPrice = (p: number | null) => {
      if (!p) return "\u2013";
      if (p >= 1_000_000) return `\u20AC ${(p / 1_000_000).toFixed(1)}M`;
      if (p >= 1_000) return `\u20AC ${Math.round(p / 1_000)}K`;
      return `\u20AC ${p}`;
    };

    const bodyText = (score: number) =>
      `${property.title} in ${property.city} (${formatPrice(property.price)}, BAR ${property.bar_percentage}%) matcht ${score}% met uw profiel.`;

    let emailsSent = 0;
    let whatsappsSent = 0;

    for (const m of matched) {
      // --- Email channel ---
      if (m.wantsEmail && m.email) {
        const sendResult = await sendTemplatedEmail({
          supabase: supabaseAdmin,
          templateSlug: "new_match",
          to: m.email,
          toProfileId: m.profileId,
          variables: {
            user_name: m.name,
            match_score: m.score,
            property_title: property.title,
            property_city: property.city,
            property_type: property.property_type ?? "",
            property_price: formatPrice(property.price),
            property_bar: property.bar_percentage ?? "",
            property_slug: property.slug,
            app_url: APP_URL,
          },
        });

        // In-app notification row (independent of email deliverability so the
        // inbox always reflects intended sends; email_logs tracks actual send).
        await supabaseAdmin.from("notifications").insert({
          profile_id: m.profileId,
          type: "new_match",
          title: `Nieuw object: ${property.title}`,
          body: bodyText(m.score),
          channel: "email",
          sent_at: sendResult.ok ? new Date().toISOString() : null,
        });

        if (sendResult.ok) emailsSent++;
      }

      // --- WhatsApp channel (stub) ---
      if (m.wantsWhatsapp && m.phone) {
        // TODO: wire to a real provider (Twilio Content API / Meta WhatsApp Business).
        // For MVP we persist the notification row so the in-app inbox + admin reports
        // reflect the intended send. WHATSAPP_PROVIDER_KEY is a placeholder env var.
        const whatsappSuccess = WHATSAPP_PROVIDER_KEY
          ? await sendWhatsappStub(m, property, bodyText(m.score))
          : true;

        await supabaseAdmin.from("notifications").insert({
          profile_id: m.profileId,
          type: "new_match",
          title: `Nieuw object: ${property.title}`,
          body: bodyText(m.score),
          channel: "whatsapp",
          sent_at: whatsappSuccess && WHATSAPP_PROVIDER_KEY ? new Date().toISOString() : null,
        });

        if (whatsappSuccess) whatsappsSent++;
      }
    }

    return new Response(JSON.stringify({
      message: `Notifications processed for ${matched.length} matching clients`,
      matched: matched.length,
      emailsSent,
      whatsappsSent,
      whatsappProviderConfigured: !!WHATSAPP_PROVIDER_KEY,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

async function sendWhatsappStub(
  m: MatchedClient,
  property: { title: string; slug: string },
  body: string,
): Promise<boolean> {
  // Placeholder — replace with Twilio or Meta WhatsApp Business call.
  console.info(`[whatsapp-stub] would send to ${m.phone}: ${body} ${APP_URL}/aanbod/${property.slug}`);
  return true;
}
