/**
 * Slim dark top bar above the buyer hero — the vendor (Secureframe) wordmark on
 * the left and a Share affordance on the right, matching the design screenshots.
 * Share is presentational (buyers receive a direct room link from their rep).
 */
export function BuyerTopBar() {
  return (
    <div className="buyer-topbar text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="text-base font-semibold lowercase tracking-tight">
          secureframe
        </span>
        <span className="text-sm text-white/70">Share ↗</span>
      </div>
    </div>
  );
}
