import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Search } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { TableSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useAdminEmailLogs } from "@/hooks/useAdminEmails";
import { formatRelativeNL } from "@/lib/time";

// Only outbound statuses are relevant — no webhook wired up yet, so
// "delivered"/"bounced"/"opened" never appear in practice.
const STATUS_FILTERS = [
  { value: "", label: "Alles" },
  { value: "sent", label: "Verzonden" },
  { value: "failed", label: "Mislukt" },
  { value: "queued", label: "In wachtrij" },
] as const;

// Mirror of the seeded rows in migration 20260420000000_email_system.sql.
// Kept hand-maintained because the Supabase JS client doesn't expose
// DISTINCT and a full-log scan to derive slugs would be wasteful.
const TEMPLATE_FILTERS = [
  { value: "", label: "Alle templates" },
  { value: "new_match", label: "Nieuwe match" },
  { value: "invite", label: "Uitnodiging" },
  { value: "password_reset", label: "Wachtwoord herstel" },
] as const;

function statusStyle(status: string): { className: string; label: string } {
  if (status === "sent") return { className: "bg-primary/15 text-primary", label: "Verzonden" };
  if (status === "queued") return { className: "bg-amber-100 text-amber-700", label: "In wachtrij" };
  if (status === "failed") return { className: "bg-red-100 text-red-700", label: "Mislukt" };
  return { className: "bg-muted text-muted-foreground", label: status };
}

export default function AdminEmail() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      templateSlug: templateFilter || undefined,
      search: search || undefined,
    }),
    [statusFilter, templateFilter, search],
  );

  const { data: logs, isLoading, isError, refetch } = useAdminEmailLogs(filters);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">E-mail log</h1>
          <p className="text-muted-foreground">Alle uitgaande mails, nieuwste eerst.</p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || "all"}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoeken op e-mail of onderwerp..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all sm:w-56"
            >
              {TEMPLATE_FILTERS.map((t) => (
                <option key={t.value || "all"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isError ? (
          <ErrorState
            onRetry={() => refetch()}
            message="Kon e-mail log niet laden. Probeer het zo opnieuw."
          />
        ) : isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : !logs || logs.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nog geen e-mails gevonden.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_140px_120px_130px] gap-4 px-6 py-3 border-b border-border bg-muted/50 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Onderwerp</span>
              <span>Ontvanger</span>
              <span>Template</span>
              <span>Status</span>
              <span>Verzonden</span>
            </div>
            {logs.map((log) => {
              const s = statusStyle(log.status);
              const recipientName = log.profiles?.full_name ?? null;
              return (
                <button
                  key={log.id}
                  onClick={() => navigate(`/admin/email/${log.id}`)}
                  className="w-full text-left flex flex-col md:grid md:grid-cols-[1.5fr_1.2fr_140px_120px_130px] gap-2 md:gap-4 px-6 py-4 border-b border-border last:border-0 items-start md:items-center hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/50"
                >
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 md:line-clamp-1">
                      {log.subject}
                    </p>
                    <p className="text-[11px] text-muted-foreground md:hidden mt-0.5">
                      {log.to_email}
                    </p>
                  </div>
                  <div className="min-w-0 hidden md:block">
                    {recipientName ? (
                      <>
                        <p className="text-sm text-foreground truncate">{recipientName}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.to_email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">{log.to_email}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium uppercase tracking-wider w-fit">
                    {log.template_slug ?? "—"}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit ${s.className}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeNL(log.created_at)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
