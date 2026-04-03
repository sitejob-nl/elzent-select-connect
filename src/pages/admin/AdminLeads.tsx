import AdminLayout from "@/components/AdminLayout";
import { Mail, Archive, UserPlus } from "lucide-react";
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
    if (s === "invited") return "bg-emerald-100 text-emerald-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <h1 className="text-2xl font-display font-bold text-foreground">Lead Inbox</h1>
        <p className="text-muted-foreground font-body mt-1">{leads?.length ?? 0} leads</p>

        {isLoading ? (
          <div className="mt-8"><TableSkeleton rows={4} cols={3} /></div>
        ) : leads?.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center mt-8">
            <p className="text-muted-foreground font-body">Geen leads.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden mt-8">
            {(leads ?? []).map((l, i) => (
              <div key={l.id} className={`px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-body font-semibold text-foreground text-sm">{l.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold ${statusColor(l.status)}`}>
                        {l.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-body">
                        {l.source}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">{l.email}{l.phone ? ` · ${l.phone}` : ""}</p>
                    {l.company && <p className="text-xs text-muted-foreground font-body">{l.company}</p>}
                    {l.message && <p className="text-xs text-foreground font-body mt-2 bg-muted/50 rounded p-2">{l.message}</p>}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {l.status === "new" && (
                      <>
                        <button onClick={() => handleStatus(l.id, "invited")}
                          className="p-1.5 rounded hover:bg-emerald-50 transition-colors" title="Uitnodigen">
                          <UserPlus className="h-4 w-4 text-emerald-600" />
                        </button>
                        <a href={`mailto:${l.email}`}
                          className="p-1.5 rounded hover:bg-blue-50 transition-colors" title="E-mailen">
                          <Mail className="h-4 w-4 text-blue-500" />
                        </a>
                      </>
                    )}
                    {l.status !== "archived" && (
                      <button onClick={() => handleStatus(l.id, "archived")}
                        className="p-1.5 rounded hover:bg-muted transition-colors" title="Archiveren">
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-body mt-2">
                  {new Date(l.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
