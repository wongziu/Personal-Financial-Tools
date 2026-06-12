"use client";

import { useState, useTransition } from "react";
import { BrainCircuitIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { FieldLabel } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/lib/i18n";
import { translateText } from "@/lib/i18n";
import type { ReferenceOption } from "@/lib/modules";
import type { ResearchAgentWorkflowResult } from "@/lib/research-agent-workflow";
import type { ResearchAiResult, ResearchAnalysisMode } from "@/lib/research-ai";
import type { ResearchIterationTriggerType, ResearchIterationWorkflowResult } from "@/lib/research-iteration-workflow";

function localize(language: Language, zh: string, en: string): string {
  return language === "en-US" ? en : translateText(zh, language);
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-1.5">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="grid gap-1 text-sm">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-md border bg-muted/30 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const analysisModeLabels: Record<ResearchAnalysisMode, { zh: string; en: string }> = {
  brief: { zh: "研究简报", en: "Research Brief" },
  "evidence-audit": { zh: "证据审计", en: "Evidence Audit" },
  "risk-catalyst": { zh: "风险催化", en: "Risk & Catalysts" },
  "decision-memo": { zh: "决策备忘", en: "Decision Memo" }
};

const iterationTriggerLabels: Record<ResearchIterationTriggerType, { zh: string; en: string }> = {
  "strategy-run": { zh: "策略运行", en: "Strategy Run" },
  "target-diagnosis": { zh: "标的诊断", en: "Target Diagnosis" },
  "review-session": { zh: "复盘会话", en: "Review Session" },
  "candidate-action": { zh: "候选行动", en: "Candidate Action" }
};
type SelectableIterationTriggerType = Exclude<ResearchIterationTriggerType, "candidate-action">;
const selectableIterationTriggerTypes: SelectableIterationTriggerType[] = ["strategy-run", "target-diagnosis", "review-session"];

function contextMetric(label: string, value: string | number | null) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "N/A"}</div>
    </div>
  );
}

export function ResearchAiPanel({ securities, strategies }: { securities: ReferenceOption[]; strategies: ReferenceOption[] }) {
  const { language, t } = useLanguage();
  const [securityId, setSecurityId] = useState(securities[0]?.value ?? "");
  const [strategyId, setStrategyId] = useState(strategies[0]?.value ?? "");
  const [analysisMode, setAnalysisMode] = useState<ResearchAnalysisMode>("brief");
  const [iterationTriggerType, setIterationTriggerType] = useState<SelectableIterationTriggerType>("strategy-run");
  const [question, setQuestion] = useState(localize(language, "总结当前研究状态，并给出下一步复核问题。", "Summarize the current research state and next review questions."));
  const [result, setResult] = useState<ResearchAiResult | null>(null);
  const [workflow, setWorkflow] = useState<ResearchAgentWorkflowResult | null>(null);
  const [iterationResult, setIterationResult] = useState<ResearchIterationWorkflowResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAnalysis = () => {
    startTransition(async () => {
      const response = await fetch("/api/research-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityId, question, analysisMode })
      });
      const payload = (await response.json()) as { result?: ResearchAiResult; error?: string };

      if (!response.ok || !payload.result) {
        toast.error(payload.error ?? t.formError);
        return;
      }

      setResult(payload.result);
      setWorkflow(null);
      setIterationResult(null);
      toast.success(localize(language, "AI 研究分析已生成", "AI research analysis generated"));
    });
  };

  const runAgentWorkflow = () => {
    startTransition(async () => {
      const response = await fetch("/api/research-agent-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityId, question, analysisMode })
      });
      const payload = (await response.json()) as { result?: ResearchAgentWorkflowResult; error?: string };

      if (!response.ok || !payload.result) {
        toast.error(payload.error ?? t.formError);
        return;
      }

      setWorkflow(payload.result);
      setResult(null);
      setIterationResult(null);
      toast.success(localize(language, "Agent 工作流已完成", "Agent workflow completed"));
    });
  };

  const runIterationWorkflow = () => {
    startTransition(async () => {
      const response = await fetch("/api/research-iteration-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: iterationTriggerType,
          strategyId,
          securityId,
          question
        })
      });
      const payload = (await response.json()) as { result?: ResearchIterationWorkflowResult; error?: string };

      if (!response.ok || !payload.result) {
        toast.error(payload.error ?? t.formError);
        return;
      }

      setIterationResult(payload.result);
      setWorkflow(null);
      setResult(null);
      toast.success(localize(language, "迭代工作流已完成", "Iteration workflow completed"));
    });
  };

  return (
    <Card data-testid="research-ai-panel">
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuitIcon className="size-4 text-primary" />
            {localize(language, "AI 研究分析", "AI Research Analysis")}
          </CardTitle>
          <CardDescription>
            {localize(language, "基于本地信息来源、论点、复核事件和交易决策调用模型生成可审查分析。", "Use the configured model to analyze local sources, theses, review events, and trade decisions.")}
          </CardDescription>
        </div>
        {result ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" data-testid="research-ai-mode-badge">{localize(language, analysisModeLabels[result.analysisMode].zh, analysisModeLabels[result.analysisMode].en)}</Badge>
            <Badge variant="outline">{result.model}</Badge>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[180px_180px_220px_1fr_auto] md:items-end">
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "迭代入口", "Iteration Entry")} help="" />
            <Select value={iterationTriggerType} onValueChange={(value) => setIterationTriggerType(value as SelectableIterationTriggerType)}>
              <SelectTrigger aria-label={localize(language, "迭代入口", "Iteration Entry")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectableIterationTriggerTypes.map((triggerType) => (
                  <SelectItem key={triggerType} value={triggerType}>
                    {localize(language, iterationTriggerLabels[triggerType].zh, iterationTriggerLabels[triggerType].en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "分析模式", "Analysis Mode")} help="" />
            <Select value={analysisMode} onValueChange={(value) => setAnalysisMode(value as ResearchAnalysisMode)}>
              <SelectTrigger aria-label={localize(language, "分析模式", "Analysis Mode")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(analysisModeLabels) as ResearchAnalysisMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {localize(language, analysisModeLabels[mode].zh, analysisModeLabels[mode].en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "分析标的", "Security")} help="" />
            <Select value={securityId} onValueChange={setSecurityId}>
              <SelectTrigger aria-label={localize(language, "分析标的", "Security")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {securities.map((security) => (
                  <SelectItem key={security.value} value={security.value}>
                    {security.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 md:col-span-2 lg:col-span-1">
            <FieldLabel label={localize(language, "分析策略", "Strategy")} help="" />
            <Select value={strategyId} onValueChange={setStrategyId}>
              <SelectTrigger aria-label={localize(language, "分析策略", "Strategy")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "研究问题", "Research Question")} help="" />
            <Textarea
              aria-label={localize(language, "研究问题", "Research Question")}
              value={question}
              rows={3}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={runAnalysis} disabled={isPending || !securityId || !question.trim()}>
              <SparklesIcon data-icon="inline-start" />
              {localize(language, "生成分析", "Generate Analysis")}
            </Button>
            <Button variant="outline" onClick={runAgentWorkflow} disabled={isPending || !securityId || !question.trim()}>
              <BrainCircuitIcon data-icon="inline-start" />
              {localize(language, "Agent 工作流", "Agent Workflow")}
            </Button>
            <Button variant="outline" onClick={runIterationWorkflow} disabled={isPending || !question.trim() || (iterationTriggerType !== "review-session" && !securityId) || (iterationTriggerType === "strategy-run" && !strategyId)}>
              <BrainCircuitIcon data-icon="inline-start" />
              {localize(language, "运行迭代工作流", "Run Iteration")}
            </Button>
          </div>
        </div>

        {iterationResult ? (
          <div className="grid gap-3 rounded-md border bg-background p-3" data-testid="research-iteration-workflow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">{localize(language, "迭代工作流", "Iteration Workflow")}</div>
                <div className="text-sm">{iterationResult.finalSummary}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{localize(language, iterationTriggerLabels[iterationResult.triggerType].zh, iterationTriggerLabels[iterationResult.triggerType].en)}</Badge>
                <Badge variant="outline">{iterationResult.runId}</Badge>
                {iterationResult.strategyRunId ? <Badge variant="outline">{iterationResult.strategyRunId}</Badge> : null}
                {iterationResult.reviewSessionId ? <Badge variant="outline">{iterationResult.reviewSessionId}</Badge> : null}
              </div>
            </div>
            {iterationResult.candidates.length > 0 ? (
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">{localize(language, "候选卡片", "Candidate Cards")}</div>
                {iterationResult.candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">{candidate.rank}. {candidate.securityName}</div>
                      <Badge variant="secondary">{candidate.fitScore}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{candidate.nextAction}</div>
                    <div className="mt-2 grid gap-1 text-xs">
                      <div>{localize(language, "缺失证据", "Missing Evidence")}: {candidate.missingEvidence.join("；")}</div>
                      <div>{localize(language, "风险标记", "Risk Flags")}: {candidate.riskFlags.join("；") || "N/A"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {iterationResult.reviewFindings.length > 0 ? (
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">{localize(language, "复盘发现", "Review Findings")}</div>
                {iterationResult.reviewFindings.map((finding) => (
                  <div key={finding.id} className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">{finding.findingType}</div>
                      <Badge variant="outline">{finding.severity}</Badge>
                    </div>
                    <div className="mt-1 text-sm">{finding.finding}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{finding.nextAction}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-2">
              {iterationResult.stages.map((stage) => (
                <div key={stage.id} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{stage.title}</div>
                    <Badge variant="secondary">{stage.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{stage.inputSummary}</div>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-2 text-xs leading-relaxed">{stage.output}</pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {workflow ? (
          <div className="grid gap-3 rounded-md border bg-background p-3" data-testid="research-agent-workflow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">{localize(language, "Agent 工作流", "Agent Workflow")}</div>
                <div className="text-sm">{workflow.finalSummary}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{localize(language, analysisModeLabels[workflow.analysisMode].zh, analysisModeLabels[workflow.analysisMode].en)}</Badge>
                <Badge variant="outline">{workflow.model}</Badge>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {contextMetric(localize(language, "信息来源", "Sources"), workflow.context.sourceCount)}
              {contextMetric(localize(language, "投资论点", "Theses"), workflow.context.thesisCount)}
              {contextMetric(localize(language, "复核事件", "Review Events"), workflow.context.reviewEventCount)}
              {contextMetric(localize(language, "交易决策", "Trade Decisions"), workflow.context.tradeDecisionCount)}
            </div>
            <div className="grid gap-2">
              {workflow.stages.map((stage) => (
                <div key={stage.id} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{stage.title}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={stage.status === "completed" ? "secondary" : "destructive"}>{stage.status}</Badge>
                      <span className="text-xs text-muted-foreground">{Math.round(stage.latencyMs)}ms</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{stage.inputSummary}</div>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-2 text-xs leading-relaxed">{stage.output}</pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {contextMetric(localize(language, "信息来源", "Sources"), result.context.sourceCount)}
              {contextMetric(localize(language, "投资论点", "Theses"), result.context.thesisCount)}
              {contextMetric(localize(language, "复核事件", "Review Events"), result.context.reviewEventCount)}
              {contextMetric(localize(language, "交易决策", "Trade Decisions"), result.context.tradeDecisionCount)}
              {contextMetric(localize(language, "最新信息日期", "Latest Source Date"), result.context.latestSourceDate)}
              {contextMetric(localize(language, "下一复核日期", "Next Review Date"), result.context.nextReviewDate)}
              {contextMetric(localize(language, "最近决策", "Latest Decision"), result.context.latestDecisionAction)}
              {contextMetric(localize(language, "分析标的", "Security"), [result.context.securityName, result.context.securityTicker].filter(Boolean).join(" · "))}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">{localize(language, "摘要", "Summary")}</div>
              <div className="text-sm">{result.analysis.summary}</div>
            </div>
            <ResultList title={localize(language, "证据要点", "Evidence Highlights")} items={result.analysis.evidenceHighlights} />
            <div>
              <div className="text-xs font-medium text-muted-foreground">{localize(language, "论点影响", "Thesis Impact")}</div>
              <div className="text-sm">{result.analysis.thesisImpact}</div>
            </div>
            <ResultList title={localize(language, "风险标记", "Risk Flags")} items={result.analysis.riskFlags} />
            <ResultList title={localize(language, "建议追问", "Suggested Questions")} items={result.analysis.suggestedQuestions} />
            <ResultList title={localize(language, "下一步动作", "Next Actions")} items={result.analysis.nextActions} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
