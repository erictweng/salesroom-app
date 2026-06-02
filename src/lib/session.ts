/**
 * Session handling. The app stores the CRM bearer token in an httpOnly cookie so
 * it is never exposed to client-side JavaScript. Identity (name/email/role) is
 * derived by decoding the CRM JWT payload locally — no extra round-trip and no
 * need to know the CRM's signing secret, since we only ever store tokens we
 * ourselves just obtained from a successful login.
 */

import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { SESSION_COOKIE } from "./env";
import type { CrmUser, Role } from "./types";

const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day; CRM tokens are short-lived anyway.

export function setSession(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSession(): void {
  cookies().delete(SESSION_COOKIE);
}

export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

interface JwtClaims {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
}

/**
 * Decode the current user from the session cookie. Returns null when there is no
 * session or the token has expired (in which case the stale cookie is cleared).
 */
export function getCurrentUser(): CrmUser | null {
  const token = getSessionToken();
  if (!token) return null;

  let claims: JwtClaims;
  try {
    claims = decodeJwt(token) as JwtClaims;
  } catch {
    clearSession();
    return null;
  }

  if (claims.exp && claims.exp * 1000 <= Date.now()) {
    clearSession();
    return null;
  }
  if (!claims.email || !claims.role) return null;

  return {
    id: claims.sub ?? "",
    email: claims.email,
    name: claims.name ?? claims.email,
    role: claims.role as Role,
  };
}

/** Convenience: current user + their token together (both or neither). */
export function getAuth(): { user: CrmUser; token: string } | null {
  const token = getSessionToken();
  const user = getCurrentUser();
  if (!token || !user) return null;
  return { user, token };
}
