"use client";

import { useEffect, useRef, useState } from "react";
import { youTubeEmbedUrl } from "@/lib/youtube";
import { postEvent, firstTimeThisSession } from "@/lib/track";
import { thresholdsToFire, watchedPercent } from "@/lib/progress";
import type { EventType } from "@/lib/events";

/** When present, the player emits attributed engagement events for this room/resource. */
export interface VideoTracking {
  slug: string;
  contentId: string;
  durationSeconds: number | null;
}

// Minimal typing for the YouTube IFrame API we touch.
declare global {
  interface Window {
    YT?: {
      Player: new (el: Element, opts: unknown) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  getCurrentTime?: () => number;
  getDuration?: () => number;
  destroy?: () => void;
}

/**
 * Load the YouTube IFrame API exactly once per page. Rejects on network failure
 * or after a timeout so callers can gracefully fall back to a plain embed
 * (handles adblockers / offline without blocking the page).
 */
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => reject(new Error("YouTube API failed to load"));
    document.head.appendChild(tag);
    setTimeout(() => reject(new Error("YouTube API timeout")), 8000);
  });
  return apiPromise;
}

/**
 * Click-to-play YouTube player.
 *
 * - Without `tracking` (seller preview): a simple embedded iframe.
 * - With `tracking` (buyer room): builds a YT.Player and emits VIDEO_PLAYED
 *   (once), VIDEO_PROGRESS at 25/50/75 (once each, via a fired-set so seeking
 *   back never re-fires), and VIDEO_COMPLETED only on the real ENDED state.
 *   If the IFrame API can't load, it falls back to the plain iframe so the card
 *   still works — tracking soft-fails, the buyer is never blocked.
 */
export function VideoPlayer({
  videoId,
  title,
  thumbnail,
  tracking,
}: {
  videoId: string;
  title: string;
  thumbnail?: string | null;
  tracking?: VideoTracking;
}) {
  const [playing, setPlaying] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedThresholds = useRef<Set<number>>(new Set());

  function fire(type: EventType, meta?: Record<string, unknown>) {
    if (tracking) postEvent(tracking.slug, type, tracking.contentId, meta);
  }

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPoll() {
    if (pollRef.current || !tracking) return;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const dur = p.getDuration?.() || tracking.durationSeconds || 0;
      if (!dur) return; // no duration -> skip progress logic entirely
      const cur = p.getCurrentTime();
      for (const t of thresholdsToFire(watchedPercent(cur, dur), firedThresholds.current)) {
        firedThresholds.current.add(t);
        if (firstTimeThisSession(`vid_p:${tracking.slug}:${tracking.contentId}:${t}`)) {
          fire("VIDEO_PROGRESS", { percent: t, seconds: Math.round(cur) });
        }
      }
    }, 1000);
  }

  // Build the tracked player once the user presses play.
  useEffect(() => {
    if (!playing || !tracking || useFallback) return;
    let cancelled = false;

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.YT) return;
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (e: { data: number; target: YTPlayer }) => {
              const YT = window.YT!;
              if (e.data === YT.PlayerState.PLAYING) {
                if (firstTimeThisSession(`vid_play:${tracking.slug}:${tracking.contentId}`)) {
                  fire("VIDEO_PLAYED", {
                    seconds: Math.round(e.target.getCurrentTime?.() ?? 0),
                  });
                }
                startPoll();
              } else if (e.data === YT.PlayerState.ENDED) {
                stopPoll();
                if (firstTimeThisSession(`vid_done:${tracking.slug}:${tracking.contentId}`)) {
                  fire("VIDEO_COMPLETED", {
                    seconds: Math.round(e.target.getDuration?.() ?? 0),
                  });
                }
              } else if (e.data === YT.PlayerState.PAUSED) {
                stopPoll();
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true); // API blocked -> plain embed
      });

    return () => {
      cancelled = true;
      stopPoll();
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* player may already be gone */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, tracking, useFallback, videoId]);

  // Not yet playing: show the thumbnail with a play affordance.
  if (!playing) {
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

  // Tracked playback: YT.Player mounts into this container.
  if (tracking && !useFallback) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    );
  }

  // Untracked (seller preview) or fallback: plain embed.
  return (
    <div className="aspect-video w-full overflow-hidden bg-black">
      <iframe
        className="h-full w-full"
        src={`${youTubeEmbedUrl(videoId)}&autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
