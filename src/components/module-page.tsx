"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDaysIcon, FilterXIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ModuleDefinition, ModuleField } from "@/lib/modules";
import type { Row } from "@/lib/services";
import { FxQuickPanel } from "@/components/fx-quick-panel";
import { FieldLabel, HeaderHelp, HelpTooltip } from "@/components/help-tooltip";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  translateColumn,
  translateColumnHelp,
  translateEnum,
  translateFieldHelp,
  translateText,
  translateUiHelp,
  type Dictionary,
  type Language
} from "@/lib/i18n";
import { buildCalendarMonth, filterRowsByDate, getDateFields, getDefaultMonth, summarizeRows, type DateFilterMode } from "@/lib/module-interactions";

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

function localizeField(field: ModuleField, language: Language): string {
  return language === "en-US" ? field.labelEn : translateText(field.labelZh, language);
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

function FieldControl({
  field,
  value,
  onChange
}: {
  field: ModuleField;
  value: string | boolean;
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

  if (field.type === "textarea" || field.type === "tags") {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={field.name} label={label} help={help} />
        <Textarea
          id={field.name}
          name={field.name}
          value={String(value)}
          placeholder={field.type === "tags" ? "AI Capex, USD" : undefined}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel label={label} help={help} />
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem value={option} key={option}>
                {translateEnum(option, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <FieldLabel htmlFor={field.name} label={label} help={help} />
        <Switch id={field.name} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={field.name} label={label} help={help} />
      <Input
        id={field.name}
        name={field.name}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        step={field.type === "number" ? "any" : undefined}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    </div>
  );
}

export function ModulePage({ definition, rows }: { definition: ModuleDefinition; rows: Row[] }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const dateFields = useMemo(() => getDateFields(definition), [definition]);
  const initialDateColumn = dateFields[0]?.column;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedDateColumn, setSelectedDateColumn] = useState<string | undefined>(initialDateColumn);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => (initialDateColumn ? getDefaultMonth(rows, initialDateColumn) : new Date().toISOString().slice(0, 7)));
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(definition.fields.map((field) => [field.name, initialFieldValue(field)]))
  );

  const searchedRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }

    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [query, rows]);

  const filteredRows = useMemo(
    () =>
      filterRowsByDate(searchedRows, selectedDateColumn, {
        mode: dateFilterMode,
        month: selectedMonth,
        day: selectedDay
      }),
    [dateFilterMode, searchedRows, selectedDateColumn, selectedDay, selectedMonth]
  );

  const calendarDays = useMemo(
    () => (selectedDateColumn ? buildCalendarMonth(searchedRows, selectedDateColumn, selectedMonth) : []),
    [searchedRows, selectedDateColumn, selectedMonth]
  );

  const summary = useMemo(() => summarizeRows(rows, filteredRows, selectedDateColumn), [filteredRows, rows, selectedDateColumn]);

  const title = language === "en-US" ? definition.navLabelEn : translateText(definition.navLabelZh, language);
  const description = language === "en-US" ? definition.descriptionEn : translateText(definition.descriptionZh, language);
  const selectedDateField = dateFields.find((field) => field.column === selectedDateColumn);
  const currentDateRange = dateRangeLabel(dateFilterMode, selectedMonth, selectedDay, t);
  const activeFilterLabel = query ? `${t.search}: ${query}` : dateFilterMode !== "all" ? currentDateRange : t.allDates;
  const weekDays = weekdayLabels(language);

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

  const submit = () => {
    startTransition(async () => {
      const response = await fetch(`/api/modules/${definition.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues)
      });

      if (!response.ok) {
        toast.error(t.formError);
        return;
      }

      toast.success(t.formSaved);
      setOpen(false);
      router.refresh();
    });
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              {t.newRecord}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              {definition.fields.map((field) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  value={formValues[field.name] ?? ""}
                  onChange={(value) => setFormValues((current) => ({ ...current, [field.name]: value }))}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
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
          <Table>
            <TableHeader>
              <TableRow>
                {definition.tableColumns.map((column) => (
                  <TableHead key={column}>
                    <HeaderHelp
                      label={translateColumn(definition.table, column, language)}
                      help={translateColumnHelp(definition.table, column, language)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={definition.tableColumns.length} className="text-center text-muted-foreground">
                    {t.noRecords}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, index) => (
                  <TableRow key={`${definition.id}-${index}`}>
                    {definition.tableColumns.map((column) => (
                      <TableCell key={column}>
                        {column.includes("status") || column.includes("severity") ? (
                          <Badge variant="secondary">{displayValue(row[column], language)}</Badge>
                        ) : (
                          displayValue(row[column], language)
                        )}
                      </TableCell>
                    ))}
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
