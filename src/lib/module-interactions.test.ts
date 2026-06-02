import { describe, expect, test } from "vitest";
import { buildCalendarMonth, filterRowsByDate, formatDateKey, getDateFields, getDefaultMonth, getLatestFxRates, summarizeRows } from "@/lib/module-interactions";
import type { ModuleDefinition } from "@/lib/modules";
import type { Row } from "@/lib/services";

const moduleDefinition = {
  id: "transactions",
  table: "transactions",
  navLabelZh: "交易流水",
  navLabelEn: "Transactions",
  descriptionZh: "",
  descriptionEn: "",
  fields: [
    { name: "tradeDate", column: "trade_date", labelZh: "成交日期", labelEn: "Trade Date", type: "date" },
    { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text" }
  ],
  tableColumns: ["trade_date", "security_id"]
} satisfies ModuleDefinition;

const rows: Row[] = [
  { id: "A", trade_date: "2026-01-03", security_id: "CN-510300" },
  { id: "B", trade_date: "2026-01-04 21:30", security_id: "US-AAPL" },
  { id: "C", trade_date: "2026-02-01", security_id: "US-AAPL" }
];

describe("module interaction helpers", () => {
  test("detects date fields from module metadata", () => {
    expect(getDateFields(moduleDefinition).map((field) => field.column)).toEqual(["trade_date"]);
  });

  test("normalizes date-like values", () => {
    expect(formatDateKey("2026-01-04 21:30")).toBe("2026-01-04");
    expect(formatDateKey("not a date")).toBeNull();
  });

  test("filters rows by month, day, and last 30 days", () => {
    expect(filterRowsByDate(rows, "trade_date", { mode: "month", month: "2026-01" }).map((row) => row.id)).toEqual(["A", "B"]);
    expect(filterRowsByDate(rows, "trade_date", { mode: "day", month: "2026-01", day: "2026-01-04" }).map((row) => row.id)).toEqual(["B"]);
    expect(filterRowsByDate(rows, "trade_date", { mode: "last30", month: "2026-01", now: "2026-02-01" }).map((row) => row.id)).toEqual(["A", "B", "C"]);
  });

  test("builds stable month calendar cells with counts", () => {
    const month = buildCalendarMonth(rows, "trade_date", "2026-01");
    expect(month).toHaveLength(31);
    expect(month.find((day) => day.date === "2026-01-03")?.count).toBe(1);
    expect(month.find((day) => day.date === "2026-01-05")?.count).toBe(0);
  });

  test("summarizes visible rows and dates", () => {
    expect(getDefaultMonth(rows, "trade_date")).toBe("2026-02");
    expect(summarizeRows(rows, rows.slice(0, 2), "trade_date")).toEqual({
      total: 3,
      visible: 2,
      earliestDate: "2026-01-03",
      latestDate: "2026-02-01"
    });
  });

  test("returns latest FX rows per pair", () => {
    const fxRows: Row[] = [
      { rate_date: "2026-06-01", from_currency: "USD", to_currency: "CNY", rate: 7.1 },
      { rate_date: "2026-06-02", from_currency: "USD", to_currency: "CNY", rate: 7.2 },
      { rate_date: "2026-06-02", from_currency: "HKD", to_currency: "CNY", rate: 0.92 }
    ];

    expect(getLatestFxRates(fxRows).map((row) => `${row.from_currency}:${row.rate}`)).toEqual(["USD:7.2", "HKD:0.92"]);
  });
});
