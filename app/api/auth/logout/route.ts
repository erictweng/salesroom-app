import { clearSession } from "@/lib/session";
import { json } from "@/lib/http";

/** Clear the session cookie. POST (not GET) so it can't be triggered by a link/prefetch. */
export async function POST() {
  clearSession();
  return json({ ok: true });
}
