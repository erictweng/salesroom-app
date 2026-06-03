import type { Insights } from "@/lib/insights";

/**
 * Engagement analytics for the rep, tuned to the questions a rep actually has —
 * all dependency-free (inline SVG/CSS, no chart library):
 *   - "Is this warming or cooling?" → activity trend line over time
 *   - "Who / what specifically?"    → ranked people, category mix, top resources
 *
 * Renders nothing for a room with no engagement (the feed shows its own empty
 * state). Pure presentation of the precomputed `insights`.
 */
export function AnalyticsSummary({ insights }: { insights: Insights }) {
  if (insights.totalEvents === 0) return null;

  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Analytics</h3>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Activity over time" className="lg:col-span-2">
          <TrendLine days={insights.eventsByDay} />
        </Block>

        <Block title="Content category mix">
          <CategoryDonut data={insights.eventsByCategory} />
        </Block>

        <div className="grid grid-cols-2 gap-4">
          <Block title="Engagement by person">
            <RankedPeople people={insights.peopleEngagement} />
          </Block>
          <Block title="Top resources">
            <RankedResources resources={insights.topResources} />
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

/* --------------------------- activity over time ----------------------- */

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/**
 * Per-day line (with a soft area fill) — the slope reads as momentum. Drawn in a
 * fixed coordinate space scaled to full width via preserveAspectRatio="none"; the
 * stroke uses non-scaling-stroke so it stays crisp, and invisible per-day rects
 * carry hover tooltips. Day labels live in HTML below so they don't distort.
 */
function TrendLine({ days }: { days: Insights["eventsByDay"] }) {
  if (days.length === 0) return <Dash />;

  const W = 600;
  const H = 100;
  const PAD = 8;
  const n = days.length;
  const max = Math.max(1, ...days.map((d) => d.count));
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (count: number) => H - PAD - (count / max) * (H - 2 * PAD);

  const pts = days.map((d, i) => ({ x: x(i), y: y(d.count), ...d }));
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M ${pts[0].x},${H} ${pts
    .map((p) => `L ${p.x},${p.y}`)
    .join(" ")} L ${pts[n - 1].x},${H} Z`;
  const colW = n > 1 ? W / (n - 1) : W;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        aria-hidden
      >
        <path d={area} fill="#10b981" fillOpacity={0.12} />
        <polyline
          points={line}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {pts.map((p) => (
          <rect
            key={`hit-${p.date}`}
            x={Math.max(0, p.x - colW / 2)}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
          >
            <title>{`${p.date}: ${p.count} event${p.count === 1 ? "" : "s"}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {days.map((d) => (
          <span key={d.date} className="text-[10px] text-slate-400">
            {dayLabel(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- category donut -------------------------- */

const DONUT_COLORS = [
  "#059669", // brand-600
  "#10b981", // brand-500
  "#34d399", // brand-400
  "#6ee7b7", // brand-300
  "#a7f3d0", // brand-200
  "#94a3b8", // slate-400 (overflow)
];

/** Share of content engagement by category — a stage signal, not just volume. */
function CategoryDonut({ data }: { data: Insights["eventsByCategory"] }) {
  if (data.length === 0) return <Dash hint="No content engagement yet." />;

  const total = data.reduce((n, d) => n + d.count, 0);
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let acc = 0;
  const segments = data.map((d, i) => {
    const frac = total > 0 ? d.count / total : 0;
    const len = frac * circumference;
    const seg = {
      ...d,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dash: `${len} ${circumference - len}`,
      offset: -acc,
      pct: Math.round(frac * 100),
    };
    acc += len;
    return seg;
  });

  return (
    <div className="flex items-center gap-4">
      <svg
        width="104"
        height="104"
        viewBox="0 0 104 104"
        className="shrink-0 -rotate-90"
        aria-hidden
      >
        <circle cx="52" cy="52" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        {segments.map((s) => (
          <circle
            key={s.category}
            cx="52"
            cy="52"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="16"
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
          >
            <title>{`${s.category}: ${s.count} (${s.pct}%)`}</title>
          </circle>
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1 text-xs">
        {segments.map((s) => (
          <li key={s.category} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="truncate text-slate-600" title={s.category}>
              {s.category}
            </span>
            <span className="ml-auto tabular-nums text-slate-400">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------ ranked top-3 lists -------------------------- */

/** Top 3 people by engagement (event count), ranked. */
function RankedPeople({ people }: { people: Insights["peopleEngagement"] }) {
  const top = people.slice(0, 3);
  if (top.length === 0) return <Dash />;
  return (
    <ol className="space-y-1 text-xs text-slate-600">
      {top.map((p, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="w-3 shrink-0 tabular-nums text-slate-400">{i + 1}</span>
          <span className="truncate" title={p.name}>
            {p.name}
          </span>
          <span className="ml-auto tabular-nums text-slate-400">
            {p.eventCount}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Top 3 resources by engagement, ranked. */
function RankedResources({
  resources,
}: {
  resources: Insights["topResources"];
}) {
  const top = resources.slice(0, 3);
  if (top.length === 0) return <Dash />;
  return (
    <ol className="space-y-1 text-xs text-slate-600">
      {top.map((r, i) => (
        <li key={r.contentId} className="flex items-center gap-2">
          <span className="w-3 shrink-0 tabular-nums text-slate-400">{i + 1}</span>
          <span className="truncate" title={r.title}>
            {r.title}
          </span>
          <span className="ml-auto tabular-nums text-slate-400">
            {r.eventCount}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Dash({ hint }: { hint?: string }) {
  return <p className="text-xs text-slate-400">{hint ?? "—"}</p>;
}
