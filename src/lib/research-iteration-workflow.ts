import type { AppSettings } from "@/lib/app-settings";
import type { DatabaseContext } from "@/lib/db/client";
import { callConfiguredModel, getModelApiKey, parseJsonObjectFromModel } from "@/lib/model-client";
import { draftInformationSource, type SourceIntelligenceDraft } from "@/lib/source-intelligence";
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

export type ResearchIterationTriggerType = "strategy-run" | "target-diagnosis" | "review-session" | "candidate-action";
export type ResearchIterationMarket = "all" | "A-Share" | "HK" | "US";
export type ResearchIterationUniverse = SecurityLifecycleUniverse;
export type ResearchIterationActionRoute = "Observe" | "CollectEvidence" | "CreateThesis" | "DraftDecision" | "Skip";
export type ResearchIterationActionStatus = "Open" | "Selected";

const researchIterationMarkets: ResearchIterationMarket[] = ["all", "A-Share", "HK", "US"];
const researchIterationActionRoutes: ResearchIterationActionRoute[] = ["Observe", "CollectEvidence", "CreateThesis", "DraftDecision", "Skip"];

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
  strategyRunId?: string;
  securityId: string;
  securityName: string;
  lifecycleBucket: SecurityLifecycleBucket;
  rank: number;
  fitScore: number;
  recommendation: ResearchIterationActionRoute;
  matchedRules: string[];
  missingEvidence: string[];
  riskFlags: string[];
  nextAction: string;
  modelAssessment?: ResearchIterationModelAssessment;
  actionRoute?: ResearchIterationActionRoute;
  actionStatus?: ResearchIterationActionStatus;
  actionNote?: string;
  actionUpdatedAt?: string;
}

export interface ResearchIterationModelAssessment {
  mode: "model" | "unavailable";
  model?: string;
  searchStatus: "searched" | "model-only" | "unavailable";
  summary: string;
  judgement: string;
  suggestedAction: string;
  evidenceHighlights: string[];
  unresolvedGaps: string[];
  searchQueries: string[];
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

export interface ResearchIterationStrategyRunRecord {
  strategyRunId: string;
  runId?: string;
  runDate: string;
  strategyId: string;
  strategyName: string;
  strategyVersionId?: string;
  market?: ResearchIterationMarket;
  universe?: ResearchIterationUniverse;
  universeSummary: string;
  status: string;
  finalSummary: string;
  candidates: ResearchIterationCandidate[];
}

export interface ResearchIterationCandidateActionWorkflowInput {
  candidateId: string;
  actionRoute: ResearchIterationActionRoute;
  actionNote?: string;
}

export interface ResearchIterationCandidateActionWorkflowResult {
  actionRoute: ResearchIterationActionRoute;
  runId: string;
  finalSummary: string;
  stages: ResearchIterationStage[];
  candidate: ResearchIterationCandidate;
  sourceDraft?: SourceIntelligenceDraft;
  nextActionRoute?: ResearchIterationActionRoute;
}

const localWorkflowModel = "local-structured-workflow";
const maxModelAssessedCandidates = 3;

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

function stringFromJsonItem(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const parts = [
      row.source,
      row.title,
      row.name,
      row.finding,
      row.summary,
      row.url
    ].map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
    if (parts.length > 0) {
      return parts.join("：");
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value ?? "");
}

function stringArrayFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringFromJsonItem).map((item) => item.trim()).filter(Boolean).slice(0, 6);
}

function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function parseModelAssessment(value: unknown): ResearchIterationModelAssessment | undefined {
  const row = parseJsonObject(value);
  if (!row) {
    return undefined;
  }

  const mode: ResearchIterationModelAssessment["mode"] = row.mode === "model" ? "model" : "unavailable";
  const searchStatus: ResearchIterationModelAssessment["searchStatus"] =
    row.searchStatus === "searched" || row.searchStatus === "model-only" || row.searchStatus === "unavailable"
      ? row.searchStatus
      : mode === "model" ? "model-only" : "unavailable";
  return {
    mode,
    model: typeof row.model === "string" ? row.model : undefined,
    searchStatus,
    summary: modelText(row.summary, ""),
    judgement: modelText(row.judgement, ""),
    suggestedAction: modelText(row.suggestedAction, ""),
    evidenceHighlights: stringArrayFromJson(row.evidenceHighlights),
    unresolvedGaps: stringArrayFromJson(row.unresolvedGaps),
    searchQueries: stringArrayFromJson(row.searchQueries)
  };
}

function modelText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function jsonText(items: string[]): string {
  return JSON.stringify(items);
}

function actionRouteFromValue(value: unknown): ResearchIterationActionRoute | undefined {
  return researchIterationActionRoutes.includes(value as ResearchIterationActionRoute) ? value as ResearchIterationActionRoute : undefined;
}

function actionStatusFromValue(value: unknown): ResearchIterationActionStatus {
  return value === "Selected" ? "Selected" : "Open";
}

export function normalizeResearchIterationMarket(value: unknown): ResearchIterationMarket {
  return researchIterationMarkets.includes(value as ResearchIterationMarket) ? value as ResearchIterationMarket : "all";
}

export { normalizeSecurityLifecycleUniverse as normalizeResearchIterationUniverse };

export function normalizeResearchIterationActionRoute(value: unknown): ResearchIterationActionRoute {
  if (researchIterationActionRoutes.includes(value as ResearchIterationActionRoute)) {
    return value as ResearchIterationActionRoute;
  }

  throw new Error("Unsupported research iteration action route.");
}

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

function appendStage(database: DatabaseContext, runId: string, stageOrder: number, stage: ResearchIterationStage): void {
  database.sqlite
    .prepare(
      `INSERT INTO research_agent_stages (
        id, run_id, stage_order, stage_id, title, status, input_summary, output, latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      nextBusinessId(database, "ASTG"),
      runId,
      stageOrder,
      stage.id,
      stage.title,
      stage.status,
      stage.inputSummary,
      stage.output,
      stage.latencyMs
    );
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
      output: `${marketName} / ${universeName}包含 ${securities.length} 个标的；缺失证据会写入候选卡片，并在模型配置可用时触发模型检索研判。`,
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
      output: `本轮先用本地数据筛选并限定在${marketName} / ${universeName}；缺少复盘、论点或外部来源的候选必须经过补资料或模型研判后再升级为交易建议。`,
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
        id, strategy_id, strategy_version_id, run_date, market, universe, universe_summary, status, final_summary, created_agent_run_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      strategyRunId,
      strategyId,
      strategyVersionId ?? null,
      today(),
      market,
      universe,
      `${marketName}候选池 ${securities.length} 个标的`,
      "Completed",
      finalSummary,
      runId
    );

  const candidateStatement = database.sqlite.prepare(
    `INSERT INTO strategy_candidates (
      id, strategy_run_id, security_id, rank, fit_score, recommendation,
      matched_rules, missing_evidence, risk_flags, next_action
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const candidates = rawCandidates.map((candidate, index) => {
    const id = nextBusinessId(database, "CAND");
    const ranked = { ...candidate, id, rank: index + 1, actionStatus: "Open" as const };
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

function candidateNeedsModelAssessment(candidate: ResearchIterationCandidate): boolean {
  return candidate.missingEvidence.length > 0 && candidate.recommendation !== "Skip";
}

function buildModelResearchPrompt(input: {
  candidate: ResearchIterationCandidate;
  security: Row | undefined;
  strategy: Row | undefined;
  strategyVersion: Row | undefined;
  question?: string;
}): string {
  return [
    "You are the model research agent inside a single-user investment decision system.",
    "When local evidence is missing, use your available public-web/search capability if the model runtime supports it. If live search is not available, explicitly set searchStatus to model-only.",
    "Do not fabricate source names, URLs, or filings. Separate confirmed public evidence from search queries that still need manual verification.",
    "Return compact strict JSON with keys: searchStatus, summary, judgement, suggestedAction, evidenceHighlights, unresolvedGaps, searchQueries.",
    "searchStatus must be one of: searched, model-only.",
    "judgement should be one short Chinese phrase such as 可推进, 先补资料, 观察, 暂不买入.",
    `Question: ${input.question || "判断该候选是否值得进入下一步研究或交易决策。"}`,
    `Strategy: ${input.strategy ? `${String(input.strategy.name)} / riskBudget=${stringValue(input.strategy.risk_budget)}` : "N/A"}`,
    `Strategy version: ${input.strategyVersion ? `${String(input.strategyVersion.version)} / evidenceRequirements=${stringValue(input.strategyVersion.evidence_requirements)}` : "N/A"}`,
    `Security: ${input.candidate.securityName} (${input.candidate.securityId}); market=${stringValue(input.security?.market)}; ticker=${stringValue(input.security?.ticker)}; assetType=${stringValue(input.security?.asset_type)}; riskThemes=${parseStringArray(input.security?.risk_theme_tags).join(", ") || "N/A"}`,
    `Local candidate: fitScore=${input.candidate.fitScore}; recommendation=${input.candidate.recommendation}; lifecycle=${securityLifecycleLabels[input.candidate.lifecycleBucket].zh}`,
    `Local matched rules: ${input.candidate.matchedRules.join("；") || "N/A"}`,
    `Local gaps: ${input.candidate.missingEvidence.join("；") || "N/A"}`,
    `Local risks: ${input.candidate.riskFlags.join("；") || "N/A"}`
  ].join("\n");
}

function assessmentFromJson(value: Record<string, unknown>, fallback: ResearchIterationModelAssessment): ResearchIterationModelAssessment {
  const rawSearchStatus = String(value.searchStatus ?? "");
  const searchStatus: ResearchIterationModelAssessment["searchStatus"] = rawSearchStatus === "searched" ? "searched" : "model-only";
  return {
    ...fallback,
    mode: "model",
    searchStatus,
    summary: modelText(value.summary, fallback.summary),
    judgement: modelText(value.judgement, fallback.judgement),
    suggestedAction: modelText(value.suggestedAction, fallback.suggestedAction),
    evidenceHighlights: stringArrayFromJson(value.evidenceHighlights),
    unresolvedGaps: stringArrayFromJson(value.unresolvedGaps),
    searchQueries: stringArrayFromJson(value.searchQueries)
  };
}

function unavailableAssessment(candidate: ResearchIterationCandidate, reason: string): ResearchIterationModelAssessment {
  return {
    mode: "unavailable",
    searchStatus: "unavailable",
    summary: `模型研判未执行：${reason}`,
    judgement: candidate.recommendation === "DraftDecision" ? "需人工复核" : "先补资料",
    suggestedAction: "先补齐本地信息来源、投资论点和结构化复盘，再进入交易决策。",
    evidenceHighlights: [],
    unresolvedGaps: candidate.missingEvidence,
    searchQueries: [`${candidate.securityName} 公告 财报 行业数据 风险`]
  };
}

async function assessCandidateWithModel(input: {
  settings: AppSettings;
  candidate: ResearchIterationCandidate;
  security: Row | undefined;
  strategy: Row | undefined;
  strategyVersion: Row | undefined;
  question?: string;
  fetcher?: typeof fetch;
}): Promise<ResearchIterationModelAssessment> {
  const apiKey = getModelApiKey(input.settings);
  if (input.settings.modelApi.executionMode !== "model" || input.settings.modelApi.provider === "disabled" || !apiKey) {
    return unavailableAssessment(input.candidate, "模型 API 未启用或 API Key 环境变量未配置。");
  }

  const prompt = buildModelResearchPrompt(input);
  const fallback: ResearchIterationModelAssessment = {
    mode: "model",
    model: input.settings.modelApi.model,
    searchStatus: "model-only",
    summary: "模型返回内容不足，需人工复核。",
    judgement: "先补资料",
    suggestedAction: input.candidate.nextAction,
    evidenceHighlights: [],
    unresolvedGaps: input.candidate.missingEvidence,
    searchQueries: [`${input.candidate.securityName} 公告 财报 行业数据 风险`]
  };

  try {
    const result = await callConfiguredModel({
      settings: input.settings,
      responseFormat: "json",
      fetcher: input.fetcher,
      messages: [
        {
          role: "system",
          content: "You are a cautious investment research agent. Return only valid compact JSON. Never invent evidence; mark unresolved gaps clearly."
        },
        { role: "user", content: prompt }
      ]
    });

    return {
      ...assessmentFromJson(parseJsonObjectFromModel(result.content), fallback),
      model: result.model
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown model error";
    return unavailableAssessment(input.candidate, message);
  }
}

export async function runResearchIterationWorkflowWithModel(
  database: DatabaseContext,
  input: ResearchIterationWorkflowInput,
  runtime: {
    settings?: AppSettings;
    fetcher?: typeof fetch;
    maxCandidates?: number;
  } = {}
): Promise<ResearchIterationWorkflowResult> {
  const result = runResearchIterationWorkflow(database, input);
  if (input.triggerType !== "strategy-run" || !runtime.settings) {
    return result;
  }

  const candidatesToAssess = result.candidates
    .filter(candidateNeedsModelAssessment)
    .slice(0, runtime.maxCandidates ?? maxModelAssessedCandidates);
  if (candidatesToAssess.length === 0) {
    return result;
  }

  const settings = runtime.settings;
  const startedAt = Date.now();
  const strategy = result.strategyId ? firstRow(database, "SELECT * FROM strategies WHERE id = ?", result.strategyId) : undefined;
  const strategyVersion = result.strategyVersionId ? firstRow(database, "SELECT * FROM strategy_versions WHERE id = ?", result.strategyVersionId) : undefined;
  const securityById = new Map(
    allRows(database, "SELECT * FROM securities").map((security) => [String(security.id), security])
  );

  const assessments = await Promise.all(candidatesToAssess.map((candidate) => assessCandidateWithModel({
      settings,
      fetcher: runtime.fetcher,
      candidate,
      security: securityById.get(candidate.securityId),
      strategy,
      strategyVersion,
      question: input.question
    })));
  candidatesToAssess.forEach((candidate, index) => {
    candidate.modelAssessment = assessments[index];
    database.sqlite
      .prepare("UPDATE strategy_candidates SET model_assessment = ? WHERE id = ?")
      .run(JSON.stringify(assessments[index]), candidate.id);
  });

  const modelCount = result.candidates.filter((candidate) => candidate.modelAssessment?.mode === "model").length;
  const unavailableCount = result.candidates.filter((candidate) => candidate.modelAssessment?.mode === "unavailable").length;
  const stage: ResearchIterationStage = {
    id: "model-research",
    title: "模型搜索研判 Agent",
    status: "completed",
    inputSummary: `assessed=${candidatesToAssess.length}; model=${settings.modelApi.model}`,
    output:
      modelCount > 0
        ? `已对 ${modelCount} 个资料缺口候选调用模型做检索式研判；${unavailableCount > 0 ? `${unavailableCount} 个候选因模型不可用降级。` : "模型结论仅作为研究线索，不能替代可审计来源。"}`
        : `资料缺口候选需要模型研判，但模型不可用；已标记 ${unavailableCount} 个候选为先补资料。`,
    latencyMs: Date.now() - startedAt
  };
  result.stages = [...result.stages, stage];
  result.finalSummary = `${result.finalSummary} 模型研判：${modelCount} 个候选已补充，${unavailableCount} 个候选未能调用模型。`;

  appendStage(database, result.runId, result.stages.length, stage);
  database.sqlite.prepare("UPDATE research_agent_runs SET final_summary = ? WHERE id = ?").run(result.finalSummary, result.runId);
  if (result.strategyRunId) {
    database.sqlite.prepare("UPDATE strategy_runs SET final_summary = ? WHERE id = ?").run(result.finalSummary, result.strategyRunId);
  }

  return result;
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

function candidateFromRow(row: Row, lifecycleById: Map<string, SecurityLifecycleEntry>): ResearchIterationCandidate {
  const securityId = String(row.security_id);
  const lifecycle = lifecycleById.get(securityId);
  return {
    id: String(row.id),
    strategyRunId: String(row.strategy_run_id),
    securityId,
    securityName: stringValue(row.security_name, securityId),
    lifecycleBucket: lifecycle?.bucket ?? "blocked",
    rank: Number(row.rank ?? 0),
    fitScore: Number(row.fit_score ?? 0),
    recommendation: normalizeResearchIterationActionRoute(row.recommendation),
    matchedRules: parseStringArray(row.matched_rules),
    missingEvidence: parseStringArray(row.missing_evidence),
    riskFlags: parseStringArray(row.risk_flags),
    nextAction: stringValue(row.next_action),
    modelAssessment: parseModelAssessment(row.model_assessment),
    actionRoute: actionRouteFromValue(row.action_route),
    actionStatus: actionStatusFromValue(row.action_status),
    actionNote: stringValue(row.action_note),
    actionUpdatedAt: row.action_updated_at ? String(row.action_updated_at) : undefined
  };
}

function loadResearchIterationCandidate(database: DatabaseContext, candidateId: string): ResearchIterationCandidate {
  const row = firstRow(
    database,
    `SELECT strategy_candidates.*, securities.name AS security_name
     FROM strategy_candidates
     LEFT JOIN securities ON securities.id = strategy_candidates.security_id
     WHERE strategy_candidates.id = ?`,
    candidateId
  );
  if (!row) {
    throw new Error(`Strategy candidate ${candidateId} was not found.`);
  }

  return candidateFromRow(row, getSecurityLifecycleMap(database));
}

function buildEvidenceWorkflowSourceText(input: {
  candidate: ResearchIterationCandidate;
  security: Row | undefined;
  actionNote?: string;
  settings: AppSettings;
}): string {
  const ticker = stringValue(input.security?.ticker, input.candidate.securityId);
  const trustedDomains = input.settings.sourceIntelligence.defaultDomains.join(", ") || "N/A";

  return [
    `${input.candidate.securityName} (${ticker}) 补资料工作流：围绕候选卡片缺口自动整理可审查资料草稿。`,
    `行动说明：${input.actionNote?.trim() || input.candidate.nextAction}`,
    `本地缺口：${input.candidate.missingEvidence.join("；") || "N/A"}`,
    `模型建议：${input.candidate.modelAssessment?.suggestedAction || "N/A"}`,
    `建议检索词：${input.candidate.modelAssessment?.searchQueries.join("；") || `${input.candidate.securityName} 公告 财报 行业数据 风险`}`,
    `优先可信域名：${trustedDomains}`,
    "要求：只生成待确认资料草稿，不直接写入信息来源表；用户确认后再进入建论点或交易草案。"
  ].join("\n");
}

function buildCandidateActionStages(input: {
  actionRoute: ResearchIterationActionRoute;
  candidate: ResearchIterationCandidate;
  sourceDraft?: SourceIntelligenceDraft;
  startedAt: number;
}): ResearchIterationStage[] {
  if (input.actionRoute !== "CollectEvidence") {
    return [
      {
        id: "action-route",
        title: "行动路线 Agent",
        status: "completed",
        inputSummary: `candidate=${input.candidate.id}; route=${input.actionRoute}`,
        output: `已记录下一行动路线：${input.actionRoute}。`,
        latencyMs: Date.now() - input.startedAt
      }
    ];
  }

  return [
    {
      id: "action-route",
      title: "行动路线 Agent",
      status: "completed",
      inputSummary: `candidate=${input.candidate.id}; route=CollectEvidence`,
      output: "将候选卡片的资料缺口拆解为公告、财报、行业数据和风险资料搜索任务。",
      latencyMs: 0
    },
    {
      id: "evidence-search",
      title: "资料搜索 Agent",
      status: "completed",
      inputSummary: `security=${input.candidate.securityName}`,
      output: input.candidate.modelAssessment?.searchQueries.join("；") || `${input.candidate.securityName} 公告 财报 行业数据 风险`,
      latencyMs: 0
    },
    {
      id: "source-draft",
      title: "信息草稿 Agent",
      status: "completed",
      inputSummary: `draftMode=${input.sourceDraft?.mode ?? "N/A"}`,
      output: input.sourceDraft
        ? `${input.sourceDraft.fields.sourceName}：${input.sourceDraft.fields.keyFacts}`
        : "未能生成资料草稿。",
      latencyMs: Date.now() - input.startedAt
    },
    {
      id: "handoff",
      title: "下一步编排 Agent",
      status: "completed",
      inputSummary: "target=information-analysis",
      output: "资料草稿需要用户确认后写入信息来源，再进入建论点或生成交易草案。",
      latencyMs: 0
    }
  ];
}

export function listResearchIterationStrategyRuns(
  database: DatabaseContext,
  options: { limit?: number } = {}
): ResearchIterationStrategyRunRecord[] {
  const limit = Math.max(1, Math.min(options.limit ?? 6, 20));
  const lifecycleById = getSecurityLifecycleMap(database);
  const runRows = allRows(
    database,
    `SELECT strategy_runs.*, strategies.name AS strategy_name
     FROM strategy_runs
     LEFT JOIN strategies ON strategies.id = strategy_runs.strategy_id
     ORDER BY strategy_runs.rowid DESC
     LIMIT ?`,
    limit
  );

  return runRows.map((runRow) => {
    const candidateRows = allRows(
      database,
      `SELECT strategy_candidates.*, securities.name AS security_name
       FROM strategy_candidates
       LEFT JOIN securities ON securities.id = strategy_candidates.security_id
       WHERE strategy_candidates.strategy_run_id = ?
       ORDER BY strategy_candidates.rank ASC, strategy_candidates.rowid ASC`,
      runRow.id
    );
    return {
      strategyRunId: String(runRow.id),
      runId: runRow.created_agent_run_id ? String(runRow.created_agent_run_id) : undefined,
      runDate: String(runRow.run_date),
      strategyId: String(runRow.strategy_id),
      strategyName: stringValue(runRow.strategy_name, String(runRow.strategy_id)),
      strategyVersionId: runRow.strategy_version_id ? String(runRow.strategy_version_id) : undefined,
      market: runRow.market ? normalizeResearchIterationMarket(runRow.market) : undefined,
      universe: runRow.universe ? normalizeSecurityLifecycleUniverse(runRow.universe) : undefined,
      universeSummary: String(runRow.universe_summary),
      status: String(runRow.status),
      finalSummary: String(runRow.final_summary),
      candidates: candidateRows.map((candidateRow) => candidateFromRow(candidateRow, lifecycleById))
    };
  });
}

export function selectResearchIterationCandidateAction(
  database: DatabaseContext,
  input: { candidateId: string; actionRoute: ResearchIterationActionRoute; actionNote?: string }
): ResearchIterationCandidate {
  const actionRoute = normalizeResearchIterationActionRoute(input.actionRoute);
  const existing = firstRow(database, "SELECT id FROM strategy_candidates WHERE id = ?", input.candidateId);
  if (!existing) {
    throw new Error(`Strategy candidate ${input.candidateId} was not found.`);
  }

  const actionUpdatedAt = new Date().toISOString();
  database.sqlite
    .prepare(
      `UPDATE strategy_candidates
       SET action_route = ?, action_status = 'Selected', action_note = ?, action_updated_at = ?
       WHERE id = ?`
    )
    .run(actionRoute, input.actionNote?.trim() ?? "", actionUpdatedAt, input.candidateId);

  return loadResearchIterationCandidate(database, input.candidateId);
}

export async function runResearchIterationCandidateActionWorkflow(
  database: DatabaseContext,
  input: ResearchIterationCandidateActionWorkflowInput,
  runtime: {
    settings: AppSettings;
    fetcher?: typeof fetch;
  }
): Promise<ResearchIterationCandidateActionWorkflowResult> {
  const actionRoute = normalizeResearchIterationActionRoute(input.actionRoute);
  let candidate = loadResearchIterationCandidate(database, input.candidateId);
  const security = firstRow(database, "SELECT * FROM securities WHERE id = ?", candidate.securityId);
  const strategyRun = candidate.strategyRunId
    ? firstRow(database, "SELECT * FROM strategy_runs WHERE id = ?", candidate.strategyRunId)
    : undefined;
  const strategy = strategyRun?.strategy_id ? firstRow(database, "SELECT * FROM strategies WHERE id = ?", strategyRun.strategy_id) : undefined;
  const strategyVersion = strategyRun?.strategy_version_id
    ? firstRow(database, "SELECT * FROM strategy_versions WHERE id = ?", strategyRun.strategy_version_id)
    : undefined;
  const startedAt = Date.now();
  if (actionRoute === "CollectEvidence" && candidate.modelAssessment?.mode !== "model") {
    const modelAssessment = await assessCandidateWithModel({
      settings: runtime.settings,
      fetcher: runtime.fetcher,
      candidate,
      security,
      strategy,
      strategyVersion,
      question: input.actionNote
    });
    candidate = { ...candidate, modelAssessment };
    database.sqlite
      .prepare("UPDATE strategy_candidates SET model_assessment = ? WHERE id = ?")
      .run(JSON.stringify(modelAssessment), candidate.id);
  }
  const sourceDraft = actionRoute === "CollectEvidence"
    ? await draftInformationSource({
        settings: runtime.settings,
        fetcher: runtime.fetcher,
        securityName: candidate.securityName,
        sourceUrl: "AI evidence workflow",
        sourceText: buildEvidenceWorkflowSourceText({
          candidate,
          security,
          actionNote: input.actionNote,
          settings: runtime.settings
        })
      })
    : undefined;
  const finalSummary = actionRoute === "CollectEvidence"
    ? `补资料工作流已为 ${candidate.securityName} 生成待确认资料草稿，确认后再进入建论点或交易草案。`
    : `${candidate.securityName} 已记录下一行动路线：${actionRoute}。`;
  const stages = buildCandidateActionStages({
    actionRoute,
    candidate,
    sourceDraft,
    startedAt
  });
  const runId = insertRun(database, {
    triggerType: "candidate-action",
    strategyId: strategyRun ? stringValue(strategyRun.strategy_id) : undefined,
    strategyVersionId: strategyRun?.strategy_version_id ? stringValue(strategyRun.strategy_version_id) : undefined,
    securityId: candidate.securityId,
    question: input.actionNote ?? candidate.nextAction,
    finalSummary
  });
  insertStages(database, runId, stages);

  const actionNote = actionRoute === "CollectEvidence" && sourceDraft
    ? `补资料工作流已生成资料草稿：${sourceDraft.fields.keyFacts}`
    : input.actionNote;
  const updatedCandidate = selectResearchIterationCandidateAction(database, {
    candidateId: input.candidateId,
    actionRoute,
    actionNote
  });

  return {
    actionRoute,
    runId,
    finalSummary,
    stages,
    candidate: updatedCandidate,
    sourceDraft,
    nextActionRoute: actionRoute === "CollectEvidence" ? "CreateThesis" : undefined
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
