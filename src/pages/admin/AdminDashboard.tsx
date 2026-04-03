import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { Building2, Users, Inbox, TrendingUp, MessageSquare, ArrowRight } from "lucide-react";
import { StatsSkeleton, TableSkeleton } from "@/components/Skeletons";
import { useAdminStats, useAdminInterestRequests } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: interests } = useAdminInterestRequests();

  const recentInterests = (interests ?? []).slice(0, 5);

  const kpis = [
    { label: "Gepubliceerd Aanbod", value: stats?.publishedCount ?? "–", icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Actieve Klanten", value: stats?.activeClients ?? "–", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Nieuwe Leads", value: stats?.newLeads ?? "–", icon: Inbox, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Gem. BAR", value: stats ? `${stats.avgBar}%` : "–", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overzicht van het platform.</p>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <StatsSkeleton />
            <TableSkeleton rows={3} cols={3} />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 stagger">
              {kpis.map((k) => (
                <div key={k.label} className="bg-card rounded-lg border border-border p-5 shadow-sm animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{k.label}</span>
                    <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                      <k.icon className={`h-4 w-4 ${k.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Recent interests */}
            {recentInterests.length === 0 ? (
              <SectionCard title="Recente Aanvragen">
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Geen openstaande aanvragen.</p>
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="Recente Aanvragen" label={`${stats?.pendingInterests ?? 0} openstaand`} noPadding>
                <div className="divide-y divide-border">
                  {recentInterests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {(r.profiles as any)?.full_name ?? "Onbekend"} → {(r.properties as any)?.title ?? "–"}
                          </p>
                          {r.message && (
                            <p className="text-xs text-muted-foreground truncate">{r.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === "pending" ? "bg-amber-100 text-amber-700" :
                          r.status === "contacted" ? "bg-blue-100 text-blue-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {r.status === "pending" ? "Nieuw" : r.status === "contacted" ? "Contact" : r.status}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {new Date(r.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
              {[
                { to: "/admin/aanbod", icon: Building2, color: "text-primary", bg: "bg-primary/10", label: "Aanbod Beheren", desc: "Objecten toevoegen en bewerken" },
                { to: "/admin/klanten", icon: Users, color: "text-blue-500", bg: "bg-blue-50", label: "Klantenbeheer", desc: "Beleggers en voorkeuren" },
                { to: "/admin/toegang", icon: ShieldCheck, color: "text-amber-500", bg: "bg-amber-50", label: "Toegangsaanvragen", desc: "Goedkeuren of weigeren" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="group bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-all">
                  <div className={`h-10 w-10 rounded-lg ${link.bg} flex items-center justify-center mb-3`}>
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
                  <div className="flex items-center gap-1 text-primary text-xs font-medium mt-3 group-hover:gap-2 transition-all">
                    Bekijken <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
