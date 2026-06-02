import type { ModuleDefinition, ModuleField } from "@/lib/modules";
import type { Row } from "@/lib/services";

export type DateFilterMode = "all" | "last30" | "month" | "day";

export interface DateFilterState {
  mode: DateFilterMode;
  month: string;
  day?: string;
  now?: string;
}

export interface CalendarDay {
  date: string;
  day: number;
  weekday: number;
  count: number;
}

export interface RowSummary {
  total: number;
  visible: number;
  earliestDate: string | null;
  latestDate: string | null;
}

export function getDateFields(definition: ModuleDefinition): ModuleField[] {
  return definition.fields.filter((field) => field.type === "date");
}

export function formatDateKey(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value);
  const directMatch = /^\d{4}-\d{2}-\d{2}/.exec(text);
  if (directMatch) {
    return directMatch[0];
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function getLatestDate(rows: Row[], dateColumn: string): string | null {
  return rows
    .map((row) => formatDateKey(row[dateColumn]))
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1) ?? null;
}

export function getEarliestDate(rows: Row[], dateColumn: string): string | null {
  return rows
    .map((row) => formatDateKey(row[dateColumn]))
    .filter((date): date is string => Boolean(date))
    .sort()[0] ?? null;
}

export function getDefaultMonth(rows: Row[], dateColumn: string, fallbackDate = new Date()): string {
  return getLatestDate(rows, dateColumn)?.slice(0, 7) ?? fallbackDate.toISOString().slice(0, 7);
}

export function summarizeRows(totalRows: Row[], visibleRows: Row[], dateColumn?: string): RowSummary {
  return {
    total: totalRows.length,
    visible: visibleRows.length,
    earliestDate: dateColumn ? getEarliestDate(totalRows, dateColumn) : null,
    latestDate: dateColumn ? getLatestDate(totalRows, dateColumn) : null
  };
}

export function filterRowsByDate(rows: Row[], dateColumn: string | undefined, filter: DateFilterState): Row[] {
  if (!dateColumn || filter.mode === "all") {
    return rows;
  }

  if (filter.mode === "day" && filter.day) {
    return rows.filter((row) => formatDateKey(row[dateColumn]) === filter.day);
  }

  if (filter.mode === "month") {
    return rows.filter((row) => formatDateKey(row[dateColumn])?.startsWith(filter.month));
  }

  if (filter.mode === "last30") {
    const nowKey = formatDateKey(filter.now ?? new Date()) ?? new Date().toISOString().slice(0, 10);
    const start = new Date(`${nowKey}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 29);
    const startKey = start.toISOString().slice(0, 10);

    return rows.filter((row) => {
      const value = formatDateKey(row[dateColumn]);
      return Boolean(value && value >= startKey && value <= nowKey);
    });
  }

  return rows;
}

export function buildCalendarMonth(rows: Row[], dateColumn: string, month: string): CalendarDay[] {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = formatDateKey(row[dateColumn]);
    if (date?.startsWith(month)) {
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }

  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return {
      date,
      day,
      weekday: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
      count: counts.get(date) ?? 0
    };
  });
}

export function getLatestFxRates(rows: Row[]): Row[] {
  const latestByPair = new Map<string, Row>();
  const sorted = [...rows].sort((a, b) => String(b.rate_date).localeCompare(String(a.rate_date)));

  for (const row of sorted) {
    const key = `${String(row.from_currency)}->${String(row.to_currency)}`;
    if (!latestByPair.has(key)) {
      latestByPair.set(key, row);
    }
  }

  return [...latestByPair.values()];
}
