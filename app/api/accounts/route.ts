import { getAuth } from "@/lib/session";
import { listAccounts } from "@/lib/crm";
import { json, error, toErrorResponse } from "@/lib/http";

export async function GET() {
  const auth = getAuth();
  if (!auth) return error("Not authenticated", 401);

  try {
    const accounts = await listAccounts(auth.token);
    return json({ accounts });
  } catch (err) {
    return toErrorResponse(err);
  }
}
