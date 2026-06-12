"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuitIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileSearchIcon,
  GitBranchIcon,
  HistoryIcon,
  Loader2Icon,
  RefreshCwIcon,
  RouteIcon,
  Settings2Icon
} from "lucide-react";
import { useAppSettings } from "@/components/app-settings-provider";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { translateText } from "@/lib/i18n";
import type { ResearchAgentRunRecord, ResearchIterationTriggerType } from "@/lib/research-iteration-workflow";

function localize(language: Language, zh: string, en: string): string {
  return language === "en-US" ? en : translateText(zh, language);
}

const workflowSteps = [
  {
    id: "screening",
    zh: "入口 / 策略筛选",
    en: "Entry / Strategy Screening",
    detailZh: "选择市场、范围和策略，先用本地持仓、观察池和候选池筛出可研究标的。",
    detailEn: "Pick the market, universe, and strategy, then screen local holdings, watchlist, and candidates.",
    icon: GitBranchIcon
  },
  {
    id: "model-research",
    zh: "模型搜索研判",
    en: "Model Research",
    detailZh: "资料缺口标的自动触发模型检索式研判，输出可核对线索和未解决问题。",
    detailEn: "Candidates with evidence gaps trigger model-assisted research and unresolved-gap tracking.",
    icon: BrainCircuitIcon
  },
  {
    id: "candidate-action",
    zh: "候选行动",
    en: "Candidate Action",
    detailZh: "用户选择补资料、建论点、生成草案、观察或跳过，动作会进入运行记录。",
    detailEn: "The chosen route is recorded: collect evidence, create thesis, draft decision, observe, or skip.",
    icon: RouteIcon
  },
  {
    id: "source-draft",
    zh: "资料草稿确认",
    en: "Source Draft Review",
    detailZh: "点击补资料后生成待确认资料草稿，不直接写入正式信息来源。",
    detailEn: "Collect Evidence creates a reviewable draft source without saving it as a formal source.",
    icon: FileSearchIcon
  },
  {
    id: "decision",
    zh: "建论点 / 交易草案",
    en: "Thesis / Decision Draft",
    detailZh: "资料确认后再进入论点、交易草案和仓位护栏检查。",
    detailEn: "Confirmed evidence can move into thesis building, draft decisions, and position guardrails.",
    icon: ClipboardCheckIcon
  },
  {
    id: "review",
    zh: "复盘",
    en: "Review",
    detailZh: "运行、行动和阶段输出沉淀为历史操作，用于复盘判断质量。",
    detailEn: "Runs, actions, and stage outputs are kept for later review of decision quality.",
    icon: HistoryIcon
  }
] as const;

const marketLabels: Record<string, { zh: string; en: string }> = {
  all: { zh: "全部", en: "All" },
  "A-Share": { zh: "A股", en: "A-Shares" },
  HK: { zh: "港股", en: "Hong Kong" },
  US: { zh: "美股", en: "U.S." }
};

const universeLabels: Record<string, { zh: string; en: string }> = {
  "active-research": { zh: "默认研究范围", en: "Default Research" },
  observed: { zh: "观察池", en: "Watchlist" },
  holding: { zh: "持仓中", en: "Holdings" },
  candidate: { zh: "候选池", en: "Candidate Pool" },
  exited: { zh: "已退出复盘", en: "Exited Review" },
  researchable: { zh: "全部可研究", en: "All Researchable" }
};

function runTypeLabel(type: ResearchIterationTriggerType, language: Language): string {
  const labels: Record<ResearchIterationTriggerType, { zh: string; en: string }> = {
    "strategy-run": { zh: "策略运行", en: "Strategy Run" },
    "target-diagnosis": { zh: "标的诊断", en: "Target Diagnosis" },
    "review-session": { zh: "操作复盘", en: "Review Session" },
    "candidate-action": { zh: "候选行动", en: "Candidate Action" }
  };
  const label = labels[type];
  return localize(language, label.zh, label.en);
}

function settingsLabel(value: string, labels: Record<string, { zh: string; en: string }>, language: Language): string {
  const label = labels[value];
  return label ? localize(language, label.zh, label.en) : value;
}

function ResearchAgentHistory({ runs, language }: { runs: ResearchAgentRunRecord[]; language: Language }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        {localize(language, "暂无历史操作。执行选股或点击候选行动后，这里会显示每次运行和阶段输出。", "No operation history yet. Strategy runs and candidate actions will appear here.")}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {runs.map((run) => (
        <div key={run.runId} className="rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={run.runType === "candidate-action" ? "secondary" : "outline"}>{runTypeLabel(run.runType, language)}</Badge>
                <span>{run.runDate}</span>
                <span>{run.securityName ?? run.strategyName ?? run.reviewSessionId ?? run.runId}</span>
              </div>
              <div className="mt-2 text-sm font-medium leading-relaxed">{run.finalSummary}</div>
              {run.question ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run.question}</div> : null}
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <div className="font-mono">{run.runId}</div>
              <div>{localize(language, "阶段", "Stages")}：{run.stages.length}</div>
            </div>
          </div>
          {run.stages.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {run.stages.slice(0, 4).map((stage) => (
                <div key={`${run.runId}-${stage.id}`} className="rounded-md border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                    {stage.title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{stage.output}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ResearchAgentConsole() {
  const { language } = useLanguage();
  const { settings } = useAppSettings();
  const [runs, setRuns] = useState<ResearchAgentRunRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRuns = useMemo(
    () => async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/research-agent-runs?limit=12");
        const payload = (await response.json()) as { runs?: ResearchAgentRunRecord[]; error?: string };
        if (!response.ok || !payload.runs) {
          setError(payload.error ?? localize(language, "读取历史操作失败。", "Failed to load operation history."));
          return;
        }
        setRuns(payload.runs);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : localize(language, "读取历史操作失败。", "Failed to load operation history."));
      } finally {
        setIsLoading(false);
      }
    },
    [language]
  );

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const configuration = [
    {
      label: localize(language, "工作流状态", "Workflow Status"),
      value: settings.agentWorkflow.enabled ? localize(language, "启用", "Enabled") : localize(language, "关闭", "Disabled")
    },
    {
      label: localize(language, "默认市场", "Default Market"),
      value: settingsLabel(settings.agentWorkflow.defaultMarket, marketLabels, language)
    },
    {
      label: localize(language, "默认范围", "Default Universe"),
      value: settingsLabel(settings.agentWorkflow.defaultUniverse, universeLabels, language)
    },
    {
      label: localize(language, "模型候选上限", "Max Model Candidates"),
      value: String(settings.agentWorkflow.maxModelCandidates)
    },
    {
      label: localize(language, "人工确认门禁", "Human Approval Gate"),
      value: settings.agentWorkflow.requireHumanApproval ? localize(language, "开启", "On") : localize(language, "关闭", "Off")
    },
    {
      label: localize(language, "历史记录", "History"),
      value: settings.agentWorkflow.recordHistory ? localize(language, "保留", "Recorded") : localize(language, "不保留", "Not Recorded")
    }
  ];

  return (
    <div className="grid gap-4" data-testid="research-agent-console">
      <section className="rounded-md border bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <GitBranchIcon className="size-4 text-primary" />
          <h2 className="text-base font-semibold">工作流总览</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="min-h-28 rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex size-7 items-center justify-center rounded-md border bg-background text-xs">{index + 1}</span>
                    <span>{localize(language, step.zh, step.en)}</span>
                  </div>
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{localize(language, step.detailZh, step.detailEn)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings2Icon className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Agent 配置快照</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {configuration.map((item) => (
            <div key={item.label} className="rounded-md border bg-muted/20 px-3 py-2">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border bg-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-primary" />
            <h2 className="text-base font-semibold">历史操作</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRuns()} disabled={isLoading}>
            {isLoading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <RefreshCwIcon data-icon="inline-start" />}
            {localize(language, "刷新", "Refresh")}
          </Button>
        </div>
        {error ? <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {isLoading && runs.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            {localize(language, "正在读取历史操作...", "Loading operation history...")}
          </div>
        ) : (
          <ResearchAgentHistory runs={runs} language={language} />
        )}
      </section>
    </div>
  );
}
