/**
 * Server-only CRM client.
 *
 * Wraps the local mock CRM binary (github.com/secureframe/salesroom-crm-servers).
 * IMPORTANT INVARIANTS:
 *   - This module must only ever run on the server. The CRM bearer token never
 *     reaches the browser; callers pass a token they read from the httpOnly
 *     session cookie.
 *   - The CRM is READ-ONLY for this app. The only non-GET call permitted here is
 *     POST /api/auth/login. All app mutations go to SQLite, never the CRM.
 */

import { env } from "./env";
import type {
  Account,
  Contact,
  Content,
  CrmUser,
  Enrichment,
  Opportunity,
} from "./types";

export interface LoginResult {
  token: string;
  user: CrmUser;
}

/**
 * A normalised error for everything that can go wrong talking to the CRM.
 * `status` is the HTTP status when we got a response; `connectionError` is true
 * when the CRM server could not be reached at all (e.g. :8080 not running).
 */
export class CrmError extends Error {
  status: number;
  connectionError: boolean;

  constructor(message: string, status: number, connectionError = false) {
    super(message);
    this.name = "CrmError";
    this.status = status;
    this.connectionError = connectionError;
  }
}

/** Low-level fetch against the CRM with consistent error handling. */
async function crmFetch(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<unknown> {
  const { token, headers, ...rest } = init;
  const url = `${env.crmBaseUrl}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      // CRM seed data is static for a given run; never cache stale auth results.
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (cause) {
    // fetch throws (ECONNREFUSED etc.) only when the server is unreachable.
    throw new CrmError(
      `Cannot reach the CRM server at ${env.crmBaseUrl}. Is the CRM binary running on its port? Start it, then retry.`,
      0,
      true,
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new CrmError(detail || `CRM request failed`, res.status);
  }

  // login/me/etc. always return JSON
  return res.json();
}

/**
 * Some CRM list endpoints wrap their array in a named key
 * (e.g. { accounts: [...] }); others may return a bare array. This unwraps
 * whichever form we get, defensively.
 */
function unwrapList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as any)[key])) {
    return (data as any)[key] as T[];
  }
  return [];
}

/* ----------------------------- auth ----------------------------- */

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const data = (await crmFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })) as LoginResult;
  return data;
}

export async function getMe(token: string): Promise<CrmUser> {
  const data = (await crmFetch("/api/auth/me", { token })) as
    | { user: CrmUser }
    | CrmUser;
  return "user" in (data as any) ? (data as any).user : (data as CrmUser);
}

/* --------------------------- accounts --------------------------- */

export async function listAccounts(token: string): Promise<Account[]> {
  return unwrapList<Account>(
    await crmFetch("/api/accounts", { token }),
    "accounts",
  );
}

export async function getAccount(token: string, id: string): Promise<Account> {
  const data = (await crmFetch(`/api/accounts/${id}`, { token })) as
    | { account: Account }
    | Account;
  return "account" in (data as any) ? (data as any).account : (data as Account);
}

export async function getAccountContacts(
  token: string,
  id: string,
): Promise<Contact[]> {
  return unwrapList<Contact>(
    await crmFetch(`/api/accounts/${id}/contacts`, { token }),
    "contacts",
  );
}

export async function getAccountOpportunities(
  token: string,
  id: string,
): Promise<Opportunity[]> {
  return unwrapList<Opportunity>(
    await crmFetch(`/api/accounts/${id}/opportunities`, { token }),
    "opportunities",
  );
}

export async function getAccountEnrichment(
  token: string,
  id: string,
): Promise<Enrichment | null> {
  try {
    return (await crmFetch(`/api/accounts/${id}/enrichment`, {
      token,
    })) as Enrichment;
  } catch (err) {
    // Enrichment may be absent for some accounts; degrade gracefully.
    if (err instanceof CrmError && err.status === 404) return null;
    throw err;
  }
}

/* --------------------------- content ---------------------------- */

export async function listContent(token: string): Promise<Content[]> {
  return unwrapList<Content>(
    await crmFetch("/api/content", { token }),
    "content",
  );
}

export async function getContent(token: string, id: string): Promise<Content> {
  const data = (await crmFetch(`/api/content/${id}`, { token })) as
    | { content: Content }
    | Content;
  return "content" in (data as any) ? (data as any).content : (data as Content);
}
