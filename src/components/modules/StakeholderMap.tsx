"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ScorePill } from "@/components/ui/ScorePill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { Contact } from "@/lib/types";

const ROLE_TONE: Record<string, BadgeTone> = {
  Champion: "green",
  "Economic Buyer": "violet",
  "Technical Evaluator": "blue",
  "Executive Sponsor": "amber",
  "End User": "slate",
};

/** Champions first, then by CRM engagement score (desc), then by name. */
function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const ca = a.role === "Champion" ? 1 : 0;
    const cb = b.role === "Champion" ? 1 : 0;
    if (ca !== cb) return cb - ca;
    const sa = a.engagement_score ?? -1;
    const sb = b.engagement_score ?? -1;
    if (sa !== sb) return sb - sa;
    return `${a.last_name}`.localeCompare(`${b.last_name}`);
  });
}

/**
 * Module B — Stakeholder Map. Search by name + filter by role and minimum CRM
 * engagement score. Champion highlighted, primary starred, each colored by the
 * CRM score. Clicking a person opens a profile modal with full CRM detail.
 */
export function StakeholderMap({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState<Contact | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [scoreMin, setScoreMin] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const roles = useMemo(
    () => [...new Set(contacts.map((c) => c.role).filter(Boolean))].sort(),
    [contacts],
  );

  const term = query.trim().toLowerCase();
  const rows = sortContacts(contacts).filter((c) => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    if (term && !name.includes(term)) return false;
    if (role !== "all" && c.role !== role) return false;
    if ((c.engagement_score ?? 0) < scoreMin) return false;
    return true;
  });

  const activeCount = (role !== "all" ? 1 : 0) + (scoreMin > 0 ? 1 : 0);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search stakeholders"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            aria-label="Filters"
            aria-expanded={filtersOpen}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
              activeCount > 0 || filtersOpen
                ? "border-brand-400 bg-brand-50 text-brand-800"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M1.5 3h13a.5.5 0 0 1 .4.8L10 10v3.2a.5.5 0 0 1-.7.46l-2-1A.5.5 0 0 1 7 12.2V10L1.1 3.8A.5.5 0 0 1 1.5 3z" />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Role
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">All roles</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Minimum CRM score
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={scoreMin === 0 ? "" : scoreMin}
                    placeholder="0"
                    onChange={(e) =>
                      setScoreMin(
                        e.target.value === ""
                          ? 0
                          : Math.max(0, Math.min(100, Number(e.target.value))),
                      )
                    }
                    className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-500">
                    {scoreMin > 0 ? `${scoreMin}+` : "any"}
                  </span>
                </div>
              </label>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    setRole("all");
                    setScoreMin(0);
                  }}
                  disabled={activeCount === 0}
                  className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-md bg-brand-700 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            contacts.length === 0
              ? "No stakeholders found"
              : "No stakeholders match"
          }
          hint={
            contacts.length === 0
              ? "No contacts are associated with this account in the CRM."
              : "Try clearing the search or filters."
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => {
            const isChampion = c.role === "Champion";
            return (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className={`flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50 ${
                    isChampion ? "-mx-2 rounded-lg bg-brand-50/60 px-2" : ""
                  }`}
                >
                  <Avatar first={c.first_name} last={c.last_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">
                        {c.first_name} {c.last_name}
                      </span>
                      {c.is_primary && (
                        <span className="text-amber-500" title="Primary contact">
                          ★
                        </span>
                      )}
                      {isChampion && <Badge tone="green">Champion</Badge>}
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {c.title || "—"}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <Badge tone={ROLE_TONE[c.role] ?? "slate"}>{c.role}</Badge>
                  </div>
                  <div className="hidden text-xs text-slate-400 md:block">
                    {c.seniority}
                  </div>
                  <ScorePill score={c.engagement_score} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <ContactModal contact={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}

function ContactModal({
  contact,
  onClose,
}: {
  contact: Contact;
  onClose: () => void;
}) {
  const c = contact;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar first={c.first_name} last={c.last_name} className="h-12 w-12" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {c.first_name} {c.last_name}
                </h3>
                {c.is_primary && (
                  <span className="text-amber-500" title="Primary contact">
                    ★
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{c.title || "—"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={ROLE_TONE[c.role] ?? "slate"}>{c.role}</Badge>
          <Badge tone="slate">{c.seniority}</Badge>
        </div>

        <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          <Row
            label="Email"
            value={
              c.email ? (
                <a className="text-brand-700 hover:underline" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Phone"
            value={
              c.phone ? (
                <a className="text-brand-700 hover:underline" href={`tel:${c.phone}`}>
                  {c.phone}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="LinkedIn"
            value={
              c.linkedin_url ? (
                <a
                  className="text-brand-700 hover:underline"
                  href={c.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View profile ↗
                </a>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="CRM engagement"
            value={<ScorePill score={c.engagement_score} />}
          />
          <Row label="Last activity" value={formatDate(c.last_activity_date)} />
        </div>
      </div>
    </div>
  );
}
