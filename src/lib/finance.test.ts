import { describe, expect, test } from "vitest";
import { buildExportWorkbook } from "@/lib/export";
import { generateBusinessId } from "@/lib/ids";
import {
  calculateCashBalances,
  calculateHoldings,
  calculatePortfolioSnapshot
} from "@/lib/portfolio";
import { calculateAccountDailyPerformance } from "@/lib/account-performance";
import { evaluateTradeDecisionRisk } from "@/lib/risk";

describe("business id generation", () => {
  test("generates deterministic prefixed ids with yearly scopes", () => {
    expect(generateBusinessId("DEC", 2026, 7)).toBe("DEC-2026-007");
    expect(generateBusinessId("ACC-CN", undefined, 12)).toBe("ACC-CN-012");
  });
});

describe("portfolio calculation", () => {
  test("calculates holdings with moving average cost from settled transactions", () => {
    const holdings = calculateHoldings([
      {
        id: "TRD-2026-001",
        accountId: "ACC-CN-001",
        securityId: "CN-510300",
        strategyType: "Core",
        transactionType: "Buy",
        status: "Settled",
        quantity: 100,
        unitPrice: 4,
        grossAmount: 400,
        totalFees: 2,
        baseCurrencyAmount: 402,
        tradeDate: "2026-01-02"
      },
      {
        id: "TRD-2026-002",
        accountId: "ACC-CN-001",
        securityId: "CN-510300",
        strategyType: "Core",
        transactionType: "Buy",
        status: "Settled",
        quantity: 50,
        unitPrice: 5,
        grossAmount: 250,
        totalFees: 1,
        baseCurrencyAmount: 251,
        tradeDate: "2026-01-03"
      },
      {
        id: "TRD-2026-003",
        accountId: "ACC-CN-001",
        securityId: "CN-510300",
        strategyType: "Core",
        transactionType: "Sell",
        status: "Settled",
        quantity: 30,
        unitPrice: 6,
        grossAmount: 180,
        totalFees: 1,
        baseCurrencyAmount: 179,
        tradeDate: "2026-01-04"
      },
      {
        id: "TRD-2026-004",
        accountId: "ACC-CN-001",
        securityId: "US-AAPL",
        strategyType: "Active",
        transactionType: "Buy",
        status: "Draft",
        quantity: 10,
        unitPrice: 100,
        grossAmount: 1000,
        totalFees: 0,
        baseCurrencyAmount: 7200,
        tradeDate: "2026-01-04"
      }
    ]);

    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      accountId: "ACC-CN-001",
      securityId: "CN-510300",
      quantity: 120,
      strategyType: "Core"
    });
    expect(holdings[0].totalCost).toBeCloseTo(522.4, 5);
    expect(holdings[0].realizedProfit).toBeCloseTo(48.4, 5);
  });

  test("calculates cash balances from external cashflows and trades", () => {
    const balances = calculateCashBalances(
      [
        {
          id: "CFL-2026-001",
          accountId: "ACC-CN-001",
          cashflowType: "Deposit",
          currency: "CNY",
          amount: 10000,
          baseCurrencyAmount: 10000,
          isExternal: true,
          isInvestmentIncome: false,
          cashflowDate: "2026-01-01"
        },
        {
          id: "CFL-2026-002",
          accountId: "ACC-CN-001",
          cashflowType: "Dividend",
          currency: "CNY",
          amount: 30,
          baseCurrencyAmount: 30,
          isExternal: false,
          isInvestmentIncome: true,
          cashflowDate: "2026-01-05"
        }
      ],
      [
        {
          id: "TRD-2026-001",
          accountId: "ACC-CN-001",
          securityId: "CN-510300",
          strategyType: "Core",
          transactionType: "Buy",
          status: "Settled",
          quantity: 100,
          unitPrice: 4,
          grossAmount: 400,
          totalFees: 2,
          baseCurrencyAmount: 402,
          tradeDate: "2026-01-02"
        }
      ]
    );

    expect(balances.get("ACC-CN-001:CNY")).toBe(9628);
  });

  test("builds a portfolio snapshot with market prices and fx rates", () => {
    const snapshot = calculatePortfolioSnapshot({
      asOfDate: "2026-01-05",
      holdings: [
        {
          accountId: "ACC-US-001",
          securityId: "US-AAPL",
          strategyType: "Active",
          quantity: 10,
          totalCost: 7200,
          averageCost: 720,
          realizedProfit: 0
        }
      ],
      cashBalances: new Map([["ACC-US-001:USD", 100]]),
      prices: [{ securityId: "US-AAPL", priceDate: "2026-01-05", closePrice: 110, currency: "USD" }],
      fxRates: [{ rateDate: "2026-01-05", fromCurrency: "USD", toCurrency: "CNY", rate: 7.2 }],
      securities: [{ id: "US-AAPL", riskThemeTags: ["AI Capex", "USD"], industryLevel1: "Technology" }]
    });

    expect(snapshot.portfolioNetValue).toBe(8640);
    expect(snapshot.positions[0].marketValueBase).toBe(7920);
    expect(snapshot.positions[0].weight).toBeCloseTo(0.916666, 5);
    expect(snapshot.riskThemeWeights.get("AI Capex")).toBeCloseTo(0.916666, 5);
  });

  test("uses the latest available price and fx rate on or before the snapshot date", () => {
    const snapshot = calculatePortfolioSnapshot({
      asOfDate: "2026-01-05",
      holdings: [
        {
          accountId: "ACC-US-001",
          securityId: "US-AAPL",
          strategyType: "Active",
          quantity: 10,
          totalCost: 7200,
          averageCost: 720,
          realizedProfit: 0
        }
      ],
      cashBalances: new Map([["ACC-US-001:USD", 0]]),
      prices: [
        { securityId: "US-AAPL", priceDate: "2026-01-01", closePrice: 100, currency: "USD" },
        { securityId: "US-AAPL", priceDate: "2026-01-05", closePrice: 110, currency: "USD" },
        { securityId: "US-AAPL", priceDate: "2026-01-08", closePrice: 130, currency: "USD" }
      ],
      fxRates: [
        { rateDate: "2026-01-01", fromCurrency: "USD", toCurrency: "CNY", rate: 7.1 },
        { rateDate: "2026-01-05", fromCurrency: "USD", toCurrency: "CNY", rate: 7.2 },
        { rateDate: "2026-01-08", fromCurrency: "USD", toCurrency: "CNY", rate: 7.5 }
      ],
      securities: [{ id: "US-AAPL", riskThemeTags: ["AI Capex"], industryLevel1: "Technology" }]
    });

    expect(snapshot.positions[0].marketPrice).toBe(110);
    expect(snapshot.positions[0].marketValueBase).toBe(7920);
  });

  test("recomputes account daily nav and pnl from ledger changes and same-day nav anchors", () => {
    const commonInput = {
      accounts: [
        {
          id: "ACC-CN-001",
          institutionName: "Demo Broker",
          includeInNetWorth: true,
          initialEntryDate: "2026-01-01"
        }
      ],
      securities: [{ id: "CN-510300", riskThemeTags: ["China Equity"], industryLevel1: "Broad Market" }],
      cashflows: [
        {
          id: "CFL-2026-001",
          accountId: "ACC-CN-001",
          cashflowType: "Deposit" as const,
          currency: "CNY" as const,
          amount: 1000,
          baseCurrencyAmount: 1000,
          isExternal: true,
          isInvestmentIncome: false,
          cashflowDate: "2026-01-01"
        }
      ],
      prices: [
        { securityId: "CN-510300", priceDate: "2026-01-02", closePrice: 10, currency: "CNY" as const },
        { securityId: "CN-510300", priceDate: "2026-01-03", closePrice: 12, currency: "CNY" as const }
      ],
      fxRates: [],
      startDate: "2026-01-01",
      endDate: "2026-01-03"
    };

    const rows = calculateAccountDailyPerformance({
      ...commonInput,
      transactions: [
        {
          id: "TRD-2026-001",
          accountId: "ACC-CN-001",
          securityId: "CN-510300",
          strategyType: "Core",
          transactionType: "Buy",
          status: "Settled",
          quantity: 10,
          unitPrice: 10,
          grossAmount: 100,
          totalFees: 0,
          baseCurrencyAmount: 100,
          tradeDate: "2026-01-02"
        }
      ],
      navAnchors: []
    });

    expect(rows.map((row) => [row.snapshotDate, row.netAssetValueBase, row.dailyPnlBase])).toEqual([
      ["2026-01-01", 1000, 0],
      ["2026-01-02", 1000, 0],
      ["2026-01-03", 1020, 20]
    ]);

    const correctedRows = calculateAccountDailyPerformance({
      ...commonInput,
      transactions: [
        {
          id: "TRD-2026-001-CORR",
          accountId: "ACC-CN-001",
          securityId: "CN-510300",
          strategyType: "Core",
          transactionType: "Buy",
          status: "Settled",
          quantity: 10,
          unitPrice: 10,
          grossAmount: 100,
          totalFees: 10,
          baseCurrencyAmount: 110,
          tradeDate: "2026-01-02"
        }
      ],
      navAnchors: []
    });

    expect(correctedRows[1]?.netAssetValueBase).toBe(990);
    expect(correctedRows[1]?.dailyPnlBase).toBe(-10);
    expect(correctedRows.at(-1)?.netAssetValueBase).toBe(1010);
    expect(correctedRows.at(-1)?.dailyPnlBase).toBe(20);

    const anchoredRows = calculateAccountDailyPerformance({
      ...commonInput,
      transactions: [
        {
          id: "TRD-2026-001",
          accountId: "ACC-CN-001",
          securityId: "CN-510300",
          strategyType: "Core",
          transactionType: "Buy",
          status: "Settled",
          quantity: 10,
          unitPrice: 10,
          grossAmount: 100,
          totalFees: 0,
          baseCurrencyAmount: 100,
          tradeDate: "2026-01-02"
        }
      ],
      navAnchors: [
        {
          id: 1,
          accountId: "ACC-CN-001",
          anchorDate: "2026-01-03",
          netAssetValueBase: 1015,
          source: "Manual reconciliation",
          notes: "Broker statement"
        }
      ]
    });

    expect(anchoredRows.at(-1)?.netAssetValueBase).toBe(1015);
    expect(anchoredRows.at(-1)?.dailyPnlBase).toBe(15);
    expect(anchoredRows.at(-1)?.isAnchored).toBe(true);

    const openingAnchorRows = calculateAccountDailyPerformance({
      accounts: commonInput.accounts,
      transactions: [],
      cashflows: [],
      prices: [],
      fxRates: [],
      securities: commonInput.securities,
      navAnchors: [
        {
          id: 2,
          accountId: "ACC-CN-001",
          anchorDate: "2026-01-01",
          netAssetValueBase: 1000,
          source: "Opening statement",
          notes: null
        }
      ],
      startDate: "2026-01-01",
      endDate: "2026-01-01"
    });

    expect(openingAnchorRows[0]?.netAssetValueBase).toBe(1000);
    expect(openingAnchorRows[0]?.dailyPnlBase).toBe(0);
  });
});

describe("risk evaluation", () => {
  test("warns when a decision breaches hard concentration rules without blocking execution", () => {
    const result = evaluateTradeDecisionRisk({
      decisionId: "DEC-2026-001",
      securityId: "US-AAPL",
      strategyType: "Active",
      plannedAmountBase: 12000,
      portfolioNetValue: 100000,
      postTradeSecurityWeight: 0.12,
      postTradeThemeWeights: new Map([["AI Capex", 0.22]]),
      rules: [
        { code: "single_active_stock_hard_limit", threshold: 0.1, severity: "Hard" },
        { code: "single_theme_limit", threshold: 0.2, severity: "Hard" },
        { code: "single_theme_warning", threshold: 0.15, severity: "Warning" }
      ]
    });

    expect(result.canExecute).toBe(true);
    expect(result.requiresExceptionDraft).toBe(true);
    expect(result.warnings.map((warning) => warning.ruleCode)).toEqual([
      "single_active_stock_hard_limit",
      "single_theme_limit",
      "single_theme_warning"
    ]);
  });
});

describe("excel export", () => {
  test("creates a workbook with a worksheet per v1 module", async () => {
    const workbook = await buildExportWorkbook({
      accounts: [{ id: "ACC-CN-001", institutionName: "Demo Broker" }],
      accountNavAnchors: [{ account_id: "ACC-CN-001", anchor_date: "2026-01-01", net_asset_value_base: 100000 }],
      securities: [{ id: "CN-510300", name: "沪深300ETF" }],
      transactions: [{ id: "TRD-2026-001", status: "Settled" }],
      cashflows: [{ id: "CFL-2026-001", cashflowType: "Deposit" }],
      marketPrices: [{ securityId: "CN-510300", closePrice: 4.2 }],
      fxRates: [{ fromCurrency: "USD", toCurrency: "CNY", rate: 7.2 }],
      informationSources: [{ id: "SRC-2026-001", evidenceLevel: "A" }],
      theses: [{ id: "THS-2026-001", status: "Active" }],
      reviewEvents: [{ id: "EVT-2026-001", status: "Pending" }],
      tradeDecisions: [{ id: "DEC-2026-001", finalDecision: "Execute" }],
      riskRules: [{ code: "single_theme_limit", threshold: 0.2 }],
      exceptions: [{ id: "EXC-2026-001", exceptionType: "PreTradeException" }]
    });

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Accounts",
      "Account NAV Anchors",
      "Securities",
      "Transactions",
      "Cashflows",
      "Prices",
      "FX Rates",
      "Sources",
      "Theses",
      "Review Events",
      "Trade Decisions",
      "Risk Rules",
      "Exceptions"
    ]);
  });
});
