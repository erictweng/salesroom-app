import type { HTMLAttributes } from "react";

/**
 * Base surface for grouped content — a white, rounded, subtly-shadowed panel.
 * Padding is intentionally left to the caller so the same card works for both
 * dense lists and roomy module sections. Extra div props (onDoubleClick, title,
 * etc.) are forwarded to the underlying element.
 */
export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
