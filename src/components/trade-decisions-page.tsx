"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDaysIcon, FilterXIcon, ShieldAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Row } from "@/lib/services";
import { FieldLabel, HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { translateColumn, translateColumnHelp, translateEnum, translateUiHelp, type Language } from "@/lib/i18n";
import { buildCalendarMonth, filterRowsByDate, getDefaultMonth, summarizeRows, type DateFilterMode } from "@/lib/module-interactions";
import type { ReferenceOption } from "@/lib/modules";

export interface TradeDecisionReferenceOptions {
  securityId: ReferenceOption[];
  thesisId: ReferenceOption[];
  sourceIds: ReferenceOption[];
}

const defaultDecisionBase = {
  securityId: "",
  thesisId: "",
  strategyType: "Active",
  action: "Buy",
  currentPrice: "210",
  plannedPriceMin: "208",
  plannedPriceMax: "212",
  plannedAmountBase: "120000",
  preTradeWeight: "0.04",
  postTradeWeight: "0.12",
  maxAllowedWeight: "0.10",
  trigger: "NewFact",
  expectedReturnSource: "EarningsGrowth",
  mainRisks: "Valuation, USD exposure, AI capex cycle",
  downsideLossBase: "25000",
  stopLossOrInvalidation: "Pause additions if two quarters miss order conversion.",
  hasSimilarThemeExposure: "true",
  similarThemeExposure: "0.22",
  touchesLimits: "true",
  isRuleException: "false",
  emotionTag: "Calm",
  finalDecision: "Execute",
  sourceIds: ""
};

function weekdayLabels(language: Language): string[] {
  return language === "en-US" ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "一", "二", "三", "四", "五", "六"];
}

function firstMatchingBySecurity(options: ReferenceOption[], securityId: string): ReferenceOption | undefined {
  if (!securityId) {
    return options[0];
  }
  return options.find((option) => option.metadata.security_id === securityId);
}

function initialDecision(referenceOptions: TradeDecisionReferenceOptions): typeof defaultDecisionBase {
  const securityId = referenceOptions.securityId[0]?.value ?? "";
  const thesisId = firstMatchingBySecurity(referenceOptions.thesisId, securityId)?.value ?? "";
  const sourceIds = firstMatchingBySecurity(referenceOptions.sourceIds, securityId)?.value ?? "";

  return {
    ...defaultDecisionBase,
    securityId,
    thesisId,
    sourceIds
  };
}

function selectedSourceIds(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function TradeDecisionsPage({
  rows,
  referenceOptions
}: {
  rows: Row[];
  referenceOptions: TradeDecisionReferenceOptions;
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialDecision(referenceOptions));
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => getDefaultMonth(rows, "decision_time"));
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const label = (column: string) => translateColumn("trade_decisions", column, language);
  const help = (column: string) => translateColumnHelp("trade_decisions", column, language);
  const currentDateRange =
    dateFilterMode === "last30"
      ? t.last30Days
      : dateFilterMode === "month"
        ? `${t.selectedMonth}: ${selectedMonth}`
        : dateFilterMode === "day" && selectedDay
          ? `${t.selectedDay}: ${selectedDay}`
          : t.allDates;
  const filteredRows = useMemo(
    () =>
      filterRowsByDate(rows, "decision_time", {
        mode: dateFilterMode,
        month: selectedMonth,
        day: selectedDay
      }),
    [dateFilterMode, rows, selectedDay, selectedMonth]
  );
  const calendarDays = useMemo(() => buildCalendarMonth(rows, "decision_time", selectedMonth), [rows, selectedMonth]);
  const summary = useMemo(() => summarizeRows(rows, filteredRows, "decision_time"), [filteredRows, rows]);
  const weekDays = weekdayLabels(language);
  const formLabel = (column: string) => {
    if (column === "security_id") {
      return language === "en-US" ? "Security" : language === "zh-TW" ? "標的" : "标的";
    }
    if (column === "thesis_id") {
      return language === "en-US" ? "Thesis" : language === "zh-TW" ? "論點" : "论点";
    }
    if (column === "source_ids") {
      return language === "en-US" ? "Sources" : language === "zh-TW" ? "資訊來源" : "信息来源";
    }
    return label(column);
  };
  const thesisOptions = useMemo(
    () => referenceOptions.thesisId.filter((option) => !form.securityId || option.metadata.security_id === form.securityId),
    [form.securityId, referenceOptions.thesisId]
  );
  const sourceOptions = useMemo(
    () => referenceOptions.sourceIds.filter((option) => !form.securityId || option.metadata.security_id === form.securityId),
    [form.securityId, referenceOptions.sourceIds]
  );

  const setDialogOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm(initialDecision(referenceOptions));
    }
  };

  const setField = (field: keyof typeof defaultDecisionBase, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "securityId") {
        const matchingThesis = firstMatchingBySecurity(referenceOptions.thesisId, value);
        const currentThesis = referenceOptions.thesisId.find((option) => option.value === current.thesisId);
        if (!currentThesis || currentThesis.metadata.security_id !== value) {
          next.thesisId = matchingThesis?.value ?? "";
        }

        const matchingSource = firstMatchingBySecurity(referenceOptions.sourceIds, value);
        const currentSources = selectedSourceIds(current.sourceIds);
        const hasMatchingSource = currentSources.some((sourceId) => {
          const source = referenceOptions.sourceIds.find((option) => option.value === sourceId);
          return source?.metadata.security_id === value;
        });
        if (!hasMatchingSource) {
          next.sourceIds = matchingSource?.value ?? "";
        }
      }

      return next;
    });
  };

  const submit = () => {
    startTransition(async () => {
      const response = await fetch("/api/trade-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourceIds: selectedSourceIds(form.sourceIds)
        })
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      const result = (await response.json()) as { exceptionDraftId?: string };
      toast.success(result.exceptionDraftId ? `${t.formSaved}: ${result.exceptionDraftId}` : t.formSaved);
      setDialogOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {t.tradeDecisions}
            <HelpTooltip content={translateUiHelp("tradeDecisions.page", language)} label={t.tradeDecisions} />
          </h1>
          <p className="text-sm text-muted-foreground">{t.weakRiskDescription}</p>
        </div>
        <Dialog open={open} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <ShieldAlertIcon data-icon="inline-start" />
              {t.createDecision}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t.createDecision}</DialogTitle>
              <DialogDescription>{t.riskCheck}</DialogDescription>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>{t.riskCheck}</span>
                <HelpTooltip content={translateUiHelp("tradeDecisions.riskCheck", language)} label={t.riskCheck} />
              </div>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-3">
              <ReferenceSelectField label={formLabel("security_id")} help={help("security_id")} value={form.securityId} options={referenceOptions.securityId} required onChange={(value) => setField("securityId", value)} />
              <ReferenceSelectField label={formLabel("thesis_id")} help={help("thesis_id")} value={form.thesisId} options={thesisOptions} onChange={(value) => setField("thesisId", value)} />
              <SelectField language={language} label={label("strategy_type")} help={help("strategy_type")} value={form.strategyType} options={["Core", "Active", "Trading", "Experimental"]} required onChange={(value) => setField("strategyType", value)} />
              <SelectField language={language} label={label("action")} help={help("action")} value={form.action} options={["Buy", "Add", "Reduce", "Exit", "NoAction"]} required onChange={(value) => setField("action", value)} />
              <Field label={label("current_price")} help={help("current_price")} type="number" value={form.currentPrice} required onChange={(value) => setField("currentPrice", value)} />
              <Field label={label("planned_amount_base")} help={help("planned_amount_base")} type="number" value={form.plannedAmountBase} required onChange={(value) => setField("plannedAmountBase", value)} />
              <Field label={label("planned_price_min")} help={help("planned_price_min")} type="number" value={form.plannedPriceMin} required onChange={(value) => setField("plannedPriceMin", value)} />
              <Field label={label("planned_price_max")} help={help("planned_price_max")} type="number" value={form.plannedPriceMax} required onChange={(value) => setField("plannedPriceMax", value)} />
              <Field label={label("pre_trade_weight")} help={help("pre_trade_weight")} type="number" value={form.preTradeWeight} required onChange={(value) => setField("preTradeWeight", value)} />
              <Field label={label("post_trade_weight")} help={help("post_trade_weight")} type="number" value={form.postTradeWeight} required onChange={(value) => setField("postTradeWeight", value)} />
              <Field label={label("max_allowed_weight")} help={help("max_allowed_weight")} type="number" value={form.maxAllowedWeight} required onChange={(value) => setField("maxAllowedWeight", value)} />
              <Field label={label("similar_theme_exposure")} help={help("similar_theme_exposure")} type="number" value={form.similarThemeExposure} required onChange={(value) => setField("similarThemeExposure", value)} />
              <Field label={label("trigger")} help={help("trigger")} value={form.trigger} required onChange={(value) => setField("trigger", value)} />
              <Field label={label("expected_return_source")} help={help("expected_return_source")} value={form.expectedReturnSource} required onChange={(value) => setField("expectedReturnSource", value)} />
              <Field label={label("downside_loss_base")} help={help("downside_loss_base")} type="number" value={form.downsideLossBase} required onChange={(value) => setField("downsideLossBase", value)} />
              <SelectField language={language} label={label("emotion_tag")} help={help("emotion_tag")} value={form.emotionTag} options={["Calm", "FOMO", "RevengeTrade", "Fear", "RecoverLoss", "Other"]} required onChange={(value) => setField("emotionTag", value)} />
              <SelectField language={language} label={label("final_decision")} help={help("final_decision")} value={form.finalDecision} options={["Execute", "Abandon", "Delay"]} required onChange={(value) => setField("finalDecision", value)} />
              <div className="md:col-span-3">
                <SourceChecklistField
                  label={formLabel("source_ids")}
                  help={help("source_ids")}
                  noRecordsLabel={t.noRecords}
                  value={form.sourceIds}
                  options={sourceOptions}
                  onChange={(value) => setField("sourceIds", value)}
                />
              </div>
              <div className="md:col-span-3">
                <TextField label={label("main_risks")} help={help("main_risks")} value={form.mainRisks} required onChange={(value) => setField("mainRisks", value)} />
              </div>
              <div className="md:col-span-3">
                <TextField label={label("stop_loss_or_invalidation")} help={help("stop_loss_or_invalidation")} value={form.stopLossOrInvalidation} required onChange={(value) => setField("stopLossOrInvalidation", value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {t.submitDecision}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={t.totalRecords} help={translateUiHelp("module.totalRecords", language)} />
            </CardDescription>
            <CardTitle className="text-xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={t.visibleRecords} help={translateUiHelp("module.visibleRecords", language)} />
            </CardDescription>
            <CardTitle className="text-xl">{summary.visible}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={t.latestDate} help={translateUiHelp("module.latestDate", language)} />
            </CardDescription>
            <CardTitle className="text-xl">{summary.latestDate ?? "N/A"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDaysIcon className="size-4 text-primary" />
              <HeaderHelp label={t.dateDimension} help={translateUiHelp("module.dateDimension", language)} />
            </CardTitle>
            <CardDescription>
              {label("decision_time")} · {currentDateRange}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFilterMode("all");
              setSelectedDay(undefined);
            }}
          >
            <FilterXIcon data-icon="inline-start" />
            {t.clearDateFilter}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
            <div className="grid gap-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                <HeaderHelp label={t.selectedMonth} help={translateUiHelp("module.selectedMonth", language)} />
              </div>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedDay(undefined);
                  setDateFilterMode("month");
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateFilterMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDateFilterMode("all");
                  setSelectedDay(undefined);
                }}
              >
                {t.allDates}
              </Button>
              <Button
                variant={dateFilterMode === "last30" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDateFilterMode("last30");
                  setSelectedDay(undefined);
                }}
              >
                {t.last30Days}
              </Button>
              <Button
                variant={dateFilterMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDateFilterMode("month");
                  setSelectedDay(undefined);
                }}
              >
                {t.selectedMonth}
              </Button>
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">
                  <HeaderHelp label={t.calendarActivity} help={translateUiHelp("module.calendarActivity", language)} />
                </div>
                <div className="text-xs text-muted-foreground">{selectedMonth}</div>
              </div>
              <Badge variant="secondary">{currentDateRange}</Badge>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {weekDays.map((day, index) => (
                <div key={`${day}-${index}`} className="py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => (
                <button
                  type="button"
                  key={day.date}
                  aria-label={`${day.date} ${day.count} ${t.recordsOnDate}`}
                  style={{ gridColumnStart: day.day === 1 ? day.weekday + 1 : undefined }}
                  onClick={() => {
                    setSelectedDay(day.date);
                    setDateFilterMode("day");
                  }}
                  className={[
                    "flex min-h-12 flex-col items-start justify-between rounded-md border p-2 text-left text-xs transition-colors hover:border-primary hover:bg-primary/5",
                    selectedDay === day.date ? "border-primary bg-primary/10 text-primary" : "bg-background",
                    day.count > 0 ? "font-medium" : "text-muted-foreground"
                  ].join(" ")}
                >
                  <span>{day.day}</span>
                  <span className={day.count > 0 ? "rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground" : "text-[10px]"}>
                    {day.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <HeaderHelp label={t.tradeDecisions} help={translateUiHelp("module.table", language)} />
          </CardTitle>
          <CardDescription>
            {filteredRows.length} {t.records}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {["id", "decision_time", "security_id", "action", "post_trade_weight", "final_decision", "status"].map((column) => (
                  <TableHead key={column}>
                    <HeaderHelp label={translateColumn("trade_decisions", column, language)} help={translateColumnHelp("trade_decisions", column, language)} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell>{String(row.id)}</TableCell>
                  <TableCell>{String(row.decision_time)}</TableCell>
                  <TableCell>{String(row.security_id)}</TableCell>
                  <TableCell>{translateEnum(row.action, language)}</TableCell>
                  <TableCell>{(Number(row.post_trade_weight) * 100).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{translateEnum(row.final_decision, language)}</Badge>
                  </TableCell>
                  <TableCell>{translateEnum(row.status, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReferenceSelectField({
  label,
  help,
  value,
  options,
  required,
  onChange
}: {
  label: string;
  help: string;
  value: string;
  options: ReferenceOption[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} required={required} />
      <Select value={value} onValueChange={onChange} disabled={options.length === 0}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem value={option.value} key={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SourceChecklistField({
  label,
  help,
  noRecordsLabel,
  value,
  options,
  required,
  onChange
}: {
  label: string;
  help: string;
  noRecordsLabel: string;
  value: string;
  options: ReferenceOption[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = new Set(selectedSourceIds(value));

  const toggleSource = (sourceId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(sourceId);
    } else {
      next.delete(sourceId);
    }
    onChange([...next].join(","));
  };

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} required={required} />
      <div className="grid max-h-36 gap-2 overflow-y-auto rounded-md border bg-muted/20 p-3">
        {options.length === 0 ? (
          <div className="text-sm text-muted-foreground">{noRecordsLabel}</div>
        ) : (
          options.map((option) => (
            <label key={option.value} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(option.value)}
                onChange={(event) => toggleSource(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  value,
  onChange,
  type = "text",
  required
}: {
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} required={required} />
      <Input type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextField({ label, help, value, required, onChange }: { label: string; help: string; value: string; required?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} required={required} />
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  language,
  label,
  help,
  value,
  options,
  required,
  onChange
}: {
  language: Language;
  label: string;
  help: string;
  value: string;
  options: string[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} required={required} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem value={option} key={option}>
              {translateEnum(option, language)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
