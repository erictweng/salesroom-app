import { clearSession } from "@/lib/session";
import { json } from "@/lib/http";

export async function POST() {
  clearSession();
  return json({ ok: true });
}
