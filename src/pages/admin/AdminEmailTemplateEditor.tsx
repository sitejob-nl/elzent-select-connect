import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Send, Trash2, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import SectionCard from "@/components/SectionCard";
import { TableSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminEmailTemplate,
  useDeleteEmailTemplate,
  useSendTestEmail,
  useUpsertEmailTemplate,
  type TemplateVariable,
} from "@/hooks/useAdminEmailTemplates";
import { renderTemplate } from "@/lib/renderTemplate";

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

const textareaClass =
  "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

// Sensible sample values for the built-in template variables. Anything
// not listed falls back to "Voorbeeld <var_name>" in useSampleDefault.
const SAMPLE_DEFAULTS: Record<string, string> = {
  user_name: "Voorbeeld Naam",
  user_email: "belegger@voorbeeld.nl",
  property_title: "Appartementencomplex Woensel",
  property_city: "Eindhoven",
  property_type: "appartement",
  property_price: "€ 1.2M",
  property_bar: "6.5",
  property_slug: "appartementencomplex-woensel",
  match_score: "85",
  app_url: "https://app.resid.nl",
  invite_link: "https://app.resid.nl/invite/example",
  reset_link: "https://app.resid.nl/reset/example",
};

// Fallback for any variable that doesn't have a curated sample default.
// Plain helper (not a React hook) so it is safe to call from useMemo.
function sampleDefaultFor(name: string): string {
  if (name in SAMPLE_DEFAULTS) return SAMPLE_DEFAULTS[name];
  return `Voorbeeld ${name}`;
}

export default function AdminEmailTemplateEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { data: template, isLoading, isError, refetch } = useAdminEmailTemplate(slug);
  const upsert = useUpsertEmailTemplate();
  const del = useDeleteEmailTemplate();
  const sendTest = useSendTestEmail();

  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [description, setDescription] = useState("");
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  // Sample values used for the live preview + test-send variable bag.
  // Keyed by variable name; decoupled from the `variables` list so the
  // admin can tweak preview inputs without mutating the schema.
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [testEmail, setTestEmail] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hydrate form state once the template row arrives. Runs again if the
  // admin navigates between two editor URLs without a full remount.
  useEffect(() => {
    if (!template) return;
    setSubject(template.subject);
    setHtml(template.html);
    setDescription(template.description ?? "");
    setVariables(template.variables);
    setSampleValues((prev) => {
      // Preserve any values the admin has already typed; fill in
      // defaults for declared variables that are still unset.
      const next: Record<string, string> = { ...prev };
      for (const v of template.variables) {
        if (!(v.name in next)) next[v.name] = "";
      }
      return next;
    });
  }, [template]);

  // Default the test-send "to" field to the logged-in admin's address.
  // Only runs once profile email is known; don't overwrite manual edits.
  useEffect(() => {
    if (profile?.email && !testEmail) setTestEmail(profile.email);
  }, [profile?.email, testEmail]);

  const previewVariables = useMemo(() => {
    // Only expose the *declared* variables to the preview so unused keys
    // don't leak into renders. Empty fields fall back to the per-var
    // default so the admin always sees a fully-rendered email.
    const out: Record<string, string> = {};
    for (const v of variables) {
      const raw = sampleValues[v.name];
      out[v.name] = raw && raw.length > 0 ? raw : sampleDefaultFor(v.name);
    }
    return out;
  }, [variables, sampleValues]);

  const renderedSubject = useMemo(
    () => renderTemplate(subject, previewVariables),
    [subject, previewVariables],
  );
  const renderedHtml = useMemo(
    () => renderTemplate(html, previewVariables),
    [html, previewVariables],
  );

  const updateVar = (index: number, patch: Partial<TemplateVariable>) => {
    setVariables((arr) => {
      const next = arr.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addVar = () => {
    setVariables((arr) => [...arr, { name: "", description: "", required: false }]);
  };

  const removeVar = (index: number) => {
    setVariables((arr) => arr.filter((_, i) => i !== index));
  };

  const fillDefaults = () => {
    setSampleValues((prev) => {
      const next = { ...prev };
      for (const v of variables) next[v.name] = sampleDefaultFor(v.name);
      return next;
    });
  };

  const handleSave = async () => {
    if (!slug) return;
    if (!subject.trim() || !html.trim()) {
      toast({ title: "Vul verplichte velden in", description: "Onderwerp en HTML zijn verplicht.", variant: "destructive" });
      return;
    }
    const cleaned = variables
      .map((v) => ({ name: v.name.trim(), description: v.description.trim(), required: v.required }))
      .filter((v) => v.name.length > 0);
    try {
      await upsert.mutateAsync({
        slug,
        subject,
        html,
        variables: cleaned,
        description: description.trim() || null,
        originalSlug: slug,
      });
      toast({ title: "Template opgeslagen" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      toast({ title: "Fout bij opslaan", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!slug) return;
    try {
      await del.mutateAsync(slug);
      toast({ title: "Template verwijderd" });
      navigate("/admin/email/templates");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      toast({ title: "Fout bij verwijderen", description: msg, variant: "destructive" });
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleTestSend = async () => {
    if (!slug) return;
    const to = testEmail.trim();
    if (!to || !to.includes("@")) {
      toast({ title: "Ongeldig e-mailadres", variant: "destructive" });
      return;
    }
    try {
      const res = await sendTest.mutateAsync({
        templateSlug: slug,
        to,
        variables: previewVariables,
        subjectOverride: subject,
        htmlOverride: html,
      });
      if (res.ok) {
        toast({
          title: "Testmail verzonden",
          description: (
            <span>
              Bekijk het log op <Link to="/admin/email" className="underline font-semibold">/admin/email</Link>.
            </span>
          ),
        });
      } else {
        toast({
          title: "Testmail niet verzonden",
          description: res.error ?? "Onbekende fout. Zie log voor details.",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      toast({ title: "Fout bij verzenden", description: msg, variant: "destructive" });
    }
  };

  const backLink = (
    <Link
      to="/admin/email/templates"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="h-4 w-4" /> Terug naar templates
    </Link>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl">
          {backLink}
          <TableSkeleton rows={6} cols={2} />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl">
          {backLink}
          <ErrorState onRetry={() => refetch()} />
        </div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl">
          {backLink}
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-muted-foreground">Template niet gevonden.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        {backLink}

        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
          Template bewerken
        </h1>
        <p className="text-muted-foreground mb-6">
          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{template.slug}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          {/* Left column: form */}
          <div className="space-y-4">
            <SectionCard title="Gegevens" label="Bewerken">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Slug</label>
                  <input value={template.slug} readOnly disabled className={`${inputClass} opacity-60`} />
                  <p className="mt-1 text-[11px] text-muted-foreground">Slug kan niet worden gewijzigd (referenties in e-mail log).</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Onderwerp *</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Beschrijving (admin)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className={textareaClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">Variabelen</label>
                    <Button type="button" variant="outline" size="sm" onClick={addVar}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Toevoegen
                    </Button>
                  </div>
                  {variables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Geen variabelen gedefinieerd.</p>
                  ) : (
                    <div className="space-y-2">
                      {variables.map((v, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1.5fr_auto_auto] gap-2 items-center">
                          <input
                            value={v.name}
                            onChange={(e) => updateVar(i, { name: e.target.value })}
                            placeholder="user_name"
                            className={inputClass}
                          />
                          <input
                            value={v.description}
                            onChange={(e) => updateVar(i, { description: e.target.value })}
                            placeholder="Beschrijving"
                            className={`${inputClass} hidden md:block`}
                          />
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap hidden md:flex">
                            <input
                              type="checkbox"
                              checked={v.required}
                              onChange={(e) => updateVar(i, { required: e.target.checked })}
                              className="h-4 w-4"
                            />
                            Verplicht
                          </label>
                          <button
                            type="button"
                            onClick={() => removeVar(i)}
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
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={18}
                    className={`${textareaClass} font-mono text-xs`}
                    style={{ minHeight: 400 }}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    HTML is admin-only en wordt niet gesanitized. Wees voorzichtig met externe inhoud.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={handleSave} disabled={upsert.isPending}>
                    {upsert.isPending ? "Opslaan..." : "Opslaan"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/admin/email/templates")}>
                    Annuleren
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    className="ml-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right column: preview + tabs */}
          <div>
            <SectionCard title="Voorbeeld" label="Live">
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="preview">Voorbeeld</TabsTrigger>
                  <TabsTrigger value="vars">Variabelen</TabsTrigger>
                  <TabsTrigger value="test">Test versturen</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-2 bg-muted/70 border-b border-border text-xs">
                      <span className="text-muted-foreground">Onderwerp: </span>
                      <span className="text-foreground font-medium break-words">{renderedSubject}</span>
                    </div>
                    <iframe
                      title="Template preview"
                      srcDoc={renderedHtml}
                      sandbox=""
                      className="w-full h-[560px] bg-white"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="vars" className="space-y-3">
                  {variables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Geen variabelen gedefinieerd.</p>
                  ) : (
                    <>
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={fillDefaults}>
                          Gebruik standaard voorbeelden
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {variables.map((v) => (
                          <div key={v.name || Math.random()} className="space-y-1">
                            <label className="block text-xs font-medium text-muted-foreground">
                              <span className="font-mono text-foreground">{v.name}</span>
                              {v.required && <span className="text-red-600 ml-1">*</span>}
                              {v.description && (
                                <span className="ml-2 text-muted-foreground font-body">{v.description}</span>
                              )}
                            </label>
                            <input
                              value={sampleValues[v.name] ?? ""}
                              onChange={(e) =>
                                setSampleValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                              }
                              placeholder={sampleDefaultFor(v.name)}
                              className={inputClass}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="test" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Verzenden naar
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="admin@voorbeeld.nl"
                      className={inputClass}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verstuurt een testmail met de huidige (onopgeslagen) inhoud en de variabelen uit het Variabelen-tabblad. Het onderwerp wordt voorzien van "[TEST] ".
                  </p>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleTestSend} disabled={sendTest.isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      {sendTest.isPending ? "Verzenden..." : "Verzenden"}
                    </Button>
                    <Link to="/admin/email" className="text-xs text-primary hover:underline">
                      Bekijk e-mail log →
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </SectionCard>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt template <span className="font-mono font-semibold">{template.slug}</span> definitief te verwijderen. Dit kan niet ongedaan worden gemaakt. Verwijderen is alleen mogelijk als geen verzonden mails meer naar dit template verwijzen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

