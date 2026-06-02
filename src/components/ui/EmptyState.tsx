import type { ReactNode } from "react";

/**
 * Placeholder shown when a module has no data (fresh room, no enrichment, no
 * events). Centralized so every empty surface reads consistently instead of each
 * module inventing its own "nothing here" markup.
 */
export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center">
      {icon && <div className="mb-2 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
