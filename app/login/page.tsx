import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  // Already signed in? Skip the form.
  const user = getCurrentUser();
  if (user) redirect(user.role === "buyer" ? "/" : "/seller");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="brand-hero mb-6 rounded-xl px-6 py-8 text-white">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-200">
            Digital Sales Room
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            secureframe Salesroom
          </h1>
          <p className="mt-2 text-sm text-brand-100">
            Sign in to build and curate sales rooms.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
