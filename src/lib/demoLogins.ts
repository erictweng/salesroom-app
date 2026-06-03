/**
 * Demo credentials surfaced as quick-fill chips on the sign-in forms so the app
 * is easy to evaluate. All demo users share one password. Buyers are scoped to a
 * single account by the CRM, so each is labeled with the account whose room they
 * can open. (These are the real seeded CRM logins.)
 */

export const DEMO_PASSWORD = "demo1234";

export const DEMO_REPS: { email: string; label: string }[] = [
  { email: "sarah.chen@salesroom.io", label: "Sarah Chen" },
  { email: "marcus.thompson@salesroom.io", label: "Marcus Thompson" },
];

export const DEMO_BUYERS: { email: string; account: string }[] = [
  { email: "d.park@meridianrobotics.com", account: "Meridian Robotics" },
  { email: "p.sharma@velorahealth.com", account: "Velora Health" },
  { email: "e.rodriguez@velorahealth.com", account: "Velora Health" },
];
