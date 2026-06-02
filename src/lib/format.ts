/** Small, dependency-free formatting helpers shared across UI components. */

export function initials(first?: string, last?: string): string {
  const a = (first ?? "").trim()[0] ?? "";
  const b = (last ?? "").trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function formatAmount(
  amount?: number | null,
  currency = "USD",
): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a duration in seconds as "5 min" / "1 hr 5 min"; blank for null. */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** Human label for a content type enum value. */
export function contentTypeLabel(type: string): string {
  switch (type) {
    case "video":
      return "Video";
    case "document":
      return "Document";
    case "case_study":
      return "Case study";
    case "one_pager":
      return "One-pager";
    default:
      return type;
  }
}
