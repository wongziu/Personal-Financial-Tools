"use client";

import type { DashboardData } from "@/lib/services";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(value);
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { t } = useLanguage();
  const metricCards = [
    { label: t.portfolioNetValue, value: money(data.metrics.portfolioNetValue, data.baseCurrency) },
    { label: t.cashValue, value: money(data.metrics.cashValueBase, data.baseCurrency) },
    { label: t.largestHolding, value: `${data.metrics.largestHoldingName} · ${percent(data.metrics.largestHoldingWeight)}` },
    { label: t.maxTheme, value: `${data.metrics.maxThemeName} · ${percent(data.metrics.maxThemeWeight)}` }
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard}</h1>
        <p className="text-sm text-muted-foreground">Trading-loop overview from the local SQLite database.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-xl">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Holdings & NAV</CardTitle>
            <CardDescription>Calculated from settled trades, manual prices, and FX rates.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>security</TableHead>
                  <TableHead>strategy</TableHead>
                  <TableHead>quantity</TableHead>
                  <TableHead>market value</TableHead>
                  <TableHead>weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.positions.map((position) => (
                  <TableRow key={`${position.account_id}-${position.security_id}`}>
                    <TableCell>{String(position.security_name)}</TableCell>
                    <TableCell>{String(position.strategy_type)}</TableCell>
                    <TableCell>{Number(position.quantity).toFixed(2)}</TableCell>
                    <TableCell>{money(position.marketValueBase, data.baseCurrency)}</TableCell>
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
              <CardTitle>{t.riskWarnings}</CardTitle>
              <CardDescription>Weak warnings; execution is allowed with audit draft.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {data.riskWarnings.map((warning) => (
                <Alert key={warning.ruleCode}>
                  <AlertTitle className="flex items-center gap-2">
                    {warning.ruleCode}
                    <Badge variant={warning.severity === "Hard" ? "destructive" : "secondary"}>{warning.severity}</Badge>
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
              <CardTitle>{t.pendingExceptions}</CardTitle>
              <CardDescription>{data.metrics.pendingExceptionCount} open items</CardDescription>
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
