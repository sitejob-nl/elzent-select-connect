import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendRawEmail } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TestSendPayload {
  templateSlug?: string;
  subjectOverride?: string;
  htmlOverride?: string;
  variables?: Record<string, string | number | null | undefined>;
  to?: string;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

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

    let payload: TestSendPayload;
    try {
      payload = (await req.json()) as TestSendPayload;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const to = (payload.to ?? "").trim();
    if (!to || !to.includes("@")) {
      return new Response(JSON.stringify({ error: "to is required and must be a valid email address" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const variables = payload.variables ?? {};
    let subject: string | null = payload.subjectOverride ?? null;
    let html: string | null = payload.htmlOverride ?? null;
    const templateSlug = payload.templateSlug ?? null;

    // If no overrides were provided, load the template from the DB so the
    // admin can send a test of the stored content as-is.
    if (subject === null || html === null) {
      if (!templateSlug) {
        return new Response(
          JSON.stringify({ error: "templateSlug OR (subjectOverride + htmlOverride) is required" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      const { data: template, error: tplErr } = await supabaseAdmin
        .from("email_templates")
        .select("slug, subject, html")
        .eq("slug", templateSlug)
        .maybeSingle();
      if (tplErr || !template) {
        return new Response(JSON.stringify({ error: `template_not_found: ${templateSlug}` }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      subject = subject ?? template.subject;
      html = html ?? template.html;
    }

    const result = await sendRawEmail({
      supabase: supabaseAdmin,
      to,
      subject,
      html,
      variables,
      templateSlug,
      // Test sends intentionally do NOT link to a profile. Admin may
      // type any email in the test field; linking it to an unrelated
      // profile would muddy the inbox.
      toProfileId: null,
      markAsTest: true,
    });

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-test-email unexpected error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
