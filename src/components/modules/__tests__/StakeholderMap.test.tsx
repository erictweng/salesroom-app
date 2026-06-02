import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StakeholderMap } from "../StakeholderMap";
import type { Contact } from "@/lib/types";

function contact(overrides: Partial<Contact>): Contact {
  return {
    id: "c1",
    account_id: "acc_x",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@doe.com",
    title: "VP of Engineering",
    role: "End User",
    seniority: "VP",
    phone: "",
    linkedin_url: "",
    last_activity_date: "2026-01-01T00:00:00Z",
    engagement_score: 50,
    is_primary: false,
    ...overrides,
  };
}

describe("StakeholderMap", () => {
  it("shows an empty state when there are no contacts", () => {
    render(<StakeholderMap contacts={[]} />);
    expect(screen.getByText(/no stakeholders/i)).toBeInTheDocument();
  });

  it("highlights the Champion and stars the primary contact", () => {
    const contacts = [
      contact({ id: "c1", role: "End User" }),
      contact({
        id: "c2",
        first_name: "Cara",
        role: "Champion",
        is_primary: true,
        engagement_score: 90,
      }),
    ];
    render(<StakeholderMap contacts={contacts} />);
    // "Champion" appears as the inline highlight badge and the role-column badge.
    expect(screen.getAllByText("Champion").length).toBeGreaterThan(0);
    expect(screen.getByText("★")).toBeInTheDocument();
  });

  it("renders fine when no Champion is present", () => {
    const contacts = [
      contact({ id: "c1", role: "End User" }),
      contact({ id: "c2", first_name: "Sam", role: "Economic Buyer" }),
    ];
    render(<StakeholderMap contacts={contacts} />);
    expect(screen.queryByText("Champion")).toBeNull();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("handles a null engagement score without crashing", () => {
    const contacts = [
      contact({ engagement_score: null as unknown as number }),
    ];
    render(<StakeholderMap contacts={contacts} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
