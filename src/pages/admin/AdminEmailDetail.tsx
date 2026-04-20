import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { TableSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useAdminEmailLog } from "@/hooks/useAdminEmails";
import { renderTemplate } from "@/lib/renderTemplate";
import { formatAbsoluteNL } from "@/lib/time";

function statusStyle(status: string): { className: string; label: string } {
  if (status === "sent") return { className: "bg-primary/15 text-primary", label: "Verzonden" };
  if (status === "queued") return { className: "bg-amber-100 text-amber-700", label: "In wachtrij" };
  if (status === "failed") return { className: "bg-red-100 text-red-700", label: "Mislukt" };
  return { className: "bg-muted text-muted-foreground", label: status };
}

export default function AdminEmailDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: log, isLoading, isError, refetch } = useAdminEmailLog(id);

  const backLink = (
    <Link
      to="/admin/email"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="h-4 w-4" /> Terug naar e-mail log
    </Link>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-4xl">
          {backLink}
          <TableSkeleton rows={6} cols={2} />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-4xl">
          {backLink}
          <ErrorState onRetry={() => refetch()} />
        </div>
      </AdminLayout>
    );
  }

  if (!log) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-4xl">
          {backLink}
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Log niet gevonden.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const s = statusStyle(log.status);
  // variables_used is jsonb; the generated type widens it to Json. The
  // server-side helper always stores a flat Record<string, primitive>,
  // so casting to Record<string, unknown> here is accurate and lets the
  // preview/template key-value table render without per-row guards.
  const variables = (log.variables_used ?? {}) as Record<string, unknown>;
  const renderedHtml = log.email_templates?.html
    ? renderTemplate(log.email_templates.html, variables)
    : null;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl space-y-6">
        {backLink}

        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2 break-words">
            {log.subject}
          </h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${s.className}`}>
            {s.label}
          </span>
        </div>

        {log.status === "failed" && log.error_message && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1">
              Foutmelding
            </p>
            <p className="text-sm text-red-800 font-mono break-words whitespace-pre-wrap">
              {log.error_message}
            </p>
          </div>
        )}

        <SectionCard title="Metadata" label="Details">
          <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground font-medium">Ontvanger</dt>
            <dd className="text-foreground break-words">
              {log.profiles?.full_name ? (
                <>
                  {log.profiles.id ? (
                    <Link
                      to="/admin/klanten"
                      className="font-semibold text-primary hover:underline"
                    >
                      {log.profiles.full_name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{log.profiles.full_name}</span>
                  )}
                  <span className="text-muted-foreground"> &middot; {log.to_email}</span>
                </>
              ) : (
                log.to_email
              )}
            </dd>

            <dt className="text-muted-foreground font-medium">Template</dt>
            <dd className="text-foreground">
              {log.template_slug ? (
                <>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-mono">
                    {log.template_slug}
                  </span>
                  {log.email_templates?.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.email_templates.description}
                    </p>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>

            <dt className="text-muted-foreground font-medium">Resend ID</dt>
            <dd className="text-foreground font-mono text-xs break-all">
              {log.resend_id ?? <span className="text-muted-foreground font-body">—</span>}
            </dd>

            <dt className="text-muted-foreground font-medium">Aangemaakt</dt>
            <dd className="text-foreground">{formatAbsoluteNL(log.created_at)}</dd>

            {log.sent_at && (
              <>
                <dt className="text-muted-foreground font-medium">Verzonden</dt>
                <dd className="text-foreground">{formatAbsoluteNL(log.sent_at)}</dd>
              </>
            )}
          </dl>
        </SectionCard>

        <SectionCard title="Variabelen" label="variables_used">
          {Object.keys(variables).length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen variabelen geregistreerd.</p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-2 text-sm">
              {Object.entries(variables).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground font-medium break-words">{k}</dt>
                  <dd className="text-foreground font-mono text-xs break-words whitespace-pre-wrap">
                    {v === null || v === undefined ? (
                      <span className="text-muted-foreground font-body italic">leeg</span>
                    ) : (
                      String(v)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </SectionCard>

        <SectionCard title="Preview" label="Rendered HTML">
          {renderedHtml ? (
            <iframe
              title="E-mail preview"
              srcDoc={renderedHtml}
              sandbox=""
              className="w-full h-[560px] rounded-lg border border-border bg-white"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Geen template gevonden — preview niet beschikbaar.
            </p>
          )}
        </SectionCard>
      </div>
    </AdminLayout>
  );
}
