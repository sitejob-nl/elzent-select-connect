import { useState, useRef, KeyboardEvent } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useAdminProperties, useUpsertProperty, useSoftDeleteProperty } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";

const emptyProperty = {
  slug: "",
  title: "",
  location: "",
  city: "",
  description: "",
  price: null as number | null,
  property_type: "",
  units: null as number | null,
  surface_area: null as number | null,
  bar_percentage: null as number | null,
  status: "draft" as string,
  image_url: "",
  tags: [] as string[],
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

const inputClass = "w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function AdminAanbod() {
  const { data: properties, isLoading } = useAdminProperties();
  const upsert = useUpsertProperty();
  const softDelete = useSoftDeleteProperty();
  const { toast } = useToast();
  const [editing, setEditing] = useState<(typeof emptyProperty & { id?: string }) | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [slugManual, setSlugManual] = useState(false);
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
  };

  const openEdit = (p: typeof emptyProperty & { id: string }) => {
    setEditing({ ...p });
    setTags(p.tags ?? []);
    setTagInput("");
    setSlugManual(true);
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
    const update: typeof editing = { ...editing, title };
    if (!slugManual) {
      update.slug = toSlug(title);
    }
    setEditing(update);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title || !editing.slug || !editing.city || !editing.location) {
      toast({ title: "Vul verplichte velden in", description: "Titel, slug, stad en locatie zijn verplicht.", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({ ...editing, tags });
      toast({ title: editing.id ? "Object bijgewerkt" : "Object aangemaakt" });
      setEditing(null);
    } catch (err: any) {
      const msg = err?.message?.includes("duplicate key")
        ? "Er bestaat al een object met deze slug."
        : err?.message || "Onbekende fout";
      toast({ title: "Fout bij opslaan", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Weet u zeker dat u "${title}" wilt verwijderen?`)) return;
    try {
      await softDelete.mutateAsync(id);
      toast({ title: "Object verwijderd" });
    } catch {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    }
  };

  if (editing) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-3xl">
          <h1 className="text-2xl font-display font-bold text-foreground mb-6">
            {editing.id ? "Object Bewerken" : "Nieuw Object"}
          </h1>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Titel *</label>
                <input value={editing.title} onChange={(e) => updateTitle(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Slug *</label>
                <input value={editing.slug} onChange={(e) => { setSlugManual(true); setEditing({ ...editing, slug: e.target.value }); }}
                  className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Locatie *</label>
                <input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  placeholder="Straatnaam 1, Stad" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Stad *</label>
                <input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-body text-muted-foreground mb-1">Beschrijving</label>
              <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={4} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Prijs (EUR)</label>
                <input type="number" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">BAR %</label>
                <input type="number" step="0.1" value={editing.bar_percentage ?? ""} onChange={(e) => setEditing({ ...editing, bar_percentage: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0.0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Eenheden</label>
                <input type="number" value={editing.units ?? ""} onChange={(e) => setEditing({ ...editing, units: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Opp. (m2)</label>
                <input type="number" value={editing.surface_area ?? ""} onChange={(e) => setEditing({ ...editing, surface_area: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Type vastgoed</label>
                <select value={editing.property_type ?? ""} onChange={(e) => setEditing({ ...editing, property_type: e.target.value })}
                  className={inputClass}>
                  <option value="">— Selecteer —</option>
                  <option value="woning">Woning</option>
                  <option value="appartement">Appartement</option>
                  <option value="commercieel">Commercieel</option>
                  <option value="gemengd">Gemengd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-body text-muted-foreground mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className={inputClass}>
                  <option value="draft">Concept</option>
                  <option value="published">Gepubliceerd</option>
                  <option value="archived">Gearchiveerd</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-body text-muted-foreground mb-1">Afbeelding URL</label>
              <input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                placeholder="https://..." className={inputClass} />
            </div>

            {/* Tags input met chips */}
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-1">Kenmerken</label>
              <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-input bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-primary/40"
                onClick={() => tagRef.current?.focus()}>
                {tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium">
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
              <p className="text-xs text-muted-foreground font-body mt-1">Druk op Enter of komma om een kenmerk toe te voegen</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="gold" onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing.id ? "Opslaan" : "Aanmaken"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Annuleren</Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Aanbod Beheren</h1>
            <p className="text-muted-foreground font-body mt-1">{properties?.length ?? 0} objecten</p>
          </div>
          <Button variant="gold" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nieuw Object
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "published", "draft"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
              {f === "all" ? "Alles" : f === "published" ? "Gepubliceerd" : "Concept"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_80px] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs font-body text-muted-foreground font-semibold">
              <span>Object</span><span>Stad</span><span>BAR</span><span>Status</span><span></span>
            </div>
            {filtered.map((p) => (
              <div key={p.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_80px_100px_80px] gap-2 sm:gap-4 px-5 py-4 border-b border-border last:border-0 items-start sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-body font-semibold text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground font-body truncate">{p.location}</p>
                </div>
                <span className="text-sm font-body text-muted-foreground">{p.city}</span>
                <span className="text-sm font-body text-foreground">{p.bar_percentage ? `${p.bar_percentage}%` : "–"}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-semibold w-fit ${
                  p.status === "published" ? "bg-emerald-100 text-emerald-700" :
                  p.status === "draft" ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {p.status === "published" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {p.status === "published" ? "Live" : p.status === "draft" ? "Concept" : "Archief"}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p as any)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(p.id, p.title)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
