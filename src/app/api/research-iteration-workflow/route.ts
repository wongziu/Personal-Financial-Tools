import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { readAppSettings } from "@/lib/app-settings";
import {
  listResearchIterationStrategyRuns,
  normalizeResearchIterationActionRoute,
  normalizeResearchIterationMarket,
  normalizeResearchIterationUniverse,
  runResearchIterationCandidateActionWorkflow,
  runResearchIterationWorkflowWithModel,
  type ResearchIterationTriggerType
} from "@/lib/research-iteration-workflow";

type PostTriggerType = Exclude<ResearchIterationTriggerType, "candidate-action">;

const triggerTypes: PostTriggerType[] = ["strategy-run", "target-diagnosis", "review-session"];

function normalizeTriggerType(value: unknown): PostTriggerType {
  return typeof value === "string" && triggerTypes.includes(value as PostTriggerType)
    ? value as PostTriggerType
    : "strategy-run";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 6);
    const database = getSeededDatabase();
    return NextResponse.json({ history: listResearchIterationStrategyRuns(database, { limit }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      triggerType?: string;
      strategyId?: string;
      securityId?: string;
      market?: string;
      universe?: string;
      question?: string;
    };
    const database = getSeededDatabase();
    const settings = readAppSettings(database);
    const result = await runResearchIterationWorkflowWithModel(database, {
      triggerType: normalizeTriggerType(body.triggerType),
      strategyId: body.strategyId,
      securityId: body.securityId,
      market: normalizeResearchIterationMarket(body.market),
      universe: normalizeResearchIterationUniverse(body.universe),
      question: body.question
    }, {
      settings,
      maxCandidates: settings.agentWorkflow.maxModelCandidates
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      candidateId?: string;
      actionRoute?: string;
      actionNote?: string;
    };
    if (!body.candidateId) {
      throw new Error("candidateId is required.");
    }

    const database = getSeededDatabase();
    const actionWorkflow = await runResearchIterationCandidateActionWorkflow(database, {
      candidateId: body.candidateId,
      actionRoute: normalizeResearchIterationActionRoute(body.actionRoute),
      actionNote: body.actionNote
    }, {
      settings: readAppSettings(database)
    });

    return NextResponse.json({ candidate: actionWorkflow.candidate, actionWorkflow });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
