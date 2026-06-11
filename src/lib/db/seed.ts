import type { DatabaseContext } from "@/lib/db/client";
import { defaultSystemSettingRows } from "@/lib/app-settings";

const naturalKeys: Record<string, string[]> = {
  market_prices: ["price_date", "security_id"],
  fx_rates: ["rate_date", "from_currency", "to_currency"],
  account_nav_anchors: ["account_id", "anchor_date"],
  strategy_versions: ["strategy_id", "version"],
  thesis_evidence: ["thesis_id", "source_id", "evidence_side"],
  trade_decision_sources: ["decision_id", "source_id"]
};

function rowExists(database: DatabaseContext, table: string, keys: string[], row: Record<string, unknown>): boolean {
  const whereClause = keys.map((key) => `${key} = @${key}`).join(" AND ");
  const statement = database.sqlite.prepare(`SELECT 1 FROM ${table} WHERE ${whereClause} LIMIT 1`);
  return statement.get(row) !== undefined;
}

function insertMany(database: DatabaseContext, table: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    return;
  }

  const keys = naturalKeys[table];
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((column) => `@${column}`).join(", ");
  const statement = database.sqlite.prepare(
    `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
  );

  const transaction = database.sqlite.transaction((items: Array<Record<string, unknown>>) => {
    for (const item of items) {
      if (keys && rowExists(database, table, keys, item)) {
        continue;
      }
      statement.run(item);
    }
  });
  transaction(rows);
}

const defaultStrategyRows = [
  {
    id: "STRAT-CORE-GROWTH",
    name: "核心成长观察策略",
    description: "面向散户慢频投资的核心成长候选筛选，先看证据质量、仓位上限和复核纪律。",
    status: "Active",
    investor_fit: "适合手动研究、低频交易、单标的仓位不超过组合 10% 的账户。",
    universe_rules: "A-Share, HK, US；优先流动性 High；排除 Prohibited 标的。",
    entry_rules: "至少一条 A/B 证据，存在主动论点或可以建立论点，且不触发硬性仓位约束。",
    exit_rules: "论点失效、证据被削弱、复核错过或主题暴露超过上限时退出或降级观察。",
    evidence_requirements: "至少一条 A/B 级信息来源；缺少财报、公告或行业数据时标记补证据。",
    risk_budget: "单标的目标仓位 3%-5%，硬上限 10%，策略总仓位不超过 40%。",
    review_cadence: "每周检查，财报和重大新闻后事件复盘。",
    success_metrics: "收益、最大回撤、证据命中率、纪律执行、复核准时率。",
    created_date: "2026-06-10"
  }
];

const defaultStrategyVersionRows = [
  {
    id: "STRAT-CORE-GROWTH-V1",
    strategy_id: "STRAT-CORE-GROWTH",
    version: "V1",
    status: "Active",
    effective_date: "2026-06-10",
    investor_fit: "适合手动研究、低频交易、单标的仓位不超过组合 10% 的账户。",
    universe_rules: "A-Share, HK, US；优先流动性 High；排除 Prohibited 标的。",
    entry_rules: "至少一条 A/B 证据，存在主动论点或可以建立论点，且不触发硬性仓位约束。",
    exit_rules: "论点失效、证据被削弱、复核错过或主题暴露超过上限时退出或降级观察。",
    evidence_requirements: "至少一条 A/B 级信息来源；缺少财报、公告或行业数据时标记补证据。",
    risk_budget: "单标的目标仓位 3%-5%，硬上限 10%，策略总仓位不超过 40%。",
    review_cadence: "每周检查，财报和重大新闻后事件复盘。",
    success_metrics: "收益、最大回撤、证据命中率、纪律执行、复核准时率。",
    revision_notes: "初始版本：强调证据、仓位和复盘纪律。"
  }
];

export function seedResearchDefaults(database: DatabaseContext): void {
  const strategyCount = database.sqlite.prepare("SELECT COUNT(*) AS count FROM strategies").get() as { count: number };
  if (strategyCount.count === 0) {
    insertMany(database, "strategies", defaultStrategyRows);
  }

  const defaultStrategy = database.sqlite
    .prepare("SELECT 1 FROM strategies WHERE id = ? LIMIT 1")
    .get("STRAT-CORE-GROWTH");
  if (defaultStrategy) {
    insertMany(database, "strategy_versions", defaultStrategyVersionRows);
  }
}

export function seedDemoData(database: DatabaseContext): void {
  insertMany(database, "system_settings", defaultSystemSettingRows);

  insertMany(database, "risk_rules", [
    { code: "single_active_stock_regular_limit", label: "Single active stock regular limit", threshold: 0.05, severity: "Warning", enabled: 1 },
    { code: "single_active_stock_hard_limit", label: "Single active stock hard limit", threshold: 0.1, severity: "Hard", enabled: 1 },
    { code: "single_theme_warning", label: "Single theme warning line", threshold: 0.15, severity: "Warning", enabled: 1 },
    { code: "single_theme_limit", label: "Single theme hard line", threshold: 0.2, severity: "Hard", enabled: 1 },
    { code: "experimental_total_limit", label: "Experimental strategy total limit", threshold: 0.05, severity: "Hard", enabled: 1 }
  ]);

  insertMany(database, "id_counters", [
    { prefix: "AIRUN", year: 2026, current_value: 0 },
    { prefix: "ASTG", year: 2026, current_value: 0 },
    { prefix: "SRUN", year: 2026, current_value: 0 },
    { prefix: "CAND", year: 2026, current_value: 0 },
    { prefix: "REVW", year: 2026, current_value: 0 },
    { prefix: "FIND", year: 2026, current_value: 0 },
    { prefix: "DEC", year: 2026, current_value: 1 },
    { prefix: "EXC", year: 2026, current_value: 1 },
    { prefix: "TRD", year: 2026, current_value: 3 }
  ]);

  insertMany(database, "accounts", [
    {
      id: "ACC-CN-001",
      institution_name: "Demo Brokerage Group",
      account_name: "Demo CN Broker",
      account_type: "cash",
      market: "A-Share",
      supported_markets: JSON.stringify(["A-Share", "HK", "MutualFund"]),
      currency: "CNY",
      allow_margin_or_derivatives: 0,
      include_in_net_worth: 1,
      initial_entry_date: "2026-01-01",
      data_update_method: "Manual",
      notes: "Demo account"
    },
    {
      id: "ACC-US-001",
      institution_name: "Demo Brokerage Group",
      account_name: "Demo US Broker",
      account_type: "cash",
      market: "US",
      supported_markets: JSON.stringify(["US", "HK"]),
      currency: "USD",
      allow_margin_or_derivatives: 0,
      include_in_net_worth: 1,
      initial_entry_date: "2026-01-01",
      data_update_method: "Manual",
      notes: "Demo multi-currency account"
    }
  ]);

  insertMany(database, "securities", [
    {
      id: "CN-510300",
      account_id: "ACC-CN-001",
      name: "沪深300ETF",
      ticker: "510300",
      asset_type: "ETF",
      market: "A-Share",
      currency: "CNY",
      industry_level_1: "BroadMarket",
      industry_level_2: "IndexETF",
      risk_theme_tags: JSON.stringify(["China Equity"]),
      liquidity_level: "High",
      investment_status: "Allowed",
      benchmark: "CSI 300",
      fee_note: "Public ETF fee",
      complexity: "Simple"
    },
    {
      id: "US-AAPL",
      account_id: "ACC-US-001",
      name: "Apple Inc.",
      ticker: "AAPL",
      asset_type: "Stock",
      market: "US",
      currency: "USD",
      industry_level_1: "InformationTechnology",
      industry_level_2: "Hardware",
      risk_theme_tags: JSON.stringify(["AI Capex", "USD", "US Growth Valuation"]),
      liquidity_level: "High",
      investment_status: "Allowed",
      benchmark: "S&P 500 + Technology",
      fee_note: "N/A",
      complexity: "Simple"
    }
  ]);

  insertMany(database, "cashflows", [
    {
      id: "CFL-2026-001",
      cashflow_date: "2026-01-01",
      account_id: "ACC-CN-001",
      security_id: null,
      cashflow_type: "Deposit",
      amount: 200000,
      currency: "CNY",
      fx_rate: 1,
      base_currency_amount: 200000,
      is_external: 1,
      is_investment_income: 0,
      data_source: "Demo bank record",
      notes: "Initial capital"
    },
    {
      id: "CFL-2026-002",
      cashflow_date: "2026-01-01",
      account_id: "ACC-US-001",
      security_id: null,
      cashflow_type: "Deposit",
      amount: 20000,
      currency: "USD",
      fx_rate: 7.2,
      base_currency_amount: 144000,
      is_external: 1,
      is_investment_income: 0,
      data_source: "Demo broker record",
      notes: "Initial USD capital"
    }
  ]);

  insertMany(database, "account_nav_anchors", [
    {
      account_id: "ACC-CN-001",
      anchor_date: "2026-01-01",
      net_asset_value_base: 200000,
      source: "Demo opening statement",
      notes: "Initial account NAV baseline"
    },
    {
      account_id: "ACC-US-001",
      anchor_date: "2026-01-01",
      net_asset_value_base: 144000,
      source: "Demo opening statement",
      notes: "Initial USD account NAV converted to CNY"
    }
  ]);

  insertMany(database, "transactions", [
    {
      id: "TRD-2026-001",
      order_id: "DEMO-CN-1",
      trade_date: "2026-01-03",
      trade_time: "15:00",
      account_id: "ACC-CN-001",
      security_id: "CN-510300",
      strategy_type: "Core",
      thesis_id: null,
      decision_id: null,
      transaction_type: "Buy",
      quantity: 10000,
      unit_price: 4.1,
      gross_amount: 41000,
      commission: 8,
      tax: 0,
      other_fees: 0,
      currency: "CNY",
      fx_rate: 1,
      base_currency_amount: 41008,
      status: "Settled",
      data_source: "Demo broker fill",
      correction_of_id: null
    },
    {
      id: "TRD-2026-002",
      order_id: "DEMO-US-1",
      trade_date: "2026-01-04",
      trade_time: "22:30",
      account_id: "ACC-US-001",
      security_id: "US-AAPL",
      strategy_type: "Active",
      thesis_id: "THS-2026-001",
      decision_id: "DEC-2026-001",
      transaction_type: "Buy",
      quantity: 80,
      unit_price: 205,
      gross_amount: 16400,
      commission: 2,
      tax: 0,
      other_fees: 0,
      currency: "USD",
      fx_rate: 7.2,
      base_currency_amount: 118094.4,
      status: "Settled",
      data_source: "Demo broker fill",
      correction_of_id: null
    }
  ]);

  insertMany(database, "market_prices", [
    { price_date: "2026-06-02", security_id: "CN-510300", close_price: 4.3, currency: "CNY", source: "Manual demo" },
    { price_date: "2026-06-02", security_id: "US-AAPL", close_price: 214, currency: "USD", source: "Manual demo" }
  ]);

  insertMany(database, "fx_rates", [
    { rate_date: "2026-06-02", from_currency: "USD", to_currency: "CNY", rate: 7.2, source: "Manual demo" },
    { rate_date: "2026-06-02", from_currency: "HKD", to_currency: "CNY", rate: 0.92, source: "Manual demo" }
  ]);

  insertMany(database, "information_sources", [
    {
      id: "SRC-2026-001",
      information_date: "2026-05-01",
      obtained_date: "2026-05-02",
      security_id: "US-AAPL",
      risk_theme: "AI Capex",
      information_type: "Filing",
      evidence_level: "A",
      source_name: "Demo quarterly filing",
      source_url: "https://example.com/demo-filing",
      key_facts: "Revenue growth and capital allocation assumptions were updated in the demo filing.",
      thesis_impact: "Support",
      triggers_review: 1,
      related_thesis_id: "THS-2026-001",
      entered_by: "Owner",
      entered_date: "2026-05-02"
    }
  ]);

  seedResearchDefaults(database);

  insertMany(database, "theses", [
    {
      id: "THS-2026-001",
      security_id: "US-AAPL",
      strategy_type: "Active",
      established_date: "2026-05-02",
      version: "V1",
      status: "Active",
      one_line_thesis: "Market expectations understate the next two quarters of device and service resilience.",
      return_mechanism: "Earnings growth and valuation normalization.",
      key_variables: JSON.stringify(["Revenue growth", "Gross margin", "Services mix", "USD", "AI capex"]),
      base_scenario: "Revenue growth remains positive and margins stay within guidance.",
      optimistic_scenario: "Service mix expands faster than expected.",
      pessimistic_scenario: "Demand slows and USD exposure reduces CNY returns.",
      invalidation_conditions: "Two consecutive quarters miss revenue and margin assumptions.",
      entry_conditions: "Position remains below active stock limits and evidence level is A/B.",
      add_conditions: "New A/B evidence strengthens the base scenario.",
      reduce_conditions: "Theme exposure breaches warning level or valuation is stretched.",
      exit_conditions: "Thesis invalidation or hard risk rule breach without acceptable exception.",
      max_position_weight: 0.1,
      expected_holding_period: "12-24 months",
      next_review_date: "2026-07-31",
      closing_conclusion: null
    }
  ]);

  insertMany(database, "thesis_evidence", [
    { thesis_id: "THS-2026-001", source_id: "SRC-2026-001", evidence_side: "Support" }
  ]);

  insertMany(database, "review_events", [
    {
      id: "EVT-2026-001",
      security_id: "US-AAPL",
      strategy_type: "Active",
      event_type: "Earnings",
      expected_date: "2026-07-31",
      importance: "High",
      variables_to_check: JSON.stringify(["Revenue growth", "Margin", "Guidance"]),
      pre_event_action: "Prepare verification",
      post_event_deadline: "Within three trading days",
      status: "Pending",
      result_summary: null,
      triggers_trade: null,
      decision_id: null
    }
  ]);

  insertMany(database, "trade_decisions", [
    {
      id: "DEC-2026-001",
      decision_time: "2026-01-04 21:30",
      security_id: "US-AAPL",
      thesis_id: "THS-2026-001",
      strategy_type: "Active",
      action: "Buy",
      current_price: 205,
      planned_price_min: 200,
      planned_price_max: 210,
      planned_amount_base: 118094.4,
      pre_trade_weight: 0,
      post_trade_weight: 0.28,
      max_allowed_weight: 0.1,
      trigger: "NewFact",
      expected_return_source: "EarningsGrowth",
      main_risks: "Valuation, USD exposure, AI capex cycle",
      downside_loss_base: 25000,
      stop_loss_or_invalidation: "Review after two missed quarters.",
      has_similar_theme_exposure: 1,
      similar_theme_exposure: 0.22,
      touches_limits: 1,
      is_rule_exception: 1,
      emotion_tag: "Calm",
      final_decision: "Execute",
      executed_transaction_id: "TRD-2026-002",
      risk_warnings: JSON.stringify([{ ruleCode: "single_active_stock_hard_limit", severity: "Hard", threshold: 0.1, actual: 0.28 }]),
      status: "Submitted"
    }
  ]);

  insertMany(database, "trade_decision_sources", [
    { decision_id: "DEC-2026-001", source_id: "SRC-2026-001" }
  ]);

  insertMany(database, "exceptions", [
    {
      id: "EXC-2026-001",
      exception_date: "2026-01-04",
      decision_id: "DEC-2026-001",
      transaction_id: "TRD-2026-002",
      exception_type: "PreTradeException",
      related_rule: "single_active_stock_hard_limit",
      behavior_description: "Demo decision executed despite a hard-limit warning.",
      original_reason: "Seed example for audit workflow.",
      risk_impact: "Single active stock exposure is above configured hard limit.",
      caused_loss: 0,
      repair_action: "Review and reduce exposure if thesis weakens.",
      needs_system_change: 0,
      status: "Draft",
      closed_date: null
    }
  ]);
}
