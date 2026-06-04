"use client";

import type { DashboardData } from "@/lib/services";
import { HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { translateColumn, translateColumnHelp, translateEnum, translateText, translateUiHelp } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function money(value: number, currency: string, language: string) {
  return new Intl.NumberFormat(language, { style: "currency", currency }).format(value);
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { language, t } = useLanguage();
  const localize = (zh: string, en: string) => (language === "en-US" ? en : translateText(zh, language));
  const formatMoney = (value: number) => money(value, data.baseCurrency, language);
  const formatSignedMoney = (value: number) => `${value > 0 ? "+" : ""}${formatMoney(value)}`;
  const metricCards = [
    { label: t.portfolioNetValue, value: formatMoney(data.metrics.portfolioNetValue), helpKey: "dashboard.portfolioNetValue" },
    { label: t.asOfDate, value: data.asOfDate, helpKey: "dashboard.asOfDate" },
    { label: t.cashValue, value: formatMoney(data.metrics.cashValueBase), helpKey: "dashboard.cashValue" },
    {
      label: localize("汇兑重估影响", "FX Revaluation"),
      value: formatSignedMoney(data.metrics.fxRevaluationBase),
      helpKey: "dashboard.fxRevaluation",
      valueClassName: cn(data.metrics.fxRevaluationBase > 0 && "text-red-600", data.metrics.fxRevaluationBase < 0 && "text-emerald-600")
    },
    { label: t.largestHolding, value: `${data.metrics.largestHoldingName} · ${percent(data.metrics.largestHoldingWeight)}`, helpKey: "dashboard.largestHolding" },
    { label: t.maxTheme, value: `${data.metrics.maxThemeName} · ${percent(data.metrics.maxThemeWeight)}`, helpKey: "dashboard.maxTheme" }
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {t.dashboard}
          <HelpTooltip content={translateUiHelp("dashboard.page", language)} label={t.dashboard} />
        </h1>
        <p className="text-sm text-muted-foreground">{t.holdingsAndNavDescription}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>
                <HeaderHelp label={metric.label} help={translateUiHelp(metric.helpKey, language)} />
              </CardDescription>
              <CardTitle className={cn("text-xl", metric.valueClassName)}>{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              <HeaderHelp label={t.holdingsAndNav} help={translateUiHelp("dashboard.holdingsAndNav", language)} />
            </CardTitle>
            <CardDescription>{t.holdingsAndNavDescription}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {["security", "strategy", "quantity", "market_value", "weight"].map((column) => (
                    <TableHead key={column}>
                      <HeaderHelp
                        label={translateColumn("dashboard_positions", column, language)}
                        help={translateColumnHelp("dashboard_positions", column, language)}
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.positions.map((position) => (
                  <TableRow key={`${position.account_id}-${position.security_id}`}>
                    <TableCell>{String(position.security_name)}</TableCell>
                    <TableCell>{translateEnum(position.strategy_type, language)}</TableCell>
                    <TableCell>{Number(position.quantity).toFixed(2)}</TableCell>
                    <TableCell>{formatMoney(position.marketValueBase)}</TableCell>
                    <TableCell>{percent(position.weight)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <HeaderHelp label={t.riskWarnings} help={translateUiHelp("dashboard.riskWarnings", language)} />
              </CardTitle>
              <CardDescription>{t.weakRiskDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {data.riskWarnings.map((warning) => (
                <Alert key={warning.ruleCode}>
                  <AlertTitle className="flex items-center gap-2">
                    {warning.ruleCode}
                    <Badge variant={warning.severity === "Hard" ? "destructive" : "secondary"}>
                      {translateEnum(warning.severity, language)}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {percent(warning.actual)} / {percent(warning.threshold)}
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <HeaderHelp label={t.pendingExceptions} help={translateUiHelp("dashboard.pendingExceptions", language)} />
              </CardTitle>
              <CardDescription>
                {data.metrics.pendingExceptionCount} {t.records}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {data.pendingExceptions.map((item) => (
                <div className="rounded-md border p-3" key={String(item.id)}>
                  <div className="font-medium">{String(item.id)}</div>
                  <div className="text-muted-foreground">{String(item.related_rule)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
