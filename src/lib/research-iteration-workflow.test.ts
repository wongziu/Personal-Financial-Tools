import { describe, expect, test, vi } from "vitest";
import { defaultAppSettings } from "@/lib/app-settings";
import { createDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import {
  listResearchIterationStrategyRuns,
  runResearchIterationCandidateActionWorkflow,
  runResearchIterationWorkflow,
  runResearchIterationWorkflowWithModel,
  selectResearchIterationCandidateAction
} from "@/lib/research-iteration-workflow";

function insertSecurity(database: ReturnType<typeof createDatabase>, id: string) {
  database.sqlite
    .prepare(
      `INSERT INTO securities (
        id, account_id, name, ticker, asset_type, market, currency,
        industry_level_1, industry_level_2, risk_theme_tags, liquidity_level,
        investment_status, benchmark, fee_note, complexity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      "ACC-US-001",
      id,
      id,
      "Stock",
      "US",
      "USD",
      "InformationTechnology",
      "Software",
      "[]",
      "High",
      "Allowed",
      "S&P 500",
      "N/A",
      "Simple"
    );
}

function insertSettledTrade(database: ReturnType<typeof createDatabase>, input: {
  id: string;
  securityId: string;
  type: "Buy" | "Sell";
  date: string;
  quantity: number;
}) {
  database.sqlite
    .prepare(
      `INSERT INTO transactions (
        id, order_id, trade_date, trade_time, account_id, security_id, strategy_type,
        thesis_id, decision_id, transaction_type, quantity, unit_price, gross_amount,
        commission, tax, other_fees, currency, fx_rate, base_currency_amount,
        status, data_source, correction_of_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.id,
      input.date,
      "15:00",
      "ACC-US-001",
      input.securityId,
      "Active",
      null,
      null,
      input.type,
      input.quantity,
      10,
      input.quantity * 10,
      0,
      0,
      0,
      "USD",
      7.2,
      input.quantity * 72,
      "Settled",
      "Test fill",
      null
    );
}

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

  test("defaults strategy workflow away from exited securities and exposes lifecycle buckets", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    insertSecurity(database, "US-EXITED");
    insertSecurity(database, "US-CANDIDATE");
    insertSettledTrade(database, { id: "TRD-EXIT-BUY", securityId: "US-EXITED", type: "Buy", date: "2026-01-01", quantity: 10 });
    insertSettledTrade(database, { id: "TRD-EXIT-SELL", securityId: "US-EXITED", type: "Sell", date: "2026-02-01", quantity: 10 });

    const defaultResult = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "US",
      question: "Run default research universe."
    });
    const exitedResult = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "US",
      universe: "exited",
      question: "Review exited securities."
    });

    expect(defaultResult.universe).toBe("active-research");
    expect(defaultResult.candidates.map((candidate) => candidate.securityId)).toContain("US-CANDIDATE");
    expect(defaultResult.candidates.map((candidate) => candidate.securityId)).not.toContain("US-EXITED");
    expect(defaultResult.candidates.every((candidate) => ["holding", "observed", "candidate"].includes(candidate.lifecycleBucket))).toBe(true);
    expect(exitedResult.universe).toBe("exited");
    expect(exitedResult.candidates.map((candidate) => candidate.securityId)).toEqual(["US-EXITED"]);
    expect(exitedResult.candidates[0].lifecycleBucket).toBe("exited");
    expect(exitedResult.candidates[0].recommendation).not.toBe("DraftDecision");
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

  test("calls the configured model to assess candidates with missing local evidence", async () => {
    process.env.RESEARCH_ITERATION_TEST_KEY = "research-key";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              searchStatus: "searched",
              summary: "模型检索到沪深300ETF仍需核对公告、指数跟踪误差和资金流数据。",
              judgement: "先补资料",
              suggestedAction: "补齐公告与指数数据后再判断是否加仓。",
              evidenceHighlights: [
                { source: "基金公告", finding: "需要查看基金公告" },
                { source: "指数数据", finding: "需要核对指数跟踪误差" }
              ],
              unresolvedGaps: ["缺少最近一次结构化复盘结论"],
              searchQueries: ["沪深300ETF 公告 跟踪误差 资金流"]
            })
          }
        }
      ]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const database = createDatabase(":memory:");
    seedDemoData(database);

    const result = await runResearchIterationWorkflowWithModel(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "A-Share",
      question: "Run the strategy and search missing evidence."
    }, {
      settings: {
        ...defaultAppSettings,
        modelApi: {
          ...defaultAppSettings.modelApi,
          executionMode: "model",
          apiKeyEnvVar: "RESEARCH_ITERATION_TEST_KEY",
          model: "openai:test-model@default"
        }
      },
      fetcher
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.stages.map((stage) => stage.id)).toContain("model-research");
    expect(result.finalSummary).toContain("模型研判");
    expect(result.candidates[0].securityId).toBe("CN-510300");
    expect(result.candidates[0].modelAssessment?.mode).toBe("model");
    expect(result.candidates[0].modelAssessment?.summary).toContain("沪深300ETF");
    expect(result.candidates[0].modelAssessment?.evidenceHighlights[0]).toContain("基金公告");
    expect(result.candidates[0].modelAssessment?.suggestedAction).toContain("补齐公告");

    const persistedCandidate = database.sqlite
      .prepare("SELECT model_assessment FROM strategy_candidates WHERE id = ?")
      .get(result.candidates[0].id) as { model_assessment: string | null };
    expect(persistedCandidate.model_assessment).toContain("沪深300ETF");

    const history = listResearchIterationStrategyRuns(database, { limit: 3 });
    expect(history[0].strategyRunId).toBe(result.strategyRunId);
    expect(history[0].candidates[0].modelAssessment?.suggestedAction).toContain("补齐公告");
    expect(history[0].candidates[0].actionStatus).toBe("Open");
  });

  test("records a selected next action route for a strategy candidate", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const result = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "US",
      question: "Run the strategy before choosing next action."
    });

    const updated = selectResearchIterationCandidateAction(database, {
      candidateId: result.candidates[0].id,
      actionRoute: "CollectEvidence",
      actionNote: "先查最近财报和风险提示，再决定是否进入论点。"
    });

    expect(updated.id).toBe(result.candidates[0].id);
    expect(updated.actionRoute).toBe("CollectEvidence");
    expect(updated.actionStatus).toBe("Selected");
    expect(updated.actionNote).toContain("最近财报");

    const history = listResearchIterationStrategyRuns(database, { limit: 1 });
    expect(history[0].candidates[0].actionRoute).toBe("CollectEvidence");
    expect(history[0].candidates[0].actionStatus).toBe("Selected");
    expect(history[0].candidates[0].actionNote).toContain("最近财报");
  });

  test("runs collect-evidence as an agent workflow and returns a source draft", async () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const result = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "US",
      question: "Run the strategy before collecting evidence."
    });

    const workflow = await runResearchIterationCandidateActionWorkflow(database, {
      candidateId: result.candidates[0].id,
      actionRoute: "CollectEvidence",
      actionNote: "自动补齐财报、公告和风险资料。"
    }, {
      settings: {
        ...defaultAppSettings,
        modelApi: {
          ...defaultAppSettings.modelApi,
          executionMode: "local"
        }
      }
    });

    expect(workflow.actionRoute).toBe("CollectEvidence");
    expect(workflow.runId).toMatch(/^AIRUN-/);
    expect(workflow.stages.map((stage) => stage.id)).toEqual(["action-route", "evidence-search", "source-draft", "handoff"]);
    expect(workflow.sourceDraft?.fields.sourceName).toBe("AI evidence workflow");
    expect(workflow.sourceDraft?.fields.keyFacts).toContain("Apple Inc.");
    expect(workflow.finalSummary).toContain("补资料工作流");
    expect(workflow.candidate.actionRoute).toBe("CollectEvidence");
    expect(workflow.candidate.actionNote).toContain("资料草稿");

    const persistedRun = database.sqlite
      .prepare("SELECT run_type, security_id, final_summary FROM research_agent_runs WHERE id = ?")
      .get(workflow.runId) as { run_type: string; security_id: string; final_summary: string };
    const stageCount = database.sqlite
      .prepare("SELECT COUNT(*) AS count FROM research_agent_stages WHERE run_id = ?")
      .get(workflow.runId) as { count: number };

    expect(persistedRun.run_type).toBe("candidate-action");
    expect(persistedRun.security_id).toBe("US-AAPL");
    expect(persistedRun.final_summary).toContain("补资料工作流");
    expect(stageCount.count).toBe(4);
  });

  test("runs model research during collect-evidence when the candidate lacks assessment", async () => {
    process.env.RESEARCH_ITERATION_TEST_KEY = "research-key";
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              searchStatus: "searched",
              summary: "模型搜索到 Apple 仍需核对最新 10-Q、服务业务增速和 AI Capex 风险。",
              judgement: "先补资料",
              suggestedAction: "先把 10-Q、业绩会和 Capex 风险整理成待确认资料。",
              evidenceHighlights: ["10-Q 待核对", "AI Capex 风险待确认"],
              unresolvedGaps: ["缺少结构化复盘"],
              searchQueries: ["Apple 10-Q AI Capex risk", "Apple services growth latest filing"]
            })
          }
        }
      ]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const result = runResearchIterationWorkflow(database, {
      triggerType: "strategy-run",
      strategyId: "STRAT-CORE-GROWTH",
      market: "US",
      question: "Run without model assessment."
    });

    const workflow = await runResearchIterationCandidateActionWorkflow(database, {
      candidateId: result.candidates[0].id,
      actionRoute: "CollectEvidence",
      actionNote: "点击补资料时主动搜索资料线索。"
    }, {
      settings: {
        ...defaultAppSettings,
        sourceIntelligence: {
          ...defaultAppSettings.sourceIntelligence,
          enabled: false
        },
        modelApi: {
          ...defaultAppSettings.modelApi,
          executionMode: "model",
          apiKeyEnvVar: "RESEARCH_ITERATION_TEST_KEY",
          model: "openai:test-model@default"
        }
      },
      fetcher
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(workflow.stages.find((stage) => stage.id === "evidence-search")?.output).toContain("Apple 10-Q AI Capex risk");
    expect(workflow.candidate.modelAssessment?.mode).toBe("model");
    expect(workflow.candidate.modelAssessment?.summary).toContain("Apple");

    const persistedCandidate = database.sqlite
      .prepare("SELECT model_assessment FROM strategy_candidates WHERE id = ?")
      .get(workflow.candidate.id) as { model_assessment: string | null };
    expect(persistedCandidate.model_assessment).toContain("10-Q");
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
