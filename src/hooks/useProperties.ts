import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!properties) return [];

      // Fetch match scores if user is logged in
      if (user) {
        const withScores = await Promise.all(
          properties.map(async (p) => {
            const { data: score } = await supabase.rpc("calculate_match_score", {
              p_profile_id: user.id,
              p_property_id: p.id,
            });
            return { ...p, match_score: score ?? 0 };
          })
        );
        return withScores;
      }

      return properties.map((p) => ({ ...p, match_score: 0 }));
    },
    enabled: !!user,
  });
}

export function useProperty(slug: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug provided");

      const { data: property, error } = await supabase
        .from("properties")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;

      // Fetch timeline
      const { data: timeline } = await supabase
        .from("property_timeline")
        .select("*")
        .eq("property_id", property.id)
        .order("step_order", { ascending: true });

      // Fetch view count
      const { data: viewCount } = await supabase
        .from("property_view_counts")
        .select("view_count")
        .eq("property_id", property.id)
        .single();

      // Fetch match score
      let matchScore = 0;
      if (user) {
        const { data: score } = await supabase.rpc("calculate_match_score", {
          p_profile_id: user.id,
          p_property_id: property.id,
        });
        matchScore = score ?? 0;
      }

      // Log view
      if (user) {
        await supabase.from("activity_log").insert({
          profile_id: user.id,
          property_id: property.id,
          action: "view",
        });
      }

      return {
        ...property,
        timeline: timeline ?? [],
        view_count: viewCount?.view_count ?? 0,
        match_score: matchScore,
      };
    },
    enabled: !!slug && !!user,
  });
}
