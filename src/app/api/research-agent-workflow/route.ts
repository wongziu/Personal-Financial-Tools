import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { readAppSettings } from "@/lib/app-settings";
import { runResearchAgentWorkflow } from "@/lib/research-agent-workflow";
import { getResearchAiDataset, researchAnalysisModes, type ResearchAnalysisMode } from "@/lib/research-ai";

function normalizeAnalysisMode(value: unknown): ResearchAnalysisMode {
  return typeof value === "string" && researchAnalysisModes.includes(value as ResearchAnalysisMode)
    ? value as ResearchAnalysisMode
    : "brief";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      securityId?: string;
      question?: string;
      analysisMode?: string;
    };
    if (!body.securityId) {
      return NextResponse.json({ error: "securityId is required" }, { status: 400 });
    }

    const database = getSeededDatabase();
    const result = await runResearchAgentWorkflow({
      settings: readAppSettings(database),
      dataset: getResearchAiDataset(database),
      securityId: body.securityId,
      question: body.question ?? "",
      analysisMode: normalizeAnalysisMode(body.analysisMode)
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
