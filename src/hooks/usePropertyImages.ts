import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-images";

export type PropertyImage = {
  id: string;
  property_id: string;
  url: string;
  alt_text: string | null;
  is_hero: boolean;
  sort_order: number;
  created_at: string;
};

// ─── Query: all images for a property ──────────────────────────
// Sorted: is_hero desc, then sort_order asc — same ordering the
// detail page uses for its carousel.
export function usePropertyImages(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property-images", propertyId],
    queryFn: async (): Promise<PropertyImage[]> => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("is_hero", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PropertyImage[];
    },
    enabled: !!propertyId,
  });
}

// Derive a storage path for a new image. Keyed by property_id so
// the folder structure mirrors the DB relationship.
function buildStoragePath(propertyId: string, file: File): string {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const uuid = crypto.randomUUID();
  return `${propertyId}/${uuid}.${ext}`;
}

// Parse the storage path (everything after `${BUCKET}/`) out of a
// public URL. Needed so delete can remove the underlying object.
function extractStoragePath(publicUrl: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

// ─── Mutation: upload + insert row ─────────────────────────────
export function useUploadPropertyImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      propertyId: string;
      file: File;
      altText?: string;
      isHero?: boolean;
      sortOrder?: number;
    }) => {
      const { propertyId, file, altText, isHero, sortOrder } = args;

      const path = buildStoragePath(propertyId, file);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // If new image becomes hero, clear the flag on any previous
      // hero in the same property first. Two sequential updates —
      // NOT atomic, but Postgres' partial unique index on
      // (property_id) where is_hero=true would reject a racing
      // double-insert anyway, so the worst case is the second
      // write erroring out and the caller retrying.
      if (isHero) {
        await supabase
          .from("property_images")
          .update({ is_hero: false })
          .eq("property_id", propertyId)
          .eq("is_hero", true);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("property_images")
        .insert({
          property_id: propertyId,
          url: publicUrl,
          alt_text: altText ?? null,
          is_hero: isHero ?? false,
          sort_order: sortOrder ?? 0,
        })
        .select()
        .single();

      if (insertError) {
        // Row insert failed — orphaned object. Best-effort cleanup
        // so storage doesn't accumulate dead files.
        await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
        throw insertError;
      }

      return inserted as PropertyImage;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.propertyId] });
    },
  });
}

// ─── Mutation: update sort_order / is_hero / alt_text ──────────
export function useUpdatePropertyImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      property_id: string;
      sort_order?: number;
      is_hero?: boolean;
      alt_text?: string | null;
    }) => {
      const { id, property_id, ...rest } = args;

      // Promoting to hero requires un-heroing all other rows in
      // the same property first. We do this in two sequential
      // statements — Postgres lacks a single-statement primitive
      // for "set exactly one row true, all others false" without
      // either a CTE or an RPC. Acceptable race: a concurrent
      // second "set hero" call lands in between, we could end up
      // with two rows flagged; the partial unique index on
      // property_images(property_id) WHERE is_hero guards against
      // this at the DB level (the second write will error and the
      // mutation is retried by React Query on invalidation).
      if (rest.is_hero === true) {
        const { error: unheroError } = await supabase
          .from("property_images")
          .update({ is_hero: false })
          .eq("property_id", property_id)
          .eq("is_hero", true)
          .neq("id", id);
        if (unheroError) throw unheroError;
      }

      const { error } = await supabase
        .from("property_images")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
    },
  });
}

// ─── Mutation: delete (storage object + DB row) ────────────────
export function useDeletePropertyImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      url: string;
      property_id: string;
    }) => {
      const path = extractStoragePath(args.url);
      // Remove the storage object first so we don't leave a dead
      // row pointing at an already-gone file if storage fails.
      if (path) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove([path]);
        // Not-found on the object is fine — row is authoritative;
        // treat any other error as fatal.
        if (removeError && !/not.?found/i.test(removeError.message)) {
          throw removeError;
        }
      }

      const { error } = await supabase
        .from("property_images")
        .delete()
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
    },
  });
}
