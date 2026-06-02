import type { ReactNode } from "react";

/**
 * Base surface for grouped content — a white, rounded, subtly-shadowed panel.
 * Padding is intentionally left to the caller so the same card works for both
 * dense lists and roomy module sections.
 */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
