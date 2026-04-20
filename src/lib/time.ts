import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Dutch relative-time formatter for admin tables (e.g. "2 min geleden",
 * "1 uur geleden"). For timestamps older than ~24h we switch to an
 * absolute date so long-lived logs stay readable at a glance.
 */
export function formatRelativeNL(iso: string): string {
  const d = new Date(iso);
  const age = Date.now() - d.getTime();
  const day = 86_400_000;
  if (age > day) {
    return d.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return formatDistanceToNow(d, { addSuffix: true, locale: nl });
}

/** Absolute timestamp for detail views (never relative). */
export function formatAbsoluteNL(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
