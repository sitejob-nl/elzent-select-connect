// Shared email-send helper.
// Renders {{placeholders}}, POSTs to Resend, and logs every attempt to
// public.email_logs. Callers must pass a service-role Supabase client so
// the insert/update bypasses RLS on email_logs.
//
// Two entry points:
//   - sendTemplatedEmail: look up a template row by slug, then delegate.
//     This is the happy path used by production senders.
//   - sendRawEmail:      send arbitrary subject/html (possibly still
//     containing {{vars}}) without a DB template. Used by the admin
//     "send test email" editor to preview unsaved content.

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

export interface SendRawEmailArgs {
  supabase: SupabaseClient;
  to: string;
  subject: string; // may still contain {{vars}}
  html: string;    // may still contain {{vars}}
  variables: Record<string, string | number | null | undefined>;
  /** Slug to record on email_logs.template_slug for audit trails. Optional. */
  templateSlug?: string | null;
  toProfileId?: string | null;
  /**
   * If true, prefixes the rendered subject with "[TEST] ". Used by the
   * admin test-send path so admins can distinguish test rows in the log.
   */
  markAsTest?: boolean;
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
 * Send arbitrary subject/html via Resend + log to email_logs. Does the
 * {{var}} rendering so callers can pass unsaved template content.
 *
 * Always returns a result object — never throws for expected failures.
 */
export async function sendRawEmail(args: SendRawEmailArgs): Promise<SendResult> {
  const { supabase, to, subject, html, variables, toProfileId, markAsTest } = args;
  const templateSlug = args.templateSlug ?? null;

  const renderedSubjectRaw = renderTemplate(subject, variables as Record<string, unknown>);
  const renderedSubject = markAsTest ? `[TEST] ${renderedSubjectRaw}` : renderedSubjectRaw;
  const renderedHtml = renderTemplate(html, variables as Record<string, unknown>);

  // 1. Queue log row
  const { data: queuedLog, error: logErr } = await supabase
    .from("email_logs")
    .insert({
      to_email: to,
      to_profile_id: toProfileId ?? null,
      template_slug: templateSlug,
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

  // 2. Send via Resend
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

  // 3. Update log row with final status
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

/**
 * Send a transactional email using a DB-backed template.
 *
 * Flow:
 * 1. Load template row by slug → if missing, log failed + return.
 * 2. Delegate to sendRawEmail which renders vars, logs, POSTs to Resend.
 */
export async function sendTemplatedEmail(args: SendTemplatedEmailArgs): Promise<SendResult> {
  const { supabase, templateSlug, to, toProfileId, variables } = args;

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

  return sendRawEmail({
    supabase,
    to,
    subject: template.subject,
    html: template.html,
    variables,
    templateSlug: template.slug,
    toProfileId,
  });
}
