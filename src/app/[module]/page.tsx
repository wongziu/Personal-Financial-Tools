import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { TradeDecisionsPage, type TradeDecisionReferenceOptions } from "@/components/trade-decisions-page";
import { getSeededDatabase } from "@/lib/app-db";
import { buildModuleReferenceOptions, findModuleDefinition, listModuleRows } from "@/lib/modules";
import { getSecurityLifecycleEntries } from "@/lib/security-lifecycle";
import { getPriceEntrySecurities, type Row } from "@/lib/services";

export const dynamic = "force-dynamic";

function tradeDecisionReferenceOptions(database: ReturnType<typeof getSeededDatabase>): TradeDecisionReferenceOptions {
  const securities = database.sqlite
    .prepare("SELECT id, name, ticker FROM securities ORDER BY rowid DESC")
    .all() as Row[];
  const theses = database.sqlite
    .prepare("SELECT id, one_line_thesis, security_id FROM theses ORDER BY rowid DESC")
    .all() as Row[];
  const sources = database.sqlite
    .prepare("SELECT id, source_name, information_date, security_id FROM information_sources ORDER BY rowid DESC")
    .all() as Row[];

  return {
    securityId: securities.map((row) => ({
      value: String(row.id),
      label: String(row.name),
      metadata: {}
    })),
    thesisId: theses.map((row) => ({
      value: String(row.id),
      label: String(row.one_line_thesis),
      metadata: { security_id: row.security_id === null ? "" : String(row.security_id) }
    })),
    sourceIds: sources.map((row) => ({
      value: String(row.id),
      label: [row.source_name, row.information_date].filter(Boolean).map(String).join(" · "),
      metadata: { security_id: row.security_id === null ? "" : String(row.security_id) }
    }))
  };
}

export default async function DynamicModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const database = getSeededDatabase();

  if (module === "trade-decisions") {
    const rows = database.sqlite.prepare("SELECT * FROM trade_decisions ORDER BY rowid DESC").all();
    return <TradeDecisionsPage rows={rows as Row[]} referenceOptions={tradeDecisionReferenceOptions(database)} />;
  }

  const definition = findModuleDefinition(module);
  if (!definition) {
    notFound();
  }

  const rows = listModuleRows(database, definition);
  const referenceOptions = buildModuleReferenceOptions(database, definition);
  const priceEntrySecurities = module === "prices" ? getPriceEntrySecurities(database) : [];
  const securityLifecycleEntries = module === "securities" ? getSecurityLifecycleEntries(database) : [];
  return (
    <ModulePage
      definition={definition}
      rows={rows}
      referenceOptions={referenceOptions}
      priceEntrySecurities={priceEntrySecurities}
      securityLifecycleEntries={securityLifecycleEntries}
    />
  );
}
