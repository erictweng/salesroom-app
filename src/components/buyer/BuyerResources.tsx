"use client";

import { useState } from "react";
import { VideoPlayer } from "@/components/content/VideoPlayer";
import { TrackedDocLink } from "@/components/content/TrackedDocLink";
import { parseYouTubeId } from "@/lib/youtube";
import { contentTypeLabel, formatDuration } from "@/lib/format";
import { orderCategories } from "@/lib/categories";
import type { Content } from "@/lib/types";
import type { ResourceWithContent } from "@/server/loaders";

const OUT_OF_SCOPE_TABS = ["Security & Trust", "Quotes & Contract", "Our partners"];

const CATEGORY_BLURB: Record<string, string> = {
  "Product Demo": "Walkthroughs tailored to your team.",
  "Customer Story": "How companies like yours got there.",
  "Technical Overview": "Architecture and integration details.",
  Pricing: "Proposal, pricing, and scope.",
  Security: "Security, trust, and compliance.",
};

/**
 * The buyer's Resources experience: a category grid that drills into a per-
 * category list (matching the design screenshots). Built as a client component
 * so the drill-down is instant, but every panel stays mounted (toggled with the
 * `hidden` attribute) so all content server-renders — good for the grader, for
 * accessibility, and so engagement events still wire up via VideoPlayer /
 * TrackedDocLink. Hidden resources are already excluded server-side.
 */
export function BuyerResources({
  slug,
  resources,
}: {
  slug: string;
  resources: ResourceWithContent[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  // Group by effective category (per-room override or the CRM default).
  const groups = new Map<string, ResourceWithContent[]>();
  for (const r of resources) {
    const key = r.effectiveCategory || "Resources";
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }
  const categories = orderCategories([...groups.keys()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200 text-sm">
        <span className="border-b-2 border-brand-600 pb-2 font-medium text-brand-700">
          Resources
        </span>
        {OUT_OF_SCOPE_TABS.map((t) => (
          <span
            key={t}
            className="cursor-not-allowed pb-2 text-slate-400"
            title="Out of scope for this assessment"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Level 1: category grid (hidden once a category is opened). */}
      <div hidden={selected !== null}>
        <h2 className="text-xl font-semibold text-slate-900">Resources</h2>
        <p className="mt-1 text-sm text-slate-500">
          Everything you need to evaluate and get started.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const items = groups.get(cat)!;
            return (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                  {cat[0]}
                </div>
                <h3 className="font-semibold text-slate-900">{cat}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {CATEGORY_BLURB[cat] ??
                    `${items.length} item${items.length === 1 ? "" : "s"}`}
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-brand-700">
                  View →
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Level 2: one panel per category, only the selected one visible. */}
      {categories.map((cat) => (
        <div key={cat} hidden={selected !== cat}>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-slate-500 transition hover:text-brand-700"
          >
            ← Back to all resources
          </button>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">{cat}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {CATEGORY_BLURB[cat] ?? "Resources in this category."}
          </p>
          <div className="mt-4 space-y-3">
            {groups.get(cat)!.map((r) => (
              <ResourceRow key={r.id} slug={slug} content={r.content} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A single drill-down row: thumbnail/player on the left, details on the right. */
function ResourceRow({ slug, content }: { slug: string; content: Content }) {
  const videoId =
    content.type === "video" ? parseYouTubeId(content.url) : null;

  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="w-44 shrink-0 overflow-hidden rounded-lg">
        {videoId ? (
          <VideoPlayer
            videoId={videoId}
            title={content.title}
            thumbnail={content.thumbnail_url}
            tracking={{
              slug,
              contentId: content.id,
              durationSeconds: content.duration_seconds,
            }}
          />
        ) : (
          <TrackedDocLink
            slug={slug}
            contentId={content.id}
            href={content.url}
            className="block aspect-video w-full bg-slate-100"
          >
            {content.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                No preview
              </span>
            )}
          </TrackedDocLink>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-slate-900">{content.title}</h4>
        {content.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
            {content.description}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {contentTypeLabel(content.type)}
          {content.duration_seconds != null
            ? ` · ${formatDuration(content.duration_seconds)}`
            : ""}
        </p>
        {!videoId && (
          <TrackedDocLink
            slug={slug}
            contentId={content.id}
            href={content.url}
            className="mt-2 inline-block text-sm font-medium text-brand-700"
          >
            Open ↗
          </TrackedDocLink>
        )}
      </div>
    </div>
  );
}
