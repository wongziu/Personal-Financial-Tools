import { describe, expect, test } from "vitest";
import { buildExportWorkbook } from "@/lib/export";
import { generateBusinessId } from "@/lib/ids";
import {
  calculateCashBalances,
  calculateHoldings,
  calculatePortfolioSnapshot
} from "@/lib/portfolio";
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
