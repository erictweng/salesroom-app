/** Small helpers for consistent JSON responses in route handlers. */

import { NextResponse } from "next/server";
import { CrmError } from "./crm";

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400, extra?: object): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Map a thrown error to a sensible HTTP response. CRM connection failures become
 * 503 with a retry hint; CRM HTTP errors are passed through with their status;
 * everything else is a 500.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof CrmError) {
    if (err.connectionError) {
      return error(err.message, 503, { retry: true });
    }
    return error(err.message, err.status || 502);
  }
  console.error("Unhandled route error:", err);
  return error("Internal server error", 500);
}
