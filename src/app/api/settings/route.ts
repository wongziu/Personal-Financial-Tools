import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { readAppSettings, updateAppSettings, type AppSettingsPatch } from "@/lib/app-settings";

export async function GET() {
  const database = getSeededDatabase();
  return NextResponse.json({ settings: readAppSettings(database) });
}

export async function PATCH(request: Request) {
  try {
    const patch = (await request.json()) as AppSettingsPatch;
    const database = getSeededDatabase();
    const settings = updateAppSettings(database, patch);
    revalidatePath("/");
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
