import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "accounts", labelZh: "账户资料", labelEn: "Account Records", moduleId: "accounts" },
  { id: "calendar", labelZh: "账户日历", labelEn: "Account Calendar", special: "account-calendar" }
];

export default function AccountsWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="账户"
      titleEn="Accounts"
      descriptionZh="维护账户资料，并用账户日历核对净值、现金和外部出入金。"
      descriptionEn="Maintain account records and review NAV, cash, and external cashflows in the account calendar."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="accounts"
    />
  );
}
