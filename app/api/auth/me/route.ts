import { getCurrentUser } from "@/lib/session";
import { json, error } from "@/lib/http";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return error("Not authenticated", 401);
  return json({ user });
}
