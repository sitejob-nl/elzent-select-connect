import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function usePreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_preferences")
        .select("*")
        .eq("profile_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data;
    },
    enabled: !!user,
  });
}

export function useSavePreferences() {
  const { user, refreshPreferences } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Omit<TablesInsert<"client_preferences">, "profile_id">) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("client_preferences")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("client_preferences")
          .update(prefs as TablesUpdate<"client_preferences">)
          .eq("profile_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_preferences")
          .insert({ ...prefs, profile_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] }); // match scores may change
      await refreshPreferences(); // flip hasPreferences → true so onboarding guard releases
    },
  });
}
