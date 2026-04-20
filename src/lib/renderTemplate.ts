// Client-side mirror of the {{placeholder}} substitution used by
// supabase/functions/_shared/email.ts. Deno and the browser bundle use
// different module resolution, so instead of sharing a single file we
// keep this tiny helper in sync by hand — the regex and behaviour MUST
// match the server implementation.
export function renderTemplate(
  template: string,
  vars: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      // Browser-side we don't spam the console per missing key — a single
      // warn is enough to surface the issue in devtools without swamping
      // it when a template references many unknown variables.
      console.warn(`[email] missing template variable: ${key}`);
      return "";
    }
    const v = vars[key];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}
