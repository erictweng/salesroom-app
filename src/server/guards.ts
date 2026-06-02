import "server-only";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/session";
import type { CrmUser } from "@/lib/types";

/** Require any authenticated user. Redirects to /login when there is no session. */
export function requireAuth(): { user: CrmUser; token: string } {
  const auth = getAuth();
  if (!auth) redirect("/login");
  return auth;
}

/**
 * Require a sales rep. No session -> /login; wrong role -> /forbidden (a
 * friendly "this is the rep workspace" page, not a login bounce). Called at the
 * top of every seller page/action BEFORE any CRM call, so a buyer's request
 * never reaches the CRM with the wrong scope.
 */
export function requireRep(): { user: CrmUser; token: string } {
  const auth = requireAuth();
  if (auth.user.role !== "rep") redirect("/forbidden");
  return auth;
}
