import type { DatabaseContext } from "@/lib/db/client";
import { nextBusinessId, type Row } from "@/lib/services";
import {
  getSecurityLifecycleMap,
  normalizeSecurityLifecycleUniverse,
  securityLifecycleLabels,
  securityLifecycleMatchesUniverse,
  securityLifecycleUniverseLabels,
  type SecurityLifecycleBucket,
  type SecurityLifecycleEntry,
  type SecurityLifecycleUniverse
} from "@/lib/security-lifecycle";

export type ResearchIterationTriggerType = "strategy-run" | "target-diagnosis" | "review-session";
export type ResearchIterationMarket = "all" | "A-Share" | "HK" | "US";
export type ResearchIterationUniverse = SecurityLifecycleUniverse;

const researchIterationMarkets: ResearchIterationMarket[] = ["all", "A-Share", "HK", "US"];

export interface ResearchIterationWorkflowInput {
  triggerType: ResearchIterationTriggerType;
  strategyId?: string;
  securityId?: string;
  market?: ResearchIterationMarket;
  universe?: ResearchIterationUniverse;
  question?: string;
}

export interface ResearchIterationStage {
  id: string;
  title: string;
  status: "completed";
  inputSummary: string;
  output: string;
  latencyMs: number;
}

export interface ResearchIterationCandidate {
  id: string;
  securityId: string;
  securityName: string;
  lifecycleBucket: SecurityLifecycleBucket;
  rank: number;
  fitScore: number;
  recommendation: "Observe" | "CollectEvidence" | "CreateThesis" | "DraftDecision" | "Skip";
  matchedRules: string[];
  missingEvidence: string[];
  riskFlags: string[];
  nextAction: string;
}

export interface ResearchIterationFinding {
  id: string;
  findingType: "Outcome" | "Thesis" | "Discipline" | "Strategy" | "DataGap";
  severity: "Info" | "Warning" | "Critical";
  finding: string;
  nextAction: string;
}

export interface ResearchIterationWorkflowResult {
  triggerType: ResearchIterationTriggerType;
  runId: string;
  strategyId?: string;
  strategyVersionId?: string;
  strategyRunId?: string;
  securityId?: string;
  market?: ResearchIterationMarket;
  universe?: ResearchIterationUniverse;
  reviewSessionId?: string;
  finalSummary: string;
  stages: ResearchIterationStage[];
  candidates: ResearchIterationCandidate[];
  reviewFindings: ResearchIterationFinding[];
}

const localWorkflowModel = "local-structured-workflow";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function stringValue(value: unknown, fallback = ""): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as unknown[]).map(String);
    } catch {
      return [];
    }
  }

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonText(items: string[]): string {
  return JSON.stringify(items);
}

export function normalizeResearchIterationMarket(value: unknown): ResearchIterationMarket {
  return researchIterationMarkets.includes(value as ResearchIterationMarket) ? value as ResearchIterationMarket : "all";
}

export { normalizeSecurityLifecycleUniverse as normalizeResearchIterationUniverse };

function marketLabel(market: ResearchIterationMarket): string {
  const labels: Record<ResearchIterationMarket, string> = {
    all: "全部市场",
    "A-Share": "A股",
    HK: "港股",
    US: "美股"
  };
  return labels[market];
}

function universeLabel(universe: ResearchIterationUniverse): string {
  return securityLifecycleUniverseLabels[universe].zh;
}

function firstRow(database: DatabaseContext, sql: string, ...params: unknown[]): Row | undefined {
  return database.sqlite.prepare(sql).get(...params) as Row | undefined;
}

function allRows(database: DatabaseContext, sql: string, ...params: unknown[]): Row[] {
  return database.sqlite.prepare(sql).all(...params) as Row[];
}

function latestActiveStrategy(database: DatabaseContext, strategyId?: string): Row {
  const strategy = strategyId
    ? firstRow(database, "SELECT * FROM strategies WHERE id = ?", strategyId)
    : firstRow(database, "SELECT * FROM strategies WHERE status = 'Active' ORDER BY rowid DESC LIMIT 1");

  if (!strategy) {
    throw new Error("No active strategy is available for the research workflow.");
  }

  return strategy;
}

function latestStrategyVersion(database: DatabaseContext, strategyId: string): Row | undefined {
  return firstRow(
    database,
    "SELECT * FROM strategy_versions WHERE strategy_id = ? AND status = 'Active' ORDER BY effective_date DESC, rowid DESC LIMIT 1",
    strategyId
  );
}

function sourceRows(database: DatabaseContext, securityId: string): Row[] {
  return allRows(database, "SELECT * FROM information_sources WHERE security_id = ? ORDER BY information_date DESC, rowid DESC", securityId);
}

function thesisRows(database: DatabaseContext, securityId: string): Row[] {
  return allRows(database, "SELECT * FROM theses WHERE security_id = ? ORDER BY rowid DESC", securityId);
}

function decisionRows(database: DatabaseContext, securityId: string): Row[] {
  return allRows(database, "SELECT * FROM trade_decisions WHERE security_id = ? ORDER BY rowid DESC", securityId);
}

function securitiesForMarket(database: DatabaseContext, market: ResearchIterationMarket): Row[] {
  if (market === "all") {
    return allRows(database, "SELECT * FROM securities ORDER BY rowid DESC");
  }

  return allRows(database, "SELECT * FROM securities WHERE market = ? ORDER BY rowid DESC", market);
}

function insertRun(database: DatabaseContext, input: {
  triggerType: ResearchIterationTriggerType;
  strategyId?: string;
  strategyVersionId?: string;
  securityId?: string;
  reviewSessionId?: string;
  question: string;
  finalSummary: string;
}): string {
  const runId = nextBusinessId(database, "AIRUN");
  database.sqlite
    .prepare(
      `INSERT INTO research_agent_runs (
        id, run_type, run_date, security_id, strategy_id, strategy_version_id,
        review_session_id, question, model, status, final_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      runId,
      input.triggerType,
      today(),
      input.securityId ?? null,
      input.strategyId ?? null,
      input.strategyVersionId ?? null,
      input.reviewSessionId ?? null,
      input.question,
      localWorkflowModel,
      "completed",
      input.finalSummary
    );
  return runId;
}

function insertStages(database: DatabaseContext, runId: string, stages: ResearchIterationStage[]): void {
  const statement = database.sqlite.prepare(
    `INSERT INTO research_agent_stages (
      id, run_id, stage_order, stage_id, title, status, input_summary, output, latency_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stages.forEach((stage, index) => {
    statement.run(
      nextBusinessId(database, "ASTG"),
      runId,
      index + 1,
      stage.id,
      stage.title,
      stage.status,
      stage.inputSummary,
      stage.output,
      stage.latencyMs
    );
  });
}

function buildCandidate(database: DatabaseContext, security: Row, lifecycle: SecurityLifecycleEntry, rankSeed: number): Omit<ResearchIterationCandidate, "id" | "rank"> {
  const securityId = String(security.id);
  const sources = sourceRows(database, securityId);
  const theses = thesisRows(database, securityId);
  const decisions = decisionRows(database, securityId);
  const riskThemes = parseStringArray(security.risk_theme_tags);
  const isAllowed = String(security.investment_status) !== "Prohibited" && lifecycle.bucket !== "blocked";
  const canDraftDecision = String(security.investment_status) === "Allowed" && lifecycle.bucket !== "exited";
  const evidenceScore = Math.min(sources.length, 3) * 15;
  const thesisScore = Math.min(theses.length, 2) * 12;
  const decisionPenalty = decisions.some((decision) => Number(decision.touches_limits ?? 0) === 1) ? 12 : 0;
  const lifecycleScore: Record<SecurityLifecycleBucket, number> = {
    holding: 10,
    observed: 8,
    candidate: 5,
    exited: -18,
    blocked: -40
  };
  const fitScore = Math.max(0, Math.min(100, 45 + evidenceScore + thesisScore - decisionPenalty + (isAllowed ? 8 : -25) + lifecycleScore[lifecycle.bucket] - rankSeed));
  const missingEvidence = [
    sources.length === 0 ? "缺少 A/B 级本地信息来源" : "",
    theses.length === 0 ? "缺少已确认投资论点" : "",
    "缺少最近一次结构化复盘结论"
  ].filter(Boolean);
  const riskFlags = [
    ...riskThemes.slice(0, 2).map((theme) => `风险主题：${theme}`),
    decisionPenalty > 0 ? "历史决策触及风险限制，需要先复核仓位" : "",
    lifecycle.bucket === "exited" ? "该标的已退出，本轮仅用于复盘或重新观察" : "",
    !isAllowed ? "标的当前不是可研究状态" : ""
  ].filter(Boolean);
  const recommendation: ResearchIterationCandidate["recommendation"] =
    !isAllowed ? "Skip" : lifecycle.bucket === "exited" ? "Observe" : sources.length === 0 ? "CollectEvidence" : theses.length === 0 ? "CreateThesis" : canDraftDecision ? "DraftDecision" : "Observe";

  return {
    securityId,
    securityName: String(security.name),
    lifecycleBucket: lifecycle.bucket,
    fitScore,
    recommendation,
    matchedRules: [
      `市场=${stringValue(security.market, "N/A")}`,
      `分层=${securityLifecycleLabels[lifecycle.bucket].zh}`,
      `流动性=${stringValue(security.liquidity_level, "N/A")}`,
      sources.length > 0 ? `证据数=${sources.length}` : "证据数=0",
      theses.length > 0 ? `论点数=${theses.length}` : "论点数=0"
    ],
    missingEvidence,
    riskFlags,
    nextAction:
      recommendation === "DraftDecision"
        ? "生成交易决策草案前先确认仓位上限、失效条件和下次复核日期。"
        : lifecycle.bucket === "exited"
          ? "先复盘退出原因和当前证据变化，只能在重新确认论点后进入观察或决策。"
        : recommendation === "CreateThesis"
          ? "先建立投资论点，明确进入、退出和失效条件。"
          : recommendation === "CollectEvidence"
            ? "先补充公告、财报或行业数据来源，不进入交易决策。"
            : "跳过该标的，除非投资状态和风险约束被重新确认。"
  };
}

function runStrategyWorkflow(database: DatabaseContext, input: ResearchIterationWorkflowInput): ResearchIterationWorkflowResult {
  const strategy = latestActiveStrategy(database, input.strategyId);
  const strategyId = String(strategy.id);
  const strategyVersion = latestStrategyVersion(database, strategyId);
  const strategyVersionId = strategyVersion ? String(strategyVersion.id) : undefined;
  const market = normalizeResearchIterationMarket(input.market);
  const universe = normalizeSecurityLifecycleUniverse(input.universe);
  const marketName = marketLabel(market);
  const universeName = universeLabel(universe);
  const lifecycleById = getSecurityLifecycleMap(database);
  const securities = securitiesForMarket(database, market).filter((security) => {
    const lifecycle = lifecycleById.get(String(security.id));
    return lifecycle ? securityLifecycleMatchesUniverse(lifecycle.bucket, universe) : false;
  });
  const rawCandidates = securities
    .map((security, index) => buildCandidate(database, security, lifecycleById.get(String(security.id))!, index))
    .sort((left, right) => right.fitScore - left.fitScore);
  const finalSummary = `策略「${String(strategy.name)}」完成${marketName} / ${universeName}候选筛选：${rawCandidates.length} 个候选，${rawCandidates.filter((candidate) => candidate.recommendation === "DraftDecision").length} 个可进入决策草案前检查。`;
  const stages: ResearchIterationStage[] = [
    {
      id: "constraint",
      title: "约束 Agent",
      status: "completed",
      inputSummary: `strategy=${strategyId}; version=${strategyVersionId ?? "N/A"}; market=${market}; universe=${universe}`,
      output: `风险预算：${String(strategy.risk_budget)}；复盘频率：${String(strategy.review_cadence)}。`,
      latencyMs: 0
    },
    {
      id: "data-coverage",
      title: "数据覆盖 Agent",
      status: "completed",
      inputSummary: `market=${market}; universe=${universe}; securities=${securities.length}`,
      output: `${marketName} / ${universeName}包含 ${securities.length} 个标的；缺失证据会写入候选卡片，不用模型输出替代事实。`,
      latencyMs: 0
    },
    {
      id: "screening",
      title: "筛选 Agent",
      status: "completed",
      inputSummary: `candidates=${rawCandidates.length}`,
      output: `候选按证据、论点、投资状态和历史风控信号排序。最高适配分为 ${rawCandidates[0]?.fitScore ?? 0}。`,
      latencyMs: 0
    },
    {
      id: "guardrail",
      title: "组合护栏 Agent",
      status: "completed",
      inputSummary: `strategy=${strategyId}`,
      output: "任何候选进入交易前都必须再次检查账户现金、当前仓位、主题暴露和硬性风险规则。",
      latencyMs: 0
    },
    {
      id: "critic",
      title: "反证 Critic",
      status: "completed",
      inputSummary: `question=${input.question ?? ""}`,
      output: `本轮只使用本地数据，并限定在${marketName} / ${universeName}；缺少最近复盘和外部来源的候选不能直接升级为交易建议。`,
      latencyMs: 0
    }
  ];
  const runId = insertRun(database, {
    triggerType: "strategy-run",
    strategyId,
    strategyVersionId,
    securityId: input.securityId,
    question: input.question ?? "Run strategy workflow.",
    finalSummary
  });
  const strategyRunId = nextBusinessId(database, "SRUN");
  database.sqlite
    .prepare(
      `INSERT INTO strategy_runs (
        id, strategy_id, strategy_version_id, run_date, universe_summary, status, final_summary, created_agent_run_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(strategyRunId, strategyId, strategyVersionId ?? null, today(), `${marketName}候选池 ${securities.length} 个标的`, "Completed", finalSummary, runId);

  const candidateStatement = database.sqlite.prepare(
    `INSERT INTO strategy_candidates (
      id, strategy_run_id, security_id, rank, fit_score, recommendation,
      matched_rules, missing_evidence, risk_flags, next_action
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const candidates = rawCandidates.map((candidate, index) => {
    const id = nextBusinessId(database, "CAND");
    const ranked = { ...candidate, id, rank: index + 1 };
    candidateStatement.run(
      id,
      strategyRunId,
      ranked.securityId,
      ranked.rank,
      ranked.fitScore,
      ranked.recommendation,
      jsonText(ranked.matchedRules),
      jsonText(ranked.missingEvidence),
      jsonText(ranked.riskFlags),
      ranked.nextAction
    );
    return ranked;
  });
  insertStages(database, runId, stages);

  return {
    triggerType: "strategy-run",
    runId,
    strategyId,
    strategyVersionId,
    strategyRunId,
    securityId: input.securityId,
    market,
    universe,
    finalSummary,
    stages,
    candidates,
    reviewFindings: []
  };
}

function runTargetDiagnosisWorkflow(database: DatabaseContext, input: ResearchIterationWorkflowInput): ResearchIterationWorkflowResult {
  if (!input.securityId) {
    throw new Error("securityId is required for target diagnosis.");
  }
  const security = firstRow(database, "SELECT * FROM securities WHERE id = ?", input.securityId);
  if (!security) {
    throw new Error(`Security ${input.securityId} was not found.`);
  }
  const strategies = allRows(database, "SELECT * FROM strategies WHERE status = 'Active' ORDER BY rowid DESC");
  const sources = sourceRows(database, input.securityId);
  const theses = thesisRows(database, input.securityId);
  const decisions = decisionRows(database, input.securityId);
  const lifecycle = getSecurityLifecycleMap(database).get(input.securityId);
  if (!lifecycle) {
    throw new Error(`Security ${input.securityId} lifecycle was not found.`);
  }
  const candidate = buildCandidate(database, security, lifecycle, 0);
  const finalSummary = `${String(security.name)} 标的诊断完成：${strategies.length} 个策略视角，${sources.length} 条来源，${theses.length} 条论点，建议动作为 ${candidate.recommendation}。`;
  const stages: ResearchIterationStage[] = [
    {
      id: "profile",
      title: "标的画像 Agent",
      status: "completed",
      inputSummary: `security=${input.securityId}`,
      output: `${String(security.name)} / ${String(security.ticker)}；市场=${String(security.market)}；流动性=${String(security.liquidity_level)}；风险主题=${parseStringArray(security.risk_theme_tags).join(", ") || "N/A"}。`,
      latencyMs: 0
    },
    {
      id: "strategy-lens",
      title: "策略视角 Agent",
      status: "completed",
      inputSummary: `strategies=${strategies.length}`,
      output: `当前最适合的动作是 ${candidate.recommendation}；命中规则：${candidate.matchedRules.join("；")}。`,
      latencyMs: 0
    },
    {
      id: "guardrail",
      title: "仓位与风险护栏 Agent",
      status: "completed",
      inputSummary: `decisions=${decisions.length}`,
      output: candidate.riskFlags.length > 0 ? candidate.riskFlags.join("；") : "未发现已记录的显著风险标记，但仍需检查账户现金和仓位。",
      latencyMs: 0
    },
    {
      id: "decision-memo",
      title: "动作建议 Agent",
      status: "completed",
      inputSummary: `sources=${sources.length}; theses=${theses.length}`,
      output: `${candidate.nextAction} 已持有时必须同时确认继续持有条件、退出条件和下次复核日期。`,
      latencyMs: 0
    }
  ];
  const runId = insertRun(database, {
    triggerType: "target-diagnosis",
    securityId: input.securityId,
    question: input.question ?? "Diagnose target.",
    finalSummary
  });
  insertStages(database, runId, stages);

  return {
    triggerType: "target-diagnosis",
    runId,
    securityId: input.securityId,
    finalSummary,
    stages,
    candidates: [],
    reviewFindings: []
  };
}

function runReviewWorkflow(database: DatabaseContext, input: ResearchIterationWorkflowInput): ResearchIterationWorkflowResult {
  const decisions = allRows(database, "SELECT * FROM trade_decisions ORDER BY rowid DESC");
  const theses = allRows(database, "SELECT * FROM theses ORDER BY rowid DESC");
  const pendingEvents = allRows(database, "SELECT * FROM review_events WHERE status = 'Pending' ORDER BY expected_date ASC, rowid DESC");
  const strategies = allRows(database, "SELECT * FROM strategies ORDER BY rowid DESC");
  const scope = "本周研究复盘";
  const finalSummary = `复盘完成：检查 ${decisions.length} 条决策、${theses.length} 条论点、${pendingEvents.length} 个待复核事件和 ${strategies.length} 个策略。`;
  const runId = insertRun(database, {
    triggerType: "review-session",
    question: input.question ?? scope,
    finalSummary
  });
  const reviewSessionId = nextBusinessId(database, "REVW");
  database.sqlite
    .prepare(
      `INSERT INTO review_sessions (
        id, review_date, scope, trigger_reason, status, summary, created_agent_run_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(reviewSessionId, today(), scope, input.question ?? "周期性复盘", "Draft", finalSummary, runId);

  const findings: ResearchIterationFinding[] = [
    {
      id: nextBusinessId(database, "FIND"),
      findingType: "Discipline",
      severity: pendingEvents.length > 0 ? "Warning" : "Info",
      finding: pendingEvents.length > 0 ? `存在 ${pendingEvents.length} 个待复核事件，不能用新观点覆盖未完成复核。` : "当前没有待复核事件积压。",
      nextAction: pendingEvents.length > 0 ? "优先完成最近一个复核事件，再升级策略版本。" : "保持现有复盘节奏。"
    },
    {
      id: nextBusinessId(database, "FIND"),
      findingType: "Strategy",
      severity: "Info",
      finding: "策略改版必须保留旧版本，不直接覆盖历史决策依据。",
      nextAction: "若本轮发现规则变化，创建新的策略版本并关联下一次运行。"
    }
  ];
  const findingStatement = database.sqlite.prepare(
    `INSERT INTO review_findings (
      id, review_session_id, finding_type, related_security_id, related_strategy_id,
      related_thesis_id, related_decision_id, severity, finding, next_action
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  findings.forEach((finding) => {
    findingStatement.run(
      finding.id,
      reviewSessionId,
      finding.findingType,
      null,
      strategies[0]?.id ?? null,
      theses[0]?.id ?? null,
      decisions[0]?.id ?? null,
      finding.severity,
      finding.finding,
      finding.nextAction
    );
  });
  const stages: ResearchIterationStage[] = [
    {
      id: "outcome",
      title: "结果归因 Agent",
      status: "completed",
      inputSummary: `decisions=${decisions.length}`,
      output: "先检查历史决策是否触及风险规则，再讨论收益或亏损，不用收益单指标评价策略。",
      latencyMs: 0
    },
    {
      id: "thesis-review",
      title: "论点复核 Agent",
      status: "completed",
      inputSummary: `theses=${theses.length}; pendingEvents=${pendingEvents.length}`,
      output: pendingEvents.length > 0 ? `最近待复核事件：${String(pendingEvents[0].id)}，变量=${String(pendingEvents[0].variables_to_check)}。` : "暂无待复核论点事件。",
      latencyMs: 0
    },
    {
      id: "discipline",
      title: "纪律 Agent",
      status: "completed",
      inputSummary: `findings=${findings.length}`,
      output: findings[0].finding,
      latencyMs: 0
    },
    {
      id: "strategy-revision",
      title: "策略修订 Agent",
      status: "completed",
      inputSummary: `strategies=${strategies.length}`,
      output: findings[1].nextAction,
      latencyMs: 0
    }
  ];
  insertStages(database, runId, stages);

  return {
    triggerType: "review-session",
    runId,
    reviewSessionId,
    finalSummary,
    stages,
    candidates: [],
    reviewFindings: findings
  };
}

export function runResearchIterationWorkflow(database: DatabaseContext, input: ResearchIterationWorkflowInput): ResearchIterationWorkflowResult {
  switch (input.triggerType) {
    case "strategy-run":
      return runStrategyWorkflow(database, input);
    case "target-diagnosis":
      return runTargetDiagnosisWorkflow(database, input);
    case "review-session":
      return runReviewWorkflow(database, input);
    default:
      throw new Error(`Unsupported research iteration trigger: ${(input as { triggerType?: string }).triggerType}`);
  }
}
