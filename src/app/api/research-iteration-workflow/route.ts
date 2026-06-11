import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { runResearchIterationWorkflow, type ResearchIterationTriggerType } from "@/lib/research-iteration-workflow";

const triggerTypes = ["strategy-run", "target-diagnosis", "review-session"] as const;

function normalizeTriggerType(value: unknown): ResearchIterationTriggerType {
  return typeof value === "string" && triggerTypes.includes(value as ResearchIterationTriggerType)
    ? value as ResearchIterationTriggerType
    : "strategy-run";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      triggerType?: string;
      strategyId?: string;
      securityId?: string;
      question?: string;
    };
    const result = runResearchIterationWorkflow(getSeededDatabase(), {
      triggerType: normalizeTriggerType(body.triggerType),
      strategyId: body.strategyId,
      securityId: body.securityId,
      question: body.question
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
