import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

// A single declared variable on an email template. The underlying DB
// column is `variables jsonb`; we narrow it here to this shape so
// editor/preview consumers have a typed handle instead of `Json`.
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
}

type EmailTemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];

// DB-facing row + a narrowed `variables` field. Renderers/editors work
// against this; writes re-widen to Json via the mutation typings below.
export type EmailTemplate = Omit<EmailTemplateRow, "variables"> & {
  variables: TemplateVariable[];
};

function normalizeVariables(raw: Json | null): TemplateVariable[] {
  if (!Array.isArray(raw)) return [];
  const out: TemplateVariable[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.name !== "string" || obj.name.length === 0) continue;
    out.push({
      name: obj.name,
      description: typeof obj.description === "string" ? obj.description : "",
      required: obj.required === true,
    });
  }
  return out;
}

function normalizeTemplate(row: EmailTemplateRow): EmailTemplate {
  return { ...row, variables: normalizeVariables(row.variables) };
}

export function useAdminEmailTemplates() {
  return useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("slug");
      if (error) throw error;
      return (data ?? []).map(normalizeTemplate);
    },
  });
}

export function useAdminEmailTemplate(slug: string | undefined) {
  return useQuery({
    queryKey: ["admin-email-template", slug],
    enabled: !!slug,
    queryFn: async (): Promise<EmailTemplate | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeTemplate(data) : null;
    },
  });
}

export interface UpsertTemplatePayload {
  slug: string;
  subject: string;
  html: string;
  variables: TemplateVariable[];
  description: string | null;
  // When editing an existing template, pass the original slug so we
  // can detect (and reject) slug changes — the DB PK is the slug, so a
  // rename would orphan email_logs rows.
  originalSlug?: string;
}

export function useUpsertEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertTemplatePayload): Promise<EmailTemplate> => {
      const { slug, subject, html, variables, description, originalSlug } = payload;
      const variablesJson = variables as unknown as Json;
      if (originalSlug && originalSlug !== slug) {
        // Guard: we don't support slug rename because the PK is shared
        // with email_logs.template_slug (ON DELETE SET NULL). Renaming
        // would orphan log rows.
        throw new Error("Slug kan niet worden gewijzigd op een bestaand template.");
      }
      if (originalSlug) {
        const { data, error } = await supabase
          .from("email_templates")
          .update({
            subject,
            html,
            variables: variablesJson,
            description,
          })
          .eq("slug", originalSlug)
          .select("*")
          .single();
        if (error) throw error;
        return normalizeTemplate(data);
      }
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          slug,
          subject,
          html,
          variables: variablesJson,
          description,
        })
        .select("*")
        .single();
      if (error) throw error;
      return normalizeTemplate(data);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
      qc.invalidateQueries({ queryKey: ["admin-email-template", row.slug] });
    },
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string): Promise<void> => {
      // UX guard: prevent deletion when email_logs still references the
      // template. The FK is ON DELETE SET NULL so a delete would not
      // error, but we'd silently erase the slug from historical logs.
      const { count, error: countErr } = await supabase
        .from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("template_slug", slug);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          "Kan template niet verwijderen — er zijn verzonden mails die dit template refereren.",
        );
      }
      const { error } = await supabase.from("email_templates").delete().eq("slug", slug);
      if (error) throw error;
    },
    onSuccess: (_void, slug) => {
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
      qc.invalidateQueries({ queryKey: ["admin-email-template", slug] });
    },
  });
}

export interface SendTestEmailPayload {
  templateSlug: string;
  to: string;
  // Rendered against subjectOverride/htmlOverride on the server. Values
  // may be null/undefined/number — the server coerces to string.
  variables: Record<string, string | number | null | undefined>;
  // When present, the edge function uses these in place of the stored
  // template subject/html. Lets the admin test unsaved edits.
  subjectOverride?: string;
  htmlOverride?: string;
}

export interface SendTestEmailResult {
  ok: boolean;
  logId: string;
  resendId?: string;
  error?: string;
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (payload: SendTestEmailPayload): Promise<SendTestEmailResult> => {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: payload,
      });
      if (error) throw error;
      return data as SendTestEmailResult;
    },
  });
}
