"use client";

import { useState, useTransition } from "react";
import { ShieldAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Row } from "@/lib/services";
import { FieldLabel, HeaderHelp } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { translateColumn, translateColumnHelp, translateEnum, type Language } from "@/lib/i18n";

const defaultDecision = {
  securityId: "US-AAPL",
  thesisId: "THS-2026-001",
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
  sourceIds: "SRC-2026-001"
};

export function TradeDecisionsPage({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultDecision);
  const [isPending, startTransition] = useTransition();
  const label = (column: string) => translateColumn("trade_decisions", column, language);
  const help = (column: string) => translateColumnHelp("trade_decisions", column, language);

  const setField = (field: keyof typeof defaultDecision, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    startTransition(async () => {
      const response = await fetch("/api/trade-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourceIds: form.sourceIds.split(",").map((item) => item.trim()).filter(Boolean)
        })
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      const result = (await response.json()) as { exceptionDraftId?: string };
      toast.success(result.exceptionDraftId ? `${t.formSaved}: ${result.exceptionDraftId}` : t.formSaved);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.tradeDecisions}</h1>
          <p className="text-sm text-muted-foreground">{t.weakRiskDescription}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
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
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={label("security_id")} help={help("security_id")} value={form.securityId} onChange={(value) => setField("securityId", value)} />
              <Field label={label("thesis_id")} help={help("thesis_id")} value={form.thesisId} onChange={(value) => setField("thesisId", value)} />
              <SelectField language={language} label={label("strategy_type")} help={help("strategy_type")} value={form.strategyType} options={["Core", "Active", "Trading", "Experimental"]} onChange={(value) => setField("strategyType", value)} />
              <SelectField language={language} label={label("action")} help={help("action")} value={form.action} options={["Buy", "Add", "Reduce", "Exit", "NoAction"]} onChange={(value) => setField("action", value)} />
              <Field label={label("current_price")} help={help("current_price")} type="number" value={form.currentPrice} onChange={(value) => setField("currentPrice", value)} />
              <Field label={label("planned_amount_base")} help={help("planned_amount_base")} type="number" value={form.plannedAmountBase} onChange={(value) => setField("plannedAmountBase", value)} />
              <Field label={label("planned_price_min")} help={help("planned_price_min")} type="number" value={form.plannedPriceMin} onChange={(value) => setField("plannedPriceMin", value)} />
              <Field label={label("planned_price_max")} help={help("planned_price_max")} type="number" value={form.plannedPriceMax} onChange={(value) => setField("plannedPriceMax", value)} />
              <Field label={label("pre_trade_weight")} help={help("pre_trade_weight")} type="number" value={form.preTradeWeight} onChange={(value) => setField("preTradeWeight", value)} />
              <Field label={label("post_trade_weight")} help={help("post_trade_weight")} type="number" value={form.postTradeWeight} onChange={(value) => setField("postTradeWeight", value)} />
              <Field label={label("max_allowed_weight")} help={help("max_allowed_weight")} type="number" value={form.maxAllowedWeight} onChange={(value) => setField("maxAllowedWeight", value)} />
              <Field label={label("similar_theme_exposure")} help={help("similar_theme_exposure")} type="number" value={form.similarThemeExposure} onChange={(value) => setField("similarThemeExposure", value)} />
              <Field label={label("trigger")} help={help("trigger")} value={form.trigger} onChange={(value) => setField("trigger", value)} />
              <Field label={label("expected_return_source")} help={help("expected_return_source")} value={form.expectedReturnSource} onChange={(value) => setField("expectedReturnSource", value)} />
              <Field label={label("downside_loss_base")} help={help("downside_loss_base")} type="number" value={form.downsideLossBase} onChange={(value) => setField("downsideLossBase", value)} />
              <SelectField language={language} label={label("emotion_tag")} help={help("emotion_tag")} value={form.emotionTag} options={["Calm", "FOMO", "RevengeTrade", "Fear", "RecoverLoss", "Other"]} onChange={(value) => setField("emotionTag", value)} />
              <SelectField language={language} label={label("final_decision")} help={help("final_decision")} value={form.finalDecision} options={["Execute", "Abandon", "Delay"]} onChange={(value) => setField("finalDecision", value)} />
              <Field label={label("source_ids")} help={help("source_ids")} value={form.sourceIds} onChange={(value) => setField("sourceIds", value)} />
              <div className="md:col-span-3">
                <TextField label={label("main_risks")} help={help("main_risks")} value={form.mainRisks} onChange={(value) => setField("mainRisks", value)} />
              </div>
              <div className="md:col-span-3">
                <TextField label={label("stop_loss_or_invalidation")} help={help("stop_loss_or_invalidation")} value={form.stopLossOrInvalidation} onChange={(value) => setField("stopLossOrInvalidation", value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {t.submitDecision}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.tradeDecisions}</CardTitle>
          <CardDescription>
            {rows.length} {t.records}
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
              {rows.map((row) => (
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

function Field({
  label,
  help,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} />
      <Input type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextField({ label, help, value, onChange }: { label: string; help: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} />
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
  onChange
}: {
  language: Language;
  label: string;
  help: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} help={help} />
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
