"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  EyeIcon,
  FileTextIcon,
  HistoryIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  XCircleIcon,
  XIcon
} from "lucide-react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Language } from "@/lib/i18n";
import { translateText } from "@/lib/i18n";
import type { ReferenceOption } from "@/lib/modules";
import { cn } from "@/lib/utils";
import type {
  ResearchIterationActionRoute,
  ResearchIterationCandidate,
  ResearchIterationCandidateActionWorkflowResult,
  ResearchIterationMarket,
  ResearchIterationStrategyRunRecord,
  ResearchIterationUniverse,
  ResearchIterationWorkflowResult
} from "@/lib/research-iteration-workflow";

function localize(language: Language, zh: string, en: string): string {
  return language === "en-US" ? en : translateText(zh, language);
}

function actionLabel(candidate: ResearchIterationCandidate, language: Language): string {
  const zh: Record<ResearchIterationCandidate["recommendation"], string> = {
    DraftDecision: "可生成买入草案",
    Observe: "观察",
    CollectEvidence: "先补资料",
    CreateThesis: "先形成观点",
    Skip: "暂不买入"
  };
  const en: Record<ResearchIterationCandidate["recommendation"], string> = {
    DraftDecision: "Draft Buy Decision",
    Observe: "Observe",
    CollectEvidence: "Collect Evidence",
    CreateThesis: "Create Thesis",
    Skip: "Skip"
  };
  return localize(language, zh[candidate.recommendation], en[candidate.recommendation]);
}

function actionVariant(candidate: ResearchIterationCandidate): "default" | "secondary" | "outline" | "destructive" {
  if (candidate.recommendation === "DraftDecision") {
    return "default";
  }
  if (candidate.recommendation === "Skip") {
    return "destructive";
  }
  if (candidate.recommendation === "Observe") {
    return "secondary";
  }
  return "outline";
}

function scoreToneClass(score: number): string {
  if (score >= 75) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100";
  }
  if (score >= 60) {
    return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100";
  }
  if (score >= 45) {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100";
  }
  return "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100";
}

const marketOptions: Array<{ value: ResearchIterationMarket; zh: string; en: string }> = [
  { value: "all", zh: "全部", en: "All" },
  { value: "A-Share", zh: "A股", en: "A-Shares" },
  { value: "HK", zh: "港股", en: "Hong Kong" },
  { value: "US", zh: "美股", en: "U.S." }
];

const universeOptions: Array<{ value: ResearchIterationUniverse; zh: string; en: string }> = [
  { value: "active-research", zh: "默认研究范围", en: "Default Research" },
  { value: "observed", zh: "观察池", en: "Watchlist" },
  { value: "holding", zh: "持仓中", en: "Holdings" },
  { value: "candidate", zh: "候选池", en: "Candidate Pool" },
  { value: "exited", zh: "已退出复盘", en: "Exited Review" },
  { value: "researchable", zh: "全部可研究", en: "All Researchable" }
];

const actionRouteOptions: Array<{ value: ResearchIterationActionRoute; zh: string; en: string; icon: typeof SearchIcon }> = [
  { value: "CollectEvidence", zh: "补资料", en: "Collect Evidence", icon: SearchIcon },
  { value: "CreateThesis", zh: "建论点", en: "Create Thesis", icon: FileTextIcon },
  { value: "DraftDecision", zh: "生成草案", en: "Draft Decision", icon: ClipboardCheckIcon },
  { value: "Observe", zh: "加入观察", en: "Observe", icon: EyeIcon },
  { value: "Skip", zh: "暂不行动", en: "Skip", icon: XCircleIcon }
];

const lifecycleLabels: Record<string, { zh: string; en: string }> = {
  observed: { zh: "观察池", en: "Watchlist" },
  holding: { zh: "持仓中", en: "Holding" },
  exited: { zh: "已退出复盘", en: "Exited Review" },
  candidate: { zh: "候选池", en: "Candidate Pool" },
  blocked: { zh: "禁用", en: "Blocked" }
};

const progressTemplates = [
  { id: "strategy", zh: "读取策略", en: "Read Strategy" },
  { id: "universe", zh: "整理标的池", en: "Prepare Universe" },
  { id: "coverage", zh: "检查资料与论点", en: "Check Evidence" },
  { id: "screening", zh: "筛选候选", en: "Screen Candidates" },
  { id: "model-research", zh: "模型搜索研判", en: "Model Research" },
  { id: "advice", zh: "生成行动建议", en: "Generate Actions" }
] as const;

type ProgressStatus = "queued" | "running" | "completed" | "failed";

interface ProgressStage {
  id: string;
  title: string;
  status: ProgressStatus;
}

function matchesMarket(security: ReferenceOption, market: ResearchIterationMarket): boolean {
  return market === "all" || security.metadata.market === market;
}

function matchesUniverse(security: ReferenceOption, universe: ResearchIterationUniverse): boolean {
  const bucket = security.metadata.lifecycleBucket;
  if (universe === "active-research") {
    return ["observed", "holding", "candidate"].includes(bucket);
  }
  if (universe === "researchable") {
    return ["observed", "holding", "candidate", "exited"].includes(bucket);
  }
  return bucket === universe;
}

function lifecycleLabel(bucket: string | undefined, language: Language): string {
  const label = lifecycleLabels[bucket ?? ""] ?? lifecycleLabels.blocked;
  return localize(language, label.zh, label.en);
}

function actionRouteLabel(route: ResearchIterationActionRoute | undefined, language: Language): string {
  const option = actionRouteOptions.find((item) => item.value === route);
  return option ? localize(language, option.zh, option.en) : localize(language, "未选择", "Not Selected");
}

function actionRouteButtonClass(route: ResearchIterationActionRoute, isSelected: boolean): string {
  const base = "w-full justify-start border-l-4 bg-background text-left";
  const tones: Record<ResearchIterationActionRoute, string> = {
    CollectEvidence: "border-sky-500 text-sky-900 hover:bg-sky-50 dark:text-sky-100 dark:hover:bg-sky-950/30",
    CreateThesis: "border-amber-500 text-amber-900 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950/30",
    DraftDecision: "border-emerald-500 text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/30",
    Observe: "border-indigo-500 text-indigo-900 hover:bg-indigo-50 dark:text-indigo-100 dark:hover:bg-indigo-950/30",
    Skip: "border-slate-400 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/40"
  };
  return cn(base, tones[route], isSelected && "bg-muted font-semibold");
}

function candidateOutlook(candidate: ResearchIterationCandidate, language: Language): { label: string; description: string } {
  const zh: Record<ResearchIterationActionRoute, { label: string; description: string }> = {
    DraftDecision: {
      label: "当前看好",
      description: "资料和论点基础较完整，可进入决策草案前检查。"
    },
    CollectEvidence: {
      label: "信息不足",
      description: "先补齐关键资料，再判断是否升级为投资论点。"
    },
    CreateThesis: {
      label: "待建论点",
      description: "已有线索但缺少可复述的投资论点和失效条件。"
    },
    Observe: {
      label: "谨慎观察",
      description: "适合留在观察池，等待证据、价格或风险条件变化。"
    },
    Skip: {
      label: "当前看低",
      description: "当前风险或资料状态不支持继续推进。"
    }
  };
  const en: Record<ResearchIterationActionRoute, { label: string; description: string }> = {
    DraftDecision: {
      label: "Constructive",
      description: "Evidence and thesis coverage are sufficient for draft-decision checks."
    },
    CollectEvidence: {
      label: "Evidence Gap",
      description: "Collect key evidence before upgrading the idea."
    },
    CreateThesis: {
      label: "Needs Thesis",
      description: "The idea needs a clear thesis and invalidation conditions."
    },
    Observe: {
      label: "Watch",
      description: "Keep it on watch until evidence, price, or risk conditions change."
    },
    Skip: {
      label: "Avoid",
      description: "Current risk or evidence state does not support progress."
    }
  };
  return language === "en-US" ? en[candidate.recommendation] : zh[candidate.recommendation];
}

function marketOptionLabel(value: ResearchIterationMarket | undefined, language: Language): string {
  const option = marketOptions.find((item) => item.value === value);
  return option ? localize(language, option.zh, option.en) : localize(language, "全部", "All");
}

function universeOptionLabel(value: ResearchIterationUniverse | undefined, language: Language): string {
  const option = universeOptions.find((item) => item.value === value);
  return option ? localize(language, option.zh, option.en) : localize(language, "默认研究范围", "Default Research");
}

function countLabel(value: number, language: Language): string {
  return language === "en-US" ? `${value}` : `${value} 个`;
}

function createProgressStages(language: Language): ProgressStage[] {
  return progressTemplates.map((stage) => ({
    id: stage.id,
    title: localize(language, stage.zh, stage.en),
    status: "queued"
  }));
}

function advanceProgress(stages: ProgressStage[], index: number): ProgressStage[] {
  return stages.map((stage, stageIndex) => ({
    ...stage,
    status: stageIndex < index ? "completed" : stageIndex === index ? "running" : "queued"
  }));
}

function completeProgressFromResult(result: ResearchIterationWorkflowResult): ProgressStage[] {
  return result.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    status: stage.status === "completed" ? "completed" : "failed"
  }));
}

function resultFromHistoryRecord(record: ResearchIterationStrategyRunRecord): ResearchIterationWorkflowResult {
  return {
    triggerType: "strategy-run",
    runId: record.runId ?? record.strategyRunId,
    strategyId: record.strategyId,
    strategyVersionId: record.strategyVersionId,
    strategyRunId: record.strategyRunId,
    market: record.market,
    universe: record.universe,
    finalSummary: record.finalSummary,
    stages: [],
    candidates: record.candidates,
    reviewFindings: []
  };
}

function historyRecordFromResult(
  result: ResearchIterationWorkflowResult,
  strategies: ReferenceOption[]
): ResearchIterationStrategyRunRecord | null {
  if (!result.strategyRunId || !result.strategyId) {
    return null;
  }

  return {
    strategyRunId: result.strategyRunId,
    runId: result.runId,
    runDate: new Date().toISOString().slice(0, 10),
    strategyId: result.strategyId,
    strategyName: strategies.find((strategy) => strategy.value === result.strategyId)?.label ?? result.strategyId,
    strategyVersionId: result.strategyVersionId,
    market: result.market,
    universe: result.universe,
    universeSummary: result.market ?? "all",
    status: "Completed",
    finalSummary: result.finalSummary,
    candidates: result.candidates
  };
}

function replaceCandidateInResult(
  result: ResearchIterationWorkflowResult | null,
  updatedCandidate: ResearchIterationCandidate
): ResearchIterationWorkflowResult | null {
  if (!result) {
    return result;
  }

  return {
    ...result,
    candidates: result.candidates.map((candidate) => candidate.id === updatedCandidate.id ? updatedCandidate : candidate)
  };
}

function replaceCandidateInHistory(
  history: ResearchIterationStrategyRunRecord[],
  updatedCandidate: ResearchIterationCandidate
): ResearchIterationStrategyRunRecord[] {
  return history.map((record) => ({
    ...record,
    candidates: record.candidates.map((candidate) => candidate.id === updatedCandidate.id ? updatedCandidate : candidate)
  }));
}

function StockPickRunSummary({
  result,
  strategies,
  language
}: {
  result: ResearchIterationWorkflowResult;
  strategies: ReferenceOption[];
  language: Language;
}) {
  const strategyLabel = strategies.find((strategy) => strategy.value === result.strategyId)?.label ?? result.strategyId ?? "N/A";
  const draftCount = result.candidates.filter((candidate) => candidate.recommendation === "DraftDecision").length;
  const modelCount = result.candidates.filter((candidate) => candidate.modelAssessment?.mode === "model").length;
  const modelUnavailableCount = result.candidates.filter((candidate) => candidate.modelAssessment?.mode === "unavailable").length;
  const stats = [
    {
      label: localize(language, "策略", "Strategy"),
      value: strategyLabel
    },
    {
      label: localize(language, "市场 / 范围", "Market / Universe"),
      value: `${marketOptionLabel(result.market, language)} / ${universeOptionLabel(result.universe, language)}`
    },
    {
      label: localize(language, "候选标的", "Candidates"),
      value: countLabel(result.candidates.length, language)
    },
    {
      label: localize(language, "可进草案", "Draft-ready"),
      value: countLabel(draftCount, language)
    },
    {
      label: localize(language, "模型研判", "Model Research"),
      value: localize(language, `${modelCount} 已补充 / ${modelUnavailableCount} 未执行`, `${modelCount} completed / ${modelUnavailableCount} unavailable`)
    }
  ];

  return (
    <div className="rounded-md border bg-muted/20 p-3" data-testid="ai-stock-picks-summary">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          {localize(language, "运行摘要", "Run Summary")}
        </div>
        <Badge variant="secondary">{localize(language, "本次结果", "Current Run")}</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <div key={item.label} className="min-h-16 rounded-md border bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm font-semibold leading-snug">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border bg-background px-3 py-2 text-sm leading-relaxed">
        {result.finalSummary}
      </div>
    </div>
  );
}

function CandidateActionWorkflowCard({
  workflow,
  language
}: {
  workflow: ResearchIterationCandidateActionWorkflowResult;
  language: Language;
}) {
  return (
    <div className="mt-3 rounded-md border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/20" data-testid="candidate-action-workflow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SearchIcon className="size-4 text-sky-700 dark:text-sky-300" />
          {localize(language, "补资料工作流", "Evidence Workflow")}
        </div>
        <Badge variant="secondary">{workflow.runId}</Badge>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{workflow.finalSummary}</div>
      <div className="mt-3 grid gap-2">
        {workflow.stages.map((stage) => (
          <div key={stage.id} className="rounded-md border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              {stage.title}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.output}</div>
          </div>
        ))}
      </div>
      {workflow.sourceDraft ? (
        <div className="mt-3 rounded-md border bg-background p-3 text-xs">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{localize(language, "待确认资料草稿", "Draft Source")}</Badge>
            <span className="font-semibold">{workflow.sourceDraft.fields.sourceName}</span>
          </div>
          <div className="leading-relaxed text-muted-foreground">{workflow.sourceDraft.fields.keyFacts}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary">{workflow.sourceDraft.fields.evidenceLevel}</Badge>
            <Badge variant="secondary">{workflow.sourceDraft.fields.thesisImpact}</Badge>
            {workflow.nextActionRoute ? <Badge variant="outline">{localize(language, "下一步：建论点", "Next: Create Thesis")}</Badge> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AiStockPicksPanel({ securities, strategies }: { securities: ReferenceOption[]; strategies: ReferenceOption[] }) {
  const { language, t } = useLanguage();
  const [strategyId, setStrategyId] = useState(strategies[0]?.value ?? "");
  const [market, setMarket] = useState<ResearchIterationMarket>("all");
  const [universe, setUniverse] = useState<ResearchIterationUniverse>("active-research");
  const [securityId, setSecurityId] = useState("");
  const [result, setResult] = useState<ResearchIterationWorkflowResult | null>(null);
  const [candidateActionWorkflows, setCandidateActionWorkflows] = useState<Record<string, ResearchIterationCandidateActionWorkflowResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<ResearchIterationStrategyRunRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [savingCandidateId, setSavingCandidateId] = useState("");
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
  const [progressError, setProgressError] = useState("");
  const filteredSecurities = useMemo(
    () => securities.filter((security) => matchesMarket(security, market) && matchesUniverse(security, universe)),
    [market, securities, universe]
  );

  const updateStrategy = (value: string) => {
    setStrategyId(value);
    setResult(null);
    setCandidateActionWorkflows({});
  };

  const updateMarket = (value: string) => {
    const nextMarket = value as ResearchIterationMarket;
    setMarket(nextMarket);
    setResult(null);
    setCandidateActionWorkflows({});
    setProgressStages([]);
    setSecurityId((currentSecurityId) => {
      if (!currentSecurityId) {
        return "";
      }

      const currentSecurity = securities.find((security) => security.value === currentSecurityId);
      return currentSecurity && matchesMarket(currentSecurity, nextMarket) && matchesUniverse(currentSecurity, universe) ? currentSecurityId : "";
    });
  };

  const updateUniverse = (value: string) => {
    const nextUniverse = value as ResearchIterationUniverse;
    setUniverse(nextUniverse);
    setResult(null);
    setCandidateActionWorkflows({});
    setProgressStages([]);
    setSecurityId((currentSecurityId) => {
      if (!currentSecurityId) {
        return "";
      }

      const currentSecurity = securities.find((security) => security.value === currentSecurityId);
      return currentSecurity && matchesMarket(currentSecurity, market) && matchesUniverse(currentSecurity, nextUniverse) ? currentSecurityId : "";
    });
  };

  const updateSecurity = (value: string) => {
    setSecurityId(value);
    setResult(null);
    setCandidateActionWorkflows({});
  };

  const clearSecurity = () => {
    setSecurityId("");
    setResult(null);
    setCandidateActionWorkflows({});
  };

  const loadHistory = useCallback(() => {
    setIsLoadingHistory(true);
    setHistoryError("");

    void (async () => {
      try {
        const response = await fetch("/api/research-iteration-workflow?limit=6");
        const payload = (await response.json()) as { history?: ResearchIterationStrategyRunRecord[]; error?: string };
        if (!response.ok || !payload.history) {
          const message = payload.error ?? t.formError;
          setHistoryError(message);
          return;
        }

        setHistory(payload.history);
        const firstHistoryId = payload.history[0]?.strategyRunId ?? "";
        setSelectedHistoryId((current) => current || firstHistoryId);
        setResult((current) => current ?? (payload.history?.[0] ? resultFromHistoryRecord(payload.history[0]) : null));
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : t.formError);
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, [t.formError]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const showHistoryRecord = (record: ResearchIterationStrategyRunRecord) => {
    setSelectedHistoryId(record.strategyRunId);
    setResult(resultFromHistoryRecord(record));
    setCandidateActionWorkflows({});
    setProgressStages([]);
    setProgressError("");
  };

  const selectCandidateAction = (candidate: ResearchIterationCandidate, actionRoute: ResearchIterationActionRoute) => {
    setSavingCandidateId(candidate.id);
    const actionNote = [
      actionRouteLabel(actionRoute, language),
      candidate.modelAssessment?.suggestedAction ?? candidate.nextAction
    ].filter(Boolean).join("：");

    void (async () => {
      try {
        const response = await fetch("/api/research-iteration-workflow", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: candidate.id, actionRoute, actionNote })
        });
        const payload = (await response.json()) as {
          candidate?: ResearchIterationCandidate;
          actionWorkflow?: ResearchIterationCandidateActionWorkflowResult;
          error?: string;
        };
        if (!response.ok || !payload.candidate) {
          const message = payload.error ?? t.formError;
          toast.error(message);
          return;
        }

        setResult((current) => replaceCandidateInResult(current, payload.candidate!));
        setHistory((current) => replaceCandidateInHistory(current, payload.candidate!));
        if (payload.actionWorkflow) {
          setCandidateActionWorkflows((current) => ({
            ...current,
            [payload.actionWorkflow!.candidate.id]: payload.actionWorkflow!
          }));
        }
        toast.success(
          actionRoute === "CollectEvidence"
            ? localize(language, "补资料工作流已生成资料草稿", "Evidence workflow created a source draft")
            : localize(language, "下一行动路线已记录", "Next action recorded")
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t.formError);
      } finally {
        setSavingCandidateId("");
      }
    })();
  };

  const runStockPicker = () => {
    const initialStages = createProgressStages(language);
    const timers = progressTemplates.map((_, index) => window.setTimeout(() => {
      setProgressStages((current) => advanceProgress(current.length > 0 ? current : initialStages, index));
    }, index * 220));
    setProgressStages(advanceProgress(initialStages, 0));
    setProgressError("");
    setIsRunning(true);

    void (async () => {
      const requestBody: {
        triggerType: "strategy-run";
        strategyId: string;
        market: ResearchIterationMarket;
        universe: ResearchIterationUniverse;
        securityId?: string;
        question: string;
      } = {
        triggerType: "strategy-run",
        strategyId,
        market,
        universe,
        question: "基于内置策略更新自驱选股候选，给出买入、观察或暂不买入建议。"
      };
      if (securityId) {
        requestBody.securityId = securityId;
      }

      try {
        const response = await fetch("/api/research-iteration-workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
        const payload = (await response.json()) as { result?: ResearchIterationWorkflowResult; error?: string };

        if (!response.ok || !payload.result) {
          const message = payload.error ?? t.formError;
          setProgressError(message);
          setProgressStages((current) => current.map((stage) => stage.status === "running" ? { ...stage, status: "failed" } : stage));
          toast.error(message);
          return;
        }

        setResult(payload.result);
        setCandidateActionWorkflows({});
        const historyRecord = historyRecordFromResult(payload.result, strategies);
        if (historyRecord) {
          setHistory((current) => [historyRecord, ...current.filter((record) => record.strategyRunId !== historyRecord.strategyRunId)].slice(0, 6));
          setSelectedHistoryId(historyRecord.strategyRunId);
        }
        setProgressStages(completeProgressFromResult(payload.result));
        toast.success(localize(language, "AI 自驱选股已更新", "AI stock picks updated"));
      } catch (error) {
        const message = error instanceof Error ? error.message : t.formError;
        setProgressError(message);
        setProgressStages((current) => current.map((stage) => stage.status === "running" ? { ...stage, status: "failed" } : stage));
        toast.error(message);
      } finally {
        timers.forEach((timer) => window.clearTimeout(timer));
        setIsRunning(false);
      }
    })();
  };

  return (
    <Card data-testid="ai-stock-picks-panel">
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuitIcon className="size-4 text-primary" />
            {localize(language, "AI 自驱选股", "AI Stock Picks")}
          </CardTitle>
          <CardDescription>
            {localize(
              language,
              "基于内置策略、本地记录和模型检索研判更新候选标的，输出可读的买入、观察或暂不买入建议。",
              "Refresh candidate securities from built-in strategies, local records, and model research, with readable buy, observe, or skip guidance."
            )}
          </CardDescription>
        </div>
        {result ? <Badge variant="secondary">{localize(language, "已更新", "Updated")}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(180px,240px)_minmax(140px,180px)_minmax(160px,220px)_minmax(220px,1fr)_auto] xl:items-end">
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "内置策略", "Built-in Strategy")} help="" />
            <Select value={strategyId} onValueChange={updateStrategy}>
              <SelectTrigger aria-label={localize(language, "内置策略", "Built-in Strategy")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>{strategy.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "选股市场", "Stock Market")} help="" />
            <Select value={market} onValueChange={updateMarket}>
              <SelectTrigger aria-label={localize(language, "选股市场", "Stock Market")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {marketOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {localize(language, option.zh, option.en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "选股范围", "Universe")} help="" />
            <Select value={universe} onValueChange={updateUniverse}>
              <SelectTrigger aria-label={localize(language, "选股范围", "Universe")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {universeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {localize(language, option.zh, option.en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "参考标的", "Reference Security")} help="" />
            <div className="flex gap-2">
              <Select value={securityId} onValueChange={updateSecurity} disabled={filteredSecurities.length === 0}>
                <SelectTrigger aria-label={localize(language, "参考标的", "Reference Security")}>
                  <SelectValue
                    placeholder={
                      filteredSecurities.length === 0
                        ? localize(language, "该市场暂无标的", "No securities in this market")
                        : localize(language, "不限定标的", "No reference")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredSecurities.map((security) => (
                    <SelectItem key={security.value} value={security.value}>{security.label} · {lifecycleLabel(security.metadata.lifecycleBucket, language)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label={localize(language, "清空参考标的", "Clear Reference Security")}
                title={localize(language, "清空参考标的", "Clear Reference Security")}
                disabled={!securityId}
                onClick={clearSecurity}
              >
                <XIcon />
              </Button>
            </div>
          </div>
          <Button onClick={runStockPicker} disabled={isRunning || !strategyId}>
            <RefreshCwIcon data-icon="inline-start" />
            {localize(language, "立即更新选股", "Refresh Picks")}
          </Button>
        </div>

        {progressStages.length > 0 ? (
          <div className="rounded-md border bg-muted/20 p-3" data-testid="ai-stock-picks-progress">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{localize(language, "Agent 进度", "Agent Progress")}</div>
              {progressError ? <Badge variant="destructive">{localize(language, "失败", "Failed")}</Badge> : isRunning ? <Badge variant="secondary">{localize(language, "运行中", "Running")}</Badge> : <Badge variant="secondary">{localize(language, "已完成", "Completed")}</Badge>}
            </div>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              {progressStages.map((stage) => (
                <div key={stage.id} className="flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
                  {stage.status === "completed" ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : null}
                  {stage.status === "running" ? <Loader2Icon className="size-4 animate-spin text-primary" /> : null}
                  {stage.status === "failed" ? <AlertCircleIcon className="size-4 text-destructive" /> : null}
                  {stage.status === "queued" ? <span className="size-4 rounded-full border" aria-hidden /> : null}
                  <span className="truncate">{stage.title}</span>
                </div>
              ))}
            </div>
            {progressError ? <div className="mt-3 text-sm text-destructive">{progressError}</div> : null}
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-3" data-testid="ai-stock-picks-result">
            <StockPickRunSummary result={result} strategies={strategies} language={language} />
            {result.candidates.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result.candidates.map((candidate) => {
                  const outlook = candidateOutlook(candidate, language);
                  const actionWorkflow = candidateActionWorkflows[candidate.id];

                  return (
                    <div key={candidate.id} className="rounded-md border bg-background p-3" data-testid={`ai-stock-pick-card-${candidate.id}`}>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{candidate.rank}. {candidate.securityName}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline">{lifecycleLabel(candidate.lifecycleBucket, language)}</Badge>
                            <Badge variant={actionVariant(candidate)}>{actionLabel(candidate, language)}</Badge>
                          </div>
                        </div>
                        <div
                          className={cn("min-w-20 rounded-md border px-3 py-2 text-center", scoreToneClass(candidate.fitScore))}
                          data-testid="ai-stock-pick-score"
                        >
                          <div className="text-xs font-medium">{localize(language, "适配分", "Fit Score")}</div>
                          <div className="text-2xl font-bold leading-none">{candidate.fitScore}</div>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={candidate.recommendation === "Skip" ? "destructive" : candidate.recommendation === "DraftDecision" ? "default" : "secondary"}>
                            {outlook.label}
                          </Badge>
                          <span className="text-sm font-medium">{outlook.description}</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{candidate.nextAction}</div>
                      </div>
                      {candidate.modelAssessment ? (
                        <div className="mt-3 rounded-md border bg-muted/20 p-2 text-xs">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge variant={candidate.modelAssessment.mode === "model" ? "secondary" : "outline"}>
                              {candidate.modelAssessment.mode === "model"
                                ? localize(language, "模型搜索研判", "Model Research")
                                : localize(language, "模型未执行", "Model Unavailable")}
                            </Badge>
                            <span className="font-medium">{candidate.modelAssessment.judgement}</span>
                          </div>
                          <div className="text-muted-foreground">{candidate.modelAssessment.summary}</div>
                          <div className="mt-1">{localize(language, "模型建议", "Model Action")}: {candidate.modelAssessment.suggestedAction}</div>
                          {candidate.modelAssessment.evidenceHighlights.length > 0 ? (
                            <div className="mt-1 text-muted-foreground">
                              {localize(language, "线索", "Leads")}: {candidate.modelAssessment.evidenceHighlights.join("；")}
                            </div>
                          ) : null}
                          {candidate.modelAssessment.searchQueries.length > 0 ? (
                            <div className="mt-1 text-muted-foreground">
                              {localize(language, "检索词", "Search Queries")}: {candidate.modelAssessment.searchQueries.join("；")}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3 rounded-md border bg-muted/10 p-2">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold">{localize(language, "下一行动路线", "Next Action Route")}</span>
                          <Badge variant={candidate.actionStatus === "Selected" ? "secondary" : "outline"}>
                            {candidate.actionStatus === "Selected" && candidate.actionRoute
                              ? `${localize(language, "已选", "Selected")}：${actionRouteLabel(candidate.actionRoute, language)}`
                              : localize(language, "未选择", "Not Selected")}
                          </Badge>
                        </div>
                        <div className="grid gap-2" data-testid="ai-stock-pick-actions">
                          {actionRouteOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                              <Button
                                key={option.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={actionRouteButtonClass(option.value, candidate.actionRoute === option.value)}
                                disabled={savingCandidateId === candidate.id}
                                onClick={() => selectCandidateAction(candidate, option.value)}
                              >
                                <Icon data-icon="inline-start" />
                                {localize(language, option.zh, option.en)}
                              </Button>
                            );
                          })}
                        </div>
                        {candidate.actionNote ? <div className="mt-2 text-xs text-muted-foreground">{candidate.actionNote}</div> : null}
                      </div>
                      {actionWorkflow ? <CandidateActionWorkflowCard workflow={actionWorkflow} language={language} /> : null}
                      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                        <div>{localize(language, "入选原因", "Why")}: {candidate.matchedRules.join("；")}</div>
                        <div>{localize(language, "缺口", "Gaps")}: {candidate.missingEvidence.join("；") || "N/A"}</div>
                        <div>{localize(language, "风险", "Risks")}: {candidate.riskFlags.join("；") || "N/A"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                {localize(language, "当前市场暂无候选标的。可以切换市场，或先在标的模块补充该市场的标的。", "No candidates in this market yet. Switch markets or add securities for this market first.")}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {localize(language, "点击“立即更新选股”后，这里会显示候选标的、行动建议、入选原因和风险。", "Click Refresh Picks to show candidates, actions, rationale, and risks.")}
          </div>
        )}

        <div className="rounded-md border bg-muted/20 p-3" data-testid="ai-stock-picks-history">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HistoryIcon className="size-4 text-primary" />
              {localize(language, "历史运行", "Run History")}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadHistory} disabled={isLoadingHistory}>
              <RefreshCwIcon data-icon="inline-start" />
              {localize(language, "刷新记录", "Refresh")}
            </Button>
          </div>
          {historyError ? <div className="mb-2 text-sm text-destructive">{historyError}</div> : null}
          {history.length > 0 ? (
            <div className="grid gap-2">
              {history.map((record) => (
                <div key={record.strategyRunId} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{record.runDate}</span>
                      <Badge variant="outline">{record.strategyName}</Badge>
                      {record.market ? <Badge variant="secondary">{record.market}</Badge> : null}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm">{record.finalSummary}</div>
                  </div>
                  <Button
                    type="button"
                    variant={selectedHistoryId === record.strategyRunId ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => showHistoryRecord(record)}
                  >
                    <HistoryIcon data-icon="inline-start" />
                    {localize(language, "查看本次记录", "View Run")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
              {isLoadingHistory
                ? localize(language, "正在读取历史运行...", "Loading run history...")
                : localize(language, "暂无历史运行。执行一次选股后会自动记录，后续可复盘。", "No run history yet. Refresh picks once to create a reviewable record.")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
