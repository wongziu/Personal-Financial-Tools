import { describe, expect, test } from "vitest";
import { createDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import { createTradeDecisionWithRisk, getDashboardData, listAllExportData } from "@/lib/services";

describe("database integration", () => {
  test("seeds demo data idempotently", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const tables = [
      "accounts",
      "securities",
      "transactions",
      "cashflows",
      "market_prices",
      "fx_rates",
      "information_sources",
      "theses",
      "thesis_evidence",
      "review_events",
      "trade_decisions",
      "trade_decision_sources",
      "exceptions"
    ];
    const countRows = () =>
      Object.fromEntries(
        tables.map((table) => {
          const row = database.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
          return [table, row.count];
        })
      );

    const firstCounts = countRows();
    seedDemoData(database);

    expect(countRows()).toEqual(firstCounts);
  });

  test("initializes and seeds the local investment system database", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const dashboard = getDashboardData(database);
    const exportData = listAllExportData(database);

    expect(dashboard.baseCurrency).toBe("CNY");
    expect(dashboard.metrics.portfolioNetValue).toBeGreaterThan(0);
    expect(dashboard.riskWarnings.length).toBeGreaterThan(0);
    expect(exportData.accounts.length).toBeGreaterThan(0);
    expect(exportData.tradeDecisions.length).toBeGreaterThan(0);
  });

  test("creates a pre-trade exception draft when executing a hard-limit breach", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const result = createTradeDecisionWithRisk(database, {
      securityId: "US-AAPL",
      thesisId: "THS-2026-001",
      strategyType: "Active",
      action: "Buy",
      currentPrice: 210,
      plannedPriceMin: 208,
      plannedPriceMax: 212,
      plannedAmountBase: 120000,
      preTradeWeight: 0.04,
      postTradeWeight: 0.12,
      maxAllowedWeight: 0.1,
      trigger: "NewFact",
      expectedReturnSource: "EarningsGrowth",
      mainRisks: "Valuation, USD exposure, AI capex cycle",
      downsideLossBase: 25000,
      stopLossOrInvalidation: "Pause additions if two quarters miss order conversion",
      hasSimilarThemeExposure: true,
      similarThemeExposure: 0.22,
      touchesLimits: true,
      isRuleException: false,
      emotionTag: "Calm",
      finalDecision: "Execute",
      sourceIds: ["SRC-2026-001"]
    });

    expect(result.risk.requiresExceptionDraft).toBe(true);
    expect(result.exceptionDraftId).toMatch(/^EXC-2026-/);

    const exportData = listAllExportData(database);
    expect(exportData.exceptions.some((item) => item.id === result.exceptionDraftId)).toBe(true);
  });
});
