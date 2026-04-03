import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotifyPayload {
  property_id: string;
}

Deno.serve(async (req: Request) => {
  try {
    const { property_id } = (await req.json()) as NotifyPayload;
    if (!property_id) {
      return new Response(JSON.stringify({ error: "property_id is required" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the published property
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, title, slug, city, price, property_type, bar_percentage")
      .eq("id", property_id)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (propError || !property) {
      return new Response(JSON.stringify({ error: "Property not found or not published" }), { status: 404 });
    }

    // Fetch all clients with email notifications enabled
    const { data: clients } = await supabase
      .from("client_preferences")
      .select("profile_id, regions, property_types, budget_min, budget_max, min_bar")
      .eq("notify_email", true);

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ message: "No clients with email notifications enabled", sent: 0 }));
    }

    // Calculate matches and collect emails
    const notifications: { email: string; name: string; score: number; profileId: string }[] = [];

    for (const client of clients) {
      let score = 0;
      if (client.regions?.length && property.city && client.regions.includes(property.city)) score += 30;
      if (client.property_types?.length && property.property_type && client.property_types.includes(property.property_type)) score += 25;
      if (property.price !== null) {
        if (client.budget_min !== null && client.budget_max !== null) {
          if (property.price >= client.budget_min && property.price <= client.budget_max) score += 25;
        } else if (client.budget_max !== null && property.price <= client.budget_max) {
          score += 25;
        } else if (client.budget_min !== null && property.price >= client.budget_min) {
          score += 25;
        }
      }
      if (client.min_bar !== null && property.bar_percentage !== null && property.bar_percentage >= client.min_bar) score += 20;

      if (score === 0) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", client.profile_id)
        .is("deleted_at", null)
        .single();

      if (profile?.email) {
        notifications.push({ email: profile.email, name: profile.full_name || "Investeerder", score, profileId: profile.id });
      }
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ message: "No matching clients found", sent: 0 }));
    }

    const formatPrice = (p: number | null) => {
      if (!p) return "\u2013";
      if (p >= 1_000_000) return `\u20AC ${(p / 1_000_000).toFixed(1)}M`;
      if (p >= 1_000) return `\u20AC ${Math.round(p / 1_000)}K`;
      return `\u20AC ${p}`;
    };

    let sentCount = 0;

    for (const n of notifications) {
      // Store in-app notification
      await supabase.from("notifications").insert({
        profile_id: n.profileId,
        type: "new_match",
        title: `Nieuw object: ${property.title}`,
        body: `${property.title} in ${property.city} (${formatPrice(property.price)}, BAR ${property.bar_percentage}%) matcht ${n.score}% met uw profiel.`,
        channel: "email",
        sent_at: RESEND_API_KEY ? new Date().toISOString() : null,
      });

      // Send actual email if Resend is configured
      if (RESEND_API_KEY) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Resid <noreply@resid.nl>",
            to: [n.email],
            subject: `Nieuwe match: ${property.title}`,
            html: `
              <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1a1a2e; padding: 24px 32px;">
                  <h1 style="color: #978257; font-size: 24px; margin: 0;">Resid</h1>
                </div>
                <div style="padding: 32px; background: #ffffff;">
                  <p style="color: #333; font-size: 16px;">Beste ${n.name},</p>
                  <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    Er is een nieuw object beschikbaar dat <strong>${n.score}%</strong> matcht met uw investeringsprofiel.
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
        if (emailRes.ok) sentCount++;
      } else {
        sentCount++;
      }
    }

    return new Response(JSON.stringify({
      message: `Notifications sent to ${sentCount} matching clients`,
      sent: sentCount,
      matches: notifications.map(n => ({ email: n.email, score: n.score })),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
