// Shared email-send helper.
// Loads a DB template, renders {{placeholders}}, POSTs to Resend, and logs
// every attempt to public.email_logs. Callers must pass a service-role
// Supabase client so the insert/update bypasses RLS on email_logs.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Resid <noreply@resid.nl>";

export interface SendTemplatedEmailArgs {
  supabase: SupabaseClient;
  templateSlug: string;
  to: string;
  toProfileId?: string | null;
  variables: Record<string, string | number | null | undefined>;
}

export interface SendResult {
  ok: boolean;
  logId: string;
  resendId?: string;
  error?: string;
}

/**
 * Replace {{name}} (and {{ name }}) tokens in a template with values from
 * `vars`. Missing keys → empty string + console.warn. Regex-based; no eval.
 */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      console.warn(`[email] missing template variable: ${key}`);
      return "";
    }
    const v = vars[key];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

/**
 * Send a transactional email using a DB-backed template.
 *
 * Flow:
 * 1. Load template row by slug → if missing, log failed + return.
 * 2. Render subject + html via {{var}} substitution.
 * 3. Insert email_logs row with status='queued'.
 * 4. POST to Resend (if RESEND_API_KEY set).
 * 5. Update log row: sent (with resend_id + sent_at) OR failed (error_message).
 *
 * Always returns a result object — never throws for expected failures.
 */
export async function sendTemplatedEmail(args: SendTemplatedEmailArgs): Promise<SendResult> {
  const { supabase, templateSlug, to, toProfileId, variables } = args;

  // 1. Load template
  const { data: template, error: tplErr } = await supabase
    .from("email_templates")
    .select("slug, subject, html")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (tplErr || !template) {
    const { data: failedLog } = await supabase
      .from("email_logs")
      .insert({
        to_email: to,
        to_profile_id: toProfileId ?? null,
        template_slug: null,
        subject: `[template_not_found: ${templateSlug}]`,
        variables_used: variables ?? {},
        status: "failed",
        error_message: `template_not_found: ${templateSlug}`,
      })
      .select("id")
      .single();

    return {
      ok: false,
      logId: failedLog?.id ?? "",
      error: `template_not_found: ${templateSlug}`,
    };
  }

  // 2. Render
  const renderedSubject = renderTemplate(template.subject, variables as Record<string, unknown>);
  const renderedHtml = renderTemplate(template.html, variables as Record<string, unknown>);

  // 3. Queue log row
  const { data: queuedLog, error: logErr } = await supabase
    .from("email_logs")
    .insert({
      to_email: to,
      to_profile_id: toProfileId ?? null,
      template_slug: template.slug,
      subject: renderedSubject,
      variables_used: variables ?? {},
      status: "queued",
    })
    .select("id")
    .single();

  if (logErr || !queuedLog) {
    console.error("[email] failed to insert email_logs row", logErr);
    return {
      ok: false,
      logId: "",
      error: `email_logs_insert_failed: ${logErr?.message ?? "unknown"}`,
    };
  }

  const logId: string = queuedLog.id;

  // 4. Send via Resend
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    await supabase
      .from("email_logs")
      .update({
        status: "failed",
        error_message: "RESEND_API_KEY not set",
      })
      .eq("id", logId);

    return {
      ok: false,
      logId,
      error: "RESEND_API_KEY not set",
    };
  }

  let resendId: string | undefined;
  let sendErr: string | undefined;
  let sendOk = false;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: renderedSubject,
        html: renderedHtml,
        headers: {
          // Correlate webhook events back to our log row even when the
          // Resend id is missing (e.g. error responses).
          "X-Resid-Log-Id": logId,
        },
      }),
    });

    if (res.ok) {
      try {
        const body = await res.json();
        if (body && typeof body === "object" && typeof body.id === "string") {
          resendId = body.id;
        }
      } catch (_parseErr) {
        // Non-JSON success body — still treat as sent.
      }
      sendOk = true;
    } else {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch (_e) { /* ignore */ }
      sendErr = bodyText || `HTTP ${res.status}`;
    }
  } catch (err) {
    sendErr = err instanceof Error ? err.message : String(err);
  }

  // 5. Update log row with final status
  if (sendOk) {
    await supabase
      .from("email_logs")
      .update({
        status: "sent",
        resend_id: resendId ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logId);

    return { ok: true, logId, resendId };
  }

  await supabase
    .from("email_logs")
    .update({
      status: "failed",
      error_message: sendErr ?? "unknown_error",
    })
    .eq("id", logId);

  return { ok: false, logId, error: sendErr ?? "unknown_error" };
}
