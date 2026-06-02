import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { HomeLanding } from "@/components/home/HomeLanding";

export const dynamic = "force-dynamic";

/**
 * Public landing + sign-in portal. Signed-in reps are sent straight to their
 * workspace; everyone else sees the product pitch with a sign-in tab. Buyers
 * reach their room via a direct link from their rep, not from here.
 */
export default function Home() {
  const user = getCurrentUser();
  if (user?.role === "rep") redirect("/seller");
  return <HomeLanding />;
}
