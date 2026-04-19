import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { MapPin, Home, PiggyBank, Users, TrendingUp, Pencil, Trash2, Loader2 } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useAdminClients, useUpdateClient, useSoftDeleteClient } from "@/hooks/useAdmin";
import { propertyTypeLabel } from "@/lib/taxonomy";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditClient = {
  id: string;
  full_name: string;
  email: string;
  company: string;
  phone: string;
};

export default function AdminKlanten() {
  const { data: clients, isLoading } = useAdminClients();
  const { user } = useAuth();
  const { toast } = useToast();
  const updateClient = useUpdateClient();
  const softDeleteClient = useSoftDeleteClient();

  const [editing, setEditing] = useState<EditClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSave = async () => {
    if (!editing) return;
    try {
      await updateClient.mutateAsync({
        id: editing.id,
        full_name: editing.full_name.trim() || null,
        company: editing.company.trim() || null,
        phone: editing.phone.trim() || null,
      });
      toast({ title: "Klant bijgewerkt" });
      setEditing(null);
    } catch (err) {
      toast({
        title: "Kon klant niet bijwerken",
        description: err instanceof Error ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await softDeleteClient.mutateAsync(deleteTarget.id);
      toast({ title: "Klant verwijderd" });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Kon klant niet verwijderen",
        description: err instanceof Error ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Klantenbeheer</h1>
          <p className="text-muted-foreground">{clients?.length ?? 0} geregistreerde beleggers</p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : (clients ?? []).length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nog geen klanten. Nodig beleggers uit via Toegangsaanvragen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(clients ?? []).map((c) => {
              const prefs = Array.isArray(c.client_preferences) ? c.client_preferences[0] : c.client_preferences;
              const isSelf = user?.id === c.id;
              return (
                <div key={c.id} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white font-display">
                          {c.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">{c.full_name ?? "Onbekend"}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              id: c.id,
                              full_name: c.full_name ?? "",
                              email: c.email ?? "",
                              company: c.company ?? "",
                              phone: c.phone ?? "",
                            })
                          }
                          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Klant bewerken"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({ id: c.id, name: c.full_name ?? c.email ?? "deze klant" })
                            }
                            className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Klant verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {c.company && (
                      <p className="text-xs text-muted-foreground mb-3 bg-muted/50 rounded px-2.5 py-1 w-fit">{c.company}</p>
                    )}

                    {prefs ? (
                      <div className="space-y-2.5 border-t border-border pt-4">
                        {prefs.regions?.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            {prefs.regions.join(", ")}
                          </div>
                        )}
                        {prefs.property_types?.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Home className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            {prefs.property_types.map((t: string) => propertyTypeLabel(t)).join(", ")}
                          </div>
                        )}
                        {(prefs.budget_min || prefs.budget_max) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <PiggyBank className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            Budget: {prefs.budget_min ? `€${(prefs.budget_min / 1000).toFixed(0)}k` : "–"} – {prefs.budget_max ? `€${(prefs.budget_max / 1000).toFixed(0)}k` : "–"}
                          </div>
                        )}
                        {prefs.min_bar && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            Min. BAR: {prefs.min_bar}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic border-t border-border pt-3">Geen voorkeuren ingesteld</p>
                    )}
                  </div>
                  <div className="px-5 py-3 bg-muted/30 border-t border-border">
                    <p className="text-[10px] text-muted-foreground">
                      Lid sinds {new Date(c.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant bewerken</DialogTitle>
            <DialogDescription>
              Werk de gegevens van deze belegger bij. E-mail kan niet hier worden gewijzigd (dit is de loginnaam).
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-full-name">Naam</Label>
                <Input
                  id="edit-full-name"
                  value={editing.full_name}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                  placeholder="Volledige naam"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editing.email}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-company">Bedrijf</Label>
                <Input
                  id="edit-company"
                  value={editing.company}
                  onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                  placeholder="Optioneel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Telefoon</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="Optioneel"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={updateClient.isPending}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={updateClient.isPending}>
              {updateClient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klant verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} wordt verborgen. Dit kan later worden hersteld.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={softDeleteClient.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={softDeleteClient.isPending}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {softDeleteClient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
