import { NextRequest } from "next/server";
import { getAuth } from "@/lib/session";
import { getAccount, listContent } from "@/lib/crm";
import { createOrGetRoom, listRoomResources } from "@/lib/repo";
import { json, error, toErrorResponse } from "@/lib/http";

/**
 * Create a room for an account (or open the existing one). Rep-only. On creation
 * the room is seeded with all current CRM content as room_resources, in order.
 */
export async function POST(req: NextRequest) {
  const auth = getAuth();
  if (!auth) return error("Not authenticated", 401);
  if (auth.user.role !== "rep") {
    return error("Only sales reps can create rooms", 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }
  const accountId = (body as { account_id?: unknown })?.account_id;
  if (typeof accountId !== "string" || !accountId) {
    return error("account_id is required", 400);
  }

  try {
    // Validate the account exists in the CRM and grab its name for the title.
    const account = await getAccount(auth.token, accountId);
    const content = await listContent(auth.token);

    const { room, created } = createOrGetRoom({
      accountId: account.id,
      title: account.name,
      createdBy: auth.user.email,
      seedContentIds: content.map((c) => c.id),
    });

    return json(
      { room, resources: listRoomResources(room.id), created },
      created ? 201 : 200,
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
