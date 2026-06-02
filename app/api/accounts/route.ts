import { getAuth } from "@/lib/session";
import { listAccounts } from "@/lib/crm";
import { json, error, toErrorResponse } from "@/lib/http";

/**
 * Server-side proxy for the CRM account list. Exists so the browser can fetch
 * accounts without ever seeing the CRM token (read from the httpOnly cookie here
 * and attached server-side). The seller picker reads CRM directly in a server
 * component; this route covers programmatic/client callers and tests.
 */
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
