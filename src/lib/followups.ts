/**
 * Maps the most-engaged content category to a templated, deterministic next step
 * for the rep. Kept tiny and rule-based (no LLM, per the non-goals) so the
 * suggestion is predictable and testable.
 */

const FOLLOWUPS: Record<string, string> = {
  "Custom Proposal":
    "They're digging into pricing and scope — send a tailored quote and offer to walk through it.",
  "Secureframe Overview & Our Team":
    "They're getting to know Secureframe — offer an intro call with the team.",
  "Product Demos":
    "They're watching demos — offer a live, tailored walkthrough with their team.",
  "Getting Started with Your Trial":
    "They're onboarding — check in to help them get set up and unblock the trial.",
  "Case Studies":
    "They're reading customer stories — connect them with a reference customer.",
  "Integration Documentation":
    "They're deep in technical setup — loop in a solutions engineer.",
};

const DEFAULT_FOLLOWUP =
  "Follow up on their recent activity to keep the deal moving.";

export function followUpForCategory(category?: string | null): string {
  if (!category) return DEFAULT_FOLLOWUP;
  return FOLLOWUPS[category] ?? DEFAULT_FOLLOWUP;
}
