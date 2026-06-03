"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRep } from "./guards";
import { getAccount, listContent } from "@/lib/crm";
import {
  createOrGetRoom,
  getRoomBySlug,
  setRoomStatus,
  setResourceHidden,
  setResourceOrder,
  setResourceCategory,
  setSectionOrder,
  addNote,
  deleteNote,
  clearNotes,
} from "@/lib/repo";
import { clearSession } from "@/lib/session";
import { isKnownCategory } from "@/lib/categories";
import { normalizeTarget } from "@/lib/notes";
import { SECTION_KEYS } from "@/lib/sections";
import type { RoomNote, RoomStatus } from "@/lib/types";

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

/**
 * Persist a drag-and-drop reorder (rep-only). Called programmatically from the
 * client ContentManager with the full ordered list of content ids. The client
 * updates optimistically, so we don't revalidate here — the next render reads
 * the persisted order from the DB.
 */
export async function setResourceOrderAction(
  slug: string,
  orderedContentIds: string[],
): Promise<void> {
  requireRep();
  if (!Array.isArray(orderedContentIds)) return;
  const room = getRoomBySlug(slug);
  if (!room) return;
  setResourceOrder(room.id, orderedContentIds);
}

/**
 * Override a resource's category for this room (rep-only). Validates against the
 * known category set; called programmatically from the client ContentManager.
 */
export async function setResourceCategoryAction(
  slug: string,
  contentId: string,
  category: string,
): Promise<void> {
  requireRep();
  if (!isKnownCategory(category)) return;
  const room = getRoomBySlug(slug);
  if (!room || !contentId) return;
  setResourceCategory(room.id, contentId, category);
}

/** Show/hide a resource (rep-only). Hidden resources are excluded for buyers. */
export async function toggleResourceHiddenAction(
  slug: string,
  contentId: string,
  hidden: boolean,
): Promise<void> {
  requireRep();
  const room = getRoomBySlug(slug);
  if (!room || !contentId) return;
  setResourceHidden(room.id, contentId, hidden);
}

/** Persist the per-room panel order (rep-only). Ignores unknown keys. */
export async function setSectionOrderAction(
  slug: string,
  keys: string[],
): Promise<void> {
  requireRep();
  if (!Array.isArray(keys)) return;
  const known = new Set<string>(SECTION_KEYS);
  const clean = keys.filter((k) => known.has(k));
  const room = getRoomBySlug(slug);
  if (!room || clean.length === 0) return;
  setSectionOrder(room.id, clean);
}

/** Reset the room's panel layout to the default order (rep-only). */
export async function resetSectionLayoutAction(slug: string): Promise<void> {
  requireRep();
  const room = getRoomBySlug(slug);
  if (!room) return;
  setSectionOrder(room.id, null);
}

/**
 * Add a rep note to a room (rep-only). The author is taken from the session — a
 * note is always attributed to the signed-in rep, never client-supplied. Returns
 * the persisted note (with server timestamp) so the drawer can show it instantly.
 */
export async function addNoteAction(
  slug: string,
  target: string,
  body: string,
): Promise<RoomNote | null> {
  const { user } = requireRep();
  const room = getRoomBySlug(slug);
  if (!room) return null;
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return null;
  return addNote({
    roomId: room.id,
    authorEmail: user.email,
    authorName: user.name,
    target: normalizeTarget(target),
    body: text,
  });
}

/** Delete a single rep note (rep-only). Optimistic; no revalidate. */
export async function deleteNoteAction(
  slug: string,
  noteId: number,
): Promise<void> {
  requireRep();
  const room = getRoomBySlug(slug);
  if (!room || typeof noteId !== "number") return;
  deleteNote(room.id, noteId);
}

/** Delete all rep notes for a room (rep-only) — the "Clear all" action. */
export async function clearNotesAction(slug: string): Promise<void> {
  requireRep();
  const room = getRoomBySlug(slug);
  if (!room) return;
  clearNotes(room.id);
}

export async function logoutAction(): Promise<void> {
  clearSession();
  redirect("/login");
}
