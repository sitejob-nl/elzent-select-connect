import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id");

      if (error) throw error;
      return new Set((data ?? []).map((f) => f.property_id));
    },
    enabled: !!user,
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, isFavorite }: { propertyId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("profile_id", user.id)
          .eq("property_id", propertyId);
        if (error) throw error;

        // Log unfavorite
        await supabase.from("activity_log").insert({
          profile_id: user.id,
          property_id: propertyId,
          action: "unfavorite",
        });
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ profile_id: user.id, property_id: propertyId });
        if (error) throw error;

        // Log favorite
        await supabase.from("activity_log").insert({
          profile_id: user.id,
          property_id: propertyId,
          action: "favorite",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
