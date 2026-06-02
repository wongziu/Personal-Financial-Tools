import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { TradeDecisionsPage } from "@/components/trade-decisions-page";
import { getSeededDatabase } from "@/lib/app-db";
import { findModuleDefinition, listModuleRows } from "@/lib/modules";
import type { Row } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function DynamicModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const database = getSeededDatabase();

  if (module === "trade-decisions") {
    const rows = database.sqlite.prepare("SELECT * FROM trade_decisions ORDER BY rowid DESC").all();
    return <TradeDecisionsPage rows={rows as Row[]} />;
  }

  const definition = findModuleDefinition(module);
  if (!definition) {
    notFound();
  }

  const rows = listModuleRows(database, definition);
  return <ModulePage definition={definition} rows={rows} />;
}
