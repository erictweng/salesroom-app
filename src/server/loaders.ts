import "server-only";
import { notFound } from "next/navigation";
import {
  CrmError,
  getAccount,
  getAccountContacts,
  getAccountEnrichment,
  getAccountOpportunities,
  listAccounts,
  listContent,
} from "@/lib/crm";
import {
  getRoomByAccount,
  getRoomBySlug,
  listRoomResources,
  listVisibleRoomResources,
} from "@/lib/repo";
import type {
  Account,
  Content,
  Contact,
  Enrichment,
  Opportunity,
  Room,
  RoomResource,
} from "@/lib/types";

export interface DashboardEntry {
  account: Account;
  room: Room | null;
}

/** Accounts the rep can curate, each annotated with its room (if any exists). */
export async function loadSellerDashboard(
  token: string,
): Promise<DashboardEntry[]> {
  const accounts = await listAccounts(token);
  return accounts.map((account) => ({
    account,
    room: getRoomByAccount(account.id) ?? null,
  }));
}

export interface ResourceWithContent extends RoomResource {
  content: Content;
}

export interface RoomData {
  room: Room;
  account: Account;
  enrichment: Enrichment | null;
  contacts: Contact[];
  opportunities: Opportunity[];
  resources: ResourceWithContent[];
}

/**
 * Everything the room builder needs, fetched in parallel. Degrades gracefully:
 * missing enrichment is null, missing opps is [], and resources whose content
 * id no longer exists in the CRM catalog are dropped rather than rendered blank.
 */
export async function loadRoomData(
  slug: string,
  token: string,
): Promise<RoomData> {
  const room = getRoomBySlug(slug);
  if (!room) notFound();

  const [account, enrichment, contacts, opportunities, content] =
    await Promise.all([
      getAccount(token, room.account_id),
      getAccountEnrichment(token, room.account_id),
      getAccountContacts(token, room.account_id),
      getAccountOpportunities(token, room.account_id),
      listContent(token),
    ]);

  const byId = new Map(content.map((c) => [c.id, c] as const));
  const resources = listRoomResources(room.id)
    .map((r) => ({ ...r, content: byId.get(r.content_id) }))
    .filter((r): r is ResourceWithContent => Boolean(r.content));

  return { room, account, enrichment, contacts, opportunities, resources };
}

/**
 * Result of loading a room for a buyer. A discriminated union so the page can
 * render exactly one of: the room, a "not published" notice, or a "not
 * authorized" notice. Unknown slugs throw notFound() (404) before we get here.
 */
export type BuyerRoomResult =
  | { status: "unpublished" }
  | { status: "forbidden" }
  | { status: "ok"; account: Account; resources: ResourceWithContent[]; room: Room };

/**
 * Load a published room for a buyer, enforcing access via the CRM's own scoping:
 * we attempt to read the room's account with the BUYER's token. If the CRM
 * returns 403, the buyer doesn't belong to that account -> "forbidden". This
 * keeps authorization in one place (the CRM) instead of a parallel ACL.
 * Hidden resources are excluded server-side.
 */
export async function loadBuyerRoom(
  slug: string,
  token: string,
): Promise<BuyerRoomResult> {
  const room = getRoomBySlug(slug);
  if (!room) notFound();

  // Buyers never see drafts (reps preview via the seller builder).
  if (room.status !== "published") return { status: "unpublished" };

  let account: Account;
  try {
    account = await getAccount(token, room.account_id);
  } catch (err) {
    if (err instanceof CrmError && err.status === 403) {
      return { status: "forbidden" };
    }
    throw err; // 401/503/etc. bubble up to normal error handling
  }

  const content = await listContent(token);
  const byId = new Map(content.map((c) => [c.id, c] as const));
  const resources = listVisibleRoomResources(room.id)
    .map((r) => ({ ...r, content: byId.get(r.content_id) }))
    .filter((r): r is ResourceWithContent => Boolean(r.content));

  return { status: "ok", account, resources, room };
}
