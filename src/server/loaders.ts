import "server-only";
import { notFound } from "next/navigation";
import {
  getAccount,
  getAccountContacts,
  getAccountEnrichment,
  getAccountOpportunities,
  listAccounts,
  listContent,
} from "@/lib/crm";
import { getRoomByAccount, getRoomBySlug, listRoomResources } from "@/lib/repo";
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
