import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import mockTheme from "../../../__mocks__/themeMock";
import WorkflowCard from "../WorkflowCard";
import type { Workflow } from "../../../stores/ApiTypes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const workflow = {
  id: "wf-1",
  name: "AI Spokesperson",
  description: "Make a presenter say things.",
  tags: ["example"],
  graph: { nodes: [], edges: [] },
  access: "public",
  created_at: "2024-01-01",
  updated_at: "2024-01-01"
} as unknown as Workflow;

const renderCard = (extra: Partial<React.ComponentProps<typeof WorkflowCard>> = {}) =>
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={mockTheme}>
        <WorkflowCard
          workflow={workflow}
          matchedNodes={[]}
          nodesOnlySearch={false}
          isLoading={false}
          onClick={() => {}}
          {...extra}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );

describe("WorkflowCard displayName", () => {
  it("renders workflow.name by default", () => {
    renderCard();
    expect(screen.getByText("AI Spokesperson")).toBeInTheDocument();
  });

  it("renders displayName instead of workflow.name when provided", () => {
    renderCard({ displayName: "AI 数字人口播" });
    expect(screen.getByText("AI 数字人口播")).toBeInTheDocument();
    expect(screen.queryByText("AI Spokesperson")).not.toBeInTheDocument();
  });

  it("renders displayDescription instead of workflow.description when provided", () => {
    renderCard({ displayDescription: "让数字人开口说话。" });
    expect(screen.getByText("让数字人开口说话。")).toBeInTheDocument();
    expect(
      screen.queryByText("Make a presenter say things.")
    ).not.toBeInTheDocument();
  });
});
