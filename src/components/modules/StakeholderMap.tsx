import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ScorePill } from "@/components/ui/ScorePill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
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
 * Module B — Stakeholder Map. Champion highlighted, primary contact starred,
 * each colored by the CRM engagement_score (labeled "CRM score" so it never
 * reads as live in-room activity).
 */
export function StakeholderMap({ contacts }: { contacts: Contact[] }) {
  const rows = sortContacts(contacts);

  return (
    <Card className="p-6">
      <SectionHeader
        title="Stakeholder Map"
        subtitle="People involved in this deal, colored by CRM engagement score"
      />

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
              <li
                key={c.id}
                className={`flex items-center gap-3 py-3 ${
                  isChampion ? "-mx-3 rounded-lg bg-brand-50/60 px-3" : ""
                }`}
              >
                <Avatar first={c.first_name} last={c.last_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-900">
                      {c.first_name} {c.last_name}
                    </span>
                    {c.is_primary && (
                      <span
                        className="text-amber-500"
                        title="Primary contact"
                        aria-label="Primary contact"
                      >
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
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
