import { useState, useRef, KeyboardEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, ArrowLeft, Building2 } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useAdminProperties, useUpsertProperty, useSoftDeleteProperty } from "@/hooks/useAdmin";
import { useUploadPropertyImage } from "@/hooks/usePropertyImages";
import { useToast } from "@/hooks/use-toast";
import { PROPERTY_TYPES, propertyTypeLabel } from "@/lib/taxonomy";
import { PropertyImageManager, type QueuedImage } from "@/components/PropertyImageManager";
import type { Database } from "@/integrations/supabase/types";

// Use the generated Supabase row type as the source of truth. The
// editor form holds a subset of these columns (everything we let the
// admin touch); nullability matches the schema so no `as any` is
// needed when a list row is piped into openEdit.
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

type PropertyDraft = {
  id?: string;
  slug: string;
  title: string;
  location: string;
  city: string;
  description: string | null;
  price: number | null;
  property_type: string | null;
  units: number | null;
  surface_area: number | null;
  bar_percentage: number | null;
  status: string;
  image_url: string | null;
  tags: string[];
};

const emptyProperty: PropertyDraft = {
  slug: "",
  title: "",
  location: "",
  city: "",
  description: "",
  price: null,
  property_type: "",
  units: null,
  surface_area: null,
  bar_percentage: null,
  status: "draft",
  image_url: "",
  tags: [],
};

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const inputClass = "w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

export default function AdminAanbod() {
  const { data: properties, isLoading } = useAdminProperties();
  const upsert = useUpsertProperty();
  const softDelete = useSoftDeleteProperty();
  const uploadImage = useUploadPropertyImage();
  const { toast } = useToast();
  const [editing, setEditing] = useState<PropertyDraft | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [slugManual, setSlugManual] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  // Images queued client-side while a brand-new property has no id yet.
  // Flushed after the initial save when the property_id is known.
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  // Tracks whether the image manager has any upload currently in flight.
  // Save is disabled while this is true so we never persist an
  // inconsistent state.
  const [imagesBusy, setImagesBusy] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);

  const filtered = (properties ?? []).filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const openNew = () => {
    setEditing({ ...emptyProperty });
    setTags([]);
    setTagInput("");
    setSlugManual(false);
    setQueuedImages([]);
  };

  const openEdit = (p: PropertyRow) => {
    // Narrow the full DB row down to the editor draft shape; we
    // intentionally drop audit columns (created_at/updated_at,
    // deleted_at, created_by, contact_profile_id) that the form
    // does not touch, so they round-trip untouched on save.
    setEditing({
      id: p.id,
      slug: p.slug,
      title: p.title,
      location: p.location,
      city: p.city,
      description: p.description,
      price: p.price,
      property_type: p.property_type,
      units: p.units,
      surface_area: p.surface_area,
      bar_percentage: p.bar_percentage,
      status: p.status,
      image_url: p.image_url,
      tags: p.tags,
    });
    setTags(p.tags ?? []);
    setTagInput("");
    setSlugManual(true);
    setQueuedImages([]);
  };

  const closeEditor = () => {
    // Free any object URLs created for the queue so we don't leak
    // blob memory between edit sessions.
    queuedImages.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    setQueuedImages([]);
    setEditing(null);
  };

  const addTag = (value: string) => {
    const tag = value.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const updateTitle = (title: string) => {
    if (!editing) return;
    const update: PropertyDraft = { ...editing, title };
    if (!slugManual) {
      update.slug = toSlug(title);
    }
    setEditing(update);
  };

  const handleSave = async () => {
    if (!editing) return;
    // Base required fields for any status (incl. draft).
    if (!editing.title || !editing.slug || !editing.city || !editing.location) {
      toast({ title: "Vul verplichte velden in", description: "Titel, slug, stad en locatie zijn verplicht.", variant: "destructive" });
      return;
    }
    // Stricter rules only when publishing — drafts may be incomplete.
    if (editing.status === "published") {
      if (editing.price == null || !editing.property_type) {
        toast({
          title: "Publicatie onvolledig",
          description: "Prijs en type vastgoed zijn verplicht om te publiceren.",
          variant: "destructive",
        });
        return;
      }
    }
    // Don't let the admin save mid-upload — we'd race the image
    // inserts against the property update.
    if (imagesBusy) {
      toast({ title: "Even geduld", description: "Wacht tot alle afbeeldingen zijn geupload.", variant: "destructive" });
      return;
    }
    try {
      const isNew = !editing.id;
      // useUpsertProperty returns the row id on both the insert and
      // update paths — use it directly to flush queued images so we
      // don't race a slug-lookup against a concurrent slug edit.
      const { id: savedId } = await upsert.mutateAsync({ ...editing, tags });

      // For new properties we queue images client-side until the
      // property row exists. Flush them now that it does.
      if (isNew && queuedImages.length > 0) {
        let heroClaimed = false;
        for (let i = 0; i < queuedImages.length; i++) {
          const q = queuedImages[i];
          try {
            await uploadImage.mutateAsync({
              propertyId: savedId,
              file: q.file,
              isHero: q.isHero && !heroClaimed,
              sortOrder: i,
            });
            if (q.isHero) heroClaimed = true;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Upload mislukt";
            toast({ title: `Afbeelding ${q.file.name} mislukt`, description: msg, variant: "destructive" });
          } finally {
            URL.revokeObjectURL(q.previewUrl);
          }
        }
        setQueuedImages([]);
      }

      toast({ title: editing.id ? "Object bijgewerkt" : "Object aangemaakt" });
      setEditing(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = message.includes("duplicate key")
        ? "Er bestaat al een object met deze slug."
        : message || "Onbekende fout";
      toast({ title: "Fout bij opslaan", description: msg, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await softDelete.mutateAsync(deleteTarget.id);
      toast({ title: "Object verwijderd" });
    } catch {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // ─── Edit Form ─────────────────────────────────────
  if (editing) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-3xl">
          <button
            onClick={closeEditor}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Terug naar overzicht
          </button>

          <h1 className="text-3xl font-display font-bold text-foreground mb-8">
            {editing.id ? "Object Bewerken" : "Nieuw Object"}
          </h1>

          <div className="space-y-6">
            <SectionCard title="Algemeen" label="Basisgegevens">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Titel *</label>
                    <input value={editing.title} onChange={(e) => updateTitle(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Slug *</label>
                    <input value={editing.slug} onChange={(e) => { setSlugManual(true); setEditing({ ...editing, slug: e.target.value }); }}
                      className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Locatie *</label>
                    <input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                      placeholder="Straatnaam 1, Stad" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Stad *</label>
                    <input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Beschrijving</label>
                  <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    rows={4} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Financieel" label="Cijfers">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Prijs (EUR)</label>
                  <input type="number" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">BAR %</label>
                  <input type="number" step="0.1" value={editing.bar_percentage ?? ""} onChange={(e) => setEditing({ ...editing, bar_percentage: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Eenheden</label>
                  <input type="number" value={editing.units ?? ""} onChange={(e) => setEditing({ ...editing, units: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Opp. (m2)</label>
                  <input type="number" value={editing.surface_area ?? ""} onChange={(e) => setEditing({ ...editing, surface_area: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0" className={inputClass} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Classificatie" label="Type & Status">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Type vastgoed</label>
                    <select value={editing.property_type ?? ""} onChange={(e) => setEditing({ ...editing, property_type: e.target.value })}
                      className={inputClass}>
                      <option value="">— Selecteer —</option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
                    <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                      className={inputClass}>
                      <option value="draft">Concept</option>
                      <option value="published">Gepubliceerd</option>
                      <option value="archived">Gearchiveerd</option>
                    </select>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Foto's" label="Galerij & Hero">
              <PropertyImageManager
                propertyId={editing.id}
                onBusyChange={setImagesBusy}
                queued={queuedImages}
                onQueuedChange={setQueuedImages}
              />
            </SectionCard>

            <SectionCard title="Kenmerken" label="Tags">
              <div>
                <div className="flex flex-wrap gap-2 p-2.5 rounded-lg border border-input bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-primary/40 transition-all"
                  onClick={() => tagRef.current?.focus()}>
                  {tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {tag}
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                        className="hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagRef}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                    placeholder={tags.length === 0 ? "Typ en druk Enter om toe te voegen..." : ""}
                    className="flex-1 min-w-[120px] h-7 bg-transparent text-foreground font-body text-sm outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Druk op Enter of komma om een kenmerk toe te voegen</p>
              </div>
            </SectionCard>

            <div className="flex gap-3 pt-2">
              <Button
                variant="gold"
                onClick={handleSave}
                disabled={upsert.isPending || imagesBusy}
                className="px-6"
                title={imagesBusy ? "Wacht tot alle afbeeldingen zijn geupload" : undefined}
              >
                {(upsert.isPending || imagesBusy) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing.id ? "Opslaan" : "Aanmaken"}
              </Button>
              <Button variant="outline" onClick={closeEditor}>Annuleren</Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ─── List View ─────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Aanbod Beheren</h1>
            <p className="text-muted-foreground">{properties?.length ?? 0} objecten</p>
          </div>
          <Button variant="gold" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nieuw Object
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "published", "draft"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}>
              {f === "all" ? "Alles" : f === "published" ? "Gepubliceerd" : "Concept"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Geen objecten gevonden.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_80px] gap-4 px-6 py-3 border-b border-border bg-muted/50 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Object</span><span>Stad</span><span>BAR</span><span>Status</span><span></span>
            </div>
            {filtered.map((p) => (
              <div key={p.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_80px_100px_80px] gap-2 sm:gap-4 px-6 py-4 border-b border-border last:border-0 items-start sm:items-center hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.location}</p>
                </div>
                <span className="text-sm text-muted-foreground">{p.city}</span>
                <span className="text-sm text-foreground font-medium">{p.bar_percentage ? `${p.bar_percentage}%` : "–"}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
                  p.status === "published" ? "bg-primary/15 text-primary" :
                  p.status === "draft" ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {p.status === "published" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {p.status === "published" ? "Live" : p.status === "draft" ? "Concept" : "Archief"}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Bewerken">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: p.id, title: p.title })} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Verwijderen">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Object verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u &ldquo;{deleteTarget?.title}&rdquo; wilt verwijderen? Dit kan later worden hersteld.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
