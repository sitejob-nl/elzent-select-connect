import AdminLayout from "@/components/AdminLayout";
import { Loader2, MapPin, Home, PiggyBank, Users } from "lucide-react";
import { useAdminClients } from "@/hooks/useAdmin";

export default function AdminKlanten() {
  const { data: clients, isLoading } = useAdminClients();

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <h1 className="text-2xl font-display font-bold text-foreground">Klantenbeheer</h1>
        <p className="text-muted-foreground font-body mt-1">{clients?.length ?? 0} geregistreerde beleggers</p>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (clients ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center mt-8">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-body">Nog geen klanten. Nodig beleggers uit via Toegangsaanvragen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            {(clients ?? []).map((c) => {
              const prefs = Array.isArray(c.client_preferences) ? c.client_preferences[0] : c.client_preferences;
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-secondary-foreground">
                        {c.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-body font-semibold text-foreground text-sm truncate">{c.full_name ?? "Onbekend"}</p>
                      <p className="text-xs text-muted-foreground font-body truncate">{c.email}</p>
                    </div>
                  </div>

                  {c.company && (
                    <p className="text-xs text-muted-foreground font-body mb-3">Bedrijf: {c.company}</p>
                  )}

                  {prefs ? (
                    <div className="space-y-2">
                      {prefs.regions?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {prefs.regions.join(", ")}
                        </div>
                      )}
                      {prefs.property_types?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                          <Home className="h-3.5 w-3.5 text-primary" />
                          {prefs.property_types.join(", ")}
                        </div>
                      )}
                      {(prefs.budget_min || prefs.budget_max) && (
                        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                          <PiggyBank className="h-3.5 w-3.5 text-primary" />
                          Budget: {prefs.budget_min ? `€${(prefs.budget_min / 1000).toFixed(0)}k` : "–"} – {prefs.budget_max ? `€${(prefs.budget_max / 1000).toFixed(0)}k` : "–"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-body italic">Geen voorkeuren ingesteld</p>
                  )}

                  <p className="text-[10px] text-muted-foreground font-body mt-4">
                    Lid sinds {new Date(c.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
