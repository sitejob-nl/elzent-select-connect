import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// TODO: move to env var once we run multiple environments (staging etc.).
const APP_URL = "https://app.resid.nl";

interface RequestBody {
  email?: string;
}

/**
 * Public endpoint: anonymous users request a password-reset link.
 *
 * Security: we ALWAYS return 200 with `{ ok: true }` regardless of whether
 * the email is known. This prevents account enumeration via the form.
 * Internal failures are still written to `email_logs` so admins can
 * investigate in the mail log UI.
 */
Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const genericOk = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    let payload: RequestBody;
    try {
      payload = (await req.json()) as RequestBody;
    } catch {
      // Invalid JSON — still hide this from the caller. Respond ok.
      return genericOk();
    }

    const email = (payload.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return genericOk();
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up profile by email. Unknown email → silent success.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (!profile) {
      return genericOk();
    }

    // Generate a recovery link via Supabase admin API. We don't send the
    // link Supabase would mail — we extract the hashed_token and embed it
    // in our own URL, then send via our Resend template.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      const errMsg = linkError?.message ?? "no hashed_token in response";
      console.error("[request-password-reset] generateLink failed", errMsg);

      await supabaseAdmin.from("email_logs").insert({
        to_email: email,
        to_profile_id: profile.id,
        template_slug: "password_reset",
        subject: "[failed] password_reset generateLink",
        variables_used: {},
        status: "failed",
        error_message: `generateLink_failed: ${errMsg}`,
      });

      return genericOk();
    }

    const hashedToken = linkData.properties.hashed_token;
    const resetUrl = `${APP_URL}/wachtwoord-instellen?token=${encodeURIComponent(hashedToken)}&type=recovery`;

    const sendResult = await sendTemplatedEmail({
      supabase: supabaseAdmin,
      templateSlug: "password_reset",
      to: email,
      toProfileId: profile.id,
      variables: {
        user_name: profile.full_name || "Beleggersklant",
        reset_url: resetUrl,
        app_url: APP_URL,
      },
    });

    if (!sendResult.ok) {
      console.error("[request-password-reset] send failed", sendResult.error);
      // Still return 200 — the log row exists, admin can investigate.
    }

    return genericOk();
  } catch (err) {
    console.error("[request-password-reset] unexpected error", err);
    return genericOk();
  }
});
