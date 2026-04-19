import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ApprovePayload {
  access_request_id: string;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // --- Admin authorization check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .is("deleted_at", null)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // --- End authorization check ---

    // Parse body
    let payload: ApprovePayload;
    try {
      payload = (await req.json()) as ApprovePayload;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { access_request_id } = payload;
    if (!access_request_id) {
      return new Response(JSON.stringify({ error: "access_request_id is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch access request (must be pending)
    const { data: accessRequest, error: fetchError } = await supabaseAdmin
      .from("access_requests")
      .select("id, email, name, company, status")
      .eq("id", access_request_id)
      .single();

    if (fetchError || !accessRequest) {
      return new Response(JSON.stringify({ error: "Toegangsaanvraag niet gevonden." }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (accessRequest.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Deze aanvraag is al verwerkt." }),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const email = accessRequest.email.trim().toLowerCase();
    const fullName = accessRequest.name ?? null;
    const company = accessRequest.company ?? null;

    // Invite user by email. Supabase sends the standard invite email
    // containing a link that takes the user to a password-set page.
    // The handle_new_user() trigger auto-creates a profiles row with role='client'.
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          company: company,
        },
      });

    if (inviteError || !inviteData?.user) {
      // Detect "email already exists" style errors and surface a 409.
      const msg = inviteError?.message?.toLowerCase() ?? "";
      const alreadyExists =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists") ||
        msg.includes("duplicate");

      if (alreadyExists) {
        return new Response(
          JSON.stringify({
            error: "Er bestaat al een account met dit e-mailadres.",
          }),
          {
            status: 409,
            headers: { ...cors, "Content-Type": "application/json" },
          },
        );
      }

      console.error("inviteUserByEmail failed", inviteError);
      return new Response(
        JSON.stringify({
          error:
            inviteError?.message ||
            "Kon gebruiker niet uitnodigen. Probeer het opnieuw.",
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const newUserId = inviteData.user.id;

    // Ensure the profile row exists and has the company + full_name set.
    // handle_new_user() trigger already inserts (id, email, full_name, role='client')
    // but does not persist company. We upsert to cover both cases: trigger fired OR
    // trigger did not fire for some reason (idempotent).
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email,
          full_name: fullName,
          company,
          role: "client",
        },
        { onConflict: "id" },
      );

    if (profileError) {
      console.error("profiles upsert failed", profileError);
      // Non-fatal: the trigger likely already inserted the row. Continue.
    }

    // Mark access request as approved
    const { error: updateError } = await supabaseAdmin
      .from("access_requests")
      .update({
        status: "approved",
        reviewed_by: caller.id,
      })
      .eq("id", access_request_id);

    if (updateError) {
      console.error("access_requests update failed", updateError);
      return new Response(
        JSON.stringify({
          error:
            "Gebruiker aangemaakt maar status-update mislukt. Probeer opnieuw.",
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Aanvraag goedgekeurd en uitnodiging verzonden.",
        user_id: newUserId,
        email,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("approve-access-request unexpected error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
