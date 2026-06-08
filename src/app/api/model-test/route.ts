import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { readAppSettings } from "@/lib/app-settings";
import { testModelConnection } from "@/lib/model-client";

export async function POST() {
  const database = getSeededDatabase();
  const settings = readAppSettings(database);
  const result = await testModelConnection({ settings });
  return NextResponse.json({ result }, { status: result.ok ? 200 : 400 });
}

