import { NextRequest } from "next/server";
import { getAuth } from "@/lib/session";
import { validateEventBody } from "@/lib/events";
import { getRoomBySlug, insertEvent, getFeed } from "@/lib/repo";
import { json, error } from "@/lib/http";

/**
 * Record an engagement event. The event is attributed to the signed-in user via
 * the session JWT (name/email/role) — this holds even if the buyer has no CRM
 * contact record, since we read identity from the token, not the CRM.
 *
 * Body: { slug, type, content_id?, metadata? }
 */
export async function POST(req: NextRequest) {
  const auth = getAuth();
  if (!auth) return error("Not authenticated", 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const slug = body.slug;
  if (typeof slug !== "string" || !slug) {
    return error("slug is required", 400);
  }
  const room = getRoomBySlug(slug);
  if (!room) return error("Room not found", 404);

  const parsed = validateEventBody(body);
  if (!parsed.ok) return error(parsed.error, 400);

  // DESIGN DECISION: content_id is validated structurally (must be a string, and
  // required for resource/video events) but is NOT checked against the CRM
  // catalog or the room's resource list. Events are an append-only engagement
  // log whose primary value is identity attribution; a stale or unknown
  // content_id simply won't resolve to a card at render time. Validating against
  // the CRM here would add a network round-trip to a hot path and couple event
  // ingestion to CRM availability. Revisit if events ever drive billing/quotas.

  const ev = insertEvent({
    roomId: room.id,
    type: parsed.value.type,
    contentId: parsed.value.content_id,
    actorEmail: auth.user.email,
    actorName: auth.user.name,
    actorRole: auth.user.role,
    metadata: parsed.value.metadata,
  });

  return json({ event: ev }, 201);
}

/**
 * Engagement feed for a room (rep view). Query: ?slug=...
 */
export async function GET(req: NextRequest) {
  const auth = getAuth();
  if (!auth) return error("Not authenticated", 401);
  if (auth.user.role !== "rep") {
    return error("Only sales reps can view the engagement feed", 403);
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return error("slug query parameter is required", 400);

  const room = getRoomBySlug(slug);
  if (!room) return error("Room not found", 404);

  return json({ events: getFeed(room.id) });
}
