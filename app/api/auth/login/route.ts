import { NextRequest } from "next/server";
import { login } from "@/lib/crm";
import { setSession } from "@/lib/session";
import { json, error, toErrorResponse } from "@/lib/http";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };
  if (typeof email !== "string" || typeof password !== "string") {
    return error("email and password are required", 400);
  }

  try {
    const result = await login(email, password);
    // Store the CRM token in an httpOnly cookie — never returned to the browser.
    setSession(result.token);
    return json({ user: result.user });
  } catch (err) {
    return toErrorResponse(err);
  }
}
