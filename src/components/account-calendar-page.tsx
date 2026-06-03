"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDaysIcon, CheckCircle2Icon, RefreshCcwIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
    label: `${account.institutionName} · ${account.id}`
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
      { netAssetValueBase: number; dailyPnlBase: number; externalCashflowBase: number; anchoredCount: number }
    >();

    for (const row of monthRows) {
      const current =
        totals.get(row.snapshotDate) ??
        ({ netAssetValueBase: 0, dailyPnlBase: 0, externalCashflowBase: 0, anchoredCount: 0 } satisfies {
          netAssetValueBase: number;
          dailyPnlBase: number;
          externalCashflowBase: number;
          anchoredCount: number;
        });
      current.netAssetValueBase += row.netAssetValueBase;
      current.dailyPnlBase += row.dailyPnlBase;
      current.externalCashflowBase += row.externalCashflowBase;
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
  const anchoredDays = selectedRows.filter((row) => row.isAnchored).length;
  const weekDays = weekdayLabels(language);
  const accountName = selectedAccountId === "all" ? localize("全部账户", "All Accounts") : accountOptions.find((item) => item.value === selectedAccountId)?.label ?? selectedAccountId;

  const formatMoney = (value: number) => moneyFormatter.format(value);
  const formatSigned = (value: number) => `${value > 0 ? "+" : ""}${formatMoney(value)}`;

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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("账户每日净值", "Account Daily NAV")} help={translateUiHelp("accountCalendar.dailyNav", language)} />
            </CardDescription>
            <CardTitle className="text-xl">{formatMoney(latestNav)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("日盈亏", "Daily P&L")} help={translateUiHelp("accountCalendar.dailyPnl", language)} />
            </CardDescription>
            <CardTitle className={cn("text-xl", latestPnl > 0 && "text-red-600", latestPnl < 0 && "text-emerald-600")}>
              {formatSigned(latestPnl)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={localize("外部现金流", "External Cashflow")} help={translateUiHelp("accountCalendar.externalCashflow", language)} />
            </CardDescription>
            <CardTitle className="text-xl">{formatSigned(latestExternal)}</CardTitle>
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
              <CardDescription>{accountName}</CardDescription>
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

        <Card>
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDaysIcon className="size-4 text-primary" />
                <HeaderHelp label={localize("账户日历", "Account Calendar")} help={translateUiHelp("accountCalendar.grid", language)} />
              </CardTitle>
              <CardDescription>
                {selectedDate ?? selectedMonth} · {data.baseCurrency}
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
                        <span className="truncate text-[11px]">{formatMoney(total.netAssetValueBase)}</span>
                        <span className={cn("text-[11px]", total.dailyPnlBase > 0 && "text-red-600", total.dailyPnlBase < 0 && "text-emerald-600")}>
                          {formatSigned(total.dailyPnlBase)}
                        </span>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><HeaderHelp label={localize("日期", "Date")} help={translateUiHelp("accountCalendar.dateColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("账户", "Account")} help={translateUiHelp("accountCalendar.accountColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("账户净值", "Account NAV")} help={translateUiHelp("accountCalendar.navColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("日盈亏", "Daily P&L")} help={translateUiHelp("accountCalendar.pnlColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("日收益率", "Daily Return")} help={translateUiHelp("accountCalendar.returnColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("外部现金流", "External Cashflow")} help={translateUiHelp("accountCalendar.cashflowColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("持仓市值", "Market Value")} help={translateUiHelp("accountCalendar.marketColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("现金价值", "Cash Value")} help={translateUiHelp("accountCalendar.cashColumn", language)} /></TableHead>
                    <TableHead><HeaderHelp label={localize("校准", "Anchor")} help={translateUiHelp("accountCalendar.anchorColumn", language)} /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                        <TableCell>{formatMoney(row.netAssetValueBase)}</TableCell>
                        <TableCell className={cn(row.dailyPnlBase > 0 && "text-red-600", row.dailyPnlBase < 0 && "text-emerald-600")}>
                          {formatSigned(row.dailyPnlBase)}
                        </TableCell>
                        <TableCell>{row.dailyReturn === null ? "N/A" : percentFormatter.format(row.dailyReturn)}</TableCell>
                        <TableCell>{formatSigned(row.externalCashflowBase)}</TableCell>
                        <TableCell>{formatMoney(row.marketValueBase)}</TableCell>
                        <TableCell>{formatMoney(row.cashValueBase)}</TableCell>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
