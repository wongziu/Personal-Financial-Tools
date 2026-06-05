import { describe, expect, test, vi } from "vitest";
import { defaultAppSettings } from "@/lib/app-settings";
import { analyzeResearchWithAi, buildResearchAnalysisPrompt, type ResearchAiDataset } from "@/lib/research-ai";

const dataset: ResearchAiDataset = {
  securities: [
    { id: "SEC-US-AAPL", name: "Apple Inc.", ticker: "AAPL", risk_theme_tags: "AI, consumer demand", industry_level_1: "InformationTechnology" }
  ],
  sources: [
    {
      id: "SRC-2026-001",
      security_id: "SEC-US-AAPL",
      evidence_level: "A",
      source_name: "Apple filing",
      information_date: "2026-06-01",
      key_facts: "Management raised AI infrastructure spending and reported stronger iPhone demand.",
      thesis_impact: "Support"
    }
  ],
  theses: [
    {
      id: "THS-2026-001",
      security_id: "SEC-US-AAPL",
      one_line_thesis: "AI services growth can defend premium margins.",
      status: "Active",
      invalidation_conditions: "Services growth decelerates for two quarters."
    }
  ],
  reviewEvents: [
    { id: "EVT-2026-001", security_id: "SEC-US-AAPL", event_type: "Earnings", expected_date: "2026-07-25", status: "Pending" }
  ],
  tradeDecisions: [
    { id: "DEC-2026-001", security_id: "SEC-US-AAPL", action: "Buy", final_decision: "Execute", risk_warnings: "[]" }
  ]
};

describe("research AI", () => {
  test("builds an auditable prompt from security, source, thesis, event, and decision context", () => {
    const prompt = buildResearchAnalysisPrompt({
      dataset,
      securityId: "SEC-US-AAPL",
      question: "Should I add exposure before earnings?"
    });

    expect(prompt).toContain("Apple Inc.");
    expect(prompt).toContain("Apple filing");
    expect(prompt).toContain("AI services growth can defend premium margins.");
    expect(prompt).toContain("Earnings");
    expect(prompt).toContain("DEC-2026-001");
    expect(prompt).toContain("Should I add exposure before earnings?");
    expect(prompt).toContain("strict JSON");
  });

  test("uses the configured model to return structured research analysis", async () => {
    process.env.RESEARCH_AI_TEST_KEY = "research-key";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "AAPL has supportive evidence but earnings timing risk remains.",
              evidenceHighlights: ["A-level filing supports demand and AI spend."],
              thesisImpact: "Current evidence supports the active thesis.",
              riskFlags: ["Earnings may reset guidance."],
              suggestedQuestions: ["What guidance metric would invalidate the thesis?"],
              nextActions: ["Review earnings event before adding exposure."]
            })
          }
        }
      ]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await analyzeResearchWithAi({
      settings: {
        ...defaultAppSettings,
        modelApi: {
          ...defaultAppSettings.modelApi,
          executionMode: "model",
          apiKeyEnvVar: "RESEARCH_AI_TEST_KEY",
          model: "openai:test-model@default"
        }
      },
      dataset,
      securityId: "SEC-US-AAPL",
      question: "Should I add exposure before earnings?",
      fetcher
    });

    expect(result.mode).toBe("model");
    expect(result.analysis.summary).toContain("supportive evidence");
    expect(result.analysis.evidenceHighlights).toHaveLength(1);
    expect(result.analysis.nextActions[0]).toContain("Review earnings");
  });
});

