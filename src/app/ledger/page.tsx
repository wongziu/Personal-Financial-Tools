import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "transactions", labelZh: "交易流水", labelEn: "Transactions", moduleId: "transactions" },
  { id: "cashflows", labelZh: "现金流", labelEn: "Cashflows", moduleId: "cashflows" },
  { id: "prices", labelZh: "价格", labelEn: "Prices", moduleId: "prices" },
  { id: "fx-rates", labelZh: "汇率", labelEn: "FX Rates", moduleId: "fx-rates" }
];

export default function LedgerWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="流水与行情"
      titleEn="Ledger & Market Data"
      descriptionZh="把交易、现金流、价格和汇率放在同一个估值数据工作流中处理。"
      descriptionEn="Handle trades, cashflows, prices, and FX rates in one valuation data workflow."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="transactions"
    />
  );
}
