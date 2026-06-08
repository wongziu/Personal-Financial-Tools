import type { AppSettings } from "@/lib/app-settings";
import type { DatabaseContext } from "@/lib/db/client";
import { callConfiguredModel, parseJsonObjectFromModel, type ModelChatMessage } from "@/lib/model-client";
import type { Row } from "@/lib/services";

export interface ResearchAiDataset {
  securities: Row[];
  sources: Row[];
  theses: Row[];
  reviewEvents: Row[];
  tradeDecisions: Row[];
}

export const researchAnalysisModes = ["brief", "evidence-audit", "risk-catalyst", "decision-memo"] as const;
export type ResearchAnalysisMode = typeof researchAnalysisModes[number];

export interface ResearchContextSnapshot {
  securityName: string;
  securityTicker: string;
  sourceCount: number;
  thesisCount: number;
  reviewEventCount: number;
  tradeDecisionCount: number;
  latestSourceDate: string | null;
  nextReviewDate: string | null;
  latestDecisionAction: string | null;
}

export interface ResearchAnalysis {
  summary: string;
  evidenceHighlights: string[];
  thesisImpact: string;
  riskFlags: string[];
  suggestedQuestions: string[];
  nextActions: string[];
}

export interface ResearchAiResult {
  mode: "model";
  analysisMode: ResearchAnalysisMode;
  model: string;
  securityId: string;
  context: ResearchContextSnapshot;
  prompt: string;
  analysis: ResearchAnalysis;
}

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  return String(value);
}

function compactRows(rows: Row[], columns: string[], limit: number): string {
  if (rows.length === 0) {
    return "None";
  }

  return rows.slice(0, limit).map((row) =>
    columns.map((column) => `${column}=${valueText(row[column])}`).join("; ")
  ).join("\n");
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        return JSON.stringify(item);
      }
      return String(item);
    }).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function analysisFromJson(value: Record<string, unknown>): ResearchAnalysis {
  return {
    summary: typeof value.summary === "string" ? value.summary : "No summary returned.",
    evidenceHighlights: stringArray(value.evidenceHighlights),
    thesisImpact: typeof value.thesisImpact === "string" ? value.thesisImpact : "Pending",
    riskFlags: stringArray(value.riskFlags),
    suggestedQuestions: stringArray(value.suggestedQuestions),
    nextActions: stringArray(value.nextActions)
  };
}

function securityRows(dataset: ResearchAiDataset, securityId: string) {
  const sources = dataset.sources.filter((row) => String(row.security_id ?? "") === securityId);
  const theses = dataset.theses.filter((row) => String(row.security_id ?? "") === securityId);
  const reviewEvents = dataset.reviewEvents.filter((row) => String(row.security_id ?? "") === securityId);
  const tradeDecisions = dataset.tradeDecisions.filter((row) => String(row.security_id ?? "") === securityId);

  return {
    security: dataset.securities.find((row) => String(row.id) === securityId),
    sources,
    theses,
    reviewEvents,
    tradeDecisions
  };
}

function firstString(rows: Row[], column: string): string | null {
  const value = rows.find((row) => row[column] !== null && row[column] !== undefined && row[column] !== "")?.[column];
  return value === null || value === undefined || value === "" ? null : String(value);
}

export function buildResearchContextSnapshot(dataset: ResearchAiDataset, securityId: string): ResearchContextSnapshot {
  const { security, sources, theses, reviewEvents, tradeDecisions } = securityRows(dataset, securityId);

  return {
    securityName: valueText(security?.name ?? securityId),
    securityTicker: valueText(security?.ticker ?? ""),
    sourceCount: sources.length,
    thesisCount: theses.length,
    reviewEventCount: reviewEvents.length,
    tradeDecisionCount: tradeDecisions.length,
    latestSourceDate: firstString(sources, "information_date"),
    nextReviewDate: firstString(reviewEvents, "expected_date"),
    latestDecisionAction: firstString(tradeDecisions, "final_decision") ?? firstString(tradeDecisions, "action")
  };
}

function analysisModeInstruction(mode: ResearchAnalysisMode): string {
  switch (mode) {
    case "evidence-audit":
      return "Focus on evidence quality, missing corroboration, source conflicts, and which claims need stronger support.";
    case "risk-catalyst":
      return "Focus on downside risks, catalysts, review triggers, scenario breaks, and variables to monitor before the next decision.";
    case "decision-memo":
      return "Focus on an investment committee style decision memo: what is known, what is uncertain, what action is justified, and what guardrails are needed.";
    case "brief":
    default:
      return "Focus on a concise analyst briefing that connects evidence, thesis, risks, and next actions.";
  }
}

export function buildResearchAnalysisPrompt({
  dataset,
  securityId,
  question,
  analysisMode = "brief"
}: {
  dataset: ResearchAiDataset;
  securityId: string;
  question: string;
  analysisMode?: ResearchAnalysisMode;
}): string {
  const { security, sources, theses, reviewEvents, tradeDecisions } = securityRows(dataset, securityId);
  const context = buildResearchContextSnapshot(dataset, securityId);

  return [
    "You are an AI research analyst for a local investment decision system.",
    "Use only the provided local records. Do not invent external facts.",
    "Return strict JSON with keys: summary, evidenceHighlights, thesisImpact, riskFlags, suggestedQuestions, nextActions.",
    "Keep every claim auditable and refer to source, thesis, event, or decision IDs when useful.",
    `Analysis mode: ${analysisMode}. ${analysisModeInstruction(analysisMode)}`,
    "",
    `Question: ${question || "Summarize the current research state and next decisions."}`,
    "",
    "Context coverage:",
    `sources=${context.sourceCount}; theses=${context.thesisCount}; reviewEvents=${context.reviewEventCount}; tradeDecisions=${context.tradeDecisionCount}; latestSourceDate=${valueText(context.latestSourceDate)}; nextReviewDate=${valueText(context.nextReviewDate)}; latestDecisionAction=${valueText(context.latestDecisionAction)}`,
    "",
    "Security:",
    security
      ? compactRows([security], ["id", "name", "ticker", "asset_type", "market", "risk_theme_tags", "industry_level_1", "investment_status"], 1)
      : `id=${securityId}; missing from securities table`,
    "",
    "Information sources:",
    compactRows(sources, ["id", "information_date", "evidence_level", "source_name", "thesis_impact", "key_facts"], 8),
    "",
    "Theses:",
    compactRows(theses, ["id", "status", "one_line_thesis", "invalidation_conditions", "next_review_date"], 5),
    "",
    "Review events:",
    compactRows(reviewEvents, ["id", "event_type", "expected_date", "importance", "status", "variables_to_check"], 5),
    "",
    "Trade decisions:",
    compactRows(tradeDecisions, ["id", "decision_time", "action", "final_decision", "post_trade_weight", "risk_warnings", "status"], 5)
  ].join("\n");
}

export async function analyzeResearchWithAi({
  settings,
  dataset,
  securityId,
  question,
  analysisMode = "brief",
  fetcher
}: {
  settings: AppSettings;
  dataset: ResearchAiDataset;
  securityId: string;
  question: string;
  analysisMode?: ResearchAnalysisMode;
  fetcher?: typeof fetch;
}): Promise<ResearchAiResult> {
  const prompt = buildResearchAnalysisPrompt({ dataset, securityId, question, analysisMode });
  const messages: ModelChatMessage[] = [
    {
      role: "system",
      content: "You produce structured investment research analysis. Return only compact valid JSON, no markdown. All array fields must be arrays of short strings."
    },
    { role: "user", content: prompt }
  ];
  const result = await callConfiguredModel({
    settings,
    messages,
    responseFormat: "json",
    fetcher
  });

  return {
    mode: "model",
    analysisMode,
    model: result.model,
    securityId,
    context: buildResearchContextSnapshot(dataset, securityId),
    prompt,
    analysis: analysisFromJson(parseJsonObjectFromModel(result.content))
  };
}

export function getResearchAiDataset(database: DatabaseContext): ResearchAiDataset {
  return {
    securities: database.sqlite.prepare("SELECT * FROM securities ORDER BY rowid DESC").all() as Row[],
    sources: database.sqlite.prepare("SELECT * FROM information_sources ORDER BY information_date DESC, rowid DESC").all() as Row[],
    theses: database.sqlite.prepare("SELECT * FROM theses ORDER BY rowid DESC").all() as Row[],
    reviewEvents: database.sqlite.prepare("SELECT * FROM review_events ORDER BY expected_date ASC, rowid DESC").all() as Row[],
    tradeDecisions: database.sqlite.prepare("SELECT * FROM trade_decisions ORDER BY rowid DESC").all() as Row[]
  };
}
