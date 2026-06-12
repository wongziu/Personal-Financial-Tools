import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { listResearchAgentRuns } from "@/lib/research-iteration-workflow";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 12);
    const database = getSeededDatabase();
    return NextResponse.json({ runs: listResearchAgentRuns(database, { limit }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
