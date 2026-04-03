import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useInterestRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["interest_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interest_requests")
        .select("property_id, status");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useSubmitInterest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, message }: { propertyId: string; message?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("interest_requests")
        .insert({
          profile_id: user.id,
          property_id: propertyId,
          message: message ?? null,
        });

      if (error) throw error;

      // Log interest
      await supabase.from("activity_log").insert({
        profile_id: user.id,
        property_id: propertyId,
        action: "interest",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interest_requests"] });
    },
  });
}
