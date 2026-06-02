"use client";

import { useEffect, useRef, useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * Minimal branded sign-in landing (light theme, matching the rest of the app).
 * The only real job of `/` is to give a rep a place to sign in (buyers arrive via
 * a room link). A compact hero + a Sign in popover, with a slim footer.
 */
export function HomeLanding() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="buyer-topbar text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            secureframe{" "}
            <span className="font-normal text-brand-200">Salesroom</span>
          </span>
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              Sign in
            </button>
            {open && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
                <p className="mb-3 text-sm font-semibold text-slate-900">
                  Sign in to your workspace
                </p>
                <LoginForm />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(55% 70% at 80% 0%, rgba(16,185,129,0.10), transparent 60%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-5xl px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
            Digital Sales Room
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Close deals in a room,
            <br />
            <span className="text-brand-600">not an inbox.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            One branded room per account for the content, stakeholders, and deal
            context that move a deal — with real-time visibility into what the
            buyer engages with.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-8 rounded-md bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Sign in to get started →
          </button>
          <p className="mt-4 text-sm text-slate-400">
            Buyers: open the room link shared by your account team.
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs font-bold text-white">
              S
            </span>
            <span className="text-sm text-slate-500">
              Secureframe Salesroom — curate, share, and see what lands.
            </span>
          </div>
          <p className="text-xs text-slate-400">© 2026 Secureframe, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
