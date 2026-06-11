"use client";

import { useState, useTransition } from "react";
import { BrainCircuitIcon, RefreshCwIcon } from "lucide-react";
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
import type { ResearchIterationWorkflowResult, ResearchIterationCandidate } from "@/lib/research-iteration-workflow";

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

export function AiStockPicksPanel({ securities, strategies }: { securities: ReferenceOption[]; strategies: ReferenceOption[] }) {
  const { language, t } = useLanguage();
  const [strategyId, setStrategyId] = useState(strategies[0]?.value ?? "");
  const [securityId, setSecurityId] = useState(securities[0]?.value ?? "");
  const [result, setResult] = useState<ResearchIterationWorkflowResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const runStockPicker = () => {
    startTransition(async () => {
      const response = await fetch("/api/research-iteration-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: "strategy-run",
          strategyId,
          securityId,
          question: "基于内置策略更新自驱选股候选，给出买入、观察或暂不买入建议。"
        })
      });
      const payload = (await response.json()) as { result?: ResearchIterationWorkflowResult; error?: string };

      if (!response.ok || !payload.result) {
        toast.error(payload.error ?? t.formError);
        return;
      }

      setResult(payload.result);
      toast.success(localize(language, "AI 自驱选股已更新", "AI stock picks updated"));
    });
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
              "基于内置策略和本地记录更新候选标的，输出可读的买入、观察或暂不买入建议。",
              "Refresh candidate securities from built-in strategies and local records, with readable buy, observe, or skip guidance."
            )}
          </CardDescription>
        </div>
        {result ? <Badge variant="secondary">{localize(language, "已更新", "Updated")}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(180px,240px)_minmax(180px,240px)_auto] md:items-end">
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "内置策略", "Built-in Strategy")} help="" />
            <Select value={strategyId} onValueChange={setStrategyId}>
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
            <FieldLabel label={localize(language, "参考标的", "Reference Security")} help="" />
            <Select value={securityId} onValueChange={setSecurityId}>
              <SelectTrigger aria-label={localize(language, "参考标的", "Reference Security")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {securities.map((security) => (
                  <SelectItem key={security.value} value={security.value}>{security.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runStockPicker} disabled={isPending || !strategyId}>
            <RefreshCwIcon data-icon="inline-start" />
            {localize(language, "立即更新选股", "Refresh Picks")}
          </Button>
        </div>

        {result ? (
          <div className="grid gap-3" data-testid="ai-stock-picks-result">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">{result.finalSummary}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {result.candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{candidate.rank}. {candidate.securityName}</div>
                      <div className="text-xs text-muted-foreground">{localize(language, "适配分", "Fit Score")} {candidate.fitScore}</div>
                    </div>
                    <Badge variant={actionVariant(candidate)}>{actionLabel(candidate, language)}</Badge>
                  </div>
                  <div className="mt-3 text-sm">{candidate.nextAction}</div>
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    <div>{localize(language, "入选原因", "Why")}: {candidate.matchedRules.join("；")}</div>
                    <div>{localize(language, "缺口", "Gaps")}: {candidate.missingEvidence.join("；") || "N/A"}</div>
                    <div>{localize(language, "风险", "Risks")}: {candidate.riskFlags.join("；") || "N/A"}</div>
                  </div>
                </div>
              ))}
            </div>
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
