import { describe, expect, test, vi } from "vitest";
import { defaultAppSettings } from "@/lib/app-settings";
import {
  buildResearchAgentStageMessages,
  researchAgentStages,
  runResearchAgentWorkflow
} from "@/lib/research-agent-workflow";
import type { ResearchAiDataset } from "@/lib/research-ai";

const dataset: ResearchAiDataset = {
  securities: [
    { id: "SEC-US-TSLA", name: "Tesla Inc.", ticker: "TSLA", asset_type: "Stock", market: "US", risk_theme_tags: "EV, margin pressure" }
  ],
  sources: [
    { id: "SRC-1", security_id: "SEC-US-TSLA", information_date: "2026-06-01", evidence_level: "B", source_name: "Internal note", thesis_impact: "Pending", key_facts: "Margins and delivery growth need review." }
  ],
  theses: [
    { id: "THS-1", security_id: "SEC-US-TSLA", status: "Active", one_line_thesis: "Deliveries can reaccelerate if pricing stabilizes.", invalidation_conditions: "Margins compress for two quarters." }
  ],
  reviewEvents: [
    { id: "REV-1", security_id: "SEC-US-TSLA", event_type: "Earnings", expected_date: "2026-07-20", importance: "High", status: "Pending" }
  ],
  tradeDecisions: [
    { id: "DEC-1", security_id: "SEC-US-TSLA", action: "Hold", final_decision: "Wait", status: "Draft", risk_warnings: "High volatility" }
  ]
};

function settings() {
  process.env.RESEARCH_AGENT_TEST_KEY = "test-key";
  return {
    ...defaultAppSettings,
    modelApi: {
      ...defaultAppSettings.modelApi,
      apiKeyEnvVar: "RESEARCH_AGENT_TEST_KEY",
      model: "openai:test-model@default"
    }
  };
}

describe("research agent workflow", () => {
  test("builds stage messages with local context and prior agent output", () => {
    const messages = buildResearchAgentStageMessages({
      stage: researchAgentStages[1],
      dataset,
      securityId: "SEC-US-TSLA",
      question: "Should we add exposure?",
      analysisMode: "decision-memo",
      priorStages: [
        {
          id: "evidence",
          title: "Evidence Agent",
          status: "completed",
          inputSummary: "sources=1",
          output: "Evidence is thin.",
          latencyMs: 12
        }
      ]
    });

    expect(messages[0].content).toContain("thesis reviewer");
    expect(messages[1].content).toContain("Tesla Inc.");
    expect(messages[1].content).toContain("Evidence is thin.");
    expect(messages[1].content).toContain("decision-memo");
  });

  test("runs the ordered agent workflow and preserves every stage output", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
      const stageLine = body.messages[1].content.match(/Now produce the (.+?) output\./)?.[1] ?? "Unknown Agent";
      return new Response(JSON.stringify({ choices: [{ message: { content: `${stageLine} completed.` } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    const result = await runResearchAgentWorkflow({
      settings: settings(),
      dataset,
      securityId: "SEC-US-TSLA",
      question: "Should we add exposure?",
      analysisMode: "risk-catalyst",
      fetcher
    });

    expect(result.mode).toBe("agent-workflow");
    expect(result.analysisMode).toBe("risk-catalyst");
    expect(result.context.sourceCount).toBe(1);
    expect(result.stages.map((stage) => stage.id)).toEqual(["evidence", "thesis", "risk", "decision", "critic"]);
    expect(result.stages.every((stage) => stage.status === "completed")).toBe(true);
    expect(result.finalSummary).toContain("Critic Agent completed");
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  test("returns a failed stage without inventing downstream output", async () => {
    const fetcher = vi.fn(async () => new Response("model unavailable", { status: 503 }));

    const result = await runResearchAgentWorkflow({
      settings: settings(),
      dataset,
      securityId: "SEC-US-TSLA",
      question: "Should we add exposure?",
      fetcher
    });

    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].status).toBe("failed");
    expect(result.finalSummary).toContain("Workflow stopped at Evidence Agent");
  });
});
