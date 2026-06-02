import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AccountSnapshot } from "../AccountSnapshot";
import type { Account, Enrichment } from "@/lib/types";

const baseAccount: Account = {
  id: "acc_x",
  name: "Test Co",
  domain: "test.co",
  industry: "Technology",
  employee_count: 100,
  annual_revenue: "$10M",
  hq_location: "New York, NY",
  account_stage: "Active Opportunity",
  account_owner: "Sarah Chen",
  tech_stack: ["AWS", "React"],
  recent_news: "Raised a Series C round",
  icp_fit_score: 80,
  created_at: "2025-01-01T00:00:00Z",
};

describe("AccountSnapshot", () => {
  it("renders core account fields", () => {
    render(<AccountSnapshot account={baseAccount} enrichment={null} />);
    expect(screen.getByText("test.co")).toBeInTheDocument();
    expect(screen.getByText("$10M")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
  });

  it("shows a graceful message when enrichment is null", () => {
    render(<AccountSnapshot account={baseAccount} enrichment={null} />);
    expect(screen.getByText(/no enrichment data/i)).toBeInTheDocument();
  });

  it('renders "—" for missing/blank fields without crashing', () => {
    const sparse: Account = {
      ...baseAccount,
      industry: "",
      annual_revenue: "",
      hq_location: "",
      tech_stack: [],
    };
    render(<AccountSnapshot account={sparse} enrichment={null} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders enrichment chips when present", () => {
    const enrichment: Enrichment = {
      account_id: "acc_x",
      technologies: ["Azure"],
      compliance_frameworks: ["HIPAA"],
      funding_stage: "Series D",
      hiring_signals: ["VP of Security"],
      web_traffic_trend: "Growing",
      social_presence: { linkedin: 1000 },
    };
    render(<AccountSnapshot account={baseAccount} enrichment={enrichment} />);
    expect(screen.getByText("HIPAA")).toBeInTheDocument();
    expect(screen.getByText("Series D")).toBeInTheDocument();
    expect(screen.getByText("Azure")).toBeInTheDocument();
  });
});
