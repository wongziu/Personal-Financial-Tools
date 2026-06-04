"use client";

import { useState, useTransition } from "react";
import { SparklesIcon, WandSparklesIcon } from "lucide-react";
import { toast } from "sonner";
import type { ReferenceOption } from "@/lib/modules";
import type { SourceDraftFields, SourceIntelligenceDraft } from "@/lib/source-intelligence";
import { FieldLabel, HeaderHelp } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { translateText, translateUiHelp, type Language } from "@/lib/i18n";

function localize(language: Language, zh: string, en: string): string {
  return language === "en-US" ? en : translateText(zh, language);
}

export function SourceIntelligencePanel({
  securities,
  onApplyDraft
}: {
  securities: ReferenceOption[];
  onApplyDraft: (draft: SourceDraftFields & { securityId?: string }) => void;
}) {
  const { language, t } = useLanguage();
  const [securityId, setSecurityId] = useState(securities[0]?.value ?? "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [draft, setDraft] = useState<SourceIntelligenceDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedSecurity = securities.find((security) => security.value === securityId);

  const generateDraft = () => {
    startTransition(async () => {
      const response = await fetch("/api/source-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          sourceUrl,
          securityName: selectedSecurity?.label
        })
      });
      const payload = (await response.json()) as { draft?: SourceIntelligenceDraft; error?: string };

      if (!response.ok || !payload.draft) {
        toast.error(payload.error ?? t.formError);
        return;
      }

      setDraft(payload.draft);
      toast.success(localize(language, "信息草稿已生成", "Source draft generated"));
    });
  };

  return (
    <Card className="border-primary/15 bg-primary/[0.03]" data-testid="source-intelligence-panel">
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <SparklesIcon className="size-4 text-primary" />
            <HeaderHelp label={localize(language, "信息智能获取", "Source Intelligence")} help={translateUiHelp("sourceIntelligence.panel", language)} />
          </CardTitle>
          <CardDescription>
            {localize(language, "先把外部资料整理成信息来源草稿，再复用到论点、复核事件和交易决策。", "Turn external material into a source draft that can later be reused by theses, review events, and trade decisions.")}
          </CardDescription>
        </div>
        {draft ? <Badge variant="secondary">{draft.mode === "model" ? "Model" : "Local"}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="grid gap-1.5">
            <FieldLabel label={localize(language, "关联标的", "Linked Security")} help={translateUiHelp("sourceIntelligence.security", language)} />
            <Select value={securityId} onValueChange={setSecurityId}>
              <SelectTrigger aria-label={localize(language, "关联标的", "Linked Security")}>
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
            <FieldLabel label={localize(language, "原始链接", "Source URL")} help={translateUiHelp("sourceIntelligence.url", language)} />
            <Input aria-label={localize(language, "原始链接", "Source URL")} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={generateDraft} disabled={isPending || !sourceText.trim()}>
            <WandSparklesIcon data-icon="inline-start" />
            {localize(language, "生成草稿", "Generate Draft")}
          </Button>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel label={localize(language, "资料正文", "Source Text")} help={translateUiHelp("sourceIntelligence.text", language)} />
          <Textarea aria-label={localize(language, "资料正文", "Source Text")} value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={5} />
        </div>
        {draft ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">{localize(language, "来源名称", "Source Name")}</div>
                <div className="text-sm font-medium">{draft.fields.sourceName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{localize(language, "证据等级 / 影响", "Evidence / Impact")}</div>
                <div className="text-sm font-medium">{draft.fields.evidenceLevel} · {draft.fields.thesisImpact}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{localize(language, "关键事实", "Key Facts")}</div>
              <div className="text-sm">{draft.fields.keyFacts}</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">{draft.notes}</div>
              <Button
                variant="outline"
                onClick={() =>
                  onApplyDraft({
                    ...draft.fields,
                    securityId
                  })
                }
              >
                {localize(language, "应用到新建记录", "Apply to New Record")}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
