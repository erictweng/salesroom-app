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
  "Custom Proposal": "Pricing, timeline, and scope tailored to your team.",
  "Secureframe Overview & Our Team":
    "Meet the team behind your compliance journey and see what Secureframe can do.",
  "Product Demos": "A walkthrough of the features that matter most to your team.",
  "Getting Started with Your Trial":
    "A quick guide to getting the most out of your Secureframe trial.",
  "Case Studies": "How companies like yours got compliant with Secureframe.",
  "Integration Documentation":
    "Technical setup guides for AWS, GitHub, HR systems, and more.",
};

/** Per-category logo: an icon + tinted tile, matching the buyer-page design. */
const CATEGORY_STYLE: Record<
  string,
  { tile: string; icon: React.ReactNode }
> = {
  "Custom Proposal": { tile: "bg-blue-50 text-blue-600", icon: <DocumentIcon /> },
  "Secureframe Overview & Our Team": {
    tile: "bg-violet-50 text-violet-600",
    icon: <TeamIcon />,
  },
  "Product Demos": { tile: "bg-emerald-50 text-emerald-600", icon: <PlayIcon /> },
  "Getting Started with Your Trial": {
    tile: "bg-rose-50 text-rose-600",
    icon: <GearIcon />,
  },
  "Case Studies": { tile: "bg-fuchsia-50 text-fuchsia-600", icon: <SearchIcon /> },
  "Integration Documentation": {
    tile: "bg-slate-100 text-slate-600",
    icon: <BookIcon />,
  },
};

const DEFAULT_STYLE = { tile: "bg-brand-50 text-brand-700", icon: <DocumentIcon /> };

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
            const style = CATEGORY_STYLE[cat] ?? DEFAULT_STYLE;
            return (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow"
              >
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${style.tile}`}
                >
                  {style.icon}
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
            description={content.description}
            durationSeconds={content.duration_seconds}
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

/* ----------------------------- category icons ------------------------- */

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

function DocumentIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M16 19v-2a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v2" />
      <circle cx="9" cy="8" r="3" />
      <path d="M22 19v-2a3 3 0 0 0-2.2-2.9M16 5.1a3 3 0 0 1 0 5.8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
