import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "accounts", labelZh: "账户", labelEn: "Accounts", moduleId: "accounts" },
  { id: "calendar", labelZh: "账户日历", labelEn: "Account Calendar", special: "account-calendar" },
  { id: "securities", labelZh: "标的", labelEn: "Securities", moduleId: "securities" }
];

export default function PortfolioWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="资产工作台"
      titleEn="Portfolio Workspace"
      descriptionZh="把账户、每日净值和标的主数据放在同一个工作流中维护。"
      descriptionEn="Maintain accounts, daily NAV, and security master data in one workflow."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="accounts"
    />
  );
}
