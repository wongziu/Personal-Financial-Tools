"use client";

import { useMemo, useState } from "react";
import { AlertCircleIcon, BrainCircuitIcon, CheckCircle2Icon, Loader2Icon, RefreshCwIcon, XIcon } from "lucide-react";
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
import type { ResearchIterationWorkflowResult, ResearchIterationCandidate, ResearchIterationMarket, ResearchIterationUniverse } from "@/lib/research-iteration-workflow";

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

export function AiStockPicksPanel({ securities, strategies }: { securities: ReferenceOption[]; strategies: ReferenceOption[] }) {
  const { language, t } = useLanguage();
  const [strategyId, setStrategyId] = useState(strategies[0]?.value ?? "");
  const [market, setMarket] = useState<ResearchIterationMarket>("all");
  const [universe, setUniverse] = useState<ResearchIterationUniverse>("active-research");
  const [securityId, setSecurityId] = useState("");
  const [result, setResult] = useState<ResearchIterationWorkflowResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
  const [progressError, setProgressError] = useState("");
  const filteredSecurities = useMemo(
    () => securities.filter((security) => matchesMarket(security, market) && matchesUniverse(security, universe)),
    [market, securities, universe]
  );

  const updateStrategy = (value: string) => {
    setStrategyId(value);
    setResult(null);
  };

  const updateMarket = (value: string) => {
    const nextMarket = value as ResearchIterationMarket;
    setMarket(nextMarket);
    setResult(null);
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
  };

  const clearSecurity = () => {
    setSecurityId("");
    setResult(null);
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
            <div className="rounded-md border bg-muted/20 p-3 text-sm">{result.finalSummary}</div>
            {result.candidates.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result.candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{candidate.rank}. {candidate.securityName}</div>
                        <div className="text-xs text-muted-foreground">{localize(language, "适配分", "Fit Score")} {candidate.fitScore}</div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Badge variant="outline">{lifecycleLabel(candidate.lifecycleBucket, language)}</Badge>
                        <Badge variant={actionVariant(candidate)}>{actionLabel(candidate, language)}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">{candidate.nextAction}</div>
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
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <div>{localize(language, "入选原因", "Why")}: {candidate.matchedRules.join("；")}</div>
                      <div>{localize(language, "缺口", "Gaps")}: {candidate.missingEvidence.join("；") || "N/A"}</div>
                      <div>{localize(language, "风险", "Risks")}: {candidate.riskFlags.join("；") || "N/A"}</div>
                    </div>
                  </div>
                ))}
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
      </CardContent>
    </Card>
  );
}
