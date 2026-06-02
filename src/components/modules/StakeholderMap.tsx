"use client";

import { useState } from "react";
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
 * Module B — Stakeholder Map. Champion highlighted, primary starred, each colored
 * by CRM engagement score. Clicking a person opens a profile modal with the full
 * contact detail the CRM provides (email, phone, LinkedIn, seniority, last
 * activity) — surfacing data that's otherwise unused.
 */
export function StakeholderMap({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState<Contact | null>(null);
  const rows = sortContacts(contacts);

  return (
    <div>
      {rows.length === 0 ? (
        <EmptyState
          title="No stakeholders found"
          hint="No contacts are associated with this account in the CRM."
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
                {c.is_primary && <span className="text-amber-500" title="Primary contact">★</span>}
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
