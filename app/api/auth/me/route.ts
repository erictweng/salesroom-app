import { getCurrentUser } from "@/lib/session";
import { json, error } from "@/lib/http";

/** Current user identity, decoded from the session cookie (no CRM round-trip). */
export async function GET() {
  const user = getCurrentUser();
  if (!user) return error("Not authenticated", 401);
  return json({ user });
}
