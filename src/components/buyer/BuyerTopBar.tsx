import { ShareButton } from "./ShareButton";

/**
 * Slim dark top bar above the buyer hero — the vendor (Secureframe) wordmark on
 * the left and a working Share button on the right (native share sheet, or
 * copy-the-room-link fallback), matching the design screenshots.
 */
export function BuyerTopBar() {
  return (
    <div className="buyer-topbar text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="text-base font-semibold lowercase tracking-tight">
          secureframe
        </span>
        <ShareButton />
      </div>
    </div>
  );
}
