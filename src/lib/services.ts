import type { DatabaseContext } from "@/lib/db/client";
import type {
  CashflowInput,
  Currency,
  FxRateInput,
  MarketPriceInput,
  RiskRuleInput,
  SecurityReference,
  TransactionInput
} from "@/lib/domain";
import { generateBusinessId } from "@/lib/ids";
import { calculateCashBalances, calculateHoldings, calculatePortfolioSnapshot } from "@/lib/portfolio";
import { evaluateTradeDecisionRisk } from "@/lib/risk";
import { tradeDecisionInputSchema, type TradeDecisionInput } from "@/lib/validation";

export type Row = Record<string, string | number | null>;

export interface DashboardData {
  baseCurrency: Currency;
  metrics: {
    portfolioNetValue: number;
    cashValueBase: number;
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

function selectAll(database: DatabaseContext, table: string): Row[] {
  return database.sqlite.prepare(`SELECT * FROM ${table}`).all() as Row[];
}

function selectSetting(database: DatabaseContext, key: string, fallback: string): string {
  const row = database.sqlite.prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
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

function riskRuleRows(database: DatabaseContext): RiskRuleInput[] {
  return selectAll(database, "risk_rules")
    .filter((row) => toBoolean(row.enabled))
    .map((row) => ({
      code: String(row.code),
      threshold: Number(row.threshold),
      severity: row.severity as RiskRuleInput["severity"]
    }));
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

export function getDashboardData(database: DatabaseContext): DashboardData {
  const baseCurrency = selectSetting(database, "baseCurrency", "CNY") as Currency;
  const securities = selectAll(database, "securities");
  const securityNameById = new Map(securities.map((security) => [String(security.id), String(security.name)]));
  const holdings = calculateHoldings(transactionRows(database));
  const cashBalances = calculateCashBalances(cashflowRows(database), transactionRows(database), baseCurrency);
  const snapshot = calculatePortfolioSnapshot({
    asOfDate: "2026-06-02",
    holdings,
    cashBalances,
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
    metrics: {
      portfolioNetValue: snapshot.portfolioNetValue,
      cashValueBase: snapshot.cashValueBase,
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
