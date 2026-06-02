import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// RoomNotice's forbidden variant uses a server action as a form action; mock the
// server module so importing it here doesn't pull in the server-only chain.
vi.mock("@/server/actions", () => ({ logoutAction: vi.fn() }));

import { RoomNotice } from "../RoomNotice";

describe("RoomNotice", () => {
  it("renders the not-published state", () => {
    render(<RoomNotice variant="unpublished" />);
    expect(screen.getByText(/isn't published yet/i)).toBeInTheDocument();
  });

  it("renders the not-authorized state with a sign-out option", () => {
    render(<RoomNotice variant="forbidden" />);
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
    expect(screen.getByText(/different user/i)).toBeInTheDocument();
  });
});
