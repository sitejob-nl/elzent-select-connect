import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Properties (admin CRUD) ────────────────────────────

export function useAdminProperties() {
  return useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (property: {
      id?: string;
      slug: string;
      title: string;
      location: string;
      city: string;
      description?: string;
      price?: number;
      property_type?: string;
      units?: number;
      surface_area?: number;
      bar_percentage?: number;
      status: string;
      image_url?: string;
      tags?: string[];
    }) => {
      let propertyId = property.id;
      let wasJustPublished = false;

      if (property.id) {
        const { id, ...rest } = property;
        // Detect a draft -> published transition so we only notify once per publish,
        // not on every edit of an already-published property.
        const { data: prev, error: prevError } = await supabase
          .from("properties")
          .select("status")
          .eq("id", id)
          .single();
        // If we can't read the previous status, default to "published" so we don't
        // mass-mail clients on an unknown-state edit. Better to under-notify than re-spam.
        const oldStatus = prevError || !prev ? "published" : prev.status;
        const { error } = await supabase.from("properties").update(rest).eq("id", id);
        if (error) throw error;
        wasJustPublished = oldStatus !== "published" && rest.status === "published";
      } else {
        const { data, error } = await supabase.from("properties").insert(property).select("id").single();
        if (error) throw error;
        propertyId = data.id;
        wasJustPublished = property.status === "published";
      }

      // Trigger email notifications only on the draft -> published transition
      // (or a brand-new published insert). Editing an already-published property
      // must NOT re-mail every matching client.
      if (wasJustPublished && propertyId) {
        supabase.functions.invoke("notify-new-match", {
          body: { property_id: propertyId },
        }).catch(() => {}); // fire-and-forget, don't block the UI
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-properties"] }),
  });
}

export function useSoftDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("properties")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-properties"] }),
  });
}

// ─── Clients ────────────────────────────────────────────

export function useAdminClients() {
  return useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, client_preferences(*)")
        .eq("role", "client")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    // Email is intentionally omitted — changing auth-email requires service role
    // via an edge function (not a plain profiles UPDATE), so this hook rejects it.
    mutationFn: async (client: {
      id: string;
      full_name?: string | null;
      company?: string | null;
      phone?: string | null;
    }) => {
      const { id, ...rest } = client;
      const { error } = await supabase.from("profiles").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}

export function useSoftDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}

// ─── Leads ──────────────────────────────────────────────

export function useAdminLeads() {
  return useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-leads"] }),
  });
}

// ─── Access Requests ────────────────────────────────────

export function useAdminAccessRequests() {
  return useQuery({
    queryKey: ["admin-access-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReviewAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reviewedBy }: { id: string; status: string; reviewedBy: string }) => {
      if (status === "approved") {
        // Approval creates the auth user, profile + sends invite email via edge function.
        const { data, error } = await supabase.functions.invoke("approve-access-request", {
          body: { access_request_id: id },
        });
        if (error) {
          // Edge function non-2xx: try to pull a readable message out of the response.
          // supabase-js attaches the response as error.context when available.
          let message = error.message || "Kon aanvraag niet goedkeuren";
          try {
            const ctx = (error as unknown as { context?: Response }).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) message = body.error;
            }
          } catch {
            // ignore body parse failure — fall back to error.message
          }
          throw new Error(message);
        }
        if (data?.error) throw new Error(data.error);
        return;
      }
      // rejected: plain DB update (no user creation).
      const { error } = await supabase
        .from("access_requests")
        .update({ status, reviewed_by: reviewedBy })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-access-requests"] }),
  });
}

// ─── Interest Requests (admin view) ─────────────────────

export function useAdminInterestRequests() {
  return useQuery({
    queryKey: ["admin-interest-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interest_requests")
        .select("*, profiles(full_name, email, company), properties(title, slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateInterestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("interest_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-interest-requests"] }),
  });
}

// ─── KPI stats ──────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [properties, clients, leads, interests] = await Promise.all([
        supabase.from("properties").select("bar_percentage, status", { count: "exact" }).eq("status", "published").is("deleted_at", null),
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "client").is("deleted_at", null),
        supabase.from("leads").select("id", { count: "exact" }).eq("status", "new"),
        supabase.from("interest_requests").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      const withBar = properties.data?.filter((p) => p.bar_percentage) ?? [];
      const avgBar = withBar.length > 0
        ? withBar.reduce((s, p) => s + (p.bar_percentage ?? 0), 0) / withBar.length
        : 0;

      return {
        publishedCount: properties.count ?? 0,
        activeClients: clients.count ?? 0,
        newLeads: leads.count ?? 0,
        pendingInterests: interests.count ?? 0,
        avgBar: avgBar.toFixed(1),
      };
    },
  });
}
