import { AccountCalendarPage } from "@/components/account-calendar-page";
import { ExportPage } from "@/components/export-page";
import { ModulePage } from "@/components/module-page";
import { TradeDecisionsPage, type TradeDecisionReferenceOptions } from "@/components/trade-decisions-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DatabaseContext } from "@/lib/db/client";
import { buildModuleReferenceOptions, findModuleDefinition, listModuleRows } from "@/lib/modules";
import { getAccountCalendarData, getPriceEntrySecurities, type Row } from "@/lib/services";

export type WorkspaceTab =
  | { id: string; labelZh: string; labelEn: string; moduleId: string }
  | { id: string; labelZh: string; labelEn: string; special: "account-calendar" | "trade-decisions" | "export" };

function tradeDecisionReferenceOptions(database: DatabaseContext): TradeDecisionReferenceOptions {
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

function renderTabContent(database: DatabaseContext, tab: WorkspaceTab) {
  if ("special" in tab) {
    if (tab.special === "account-calendar") {
      return <AccountCalendarPage data={getAccountCalendarData(database)} />;
    }
    if (tab.special === "trade-decisions") {
      const rows = database.sqlite.prepare("SELECT * FROM trade_decisions ORDER BY rowid DESC").all() as Row[];
      return <TradeDecisionsPage rows={rows} referenceOptions={tradeDecisionReferenceOptions(database)} />;
    }
    return <ExportPage />;
  }

  const definition = findModuleDefinition(tab.moduleId);
  if (!definition) {
    return null;
  }

  return (
    <ModulePage
      definition={definition}
      rows={listModuleRows(database, definition)}
      referenceOptions={buildModuleReferenceOptions(database, definition)}
      priceEntrySecurities={tab.moduleId === "prices" ? getPriceEntrySecurities(database) : []}
    />
  );
}

export function ModuleWorkspace({
  titleZh,
  titleEn,
  descriptionZh,
  descriptionEn,
  database,
  tabs,
  defaultTab
}: {
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  database: DatabaseContext;
  tabs: WorkspaceTab[];
  defaultTab: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="hidden" lang="en">{titleEn}</span>
          {titleZh}
        </h1>
        <p className="text-sm text-muted-foreground">{descriptionZh} / {descriptionEn}</p>
      </div>
      <Tabs defaultValue={defaultTab} className="flex flex-col gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-lg border bg-background p-1.5 shadow-sm">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="min-h-10 rounded-md border border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-primary/15"
            >
              {tab.labelZh}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            {renderTabContent(database, tab)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
