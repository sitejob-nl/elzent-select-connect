import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminRegions,
  useAddAdminRegion,
  useDeleteAdminRegion,
} from "@/hooks/useAdminRegions";
import { REGIONS } from "@/lib/taxonomy";

const inputClass =
  "flex-1 h-10 px-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

export default function AdminLocaties() {
  const { data: rows, isLoading } = useAdminRegions();
  const addRegion = useAddAdminRegion();
  const deleteRegion = useDeleteAdminRegion();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addRegion.mutateAsync(newName);
      setNewName("");
      toast({ title: "Regio toegevoegd", description: `"${newName.trim()}" is toegevoegd.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Kon niet toevoegen", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" verwijderen?`)) return;
    try {
      await deleteRegion.mutateAsync(id);
      toast({ title: "Regio verwijderd" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Kon niet verwijderen", description: msg, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Locaties</h1>
          <p className="text-muted-foreground">
            Extra regio's die bovenop de vaste G10-steden beschikbaar zijn in de profiel-dropdown.
          </p>
        </div>

        <SectionCard title="Regio toevoegen">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="bv. Best, Veldhoven, Uden…"
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={addRegion.isPending || !newName.trim()}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50"
            >
              {addRegion.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Toevoegen
            </button>
          </form>
        </SectionCard>

        <div className="mt-8 space-y-8">
          <SectionCard title="Vaste regio's" label="Beheerd via code (taxonomy.ts)" noPadding>
            <div className="divide-y divide-border">
              {REGIONS.map((r) => (
                <div
                  key={r.name}
                  className="px-6 py-3 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.sub}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Vast</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Extra regio's" label={`${rows?.length ?? 0} toegevoegd`} noPadding>
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={3} cols={2} />
              </div>
            ) : (rows?.length ?? 0) === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Nog geen extra regio's toegevoegd.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows!.map((r) => (
                  <div
                    key={r.id}
                    className="px-6 py-3 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{r.name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id, r.name)}
                      disabled={deleteRegion.isPending}
                      className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                      aria-label="Verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminLayout>
  );
}
