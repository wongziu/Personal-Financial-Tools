"use client";

import { useState, useTransition } from "react";
import { ShieldAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Row } from "@/lib/services";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultDecision);
  const [isPending, startTransition] = useTransition();

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
          <p className="text-sm text-muted-foreground">Weak risk warnings with automatic exception drafts for hard-limit execution.</p>
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
              <Field label="Security ID" value={form.securityId} onChange={(value) => setField("securityId", value)} />
              <Field label="Thesis ID" value={form.thesisId} onChange={(value) => setField("thesisId", value)} />
              <SelectField label="Strategy" value={form.strategyType} options={["Core", "Active", "Trading", "Experimental"]} onChange={(value) => setField("strategyType", value)} />
              <SelectField label="Action" value={form.action} options={["Buy", "Add", "Reduce", "Exit", "NoAction"]} onChange={(value) => setField("action", value)} />
              <Field label="Current Price" type="number" value={form.currentPrice} onChange={(value) => setField("currentPrice", value)} />
              <Field label="Planned Amount CNY" type="number" value={form.plannedAmountBase} onChange={(value) => setField("plannedAmountBase", value)} />
              <Field label="Price Min" type="number" value={form.plannedPriceMin} onChange={(value) => setField("plannedPriceMin", value)} />
              <Field label="Price Max" type="number" value={form.plannedPriceMax} onChange={(value) => setField("plannedPriceMax", value)} />
              <Field label="Pre Weight" type="number" value={form.preTradeWeight} onChange={(value) => setField("preTradeWeight", value)} />
              <Field label="Post Weight" type="number" value={form.postTradeWeight} onChange={(value) => setField("postTradeWeight", value)} />
              <Field label="Max Allowed" type="number" value={form.maxAllowedWeight} onChange={(value) => setField("maxAllowedWeight", value)} />
              <Field label="Theme Exposure" type="number" value={form.similarThemeExposure} onChange={(value) => setField("similarThemeExposure", value)} />
              <Field label="Trigger" value={form.trigger} onChange={(value) => setField("trigger", value)} />
              <Field label="Return Source" value={form.expectedReturnSource} onChange={(value) => setField("expectedReturnSource", value)} />
              <Field label="Downside Loss" type="number" value={form.downsideLossBase} onChange={(value) => setField("downsideLossBase", value)} />
              <SelectField label="Emotion" value={form.emotionTag} options={["Calm", "FOMO", "RevengeTrade", "Fear", "RecoverLoss", "Other"]} onChange={(value) => setField("emotionTag", value)} />
              <SelectField label="Final Decision" value={form.finalDecision} options={["Execute", "Abandon", "Delay"]} onChange={(value) => setField("finalDecision", value)} />
              <Field label="Source IDs" value={form.sourceIds} onChange={(value) => setField("sourceIds", value)} />
              <div className="md:col-span-3">
                <TextField label="Main Risks" value={form.mainRisks} onChange={(value) => setField("mainRisks", value)} />
              </div>
              <div className="md:col-span-3">
                <TextField label="Stop Loss / Invalidation" value={form.stopLossOrInvalidation} onChange={(value) => setField("stopLossOrInvalidation", value)} />
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
          <CardDescription>{rows.length} records</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {["id", "decision_time", "security_id", "action", "post_trade_weight", "final_decision", "status"].map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell>{String(row.id)}</TableCell>
                  <TableCell>{String(row.decision_time)}</TableCell>
                  <TableCell>{String(row.security_id)}</TableCell>
                  <TableCell>{String(row.action)}</TableCell>
                  <TableCell>{(Number(row.post_trade_weight) * 100).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{String(row.final_decision)}</Badge>
                  </TableCell>
                  <TableCell>{String(row.status)}</TableCell>
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
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem value={option} key={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
