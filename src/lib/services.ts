import type { DatabaseContext } from "@/lib/db/client";
import type {
  AccountDailyPerformanceRow,
  AccountNavAnchorInput,
  AccountReference,
  CashflowInput,
  Currency,
  FxRateInput,
  MarketPriceInput,
  RiskRuleInput,
  SecurityReference,
  TransactionInput
} from "@/lib/domain";
import { calculateAccountDailyPerformance } from "@/lib/account-performance";
import { generateBusinessId } from "@/lib/ids";
import {
  calculateBaseCashValueFallbacks,
  calculateCashBalances,
  calculateHoldings,
  calculatePortfolioSnapshot
} from "@/lib/portfolio";
import { evaluateTradeDecisionRisk } from "@/lib/risk";
import { accountNavAnchorInputSchema, tradeDecisionInputSchema, type TradeDecisionInput } from "@/lib/validation";

export type Row = Record<string, string | number | null>;

export interface DashboardData {
  baseCurrency: Currency;
  asOfDate: string;
  metrics: {
    portfolioNetValue: number;
    cashValueBase: number;
    fxRevaluationBase: number;
    largestHoldingName: string;
    largestHoldingWeight: number;
    maxThemeName: string;
    maxThemeWeight: number;
    pendingExceptionCount: number;
  };
  positions: Array<Row & { weight: number; marketValueBase: number }>;
  cashBalances: Array<{ accountCurrency: string; amount: number }>;
  riskWarnings: Array<{ ruleCode: string; severity: string; actual: number; threshold: number }>;
  recentDecisions: Row[];
  pendingExceptions: Row[];
  reviewEvents: Row[];
}

export interface TradeDecisionResult {
  decisionId: string;
  exceptionDraftId?: string;
  risk: ReturnType<typeof evaluateTradeDecisionRisk>;
}

export interface AccountCalendarAccount extends AccountReference {
  market: string;
  currency: Currency;
}

export interface AccountCalendarData {
  baseCurrency: Currency;
  startDate: string;
  endDate: string;
  latestDate: string;
  accounts: AccountCalendarAccount[];
  rows: AccountDailyPerformanceRow[];
  navAnchors: AccountNavAnchorInput[];
}

export interface PriceEntrySecurity {
  id: string;
  name: string;
  ticker: string;
  currency: Currency;
  market: string;
  accountId: string;
  accountName: string;
  investmentStatus: string;
}

export interface SecurityDetailData {
  security: Row;
  account: Row | null;
  transactions: Row[];
  prices: Row[];
  cashflows: Row[];
  theses: Row[];
}

function selectAll(database: DatabaseContext, table: string): Row[] {
  return database.sqlite.prepare(`SELECT * FROM ${table}`).all() as Row[];
}

function selectSetting(database: DatabaseContext, key: string, fallback: string): string {
  const row = database.sqlite.prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

function latestMarketDate(database: DatabaseContext): string {
  const row = database.sqlite
    .prepare(
      `
        SELECT MAX(latest_date) AS latest_date
        FROM (
          SELECT MAX(price_date) AS latest_date FROM market_prices
          UNION ALL SELECT MAX(rate_date) AS latest_date FROM fx_rates
          UNION ALL SELECT MAX(cashflow_date) AS latest_date FROM cashflows
          UNION ALL SELECT MAX(trade_date) AS latest_date FROM transactions
          UNION ALL SELECT MAX(anchor_date) AS latest_date FROM account_nav_anchors
        )
      `
    )
    .get() as { latest_date: string | null } | undefined;
  return row?.latest_date ?? new Date().toISOString().slice(0, 10);
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function transactionRows(database: DatabaseContext): TransactionInput[] {
  return selectAll(database, "transactions").map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    securityId: String(row.security_id),
    strategyType: row.strategy_type as TransactionInput["strategyType"],
    transactionType: row.transaction_type as TransactionInput["transactionType"],
    status: row.status as TransactionInput["status"],
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    grossAmount: Number(row.gross_amount),
    totalFees: Number(row.commission) + Number(row.tax) + Number(row.other_fees),
    baseCurrencyAmount: Number(row.base_currency_amount),
    tradeDate: String(row.trade_date)
  }));
}

function accountRows(database: DatabaseContext): AccountCalendarAccount[] {
  return selectAll(database, "accounts").map((row) => ({
    id: String(row.id),
    institutionName: String(row.institution_name),
    accountName: String(row.account_name || row.institution_name),
    market: String(row.market),
    currency: row.currency as Currency,
    includeInNetWorth: toBoolean(row.include_in_net_worth),
    initialEntryDate: String(row.initial_entry_date)
  }));
}

function cashflowRows(database: DatabaseContext): CashflowInput[] {
  return selectAll(database, "cashflows").map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    securityId: row.security_id === null ? null : String(row.security_id),
    cashflowType: row.cashflow_type as CashflowInput["cashflowType"],
    currency: row.currency as Currency,
    amount: Number(row.amount),
    baseCurrencyAmount: Number(row.base_currency_amount),
    isExternal: toBoolean(row.is_external),
    isInvestmentIncome: toBoolean(row.is_investment_income),
    cashflowDate: String(row.cashflow_date)
  }));
}

function priceRows(database: DatabaseContext): MarketPriceInput[] {
  return selectAll(database, "market_prices").map((row) => ({
    securityId: String(row.security_id),
    priceDate: String(row.price_date),
    closePrice: Number(row.close_price),
    currency: row.currency as Currency
  }));
}

function fxRows(database: DatabaseContext): FxRateInput[] {
  return selectAll(database, "fx_rates").map((row) => ({
    rateDate: String(row.rate_date),
    fromCurrency: row.from_currency as Currency,
    toCurrency: row.to_currency as Currency,
    rate: Number(row.rate)
  }));
}

function securityReferences(database: DatabaseContext): SecurityReference[] {
  return selectAll(database, "securities").map((row) => ({
    id: String(row.id),
    riskThemeTags: JSON.parse(String(row.risk_theme_tags)) as string[],
    industryLevel1: row.industry_level_1 === null ? null : String(row.industry_level_1)
  }));
}

export function getPriceEntrySecurities(database: DatabaseContext): PriceEntrySecurity[] {
  return database.sqlite
    .prepare(
      `
        SELECT
          securities.id,
          securities.name,
          securities.ticker,
          securities.currency,
          securities.market,
          securities.account_id AS accountId,
          accounts.account_name AS accountName,
          securities.investment_status AS investmentStatus
        FROM securities
        INNER JOIN accounts ON accounts.id = securities.account_id
        WHERE accounts.include_in_net_worth = 1
          AND securities.investment_status IN ('Allowed', 'Watch')
          AND securities.asset_type <> 'Cash'
        ORDER BY securities.market, securities.name
      `
    )
    .all() as PriceEntrySecurity[];
}

export function getSecurityDetailData(database: DatabaseContext, securityId: string): SecurityDetailData | null {
  const security = database.sqlite.prepare("SELECT * FROM securities WHERE id = ?").get(securityId) as Row | undefined;
  if (!security) {
    return null;
  }

  const account = security.account_id
    ? database.sqlite.prepare("SELECT * FROM accounts WHERE id = ?").get(String(security.account_id)) as Row | undefined
    : undefined;

  return {
    security,
    account: account ?? null,
    transactions: database.sqlite.prepare("SELECT * FROM transactions WHERE security_id = ? ORDER BY trade_date DESC, rowid DESC").all(securityId) as Row[],
    prices: database.sqlite.prepare("SELECT * FROM market_prices WHERE security_id = ? ORDER BY price_date DESC, rowid DESC").all(securityId) as Row[],
    cashflows: database.sqlite.prepare("SELECT * FROM cashflows WHERE security_id = ? ORDER BY cashflow_date DESC, rowid DESC").all(securityId) as Row[],
    theses: database.sqlite.prepare("SELECT * FROM theses WHERE security_id = ? ORDER BY established_date DESC, rowid DESC").all(securityId) as Row[]
  };
}

function accountNavAnchorRows(database: DatabaseContext): AccountNavAnchorInput[] {
  return selectAll(database, "account_nav_anchors").map((row) => ({
    id: Number(row.id),
    accountId: String(row.account_id),
    anchorDate: String(row.anchor_date),
    netAssetValueBase: Number(row.net_asset_value_base),
    source: String(row.source),
    notes: row.notes === null ? null : String(row.notes)
  }));
}

function riskRuleRows(database: DatabaseContext): RiskRuleInput[] {
  return selectAll(database, "risk_rules")
    .filter((row) => toBoolean(row.enabled))
    .map((row) => ({
      code: String(row.code),
      threshold: Number(row.threshold),
      severity: row.severity as RiskRuleInput["severity"]
    }));
}

function validateTradeDecisionReferences(database: DatabaseContext, input: TradeDecisionInput): void {
  const security = database.sqlite.prepare("SELECT id FROM securities WHERE id = ?").get(input.securityId);
  if (!security) {
    throw new Error(`Invalid security reference: ${input.securityId}`);
  }

  if (input.thesisId) {
    const thesis = database.sqlite.prepare("SELECT id, security_id FROM theses WHERE id = ?").get(input.thesisId) as Row | undefined;
    if (!thesis) {
      throw new Error(`Invalid thesis reference: ${input.thesisId}`);
    }
    if (String(thesis.security_id) !== input.securityId) {
      throw new Error(`Thesis ${input.thesisId} does not belong to security ${input.securityId}`);
    }
  }

  for (const sourceId of input.sourceIds) {
    const source = database.sqlite.prepare("SELECT id FROM information_sources WHERE id = ?").get(sourceId);
    if (!source) {
      throw new Error(`Invalid source reference: ${sourceId}`);
    }
  }
}

export function nextBusinessId(database: DatabaseContext, prefix: string, date = new Date()): string {
  const year = date.getFullYear();
  const row = database.sqlite
    .prepare("SELECT current_value FROM id_counters WHERE prefix = ? AND year = ?")
    .get(prefix, year) as { current_value: number } | undefined;
  const nextValue = (row?.current_value ?? 0) + 1;

  if (row) {
    database.sqlite.prepare("UPDATE id_counters SET current_value = ? WHERE prefix = ? AND year = ?").run(nextValue, prefix, year);
  } else {
    database.sqlite.prepare("INSERT INTO id_counters (prefix, year, current_value) VALUES (?, ?, ?)").run(prefix, year, nextValue);
  }

  return generateBusinessId(prefix, year, nextValue);
}

export function listAllExportData(database: DatabaseContext) {
  return {
    accounts: selectAll(database, "accounts"),
    accountNavAnchors: selectAll(database, "account_nav_anchors"),
    securities: selectAll(database, "securities"),
    transactions: selectAll(database, "transactions"),
    cashflows: selectAll(database, "cashflows"),
    marketPrices: selectAll(database, "market_prices"),
    fxRates: selectAll(database, "fx_rates"),
    informationSources: selectAll(database, "information_sources"),
    theses: selectAll(database, "theses"),
    reviewEvents: selectAll(database, "review_events"),
    tradeDecisions: selectAll(database, "trade_decisions"),
    riskRules: selectAll(database, "risk_rules"),
    exceptions: selectAll(database, "exceptions")
  };
}

export function getAccountCalendarData(database: DatabaseContext): AccountCalendarData {
  const baseCurrency = selectSetting(database, "baseCurrency", "CNY") as Currency;
  const accounts = accountRows(database);
  const rows = calculateAccountDailyPerformance({
    accounts,
    transactions: transactionRows(database),
    cashflows: cashflowRows(database),
    prices: priceRows(database),
    fxRates: fxRows(database),
    securities: securityReferences(database),
    navAnchors: accountNavAnchorRows(database),
    baseCurrency
  });
  const dates = rows.map((row) => row.snapshotDate).sort();

  return {
    baseCurrency,
    startDate: dates[0] ?? new Date().toISOString().slice(0, 10),
    endDate: dates.at(-1) ?? new Date().toISOString().slice(0, 10),
    latestDate: dates.at(-1) ?? new Date().toISOString().slice(0, 10),
    accounts,
    rows,
    navAnchors: accountNavAnchorRows(database)
  };
}

export function upsertAccountNavAnchor(database: DatabaseContext, rawInput: unknown): AccountNavAnchorInput {
  const input = accountNavAnchorInputSchema.parse(rawInput);
  const account = database.sqlite.prepare("SELECT id FROM accounts WHERE id = ?").get(input.accountId);
  if (!account) {
    throw new Error(`Unknown account ${input.accountId}`);
  }

  database.sqlite
    .prepare(
      `
        INSERT INTO account_nav_anchors (account_id, anchor_date, net_asset_value_base, source, notes)
        VALUES (@accountId, @anchorDate, @netAssetValueBase, @source, @notes)
        ON CONFLICT(account_id, anchor_date) DO UPDATE SET
          net_asset_value_base = excluded.net_asset_value_base,
          source = excluded.source,
          notes = excluded.notes
      `
    )
    .run({
      accountId: input.accountId,
      anchorDate: input.anchorDate,
      netAssetValueBase: input.netAssetValueBase,
      source: input.source,
      notes: input.notes ?? null
    });

  const row = database.sqlite
    .prepare("SELECT * FROM account_nav_anchors WHERE account_id = ? AND anchor_date = ?")
    .get(input.accountId, input.anchorDate) as Row;

  return {
    id: Number(row.id),
    accountId: String(row.account_id),
    anchorDate: String(row.anchor_date),
    netAssetValueBase: Number(row.net_asset_value_base),
    source: String(row.source),
    notes: row.notes === null ? null : String(row.notes)
  };
}

export function getDashboardData(database: DatabaseContext): DashboardData {
  const baseCurrency = selectSetting(database, "baseCurrency", "CNY") as Currency;
  const asOfDate = latestMarketDate(database);
  const securities = selectAll(database, "securities");
  const securityNameById = new Map(securities.map((security) => [String(security.id), String(security.name)]));
  const transactions = transactionRows(database);
  const cashflows = cashflowRows(database);
  const holdings = calculateHoldings(transactions);
  const cashBalances = calculateCashBalances(cashflows, transactions, baseCurrency);
  const cashValueBaseFallbacks = calculateBaseCashValueFallbacks(cashflows, transactions, baseCurrency);
  const historicalCashValueBase = [...cashValueBaseFallbacks.values()].reduce((sum, value) => sum + value, 0);
  const snapshot = calculatePortfolioSnapshot({
    asOfDate,
    holdings,
    cashBalances,
    cashValueBaseFallbacks,
    prices: priceRows(database),
    fxRates: fxRows(database),
    securities: securityReferences(database),
    baseCurrency
  });
  const largestPosition = [...snapshot.positions].sort((a, b) => b.weight - a.weight)[0];
  const maxTheme = [...snapshot.riskThemeWeights.entries()].sort((a, b) => b[1] - a[1])[0];
  const riskWarnings = riskRuleRows(database)
    .flatMap((rule) => {
      const actual = rule.code.includes("single_theme") ? (maxTheme?.[1] ?? 0) : (largestPosition?.weight ?? 0);
      return actual > rule.threshold
        ? [{ ruleCode: rule.code, severity: rule.severity, actual, threshold: rule.threshold }]
        : [];
    });
  const exceptions = selectAll(database, "exceptions");

  return {
    baseCurrency,
    asOfDate,
    metrics: {
      portfolioNetValue: snapshot.portfolioNetValue,
      cashValueBase: snapshot.cashValueBase,
      fxRevaluationBase: snapshot.cashValueBase - historicalCashValueBase,
      largestHoldingName: largestPosition ? (securityNameById.get(largestPosition.securityId) ?? largestPosition.securityId) : "N/A",
      largestHoldingWeight: largestPosition?.weight ?? 0,
      maxThemeName: maxTheme?.[0] ?? "N/A",
      maxThemeWeight: maxTheme?.[1] ?? 0,
      pendingExceptionCount: exceptions.filter((item) => item.status !== "Closed").length
    },
    positions: snapshot.positions.map((position) => ({
      account_id: position.accountId,
      security_id: position.securityId,
      security_name: securityNameById.get(position.securityId) ?? position.securityId,
      strategy_type: position.strategyType,
      quantity: position.quantity,
      market_value_base: position.marketValueBase,
      weight: position.weight,
      marketValueBase: position.marketValueBase
    })),
    cashBalances: [...cashBalances.entries()].map(([accountCurrency, amount]) => ({ accountCurrency, amount })),
    riskWarnings,
    recentDecisions: selectAll(database, "trade_decisions").slice(-5).reverse(),
    pendingExceptions: exceptions.filter((item) => item.status !== "Closed"),
    reviewEvents: selectAll(database, "review_events").filter((event) => event.status !== "Done")
  };
}

export function createTradeDecisionWithRisk(database: DatabaseContext, rawInput: TradeDecisionInput): TradeDecisionResult {
  const input = tradeDecisionInputSchema.parse(rawInput);
  validateTradeDecisionReferences(database, input);
  const now = new Date();
  const decisionId = nextBusinessId(database, "DEC", now);
  const risk = evaluateTradeDecisionRisk({
    decisionId,
    securityId: input.securityId,
    strategyType: input.strategyType,
    plannedAmountBase: input.plannedAmountBase,
    portfolioNetValue: input.plannedAmountBase / Math.max(input.postTradeWeight - input.preTradeWeight, 0.000001),
    postTradeSecurityWeight: input.postTradeWeight,
    postTradeThemeWeights: new Map([["Similar Theme", input.similarThemeExposure]]),
    rules: riskRuleRows(database)
  });

  const insertDecision = database.sqlite.prepare(`
    INSERT INTO trade_decisions (
      id, decision_time, security_id, thesis_id, strategy_type, action, current_price,
      planned_price_min, planned_price_max, planned_amount_base, pre_trade_weight,
      post_trade_weight, max_allowed_weight, trigger, expected_return_source, main_risks,
      downside_loss_base, stop_loss_or_invalidation, has_similar_theme_exposure,
      similar_theme_exposure, touches_limits, is_rule_exception, emotion_tag, final_decision,
      executed_transaction_id, risk_warnings, status
    ) VALUES (
      @id, @decision_time, @security_id, @thesis_id, @strategy_type, @action, @current_price,
      @planned_price_min, @planned_price_max, @planned_amount_base, @pre_trade_weight,
      @post_trade_weight, @max_allowed_weight, @trigger, @expected_return_source, @main_risks,
      @downside_loss_base, @stop_loss_or_invalidation, @has_similar_theme_exposure,
      @similar_theme_exposure, @touches_limits, @is_rule_exception, @emotion_tag, @final_decision,
      @executed_transaction_id, @risk_warnings, @status
    )
  `);

  insertDecision.run({
    id: decisionId,
    decision_time: now.toISOString().slice(0, 16).replace("T", " "),
    security_id: input.securityId,
    thesis_id: input.thesisId ?? null,
    strategy_type: input.strategyType,
    action: input.action,
    current_price: input.currentPrice,
    planned_price_min: input.plannedPriceMin,
    planned_price_max: input.plannedPriceMax,
    planned_amount_base: input.plannedAmountBase,
    pre_trade_weight: input.preTradeWeight,
    post_trade_weight: input.postTradeWeight,
    max_allowed_weight: input.maxAllowedWeight,
    trigger: input.trigger,
    expected_return_source: input.expectedReturnSource,
    main_risks: input.mainRisks,
    downside_loss_base: input.downsideLossBase,
    stop_loss_or_invalidation: input.stopLossOrInvalidation,
    has_similar_theme_exposure: input.hasSimilarThemeExposure ? 1 : 0,
    similar_theme_exposure: input.similarThemeExposure,
    touches_limits: input.touchesLimits ? 1 : 0,
    is_rule_exception: risk.requiresExceptionDraft ? 1 : input.isRuleException ? 1 : 0,
    emotion_tag: input.emotionTag,
    final_decision: input.finalDecision,
    executed_transaction_id: null,
    risk_warnings: JSON.stringify(risk.warnings),
    status: input.finalDecision === "Execute" ? "Submitted" : "Draft"
  });

  const sourceStatement = database.sqlite.prepare(
    "INSERT INTO trade_decision_sources (decision_id, source_id) VALUES (?, ?)"
  );
  for (const sourceId of input.sourceIds) {
    sourceStatement.run(decisionId, sourceId);
  }

  let exceptionDraftId: string | undefined;
  if (input.finalDecision === "Execute" && risk.requiresExceptionDraft) {
    exceptionDraftId = nextBusinessId(database, "EXC", now);
    database.sqlite
      .prepare(`
        INSERT INTO exceptions (
          id, exception_date, decision_id, transaction_id, exception_type, related_rule,
          behavior_description, original_reason, risk_impact, caused_loss, repair_action,
          needs_system_change, status, closed_date
        ) VALUES (
          @id, @exception_date, @decision_id, @transaction_id, @exception_type, @related_rule,
          @behavior_description, @original_reason, @risk_impact, @caused_loss, @repair_action,
          @needs_system_change, @status, @closed_date
        )
      `)
      .run({
        id: exceptionDraftId,
        exception_date: now.toISOString().slice(0, 10),
        decision_id: decisionId,
        transaction_id: null,
        exception_type: "PreTradeException",
        related_rule: risk.warnings.find((warning) => warning.severity === "Hard")?.ruleCode ?? "HardLimit",
        behavior_description: "Executed trade decision while hard risk warnings were present.",
        original_reason: input.trigger,
        risk_impact: risk.warnings.map((warning) => warning.message).join("; "),
        caused_loss: 0,
        repair_action: "Review exposure and close this exception after risk is accepted or reduced.",
        needs_system_change: 0,
        status: "Draft",
        closed_date: null
      });
  }

  return { decisionId, exceptionDraftId, risk };
}
