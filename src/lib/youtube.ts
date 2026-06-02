/** Helpers for turning CRM video URLs into embeddable YouTube players. */

const ID_PATTERNS = [
  /[?&]v=([A-Za-z0-9_-]{6,})/, // watch?v=ID
  /youtu\.be\/([A-Za-z0-9_-]{6,})/, // youtu.be/ID
  /\/embed\/([A-Za-z0-9_-]{6,})/, // /embed/ID
  /\/shorts\/([A-Za-z0-9_-]{6,})/, // /shorts/ID
];

/** Extract a YouTube video id from any common URL form, or null if none. */
export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const p of ID_PATTERNS) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Embed URL with the IFrame API enabled so P2 can attach progress listeners.
 * `origin` is omitted here and set client-side where window is available.
 */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1`;
}
