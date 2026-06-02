"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline login shown when an unauthenticated visitor opens a buyer room. On
 * success it calls router.refresh() so the same /room/[slug] server component
 * re-runs — now with a session — and renders the room (or the right notice).
 * Demo buyers are surfaced as quick-fill chips so the room is easy to evaluate.
 */
const DEMO_BUYERS = [
  "d.park@meridianrobotics.com",
  "p.sharma@velorahealth.com",
];

export function BuyerLoginPrompt({ slug }: { slug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
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
      setError("Can't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="brand-hero mb-6 rounded-xl px-6 py-8 text-white">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-200">
            Sales Room
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Sign in to view this room</h1>
          <p className="mt-2 text-sm text-brand-100">
            Use the email your account team invited you with.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" value={slug} readOnly />
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "View room"}
          </button>

          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Demo buyers (password: demo1234)</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {DEMO_BUYERS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setEmail(b);
                    setPassword("demo1234");
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 hover:border-brand-400"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
