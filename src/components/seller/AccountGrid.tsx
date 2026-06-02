"use client";

import { useState } from "react";
import { createRoomAction } from "@/server/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardEntry } from "@/server/loaders";

/**
 * Account picker with name search. The list is filtered client-side (instant, no
 * round-trip); search exists so the picker scales to many accounts/rooms. Each
 * card's button posts to createRoomAction (open-or-create, idempotent).
 */
export function AccountGrid({ entries }: { entries: DashboardEntry[] }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const filtered = term
    ? entries.filter(
        (e) =>
          e.account.name.toLowerCase().includes(term) ||
          (e.room?.slug ?? "").toLowerCase().includes(term),
      )
    : entries;

  return (
    <div>
      <div className="mb-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts…"
          aria-label="Search accounts"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No accounts match “{query}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ account, room }) => (
            <Card key={account.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {account.name}
                  </h2>
                  <p className="truncate text-sm text-slate-500">
                    {account.industry} · {account.hq_location}
                  </p>
                </div>
                {room ? (
                  <Badge tone={room.status === "published" ? "green" : "amber"}>
                    {room.status === "published" ? "Published" : "Draft"}
                  </Badge>
                ) : (
                  <Badge tone="slate">No room</Badge>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-400">Stage</dt>
                <dd className="text-right text-slate-700">
                  {account.account_stage}
                </dd>
                <dt className="text-slate-400">Employees</dt>
                <dd className="text-right text-slate-700">
                  {account.employee_count?.toLocaleString() ?? "—"}
                </dd>
                <dt className="text-slate-400">ICP fit</dt>
                <dd className="text-right font-medium text-slate-700">
                  {account.icp_fit_score ?? "—"}
                </dd>
              </dl>

              <form action={createRoomAction} className="mt-5">
                <input type="hidden" name="account_id" value={account.id} />
                <button className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
                  {room ? "Open room" : "Create room"}
                </button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
