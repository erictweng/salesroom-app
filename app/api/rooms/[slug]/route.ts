import { getRoomBySlug, listRoomResources } from "@/lib/repo";
import { json, error } from "@/lib/http";

/** Fetch a room and its resources by slug. 404 for unknown slugs. */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const room = getRoomBySlug(params.slug);
  if (!room) return error("Room not found", 404);

  return json({ room, resources: listRoomResources(room.id) });
}
