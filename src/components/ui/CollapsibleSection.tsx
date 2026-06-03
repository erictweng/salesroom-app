"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EXPAND_SECTION_EVENT } from "@/lib/notes";

/**
 * A titled section the rep can collapse to cut on-screen noise. Open/closed state
 * is remembered per `storageKey` in localStorage so a rep's layout preferences
 * stick across visits. Renders its children when open (mounted either way so the
 * content still server-renders for the initial paint).
 *
 * `nested` drops the card chrome (border/shadow/padding) so the component can be
 * used as a sub-section inside another panel without a card-in-card look.
 */
export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  action,
  dragHandleProps,
  nested = false,
  id,
  className,
  children,
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  action?: ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  nested?: boolean;
  /** Optional DOM id (e.g. an anchor so notes can scroll/jump to this panel). */
  id?: string;
  /** Extra classes on the root (e.g. scroll-margin for anchored jumps). */
  className?: string;
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

  // Another component (e.g. a note jumping to its section) can request this
  // section be expanded. We open it and persist so it stays open.
  useEffect(() => {
    const onExpand = (e: Event) => {
      const key = (e as CustomEvent<{ storageKey?: string }>).detail?.storageKey;
      if (key !== storageKey) return;
      setOpen(true);
      try {
        window.localStorage.setItem(`collapse:${storageKey}`, "1");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(EXPAND_SECTION_EVENT, onExpand as EventListener);
    return () =>
      window.removeEventListener(EXPAND_SECTION_EVENT, onExpand as EventListener);
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
    <section
      id={id}
      className={[
        nested ? "" : "rounded-xl border border-slate-200 bg-white shadow-sm",
        // In a stretch grid (e.g. the side-by-side top row), a collapsed panel
        // shouldn't stretch to match an expanded neighbor — pin it to the top so
        // it stays header-height. No effect outside a stretch context.
        open ? "" : "self-start",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={`flex items-center justify-between ${nested ? "py-2" : "px-5 py-3"}`}
      >
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
            className={`flex items-center gap-2 text-left font-semibold text-slate-900 ${
              nested ? "text-sm" : "text-base"
            }`}
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
      <div
        className={
          open
            ? nested
              ? "border-t border-slate-100 pt-3"
              : "border-t border-slate-100 px-5 py-4"
            : "hidden"
        }
      >
        {children}
      </div>
    </section>
  );
}
