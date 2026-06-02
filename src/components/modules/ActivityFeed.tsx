import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { EventRecord } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  ROOM_VIEWED: "viewed the room",
  RESOURCE_OPENED: "opened a resource",
  RESOURCE_REVISITED: "revisited a resource",
  VIDEO_PLAYED: "played a video",
  VIDEO_PROGRESS: "watched part of a video",
  VIDEO_COMPLETED: "finished a video",
};

/**
 * Module E — Activity & Engagement Feed. In P1 this is typically empty (buyer
 * events arrive in P2); the full attributed feed + insights land in P3. It still
 * renders any events present so the layout is complete from day one.
 */
export function ActivityFeed({ events }: { events: EventRecord[] }) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Activity & Engagement"
        subtitle="Live in-room activity from buyers"
      />

      {events.length === 0 ? (
        <EmptyState
          title="No buyer activity yet"
          hint="When a buyer opens this room and views content, their actions appear here, attributed to them."
        />
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-800">
                {e.actor_name ?? e.actor_email ?? "Someone"}
              </span>
              <span className="text-slate-500">
                {TYPE_LABEL[e.type] ?? e.type}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {formatDate(e.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
