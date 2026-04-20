import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminEmailTemplates,
  useDeleteEmailTemplate,
  useUpsertEmailTemplate,
  type TemplateVariable,
} from "@/hooks/useAdminEmailTemplates";
import { formatRelativeNL } from "@/lib/time";

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

const textareaClass =
  "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

interface NewTemplateDraft {
  slug: string;
  subject: string;
  description: string;
  variables: TemplateVariable[];
  html: string;
}

const emptyDraft: NewTemplateDraft = {
  slug: "",
  subject: "",
  description: "",
  variables: [],
  html: "",
};

// Kebab-case validator, same pattern we apply to property slugs. Keeps
// template slugs safe to embed in URLs + filenames.
const SLUG_RE = /^[a-z][a-z0-9_]*$/;

export default function AdminEmailTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: templates, isLoading, isError, refetch } = useAdminEmailTemplates();
  const upsert = useUpsertEmailTemplate();
  const del = useDeleteEmailTemplate();

  const [creating, setCreating] = useState<NewTemplateDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ slug: string } | null>(null);

  const sorted = useMemo(
    () => (templates ?? []).slice().sort((a, b) => a.slug.localeCompare(b.slug)),
    [templates],
  );

  const openNew = () => setCreating({ ...emptyDraft });
  const cancelNew = () => setCreating(null);

  const updateDraftVar = (index: number, patch: Partial<TemplateVariable>) => {
    setCreating((d) => {
      if (!d) return d;
      const next = d.variables.slice();
      next[index] = { ...next[index], ...patch };
      return { ...d, variables: next };
    });
  };

  const addDraftVar = () => {
    setCreating((d) => d && { ...d, variables: [...d.variables, { name: "", description: "", required: false }] });
  };

  const removeDraftVar = (index: number) => {
    setCreating((d) => d && { ...d, variables: d.variables.filter((_, i) => i !== index) });
  };

  const handleCreate = async () => {
    if (!creating) return;
    const slug = creating.slug.trim();
    if (!SLUG_RE.test(slug)) {
      toast({
        title: "Ongeldige slug",
        description: "Gebruik kleine letters, cijfers en underscores. Beginnen met een letter.",
        variant: "destructive",
      });
      return;
    }
    if (!creating.subject.trim() || !creating.html.trim()) {
      toast({ title: "Vul verplichte velden in", description: "Onderwerp en HTML zijn verplicht.", variant: "destructive" });
      return;
    }
    // Clean out variable rows with empty name — editor shouldn't
    // persist placeholder rows the admin added but never named.
    const cleanedVars = creating.variables
      .map((v) => ({ name: v.name.trim(), description: v.description.trim(), required: v.required }))
      .filter((v) => v.name.length > 0);
    try {
      await upsert.mutateAsync({
        slug,
        subject: creating.subject,
        html: creating.html,
        variables: cleanedVars,
        description: creating.description.trim() || null,
      });
      toast({ title: "Template aangemaakt" });
      setCreating(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      const friendly = msg.includes("duplicate key")
        ? "Er bestaat al een template met deze slug."
        : msg;
      toast({ title: "Fout bij opslaan", description: friendly, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del.mutateAsync(deleteTarget.slug);
      toast({ title: "Template verwijderd" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      toast({ title: "Fout bij verwijderen", description: msg, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <Link
          to="/admin/email"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Terug naar e-mail log
        </Link>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">E-mail templates</h1>
            <p className="text-muted-foreground max-w-2xl">
              Beheer de transactionele mail-templates. Variabelen tussen dubbele accolades: <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{"{{variable_name}}"}</code>.
            </p>
          </div>
          {!creating && (
            <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nieuw template
            </Button>
          )}
        </div>

        {creating && (
          <div className="mb-8">
            <SectionCard title="Nieuw template" label="Concept">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Slug *</label>
                    <input
                      value={creating.slug}
                      onChange={(e) => setCreating({ ...creating, slug: e.target.value })}
                      placeholder="nieuwe_template"
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">Alleen kleine letters, cijfers en underscores.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Onderwerp *</label>
                    <input
                      value={creating.subject}
                      onChange={(e) => setCreating({ ...creating, subject: e.target.value })}
                      placeholder="Bijvoorbeeld: Welkom op Resid, {{user_name}}"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Beschrijving (admin)</label>
                  <textarea
                    value={creating.description}
                    onChange={(e) => setCreating({ ...creating, description: e.target.value })}
                    rows={2}
                    placeholder="Korte omschrijving voor andere admins. Niet zichtbaar voor klanten."
                    className={textareaClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">Variabelen</label>
                    <Button type="button" variant="outline" size="sm" onClick={addDraftVar}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Variabele toevoegen
                    </Button>
                  </div>
                  {creating.variables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nog geen variabelen gedefinieerd.</p>
                  ) : (
                    <div className="space-y-2">
                      {creating.variables.map((v, i) => (
                        <div key={i} className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-center">
                          <input
                            value={v.name}
                            onChange={(e) => updateDraftVar(i, { name: e.target.value })}
                            placeholder="user_name"
                            className={inputClass}
                          />
                          <input
                            value={v.description}
                            onChange={(e) => updateDraftVar(i, { description: e.target.value })}
                            placeholder="Volledige naam van de ontvanger"
                            className={inputClass}
                          />
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={v.required}
                              onChange={(e) => updateDraftVar(i, { required: e.target.checked })}
                              className="h-4 w-4"
                            />
                            Verplicht
                          </label>
                          <button
                            type="button"
                            onClick={() => removeDraftVar(i)}
                            className="h-10 w-10 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
                            aria-label={`Verwijder variabele ${v.name || i + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">HTML *</label>
                  <textarea
                    value={creating.html}
                    onChange={(e) => setCreating({ ...creating, html: e.target.value })}
                    rows={14}
                    className={`${textareaClass} font-mono text-xs`}
                    style={{ minHeight: 300 }}
                    placeholder='<!doctype html>\n<html>...</html>'
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    HTML is admin-only en wordt niet gesanitized. Wees voorzichtig met externe inhoud.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleCreate} disabled={upsert.isPending}>
                    {upsert.isPending ? "Opslaan..." : "Opslaan"}
                  </Button>
                  <Button variant="outline" onClick={cancelNew}>
                    Annuleren
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {isError ? (
          <ErrorState onRetry={() => refetch()} message="Kon templates niet laden." />
        ) : isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : sorted.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nog geen templates. Klik "Nieuw template" om er een aan te maken.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[180px_1.5fr_1.5fr_140px_120px] gap-4 px-6 py-3 border-b border-border bg-muted/50 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Slug</span>
              <span>Onderwerp</span>
              <span>Beschrijving</span>
              <span>Laatst bewerkt</span>
              <span className="text-right">Acties</span>
            </div>
            {sorted.map((t) => (
              <div
                key={t.slug}
                className="flex flex-col md:grid md:grid-cols-[180px_1.5fr_1.5fr_140px_120px] gap-2 md:gap-4 px-6 py-4 border-b border-border last:border-0 items-start md:items-center hover:bg-muted/30 transition-colors"
              >
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-mono w-fit">
                  {t.slug}
                </span>
                <p className="text-sm font-semibold text-foreground line-clamp-2 md:line-clamp-1 min-w-0">
                  {t.subject}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 min-w-0">
                  {t.description ?? <span className="italic">—</span>}
                </p>
                <span className="text-xs text-muted-foreground">{formatRelativeNL(t.updated_at)}</span>
                <div className="flex items-center gap-1 md:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/email/templates/${t.slug}`)}
                    className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Bewerk ${t.slug}`}
                    title="Bewerken"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ slug: t.slug })}
                    className="h-9 w-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-600 hover:text-red-700 transition-colors"
                    aria-label={`Verwijder ${t.slug}`}
                    title="Verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt template <span className="font-mono font-semibold">{deleteTarget?.slug}</span> definitief te verwijderen. Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
