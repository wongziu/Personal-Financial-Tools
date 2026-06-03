"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { translateEnum, translateText } from "@/lib/i18n";
import type { SecurityDetailData } from "@/lib/services";

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }

  return String(value);
}

function LocalLabel({ zh, en }: { zh: string; en: string }) {
  const { language } = useLanguage();
  return <>{language === "en-US" ? en : translateText(zh, language)}</>;
}

export function SecurityDetailPage({ data }: { data: SecurityDetailData }) {
  const { language, t } = useLanguage();
  const securityName = valueText(data.security.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/securities">
              <ArrowLeftIcon data-icon="inline-start" />
              <LocalLabel zh="返回标的列表" en="Back to Securities" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{securityName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {valueText(data.security.id)} · {translateEnum(valueText(data.security.asset_type), language)} · {translateEnum(valueText(data.security.market), language)}
          </p>
        </div>
        <Badge variant="secondary">{translateEnum(valueText(data.security.investment_status), language)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.securityDetail}</CardTitle>
          <CardDescription>{t.linkedAccount}: {data.account ? valueText(data.account.institution_name) : "N/A"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            ["标的 ID", "Security ID", data.security.id],
            ["关联账户", "Linked Account", data.account ? `${valueText(data.account.institution_name)} · ${valueText(data.account.id)}` : data.security.account_id],
            ["交易代码", "Ticker", data.security.ticker],
            ["资产类型", "Asset Type", translateEnum(valueText(data.security.asset_type), language)],
            ["市场", "Market", translateEnum(valueText(data.security.market), language)],
            ["币种", "Currency", data.security.currency],
            ["流动性", "Liquidity", translateEnum(valueText(data.security.liquidity_level), language)],
            ["一级行业", "Industry L1", translateEnum(valueText(data.security.industry_level_1), language)],
            ["二级行业", "Industry L2", translateEnum(valueText(data.security.industry_level_2), language)],
            ["基准", "Benchmark", data.security.benchmark],
            ["复杂度", "Complexity", translateEnum(valueText(data.security.complexity), language)]
          ].map(([zh, en, value]) => (
            <div key={zh} className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">
                <LocalLabel zh={String(zh)} en={String(en)} />
              </div>
              <div className="mt-1 text-sm font-medium">{valueText(value)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.relatedTransactions}</CardTitle>
          <CardDescription>{data.transactions.length} {t.records}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  ["交易 ID", "Transaction ID"],
                  ["成交日期", "Trade Date"],
                  ["账户 ID", "Account ID"],
                  ["操作类型", "Type"],
                  ["数量", "Quantity"],
                  ["状态", "Status"]
                ].map(([zh, en]) => (
                  <TableHead key={zh}>
                    <LocalLabel zh={zh} en={en} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">{t.noRecords}</TableCell>
                </TableRow>
              ) : (
                data.transactions.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell>{valueText(row.id)}</TableCell>
                    <TableCell>{valueText(row.trade_date)}</TableCell>
                    <TableCell>{valueText(row.account_id)}</TableCell>
                    <TableCell>{translateEnum(valueText(row.transaction_type), language)}</TableCell>
                    <TableCell>{valueText(row.quantity)}</TableCell>
                    <TableCell>{translateEnum(valueText(row.status), language)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.priceRecords}</CardTitle>
          <CardDescription>{data.prices.length} {t.records}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  ["日期", "Date"],
                  ["价格", "Price"],
                  ["币种", "Currency"],
                  ["来源", "Source"]
                ].map(([zh, en]) => (
                  <TableHead key={zh}>
                    <LocalLabel zh={zh} en={en} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.prices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">{t.noRecords}</TableCell>
                </TableRow>
              ) : (
                data.prices.map((row) => (
                  <TableRow key={`${row.price_date}-${row.security_id}-${row.close_price}`}>
                    <TableCell>{valueText(row.price_date)}</TableCell>
                    <TableCell>{valueText(row.close_price)}</TableCell>
                    <TableCell>{valueText(row.currency)}</TableCell>
                    <TableCell>{valueText(row.source)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
