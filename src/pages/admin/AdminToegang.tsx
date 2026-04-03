import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { CheckCircle, XCircle, ShieldCheck, Clock } from "lucide-react";
import { TableSkeleton } from "@/components/Skeletons";
import { useAdminAccessRequests, useReviewAccessRequest } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function AdminToegang() {
  const { data: requests, isLoading } = useAdminAccessRequests();
  const review = useReviewAccessRequest();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    if (!user) return;
    try {
      await review.mutateAsync({ id, status, reviewedBy: user.id });
      toast({ title: status === "approved" ? "Aanvraag goedgekeurd" : "Aanvraag geweigerd" });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const reviewed = (requests ?? []).filter((r) => r.status !== "pending");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Toegangsaanvragen</h1>
          <p className="text-muted-foreground">{pending.length} openstaand</p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : (
          <div className="space-y-8">
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Openstaand</h2>
                </div>
                <div className="space-y-3">
                  {pending.map((r) => (
                    <div key={r.id} className="bg-card rounded-lg border-2 border-amber-200 shadow-sm p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-amber-700 font-display">
                              {r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                            {r.company && <p className="text-xs text-muted-foreground">{r.company}</p>}
                            {r.message && (
                              <p className="text-sm text-foreground mt-2 bg-muted/50 rounded-lg p-3 leading-relaxed">{r.message}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {new Date(r.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleReview(r.id, "approved")}
                            disabled={review.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Goedkeuren
                          </button>
                          <button
                            onClick={() => handleReview(r.id, "rejected")}
                            disabled={review.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Weigeren
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviewed */}
            {reviewed.length > 0 && (
              <SectionCard title="Verwerkt" label={`${reviewed.length} aanvragen`} noPadding>
                <div className="divide-y divide-border">
                  {reviewed.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          r.status === "approved" ? "bg-emerald-100" : "bg-red-100"
                        }`}>
                          <span className={`text-[10px] font-bold font-display ${
                            r.status === "approved" ? "text-emerald-700" : "text-red-600"
                          }`}>
                            {r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                      }`}>
                        {r.status === "approved" ? "Goedgekeurd" : "Geweigerd"}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {pending.length === 0 && reviewed.length === 0 && (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Geen toegangsaanvragen.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
