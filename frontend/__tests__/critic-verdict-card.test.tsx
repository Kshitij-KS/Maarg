import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CriticVerdictCard } from "@/components/critic-verdict-card";
import { getTraceTimeline } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getTraceTimeline: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("CriticVerdictCard", () => {
  it("shows a visible error when trace timeline loading fails", async () => {
    vi.mocked(getTraceTimeline).mockRejectedValue(new Error("trace offline"));

    renderWithClient(
      <CriticVerdictCard
        verdict="partial"
        reasoning="Some claims need review."
        traceId="tr-test"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /reasoning timeline/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /could not load reasoning timeline/i,
      );
    });
    expect(screen.getByText("trace offline")).toBeInTheDocument();
  });
});
