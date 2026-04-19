import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { Mail, Archive, UserPlus, Inbox } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useAdminLeads, useUpdateLead } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";

export default function AdminLeads() {
  const { data: leads, isLoading } = useAdminLeads();
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateLead.mutateAsync({ id, status });
      toast({ title: `Lead ${status === "archived" ? "gearchiveerd" : "uitgenodigd"}` });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  const statusColor = (s: string) => {
    if (s === "new") return "bg-amber-100 text-amber-700";
    if (s === "invited") return "bg-primary/15 text-primary";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (s: string) => {
    if (s === "new") return "Nieuw";
    if (s === "invited") return "Uitgenodigd";
    if (s === "archived") return "Gearchiveerd";
    return s;
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Lead Inbox</h1>
          <p className="text-muted-foreground">{leads?.length ?? 0} leads</p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : leads?.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Geen leads.</p>
          </div>
        ) : (
          <SectionCard title="Alle Leads" label={`${(leads ?? []).filter(l => l.status === "new").length} nieuw`} noPadding>
            <div className="divide-y divide-border">
              {(leads ?? []).map((l) => (
                <div key={l.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{l.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(l.status)}`}>
                          {statusLabel(l.status)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                          {l.source}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{l.email}{l.phone ? ` · ${l.phone}` : ""}</p>
                      {l.company && <p className="text-xs text-muted-foreground">{l.company}</p>}
                      {l.message && (
                        <p className="text-xs text-foreground mt-2 bg-muted/50 rounded-lg p-3 leading-relaxed">{l.message}</p>
                      )}
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {l.status === "new" && (
                        <>
                          <button
                            onClick={() => handleStatus(l.id, "invited")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Uitnodigen
                          </button>
                          <a
                            href={`mailto:${l.email}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" /> E-mail
                          </a>
                        </>
                      )}
                      {l.status !== "archived" && (
                        <button
                          onClick={() => handleStatus(l.id, "archived")}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title="Archiveren"
                        >
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(l.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </AdminLayout>
  );
}
