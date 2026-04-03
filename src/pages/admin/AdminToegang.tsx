import AdminLayout from "@/components/AdminLayout";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
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

  const statusStyle = (s: string) => {
    if (s === "approved") return "bg-emerald-100 text-emerald-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const reviewed = (requests ?? []).filter((r) => r.status !== "pending");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold text-foreground">Toegangsaanvragen</h1>
        <p className="text-muted-foreground font-body mt-1">{pending.length} openstaand</p>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-body font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Openstaand</h2>
                <div className="space-y-3">
                  {pending.map((r) => (
                    <div key={r.id} className="rounded-xl border border-amber-200 bg-card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-body font-semibold text-foreground">{r.name}</p>
                          <p className="text-xs text-muted-foreground font-body">{r.email}</p>
                          {r.company && <p className="text-xs text-muted-foreground font-body">{r.company}</p>}
                          {r.message && <p className="text-sm text-foreground font-body mt-2 bg-muted/50 rounded p-2">{r.message}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleReview(r.id, "approved")}
                            disabled={review.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-body font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Goedkeuren
                          </button>
                          <button
                            onClick={() => handleReview(r.id, "rejected")}
                            disabled={review.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-body font-semibold hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Weigeren
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-body mt-3">
                        {new Date(r.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviewed */}
            {reviewed.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-body font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Verwerkt</h2>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {reviewed.map((r, i) => (
                    <div key={r.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-body font-semibold text-foreground truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground font-body truncate">{r.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold ${statusStyle(r.status)}`}>
                        {r.status === "approved" ? "Goedgekeurd" : "Geweigerd"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pending.length === 0 && reviewed.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center mt-8">
                <p className="text-muted-foreground font-body">Geen toegangsaanvragen.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
