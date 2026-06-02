"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A titled section the rep can collapse to cut on-screen noise. Open/closed state
 * is remembered per `storageKey` in localStorage so a rep's layout preferences
 * stick across visits. Renders its children when open (mounted either way so the
 * content still server-renders for the initial paint).
 */
export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  action,
  dragHandleProps,
  children,
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  action?: ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`collapse:${storageKey}`);
      if (saved != null) setOpen(saved === "1");
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(`collapse:${storageKey}`, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <button
              type="button"
              {...dragHandleProps}
              aria-label="Drag to reorder section"
              className="cursor-grab touch-none text-slate-400 hover:text-slate-700 active:cursor-grabbing"
            >
              ⠿
            </button>
          )}
          <button
            onClick={toggle}
            aria-expanded={open}
            className="flex items-center gap-2 text-left text-base font-semibold text-slate-900"
          >
            <span
              className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
              aria-hidden
            >
              ▶
            </span>
            {title}
          </button>
        </div>
        {action}
      </div>
      {/* Kept mounted but hidden when collapsed, so content still SSRs. */}
      <div className={open ? "border-t border-slate-100 px-5 py-4" : "hidden"}>
        {children}
      </div>
    </section>
  );
}
