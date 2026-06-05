import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "prices", labelZh: "价格", labelEn: "Prices", moduleId: "prices" },
  { id: "fx-rates", labelZh: "汇率", labelEn: "FX Rates", moduleId: "fx-rates" }
];

export default function MarketDataWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="行情数据"
      titleEn="Market Data"
      descriptionZh="集中维护价格和汇率，补齐估值所需的行情覆盖。"
      descriptionEn="Maintain prices and FX rates as the valuation data inputs."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="prices"
    />
  );
}
