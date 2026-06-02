"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_REPS = [
  "sarah.chen@salesroom.io",
  "marcus.thompson@salesroom.io",
];

/**
 * Client-side login form. It posts to the /api/auth/login route handler (rather
 * than a server action) because that handler is what sets the httpOnly session
 * cookie, and we want inline error feedback (wrong password, server down) plus a
 * role-aware client redirect after success. The CRM token is never handled here.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const { user } = await res.json();
        if (user?.role === "buyer") {
          // Buyers don't have a generic home — they open a room link from their rep.
          setNotice(
            "You're signed in. Buyers open the room link shared by your rep — there's no separate buyer home.",
          );
          setLoading(false);
          return;
        }
        router.push("/seller");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(
        res.status === 401
          ? "Incorrect email or password."
          : (body.error ?? "Sign in failed. Please try again."),
      );
    } catch {
      setError("Can't reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          placeholder="sarah.chen@salesroom.io"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          placeholder="demo1234"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <p className="font-medium text-slate-600">Demo reps (password: demo1234)</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {DEMO_REPS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setEmail(r);
                setPassword("demo1234");
              }}
              className="rounded border border-slate-200 bg-white px-2 py-0.5 hover:border-brand-400"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
