import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSeededDatabase } from "@/lib/app-db";
import { insertModuleRecord } from "@/lib/modules";

export async function POST(request: Request, { params }: { params: Promise<{ module: string }> }) {
  try {
    const { module } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const database = getSeededDatabase();
    const row = insertModuleRecord(database, module, body);
    revalidatePath(`/${module}`);
    revalidatePath("/");
    return NextResponse.json({ row });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
