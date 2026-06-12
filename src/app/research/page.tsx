import { ModuleWorkspace, type WorkspaceTab } from "@/components/module-workspace";
import { getSeededDatabase } from "@/lib/app-db";

export const dynamic = "force-dynamic";

const tabs: WorkspaceTab[] = [
  { id: "information-analysis", labelZh: "信息分析", labelEn: "Information Analysis", special: "information-analysis" },
  { id: "ai-picks", labelZh: "AI 自驱选股", labelEn: "AI Stock Picks", special: "ai-picks" },
  { id: "my-decisions", labelZh: "我的决策", labelEn: "My Decisions", special: "decision-center" },
  { id: "agent-workflow", labelZh: "Agent 工作流", labelEn: "Agent Workflow", special: "agent-console" }
];

export default function ResearchWorkspacePage() {
  return (
    <ModuleWorkspace
      titleZh="研究工作台"
      titleEn="Research Workspace"
      descriptionZh="把外部信息整理成观点，用 AI 自驱选股发现机会，再收束成可执行决策。"
      descriptionEn="Turn external information into opinions, use AI stock picking to find opportunities, then convert them into actionable decisions."
      database={getSeededDatabase()}
      tabs={tabs}
      defaultTab="information-analysis"
    />
  );
}
