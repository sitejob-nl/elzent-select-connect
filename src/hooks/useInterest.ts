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
        .select("id, property_id, status");

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

      const { data: inserted, error } = await supabase
        .from("interest_requests")
        .insert({
          profile_id: user.id,
          property_id: propertyId,
          message: message ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Log the interest in the activity stream (best-effort; failing this
      // should not hide the fact that the interest was saved).
      await supabase.from("activity_log").insert({
        profile_id: user.id,
        property_id: propertyId,
        action: "interest",
      });

      // Kick off the notify-interest edge function — sends both the belegger
      // confirmation and the admin notification email. Fire-and-forget: email
      // failures should not make the interest itself look broken to the user.
      supabase.functions
        .invoke("notify-interest", {
          body: { interest_request_id: inserted.id },
        })
        .catch((err) => console.error("notify-interest invoke failed", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interest_requests"] });
    },
  });
}
