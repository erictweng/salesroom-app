import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { VideoPlayer } from "./VideoPlayer";
import { parseYouTubeId } from "@/lib/youtube";
import { contentTypeLabel, formatDuration } from "@/lib/format";
import type { Content } from "@/lib/types";

/** Color-codes each content type so the hub is scannable at a glance. */
const TYPE_TONE: Record<string, BadgeTone> = {
  video: "red",
  document: "blue",
  case_study: "violet",
  one_pager: "amber",
};

/**
 * A single content tile. Videos with a parseable YouTube id render the inline
 * player; everything else (docs, case studies, one-pagers) links out to the PDF
 * served by the CRM. A non-video or unparseable URL degrades to a thumbnail
 * link rather than a broken player.
 */
export function ResourceCard({ content }: { content: Content }) {
  const videoId =
    content.type === "video" ? parseYouTubeId(content.url) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      {videoId ? (
        <VideoPlayer
          videoId={videoId}
          title={content.title}
          thumbnail={content.thumbnail_url}
        />
      ) : (
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-video w-full overflow-hidden bg-slate-100"
        >
          {content.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.thumbnail_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">
              No preview
            </div>
          )}
        </a>
      )}

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone={TYPE_TONE[content.type] ?? "slate"}>
            {contentTypeLabel(content.type)}
          </Badge>
          {content.duration_seconds != null && (
            <span className="text-xs text-slate-400">
              {formatDuration(content.duration_seconds)}
            </span>
          )}
        </div>
        <h4 className="line-clamp-2 text-sm font-medium text-slate-800">
          {content.title}
        </h4>
        {content.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {content.description}
          </p>
        )}
      </div>
    </div>
  );
}
