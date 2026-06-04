import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "risk-rules", labelZh: "风险规则", labelEn: "Risk Rules", moduleId: "risk-rules" },
  { id: "exceptions", labelZh: "例外/违规", labelEn: "Exceptions", moduleId: "exceptions" },
  { id: "export", labelZh: "导出", labelEn: "Export", special: "export" }
];

export default function GovernanceWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="风控与导出"
      titleEn="Governance & Export"
      descriptionZh="把风控规则、例外审计和数据导出集中到治理工作台。"
      descriptionEn="Group risk rules, exception audit, and workbook export into one governance workspace."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="risk-rules"
    />
  );
}
