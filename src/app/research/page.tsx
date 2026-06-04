import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "sources", labelZh: "信息来源", labelEn: "Sources", moduleId: "sources" },
  { id: "theses", labelZh: "投资论点", labelEn: "Theses", moduleId: "theses" },
  { id: "review-events", labelZh: "复核日历", labelEn: "Review Events", moduleId: "review-events" },
  { id: "trade-decisions", labelZh: "交易决策", labelEn: "Trade Decisions", special: "trade-decisions" }
];

export default function ResearchWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="研究工作台"
      titleEn="Research Workspace"
      descriptionZh="把信息来源、投资论点、复核事件和交易决策串成研究到执行的闭环。"
      descriptionEn="Connect sources, theses, review events, and trade decisions from research to execution."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="sources"
    />
  );
}
