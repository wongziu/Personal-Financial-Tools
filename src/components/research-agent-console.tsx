"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
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
import { toast } from "sonner";
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

type ResearchAgentHistoryFilter = ResearchIterationTriggerType | "all";

const historyFilterOptions: ResearchAgentHistoryFilter[] = ["all", "strategy-run", "candidate-action", "review-session", "target-diagnosis"];

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

function historyFilterLabel(type: ResearchAgentHistoryFilter, language: Language): string {
  return type === "all" ? localize(language, "全部", "All") : runTypeLabel(type, language);
}

function settingsLabel(value: string, labels: Record<string, { zh: string; en: string }>, language: Language): string {
  const label = labels[value];
  return label ? localize(language, label.zh, label.en) : value;
}

function runSubject(run: ResearchAgentRunRecord): string {
  return run.securityName ?? run.strategyName ?? run.reviewSessionId ?? run.runId;
}

function hasStage(run: ResearchAgentRunRecord, stageId: string): boolean {
  return run.stages.some((stage) => stage.id === stageId);
}

function totalLatencyMs(run: ResearchAgentRunRecord): number {
  return run.stages.reduce((total, stage) => total + stage.latencyMs, 0);
}

function actionQueueForRun(run: ResearchAgentRunRecord, language: Language): Array<{ title: string; detail: string }> {
  if (run.runType === "candidate-action" && hasStage(run, "source-draft")) {
    return [
      {
        title: localize(language, "确认资料草稿", "Review draft source"),
        detail: localize(language, "到信息分析确认资料事实，再决定是否写入正式来源。", "Review the draft evidence in Information Analysis before saving it as a formal source.")
      },
      {
        title: localize(language, "建论点或生成草案", "Build thesis or draft decision"),
        detail: localize(language, "资料确认后补齐投资论点、失效条件和复核日期。", "After evidence is confirmed, fill thesis, invalidation conditions, and review date.")
      },
      {
        title: localize(language, "进入复盘", "Keep for review"),
        detail: localize(language, "本次补资料行动已写入历史操作，可在复盘时检查是否执行到位。", "This evidence action is stored in history for later review.")
      }
    ];
  }

  if (run.runType === "strategy-run") {
    return [
      {
        title: localize(language, "选择候选行动", "Choose candidate route"),
        detail: localize(language, "回到 AI 自驱选股，为候选选择补资料、建论点、生成草案或观察。", "Return to AI Stock Picks and choose collect evidence, create thesis, draft decision, or observe.")
      },
      {
        title: localize(language, "检查模型缺口", "Check model gaps"),
        detail: localize(language, "先处理模型未执行或证据不足的候选，不把缺口直接升级成交易建议。", "Handle unavailable model checks and evidence gaps before upgrading an idea into a trade.")
      }
    ];
  }

  if (run.runType === "review-session") {
    return [
      {
        title: localize(language, "处理复盘发现", "Process review findings"),
        detail: localize(language, "先关闭待复核事件，再决定是否改策略版本。", "Close pending review events before changing strategy versions.")
      },
      {
        title: localize(language, "更新纪律规则", "Update discipline"),
        detail: localize(language, "把可执行的发现沉淀为下一次策略运行的约束。", "Turn actionable findings into constraints for the next strategy run.")
      }
    ];
  }

  return [
    {
      title: localize(language, "选择下一行动", "Choose next action"),
      detail: localize(language, "把诊断结论转入补资料、建论点、观察或交易草案。", "Turn the diagnosis into collect evidence, create thesis, observe, or draft decision.")
    }
  ];
}

function ResearchAgentOverview({ runs, language }: { runs: ResearchAgentRunRecord[]; language: Language }) {
  const stats = [
    {
      label: localize(language, "最近运行", "Recent Runs"),
      value: runs.length
    },
    {
      label: localize(language, "策略运行", "Strategy Runs"),
      value: runs.filter((run) => run.runType === "strategy-run").length
    },
    {
      label: localize(language, "候选行动", "Candidate Actions"),
      value: runs.filter((run) => run.runType === "candidate-action").length
    },
    {
      label: localize(language, "操作复盘", "Reviews"),
      value: runs.filter((run) => run.runType === "review-session").length
    },
    {
      label: localize(language, "阶段 Trace", "Trace Stages"),
      value: runs.reduce((total, run) => total + run.stages.length, 0)
    },
    {
      label: localize(language, "待确认草稿", "Drafts To Review"),
      value: runs.filter((run) => hasStage(run, "source-draft")).length
    }
  ];

  return (
    <section className="rounded-md border bg-background p-4" data-testid="research-agent-overview">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheckIcon className="size-4 text-primary" />
        <h2 className="text-base font-semibold">{localize(language, "运行概览", "Run Overview")}</h2>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => (
          <div key={item.label} className="rounded-md border bg-muted/20 px-3 py-2">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResearchAgentHistory({
  runs,
  language,
  selectedRunId,
  onSelectRun
}: {
  runs: ResearchAgentRunRecord[];
  language: Language;
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
}) {
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
                <span>{runSubject(run)}</span>
              </div>
              <div className="mt-2 text-sm font-medium leading-relaxed">{run.finalSummary}</div>
              {run.question ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run.question}</div> : null}
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <div className="font-mono">{run.runId}</div>
              <div>{localize(language, "阶段", "Stages")}：{run.stages.length}</div>
              <Button
                type="button"
                variant={selectedRunId === run.runId ? "secondary" : "outline"}
                size="sm"
                className="mt-2"
                onClick={() => onSelectRun(run.runId)}
              >
                {localize(language, "查看 Trace", "View Trace")}
              </Button>
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

function ResearchAgentTrace({ run, language }: { run: ResearchAgentRunRecord | undefined; language: Language }) {
  if (!run) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        {localize(language, "选择一条历史操作后查看完整阶段 Trace。", "Select an operation to inspect the full stage trace.")}
      </div>
    );
  }

  const actionQueue = actionQueueForRun(run, language);

  return (
    <section className="rounded-md border bg-background p-4" data-testid="research-agent-trace">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <RouteIcon className="size-4 text-primary" />
            <h2 className="text-base font-semibold">运行 Trace</h2>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{run.finalSummary}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="outline">{runTypeLabel(run.runType, language)}</Badge>
          <Badge variant="secondary">{run.status}</Badge>
          <Badge variant="outline">{run.runId}</Badge>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{localize(language, "日期", "Date")}</div>
          <div className="mt-1 text-sm font-semibold">{run.runDate}</div>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{localize(language, "对象", "Subject")}</div>
          <div className="mt-1 text-sm font-semibold">{runSubject(run)}</div>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{localize(language, "模型", "Model")}</div>
          <div className="mt-1 truncate text-sm font-semibold">{run.model}</div>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{localize(language, "阶段数", "Stages")}</div>
          <div className="mt-1 text-sm font-semibold">{run.stages.length}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-md border bg-muted/20 p-3" data-testid="research-agent-checkpoints">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">{localize(language, "运行检查点", "Run Checkpoints")}</div>
            <Badge variant="outline">{totalLatencyMs(run)}ms</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {run.stages.map((stage, index) => (
              <div key={`${run.runId}-checkpoint-${stage.id}`} className="flex items-start gap-2 rounded-md border bg-background p-2 text-xs">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border bg-muted/30">{index + 1}</span>
                <div className="min-w-0">
                  <div className="font-semibold">{stage.title}</div>
                  <div className="mt-1 line-clamp-2 text-muted-foreground">{stage.inputSummary || stage.output || "N/A"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border bg-muted/20 p-3" data-testid="agent-next-action-queue">
          <div className="mb-2 text-sm font-semibold">{localize(language, "下一步队列", "Next Action Queue")}</div>
          <div className="grid gap-2">
            {actionQueue.map((item) => (
              <div key={item.title} className="rounded-md border bg-background p-2 text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <ArrowRightIcon className="size-3.5 text-primary" />
                  {item.title}
                </div>
                <div className="mt-1 leading-relaxed text-muted-foreground">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {run.question ? (
        <div className="mt-3 rounded-md border bg-muted/20 p-3">
          <div className="text-xs font-semibold text-muted-foreground">{localize(language, "触发问题", "Question")}</div>
          <div className="mt-1 text-sm leading-relaxed">{run.question}</div>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3">
        {run.stages.map((stage, index) => (
          <div key={`${run.runId}-trace-${stage.id}`} className="rounded-md border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-6 items-center justify-center rounded-md border bg-background text-xs">{index + 1}</span>
                {stage.title}
              </div>
              <Badge variant="outline">{stage.latencyMs}ms</Badge>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[220px_1fr]">
              <div className="rounded-md border bg-background p-2">
                <div className="text-xs font-semibold text-muted-foreground">输入摘要</div>
                <div className="mt-1 text-xs leading-relaxed">{stage.inputSummary || "N/A"}</div>
              </div>
              <div className="rounded-md border bg-background p-2">
                <div className="text-xs font-semibold text-muted-foreground">{localize(language, "输出", "Output")}</div>
                <div className="mt-1 text-xs leading-relaxed">{stage.output || "N/A"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResearchAgentConsole() {
  const { language } = useLanguage();
  const { settings } = useAppSettings();
  const [runs, setRuns] = useState<ResearchAgentRunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [historyFilter, setHistoryFilter] = useState<ResearchAgentHistoryFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");

  const loadRuns = useCallback(
    async (preferredRunId?: string) => {
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
        setSelectedRunId((current) => {
          if (preferredRunId && payload.runs!.some((run) => run.runId === preferredRunId)) {
            return preferredRunId;
          }
          if (current && payload.runs!.some((run) => run.runId === current)) {
            return current;
          }
          return payload.runs![0]?.runId ?? "";
        });
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

  const runReviewSession = () => {
    setIsReviewing(true);
    setError("");

    void (async () => {
      try {
        const response = await fetch("/api/research-iteration-workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerType: "review-session",
            question: "从 Agent 控制台触发操作复盘，检查历史行动路线、待确认资料草稿和下一步纪律。"
          })
        });
        const payload = (await response.json()) as { result?: { runId?: string; finalSummary?: string }; error?: string };
        if (!response.ok || !payload.result?.runId) {
          const message = payload.error ?? localize(language, "操作复盘运行失败。", "Failed to run operation review.");
          setError(message);
          toast.error(message);
          return;
        }

        setHistoryFilter("all");
        await loadRuns(payload.result.runId);
        toast.success(payload.result.finalSummary ?? localize(language, "操作复盘已完成", "Operation review completed"));
      } catch (reviewError) {
        const message = reviewError instanceof Error ? reviewError.message : localize(language, "操作复盘运行失败。", "Failed to run operation review.");
        setError(message);
        toast.error(message);
      } finally {
        setIsReviewing(false);
      }
    })();
  };

  const selectedRun = runs.find((run) => run.runId === selectedRunId);
  const filteredRuns = useMemo(
    () => historyFilter === "all" ? runs : runs.filter((run) => run.runType === historyFilter),
    [historyFilter, runs]
  );

  useEffect(() => {
    if (filteredRuns.length === 0) {
      return;
    }
    if (!filteredRuns.some((run) => run.runId === selectedRunId)) {
      setSelectedRunId(filteredRuns[0].runId);
    }
  }, [filteredRuns, selectedRunId]);

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

      <ResearchAgentOverview runs={runs} language={language} />

      <section className="rounded-md border bg-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-primary" />
            <h2 className="text-base font-semibold">历史操作</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={runReviewSession} disabled={isReviewing}>
              {isReviewing ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <HistoryIcon data-icon="inline-start" />}
              {localize(language, "运行操作复盘", "Run Operation Review")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadRuns()} disabled={isLoading}>
              {isLoading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <RefreshCwIcon data-icon="inline-start" />}
              {localize(language, "刷新", "Refresh")}
            </Button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2" data-testid="research-agent-history-filters">
          {historyFilterOptions.map((option) => {
            const count = option === "all" ? runs.length : runs.filter((run) => run.runType === option).length;
            return (
              <Button
                key={option}
                type="button"
                variant={historyFilter === option ? "secondary" : "outline"}
                size="sm"
                onClick={() => setHistoryFilter(option)}
              >
                {historyFilterLabel(option, language)}
                <Badge variant="outline" className="ml-1">{count}</Badge>
              </Button>
            );
          })}
        </div>
        {error ? <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {isLoading && runs.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            {localize(language, "正在读取历史操作...", "Loading operation history...")}
          </div>
        ) : (
          <ResearchAgentHistory runs={filteredRuns} language={language} selectedRunId={selectedRunId} onSelectRun={setSelectedRunId} />
        )}
      </section>

      <ResearchAgentTrace run={selectedRun} language={language} />
    </div>
  );
}
