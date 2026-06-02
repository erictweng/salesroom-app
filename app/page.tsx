import Link from "next/link";

/**
 * Public landing page with entry points into the two portals. Buyers normally
 * arrive via a direct room link (/room/[slug], P2); this is mainly a dev/demo
 * jumping-off point.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="brand-hero rounded-2xl px-8 py-12 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-200">
          Digital Sales Room
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Salesroom</h1>
        <p className="mt-4 max-w-xl text-brand-100">
          Curate everything a buyer needs in one branded room — and see exactly
          who consumed what.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/seller"
          className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-400 hover:shadow"
        >
          <h2 className="text-lg font-semibold">Seller Portal</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reps sign in, pick an account, and curate a room.
          </p>
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-400 hover:shadow"
        >
          <h2 className="text-lg font-semibold">Buyer Portal</h2>
          <p className="mt-1 text-sm text-slate-500">
            Buyers open the room link shared by their rep (/room/&lt;slug&gt;).
            Sign in here.
          </p>
        </Link>
      </div>
    </main>
  );
}
