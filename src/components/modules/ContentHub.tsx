import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResourceCard } from "@/components/content/ResourceCard";
import type { ResourceWithContent } from "@/server/loaders";

/** Module C — Content Hub. Curated resources grouped by category, with an
 * embedded video player for video items. Hidden resources are excluded from the
 * buyer-facing view; the seller toggles hidden state in P4.
 *
 * Pass `tracking` (buyer room) to make the cards emit engagement events; omit it
 * for the seller's silent preview. */
export function ContentHub({
  resources,
  tracking,
}: {
  resources: ResourceWithContent[];
  tracking?: { slug: string };
}) {
  const visible = resources.filter((r) => !r.hidden);

  // Group by category, preserving first-seen order.
  const groups = new Map<string, ResourceWithContent[]>();
  for (const r of visible) {
    const key = r.content.category || "Other";
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="Content Hub"
        subtitle={`${visible.length} resource${visible.length === 1 ? "" : "s"} curated for this room`}
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No content yet"
          hint="Add content to share with the buyer in this room."
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                {category}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <ResourceCard
                    key={r.id}
                    content={r.content}
                    tracking={tracking}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
