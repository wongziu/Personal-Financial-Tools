"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CalendarDaysIcon, EyeIcon, FilterXIcon, PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ModuleDefinition, ModuleField, ModuleReferenceOptions, ReferenceOption } from "@/lib/modules";
import { isFieldReadOnlyOnEdit, isModuleRowEditable } from "@/lib/module-records";
import type { SecurityLifecycleBucket, SecurityLifecycleEntry } from "@/lib/security-lifecycle";
import type { PriceEntrySecurity, Row } from "@/lib/services";
import { useAppSettings } from "@/components/app-settings-provider";
import { FxQuickPanel } from "@/components/fx-quick-panel";
import { FieldLabel, HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { MarketChangeValue } from "@/components/market-change-value";
import { PriceQuickPanel } from "@/components/price-quick-panel";
import { SourceIntelligencePanel } from "@/components/source-intelligence-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  translateBoolean,
  translateColumn,
  translateColumnHelp,
  translateEnum,
  translateFieldHelp,
  translateText,
  translateUiHelp,
  type Dictionary,
  type Language
} from "@/lib/i18n";
import { assetTypeRequiresLockup, deriveLiquidityLevel } from "@/lib/security-liquidity";
import type { SourceDraftFields } from "@/lib/source-intelligence";
import {
  buildCalendarMonth,
  filterRowsByDate,
  formatDateKey,
  getCalendarDateFields,
  getDefaultCalendarColumn,
  getDefaultMonth,
  summarizeRows,
  type DateFilterMode
} from "@/lib/module-interactions";
import type { MarketChangeColorMode } from "@/lib/market-change";
import { cn } from "@/lib/utils";

type SecurityLifecycleFilter = SecurityLifecycleBucket | "all";

const securityLifecycleFilterOrder: SecurityLifecycleFilter[] = ["all", "holding", "observed", "candidate", "exited", "blocked"];

const securityLifecycleLabels: Record<SecurityLifecycleBucket, { zh: string; en: string }> = {
  observed: { zh: "观察池", en: "Watchlist" },
  holding: { zh: "持仓中", en: "Holding" },
  exited: { zh: "已退出复盘", en: "Exited Review" },
  candidate: { zh: "候选池", en: "Candidate Pool" },
  blocked: { zh: "禁用", en: "Blocked" }
};

const securityLifecycleFilterLabels: Record<SecurityLifecycleFilter, { zh: string; en: string }> = {
  all: { zh: "全部", en: "All" },
  ...securityLifecycleLabels
};

function displayValue(value: unknown, language: Language): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }

  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as string[]).map((item) => translateEnum(item, language)).join(", ");
    } catch {
      return translateEnum(value, language);
    }
  }

  return translateEnum(String(value), language);
}

function formatAmountValue(value: unknown, language: Language): string {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return displayValue(value, language);
  }

  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberValue);
}

function formatSignedAmountValue(value: unknown, language: Language): string {
  const numberValue = Number(value);
  const formatted = formatAmountValue(value, language);
  return Number.isFinite(numberValue) && numberValue > 0 ? `+${formatted}` : formatted;
}

function isAmountDisplayColumn(column: string): boolean {
  return (
    column === "amount" ||
    column.endsWith("_amount") ||
    [
      "gross_amount",
      "commission",
      "tax",
      "other_fees",
      "market_value_base",
      "cash_value_base",
      "net_asset_value_base",
      "external_cashflow_base",
      "daily_pnl_base",
      "cumulative_pnl_base"
    ].includes(column)
  );
}

function isAmountChangeDisplayColumn(column: string): boolean {
  return [
    "daily_pnl_base",
    "cumulative_pnl_base",
    "external_cashflow_base",
    "fx_revaluation_base",
    "fx_revaluation_pnl_base"
  ].includes(column);
}

function displayReferenceValue(value: unknown, options: ReferenceOption[] | undefined, language: Language): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return options?.find((option) => option.value === String(value))?.label ?? displayValue(value, language);
}

function isBooleanDisplayColumn(column: string): boolean {
  return [
    "allow_margin_or_derivatives",
    "include_in_net_worth",
    "is_external",
    "is_investment_income",
    "triggers_review",
    "touches_limits",
    "is_rule_exception",
    "has_similar_theme_exposure",
    "enabled"
  ].includes(column);
}

function marketBadgeClassName(value: unknown): string {
  switch (String(value)) {
    case "A-Share":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
    case "HK":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
    case "US":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300";
    case "MutualFund":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function MarketBadge({ value, language }: { value: unknown; language: Language }) {
  return (
    <Badge
      variant="outline"
      data-market={String(value)}
      className={cn("whitespace-nowrap", marketBadgeClassName(value))}
    >
      {displayValue(value, language)}
    </Badge>
  );
}

function parseMultiValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as string[]).map(String).filter(Boolean);
    } catch {
      return [];
    }
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleMultiValue(value: unknown, option: string): string {
  const current = parseMultiValue(value);
  const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
  return next.join(", ");
}

function MarketBadgeGroup({ value, language }: { value: unknown; language: Language }) {
  const markets = parseMultiValue(value);
  if (markets.length === 0) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {markets.map((market) => (
        <MarketBadge key={market} value={market} language={language} />
      ))}
    </div>
  );
}

function TableDisplayValue({
  column,
  field,
  value,
  language,
  marketChangeColorMode
}: {
  column: string;
  field?: ModuleField;
  value: unknown;
  language: Language;
  marketChangeColorMode: MarketChangeColorMode;
}) {
  if (field?.type === "boolean" || isBooleanDisplayColumn(column)) {
    return <Badge variant="outline">{translateBoolean(value, language)}</Badge>;
  }

  if (column === "supported_markets") {
    return <MarketBadgeGroup value={value} language={language} />;
  }

  if (column === "market") {
    return <MarketBadge value={value} language={language} />;
  }

  if (column === "liquidity_level") {
    return <Badge variant="outline">{displayValue(value, language)}</Badge>;
  }

  if (isAmountChangeDisplayColumn(column) && Number.isFinite(Number(value))) {
    const numberValue = Number(value);
    return (
      <MarketChangeValue value={numberValue} colorMode={marketChangeColorMode}>
        {formatSignedAmountValue(value, language)}
      </MarketChangeValue>
    );
  }

  if (isAmountDisplayColumn(column)) {
    return formatAmountValue(value, language);
  }

  if (column.includes("status") || column.includes("severity")) {
    return <Badge variant="secondary">{displayValue(value, language)}</Badge>;
  }

  return displayValue(value, language);
}

function initialFieldValue(field: ModuleField): string | boolean {
  if (field.defaultValue !== undefined) {
    return typeof field.defaultValue === "boolean" ? field.defaultValue : String(field.defaultValue);
  }

  if (field.type === "boolean") {
    return false;
  }

  if (field.type === "date") {
    return new Date().toISOString().slice(0, 10);
  }

  return "";
}

function referenceMetadata(options: ReferenceOption[] | undefined, value: unknown): Record<string, string> {
  return options?.find((option) => option.value === String(value))?.metadata ?? {};
}

function referenceOption(options: ReferenceOption[] | undefined, value: unknown): ReferenceOption | undefined {
  return options?.find((option) => option.value === String(value));
}

function numericFormValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDerivedNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function formatDerivedRate(value: number): string {
  return Number(value.toFixed(8)).toString();
}

function selectedAccountMarkets(referenceOptions: ModuleReferenceOptions, accountId: unknown): string[] {
  const account = referenceMetadata(referenceOptions.accountId, accountId);
  return parseMultiValue(account.supported_markets);
}

function selectOptionsForField(
  moduleId: string,
  field: ModuleField,
  formValues: Record<string, string | boolean>,
  referenceOptions: ModuleReferenceOptions
): string[] | undefined {
  if (moduleId === "securities" && field.name === "market") {
    const markets = selectedAccountMarkets(referenceOptions, formValues.accountId);
    return markets.length > 0 ? markets : field.options;
  }

  return field.options;
}

function filterReferenceOptions(
  moduleId: string,
  field: ModuleField,
  formValues: Record<string, string | boolean>,
  options: ReferenceOption[] | undefined
): ReferenceOption[] | undefined {
  if (!options) {
    return undefined;
  }

  const accountId = String(formValues.accountId ?? "");
  const securityId = String(formValues.securityId ?? "");

  if ((moduleId === "transactions" || moduleId === "cashflows") && field.name === "securityId" && accountId) {
    return options.filter((option) => option.metadata.account_id === accountId);
  }

  if ((field.name === "thesisId" || field.name === "relatedThesisId") && securityId) {
    return options.filter((option) => option.metadata.security_id === securityId);
  }

  if ((field.name === "decisionId" || field.name === "correctionOfId") && (securityId || accountId)) {
    return options.filter((option) => {
      const matchesSecurity = !securityId || option.metadata.security_id === securityId;
      const matchesAccount = !accountId || !option.metadata.account_id || option.metadata.account_id === accountId;
      return matchesSecurity && matchesAccount;
    });
  }

  return options;
}

function isCashflowExternalType(value: unknown): boolean {
  return ["Deposit", "Withdrawal"].includes(String(value));
}

function isCashflowIncomeType(value: unknown): boolean {
  return ["Dividend", "Interest"].includes(String(value));
}

function syncDerivedFormValues(
  moduleId: string,
  values: Record<string, string | boolean>,
  referenceOptions: ModuleReferenceOptions = {},
  changedFieldName?: string
): Record<string, string | boolean> {
  if (moduleId === "securities") {
    const next = { ...values };
    if (assetTypeRequiresLockup(next.assetType)) {
      next.lockupDays = next.lockupDays === "" || next.lockupDays === undefined ? "0" : next.lockupDays;
    } else {
      next.lockupDays = "";
    }
    next.liquidityLevel = deriveLiquidityLevel(next.assetType, next.lockupDays);
    return next;
  }

  const next = { ...values };

  if (moduleId === "transactions") {
    const security = referenceMetadata(referenceOptions.securityId, next.securityId);
    if (security.account_id) {
      next.accountId = security.account_id;
    }
    if (security.currency) {
      next.currency = security.currency;
    } else {
      const account = referenceMetadata(referenceOptions.accountId, next.accountId);
      if (account.currency) {
        next.currency = account.currency;
      }
    }

    const grossAmount = numericFormValue(next.quantity) * numericFormValue(next.unitPrice);
    const totalFees = numericFormValue(next.commission) + numericFormValue(next.tax) + numericFormValue(next.otherFees);
    const proceedsTypes = new Set(["Sell", "Redeem", "TransferOut"]);
    const originalAmount = proceedsTypes.has(String(next.transactionType)) ? grossAmount - totalFees : grossAmount + totalFees;
    next.grossAmount = formatDerivedNumber(grossAmount);
    next.baseCurrencyAmount = formatDerivedNumber(originalAmount * numericFormValue(next.fxRate, 1));
  }

  if (moduleId === "prices") {
    const security = referenceMetadata(referenceOptions.securityId, next.securityId);
    if (security.currency) {
      next.currency = security.currency;
    }
  }

  if (moduleId === "cashflows") {
    const security = referenceMetadata(referenceOptions.securityId, next.securityId);
    if (security.account_id) {
      next.accountId = security.account_id;
    }
    if (security.currency) {
      next.currency = security.currency;
    }

    const account = referenceMetadata(referenceOptions.accountId, next.accountId);
    if (!security.currency && account.currency && (changedFieldName === "accountId" || !next.currency)) {
      next.currency = account.currency;
    }

    const amount = Math.abs(numericFormValue(next.amount));
    const baseAmount = Math.abs(numericFormValue(next.baseCurrencyAmount));
    const fxRate = numericFormValue(next.fxRate, 1);

    if (changedFieldName === "baseCurrencyAmount") {
      next.fxRate = formatDerivedRate(amount > 0 ? baseAmount / amount : fxRate || 1);
    } else {
      next.baseCurrencyAmount = formatDerivedNumber(amount * (fxRate || 1));
    }

    next.isExternal = isCashflowExternalType(next.cashflowType);
    next.isInvestmentIncome = isCashflowIncomeType(next.cashflowType);
  }

  return next;
}

function initialFormValues(definition: ModuleDefinition): Record<string, string | boolean> {
  const values = Object.fromEntries(definition.fields.map((field) => [field.name, initialFieldValue(field)]));
  return syncDerivedFormValues(definition.id, values);
}

function rowFieldValue(field: ModuleField, row: Row): string | boolean {
  const value: unknown = row[field.column];

  if (field.type === "boolean") {
    return value === true || value === 1 || value === "1" || value === "true";
  }

  if ((field.type === "tags" || field.type === "multi-select") && typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as string[]).join(", ");
    } catch {
      return value;
    }
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function formValuesFromRow(definition: ModuleDefinition, row: Row): Record<string, string | boolean> {
  const values = Object.fromEntries(definition.fields.map((field) => [field.name, rowFieldValue(field, row)]));
  return syncDerivedFormValues(definition.id, values);
}

function recordDisplayName(row: Row, language: Language): string {
  return displayValue(row.name ?? row.source_name ?? row.label ?? row.id ?? row.code ?? row.security_id ?? row.account_id ?? row._rowid, language);
}

function localizeTextPair(language: Language, zh: string, en: string): string {
  return language === "en-US" ? en : translateText(zh, language);
}

function localizeField(field: ModuleField, language: Language): string {
  return localizeTextPair(language, field.labelZh, field.labelEn);
}

function securityLifecycleLabel(bucket: SecurityLifecycleFilter, language: Language): string {
  const label = securityLifecycleFilterLabels[bucket];
  return localizeTextPair(language, label.zh, label.en);
}

function securityLifecycleBadgeClass(bucket: SecurityLifecycleBucket): string {
  const classes: Record<SecurityLifecycleBucket, string> = {
    holding: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    observed: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    candidate: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    exited: "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
    blocked: "border-transparent bg-destructive/10 text-destructive"
  };
  return classes[bucket];
}

function weekdayLabels(language: Language): string[] {
  return language === "en-US" ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "一", "二", "三", "四", "五", "六"];
}

function dateRangeLabel(mode: DateFilterMode, month: string, day: string | undefined, t: Dictionary): string {
  if (mode === "last30") {
    return t.last30Days;
  }

  if (mode === "month") {
    return `${t.selectedMonth}: ${month}`;
  }

  if (mode === "day" && day) {
    return `${t.selectedDay}: ${day}`;
  }

  return t.allDates;
}

function mergedAccountInstitutionRowSpan(rows: Row[], index: number, column: string): number {
  if (column !== "institution_name") {
    return 1;
  }

  const value = String(rows[index]?.institution_name ?? "");
  if (index > 0 && String(rows[index - 1]?.institution_name ?? "") === value) {
    return 0;
  }

  let span = 1;
  for (let nextIndex = index + 1; nextIndex < rows.length; nextIndex += 1) {
    if (String(rows[nextIndex]?.institution_name ?? "") !== value) {
      break;
    }
    span += 1;
  }

  return span;
}

type DateSortDirection = "asc" | "desc";

interface DateSortState {
  column: string;
  direction: DateSortDirection;
}

function sortRowsByDate(rows: Row[], sort: DateSortState | undefined): Row[] {
  if (!sort) {
    return rows;
  }

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftDate = formatDateKey(left.row[sort.column]) ?? "";
      const rightDate = formatDateKey(right.row[sort.column]) ?? "";
      const dateComparison = leftDate.localeCompare(rightDate);
      const directionMultiplier = sort.direction === "asc" ? 1 : -1;

      return dateComparison === 0 ? left.index - right.index : dateComparison * directionMultiplier;
    })
    .map((item) => item.row);
}

function nextDateSort(current: DateSortState | undefined, column: string): DateSortState | undefined {
  if (!current || current.column !== column) {
    return { column, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { column, direction: "desc" };
  }

  return undefined;
}

function cashflowContextHint(
  moduleId: string,
  fieldName: string,
  formValues: Record<string, string | boolean>,
  language: Language
): string | null {
  if (moduleId !== "cashflows") {
    return null;
  }

  const currency = String(formValues.currency || "CNY");

  if (fieldName === "fxRate") {
    if (language === "en-US") {
      return `Conversion direction: ${currency} -> CNY. Enter the rate to calculate the base amount.`;
    }

    return `${translateText("换算方向", language)}：${currency} → CNY；${translateText("填写汇率后自动计算基准金额。", language)}`;
  }

  if (fieldName === "baseCurrencyAmount") {
    return language === "en-US"
      ? "Enter the base amount to recalculate the FX rate as base amount divided by original amount."
      : translateText("填写基准金额后，系统会按“基准金额 ÷ 金额”反算汇率。", language);
  }

  return null;
}

function FieldControl({
  moduleId,
  field,
  value,
  disabled = false,
  formValues,
  referenceOptions,
  selectOptions,
  onChange
}: {
  moduleId: string;
  field: ModuleField;
  value: string | boolean;
  disabled?: boolean;
  formValues: Record<string, string | boolean>;
  referenceOptions?: ReferenceOption[];
  selectOptions?: string[];
  onChange: (value: string | boolean) => void;
}) {
  const { language } = useLanguage();
  const label = localizeField(field, language);
  const help = translateFieldHelp({
    column: field.column,
    labelZh: field.labelZh,
    labelEn: field.labelEn,
    language
  });
  const contextHint = cashflowContextHint(moduleId, field.name, formValues, language);

  if (referenceOptions) {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel label={label} help={help} required={field.required} />
        <Select value={String(value)} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger aria-label={label}>
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            {referenceOptions.map((option) => (
              <SelectItem value={option.value} key={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "tags") {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={field.name} label={label} help={help} required={field.required} />
        <Textarea
          id={field.name}
          name={field.name}
          value={String(value)}
          placeholder={field.type === "tags" ? "AI Capex, USD" : undefined}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          disabled={disabled}
        />
      </div>
    );
  }

  if (field.type === "select") {
    const options =
      field.dependsOn && field.optionGroups
        ? field.optionGroups[String(formValues[field.dependsOn])] ?? []
        : selectOptions ?? field.options ?? [];

    return (
      <div className="flex flex-col gap-2">
        <FieldLabel label={label} help={help} required={field.required} />
        <Select value={String(value)} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger aria-label={label}>
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

  if (field.type === "multi-select") {
    const selectedValues = parseMultiValue(value);
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel label={label} help={help} required={field.required} />
        <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
          {(field.options ?? []).map((option) => {
            const selected = selectedValues.includes(option);
            return (
              <Button
                key={option}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange(toggleMultiValue(value, option))}
              >
                {translateEnum(option, language)}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "computed") {
    const computedValue = isBooleanDisplayColumn(field.column)
      ? translateBoolean(value, language)
      : displayValue(value, language);

    return (
      <div className="flex flex-col gap-2">
        <FieldLabel label={label} help={help} required={field.required} />
        <div
          role="status"
          aria-label={label}
          className="flex h-10 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm"
        >
          <Badge variant="outline">{computedValue}</Badge>
          <span className="text-xs text-muted-foreground">{language === "en-US" ? "Calculated" : translateText("系统计算", language)}</span>
        </div>
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <FieldLabel htmlFor={field.name} label={label} help={help} required={field.required} />
        <Switch id={field.name} checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={field.name} label={label} help={help} required={field.required} />
      <Input
        id={field.name}
        name={field.name}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        step={field.type === "number" ? "any" : undefined}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        disabled={disabled}
      />
      {contextHint ? <p className="text-xs text-muted-foreground">{contextHint}</p> : null}
    </div>
  );
}

function fieldWrapperClassName(field: ModuleField): string {
  return field.type === "textarea" || field.type === "tags" || field.type === "multi-select" ? "md:col-span-2" : "";
}

function isFieldVisible(field: ModuleField, formValues: Record<string, string | boolean>): boolean {
  if (field.hidden) {
    return false;
  }

  if (!field.visibleWhen) {
    return true;
  }

  return field.visibleWhen.values.includes(String(formValues[field.visibleWhen.field]));
}

function ModuleFormGrid({
  moduleId,
  fields,
  formValues,
  isEditing,
  referenceOptions,
  setFormValues
}: {
  moduleId: string;
  fields: ModuleField[];
  formValues: Record<string, string | boolean>;
  isEditing: boolean;
  referenceOptions: ModuleReferenceOptions;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.filter((field) => isFieldVisible(field, formValues)).map((field) => {
        const fieldReferenceOptions = filterReferenceOptions(moduleId, field, formValues, referenceOptions[field.name]);
        const fieldSelectOptions = selectOptionsForField(moduleId, field, formValues, referenceOptions);

        return (
          <div key={field.name} className={fieldWrapperClassName(field)}>
            <FieldControl
              moduleId={moduleId}
              field={field}
              value={formValues[field.name] ?? ""}
              disabled={field.type === "computed" || (isEditing && isFieldReadOnlyOnEdit(field))}
              formValues={formValues}
              referenceOptions={fieldReferenceOptions}
              selectOptions={fieldSelectOptions}
              onChange={(value) =>
                setFormValues((current) => {
                  const next = { ...current, [field.name]: value };

                  for (const childField of fields) {
                    if (childField.dependsOn !== field.name || !childField.optionGroups) {
                      continue;
                    }

                    const childOptions = childField.optionGroups[String(value)] ?? [];
                    if (!childOptions.includes(String(next[childField.name]))) {
                      next[childField.name] = childOptions[0] ?? "";
                    }
                  }

                  if ((moduleId === "transactions" || moduleId === "cashflows") && field.name === "accountId") {
                    const selectedSecurity = referenceOption(referenceOptions.securityId, next.securityId);
                    if (selectedSecurity?.metadata.account_id && selectedSecurity.metadata.account_id !== String(value)) {
                      next.securityId = "";
                    }
                  }

                  if (moduleId === "securities" && field.name === "accountId") {
                    const markets = selectedAccountMarkets(referenceOptions, value);
                    if (markets.length > 0 && !markets.includes(String(next.market))) {
                      next.market = markets[0];
                    }
                  }

                  return syncDerivedFormValues(moduleId, next, referenceOptions, field.name);
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function fieldsByName(fields: ModuleField[], names: string[]): ModuleField[] {
  const fieldMap = new Map(fields.map((field) => [field.name, field]));
  return names.flatMap((name) => {
    const field = fieldMap.get(name);
    return field ? [field] : [];
  });
}

function AccountFormContent({
  fields,
  formValues,
  isEditing,
  referenceOptions,
  setFormValues
}: {
  fields: ModuleField[];
  formValues: Record<string, string | boolean>;
  isEditing: boolean;
  referenceOptions: ModuleReferenceOptions;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
}) {
  const { language } = useLanguage();
  const basicFields = fieldsByName(fields, ["id", "institutionName", "accountName", "accountType", "supportedMarkets", "currency", "dataUpdateMethod"]);
  const restrictionFields = fieldsByName(fields, ["allowMarginOrDerivatives", "includeInNetWorth", "initialEntryDate", "notes"]);
  const basicTitle = language === "en-US" ? "Basic Information" : translateText("基本信息", language);
  const basicDescription =
    language === "en-US"
      ? "Choose or fill account identity, institution, account name, supported markets, currency, and data maintenance method."
      : translateText("选择或填写账户标识、机构、账户名称、支持市场、币种和数据维护方式。", language);
  const restrictionTitle = language === "en-US" ? "Strategy Restrictions" : translateText("策略限制", language);
  const restrictionDescription =
    language === "en-US"
      ? "Configure inclusion and margin controls, then record the initial entry date and notes."
      : translateText("通过开关配置纳入净值和融资/衍生品限制，并补充初始录入日期与备注。", language);

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="rounded-md border bg-muted/20 p-4" aria-describedby="account-basic-description">
        <legend className="px-1 text-sm font-semibold">{basicTitle}</legend>
        <p id="account-basic-description" className="mb-4 text-xs text-muted-foreground">
          {basicDescription}
        </p>
        <ModuleFormGrid moduleId="accounts" fields={basicFields} formValues={formValues} isEditing={isEditing} referenceOptions={referenceOptions} setFormValues={setFormValues} />
      </fieldset>
      <fieldset className="rounded-md border bg-muted/20 p-4" aria-describedby="account-restriction-description">
        <legend className="px-1 text-sm font-semibold">{restrictionTitle}</legend>
        <p id="account-restriction-description" className="mb-4 text-xs text-muted-foreground">
          {restrictionDescription}
        </p>
        <ModuleFormGrid moduleId="accounts" fields={restrictionFields} formValues={formValues} isEditing={isEditing} referenceOptions={referenceOptions} setFormValues={setFormValues} />
      </fieldset>
    </div>
  );
}

function ModuleFormContent({
  definition,
  formValues,
  isEditing,
  referenceOptions,
  setFormValues
}: {
  definition: ModuleDefinition;
  formValues: Record<string, string | boolean>;
  isEditing: boolean;
  referenceOptions: ModuleReferenceOptions;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
}) {
  if (definition.id === "accounts") {
    return <AccountFormContent fields={definition.fields} formValues={formValues} isEditing={isEditing} referenceOptions={referenceOptions} setFormValues={setFormValues} />;
  }

  return <ModuleFormGrid moduleId={definition.id} fields={definition.fields} formValues={formValues} isEditing={isEditing} referenceOptions={referenceOptions} setFormValues={setFormValues} />;
}

export function ModulePage({
  definition,
  rows,
  referenceOptions = {},
  priceEntrySecurities = [],
  securityLifecycleEntries = []
}: {
  definition: ModuleDefinition;
  rows: Row[];
  referenceOptions?: ModuleReferenceOptions;
  priceEntrySecurities?: PriceEntrySecurity[];
  securityLifecycleEntries?: SecurityLifecycleEntry[];
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { settings } = useAppSettings();
  const marketChangeColorMode = settings.marketChange.colorMode;
  const dateFields = useMemo(() => getCalendarDateFields(definition), [definition]);
  const initialDateColumn = useMemo(() => getDefaultCalendarColumn(definition), [definition]);
  const fieldByColumn = useMemo(() => new Map(definition.fields.map((field) => [field.column, field])), [definition.fields]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | undefined>(undefined);
  const [selectedDateColumn, setSelectedDateColumn] = useState<string | undefined>(initialDateColumn);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => (initialDateColumn ? getDefaultMonth(rows, initialDateColumn) : new Date().toISOString().slice(0, 7)));
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [dateSort, setDateSort] = useState<DateSortState | undefined>(undefined);
  const [securityLifecycleFilter, setSecurityLifecycleFilter] = useState<SecurityLifecycleFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(() => initialFormValues(definition));
  const lifecycleBySecurityId = useMemo(
    () => new Map(securityLifecycleEntries.map((entry) => [entry.id, entry])),
    [securityLifecycleEntries]
  );

  const searchedRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }

    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [query, rows]);

  const lifecycleFilteredRows = useMemo(() => {
    if (definition.id !== "securities" || securityLifecycleFilter === "all") {
      return searchedRows;
    }

    return searchedRows.filter((row) => (lifecycleBySecurityId.get(String(row.id))?.bucket ?? "blocked") === securityLifecycleFilter);
  }, [definition.id, lifecycleBySecurityId, searchedRows, securityLifecycleFilter]);

  const securityLifecycleCounts = useMemo(() => {
    const counts: Record<SecurityLifecycleFilter, number> = {
      all: searchedRows.length,
      observed: 0,
      holding: 0,
      exited: 0,
      candidate: 0,
      blocked: 0
    };

    if (definition.id !== "securities") {
      return counts;
    }

    for (const row of searchedRows) {
      const bucket = lifecycleBySecurityId.get(String(row.id))?.bucket ?? "blocked";
      counts[bucket] += 1;
    }

    return counts;
  }, [definition.id, lifecycleBySecurityId, searchedRows]);

  const filteredRows = useMemo(
    () =>
      filterRowsByDate(lifecycleFilteredRows, selectedDateColumn, {
        mode: dateFilterMode,
        month: selectedMonth,
        day: selectedDay
      }),
    [dateFilterMode, lifecycleFilteredRows, selectedDateColumn, selectedDay, selectedMonth]
  );

  const tableRows = useMemo(() => sortRowsByDate(filteredRows, dateSort), [dateSort, filteredRows]);

  const calendarDays = useMemo(
    () => (selectedDateColumn ? buildCalendarMonth(lifecycleFilteredRows, selectedDateColumn, selectedMonth) : []),
    [lifecycleFilteredRows, selectedDateColumn, selectedMonth]
  );

  const summary = useMemo(() => summarizeRows(rows, filteredRows, selectedDateColumn), [filteredRows, rows, selectedDateColumn]);

  const title = language === "en-US" ? definition.navLabelEn : translateText(definition.navLabelZh, language);
  const description = language === "en-US" ? definition.descriptionEn : translateText(definition.descriptionZh, language);
  const selectedDateField = dateFields.find((field) => field.column === selectedDateColumn);
  const currentDateRange = dateRangeLabel(dateFilterMode, selectedMonth, selectedDay, t);
  const activeFilterLabel = [
    query ? `${t.search}: ${query}` : undefined,
    definition.id === "securities" && securityLifecycleFilter !== "all" ? securityLifecycleLabel(securityLifecycleFilter, language) : undefined,
    dateFilterMode !== "all" ? currentDateRange : undefined
  ].filter(Boolean).join(" · ") || (selectedDateColumn ? t.allDates : localizeTextPair(language, "全部", "All"));
  const weekDays = weekdayLabels(language);
  const isEditing = Boolean(editingRow);

  const setDialogOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditingRow(undefined);
      setFormValues(initialFormValues(definition));
    }
  };

  const openCreateDialog = () => {
    setEditingRow(undefined);
    setFormValues(initialFormValues(definition));
    setOpen(true);
  };

  const openEditDialog = (row: Row) => {
    setEditingRow(row);
    setFormValues(formValuesFromRow(definition, row));
    setOpen(true);
  };

  const setDateColumn = (column: string) => {
    setSelectedDateColumn(column);
    setSelectedMonth(getDefaultMonth(rows, column));
    setSelectedDay(undefined);
    setDateFilterMode("all");
  };

  const clearDateFilter = () => {
    setDateFilterMode("all");
    setSelectedDay(undefined);
  };

  const setDateSortColumn = (column: string) => {
    setDateSort((current) => nextDateSort(current, column));
  };

  const submit = () => {
    startTransition(async () => {
      const response = await fetch(`/api/modules/${definition.id}`, {
        method: editingRow ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRow ? { rowId: editingRow._rowid, values: formValues } : formValues)
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      toast.success(editingRow ? t.recordUpdated : t.formSaved);
      setDialogOpen(false);
      router.refresh();
    });
  };

  const applySourceDraft = (draft: SourceDraftFields & { securityId?: string }) => {
    const next = syncDerivedFormValues(definition.id, {
      ...initialFormValues(definition),
      informationDate: draft.informationDate,
      obtainedDate: draft.obtainedDate,
      securityId: draft.securityId ?? "",
      informationType: draft.informationType,
      evidenceLevel: draft.evidenceLevel,
      sourceName: draft.sourceName,
      sourceUrl: draft.sourceUrl,
      keyFacts: draft.keyFacts,
      thesisImpact: draft.thesisImpact,
      triggersReview: draft.triggersReview,
      enteredBy: "Owner",
      enteredDate: draft.obtainedDate
    }, referenceOptions);
    setEditingRow(undefined);
    setFormValues(next);
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {title}
            <HelpTooltip content={description || translateUiHelp("module.pageTitle", language)} label={title} />
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Dialog open={open} onOpenChange={setDialogOpen}>
          <Button onClick={openCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            {t.newRecord}
          </Button>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? t.editRecord : title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <ModuleFormContent definition={definition} formValues={formValues} isEditing={isEditing} referenceOptions={referenceOptions} setFormValues={setFormValues} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {t.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {definition.id === "fx-rates" ? <FxQuickPanel rows={rows} /> : null}
      {definition.id === "prices" ? <PriceQuickPanel rows={rows} securities={priceEntrySecurities} /> : null}
      {definition.id === "sources" ? (
        <SourceIntelligencePanel securities={referenceOptions.securityId ?? []} onApplyDraft={applySourceDraft} />
      ) : null}

      {definition.id === "securities" ? (
        <Card data-testid="security-lifecycle-filter">
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">{localizeTextPair(language, "标的分层", "Security Buckets")}</CardTitle>
              <CardDescription>
                {localizeTextPair(language, "按持仓、观察、候选和退出状态查看标的。", "View securities by holding, watchlist, candidate, and exited states.")}
              </CardDescription>
            </div>
            {securityLifecycleFilter !== "all" ? (
              <Button variant="outline" size="sm" onClick={() => setSecurityLifecycleFilter("all")}>
                <FilterXIcon data-icon="inline-start" />
                {localizeTextPair(language, "清除分层", "Clear Bucket")}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {securityLifecycleFilterOrder.map((bucket) => (
                <Button
                  key={bucket}
                  type="button"
                  variant={securityLifecycleFilter === bucket ? "default" : "outline"}
                  size="sm"
                  aria-pressed={securityLifecycleFilter === bucket}
                  onClick={() => setSecurityLifecycleFilter(bucket)}
                  className="min-w-24 justify-between gap-2"
                >
                  <span>{securityLifecycleLabel(bucket, language)}</span>
                  <Badge variant={securityLifecycleFilter === bucket ? "secondary" : "outline"} className="px-1.5 py-0 text-[11px]">
                    {securityLifecycleCounts[bucket]}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className={`grid gap-3 md:grid-cols-2 ${selectedDateColumn ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
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
        {selectedDateColumn ? (
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>
                <HeaderHelp label={t.latestDate} help={translateUiHelp("module.latestDate", language)} />
              </CardDescription>
              <CardTitle className="text-xl">{summary.latestDate ?? "N/A"}</CardTitle>
            </CardHeader>
          </Card>
        ) : null}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>
              <HeaderHelp label={t.activeFilters} help={translateUiHelp("module.activeFilters", language)} />
            </CardDescription>
            <CardTitle className="truncate text-xl">{activeFilterLabel}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {selectedDateColumn && selectedDateField ? (
        <Card>
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDaysIcon className="size-4 text-primary" />
                <HeaderHelp label={t.dateDimension} help={translateUiHelp("module.dateDimension", language)} />
              </CardTitle>
              <CardDescription>
                {localizeField(selectedDateField, language)} · {currentDateRange}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearDateFilter}>
              <FilterXIcon data-icon="inline-start" />
              {t.clearDateFilter}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[280px_1fr]">
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
              <div className="grid gap-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  <HeaderHelp label={t.dateField} help={translateUiHelp("module.dateField", language)} />
                </div>
                <Select value={selectedDateColumn} onValueChange={setDateColumn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFields.map((field) => (
                      <SelectItem key={field.column} value={field.column}>
                        {localizeField(field, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Button variant={dateFilterMode === "all" ? "default" : "outline"} size="sm" onClick={clearDateFilter}>
                  {t.allDates}
                </Button>
                <Button
                  variant={dateFilterMode === "last30" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedDay(undefined);
                    setDateFilterMode("last30");
                  }}
                >
                  {t.last30Days}
                </Button>
                <Button
                  variant={dateFilterMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedDay(undefined);
                    setDateFilterMode("month");
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
      ) : null}

      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              <HeaderHelp label={title} help={translateUiHelp("module.table", language)} />
            </CardTitle>
            <CardDescription>
              {filteredRows.length} {t.records}
            </CardDescription>
          </div>
          <div className="flex w-full items-center gap-2 md:w-80">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <HelpTooltip content={translateUiHelp("module.search", language)} label={t.search} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                {definition.tableColumns.map((column) => {
                  const field = fieldByColumn.get(column);
                  const label = translateColumn(definition.table, column, language);
                  const help = translateColumnHelp(definition.table, column, language);
                  const activeSort = dateSort?.column === column ? dateSort.direction : undefined;
                  const SortIcon = activeSort === "asc" ? ArrowUpIcon : activeSort === "desc" ? ArrowDownIcon : ArrowUpDownIcon;
                  const sortLabel = language === "en-US" ? "Sort" : translateText("排序", language);

                  return (
                    <TableHead key={column} data-column={column}>
                      {field?.type === "date" ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            aria-label={`${sortLabel}: ${label}`}
                            aria-sort={activeSort === "asc" ? "ascending" : activeSort === "desc" ? "descending" : "none"}
                            onClick={() => setDateSortColumn(column)}
                          >
                            <span>{label}</span>
                            <SortIcon className="ml-1 size-3.5" />
                          </Button>
                          <HelpTooltip content={help} label={label} />
                        </div>
                      ) : (
                        <HeaderHelp label={label} help={help} />
                      )}
                    </TableHead>
                  );
                })}
                <TableHead data-column="_actions" className="whitespace-nowrap">
                  {t.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={definition.tableColumns.length + 1} className="text-center text-muted-foreground">
                    {t.noRecords}
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row, index) => (
                  <TableRow key={`${definition.id}-${index}`}>
                    {definition.tableColumns.map((column) => {
                      const rowSpan = definition.id === "accounts" ? mergedAccountInstitutionRowSpan(tableRows, index, column) : 1;
                      if (rowSpan === 0) {
                        return null;
                      }

                      const field = fieldByColumn.get(column);
                      const options = field ? referenceOptions[field.name] : undefined;
                      const value = options ? displayReferenceValue(row[column], options, language) : row[column];
                      const securityLifecycle = definition.id === "securities" && column === "name"
                        ? lifecycleBySecurityId.get(String(row.id))
                        : undefined;

                      return (
                        <TableCell key={column} data-column={column} rowSpan={rowSpan > 1 ? rowSpan : undefined} className={rowSpan > 1 ? "align-middle" : undefined}>
                          {securityLifecycle ? (
                            <div className="flex min-w-0 flex-col gap-1.5">
                              <TableDisplayValue column={column} field={field} value={value} language={language} marketChangeColorMode={marketChangeColorMode} />
                              <Badge className={cn("w-fit", securityLifecycleBadgeClass(securityLifecycle.bucket))} data-lifecycle-bucket={securityLifecycle.bucket}>
                                {securityLifecycleLabel(securityLifecycle.bucket, language)}
                              </Badge>
                            </div>
                          ) : (
                            <TableDisplayValue column={column} field={field} value={value} language={language} marketChangeColorMode={marketChangeColorMode} />
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell data-column="_actions" className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                      {definition.id === "securities" ? (
                        <Button variant="outline" size="sm" asChild aria-label={`${t.details} ${recordDisplayName(row, language)}`}>
                          <Link href={`/securities/${encodeURIComponent(String(row.id))}`}>
                            <EyeIcon data-icon="inline-start" />
                            {t.details}
                          </Link>
                        </Button>
                      ) : null}
                      {isModuleRowEditable(definition, row) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`${t.edit} ${recordDisplayName(row, language)}`}
                          onClick={() => openEditDialog(row)}
                        >
                          <PencilIcon data-icon="inline-start" />
                          {t.edit}
                        </Button>
                      ) : (
                        <Badge variant="secondary">{t.recordLocked}</Badge>
                      )}
                      </div>
                    </TableCell>
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
