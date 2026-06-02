/**
 * The six event types the Sales Room tracks. These are the ONLY values
 * accepted by POST /api/events; anything else is rejected with 400.
 */
export const EVENT_TYPES = [
  "ROOM_VIEWED",
  "RESOURCE_OPENED",
  "RESOURCE_REVISITED",
  "VIDEO_PLAYED",
  "VIDEO_PROGRESS",
  "VIDEO_COMPLETED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && EVENT_TYPE_SET.has(value);
}

/** Event types that must reference a specific content item. */
const REQUIRES_CONTENT = new Set<EventType>([
  "RESOURCE_OPENED",
  "RESOURCE_REVISITED",
  "VIDEO_PLAYED",
  "VIDEO_PROGRESS",
  "VIDEO_COMPLETED",
]);

export interface ParsedEvent {
  type: EventType;
  content_id: string | null;
  metadata: Record<string, unknown> | null;
}

export type EventValidation =
  | { ok: true; value: ParsedEvent }
  | { ok: false; error: string };

/**
 * Validate the body of POST /api/events. The room is resolved separately from
 * the slug; this only validates the event payload itself.
 */
export function validateEventBody(body: unknown): EventValidation {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (!isEventType(b.type)) {
    return {
      ok: false,
      error: `type must be one of: ${EVENT_TYPES.join(", ")}`,
    };
  }
  const type = b.type;

  let content_id: string | null = null;
  if (b.content_id != null) {
    if (typeof b.content_id !== "string") {
      return { ok: false, error: "content_id must be a string" };
    }
    content_id = b.content_id;
  }
  if (REQUIRES_CONTENT.has(type) && !content_id) {
    return { ok: false, error: `${type} requires a content_id` };
  }

  let metadata: Record<string, unknown> | null = null;
  if (b.metadata != null) {
    if (typeof b.metadata !== "object" || Array.isArray(b.metadata)) {
      return { ok: false, error: "metadata must be a JSON object" };
    }
    metadata = b.metadata as Record<string, unknown>;
  }

  return { ok: true, value: { type, content_id, metadata } };
}
