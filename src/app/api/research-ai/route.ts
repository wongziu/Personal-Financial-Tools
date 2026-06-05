import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { readAppSettings } from "@/lib/app-settings";
import { analyzeResearchWithAi, getResearchAiDataset } from "@/lib/research-ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      securityId?: string;
      question?: string;
    };
    if (!body.securityId) {
      return NextResponse.json({ error: "securityId is required" }, { status: 400 });
    }

    const database = getSeededDatabase();
    const result = await analyzeResearchWithAi({
      settings: readAppSettings(database),
      dataset: getResearchAiDataset(database),
      securityId: body.securityId,
      question: body.question ?? ""
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

