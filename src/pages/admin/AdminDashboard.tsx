import AdminLayout from "@/components/AdminLayout";
import { Building2, Users, Inbox, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import { useAdminStats, useAdminInterestRequests } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: interests } = useAdminInterestRequests();

  const recentInterests = (interests ?? []).slice(0, 5);

  const kpis = [
    { label: "Gepubliceerd Aanbod", value: stats?.publishedCount ?? "–", icon: Building2, color: "text-primary" },
    { label: "Actieve Klanten", value: stats?.activeClients ?? "–", icon: Users, color: "text-blue-500" },
    { label: "Nieuwe Leads", value: stats?.newLeads ?? "–", icon: Inbox, color: "text-amber-500" },
    { label: "Gem. BAR", value: stats ? `${stats.avgBar}%` : "–", icon: TrendingUp, color: "text-emerald-500" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground font-body mt-1">Overzicht van het platform.</p>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground font-body">{k.label}</span>
                    <k.icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Pending interests */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-foreground">Recente Aanvragen</h2>
                <span className="text-xs font-body text-muted-foreground">{stats?.pendingInterests ?? 0} openstaand</span>
              </div>

              {recentInterests.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground font-body">Geen openstaande aanvragen.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {recentInterests.map((r, i) => (
                    <div key={r.id} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-body font-semibold text-foreground truncate">
                            {(r.profiles as any)?.full_name ?? "Onbekend"} → {(r.properties as any)?.title ?? "–"}
                          </p>
                          {r.message && (
                            <p className="text-xs text-muted-foreground font-body truncate">{r.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold ${
                          r.status === "pending" ? "bg-amber-100 text-amber-700" :
                          r.status === "contacted" ? "bg-blue-100 text-blue-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {r.status}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          {new Date(r.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <Link to="/admin/aanbod" className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
                <Building2 className="h-5 w-5 text-primary mb-2" />
                <p className="font-body font-semibold text-foreground text-sm">Aanbod Beheren</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Objecten toevoegen en bewerken</p>
              </Link>
              <Link to="/admin/klanten" className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
                <Users className="h-5 w-5 text-blue-500 mb-2" />
                <p className="font-body font-semibold text-foreground text-sm">Klantenbeheer</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Beleggers en voorkeuren</p>
              </Link>
              <Link to="/admin/toegang" className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
                <Inbox className="h-5 w-5 text-amber-500 mb-2" />
                <p className="font-body font-semibold text-foreground text-sm">Toegangsaanvragen</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Goedkeuren of weigeren</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
