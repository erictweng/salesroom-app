"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { youTubeEmbedUrl } from "@/lib/youtube";
import { postEvent, firstTimeThisSession } from "@/lib/track";
import { thresholdsToFire, watchedPercent } from "@/lib/progress";
import { formatDuration } from "@/lib/format";
import type { EventType } from "@/lib/events";

/** When present, the player emits attributed engagement events for this room/resource. */
export interface VideoTracking {
  slug: string;
  contentId: string;
  durationSeconds: number | null;
}

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

/** The little red YouTube glyph used in the source line. */
function YouTubeGlyph() {
  return (
    <span className="inline-flex h-3.5 w-5 items-center justify-center rounded-[3px] bg-red-600">
      <span className="ml-[1px] border-y-[3px] border-l-[5px] border-y-transparent border-l-white" />
    </span>
  );
}

/**
 * A content video. Clicking the thumbnail opens a Google-style video modal: a
 * dark full-screen overlay with a back arrow, the title, a "YouTube" source line
 * + pill (linking out to the original), and a large 16:9 player, with the
 * description and type/duration below. Closes via the back arrow, the backdrop,
 * or Escape.
 *
 * With `tracking` (buyer room) it builds a YT.Player and emits VIDEO_PLAYED /
 * PROGRESS (25/50/75) / COMPLETED; otherwise it's a plain embed, which is also
 * the fallback if the IFrame API can't load.
 */
export function VideoPlayer({
  videoId,
  title,
  thumbnail,
  description,
  durationSeconds,
  tracking,
  variant = "thumbnail",
}: {
  videoId: string;
  title: string;
  thumbnail?: string | null;
  description?: string | null;
  durationSeconds?: number | null;
  tracking?: VideoTracking;
  /** "thumbnail" = full poster button (default); "link" = compact ▶ Preview. */
  variant?: "thumbnail" | "link";
}) {
  const [open, setOpen] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedThresholds = useRef<Set<number>>(new Set());

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const meta =
    durationSeconds != null ? `Video · ${formatDuration(durationSeconds)}` : "Video";

  function fire(type: EventType, m?: Record<string, unknown>) {
    if (tracking) postEvent(tracking.slug, type, tracking.contentId, m);
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
      if (!dur) return;
      const cur = p.getCurrentTime();
      for (const t of thresholdsToFire(watchedPercent(cur, dur), firedThresholds.current)) {
        firedThresholds.current.add(t);
        if (firstTimeThisSession(`vid_p:${tracking.slug}:${tracking.contentId}:${t}`)) {
          fire("VIDEO_PROGRESS", { percent: t, seconds: Math.round(cur) });
        }
      }
    }, 1000);
  }

  function openModal() {
    setUseFallback(false);
    firedThresholds.current = new Set();
    setOpen(true);
  }
  function closeModal() {
    stopPoll();
    try {
      playerRef.current?.destroy?.();
    } catch {
      /* already gone */
    }
    playerRef.current = null;
    setOpen(false);
  }

  // Build the tracked player when the modal opens.
  useEffect(() => {
    if (!open || !tracking || useFallback) return;
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
                  fire("VIDEO_PLAYED", { seconds: Math.round(e.target.getCurrentTime?.() ?? 0) });
                }
                startPoll();
              } else if (e.data === YT.PlayerState.ENDED) {
                stopPoll();
                if (firstTimeThisSession(`vid_done:${tracking.slug}:${tracking.contentId}`)) {
                  fire("VIDEO_COMPLETED", { seconds: Math.round(e.target.getDuration?.() ?? 0) });
                }
              } else if (e.data === YT.PlayerState.PAUSED) {
                stopPoll();
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tracking, useFallback, videoId]);

  // Escape to close + lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stopPoll(), []);

  const modal = open ? (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#14161c]/95 backdrop-blur-sm"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Header */}
      <div
        className="mx-auto flex w-full max-w-4xl items-start gap-3 px-4 pt-6 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeModal}
          aria-label="Back"
          className="-ml-1 mt-0.5 shrink-0 rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
            <YouTubeGlyph />
            YouTube
          </p>
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          YouTube
        </a>
      </div>

      {/* Player */}
      <div
        className="mx-auto mt-4 w-full max-w-4xl px-4 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
          {tracking && !useFallback ? (
            <div ref={containerRef} className="h-full w-full" />
          ) : (
            <iframe
              className="h-full w-full"
              src={`${youTubeEmbedUrl(videoId)}&autoplay=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>

      {/* Below the video: real CRM detail (in place of Google's "Related topics"). */}
      <div
        className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide text-slate-500">{meta}</p>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={openModal}
          aria-label={`Preview ${title}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition hover:text-brand-800"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Preview
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
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
      )}

      {modal && typeof document !== "undefined"
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}
