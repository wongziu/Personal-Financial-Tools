import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { readAppSettings } from "@/lib/app-settings";
import { draftInformationSource } from "@/lib/source-intelligence";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceText?: string;
      sourceUrl?: string;
      securityName?: string;
    };
    const database = getSeededDatabase();
    const settings = readAppSettings(database);
    const draft = await draftInformationSource({
      settings,
      sourceText: body.sourceText ?? "",
      sourceUrl: body.sourceUrl,
      securityName: body.securityName
    });

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
