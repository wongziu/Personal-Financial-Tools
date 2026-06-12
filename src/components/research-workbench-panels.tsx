import { CalendarClockIcon, CheckCircle2Icon, FileTextIcon, LightbulbIcon, TargetIcon } from "lucide-react";
import { AiStockPicksPanel } from "@/components/ai-stock-picks-panel";
import { SourceIntelligencePanel } from "@/components/source-intelligence-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReferenceOption } from "@/lib/modules";
import type { Row } from "@/lib/services";

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as unknown[]).map(String).filter(Boolean);
    } catch {
      return [];
    }
  }

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function textValue(value: unknown, fallback = "N/A"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function securityLabel(securities: ReferenceOption[], securityId: unknown): string {
  return securities.find((security) => security.value === String(securityId ?? ""))?.label ?? textValue(securityId);
}

function securityLifecycleLabel(securities: ReferenceOption[], securityId: unknown): string {
  return securities.find((security) => security.value === String(securityId ?? ""))?.metadata.lifecycleLabel ?? "N/A";
}

function EmptyPanel({ children }: { children: string }) {
  return <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">{children}</div>;
}

export function InformationAnalysisPanel({
  securities,
  sources,
  theses
}: {
  securities: ReferenceOption[];
  sources: Row[];
  theses: Row[];
}) {
  return (
    <div className="grid gap-4" data-testid="information-analysis-panel">
      <SourceIntelligencePanel securities={securities} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileTextIcon className="size-4 text-primary" />
              最近资料事实
            </CardTitle>
            <CardDescription>从公告、财报、新闻或手工摘录中整理出来的关键事实。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {sources.length > 0 ? (
              sources.slice(0, 4).map((source) => (
                <div key={String(source.id)} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{textValue(source.source_name)}</div>
                    <Badge variant="outline">{textValue(source.evidence_level)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {securityLabel(securities, source.security_id)} · {textValue(source.information_date)}
                  </div>
                  <div className="mt-2 text-sm">{textValue(source.key_facts)}</div>
                  <div className="mt-2 text-xs text-muted-foreground">影响：{textValue(source.thesis_impact)}</div>
                </div>
              ))
            ) : (
              <EmptyPanel>还没有资料事实。先在上方粘贴公告、财报或新闻摘要生成草稿。</EmptyPanel>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LightbulbIcon className="size-4 text-primary" />
              当前投资观点
            </CardTitle>
            <CardDescription>把资料整理成能被自己复述的一句话判断和反证条件。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {theses.length > 0 ? (
              theses.slice(0, 4).map((thesis) => (
                <div key={String(thesis.id)} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{securityLabel(securities, thesis.security_id)}</div>
                    <Badge variant="secondary">{textValue(thesis.status)}</Badge>
                  </div>
                  <div className="mt-2 text-sm">{textValue(thesis.one_line_thesis)}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parseList(thesis.key_variables).slice(0, 4).map((item) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">下次复核：{textValue(thesis.next_review_date)}</div>
                </div>
              ))
            ) : (
              <EmptyPanel>还没有投资观点。先把资料整理成一句话判断和失效条件。</EmptyPanel>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AiStockPicksPage({ securities, strategies }: { securities: ReferenceOption[]; strategies: ReferenceOption[] }) {
  return <AiStockPicksPanel securities={securities} strategies={strategies} />;
}

export function DecisionCenterPanel({
  securities,
  tradeDecisions,
  reviewEvents
}: {
  securities: ReferenceOption[];
  tradeDecisions: Row[];
  reviewEvents: Row[];
}) {
  const activeDecisions = tradeDecisions.filter((decision) => ["Draft", "Submitted"].includes(String(decision.status ?? "")));
  const completedDecisions = tradeDecisions.filter((decision) => !["Draft", "Submitted"].includes(String(decision.status ?? "")));
  const pendingEvents = reviewEvents.filter((event) => String(event.status ?? "") === "Pending");
  const lifecycleSummary = [
    { bucket: "observed", label: "观察池" },
    { bucket: "holding", label: "持仓中" },
    { bucket: "exited", label: "已退出" },
    { bucket: "candidate", label: "候选池" }
  ].map((item) => ({
    ...item,
    count: securities.filter((security) => security.metadata.lifecycleBucket === item.bucket).length
  }));

  return (
    <div className="grid gap-4" data-testid="decision-center-panel">
      <div className="grid gap-3 md:grid-cols-4">
        {lifecycleSummary.map((item) => (
          <div key={item.bucket} className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold">{item.count}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TargetIcon className="size-4 text-primary" />
              待确认决策
            </CardTitle>
            <CardDescription>把 AI 或手工分析收束成可检查的买入、卖出、观察动作。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {activeDecisions.length > 0 ? (
              activeDecisions.slice(0, 5).map((decision) => (
                <div key={String(decision.id)} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{securityLabel(securities, decision.security_id)}</div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline">{securityLifecycleLabel(securities, decision.security_id)}</Badge>
                      <Badge variant="secondary">{textValue(decision.action)} · {textValue(decision.final_decision)}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">{textValue(decision.trigger)}</div>
                  <div className="mt-2 text-xs text-muted-foreground">主要风险：{textValue(decision.main_risks)}</div>
                </div>
              ))
            ) : (
              <EmptyPanel>暂时没有待确认决策。新的买入、卖出或观察动作会出现在这里。</EmptyPanel>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClockIcon className="size-4 text-primary" />
              观察与复核
            </CardTitle>
            <CardDescription>提醒自己何时回看，而不是每天被行情牵着走。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pendingEvents.length > 0 ? (
              pendingEvents.slice(0, 5).map((event) => (
                <div key={String(event.id)} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{securityLabel(securities, event.security_id)}</div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline">{securityLifecycleLabel(securities, event.security_id)}</Badge>
                      <Badge variant="outline">{textValue(event.expected_date)}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">{textValue(event.event_type)} · {textValue(event.importance)}</div>
                  <div className="mt-2 text-xs text-muted-foreground">要检查：{parseList(event.variables_to_check).join("、") || "N/A"}</div>
                </div>
              ))
            ) : (
              <EmptyPanel>暂时没有待复核事项。财报、风险事件和策略复盘会出现在这里。</EmptyPanel>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2Icon className="size-4 text-primary" />
              已完成记录
            </CardTitle>
            <CardDescription>保留已经关闭或执行完的决策，方便回看当时理由。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {completedDecisions.length > 0 ? (
              completedDecisions.slice(0, 5).map((decision) => (
                <div key={String(decision.id)} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{securityLabel(securities, decision.security_id)}</div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline">{securityLifecycleLabel(securities, decision.security_id)}</Badge>
                      <Badge variant="outline">{textValue(decision.status)}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">{textValue(decision.action)} · {textValue(decision.final_decision)}</div>
                  <div className="mt-2 text-xs text-muted-foreground">当时理由：{textValue(decision.trigger)}</div>
                </div>
              ))
            ) : (
              <EmptyPanel>还没有已完成决策。当前重点是确认待办和按时复核。</EmptyPanel>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
