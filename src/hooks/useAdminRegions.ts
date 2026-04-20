import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/taxonomy";

export interface RegionOption {
  name: string;
  sub: string | null;
  // true when the region lives in admin_regions (editable); false when it's
  // one of the hardcoded G10+Den Bosch entries from taxonomy.ts.
  custom: boolean;
  id?: string;
}

/**
 * Merged list of hardcoded REGIONS + admin-added regions.
 * Used in the regio-selectors (ProfilePage, property filters) so admins
 * can extend the dropdown without a code change.
 */
export function useRegions() {
  return useQuery({
    queryKey: ["admin_regions"],
    queryFn: async (): Promise<RegionOption[]> => {
      const { data, error } = await supabase
        .from("admin_regions")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;

      const hardcoded: RegionOption[] = REGIONS.map((r) => ({
        name: r.name,
        sub: r.sub,
        custom: false,
      }));

      const hardcodedNames = new Set(hardcoded.map((r) => r.name));
      const custom: RegionOption[] = (data ?? [])
        .filter((r) => !hardcodedNames.has(r.name))
        .map((r) => ({ id: r.id, name: r.name, sub: null, custom: true }));

      return [...hardcoded, ...custom];
    },
  });
}

export function useAdminRegions() {
  return useQuery({
    queryKey: ["admin_regions_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_regions")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddAdminRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Naam is verplicht");
      const { error } = await supabase.from("admin_regions").insert({ name: trimmed });
      if (error) {
        if (error.code === "23505") throw new Error("Deze regio bestaat al.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_regions"] });
      qc.invalidateQueries({ queryKey: ["admin_regions_list"] });
    },
  });
}

export function useDeleteAdminRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_regions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_regions"] });
      qc.invalidateQueries({ queryKey: ["admin_regions_list"] });
    },
  });
}
