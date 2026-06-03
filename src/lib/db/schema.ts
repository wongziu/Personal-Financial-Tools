import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull()
});

export const riskRules = sqliteTable("risk_rules", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  threshold: real("threshold").notNull(),
  severity: text("severity").notNull(),
  enabled: integer("enabled").notNull().default(1)
});

export const idCounters = sqliteTable("id_counters", {
  prefix: text("prefix").notNull(),
  year: integer("year"),
  currentValue: integer("current_value").notNull().default(0)
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  accountType: text("account_type").notNull(),
  market: text("market").notNull(),
  supportedMarkets: text("supported_markets").notNull().default("[]"),
  currency: text("currency").notNull(),
  allowMarginOrDerivatives: integer("allow_margin_or_derivatives").notNull().default(0),
  includeInNetWorth: integer("include_in_net_worth").notNull().default(1),
  initialEntryDate: text("initial_entry_date").notNull(),
  dataUpdateMethod: text("data_update_method").notNull(),
  notes: text("notes")
});

export const securities = sqliteTable("securities", {
  id: text("id").primaryKey(),
  accountId: text("account_id"),
  name: text("name").notNull(),
  ticker: text("ticker").notNull(),
  assetType: text("asset_type").notNull(),
  market: text("market").notNull(),
  currency: text("currency").notNull(),
  industryLevel1: text("industry_level_1"),
  industryLevel2: text("industry_level_2"),
  riskThemeTags: text("risk_theme_tags").notNull().default("[]"),
  lockupDays: integer("lockup_days"),
  liquidityLevel: text("liquidity_level").notNull(),
  investmentStatus: text("investment_status").notNull(),
  benchmark: text("benchmark").notNull(),
  feeNote: text("fee_note"),
  complexity: text("complexity").notNull()
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  orderId: text("order_id"),
  tradeDate: text("trade_date").notNull(),
  tradeTime: text("trade_time"),
  accountId: text("account_id").notNull(),
  securityId: text("security_id").notNull(),
  strategyType: text("strategy_type").notNull(),
  thesisId: text("thesis_id"),
  decisionId: text("decision_id"),
  transactionType: text("transaction_type").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  grossAmount: real("gross_amount").notNull(),
  commission: real("commission").notNull().default(0),
  tax: real("tax").notNull().default(0),
  otherFees: real("other_fees").notNull().default(0),
  currency: text("currency").notNull(),
  fxRate: real("fx_rate"),
  baseCurrencyAmount: real("base_currency_amount").notNull(),
  status: text("status").notNull(),
  dataSource: text("data_source").notNull(),
  correctionOfId: text("correction_of_id")
});

export const cashflows = sqliteTable("cashflows", {
  id: text("id").primaryKey(),
  cashflowDate: text("cashflow_date").notNull(),
  accountId: text("account_id").notNull(),
  securityId: text("security_id"),
  cashflowType: text("cashflow_type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  fxRate: real("fx_rate"),
  baseCurrencyAmount: real("base_currency_amount").notNull(),
  isExternal: integer("is_external").notNull(),
  isInvestmentIncome: integer("is_investment_income").notNull(),
  dataSource: text("data_source").notNull(),
  notes: text("notes")
});

export const marketPrices = sqliteTable("market_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  priceDate: text("price_date").notNull(),
  securityId: text("security_id").notNull(),
  closePrice: real("close_price").notNull(),
  currency: text("currency").notNull(),
  source: text("source").notNull()
});

export const fxRates = sqliteTable("fx_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rateDate: text("rate_date").notNull(),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: real("rate").notNull(),
  source: text("source").notNull()
});

export const informationSources = sqliteTable("information_sources", {
  id: text("id").primaryKey(),
  informationDate: text("information_date").notNull(),
  obtainedDate: text("obtained_date").notNull(),
  securityId: text("security_id"),
  riskTheme: text("risk_theme"),
  informationType: text("information_type").notNull(),
  evidenceLevel: text("evidence_level").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  keyFacts: text("key_facts").notNull(),
  thesisImpact: text("thesis_impact").notNull(),
  triggersReview: integer("triggers_review").notNull(),
  relatedThesisId: text("related_thesis_id"),
  enteredBy: text("entered_by").notNull(),
  enteredDate: text("entered_date").notNull()
});

export const theses = sqliteTable("theses", {
  id: text("id").primaryKey(),
  securityId: text("security_id").notNull(),
  strategyType: text("strategy_type").notNull(),
  establishedDate: text("established_date").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  oneLineThesis: text("one_line_thesis").notNull(),
  returnMechanism: text("return_mechanism").notNull(),
  keyVariables: text("key_variables").notNull(),
  baseScenario: text("base_scenario").notNull(),
  optimisticScenario: text("optimistic_scenario").notNull(),
  pessimisticScenario: text("pessimistic_scenario").notNull(),
  invalidationConditions: text("invalidation_conditions").notNull(),
  entryConditions: text("entry_conditions").notNull(),
  addConditions: text("add_conditions").notNull(),
  reduceConditions: text("reduce_conditions").notNull(),
  exitConditions: text("exit_conditions").notNull(),
  maxPositionWeight: real("max_position_weight").notNull(),
  expectedHoldingPeriod: text("expected_holding_period").notNull(),
  nextReviewDate: text("next_review_date").notNull(),
  closingConclusion: text("closing_conclusion")
});

export const thesisEvidence = sqliteTable("thesis_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thesisId: text("thesis_id").notNull(),
  sourceId: text("source_id").notNull(),
  evidenceSide: text("evidence_side").notNull()
});

export const reviewEvents = sqliteTable("review_events", {
  id: text("id").primaryKey(),
  securityId: text("security_id"),
  strategyType: text("strategy_type"),
  eventType: text("event_type").notNull(),
  expectedDate: text("expected_date").notNull(),
  importance: text("importance").notNull(),
  variablesToCheck: text("variables_to_check").notNull(),
  preEventAction: text("pre_event_action").notNull(),
  postEventDeadline: text("post_event_deadline").notNull(),
  status: text("status").notNull(),
  resultSummary: text("result_summary"),
  triggersTrade: integer("triggers_trade"),
  decisionId: text("decision_id")
});

export const tradeDecisions = sqliteTable("trade_decisions", {
  id: text("id").primaryKey(),
  decisionTime: text("decision_time").notNull(),
  securityId: text("security_id").notNull(),
  thesisId: text("thesis_id"),
  strategyType: text("strategy_type").notNull(),
  action: text("action").notNull(),
  currentPrice: real("current_price").notNull(),
  plannedPriceMin: real("planned_price_min").notNull(),
  plannedPriceMax: real("planned_price_max").notNull(),
  plannedAmountBase: real("planned_amount_base").notNull(),
  preTradeWeight: real("pre_trade_weight").notNull(),
  postTradeWeight: real("post_trade_weight").notNull(),
  maxAllowedWeight: real("max_allowed_weight").notNull(),
  trigger: text("trigger").notNull(),
  expectedReturnSource: text("expected_return_source").notNull(),
  mainRisks: text("main_risks").notNull(),
  downsideLossBase: real("downside_loss_base").notNull(),
  stopLossOrInvalidation: text("stop_loss_or_invalidation").notNull(),
  hasSimilarThemeExposure: integer("has_similar_theme_exposure").notNull(),
  similarThemeExposure: real("similar_theme_exposure").notNull(),
  touchesLimits: integer("touches_limits").notNull(),
  isRuleException: integer("is_rule_exception").notNull(),
  emotionTag: text("emotion_tag").notNull(),
  finalDecision: text("final_decision").notNull(),
  executedTransactionId: text("executed_transaction_id"),
  riskWarnings: text("risk_warnings").notNull().default("[]"),
  status: text("status").notNull().default("Draft")
});

export const tradeDecisionSources = sqliteTable("trade_decision_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  decisionId: text("decision_id").notNull(),
  sourceId: text("source_id").notNull()
});

export const exceptions = sqliteTable("exceptions", {
  id: text("id").primaryKey(),
  exceptionDate: text("exception_date").notNull(),
  decisionId: text("decision_id"),
  transactionId: text("transaction_id"),
  exceptionType: text("exception_type").notNull(),
  relatedRule: text("related_rule").notNull(),
  behaviorDescription: text("behavior_description").notNull(),
  originalReason: text("original_reason").notNull(),
  riskImpact: text("risk_impact").notNull(),
  causedLoss: integer("caused_loss").notNull().default(0),
  repairAction: text("repair_action").notNull(),
  needsSystemChange: integer("needs_system_change").notNull().default(0),
  status: text("status").notNull().default("Draft"),
  closedDate: text("closed_date")
});

export const holdingSnapshots = sqliteTable("holding_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotDate: text("snapshot_date").notNull(),
  accountId: text("account_id").notNull(),
  securityId: text("security_id").notNull(),
  strategyType: text("strategy_type").notNull(),
  quantity: real("quantity").notNull(),
  marketPrice: real("market_price").notNull(),
  marketValueBase: real("market_value_base").notNull(),
  totalCost: real("total_cost").notNull(),
  unrealizedProfit: real("unrealized_profit").notNull(),
  realizedProfit: real("realized_profit").notNull(),
  weight: real("weight").notNull()
});

export const portfolioSnapshots = sqliteTable("portfolio_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotDate: text("snapshot_date").notNull(),
  portfolioNetValue: real("portfolio_net_value").notNull(),
  cashValueBase: real("cash_value_base").notNull(),
  maxDrawdown: real("max_drawdown").notNull().default(0),
  riskWarnings: text("risk_warnings").notNull().default("[]")
});

export const accountNavAnchors = sqliteTable("account_nav_anchors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: text("account_id").notNull(),
  anchorDate: text("anchor_date").notNull(),
  netAssetValueBase: real("net_asset_value_base").notNull(),
  source: text("source").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const schema = {
  systemSettings,
  riskRules,
  idCounters,
  accounts,
  securities,
  transactions,
  cashflows,
  marketPrices,
  fxRates,
  informationSources,
  theses,
  thesisEvidence,
  reviewEvents,
  tradeDecisions,
  tradeDecisionSources,
  exceptions,
  holdingSnapshots,
  portfolioSnapshots,
  accountNavAnchors
};
