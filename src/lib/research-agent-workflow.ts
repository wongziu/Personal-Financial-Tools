import type { AppSettings } from "@/lib/app-settings";
import { callConfiguredModel, type ModelChatMessage } from "@/lib/model-client";
import {
  buildResearchAnalysisPrompt,
  buildResearchContextSnapshot,
  type ResearchAiDataset,
  type ResearchAnalysisMode,
  type ResearchContextSnapshot
} from "@/lib/research-ai";

export type ResearchAgentStageId = "evidence" | "thesis" | "risk" | "decision" | "critic";
export type ResearchAgentStageStatus = "completed" | "failed";

export interface ResearchAgentStageDefinition {
  id: ResearchAgentStageId;
  title: string;
  role: string;
  objective: string;
}

export interface ResearchAgentStageResult {
  id: ResearchAgentStageId;
  title: string;
  status: ResearchAgentStageStatus;
  inputSummary: string;
  output: string;
  latencyMs: number;
}

export interface ResearchAgentWorkflowResult {
  mode: "agent-workflow";
  model: string;
  securityId: string;
  analysisMode: ResearchAnalysisMode;
  context: ResearchContextSnapshot;
  stages: ResearchAgentStageResult[];
  finalSummary: string;
}

export const researchAgentStages: ResearchAgentStageDefinition[] = [
  {
    id: "evidence",
    title: "Evidence Agent",
    role: "You are the evidence analyst in an investment research workflow.",
    objective: "Audit the supplied local sources. Identify strongest evidence, weak evidence, conflicts, and missing source types."
  },
  {
    id: "thesis",
    title: "Thesis Agent",
    role: "You are the thesis reviewer in an investment research workflow.",
    objective: "Assess whether the local theses are supported, weakened, outdated, or need a concrete review trigger."
  },
  {
    id: "risk",
    title: "Risk Agent",
    role: "You are the risk officer in an investment research workflow.",
    objective: "Identify downside risks, liquidity or position constraints, invalidation conditions, and monitoring variables."
  },
  {
    id: "decision",
    title: "Decision Agent",
    role: "You are the decision chair in an investment research workflow.",
    objective: "Synthesize a reviewable action recommendation. Do not claim that a trade has been executed or should be auto-executed."
  },
  {
    id: "critic",
    title: "Critic Agent",
    role: "You are the independent verifier in an investment research workflow.",
    objective: "Check prior agent outputs for unsupported claims, missing caveats, overreach, and unresolved questions."
  }
];

function stageInputSummary(context: ResearchContextSnapshot, completedStages: ResearchAgentStageResult[]): string {
  return [
    `sources=${context.sourceCount}`,
    `theses=${context.thesisCount}`,
    `reviewEvents=${context.reviewEventCount}`,
    `tradeDecisions=${context.tradeDecisionCount}`,
    `completedStages=${completedStages.length}`
  ].join("; ");
}

function priorStageText(stages: ResearchAgentStageResult[]): string {
  if (stages.length === 0) {
    return "No prior agent output.";
  }

  return stages
    .map((stage) => `[${stage.title} / ${stage.status}]\n${stage.output}`)
    .join("\n\n");
}

export function buildResearchAgentStageMessages({
  stage,
  dataset,
  securityId,
  question,
  analysisMode,
  priorStages
}: {
  stage: ResearchAgentStageDefinition;
  dataset: ResearchAiDataset;
  securityId: string;
  question: string;
  analysisMode: ResearchAnalysisMode;
  priorStages: ResearchAgentStageResult[];
}): ModelChatMessage[] {
  const basePrompt = buildResearchAnalysisPrompt({ dataset, securityId, question, analysisMode });

  return [
    {
      role: "system",
      content: [
        stage.role,
        stage.objective,
        "Use only the supplied local records and prior agent outputs.",
        "Do not invent external facts, prices, news, filings, or executed trades.",
        "Write compact Markdown with clear bullets. Reference source, thesis, review event, or decision IDs when useful."
      ].join(" ")
    },
    {
      role: "user",
      content: [
        basePrompt,
        "",
        "Prior agent outputs:",
        priorStageText(priorStages),
        "",
        `Now produce the ${stage.title} output.`
      ].join("\n")
    }
  ];
}

export async function runResearchAgentWorkflow({
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
}): Promise<ResearchAgentWorkflowResult> {
  const context = buildResearchContextSnapshot(dataset, securityId);
  const stages: ResearchAgentStageResult[] = [];

  for (const stage of researchAgentStages) {
    const startedAt = Date.now();
    const inputSummary = stageInputSummary(context, stages);

    try {
      const result = await callConfiguredModel({
        settings,
        messages: buildResearchAgentStageMessages({
          stage,
          dataset,
          securityId,
          question,
          analysisMode,
          priorStages: stages
        }),
        responseFormat: "text",
        fetcher
      });

      stages.push({
        id: stage.id,
        title: stage.title,
        status: "completed",
        inputSummary,
        output: result.content.trim(),
        latencyMs: Date.now() - startedAt
      });
    } catch (error) {
      stages.push({
        id: stage.id,
        title: stage.title,
        status: "failed",
        inputSummary,
        output: error instanceof Error ? error.message : "Unknown workflow stage error",
        latencyMs: Date.now() - startedAt
      });
      break;
    }
  }

  const lastCompleted = [...stages].reverse().find((stage) => stage.status === "completed");
  const failed = stages.find((stage) => stage.status === "failed");

  return {
    mode: "agent-workflow",
    model: settings.modelApi.model,
    securityId,
    analysisMode,
    context,
    stages,
    finalSummary: failed
      ? `Workflow stopped at ${failed.title}: ${failed.output}`
      : lastCompleted?.output ?? "No agent workflow output."
  };
}
