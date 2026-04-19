import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "property-images";

// Re-export the generated row type so callers don't have to know
// about the Database helper. Keeps a single source of truth — the
// schema — and any column change flows straight through.
export type PropertyImage = Database["public"]["Tables"]["property_images"]["Row"];

// Storage path whitelist: extensions we persist are derived from
// the File.type (mime), never from the user-supplied filename.
// Keeps `.php.jpg` and similar shenanigans out of the bucket.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
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
      return data ?? [];
    },
    enabled: !!propertyId,
  });
}

// Derive a storage path for a new image. Keyed by property_id so
// the folder structure mirrors the DB relationship. Extension is
// derived from the file's mime type (validated against a whitelist)
// — NOT from the original filename — so an attacker can't smuggle
// `.svg` or `.php` into the bucket by renaming a jpeg.
function buildStoragePath(propertyId: string, file: File): string {
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    // Caller is expected to validate up-front; this is a hard stop
    // for the rare race where an unknown mime slips through.
    throw new Error("Niet-ondersteund bestandstype. Alleen JPG, PNG en WEBP zijn toegestaan.");
  }
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

// Invalidate all property-related caches. Used after any mutation
// that touches `properties.image_url` so list surfaces, admin
// listings and detail pages all re-read the fresh hero.
function invalidatePropertyCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey[0];
      return (
        typeof k === "string" &&
        (k === "properties" || k === "admin-properties" || k === "property")
      );
    },
  });
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

      // Keep the legacy `properties.image_url` column in sync with
      // the hero. List surfaces (AanbodPage, FavorietenPage,
      // DashboardPage, PropertyCard) still read this column
      // directly — without this write, freshly uploaded images
      // would only surface on the detail page.
      if (isHero) {
        await supabase
          .from("properties")
          .update({ image_url: publicUrl })
          .eq("id", propertyId);
      }

      return inserted;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.propertyId] });
      invalidatePropertyCaches(qc);
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

      // `.select(...)` returns the updated row so we can sync the
      // legacy `properties.image_url` column when hero changed.
      const { data: updated, error } = await supabase
        .from("property_images")
        .update(rest)
        .eq("id", id)
        .select("url, property_id")
        .single();
      if (error) throw error;

      // Mirror the hero URL onto `properties.image_url` so list
      // cards and dashboards pick up the new hero immediately.
      if (rest.is_hero === true && updated) {
        await supabase
          .from("properties")
          .update({ image_url: updated.url })
          .eq("id", updated.property_id);
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
      invalidatePropertyCaches(qc);
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
      // Look up the row first so we know whether it was the hero.
      // Needed so we can promote a replacement and resync
      // `properties.image_url` after deletion.
      const { data: existing, error: fetchError } = await supabase
        .from("property_images")
        .select("is_hero")
        .eq("id", args.id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      const wasHero = existing?.is_hero === true;

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

      // If we just removed the hero, the legacy
      // `properties.image_url` column now points at a dead URL.
      // Promote the next image (lowest sort_order) to hero and
      // mirror its URL onto the property; if none remain, clear
      // the column so the placeholder takes over.
      if (wasHero) {
        const { data: remaining, error: remainingError } = await supabase
          .from("property_images")
          .select("id, url")
          .eq("property_id", args.property_id)
          .order("sort_order", { ascending: true })
          .limit(1);
        if (remainingError) throw remainingError;

        const next = remaining?.[0];
        if (next) {
          const { error: promoteError } = await supabase
            .from("property_images")
            .update({ is_hero: true })
            .eq("id", next.id);
          if (promoteError) throw promoteError;

          await supabase
            .from("properties")
            .update({ image_url: next.url })
            .eq("id", args.property_id);
        } else {
          await supabase
            .from("properties")
            .update({ image_url: null })
            .eq("id", args.property_id);
        }
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
      invalidatePropertyCaches(qc);
    },
  });
}
