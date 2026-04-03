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
      if (property.id) {
        const { id, ...rest } = property;
        const { error } = await supabase.from("properties").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("properties").insert(property);
        if (error) throw error;
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

      const avgBar = properties.data?.length
        ? properties.data.reduce((s, p) => s + (p.bar_percentage ?? 0), 0) / properties.data.filter((p) => p.bar_percentage).length
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
