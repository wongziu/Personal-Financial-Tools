"use client";

import { useState, useTransition } from "react";
import { RefreshCcwIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Row } from "@/lib/services";
import { FieldLabel, HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { translateUiHelp } from "@/lib/i18n";
import { getLatestFxRates } from "@/lib/module-interactions";

const currencies = ["CNY", "HKD", "USD"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FxQuickPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const latestRates = getLatestFxRates(rows).filter((row) => row.from_currency !== row.to_currency);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("CNY");
  const [rate, setRate] = useState("");
  const [rateDate, setRateDate] = useState(todayKey());
  const [source, setSource] = useState(t.manualQuickSet);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const response = await fetch("/api/modules/fx-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateDate,
          fromCurrency,
          toCurrency,
          rate,
          source
        })
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      toast.success(t.formSaved);
      setRate("");
      router.refresh();
    });
  };

  return (
    <Card className="border-primary/15 bg-primary/[0.03]" data-testid="fx-quick-panel">
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCcwIcon className="size-4 text-primary" />
            <HeaderHelp label={t.quickFx} help={translateUiHelp("fx.quickFx", language)} />
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            {t.latestRates}
            <HelpTooltip content={translateUiHelp("fx.latestRates", language)} label={t.latestRates} />
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {latestRates.length === 0 ? (
            <Badge variant="secondary">N/A</Badge>
          ) : (
            latestRates.map((row) => (
              <Badge className="gap-1.5 rounded-md px-2 py-1" variant="secondary" key={`${row.from_currency}-${row.to_currency}`}>
                <span>
                  1 {String(row.from_currency)} = {Number(row.rate).toFixed(4)} {String(row.to_currency)}
                </span>
                <span className="text-muted-foreground">
                  {t.asOf} {String(row.rate_date)}
                </span>
              </Badge>
            ))
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto] md:items-end">
          <div className="grid gap-1.5">
            <FieldLabel label={t.fromCurrency} help={translateUiHelp("fx.fromCurrency", language)} />
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={t.toCurrency} help={translateUiHelp("fx.toCurrency", language)} />
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={t.rate} help={translateUiHelp("fx.rate", language)} />
            <Input data-testid="fx-rate-input" inputMode="decimal" type="number" step="any" value={rate} onChange={(event) => setRate(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={t.dateField} help={translateUiHelp("fx.rateDate", language)} />
            <Input type="date" value={rateDate} onChange={(event) => setRateDate(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel label={t.source} help={translateUiHelp("fx.source", language)} />
            <Input value={source} onChange={(event) => setSource(event.target.value)} />
          </div>
          <Button onClick={save} disabled={isPending || !rate}>
            <SaveIcon data-icon="inline-start" />
            {t.saveRate}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
