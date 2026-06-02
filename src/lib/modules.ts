import type { DatabaseContext } from "@/lib/db/client";
import type { Row } from "@/lib/services";
import { nextBusinessId } from "@/lib/services";

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "boolean" | "tags";

export interface ModuleField {
  name: string;
  column: string;
  labelZh: string;
  labelEn: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
}

export interface ModuleDefinition {
  id: string;
  table: string;
  navLabelZh: string;
  navLabelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  idPrefix?: string;
  fields: ModuleField[];
  tableColumns: string[];
}

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: "accounts",
    table: "accounts",
    navLabelZh: "账户",
    navLabelEn: "Accounts",
    descriptionZh: "管理所有资金账户和账户属性。",
    descriptionEn: "Manage funding accounts and account attributes.",
    idPrefix: "ACC",
    tableColumns: ["id", "institution_name", "account_type", "market", "currency", "include_in_net_worth"],
    fields: [
      { name: "id", column: "id", labelZh: "账户 ID", labelEn: "Account ID", type: "text" },
      { name: "institutionName", column: "institution_name", labelZh: "机构名称", labelEn: "Institution", type: "text", required: true },
      { name: "accountType", column: "account_type", labelZh: "账户类型", labelEn: "Account Type", type: "select", options: ["Cash", "Margin", "Fund", "BankCash", "Pension"], defaultValue: "Cash" },
      { name: "market", column: "market", labelZh: "市场", labelEn: "Market", type: "select", options: ["A-Share", "HK", "US", "MutualFund"], defaultValue: "A-Share" },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "allowMarginOrDerivatives", column: "allow_margin_or_derivatives", labelZh: "允许融资/衍生品", labelEn: "Margin/Derivatives", type: "boolean", defaultValue: false },
      { name: "includeInNetWorth", column: "include_in_net_worth", labelZh: "纳入净值", labelEn: "Included in NAV", type: "boolean", defaultValue: true },
      { name: "initialEntryDate", column: "initial_entry_date", labelZh: "初始录入日期", labelEn: "Initial Date", type: "date", required: true },
      { name: "dataUpdateMethod", column: "data_update_method", labelZh: "更新方式", labelEn: "Update Method", type: "select", options: ["Manual", "BrokerExport", "API"], defaultValue: "Manual" },
      { name: "notes", column: "notes", labelZh: "备注", labelEn: "Notes", type: "textarea" }
    ]
  },
  {
    id: "securities",
    table: "securities",
    navLabelZh: "标的",
    navLabelEn: "Securities",
    descriptionZh: "统一资产代码、分类和风险主题。",
    descriptionEn: "Normalize security identifiers, categories, and risk themes.",
    tableColumns: ["id", "name", "ticker", "asset_type", "market", "currency", "investment_status"],
    fields: [
      { name: "id", column: "id", labelZh: "标的 ID", labelEn: "Security ID", type: "text", required: true },
      { name: "name", column: "name", labelZh: "名称", labelEn: "Name", type: "text", required: true },
      { name: "ticker", column: "ticker", labelZh: "代码", labelEn: "Ticker", type: "text", required: true },
      { name: "assetType", column: "asset_type", labelZh: "资产类型", labelEn: "Asset Type", type: "select", options: ["Stock", "ETF", "ActiveFund", "Bond", "Gold", "Cash"], defaultValue: "Stock" },
      { name: "market", column: "market", labelZh: "市场", labelEn: "Market", type: "select", options: ["A-Share", "HK", "US", "MutualFund"], defaultValue: "US" },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "USD" },
      { name: "industryLevel1", column: "industry_level_1", labelZh: "一级行业", labelEn: "Industry L1", type: "text" },
      { name: "industryLevel2", column: "industry_level_2", labelZh: "二级行业", labelEn: "Industry L2", type: "text" },
      { name: "riskThemeTags", column: "risk_theme_tags", labelZh: "风险主题", labelEn: "Risk Themes", type: "tags", required: true },
      { name: "liquidityLevel", column: "liquidity_level", labelZh: "流动性", labelEn: "Liquidity", type: "select", options: ["High", "Medium", "Low"], defaultValue: "High" },
      { name: "investmentStatus", column: "investment_status", labelZh: "允许投资", labelEn: "Investment Status", type: "select", options: ["Allowed", "Watch", "Prohibited"], defaultValue: "Allowed" },
      { name: "benchmark", column: "benchmark", labelZh: "基准", labelEn: "Benchmark", type: "text", required: true },
      { name: "feeNote", column: "fee_note", labelZh: "费用说明", labelEn: "Fee Note", type: "text" },
      { name: "complexity", column: "complexity", labelZh: "复杂度", labelEn: "Complexity", type: "select", options: ["Simple", "NeedsApproval", "Prohibited"], defaultValue: "Simple" }
    ]
  },
  {
    id: "transactions",
    table: "transactions",
    navLabelZh: "交易流水",
    navLabelEn: "Transactions",
    descriptionZh: "事实账本。Draft/Pending 可编辑，Settled 后通过更正记录修正。",
    descriptionEn: "Fact ledger. Draft/Pending are editable; settled rows require corrections.",
    idPrefix: "TRD",
    tableColumns: ["id", "trade_date", "account_id", "security_id", "transaction_type", "quantity", "base_currency_amount", "status"],
    fields: [
      { name: "id", column: "id", labelZh: "交易 ID", labelEn: "Transaction ID", type: "text" },
      { name: "tradeDate", column: "trade_date", labelZh: "成交日期", labelEn: "Trade Date", type: "date", required: true },
      { name: "tradeTime", column: "trade_time", labelZh: "成交时间", labelEn: "Trade Time", type: "text" },
      { name: "accountId", column: "account_id", labelZh: "账户 ID", labelEn: "Account ID", type: "text", required: true },
      { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text", required: true },
      { name: "strategyType", column: "strategy_type", labelZh: "策略", labelEn: "Strategy", type: "select", options: ["Core", "Active", "Trading", "Experimental"], defaultValue: "Active" },
      { name: "thesisId", column: "thesis_id", labelZh: "论点 ID", labelEn: "Thesis ID", type: "text" },
      { name: "decisionId", column: "decision_id", labelZh: "决策单 ID", labelEn: "Decision ID", type: "text" },
      { name: "transactionType", column: "transaction_type", labelZh: "操作类型", labelEn: "Type", type: "select", options: ["Buy", "Sell", "Subscribe", "Redeem", "TransferIn", "TransferOut"], defaultValue: "Buy" },
      { name: "quantity", column: "quantity", labelZh: "数量", labelEn: "Quantity", type: "number", required: true },
      { name: "unitPrice", column: "unit_price", labelZh: "成交单价", labelEn: "Unit Price", type: "number", required: true },
      { name: "grossAmount", column: "gross_amount", labelZh: "成交总额", labelEn: "Gross Amount", type: "number", required: true },
      { name: "commission", column: "commission", labelZh: "佣金", labelEn: "Commission", type: "number", defaultValue: 0 },
      { name: "tax", column: "tax", labelZh: "税费", labelEn: "Tax", type: "number", defaultValue: 0 },
      { name: "otherFees", column: "other_fees", labelZh: "其他费用", labelEn: "Other Fees", type: "number", defaultValue: 0 },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "fxRate", column: "fx_rate", labelZh: "汇率", labelEn: "FX Rate", type: "number", defaultValue: 1 },
      { name: "baseCurrencyAmount", column: "base_currency_amount", labelZh: "基准货币金额", labelEn: "Base Amount", type: "number", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Pending", "Settled", "Corrected"], defaultValue: "Draft" },
      { name: "dataSource", column: "data_source", labelZh: "数据来源", labelEn: "Source", type: "text", required: true },
      { name: "correctionOfId", column: "correction_of_id", labelZh: "更正关联 ID", labelEn: "Correction Of", type: "text" }
    ]
  },
  {
    id: "cashflows",
    table: "cashflows",
    navLabelZh: "现金流/公司行为",
    navLabelEn: "Cashflows",
    descriptionZh: "区分外部资金变动、收益、费用和公司行为。",
    descriptionEn: "Separate external capital, income, costs, and corporate actions.",
    idPrefix: "CFL",
    tableColumns: ["id", "cashflow_date", "account_id", "cashflow_type", "amount", "currency", "is_external"],
    fields: [
      { name: "id", column: "id", labelZh: "现金流 ID", labelEn: "Cashflow ID", type: "text" },
      { name: "cashflowDate", column: "cashflow_date", labelZh: "日期", labelEn: "Date", type: "date", required: true },
      { name: "accountId", column: "account_id", labelZh: "账户 ID", labelEn: "Account ID", type: "text", required: true },
      { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text" },
      { name: "cashflowType", column: "cashflow_type", labelZh: "类型", labelEn: "Type", type: "select", options: ["Deposit", "Withdrawal", "Dividend", "Interest", "Tax", "ManagementFee", "MarginInterest", "Split", "RightsIssue", "FX"], defaultValue: "Deposit" },
      { name: "amount", column: "amount", labelZh: "金额", labelEn: "Amount", type: "number", required: true },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "fxRate", column: "fx_rate", labelZh: "汇率", labelEn: "FX Rate", type: "number", defaultValue: 1 },
      { name: "baseCurrencyAmount", column: "base_currency_amount", labelZh: "基准金额", labelEn: "Base Amount", type: "number", required: true },
      { name: "isExternal", column: "is_external", labelZh: "外部现金流", labelEn: "External", type: "boolean", defaultValue: true },
      { name: "isInvestmentIncome", column: "is_investment_income", labelZh: "计入收益", labelEn: "Income", type: "boolean", defaultValue: false },
      { name: "dataSource", column: "data_source", labelZh: "数据来源", labelEn: "Source", type: "text", required: true },
      { name: "notes", column: "notes", labelZh: "备注", labelEn: "Notes", type: "textarea" }
    ]
  },
  {
    id: "prices",
    table: "market_prices",
    navLabelZh: "价格",
    navLabelEn: "Prices",
    descriptionZh: "手动录入收盘价或估值日净值。",
    descriptionEn: "Manually record closing prices or valuation NAVs.",
    tableColumns: ["price_date", "security_id", "close_price", "currency", "source"],
    fields: [
      { name: "priceDate", column: "price_date", labelZh: "日期", labelEn: "Date", type: "date", required: true },
      { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text", required: true },
      { name: "closePrice", column: "close_price", labelZh: "收盘价", labelEn: "Close Price", type: "number", required: true },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "source", column: "source", labelZh: "来源", labelEn: "Source", type: "text", required: true }
    ]
  },
  {
    id: "fx-rates",
    table: "fx_rates",
    navLabelZh: "汇率",
    navLabelEn: "FX Rates",
    descriptionZh: "手动维护 CNY/HKD/USD 折算汇率。",
    descriptionEn: "Manually maintain CNY/HKD/USD rates.",
    tableColumns: ["rate_date", "from_currency", "to_currency", "rate", "source"],
    fields: [
      { name: "rateDate", column: "rate_date", labelZh: "日期", labelEn: "Date", type: "date", required: true },
      { name: "fromCurrency", column: "from_currency", labelZh: "原币", labelEn: "From", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "USD" },
      { name: "toCurrency", column: "to_currency", labelZh: "目标币种", labelEn: "To", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "rate", column: "rate", labelZh: "汇率", labelEn: "Rate", type: "number", required: true },
      { name: "source", column: "source", labelZh: "来源", labelEn: "Source", type: "text", required: true }
    ]
  },
  {
    id: "sources",
    table: "information_sources",
    navLabelZh: "信息来源",
    navLabelEn: "Sources",
    descriptionZh: "记录证据等级、关键事实和原始链接。",
    descriptionEn: "Record evidence level, key facts, and source URL.",
    idPrefix: "SRC",
    tableColumns: ["id", "information_date", "security_id", "evidence_level", "source_name", "thesis_impact"],
    fields: [
      { name: "id", column: "id", labelZh: "信息 ID", labelEn: "Source ID", type: "text" },
      { name: "informationDate", column: "information_date", labelZh: "信息日期", labelEn: "Info Date", type: "date", required: true },
      { name: "obtainedDate", column: "obtained_date", labelZh: "获取日期", labelEn: "Obtained Date", type: "date", required: true },
      { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text" },
      { name: "riskTheme", column: "risk_theme", labelZh: "风险主题", labelEn: "Risk Theme", type: "text" },
      { name: "informationType", column: "information_type", labelZh: "信息类型", labelEn: "Info Type", type: "select", options: ["Filing", "Announcement", "Policy", "IndustryData", "SellSide", "Media", "Social"], defaultValue: "Filing" },
      { name: "evidenceLevel", column: "evidence_level", labelZh: "证据等级", labelEn: "Evidence", type: "select", options: ["A", "B", "C", "D"], defaultValue: "A" },
      { name: "sourceName", column: "source_name", labelZh: "来源名称", labelEn: "Source Name", type: "text", required: true },
      { name: "sourceUrl", column: "source_url", labelZh: "原始链接", labelEn: "Source URL", type: "text", required: true },
      { name: "keyFacts", column: "key_facts", labelZh: "关键事实", labelEn: "Key Facts", type: "textarea", required: true },
      { name: "thesisImpact", column: "thesis_impact", labelZh: "论点影响", labelEn: "Impact", type: "select", options: ["Support", "Weaken", "Irrelevant", "Pending"], defaultValue: "Pending" },
      { name: "triggersReview", column: "triggers_review", labelZh: "触发复核", labelEn: "Triggers Review", type: "boolean", defaultValue: false },
      { name: "relatedThesisId", column: "related_thesis_id", labelZh: "关联论点", labelEn: "Related Thesis", type: "text" },
      { name: "enteredBy", column: "entered_by", labelZh: "录入人", labelEn: "Entered By", type: "text", defaultValue: "Owner" },
      { name: "enteredDate", column: "entered_date", labelZh: "录入日期", labelEn: "Entered Date", type: "date", required: true }
    ]
  },
  {
    id: "theses",
    table: "theses",
    navLabelZh: "投资论点",
    navLabelEn: "Theses",
    descriptionZh: "主动仓必须具备论点、反方证据和失效条件。",
    descriptionEn: "Active positions require thesis, counterevidence, and invalidation rules.",
    idPrefix: "THS",
    tableColumns: ["id", "security_id", "strategy_type", "status", "version", "next_review_date"],
    fields: [
      { name: "id", column: "id", labelZh: "论点 ID", labelEn: "Thesis ID", type: "text" },
      { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text", required: true },
      { name: "strategyType", column: "strategy_type", labelZh: "策略", labelEn: "Strategy", type: "select", options: ["Active", "Trading", "Experimental"], defaultValue: "Active" },
      { name: "establishedDate", column: "established_date", labelZh: "建立日期", labelEn: "Established", type: "date", required: true },
      { name: "version", column: "version", labelZh: "版本", labelEn: "Version", type: "text", defaultValue: "V1" },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Researching", "Active", "Closed", "Invalidated"], defaultValue: "Draft" },
      { name: "oneLineThesis", column: "one_line_thesis", labelZh: "一句话论点", labelEn: "One-line Thesis", type: "textarea", required: true },
      { name: "returnMechanism", column: "return_mechanism", labelZh: "收益机制", labelEn: "Return Mechanism", type: "textarea", required: true },
      { name: "keyVariables", column: "key_variables", labelZh: "关键变量", labelEn: "Key Variables", type: "tags", required: true },
      { name: "baseScenario", column: "base_scenario", labelZh: "基准情景", labelEn: "Base Scenario", type: "textarea", required: true },
      { name: "optimisticScenario", column: "optimistic_scenario", labelZh: "乐观情景", labelEn: "Optimistic", type: "textarea", required: true },
      { name: "pessimisticScenario", column: "pessimistic_scenario", labelZh: "悲观情景", labelEn: "Pessimistic", type: "textarea", required: true },
      { name: "invalidationConditions", column: "invalidation_conditions", labelZh: "失效条件", labelEn: "Invalidation", type: "textarea", required: true },
      { name: "entryConditions", column: "entry_conditions", labelZh: "建仓条件", labelEn: "Entry", type: "textarea", required: true },
      { name: "addConditions", column: "add_conditions", labelZh: "加仓条件", labelEn: "Add", type: "textarea", required: true },
      { name: "reduceConditions", column: "reduce_conditions", labelZh: "减仓条件", labelEn: "Reduce", type: "textarea", required: true },
      { name: "exitConditions", column: "exit_conditions", labelZh: "清仓条件", labelEn: "Exit", type: "textarea", required: true },
      { name: "maxPositionWeight", column: "max_position_weight", labelZh: "最大仓位", labelEn: "Max Weight", type: "number", defaultValue: 0.05 },
      { name: "expectedHoldingPeriod", column: "expected_holding_period", labelZh: "预期持有期", labelEn: "Holding Period", type: "text", required: true },
      { name: "nextReviewDate", column: "next_review_date", labelZh: "下次复核", labelEn: "Next Review", type: "date", required: true },
      { name: "closingConclusion", column: "closing_conclusion", labelZh: "关闭结论", labelEn: "Closing Conclusion", type: "textarea" }
    ]
  },
  {
    id: "review-events",
    table: "review_events",
    navLabelZh: "复核日历",
    navLabelEn: "Review Events",
    descriptionZh: "管理财报、复核和风险事件。",
    descriptionEn: "Manage earnings, reviews, and risk events.",
    idPrefix: "EVT",
    tableColumns: ["id", "expected_date", "security_id", "event_type", "importance", "status"],
    fields: [
      { name: "id", column: "id", labelZh: "事件 ID", labelEn: "Event ID", type: "text" },
      { name: "securityId", column: "security_id", labelZh: "标的 ID", labelEn: "Security ID", type: "text" },
      { name: "strategyType", column: "strategy_type", labelZh: "策略", labelEn: "Strategy", type: "select", options: ["Core", "Active", "Trading", "Experimental"], defaultValue: "Active" },
      { name: "eventType", column: "event_type", labelZh: "事件类型", labelEn: "Event Type", type: "select", options: ["Earnings", "Dividend", "ShareholderMeeting", "Policy", "MacroData", "Review"], defaultValue: "Review" },
      { name: "expectedDate", column: "expected_date", labelZh: "预期日期", labelEn: "Expected Date", type: "date", required: true },
      { name: "importance", column: "importance", labelZh: "重要度", labelEn: "Importance", type: "select", options: ["High", "Medium", "Low"], defaultValue: "Medium" },
      { name: "variablesToCheck", column: "variables_to_check", labelZh: "检查变量", labelEn: "Variables", type: "tags", required: true },
      { name: "preEventAction", column: "pre_event_action", labelZh: "事件前行动", labelEn: "Pre Action", type: "text", required: true },
      { name: "postEventDeadline", column: "post_event_deadline", labelZh: "后续期限", labelEn: "Post Deadline", type: "text", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Pending", "Done", "Missed"], defaultValue: "Pending" }
    ]
  },
  {
    id: "risk-rules",
    table: "risk_rules",
    navLabelZh: "风险规则",
    navLabelEn: "Risk Rules",
    descriptionZh: "维护所有风控阈值，交易决策校验引用这里。",
    descriptionEn: "Maintain configurable thresholds used by decision checks.",
    tableColumns: ["code", "label", "threshold", "severity", "enabled"],
    fields: [
      { name: "code", column: "code", labelZh: "规则代码", labelEn: "Code", type: "text", required: true },
      { name: "label", column: "label", labelZh: "规则名称", labelEn: "Label", type: "text", required: true },
      { name: "threshold", column: "threshold", labelZh: "阈值", labelEn: "Threshold", type: "number", required: true },
      { name: "severity", column: "severity", labelZh: "级别", labelEn: "Severity", type: "select", options: ["Warning", "Hard"], defaultValue: "Warning" },
      { name: "enabled", column: "enabled", labelZh: "启用", labelEn: "Enabled", type: "boolean", defaultValue: true }
    ]
  },
  {
    id: "exceptions",
    table: "exceptions",
    navLabelZh: "例外/违规",
    navLabelEn: "Exceptions",
    descriptionZh: "记录事前例外、事后违规、数据错误和流程遗漏。",
    descriptionEn: "Track pre-trade exceptions, violations, data errors, and process misses.",
    idPrefix: "EXC",
    tableColumns: ["id", "exception_date", "exception_type", "related_rule", "status", "decision_id"],
    fields: [
      { name: "id", column: "id", labelZh: "记录 ID", labelEn: "Record ID", type: "text" },
      { name: "exceptionDate", column: "exception_date", labelZh: "日期", labelEn: "Date", type: "date", required: true },
      { name: "decisionId", column: "decision_id", labelZh: "决策单 ID", labelEn: "Decision ID", type: "text" },
      { name: "transactionId", column: "transaction_id", labelZh: "交易 ID", labelEn: "Transaction ID", type: "text" },
      { name: "exceptionType", column: "exception_type", labelZh: "类型", labelEn: "Type", type: "select", options: ["PreTradeException", "PostTradeViolation", "DataError", "ProcessMiss"], defaultValue: "PreTradeException" },
      { name: "relatedRule", column: "related_rule", labelZh: "涉及规则", labelEn: "Rule", type: "text", required: true },
      { name: "behaviorDescription", column: "behavior_description", labelZh: "行为描述", labelEn: "Behavior", type: "textarea", required: true },
      { name: "originalReason", column: "original_reason", labelZh: "当时理由", labelEn: "Original Reason", type: "textarea", required: true },
      { name: "riskImpact", column: "risk_impact", labelZh: "风险影响", labelEn: "Risk Impact", type: "textarea", required: true },
      { name: "causedLoss", column: "caused_loss", labelZh: "造成损失", labelEn: "Caused Loss", type: "boolean", defaultValue: false },
      { name: "repairAction", column: "repair_action", labelZh: "修复动作", labelEn: "Repair Action", type: "textarea", required: true },
      { name: "needsSystemChange", column: "needs_system_change", labelZh: "需系统修改", labelEn: "System Change", type: "boolean", defaultValue: false },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Open", "Closed"], defaultValue: "Draft" }
    ]
  }
];

export function findModuleDefinition(id: string): ModuleDefinition | undefined {
  return moduleDefinitions.find((definition) => definition.id === id);
}

export function listModuleRows(database: DatabaseContext, definition: ModuleDefinition): Row[] {
  return database.sqlite.prepare(`SELECT * FROM ${definition.table} ORDER BY rowid DESC`).all() as Row[];
}

function coerceValue(field: ModuleField, value: unknown): string | number | null {
  if (value === undefined || value === null || value === "") {
    return field.required ? "" : null;
  }

  if (field.type === "number") {
    return Number(value);
  }

  if (field.type === "boolean") {
    return value === true || value === "true" || value === "1" ? 1 : 0;
  }

  if (field.type === "tags") {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return JSON.stringify(String(value).split(",").map((item) => item.trim()).filter(Boolean));
  }

  return String(value);
}

export function insertModuleRecord(database: DatabaseContext, moduleId: string, values: Record<string, unknown>): Row {
  const definition = findModuleDefinition(moduleId);
  if (!definition) {
    throw new Error(`Unknown module ${moduleId}`);
  }

  const row: Row = {};
  for (const field of definition.fields) {
    const value = values[field.name] ?? field.defaultValue ?? null;
    row[field.column] = coerceValue(field, value);
  }

  const idField = definition.fields.find((field) => field.column === "id");
  if (definition.idPrefix && idField && !row.id) {
    row.id = nextBusinessId(database, definition.idPrefix);
  }

  const columns = Object.keys(row).filter((column) => row[column] !== undefined);
  const statement = database.sqlite.prepare(
    `INSERT INTO ${definition.table} (${columns.join(", ")}) VALUES (${columns.map((column) => `@${column}`).join(", ")})`
  );
  statement.run(row);
  return row;
}
