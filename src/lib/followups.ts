/**
 * Maps the most-engaged content category to a templated, deterministic next step
 * for the rep. Kept tiny and rule-based (no LLM, per the non-goals) so the
 * suggestion is predictable and testable.
 */

const FOLLOWUPS: Record<string, string> = {
  Pricing:
    "They're digging into pricing — send a tailored quote and offer to walk through it.",
  Security:
    "Security is top of mind — share your SOC 2 report or offer a security review.",
  "Product Demo":
    "They're watching demos — offer a live, tailored walkthrough with their team.",
  "Customer Story":
    "They're reading customer stories — connect them with a reference customer.",
  "Technical Overview":
    "They're deep in technical evaluation — loop in a solutions engineer.",
};

const DEFAULT_FOLLOWUP =
  "Follow up on their recent activity to keep the deal moving.";

export function followUpForCategory(category?: string | null): string {
  if (!category) return DEFAULT_FOLLOWUP;
  return FOLLOWUPS[category] ?? DEFAULT_FOLLOWUP;
}
