import { describe, expect, test } from "vitest";
import { shouldSeedDemoData } from "@/lib/app-db";
import { createDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import { buildModuleReferenceOptions, findModuleDefinition, insertModuleRecord, listModuleRows, updateModuleRecord } from "@/lib/modules";
import { createTradeDecisionWithRisk, getAccountCalendarData, getDashboardData, listAllExportData } from "@/lib/services";

describe("database integration", () => {
  test("does not auto-seed demo data when real accounts already exist", () => {
    const database = createDatabase(":memory:");

    expect(shouldSeedDemoData(database)).toBe(true);

    database.sqlite
      .prepare(
        `INSERT INTO accounts (
          id, institution_name, account_type, market, currency,
          allow_margin_or_derivatives, include_in_net_worth,
          initial_entry_date, data_update_method, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run("ACC-REAL-001", "真实机构", "cash", "A-Share", "CNY", 0, 1, "2026-06-03", "Manual", null);

    expect(shouldSeedDemoData(database)).toBe(false);
  });

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
      "exceptions",
      "account_nav_anchors"
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

  test("does not seed the removed HSBC US account", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const account = database.sqlite.prepare("SELECT id FROM accounts WHERE id = ?").get("ACC-HSBC-US-001");

    expect(account).toBeUndefined();
  });

  test("keeps securities list focused on ticker and name instead of internal id", () => {
    const securitiesDefinition = findModuleDefinition("securities");

    expect(securitiesDefinition?.tableColumns.slice(0, 2)).toEqual(["ticker", "name"]);
    expect(securitiesDefinition?.tableColumns).not.toContain("id");
  });

  test("stores account supported markets as a multi-market capability and keeps legacy market compatible", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const accountsDefinition = findModuleDefinition("accounts");
    expect(accountsDefinition).toBeDefined();
    expect(accountsDefinition?.tableColumns).toContain("supported_markets");
    expect(accountsDefinition?.tableColumns).not.toContain("market");

    const inserted = insertModuleRecord(database, "accounts", {
      institutionName: "Multi-market broker",
      accountType: "cash",
      supportedMarkets: "US, HK, A-Share",
      currency: "USD",
      allowMarginOrDerivatives: false,
      includeInNetWorth: true,
      initialEntryDate: "2026-06-03",
      dataUpdateMethod: "Manual"
    });

    expect(inserted.supported_markets).toBe(JSON.stringify(["US", "HK", "A-Share"]));
    expect(inserted.market).toBe("US");

    const stored = database.sqlite
      .prepare("SELECT rowid AS _rowid, * FROM accounts WHERE id = ?")
      .get(inserted.id) as { _rowid: number; supported_markets: string; market: string };

    const updated = updateModuleRecord(database, "accounts", stored._rowid, {
      institutionName: "Multi-market broker",
      accountType: "cash",
      supportedMarkets: "HK, US",
      currency: "USD",
      allowMarginOrDerivatives: false,
      includeInNetWorth: true,
      initialEntryDate: "2026-06-03",
      dataUpdateMethod: "Manual"
    });

    expect(updated.supported_markets).toBe(JSON.stringify(["HK", "US"]));
    expect(updated.market).toBe("HK");
  });

  test("builds account and security reference options with display names and relationship metadata", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const transactionsDefinition = findModuleDefinition("transactions");
    expect(transactionsDefinition).toBeDefined();

    const options = buildModuleReferenceOptions(database, transactionsDefinition!);
    const apple = options.securityId.find((option) => option.value === "US-AAPL");
    const usAccount = options.accountId.find((option) => option.value === "ACC-US-001");

    expect(apple?.label).toBe("Apple Inc.");
    expect(apple?.label).not.toContain("US-AAPL");
    expect(apple?.metadata.account_id).toBe("ACC-US-001");
    expect(usAccount?.label).toBe("Demo US Broker");
    expect(usAccount?.label).not.toContain("ACC-US-001");
  });

  test("recomputes dashboard metrics from the latest entered market data", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const before = getDashboardData(database).metrics.portfolioNetValue;

    database.sqlite
      .prepare("INSERT INTO market_prices (price_date, security_id, close_price, currency, source) VALUES (?, ?, ?, ?, ?)")
      .run("2026-06-03", "US-AAPL", 300, "USD", "Test latest price");

    const after = getDashboardData(database).metrics.portfolioNetValue;

    expect(after).toBeGreaterThan(before);
  });

  test("updates an existing module record while keeping its business identifier locked", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const securitiesDefinition = findModuleDefinition("securities");
    expect(securitiesDefinition).toBeDefined();
    const security = listModuleRows(database, securitiesDefinition!).find((row) => row.id === "US-AAPL");

    const updated = updateModuleRecord(database, "securities", Number(security?._rowid), {
      id: "US-AAPL-RENAMED",
      name: "Apple Inc. Edited",
      ticker: "AAPL",
      assetType: "Stock",
      market: "US",
      currency: "USD",
      industryLevel1: "InformationTechnology",
      industryLevel2: "Hardware",
      riskThemeTags: "AI Capex, USD",
      liquidityLevel: "High",
      investmentStatus: "Allowed",
      benchmark: "S&P 500",
      feeNote: "Updated fee note",
      complexity: "Simple"
    });

    expect(updated.id).toBe("US-AAPL");
    expect(updated.name).toBe("Apple Inc. Edited");
    expect(updated.fee_note).toBe("Updated fee note");
  });

  test("rejects industry level 2 values outside the selected industry level 1 enum group", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    expect(() =>
      insertModuleRecord(database, "securities", {
        id: "TEST-INDUSTRY-001",
        name: "Invalid industry",
        ticker: "INVALID",
        assetType: "Stock",
        market: "US",
        currency: "USD",
        industryLevel1: "FixedIncome",
        industryLevel2: "Semiconductors",
        riskThemeTags: "test",
        liquidityLevel: "High",
        investmentStatus: "Allowed",
        benchmark: "Test",
        complexity: "Simple"
      })
    ).toThrow(/industry_level_2/);
  });

  test("derives security liquidity from asset type and lock-up days instead of submitted liquidity", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const inserted = insertModuleRecord(database, "securities", {
      id: "TEST-LIQUIDITY-001",
      accountId: "ACC-CN-001",
      name: "368 day wealth product",
      ticker: "TEST368",
      assetType: "ActiveFund",
      market: "MutualFund",
      currency: "CNY",
      industryLevel1: "FixedIncome",
      industryLevel2: "BankWealthManagement",
      riskThemeTags: "fixed income",
      lockupDays: 368,
      liquidityLevel: "High",
      investmentStatus: "Allowed",
      benchmark: "CNY cash",
      complexity: "Simple"
    });

    expect(inserted.lockup_days).toBe(368);
    expect(inserted.liquidity_level).toBe("Low");

    const stored = database.sqlite
      .prepare("SELECT rowid AS _rowid FROM securities WHERE id = ?")
      .get("TEST-LIQUIDITY-001") as { _rowid: number };

    const updated = updateModuleRecord(database, "securities", stored._rowid, {
      id: "TEST-LIQUIDITY-001",
      accountId: "ACC-CN-001",
      name: "Listed stock",
      ticker: "TEST",
      assetType: "Stock",
      market: "A-Share",
      currency: "CNY",
      industryLevel1: "Financials",
      industryLevel2: "Banks",
      riskThemeTags: "equity",
      lockupDays: 999,
      liquidityLevel: "Low",
      investmentStatus: "Allowed",
      benchmark: "CSI 300",
      complexity: "Simple"
    });

    expect(updated.lockup_days).toBeNull();
    expect(updated.liquidity_level).toBe("High");
  });

  test("generates security ids from linked account asset type and sequence", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const inserted = insertModuleRecord(database, "securities", {
      accountId: "ACC-CN-001",
      name: "Auto id ETF",
      ticker: "AUTOETF",
      assetType: "ETF",
      market: "A-Share",
      currency: "CNY",
      industryLevel1: "BroadMarket",
      industryLevel2: "IndexETF",
      riskThemeTags: "China Equity",
      investmentStatus: "Allowed",
      benchmark: "CSI 300",
      complexity: "Simple"
    });

    expect(inserted.id).toMatch(/^SEC-ACC-CN-001-ETF-\d{4}-001$/);
  });

  test("stores securities with an existing linked account and rejects unknown references", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const inserted = insertModuleRecord(database, "securities", {
      id: "TEST-ACCOUNT-LINK-001",
      accountId: "ACC-CN-001",
      name: "Account linked security",
      ticker: "LINK001",
      assetType: "ETF",
      market: "A-Share",
      currency: "CNY",
      industryLevel1: "BroadMarket",
      industryLevel2: "IndexETF",
      riskThemeTags: "China Equity",
      investmentStatus: "Allowed",
      benchmark: "CSI 300",
      complexity: "Simple"
    });

    expect(inserted.account_id).toBe("ACC-CN-001");

    expect(() =>
      insertModuleRecord(database, "transactions", {
        id: "TRD-REF-001",
        tradeDate: "2026-06-03",
        accountId: "ACC-CN-001",
        securityId: "UNKNOWN-SECURITY",
        strategyType: "Active",
        transactionType: "Buy",
        quantity: 1,
        unitPrice: 1,
        grossAmount: 1,
        baseCurrencyAmount: 1,
        status: "Draft",
        dataSource: "Manual"
      })
    ).toThrow(/security_id/);
  });

  test("rejects securities whose market is not supported by the linked account", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    expect(() =>
      insertModuleRecord(database, "securities", {
        id: "TEST-UNSUPPORTED-MARKET",
        accountId: "ACC-CN-001",
        name: "Unsupported US stock",
        ticker: "BADUS",
        assetType: "Stock",
        market: "US",
        currency: "USD",
        industryLevel1: "InformationTechnology",
        industryLevel2: "Software",
        riskThemeTags: "unsupported",
        investmentStatus: "Allowed",
        benchmark: "S&P 500",
        complexity: "Simple"
      })
    ).toThrow(/supported_markets/);
  });

  test("validates optional relationship references when provided", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const inserted = insertModuleRecord(database, "transactions", {
      id: "TRD-REL-001",
      tradeDate: "2026-06-03",
      accountId: "ACC-US-001",
      securityId: "US-AAPL",
      strategyType: "Active",
      thesisId: "THS-2026-001",
      decisionId: "DEC-2026-001",
      transactionType: "Buy",
      quantity: 1,
      unitPrice: 10,
      currency: "USD",
      fxRate: 7.2,
      status: "Draft",
      dataSource: "Manual"
    });

    expect(inserted.thesis_id).toBe("THS-2026-001");
    expect(inserted.decision_id).toBe("DEC-2026-001");

    expect(() =>
      insertModuleRecord(database, "transactions", {
        id: "TRD-REL-002",
        tradeDate: "2026-06-03",
        accountId: "ACC-US-001",
        securityId: "US-AAPL",
        strategyType: "Active",
        thesisId: "THS-MISSING",
        transactionType: "Buy",
        quantity: 1,
        unitPrice: 10,
        currency: "USD",
        fxRate: 7.2,
        status: "Draft",
        dataSource: "Manual"
      })
    ).toThrow(/thesis_id/);

    expect(() =>
      insertModuleRecord(database, "sources", {
        id: "SRC-REL-001",
        informationDate: "2026-06-03",
        obtainedDate: "2026-06-03",
        securityId: "US-AAPL",
        informationType: "Filing",
        evidenceLevel: "A",
        sourceName: "Invalid thesis source",
        sourceUrl: "https://example.com/invalid",
        keyFacts: "Invalid related thesis should be rejected.",
        thesisImpact: "Pending",
        triggersReview: false,
        relatedThesisId: "THS-MISSING",
        enteredBy: "Owner",
        enteredDate: "2026-06-03"
      })
    ).toThrow(/related_thesis_id/);
  });

  test("derives transaction gross and base amounts from quantity price fees and fx", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const inserted = insertModuleRecord(database, "transactions", {
      id: "TRD-DERIVED-001",
      tradeDate: "2026-06-03",
      accountId: "ACC-US-001",
      securityId: "US-AAPL",
      strategyType: "Active",
      transactionType: "Buy",
      quantity: 2,
      unitPrice: 100,
      commission: 1,
      tax: 2,
      otherFees: 3,
      currency: "USD",
      fxRate: 7.2,
      status: "Draft",
      dataSource: "Manual"
    });

    expect(inserted.gross_amount).toBe(200);
    expect(inserted.base_currency_amount).toBe(1483.2);
  });

  test("generates transaction ids when the form does not submit one", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const inserted = insertModuleRecord(database, "transactions", {
      tradeDate: "2026-06-03",
      accountId: "ACC-US-001",
      securityId: "US-AAPL",
      strategyType: "Active",
      transactionType: "Buy",
      quantity: 2,
      unitPrice: 100,
      currency: "USD",
      fxRate: 7.2,
      status: "Draft",
      dataSource: "Manual"
    });

    expect(inserted.id).toMatch(/^TRD-\d{4}-004$/);
  });

  test("derives cashflow base amount and reporting flags from cashflow type", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const deposit = insertModuleRecord(database, "cashflows", {
      id: "CFL-DERIVED-001",
      cashflowDate: "2026-06-03",
      accountId: "ACC-CN-001",
      cashflowType: "Deposit",
      amount: -1000,
      currency: "CNY",
      fxRate: 1,
      baseCurrencyAmount: 1,
      isExternal: false,
      isInvestmentIncome: true,
      dataSource: "Manual"
    });

    expect(deposit.amount).toBe(1000);
    expect(deposit.base_currency_amount).toBe(1000);
    expect(deposit.is_external).toBe(1);
    expect(deposit.is_investment_income).toBe(0);

    const dividend = insertModuleRecord(database, "cashflows", {
      id: "CFL-DERIVED-002",
      cashflowDate: "2026-06-03",
      accountId: "ACC-US-001",
      securityId: "US-AAPL",
      cashflowType: "Dividend",
      amount: 30,
      currency: "USD",
      fxRate: 7.2,
      baseCurrencyAmount: 1,
      isExternal: true,
      isInvestmentIncome: false,
      dataSource: "Manual"
    });

    expect(dividend.amount).toBe(30);
    expect(dividend.base_currency_amount).toBe(216);
    expect(dividend.is_external).toBe(0);
    expect(dividend.is_investment_income).toBe(1);
  });

  test("rejects direct edits to settled transactions", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const settledTrade = database.sqlite.prepare("SELECT rowid AS _rowid FROM transactions WHERE id = ?").get("TRD-2026-001") as {
      _rowid: number;
    };

    expect(() =>
      updateModuleRecord(database, "transactions", settledTrade._rowid, {
        id: "TRD-2026-001",
        tradeDate: "2026-01-03",
        accountId: "ACC-CN-001",
        securityId: "CN-510300",
        strategyType: "Core",
        transactionType: "Buy",
        quantity: 999,
        unitPrice: 4.1,
        grossAmount: 41000,
        baseCurrencyAmount: 41008,
        status: "Settled",
        dataSource: "Demo broker fill"
      })
    ).toThrow(/Settled/);
  });

  test("recomputes account calendar rows from live prices, trades, cashflows, and nav anchors", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);

    const before = getAccountCalendarData(database);
    const cnBefore = before.rows.find((row) => row.accountId === "ACC-CN-001" && row.snapshotDate === "2026-06-02");
    expect(cnBefore?.netAssetValueBase).toBeGreaterThan(0);

    database.sqlite
      .prepare(
        "INSERT INTO account_nav_anchors (account_id, anchor_date, net_asset_value_base, source, notes) VALUES (?, ?, ?, ?, ?)"
      )
      .run("ACC-CN-001", "2026-06-02", 250000, "Test reconciliation", "Corrected from broker statement");

    const after = getAccountCalendarData(database);
    const cnAfter = after.rows.find((row) => row.accountId === "ACC-CN-001" && row.snapshotDate === "2026-06-02");

    expect(cnAfter?.netAssetValueBase).toBe(250000);
    expect(cnAfter?.dailyPnlBase).not.toBe(cnBefore?.dailyPnlBase);
    expect(cnAfter?.isAnchored).toBe(true);
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

  test("validates trade decision references before creating audit records", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    const validInput = {
      securityId: "US-AAPL",
      thesisId: "THS-2026-001",
      strategyType: "Active" as const,
      action: "Buy" as const,
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
      finalDecision: "Execute" as const,
      sourceIds: ["SRC-2026-001"]
    };

    expect(() => createTradeDecisionWithRisk(database, { ...validInput, securityId: "MISSING-SECURITY" })).toThrow(/security/i);
    expect(() => createTradeDecisionWithRisk(database, { ...validInput, thesisId: "MISSING-THESIS" })).toThrow(/thesis/i);
    expect(() => createTradeDecisionWithRisk(database, { ...validInput, sourceIds: ["MISSING-SOURCE"] })).toThrow(/source/i);

    insertModuleRecord(database, "theses", {
      id: "THS-OTHER-001",
      securityId: "CN-510300",
      strategyType: "Active",
      establishedDate: "2026-06-03",
      version: "V1",
      status: "Active",
      oneLineThesis: "Different security thesis",
      returnMechanism: "Different return mechanism",
      keyVariables: "Index",
      baseScenario: "Base",
      optimisticScenario: "Upside",
      pessimisticScenario: "Downside",
      invalidationConditions: "Invalidation",
      entryConditions: "Entry",
      addConditions: "Add",
      reduceConditions: "Reduce",
      exitConditions: "Exit",
      maxPositionWeight: 0.1,
      expectedHoldingPeriod: "12 months",
      nextReviewDate: "2026-07-31"
    });

    expect(() => createTradeDecisionWithRisk(database, { ...validInput, thesisId: "THS-OTHER-001" })).toThrow(/security/i);
  });
});
