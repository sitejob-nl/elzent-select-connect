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

      // Fetch match scores in a single batch RPC call instead of N+1
      // individual calls. The DB function only returns rows for published,
      // non-deleted properties, so drafts fall back to score=0.
      if (user) {
        const { data: scores } = await supabase.rpc(
          "calculate_match_scores_for_profile",
          { p_profile_id: user.id },
        );
        const scoreMap = new Map<string, number>(
          (scores ?? []).map((s) => [s.property_id, s.score ?? 0]),
        );
        return properties.map((p) => ({
          ...p,
          match_score: scoreMap.get(p.id) ?? 0,
        }));
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
        .select(`
          *,
          contact:profiles!properties_contact_profile_id_fkey(full_name, email, phone, avatar_url),
          images:property_images(id, url, alt_text, sort_order, is_hero),
          documents:property_documents(id, name, file_url, file_type, file_size_kb, requires_interest, sort_order)
        `)
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

      // Log view — fire-and-forget so RLS/FK errors don't break the page load
      if (user) {
        supabase.from("activity_log").insert({
          profile_id: user.id,
          property_id: property.id,
          action: "view",
        }).then(() => void 0);
      }

      // Sort images: is_hero first, then by sort_order asc
      const images = (property.images ?? []).slice().sort((a, b) => {
        if (a.is_hero !== b.is_hero) return a.is_hero ? -1 : 1;
        return a.sort_order - b.sort_order;
      });

      // Sort documents by sort_order asc
      const documents = (property.documents ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);

      return {
        ...property,
        timeline: timeline ?? [],
        view_count: viewCount?.view_count ?? 0,
        match_score: matchScore,
        images,
        documents,
        contact: property.contact ?? null,
      };
    },
    enabled: !!slug && !!user,
  });
}
