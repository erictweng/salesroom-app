import { Avatar } from "@/components/ui/Avatar";

/**
 * "Have a question?" rep card in the buyer hero. The CRM gives us the account
 * owner's name (and we derive their email); we don't have a photo or phone, so
 * we use an initials avatar and a Book-a-meeting mailto rather than fabricating
 * contact details.
 */
export function HaveAQuestion({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [first, ...rest] = name.split(/\s+/);

  return (
    <div className="w-full max-w-xs rounded-xl border border-white/20 bg-white/5 p-5 backdrop-blur">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-200">
        Have a question?
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar
          first={first}
          last={rest.join(" ")}
          className="h-10 w-10 bg-white/15 text-white"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{name}</p>
          <p className="text-xs text-brand-100">Senior Account Executive</p>
        </div>
      </div>
      <p className="mt-3 truncate text-xs text-brand-100">✉ {email}</p>
      <a
        href={`mailto:${email}`}
        className="mt-3 block rounded-md bg-white py-2 text-center text-sm font-medium text-brand-800 transition hover:bg-brand-50"
      >
        Book a meeting
      </a>
    </div>
  );
}
