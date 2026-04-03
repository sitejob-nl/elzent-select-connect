import AdminLayout from "@/components/AdminLayout";
import { MapPin, Home, PiggyBank, Users, TrendingUp } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useAdminClients } from "@/hooks/useAdmin";

export default function AdminKlanten() {
  const { data: clients, isLoading } = useAdminClients();

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
              return (
                <div key={c.id} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white font-display">
                          {c.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{c.full_name ?? "Onbekend"}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
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
                            {prefs.property_types.join(", ")}
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
    </AdminLayout>
  );
}
