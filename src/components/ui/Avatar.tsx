import { initials } from "@/lib/format";

export function Avatar({
  first,
  last,
  className = "",
}: {
  first?: string;
  last?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 ${className}`}
      aria-hidden
    >
      {initials(first, last)}
    </div>
  );
}
