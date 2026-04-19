import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WHATSAPP_PROVIDER_KEY = Deno.env.get("WHATSAPP_PROVIDER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
        const emailSuccess = RESEND_API_KEY
          ? await sendEmail(m, property, bodyText(m.score), formatPrice)
          : true; // no provider configured — treat as virtual success for MVP tracking

        await supabaseAdmin.from("notifications").insert({
          profile_id: m.profileId,
          type: "new_match",
          title: `Nieuw object: ${property.title}`,
          body: bodyText(m.score),
          channel: "email",
          sent_at: emailSuccess && RESEND_API_KEY ? new Date().toISOString() : null,
        });

        if (emailSuccess) emailsSent++;
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
      emailProviderConfigured: !!RESEND_API_KEY,
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

async function sendEmail(
  m: MatchedClient,
  property: { title: string; slug: string; city: string; price: number | null; property_type: string | null; bar_percentage: number | null },
  body: string,
  formatPrice: (p: number | null) => string,
): Promise<boolean> {
  if (!m.email) return false;
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Resid <noreply@resid.nl>",
      to: [m.email],
      subject: `Nieuwe match: ${property.title}`,
      html: `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 24px 32px;">
            <h1 style="color: #978257; font-size: 24px; margin: 0;">Resid</h1>
          </div>
          <div style="padding: 32px; background: #ffffff;">
            <p style="color: #333; font-size: 16px;">Beste ${m.name},</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Er is een nieuw object beschikbaar dat <strong>${m.score}%</strong> matcht met uw investeringsprofiel.
            </p>
            <div style="background: #f8f7f4; border-left: 3px solid #978257; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
              <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 8px;">${property.title}</h2>
              <p style="color: #666; font-size: 14px; margin: 0;">${property.city} &middot; ${property.property_type || ""}</p>
              <p style="color: #978257; font-size: 16px; font-weight: bold; margin: 12px 0 0;">
                ${formatPrice(property.price)} &middot; BAR ${property.bar_percentage}%
              </p>
            </div>
            <a href="https://app.resid.nl/aanbod/${property.slug}" style="display: inline-block; background: #978257; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Bekijk Object &rarr;
            </a>
          </div>
          <div style="padding: 16px 32px; background: #f8f7f4; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0;">Resid &middot; Powered by Elzent Estates</p>
          </div>
        </div>
      `,
    }),
  });
  return emailRes.ok;
}

async function sendWhatsappStub(
  m: MatchedClient,
  property: { title: string; slug: string },
  body: string,
): Promise<boolean> {
  // Placeholder — replace with Twilio or Meta WhatsApp Business call.
  console.info(`[whatsapp-stub] would send to ${m.phone}: ${body} https://app.resid.nl/aanbod/${property.slug}`);
  return true;
}
