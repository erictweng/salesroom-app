"use client";

import { useEffect, useRef, useState } from "react";
import {
  addNoteAction,
  deleteNoteAction,
  clearNotesAction,
} from "@/server/actions";
import {
  NOTE_TARGETS,
  formatNoteTime,
  targetDomId,
  targetSectionKey,
  EXPAND_SECTION_EVENT,
} from "@/lib/notes";
import type { RoomNote } from "@/lib/types";

/**
 * Internal Notes, reimagined as a Google-Docs-style comments pane (rep-only;
 * never rendered in the buyer room). A comment icon next to the company name
 * toggles a panel that slides in from the right. Each note is attributed to the
 * signed-in rep, timestamped, and can optionally target a room section. Notes can
 * be deleted individually or cleared entirely so there's no backlog.
 *
 * Local state is the source of truth for instant feedback; we re-sync from props
 * (which refresh with the room) only when the set of note ids actually changes,
 * so the seller room's auto-refresh never clobbers an in-flight edit.
 */
export function NotesDrawer({
  slug,
  notes,
}: {
  slug: string;
  notes: RoomNote[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RoomNote[]>(notes);
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<string>(NOTE_TARGETS[0]);
  const [busy, setBusy] = useState(false);

  // "Unread" = notes created after the last time this rep opened the pane, tracked
  // per room in localStorage (so it survives reloads, stays per-browser, and a
  // rep's own just-added notes don't count once they close the pane). Hydration-
  // safe: read after mount so SSR and first client render agree.
  const seenKey = `notes-seen:${slug}`;
  const [lastSeen, setLastSeen] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      setLastSeen(window.localStorage.getItem(seenKey) ?? "");
    } catch {
      /* ignore */
    }
  }, [seenKey]);

  const markAllSeen = () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try {
      window.localStorage.setItem(seenKey, now);
    } catch {
      /* ignore */
    }
  };

  // Badge count: notes newer than lastSeen, only while the pane is closed.
  const unreadCount =
    mounted && !open
      ? items.filter((n) => n.created_at > lastSeen).length
      : 0;

  // Re-sync from the server when the note set changes (e.g. another tab added
  // one). Keyed by id signature so optimistic local-only changes aren't undone.
  const sig = notes.map((n) => n.id).join(",");
  useEffect(() => {
    setItems(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePane();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closePane = () => {
    markAllSeen(); // everything visible is now "read"
    setOpen(false);
  };

  // Jump from a note to the section it's tagged to: close the pane, scroll the
  // panel into view, and flash a brief highlight so the rep sees where they
  // landed. No-op for untagged ("General") notes.
  const goToTarget = (target: string | null) => {
    const id = targetDomId(target);
    const key = targetSectionKey(target);
    if (!id || !key) return;
    // Ask the target section to expand if it's collapsed, then close the pane.
    window.dispatchEvent(
      new CustomEvent(EXPAND_SECTION_EVENT, { detail: { storageKey: key } }),
    );
    closePane();
    // Let the expand + pane close flush before scrolling so layout is settled.
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-brand-400", "ring-offset-2");
      setTimeout(
        () => el.classList.remove("ring-2", "ring-brand-400", "ring-offset-2"),
        1600,
      );
    }, 90);
  };

  async function handleAdd() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const created = await addNoteAction(slug, target, text);
      if (created) {
        setItems((prev) => [created, ...prev]);
        setBody("");
        setTarget(NOTE_TARGETS[0]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await deleteNoteAction(slug, id);
  }

  async function handleClearAll() {
    if (items.length === 0) return;
    if (!window.confirm("Delete all notes for this room? This can't be undone."))
      return;
    setItems([]);
    await clearNotesAction(slug);
  }

  return (
    <>
      {/* Floating action button, bottom-right. Hidden while the pane is open. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={
            unreadCount > 0
              ? `Internal notes, ${unreadCount} unread`
              : "Internal notes"
          }
          title="Internal notes (rep-only)"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-1 ring-black/5 transition hover:bg-brand-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <>
          {/* Light scrim so an outside click closes the pane (Docs behavior). */}
          <button
            type="button"
            aria-label="Close notes"
            onClick={closePane}
            className="fixed inset-0 z-40 cursor-default bg-slate-900/10"
          />
          <aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl"
            role="dialog"
            aria-label="Internal notes"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Internal notes
                </h2>
                <p className="text-xs text-slate-400">
                  Rep-only · never shown to the buyer
                </p>
              </div>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePane}
                  aria-label="Close"
                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Notes list, newest first. */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {items.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-400">
                  No notes yet. Add a comment below — tag it to a section if it's
                  about a specific part of the room.
                </p>
              ) : (
                items.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => note.target && goToTarget(note.target)}
                    className={`group rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                      note.target
                        ? "cursor-pointer transition hover:border-brand-300 hover:bg-brand-50/40"
                        : ""
                    }`}
                    title={note.target ? `Go to ${note.target}` : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {note.author_name ?? note.author_email ?? "Unknown"}
                        </span>
                        {note.target && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                            {note.target}
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <path d="M7 17 17 7M9 7h8v8" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                        aria-label="Delete note"
                        className="rounded p-0.5 text-slate-300 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="h-4 w-4"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {note.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {formatNoteTime(note.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Composer, pinned at the bottom. */}
            <div className="border-t border-slate-200 px-4 py-3">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Tag a section (optional)
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {NOTE_TARGETS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  // Cmd/Ctrl+Enter to post quickly.
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
                rows={3}
                placeholder="Add a note…"
                className="w-full resize-none rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">⌘↵ to post</span>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!body.trim() || busy}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Adding…" : "Add note"}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
