"use client";

import { useState } from "react";
import { setRoomStatusAction } from "@/server/actions";
import { Badge } from "@/components/ui/Badge";
import type { RoomStatus } from "@/lib/types";

/**
 * Seller room workflow controls: status badge, publish/unpublish (server
 * action), copy buyer link, and preview-as-buyer (opens the public route in a
 * new tab). Copy/preview are disabled until the room is published, since buyers
 * can only see published rooms.
 */
export function RoomControls({
  slug,
  status,
}: {
  slug: string;
  status: RoomStatus;
}) {
  const [copied, setCopied] = useState(false);
  const published = status === "published";
  const buyerPath = `/room/${slug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + buyerPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permissions) — silently no-op
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={published ? "green" : "amber"}>
        {published ? "Published" : "Draft"}
      </Badge>

      <form action={setRoomStatusAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="status" value={published ? "draft" : "published"} />
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            published
              ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
              : "bg-brand-700 text-white hover:bg-brand-800"
          }`}
        >
          {published ? "Unpublish" : "Publish room"}
        </button>
      </form>

      <button
        onClick={copyLink}
        disabled={!published}
        title={published ? "Copy the buyer link" : "Publish first to share"}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>

      <a
        href={buyerPath}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!published}
        className={`rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 ${
          published ? "" : "pointer-events-none opacity-50"
        }`}
      >
        Preview buyer room ↗
      </a>
    </div>
  );
}
