"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDaysIcon, CheckCircle2Icon, RefreshCcwIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppSettings } from "@/components/app-settings-provider";
import { HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { MarketChangeValue } from "@/components/market-change-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { convertBaseAmountForView } from "@/lib/account-calendar-view";
import type { Currency } from "@/lib/domain";
import type { AccountCalendarData } from "@/lib/services";
import { translateText, translateUiHelp } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function addDays(date: string, days: number): string {
  const current = new Date(`${date}T00:00:00.000Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function monthDays(month: string): Array<{ date: string; day: number; weekday: number }> {
  const startDate = `${month}-01`;
  const days: Array<{ date: string; day: number; weekday: number }> = [];
  for (let date = startDate; date.startsWith(month); date = addDays(date, 1)) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    days.push({ date, day: parsed.getUTCDate(), weekday: parsed.getUTCDay() });
  }
  return days;
}

function weekdayLabels(language: string): string[] {
  return language === "en-US" ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "一", "二", "三", "四", "五", "六"];
}

export function AccountCalendarPage({ data }: { data: AccountCalendarData }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { settings } = useAppSettings();
  const localize = (zh: string, en: string) => (language === "en-US" ? en : translateText(zh, language));
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    [language]
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    [language]
  );
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedViewCurrency, setSelectedViewCurrency] = useState<Currency>(data.baseCurrency);
  const [selectedMonth, setSelectedMonth] = useState(data.latestDate.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [anchorAccountId, setAnchorAccountId] = useState(data.accounts[0]?.id ?? "");
  const [anchorDate, setAnchorDate] = useState(data.latestDate);
  const [anchorValue, setAnchorValue] = useState("");
  const [anchorSource, setAnchorSource] = useState("Manual reconciliation");
  const [anchorNotes, setAnchorNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (selectedAccountId !== "all") {
      setAnchorAccountId(selectedAccountId);
    }
  }, [selectedAccountId]);

  const accountOptions = data.accounts.map((account) => ({
    value: account.id,
    label: `${account.accountName ?? account.institutionName} · ${account.currency}`
  }));
  const selectedRows = useMemo(
    () => data.rows.filter((row) => selectedAccountId === "all" || row.accountId === selectedAccountId),
    [data.rows, selectedAccountId]
  );
  const monthRows = useMemo(
    () => selectedRows.filter((row) => row.snapshotDate.startsWith(selectedMonth)),
    [selectedMonth, selectedRows]
  );
  const visibleRows = useMemo(
    () => (selectedDate ? monthRows.filter((row) => row.snapshotDate === selectedDate) : monthRows).slice().reverse(),
    [monthRows, selectedDate]
  );
  const dailyTotals = useMemo(() => {
    const totals = new Map<
      string,
      {
        netAssetValueBase: number;
        dailyPnlBase: number;
        externalCashflowBase: number;
        fxRevaluationPnlBase: number;
        anchoredCount: number;
      }
    >();

    for (const row of monthRows) {
      const current =
        totals.get(row.snapshotDate) ??
        ({ netAssetValueBase: 0, dailyPnlBase: 0, externalCashflowBase: 0, fxRevaluationPnlBase: 0, anchoredCount: 0 } satisfies {
          netAssetValueBase: number;
          dailyPnlBase: number;
          externalCashflowBase: number;
          fxRevaluationPnlBase: number;
          anchoredCount: number;
        });
      current.netAssetValueBase += row.netAssetValueBase;
      current.dailyPnlBase += row.dailyPnlBase;
      current.externalCashflowBase += row.externalCashflowBase;
      current.fxRevaluationPnlBase += row.fxRevaluationPnlBase;
      current.anchoredCount += row.isAnchored ? 1 : 0;
      totals.set(row.snapshotDate, current);
    }

    return totals;
  }, [monthRows]);
  const latestDate = selectedRows.map((row) => row.snapshotDate).sort().at(-1) ?? data.latestDate;
  const latestRows = selectedRows.filter((row) => row.snapshotDate === latestDate);
  const latestNav = latestRows.reduce((sum, row) => sum + row.netAssetValueBase, 0);
  const latestPnl = latestRows.reduce((sum, row) => sum + row.dailyPnlBase, 0);
  const latestExternal = latestRows.reduce((sum, row) => sum + row.externalCashflowBase, 0);
  const latestFxRevaluation = latestRows.reduce((sum, row) => sum + row.fxRevaluationPnlBase, 0);
  const displayLatestNav = convertBaseAmountForView(latestNav, data.baseCurrency, selectedViewCurrency, latestDate, data.fxRates);
  const displayLatestPnl = convertBaseAmountForView(latestPnl, data.baseCurrency, selectedViewCurrency, latestDate, data.fxRates);
  const displayLatestExternal = convertBaseAmountForView(latestExternal, data.baseCurrency, selectedViewCurrency, latestDate, data.fxRates);
  const displayLatestFxRevaluation = convertBaseAmountForView(latestFxRevaluation, data.baseCurrency, selectedViewCurrency, latestDate, data.fxRates);
  const anchoredDays = selectedRows.filter((row) => row.isAnchored).length;
  const weekDays = weekdayLabels(language);
  const accountName = selectedAccountId === "all" ? localize("全部账户", "All Accounts") : accountOptions.find((item) => item.value === selectedAccountId)?.label ?? selectedAccountId;

  const formatMoney = (value: number) => moneyFormatter.format(value);
  const formatSigned = (value: number) => `${value > 0 ? "+" : ""}${formatMoney(value)}`;
  const displayAmount = (value: number, asOfDate: string) => convertBaseAmountForView(value, data.baseCurrency, selectedViewCurrency, asOfDate, data.fxRates);
  const marketChangeColorMode = settings.marketChange.colorMode;
  const renderMarketChange = (value: number, className?: string) => (
    <MarketChangeValue value={value} colorMode={marketChangeColorMode} className={className}>
      {formatSigned(value)}
    </MarketChangeValue>
  );

  const submitAnchor = () => {
    startTransition(async () => {
      const response = await fetch("/api/account-nav-anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: anchorAccountId,
          anchorDate,
          netAssetValueBase: anchorValue,
          source: anchorSource,
          notes: anchorNotes
        })
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      toast.success(localize("校准净值已保存，账户日历已按最新来源重算。", "NAV anchor saved and the account calendar has recomputed."));
      setSelectedAccountId(anchorAccountId);
      setSelectedMonth(anchorDate.slice(0, 7));
      setSelectedDate(anchorDate);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {localize("账户日历", "Account Calendar")}
            <HelpTooltip content={translateUiHelp("accountCalendar.page", language)} label={localize("账户日历", "Account Calendar")} />
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {localize(
              "按账户和日期实时重算账户每日净值、日盈亏、外部现金流和校准状态；交易流水、现金流、价格、汇率或校准净值变化后刷新即可重算。",
              "Recomputes account daily NAV, daily P&L, external cashflow, and reconciliation status from live ledger, price, FX, and NAV anchors."
            )}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <RefreshCcwIcon className="mr-1 size-3" />
          {localize("实时按日重算", "Live daily recompute")}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("账户每日净值", "Account Daily NAV")} help={translateUiHelp("accountCalendar.dailyNav", language)} />
            </CardDescription>
            <CardTitle className="text-xl" data-testid="account-calendar-latest-nav">{formatMoney(displayLatestNav)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("日盈亏", "Daily P&L")} help={translateUiHelp("accountCalendar.dailyPnl", language)} />
            </CardDescription>
            <CardTitle>{renderMarketChange(displayLatestPnl, "text-xl")}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("汇兑重估", "FX Revaluation")} help={translateUiHelp("accountCalendar.fxRevaluation", language)} />
            </CardDescription>
            <CardTitle>{renderMarketChange(displayLatestFxRevaluation, "text-xl")}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("外部现金流", "External Cashflow")} help={translateUiHelp("accountCalendar.externalCashflow", language)} />
            </CardDescription>
            <CardTitle>{renderMarketChange(displayLatestExternal, "text-xl")}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("校准日", "Anchored Days")} help={translateUiHelp("accountCalendar.anchoredDays", language)} />
            </CardDescription>
            <CardTitle className="text-xl">{anchoredDays}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <HeaderHelp label={localize("视图筛选", "View Filters")} help={translateUiHelp("accountCalendar.filters", language)} />
              </CardTitle>
              <CardDescription>{accountName} · {selectedViewCurrency}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label>{localize("账户", "Account")}</Label>
                  <HelpTooltip content={translateUiHelp("accountCalendar.accountFilter", language)} label={localize("账户", "Account")} />
                </div>
                <Select
                  value={selectedAccountId}
                  onValueChange={(value) => {
                    setSelectedAccountId(value);
                    setSelectedDate(null);
                  }}
                >
                  <SelectTrigger aria-label={localize("账户", "Account")}>
                    <SelectValue>{accountName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{localize("全部账户", "All Accounts")}</SelectItem>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.value} value={account.value}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="account-calendar-month">{localize("月份", "Month")}</Label>
                  <HelpTooltip content={translateUiHelp("accountCalendar.month", language)} label={localize("月份", "Month")} />
                </div>
                <Input
                  id="account-calendar-month"
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                    setSelectedDate(null);
                  }}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label>{localize("显示币种", "Display Currency")}</Label>
                  <HelpTooltip
                    content={localize(
                      "默认使用系统基准货币；切换后仅改变本页金额显示视角，不改变底层校准和计算口径。",
                      "Defaults to the system base currency; switching changes only this page's display currency, not stored anchors or calculation basis."
                    )}
                    label={localize("显示币种", "Display Currency")}
                  />
                </div>
                <Select value={selectedViewCurrency} onValueChange={(value) => setSelectedViewCurrency(value as Currency)}>
                  <SelectTrigger aria-label={localize("显示币种", "Display Currency")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.viewCurrencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setSelectedDate(null)} disabled={!selectedDate}>
                {localize("清除选中日期", "Clear Selected Date")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <HeaderHelp label={localize("校准净值", "NAV Anchor")} help={translateUiHelp("accountCalendar.anchorForm", language)} />
              </CardTitle>
              <CardDescription>{localize("用于录入券商对账后的账户某日净值。", "Record reconciled account NAV from a broker statement.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2">
                <Label>{localize("校准账户", "Anchor Account")}</Label>
                <Select value={anchorAccountId} onValueChange={setAnchorAccountId}>
                  <SelectTrigger aria-label={localize("校准账户", "Anchor Account")}>
                    <SelectValue>
                      {accountOptions.find((account) => account.value === anchorAccountId)?.label ?? anchorAccountId}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.value} value={account.value}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-anchor-date">{localize("校准日期", "Anchor Date")}</Label>
                <Input id="account-anchor-date" aria-label={localize("校准日期", "Anchor Date")} type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-anchor-value">{localize("校准净值", "Anchor NAV")}</Label>
                <Input
                  id="account-anchor-value"
                  aria-label={localize("校准净值", "Anchor NAV")}
                  type="number"
                  step="0.01"
                  value={anchorValue}
                  onChange={(event) => setAnchorValue(event.target.value)}
                  placeholder="250000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-anchor-source">{localize("来源", "Source")}</Label>
                <Input id="account-anchor-source" value={anchorSource} onChange={(event) => setAnchorSource(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-anchor-notes">{localize("备注", "Notes")}</Label>
                <Textarea id="account-anchor-notes" value={anchorNotes} onChange={(event) => setAnchorNotes(event.target.value)} rows={3} />
              </div>
              <Button onClick={submitAnchor} disabled={isPending || !anchorAccountId || !anchorDate || !anchorValue}>
                <SaveIcon data-icon="inline-start" />
                {localize("保存校准净值", "Save NAV Anchor")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card data-testid="account-calendar-grid-card">
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDaysIcon className="size-4 text-primary" />
                  <HeaderHelp label={localize("账户日历", "Account Calendar")} help={translateUiHelp("accountCalendar.grid", language)} />
                </CardTitle>
                <CardDescription>
                  {selectedDate ?? selectedMonth} · {selectedViewCurrency}
                </CardDescription>
              </div>
              <Badge variant="outline">{visibleRows.length} {t.records}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
                {weekDays.map((day, index) => (
                  <div key={`${day}-${index}`} className="py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays(selectedMonth).map((day) => {
                  const total = dailyTotals.get(day.date);
                  const active = selectedDate === day.date;
                  return (
                    <button
                      type="button"
                      key={day.date}
                      style={{ gridColumnStart: day.day === 1 ? day.weekday + 1 : undefined }}
                      onClick={() => setSelectedDate(day.date)}
                      className={cn(
                        "flex min-h-20 flex-col items-start justify-between rounded-md border bg-background p-2 text-left text-xs transition-colors hover:border-primary hover:bg-primary/5",
                        active && "border-primary bg-primary/10 text-primary",
                        !total && "text-muted-foreground"
                      )}
                    >
                      <span className="font-medium">{day.day}</span>
                      {total ? (
                        <span className="grid w-full gap-1">
                          <span className="truncate text-[11px]">{formatMoney(displayAmount(total.netAssetValueBase, day.date))}</span>
                          {renderMarketChange(displayAmount(total.dailyPnlBase, day.date), "text-[11px]")}
                          {total.anchoredCount > 0 ? (
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                              <CheckCircle2Icon className="size-3" />
                              {localize("已校准", "Anchored")}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[11px]">N/A</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="account-calendar-detail-card">
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeaderHelp label={localize("账户日历明细", "Account Calendar Details")} help={translateUiHelp("accountCalendar.grid", language)} />
                </CardTitle>
                <CardDescription>
                  {selectedDate ?? selectedMonth} · {selectedViewCurrency}
                </CardDescription>
              </div>
              <Badge variant="outline">{visibleRows.length} {t.records}</Badge>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><HeaderHelp label={localize("日期", "Date")} help={translateUiHelp("accountCalendar.dateColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("账户", "Account")} help={translateUiHelp("accountCalendar.accountColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("账户净值", "Account NAV")} help={translateUiHelp("accountCalendar.navColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("日盈亏", "Daily P&L")} help={translateUiHelp("accountCalendar.pnlColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("日收益率", "Daily Return")} help={translateUiHelp("accountCalendar.returnColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("外部现金流", "External Cashflow")} help={translateUiHelp("accountCalendar.cashflowColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("汇兑重估", "FX Revaluation")} help={translateUiHelp("accountCalendar.fxColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("持仓市值", "Market Value")} help={translateUiHelp("accountCalendar.marketColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("现金价值", "Cash Value")} help={translateUiHelp("accountCalendar.cashColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("校准", "Anchor")} help={translateUiHelp("accountCalendar.anchorColumn", language)} /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        {t.noRecords}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row) => (
                      <TableRow key={`${row.accountId}-${row.snapshotDate}`}>
                        <TableCell>{row.snapshotDate}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.accountName}</div>
                          <div className="text-xs text-muted-foreground">{row.accountId}</div>
                        </TableCell>
                        <TableCell>{formatMoney(displayAmount(row.netAssetValueBase, row.snapshotDate))}</TableCell>
                        <TableCell>{renderMarketChange(displayAmount(row.dailyPnlBase, row.snapshotDate))}</TableCell>
                        <TableCell>{row.dailyReturn === null ? "N/A" : percentFormatter.format(row.dailyReturn)}</TableCell>
                        <TableCell>{renderMarketChange(displayAmount(row.externalCashflowBase, row.snapshotDate))}</TableCell>
                        <TableCell>{renderMarketChange(displayAmount(row.fxRevaluationPnlBase, row.snapshotDate))}</TableCell>
                        <TableCell>{formatMoney(displayAmount(row.marketValueBase, row.snapshotDate))}</TableCell>
                        <TableCell>{formatMoney(displayAmount(row.cashValueBase, row.snapshotDate))}</TableCell>
                        <TableCell>
                          {row.isAnchored ? (
                            <Badge variant="secondary">{localize("已校准", "Anchored")}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
