// Shared money-formatting helpers.
//
// We show all property figures with a "circa" prefix so beleggers don't read
// them as guaranteed amounts — the meeting of 20 apr 2026 made this a hard
// legal requirement. If you find yourself reaching for `formatCurrency`
// directly in a property context, you probably want `formatCirca` instead.

const currency = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

/**
 * Compact short form: "€ 1,2M" / "€ 450K". Prefer `formatCirca` for anything
 * money-like shown on the platform so the disclaimer reads correctly.
 */
export function formatShortPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "–";
  if (price >= 1_000_000) {
    // Dutch decimal comma, one fractional digit
    return `€ ${(price / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (price >= 1_000) return `€ ${Math.round(price / 1_000)}K`;
  return `€ ${price}`;
}

/** "circa € 1,2M" — the default on-platform price label. */
export function formatCirca(price: number | null | undefined): string {
  if (price === null || price === undefined) return "–";
  return `circa ${formatShortPrice(price)}`;
}

/** "circa € 123.456" — full-currency circa variant for financial overviews. */
export function formatCircaCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return `circa ${currency.format(value)}`;
}
