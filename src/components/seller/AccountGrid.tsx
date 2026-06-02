"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomAction } from "@/server/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardEntry } from "@/server/loaders";

type View = "grid" | "list";
type StatusFilter = "all" | "published" | "draft" | "none";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function statusOf(room: DashboardEntry["room"]): StatusFilter {
  if (!room) return "none";
  return room.status === "published" ? "published" : "draft";
}

/**
 * Account picker with search, a filter popover, and a grid/list view toggle.
 * Filters (industry, ICP minimum, room status, deal stage) tuck behind a filter
 * icon to keep the bar clean; an active-count badge shows when any are applied.
 * All filtering is client-side; the view preference is remembered per browser.
 */
export function AccountGrid({ entries }: { entries: DashboardEntry[] }) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("all");
  const [stage, setStage] = useState("all");
  const [icpMin, setIcpMin] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<View>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("accountView");
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Close the filter popover on outside click / Escape.
  useEffect(() => {
    if (!filtersOpen) return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  function chooseView(v: View) {
    setView(v);
    try {
      window.localStorage.setItem("accountView", v);
    } catch {
      /* ignore */
    }
  }

  const industries = useMemo(
    () => uniqueSorted(entries.map((e) => e.account.industry)),
    [entries],
  );
  const stages = useMemo(
    () => uniqueSorted(entries.map((e) => e.account.account_stage)),
    [entries],
  );

  const term = query.trim().toLowerCase();
  const filtered = entries.filter(({ account, room }) => {
    if (
      term &&
      !account.name.toLowerCase().includes(term) &&
      !(room?.slug ?? "").toLowerCase().includes(term)
    )
      return false;
    if (industry !== "all" && account.industry !== industry) return false;
    if (stage !== "all" && account.account_stage !== stage) return false;
    if ((account.icp_fit_score ?? 0) < icpMin) return false;
    if (status !== "all" && statusOf(room) !== status) return false;
    return true;
  });

  const activeCount =
    (industry !== "all" ? 1 : 0) +
    (stage !== "all" ? 1 : 0) +
    (icpMin > 0 ? 1 : 0) +
    (status !== "all" ? 1 : 0);

  function clearFilters() {
    setIndustry("all");
    setStage("all");
    setIcpMin(0);
    setStatus("all");
  }

  const selectClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts…"
          aria-label="Search accounts"
          className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:max-w-xs"
        />

        <div className="relative ml-auto" ref={popoverRef}>
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            aria-label="Filters"
            aria-expanded={filtersOpen}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition ${
              activeCount > 0 || filtersOpen
                ? "border-brand-400 bg-brand-50 text-brand-800"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FilterIcon />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Industry
                  </span>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All industries</option>
                    {industries.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Deal stage
                  </span>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All stages</option>
                    {stages.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Minimum ICP fit
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={icpMin === 0 ? "" : icpMin}
                      placeholder="0"
                      onChange={(e) =>
                        setIcpMin(
                          e.target.value === ""
                            ? 0
                            : Math.max(0, Math.min(100, Number(e.target.value))),
                        )
                      }
                      className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-500">
                      {icpMin > 0 ? `${icpMin}+` : "any"}
                    </span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Room status
                  </span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                    className={selectClass}
                  >
                    <option value="all">Any status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="none">No room</option>
                  </select>
                </label>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={clearFilters}
                    disabled={activeCount === 0}
                    className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
                  >
                    Clear filters
                  </button>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-md bg-brand-700 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-300 p-0.5">
          <ViewButton
            active={view === "grid"}
            onClick={() => chooseView("grid")}
            label="Grid view"
          >
            <GridIcon />
          </ViewButton>
          <ViewButton
            active={view === "list"}
            onClick={() => chooseView("list")}
            label="List view"
          >
            <ListIcon />
          </ViewButton>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        {filtered.length} of {entries.length} accounts
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No accounts match your filters.</p>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <AccountCard key={entry.account.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.map((entry) => (
            <AccountRow key={entry.account.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ room }: { room: DashboardEntry["room"] }) {
  if (!room) return <Badge tone="slate">No room</Badge>;
  return (
    <Badge tone={room.status === "published" ? "green" : "amber"}>
      {room.status === "published" ? "Published" : "Draft"}
    </Badge>
  );
}

function OpenButton({ entry }: { entry: DashboardEntry }) {
  // Synthetic demo accounts have no real CRM record, so they can't open a room.
  if (entry.account.id.startsWith("demo_")) {
    return (
      <button
        disabled
        title="Demo account (no CRM record) — for scale testing only"
        className="cursor-not-allowed rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400"
      >
        Demo account
      </button>
    );
  }
  return (
    <form action={createRoomAction}>
      <input type="hidden" name="account_id" value={entry.account.id} />
      <button className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
        {entry.room ? "Open room" : "Create room"}
      </button>
    </form>
  );
}

function AccountCard({ entry }: { entry: DashboardEntry }) {
  const { account } = entry;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900">
            {account.name}
          </h2>
          <p className="truncate text-sm text-slate-500">
            {account.industry} · {account.hq_location}
          </p>
        </div>
        <StatusBadge room={entry.room} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-400">Stage</dt>
        <dd className="text-right text-slate-700">{account.account_stage}</dd>
        <dt className="text-slate-400">Employees</dt>
        <dd className="text-right text-slate-700">
          {account.employee_count?.toLocaleString() ?? "—"}
        </dd>
        <dt className="text-slate-400">ICP fit</dt>
        <dd className="text-right font-medium text-slate-700">
          {account.icp_fit_score ?? "—"}
        </dd>
      </dl>

      <div className="mt-5">
        <OpenButton entry={entry} />
      </div>
    </Card>
  );
}

function AccountRow({ entry }: { entry: DashboardEntry }) {
  const { account } = entry;
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-900">
            {account.name}
          </span>
          <StatusBadge room={entry.room} />
        </div>
        <p className="truncate text-sm text-slate-500">
          {account.industry} · {account.account_stage}
        </p>
      </div>
      <div className="hidden text-right text-sm text-slate-500 sm:block">
        ICP {account.icp_fit_score ?? "—"}
      </div>
      <OpenButton entry={entry} />
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded p-1.5 transition ${
        active
          ? "bg-brand-100 text-brand-800"
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M1.5 3h13a.5.5 0 0 1 .4.8L10 10v3.2a.5.5 0 0 1-.7.46l-2-1A.5.5 0 0 1 7 12.2V10L1.1 3.8A.5.5 0 0 1 1.5 3z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="1" y="7" width="14" height="2" rx="1" />
      <rect x="1" y="12" width="14" height="2" rx="1" />
    </svg>
  );
}
