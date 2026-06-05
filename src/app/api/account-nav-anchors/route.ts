import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { upsertAccountNavAnchor } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const database = getSeededDatabase();
    const anchor = upsertAccountNavAnchor(database, body);
    revalidatePath("/account-calendar");
    revalidatePath("/");
    return NextResponse.json({ anchor });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
