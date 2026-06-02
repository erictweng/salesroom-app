"use client";

import { useState } from "react";
import { youTubeEmbedUrl } from "@/lib/youtube";

/**
 * Click-to-play YouTube embed. Shows the thumbnail until clicked, then mounts
 * the iframe. P2 will attach the IFrame API here to fire VIDEO_PLAYED /
 * progress / completed events; for now it's a working, embeddable player.
 */
export function VideoPlayer({
  videoId,
  title,
  thumbnail,
}: {
  videoId: string;
  title: string;
  thumbnail?: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          className="h-full w-full"
          src={youTubeEmbedUrl(videoId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden bg-slate-900"
      aria-label={`Play ${title}`}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 pl-1 text-xl text-brand-700 shadow">
          ▶
        </span>
      </span>
    </button>
  );
}
