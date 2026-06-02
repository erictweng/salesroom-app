import {
  reorderResourceAction,
  toggleResourceHiddenAction,
} from "@/server/actions";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { contentTypeLabel } from "@/lib/format";
import type { ResourceWithContent } from "@/server/loaders";

const TYPE_TONE: Record<string, BadgeTone> = {
  video: "red",
  document: "blue",
  case_study: "violet",
  one_pager: "amber",
};

/**
 * Seller-only editable view of a room's content: a flat, position-ordered list
 * with ▲/▼ reorder and Hide/Unhide controls. Each control is a server-action
 * <form> (no client JS). Includes hidden items (dimmed) so they can be restored;
 * the buyer's grouped ContentHub renders only visible items in this saved order.
 */
export function ContentManager({
  slug,
  resources,
}: {
  slug: string;
  resources: ResourceWithContent[];
}) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Content Hub"
        subtitle="Reorder, show, or hide content. Buyers see visible items in this order."
      />

      <ul className="divide-y divide-slate-100">
        {resources.map((r, i) => {
          const hidden = r.hidden === 1;
          return (
            <li
              key={r.id}
              className={`flex items-center gap-3 py-2.5 ${hidden ? "opacity-50" : ""}`}
            >
              <div className="flex flex-col leading-none">
                <form action={reorderResourceAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="content_id" value={r.content_id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    disabled={i === 0}
                    aria-label="Move up"
                    className="px-1 text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={reorderResourceAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="content_id" value={r.content_id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    disabled={i === resources.length - 1}
                    aria-label="Move down"
                    className="px-1 text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>

              <Badge tone={TYPE_TONE[r.content.type] ?? "slate"}>
                {contentTypeLabel(r.content.type)}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                {r.content.title}
              </span>
              {hidden && (
                <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400">
                  Hidden
                </span>
              )}

              <form action={toggleResourceHiddenAction} className="shrink-0">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="content_id" value={r.content_id} />
                <input type="hidden" name="hidden" value={hidden ? "0" : "1"} />
                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                  {hidden ? "Unhide" : "Hide"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
