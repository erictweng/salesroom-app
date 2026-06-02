import { getAuth } from "@/lib/session";
import { loadBuyerRoom } from "@/server/loaders";
import { BuyerLoginPrompt } from "@/components/buyer/BuyerLoginPrompt";
import { RoomNotice } from "@/components/buyer/RoomNotice";
import { BuyerRoom } from "@/components/buyer/BuyerRoom";

export const dynamic = "force-dynamic";

/**
 * The public buyer entry point. Renders exactly one of four states:
 *   - no session            -> inline login prompt
 *   - draft room            -> "not published" notice
 *   - wrong account (403)   -> "not authorized" notice
 *   - published + authorized -> the room
 * Unknown slugs 404 inside loadBuyerRoom (notFound).
 */
export default async function BuyerRoomPage({
  params,
}: {
  params: { slug: string };
}) {
  const auth = getAuth();
  if (!auth) return <BuyerLoginPrompt slug={params.slug} />;

  const result = await loadBuyerRoom(params.slug, auth.token);

  if (result.status === "unpublished") return <RoomNotice variant="unpublished" />;
  if (result.status === "forbidden")
    return <RoomNotice variant="forbidden" user={auth.user} />;

  return (
    <BuyerRoom
      user={auth.user}
      account={result.account}
      room={result.room}
      resources={result.resources}
    />
  );
}
