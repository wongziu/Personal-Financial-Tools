import { describe, expect, test } from "vitest";
import { createDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import { runResearchIterationWorkflow } from "@/lib/research-iteration-workflow";

describe("research AI iteration workflow", () => {
  test("runs a strategy workflow and persists the run, stages, and candidates", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const result = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      question: "Run the strategy against local securities."
    });

    expect(result.triggerType).toBe("strategy-run");
    expect(result.runId).toMatch(/^AIRUN-/);
    expect(result.strategyRunId).toMatch(/^SRUN-/);
    expect(result.stages.map((stage) => stage.id)).toEqual(["constraint", "data-coverage", "screening", "guardrail", "critic"]);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].fitScore).toBeGreaterThan(0);
    expect(result.candidates[0].missingEvidence.length).toBeGreaterThan(0);

    const persistedRun = database.sqlite
      .prepare("SELECT run_type, strategy_id, status FROM research_agent_runs WHERE id = ?")
      .get(result.runId) as { run_type: string; strategy_id: string; status: string };
    const stageCount = database.sqlite
      .prepare("SELECT COUNT(*) AS count FROM research_agent_stages WHERE run_id = ?")
      .get(result.runId) as { count: number };
    const candidateCount = database.sqlite
      .prepare("SELECT COUNT(*) AS count FROM strategy_candidates WHERE strategy_run_id = ?")
      .get(result.strategyRunId) as { count: number };

    expect(persistedRun).toEqual({ run_type: "strategy-run", strategy_id: "STRAT-CORE-GROWTH", status: "completed" });
    expect(stageCount.count).toBe(5);
    expect(candidateCount.count).toBe(result.candidates.length);
  });

  test("limits strategy workflow candidates to the selected market", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    database.sqlite
      .prepare(
        `INSERT INTO securities (
          id, account_id, name, ticker, asset_type, market, currency,
          industry_level_1, industry_level_2, risk_theme_tags, liquidity_level,
          investment_status, benchmark, fee_note, complexity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "HK-00700",
        "ACC-US-001",
        "Tencent Holdings",
        "00700",
        "Stock",
        "HK",
        "HKD",
        "CommunicationServices",
        "InternetPlatforms",
        JSON.stringify(["China Internet"]),
        "High",
        "Allowed",
        "Hang Seng Tech",
        "N/A",
        "Simple"
      );

    const usResult = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "US",
      question: "Run the strategy against US securities."
    });
    const hkResult = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "HK",
      question: "Run the strategy against HK securities."
    });
    const aShareResult = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "A-Share",
      question: "Run the strategy against A-share securities."
    });

    expect(usResult.market).toBe("US");
    expect(usResult.candidates.map((candidate) => candidate.securityId)).toEqual(["US-AAPL"]);
    expect(hkResult.market).toBe("HK");
    expect(hkResult.candidates.map((candidate) => candidate.securityId)).toEqual(["HK-00700"]);
    expect(aShareResult.market).toBe("A-Share");
    expect(aShareResult.candidates.map((candidate) => candidate.securityId)).toEqual(["CN-510300"]);
  });

  test("runs a target diagnosis workflow for a selected security", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const result = runResearchIterationWorkflow(database, {
      triggerType: "target-diagnosis",
      securityId: "US-AAPL",
      question: "Diagnose Apple across available strategies."
    });

    expect(result.triggerType).toBe("target-diagnosis");
    expect(result.securityId).toBe("US-AAPL");
    expect(result.stages.map((stage) => stage.id)).toEqual(["profile", "strategy-lens", "guardrail", "decision-memo"]);
    expect(result.finalSummary).toContain("Apple Inc.");

    const persistedRun = database.sqlite
      .prepare("SELECT run_type, security_id, final_summary FROM research_agent_runs WHERE id = ?")
      .get(result.runId) as { run_type: string; security_id: string; final_summary: string };

    expect(persistedRun.run_type).toBe("target-diagnosis");
    expect(persistedRun.security_id).toBe("US-AAPL");
    expect(persistedRun.final_summary).toContain("Apple Inc.");
  });

  test("runs a review workflow and persists review sessions and findings", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const result = runResearchIterationWorkflow(database, {
      triggerType: "review-session",
      question: "Review the latest research and decision discipline."
    });

    expect(result.triggerType).toBe("review-session");
    expect(result.reviewSessionId).toMatch(/^REVW-/);
    expect(result.reviewFindings.length).toBeGreaterThan(0);
    expect(result.stages.map((stage) => stage.id)).toEqual(["outcome", "thesis-review", "discipline", "strategy-revision"]);

    const reviewSession = database.sqlite
      .prepare("SELECT scope, status, created_agent_run_id FROM review_sessions WHERE id = ?")
      .get(result.reviewSessionId) as { scope: string; status: string; created_agent_run_id: string };
    const findingCount = database.sqlite
      .prepare("SELECT COUNT(*) AS count FROM review_findings WHERE review_session_id = ?")
      .get(result.reviewSessionId) as { count: number };

    expect(reviewSession.scope).toBe("本周研究复盘");
    expect(reviewSession.status).toBe("Draft");
    expect(reviewSession.created_agent_run_id).toBe(result.runId);
    expect(findingCount.count).toBe(result.reviewFindings.length);
  });
});
