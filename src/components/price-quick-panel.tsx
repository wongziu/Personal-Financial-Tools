"use client";

import { useMemo, useState, useTransition } from "react";
import { LineChartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeaderHelp } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PriceEntrySecurity, Row } from "@/lib/services";
import { translateEnum, translateUiHelp } from "@/lib/i18n";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PriceQuickPanel({ rows, securities }: { rows: Row[]; securities: PriceEntrySecurity[] }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [priceDate, setPriceDate] = useState(today);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const existingSecurityIds = useMemo(
    () => new Set(rows.filter((row) => row.price_date === priceDate).map((row) => String(row.security_id))),
    [priceDate, rows]
  );
  const missingSecurities = useMemo(
    () => securities.filter((security) => !existingSecurityIds.has(security.id)),
    [existingSecurityIds, securities]
  );

  const savePrice = (security: PriceEntrySecurity) => {
    startTransition(async () => {
      const closePrice = prices[security.id];
      const response = await fetch("/api/modules/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceDate,
          securityId: security.id,
          closePrice,
          currency: security.currency,
          source: "Manual quick price entry"
        })
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      toast.success(t.formSaved);
      setPrices((current) => ({ ...current, [security.id]: "" }));
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="size-4 text-primary" />
            <HeaderHelp label={t.priceQueue} help={translateUiHelp("prices.queue", language)} />
          </CardTitle>
          <CardDescription>{t.priceQueueDescription}</CardDescription>
        </div>
        <div className="grid gap-1.5 md:w-48">
          <label htmlFor="price-quick-date" className="text-xs font-medium text-muted-foreground">
            {t.priceDate}
          </label>
          <Input
            id="price-quick-date"
            aria-label={t.priceDate}
            type="date"
            value={priceDate}
            onChange={(event) => setPriceDate(event.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {missingSecurities.length === 0 ? (
          <div className="rounded-md border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">{t.allPricesEntered}</div>
        ) : (
          missingSecurities.map((security) => (
            <div
              key={security.id}
              className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(0,1fr)_160px_120px]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{security.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{security.id}</Badge>
                  <Badge variant="outline">{translateEnum(security.market, language)}</Badge>
                  <Badge variant="outline">{security.currency}</Badge>
                  <span className="truncate">{security.accountName}</span>
                </div>
              </div>
              <Input
                aria-label={`${security.name} ${t.savePrice}`}
                type="number"
                step="any"
                min="0"
                value={prices[security.id] ?? ""}
                placeholder={language === "en-US" ? "Close price" : "收盘价/净值"}
                onChange={(event) => setPrices((current) => ({ ...current, [security.id]: event.target.value }))}
              />
              <Button
                type="button"
                onClick={() => savePrice(security)}
                disabled={isPending || !prices[security.id]}
              >
                {t.savePrice}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
