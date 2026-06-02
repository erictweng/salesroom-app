"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRep } from "./guards";
import { getAccount, listContent } from "@/lib/crm";
import { createOrGetRoom, getRoomBySlug, setRoomStatus } from "@/lib/repo";
import { clearSession } from "@/lib/session";
import type { RoomStatus } from "@/lib/types";

/**
 * One-click "open/create" from the account picker. Idempotent: re-running for an
 * account that already has a room opens the existing one (see createOrGetRoom).
 * On creation, the room is seeded with all current CRM content as resources.
 */
export async function createRoomAction(formData: FormData): Promise<void> {
  const accountId = String(formData.get("account_id") ?? "");
  const { user, token } = requireRep();
  if (!accountId) redirect("/seller");

  const account = await getAccount(token, accountId);
  const content = await listContent(token);
  const { room } = createOrGetRoom({
    accountId: account.id,
    title: account.name,
    createdBy: user.email,
    seedContentIds: content.map((c) => c.id),
  });

  redirect(`/seller/rooms/${room.slug}`);
}

/**
 * Publish or unpublish a room (rep-only). Only published rooms are visible to
 * buyers. revalidatePath refreshes the builder so the status badge/controls
 * reflect the change immediately.
 */
export async function setRoomStatusAction(formData: FormData): Promise<void> {
  requireRep(); // rep-only; redirects otherwise
  const slug = String(formData.get("slug") ?? "");
  const status = String(formData.get("status") ?? "") as RoomStatus;
  if (status !== "draft" && status !== "published") return;

  const room = getRoomBySlug(slug);
  if (!room) return;

  setRoomStatus(room.id, status);
  revalidatePath(`/seller/rooms/${room.slug}`);
}

export async function logoutAction(): Promise<void> {
  clearSession();
  redirect("/login");
}
