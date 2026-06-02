"use client";

import { useEffect, useRef, useState } from "react";
import { saveNotesAction } from "@/server/actions";

/**
 * Module F — Internal Notes (rep-only; never rendered in the buyer room). A single
 * notes field per room with debounced autosave: ~800ms after the rep stops
 * typing, it persists and shows a "Saved" indicator. Local state is the source of
 * truth while editing, so the seller room's auto-refresh won't clobber typing.
 */
export function InternalNotes({
  slug,
  initial,
}: {
  slug: string;
  initial: string;
}) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    // Don't autosave the initial value on mount.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveNotesAction(slug, text);
      setStatus("saved");
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, slug]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Only visible to your team — never shown to the buyer.
        </p>
        <span className="text-xs text-slate-400">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Strategy, next steps, competitive intel…"
        className="w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}
