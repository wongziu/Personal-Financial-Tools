import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { refreshFxRates } from "@/lib/fx-refresh";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { mode?: "manual" | "auto" };
    const database = getSeededDatabase();
    const result = await refreshFxRates(database, { mode: body.mode ?? "manual" });
    revalidatePath("/");
    revalidatePath("/fx-rates");
    revalidatePath("/market-data");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
