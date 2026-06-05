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
import type { ResearchAiResult } from "@/lib/research-ai";

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

export function ResearchAiPanel({ securities }: { securities: ReferenceOption[] }) {
  const { language, t } = useLanguage();
  const [securityId, setSecurityId] = useState(securities[0]?.value ?? "");
  const [question, setQuestion] = useState(localize(language, "总结当前研究状态，并给出下一步复核问题。", "Summarize the current research state and next review questions."));
  const [result, setResult] = useState<ResearchAiResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAnalysis = () => {
    startTransition(async () => {
      const response = await fetch("/api/research-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityId, question })
      });
      const payload = (await response.json()) as { result?: ResearchAiResult; error?: string };

      if (!response.ok || !payload.result) {
        toast.error(payload.error ?? t.formError);
        return;
      }

      setResult(payload.result);
      toast.success(localize(language, "AI 研究分析已生成", "AI research analysis generated"));
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
        {result ? <Badge variant="secondary">{result.model}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[260px_1fr_auto] md:items-end">
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
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "研究问题", "Research Question")} help="" />
            <Textarea
              aria-label={localize(language, "研究问题", "Research Question")}
              value={question}
              rows={3}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <Button onClick={runAnalysis} disabled={isPending || !securityId || !question.trim()}>
            <SparklesIcon data-icon="inline-start" />
            {localize(language, "生成分析", "Generate Analysis")}
          </Button>
        </div>

        {result ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
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
