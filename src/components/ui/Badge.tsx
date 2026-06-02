import type { ReactNode } from "react";

/**
 * Small pill label (status, role, content type). The tone is a semantic name
 * rather than a raw color so call sites stay readable and the palette can change
 * in one place.
 */
export type BadgeTone =
  | "slate"
  | "green"
  | "amber"
  | "blue"
  | "red"
  | "violet";

const TONES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-brand-100 text-brand-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-700",
  violet: "bg-violet-100 text-violet-800",
};

export function Badge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
