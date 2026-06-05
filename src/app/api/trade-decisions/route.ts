import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { createTradeDecisionWithRisk } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const database = getSeededDatabase();
    const result = createTradeDecisionWithRisk(database, body);
    revalidatePath("/trade-decisions");
    revalidatePath("/exceptions");
    revalidatePath("/");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
