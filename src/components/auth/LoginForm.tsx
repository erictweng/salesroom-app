"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_REPS, DEMO_BUYERS, DEMO_PASSWORD } from "@/lib/demoLogins";

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

      <div className="space-y-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          Demo accounts (password: {DEMO_PASSWORD})
        </p>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Reps · all accounts
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_REPS.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => {
                  setEmail(r.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 hover:border-brand-400"
              >
                {r.email}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Buyers · scoped to their account
          </p>
          <div className="flex flex-col gap-1">
            {DEMO_BUYERS.map((b) => (
              <button
                key={b.email}
                type="button"
                onClick={() => {
                  setEmail(b.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1 text-left hover:border-brand-400"
              >
                <span className="truncate">{b.email}</span>
                <span className="shrink-0 text-slate-400">{b.account}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Buyers sign in, then open their room link (e.g. <code>/room/&lt;slug&gt;</code>) —
            the rep copies it from the room&apos;s “Copy link.”
          </p>
        </div>
      </div>
    </form>
  );
}
