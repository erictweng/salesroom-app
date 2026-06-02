/**
 * Centralised, server-only environment configuration.
 * Importing this from client code will throw at build time because it reads
 * process.env values that are not prefixed with NEXT_PUBLIC_.
 */

export const env = {
  crmBaseUrl: (process.env.CRM_BASE_URL ?? "http://localhost:8080").replace(
    /\/+$/,
    "",
  ),
  sessionSecret:
    process.env.SESSION_SECRET ?? "local-dev-secret-please-change-32chars-min",
  databasePath: process.env.DATABASE_PATH ?? "./data/salesroom.db",
} as const;

/** Name of the httpOnly cookie that holds the CRM bearer token. */
export const SESSION_COOKIE = "sf_session";
