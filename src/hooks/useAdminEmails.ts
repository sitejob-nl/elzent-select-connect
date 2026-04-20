import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Row shape with the two joins used by the list + detail views. The
// embedded relations use the FK names Supabase exposes so we stay
// consistent with the generated schema — no `as any` anywhere in this
// file.
type EmailLogRow = Database["public"]["Tables"]["email_logs"]["Row"];
type EmailTemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];

export type EmailLogWithJoins = EmailLogRow & {
  profiles: { full_name: string | null } | null;
  email_templates: Pick<EmailTemplateRow, "description"> | null;
};

export type EmailLogDetail = EmailLogRow & {
  profiles: { id: string; full_name: string | null; email: string } | null;
  email_templates: Pick<EmailTemplateRow, "slug" | "subject" | "html" | "description"> | null;
};

export interface EmailLogFilters {
  status?: string;
  templateSlug?: string;
  search?: string;
  limit?: number;
}

/**
 * List admin-visible email_logs rows, newest first. All filters are
 * optional so the same hook can drive the unfiltered default view and
 * the filtered subsets.
 */
export function useAdminEmailLogs(filters: EmailLogFilters = {}) {
  const { status, templateSlug, search, limit = 100 } = filters;
  return useQuery({
    queryKey: ["admin-email-logs", { status, templateSlug, search, limit }],
    queryFn: async (): Promise<EmailLogWithJoins[]> => {
      let query = supabase
        .from("email_logs")
        .select(
          "*, profiles:to_profile_id(full_name), email_templates:template_slug(description)",
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status) query = query.eq("status", status);
      if (templateSlug) query = query.eq("template_slug", templateSlug);
      if (search && search.trim()) {
        // Searches both recipient address and rendered subject — the
        // two columns users actually recognise. Escape commas because
        // PostgREST .or() treats them as a separator; in practice
        // email/subject input never contains a literal comma.
        const needle = search.trim().replace(/,/g, " ");
        query = query.or(
          `to_email.ilike.%${needle}%,subject.ilike.%${needle}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EmailLogWithJoins[];
    },
  });
}

/**
 * Detail view for a single log row. Joins in the full template so the
 * preview pane can render variables_used against the stored HTML
 * without a second round-trip.
 */
export function useAdminEmailLog(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-email-logs", id],
    enabled: !!id,
    queryFn: async (): Promise<EmailLogDetail | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("email_logs")
        .select(
          "*, profiles:to_profile_id(id, full_name, email), email_templates:template_slug(slug, subject, html, description)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EmailLogDetail | null;
    },
  });
}
