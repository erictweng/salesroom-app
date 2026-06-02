"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const CENTER_W = 640; // centered/expanded width
const PIP_W = 360; // docked picture-in-picture width
const HEADER = 40;
const MARGIN = 16;

type Box = { w: number; h: number };
type Pos = { x: number; y: number };

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

function boxFor(docked: boolean): Box {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const w = Math.min(docked ? PIP_W : CENTER_W, vw - MARGIN * 2);
  return { w, h: Math.round((w * 9) / 16) + HEADER };
}

/** Snap the popup to whichever viewport corner its center is closest to. */
function nearestCorner(pos: Pos, box: Box): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = vw - box.w - MARGIN;
  const bottom = vh - box.h - MARGIN;
  const corners: Pos[] = [
    { x: MARGIN, y: MARGIN },
    { x: right, y: MARGIN },
    { x: MARGIN, y: bottom },
    { x: right, y: bottom },
  ];
  const cx = pos.x + box.w / 2;
  const cy = pos.y + box.h / 2;
  let best = corners[0];
  let bestD = Infinity;
  for (const c of corners) {
    const d = (c.x + box.w / 2 - cx) ** 2 + (c.y + box.h / 2 - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * A content video. Clicking the thumbnail opens a player popup CENTERED on
 * screen; dragging it snaps ("magnetizes") to the nearest corner and shrinks it
 * to a picture-in-picture window. The popup is rendered through a portal to
 * <body>, so it keeps playing while the buyer navigates back through the
 * resources. With `tracking` (buyer room) it builds a YT.Player and emits
 * VIDEO_PLAYED / PROGRESS (25/50/75) / COMPLETED; otherwise it's a plain embed,
 * which is also the fallback if the IFrame API can't load.
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
  const [open, setOpen] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [box, setBox] = useState<Box>({ w: CENTER_W, h: 0 });
  const [dragging, setDragging] = useState(false);
  // false = centered/expanded (modal-like); true = docked corner PiP (persists).
  const [docked, setDocked] = useState(false);

  const popupRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedThresholds = useRef<Set<number>>(new Set());
  const dragOffset = useRef<Pos>({ x: 0, y: 0 });

  // For the "only one video at a time" coordinator (see effect below).
  const instanceId = useRef(Math.random().toString(36).slice(2));
  const openRef = useRef(false);
  const closeRef = useRef<() => void>(() => {});

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

  function openPopup() {
    const b = boxFor(false);
    setBox(b);
    setPos({
      x: Math.max(MARGIN, (window.innerWidth - b.w) / 2),
      y: Math.max(MARGIN, (window.innerHeight - b.h) / 2),
    });
    setUseFallback(false);
    setDocked(false);
    firedThresholds.current = new Set();
    setOpen(true);
    // Tell any other open player to close — only one video plays at a time.
    window.dispatchEvent(
      new CustomEvent("sr-video-open", { detail: instanceId.current }),
    );
  }
  // Bring a docked PiP back to the centered, modal-like state (player keeps playing).
  function recenter() {
    const b = boxFor(false);
    setBox(b);
    setDocked(false);
    setPos({
      x: Math.max(MARGIN, (window.innerWidth - b.w) / 2),
      y: Math.max(MARGIN, (window.innerHeight - b.h) / 2),
    });
  }
  function closePopup() {
    stopPoll();
    try {
      playerRef.current?.destroy?.();
    } catch {
      /* already gone */
    }
    playerRef.current = null;
    setOpen(false);
  }

  // Keep refs current for the cross-instance coordinator (listener is mount-only).
  openRef.current = open;
  closeRef.current = closePopup;

  // Only one video at a time: when another player opens, close this one.
  useEffect(() => {
    function onOtherOpen(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      if (id !== instanceId.current && openRef.current) closeRef.current();
    }
    window.addEventListener("sr-video-open", onOtherOpen);
    return () => window.removeEventListener("sr-video-open", onOtherOpen);
  }, []);

  // Build the tracked player when the popup is open.
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

  // Drag handling (pointer on the header). Snaps to a corner + shrinks to PiP on release.
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: clamp(e.clientX - dragOffset.current.x, MARGIN, window.innerWidth - box.w - MARGIN),
          y: clamp(e.clientY - dragOffset.current.y, MARGIN, window.innerHeight - box.h - MARGIN),
        };
      });
    },
    [box.w, box.h],
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    setDocked(true); // dragging it out of center makes it a persistent PiP
    const b = boxFor(true);
    setBox(b);
    setPos((prev) => (prev ? nearestCorner(prev, b) : prev));
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  function startDrag(e: React.PointerEvent) {
    if (!pos) return;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      stopPoll();
    };
  }, [onPointerMove, endDrag]);

  // While centered (not docked), dismiss on outside click / Escape — like a modal.
  // There's no blocking backdrop, so the underlying click still fires (e.g. "Back
  // to all resources" both closes the player and navigates). Docked PiP ignores this.
  useEffect(() => {
    if (!open || docked) return;
    const onDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closePopup();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docked]);

  const popup =
    open && pos ? (
      <div
        ref={popupRef}
        className="fixed z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        style={{
          left: pos.x,
          top: pos.y,
          width: box.w,
          transition: dragging
            ? "none"
            : "left 0.2s ease, top 0.2s ease, width 0.2s ease",
        }}
      >
        <div
          onPointerDown={startDrag}
          className="flex cursor-grab touch-none items-center justify-between gap-2 bg-slate-800 px-3 py-2 text-white active:cursor-grabbing"
        >
          <span className="truncate text-sm font-medium">{title}</span>
          <div className="flex items-center gap-1">
            {docked && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={recenter}
                aria-label="Recenter player"
                className="rounded px-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                ⤢
              </button>
            )}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={closePopup}
              aria-label="Close player"
              className="rounded px-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="aspect-video w-full bg-black">
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
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openPopup}
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

      {/* Portal to <body> so the player survives in-page navigation and keeps playing. */}
      {popup && typeof document !== "undefined"
        ? createPortal(popup, document.body)
        : null}
    </>
  );
}
