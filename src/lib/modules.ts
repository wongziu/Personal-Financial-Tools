import type { DatabaseContext } from "@/lib/db/client";
import { isFieldReadOnlyOnEdit, isModuleRowEditable } from "@/lib/module-records";
import { deriveLiquidityLevel, normalizeLockupDays } from "@/lib/security-liquidity";
import type { Row } from "@/lib/services";
import { nextBusinessId } from "@/lib/services";

export type FieldType = "text" | "number" | "date" | "select" | "multi-select" | "textarea" | "boolean" | "tags" | "computed";

export const industryLevel1Options = [
  "InformationTechnology",
  "CommunicationServices",
  "ConsumerDiscretionary",
  "ConsumerStaples",
  "HealthCare",
  "Financials",
  "Industrials",
  "Energy",
  "Materials",
  "Utilities",
  "RealEstate",
  "FixedIncome",
  "BroadMarket",
  "MultiAsset",
  "CashAndMoneyMarket",
  "Unclassified",
  "OtherIndustry"
] as const;

export const industryLevel2OptionsByLevel1: Record<string, string[]> = {
  InformationTechnology: ["Software", "Hardware", "Semiconductors", "ITServices", "InternetPlatforms", "OtherTechnology"],
  CommunicationServices: ["Telecom", "Media", "Entertainment", "InteractiveMedia", "OtherCommunicationServices"],
  ConsumerDiscretionary: ["Automobiles", "ConsumerDurables", "DiscretionaryRetail", "TravelLeisure", "Restaurants", "OtherDiscretionary"],
  ConsumerStaples: ["FoodBeverage", "HouseholdProducts", "StaplesRetail", "Agriculture", "OtherStaples"],
  HealthCare: ["Pharmaceuticals", "Biotechnology", "MedicalDevices", "HealthCareServices", "OtherHealthCare"],
  Financials: ["Banks", "Insurance", "Brokerage", "AssetManagement", "Fintech", "OtherFinancials"],
  Industrials: ["CapitalGoods", "Transportation", "CommercialServices", "AerospaceDefense", "OtherIndustrials"],
  Energy: ["OilGas", "Renewables", "EnergyEquipment", "OtherEnergy"],
  Materials: ["Chemicals", "MetalsMining", "ConstructionMaterials", "PaperPackaging", "OtherMaterials"],
  Utilities: ["ElectricUtilities", "GasUtilities", "WaterUtilities", "PowerGeneration", "OtherUtilities"],
  RealEstate: ["PropertyDevelopment", "REITs", "PropertyServices", "OtherRealEstate"],
  FixedIncome: ["GovernmentBond", "CreditBond", "BondFund", "BankWealthManagement", "OtherFixedIncome"],
  BroadMarket: ["BroadIndex", "IndexETF", "OtherBroadMarket"],
  MultiAsset: ["BalancedFund", "FOF", "BankWealthManagement", "OtherMultiAsset"],
  CashAndMoneyMarket: ["CashSubIndustry", "MoneyMarketFund", "BankDeposit", "OtherCash"],
  Unclassified: ["UnclassifiedSubIndustry", "BankWealthManagement", "OtherSubIndustry"],
  OtherIndustry: ["OtherSubIndustry"]
};

export interface ModuleField {
  name: string;
  column: string;
  labelZh: string;
  labelEn: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  reference?: {
    table: string;
    valueColumn: string;
    labelColumns: string[];
    metadataColumns?: string[];
  };
  dependsOn?: string;
  optionGroups?: Record<string, string[]>;
  visibleWhen?: {
    field: string;
    values: string[];
  };
  defaultValue?: string | number | boolean;
  hidden?: boolean;
}

export interface ModuleDefinition {
  id: string;
  table: string;
  navLabelZh: string;
  navLabelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  idPrefix?: string;
  calendar?: {
    enabled?: boolean;
    defaultColumn?: string;
  };
  fields: ModuleField[];
  tableColumns: string[];
}

export interface ReferenceOption {
  value: string;
  label: string;
  metadata: Record<string, string>;
}

export type ModuleReferenceOptions = Record<string, ReferenceOption[]>;

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: "accounts",
    table: "accounts",
    navLabelZh: "账户",
    navLabelEn: "Accounts",
    descriptionZh: "管理所有资金账户和账户属性。",
    descriptionEn: "Manage funding accounts and account attributes.",
    idPrefix: "ACC",
    calendar: { enabled: false },
    tableColumns: ["institution_name", "account_name", "id", "account_type", "supported_markets", "currency", "include_in_net_worth"],
    fields: [
      { name: "id", column: "id", labelZh: "账户 ID", labelEn: "Account ID", type: "text" },
      { name: "institutionName", column: "institution_name", labelZh: "机构名称", labelEn: "Institution", type: "text", required: true },
      { name: "accountName", column: "account_name", labelZh: "账户名称", labelEn: "Account Name", type: "text", required: true },
      { name: "accountType", column: "account_type", labelZh: "账户类型", labelEn: "Account Type", type: "select", options: ["cash", "margin", "fund", "bank_cash", "pension"], defaultValue: "cash" },
      { name: "supportedMarkets", column: "supported_markets", labelZh: "支持市场", labelEn: "Supported Markets", type: "multi-select", options: ["A-Share", "HK", "US", "MutualFund"], required: true, defaultValue: "A-Share" },
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
    tableColumns: ["ticker", "name", "account_id", "asset_type", "market", "currency", "liquidity_level", "investment_status"],
    fields: [
      { name: "id", column: "id", labelZh: "标的 ID", labelEn: "Security ID", type: "text", hidden: true },
      {
        name: "accountId",
        column: "account_id",
        labelZh: "关联账户",
        labelEn: "Linked Account",
        type: "text",
        required: true,
        reference: { table: "accounts", valueColumn: "id", labelColumns: ["account_name", "currency"], metadataColumns: ["institution_name", "currency", "supported_markets"] }
      },
      { name: "name", column: "name", labelZh: "名称", labelEn: "Name", type: "text", required: true },
      { name: "ticker", column: "ticker", labelZh: "代码", labelEn: "Ticker", type: "text", required: true },
      { name: "assetType", column: "asset_type", labelZh: "资产类型", labelEn: "Asset Type", type: "select", options: ["Stock", "ETF", "ActiveFund", "Bond", "Gold", "Cash"], defaultValue: "Stock" },
      { name: "market", column: "market", labelZh: "市场", labelEn: "Market", type: "select", options: ["A-Share", "HK", "US", "MutualFund"], defaultValue: "US" },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "USD" },
      { name: "industryLevel1", column: "industry_level_1", labelZh: "一级行业", labelEn: "Industry L1", type: "select", options: [...industryLevel1Options], defaultValue: "InformationTechnology" },
      { name: "industryLevel2", column: "industry_level_2", labelZh: "二级行业", labelEn: "Industry L2", type: "select", dependsOn: "industryLevel1", optionGroups: industryLevel2OptionsByLevel1, defaultValue: "Software" },
      { name: "riskThemeTags", column: "risk_theme_tags", labelZh: "风险主题", labelEn: "Risk Themes", type: "tags", required: true },
      { name: "lockupDays", column: "lockup_days", labelZh: "锁定期（天）", labelEn: "Lock-up Days", type: "number", visibleWhen: { field: "assetType", values: ["ActiveFund", "Bond"] }, defaultValue: 0 },
      { name: "liquidityLevel", column: "liquidity_level", labelZh: "流动性", labelEn: "Liquidity", type: "computed", options: ["High", "Medium", "Low"], defaultValue: "High" },
      { name: "investmentStatus", column: "investment_status", labelZh: "允许投资", labelEn: "Investment Status", type: "select", options: ["Allowed", "Watch", "Prohibited"], defaultValue: "Allowed" },
      { name: "benchmark", column: "benchmark", labelZh: "基准", labelEn: "Benchmark", type: "text", required: true },
      { name: "feeNote", column: "fee_note", labelZh: "费用说明", labelEn: "Fee Note", type: "text" },
      { name: "complexity", column: "complexity", labelZh: "复杂度", labelEn: "Complexity", type: "select", options: ["Simple", "NeedsApproval", "Prohibited"], defaultValue: "Simple" }
    ]
  },
  {
    id: "transactions",
    table: "transactions",
    navLabelZh: "标的交易流水",
    navLabelEn: "Security Transactions",
    descriptionZh: "记录围绕标的发生的买入、卖出、申购、赎回和转入转出；Draft/Pending 可编辑，Settled 后通过更正记录修正。",
    descriptionEn: "Record security-level buys, sells, subscriptions, redemptions, and transfers. Draft/Pending are editable; settled rows require corrections.",
    idPrefix: "TRD",
    tableColumns: ["id", "trade_date", "account_id", "security_id", "transaction_type", "quantity", "base_currency_amount", "status"],
    fields: [
      { name: "id", column: "id", labelZh: "交易 ID", labelEn: "Transaction ID", type: "text", hidden: true },
      { name: "tradeDate", column: "trade_date", labelZh: "成交日期", labelEn: "Trade Date", type: "date", required: true },
      { name: "tradeTime", column: "trade_time", labelZh: "成交时间", labelEn: "Trade Time", type: "text" },
      { name: "accountId", column: "account_id", labelZh: "账户", labelEn: "Account", type: "text", required: true, reference: { table: "accounts", valueColumn: "id", labelColumns: ["account_name", "currency"], metadataColumns: ["institution_name", "currency"] } },
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", required: true, reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "strategyType", column: "strategy_type", labelZh: "策略", labelEn: "Strategy", type: "select", options: ["Core", "Active", "Trading", "Experimental"], defaultValue: "Active" },
      {
        name: "thesisId",
        column: "thesis_id",
        labelZh: "论点 ID",
        labelEn: "Thesis ID",
        type: "text",
        reference: { table: "theses", valueColumn: "id", labelColumns: ["one_line_thesis", "id"], metadataColumns: ["security_id"] }
      },
      {
        name: "decisionId",
        column: "decision_id",
        labelZh: "决策单 ID",
        labelEn: "Decision ID",
        type: "text",
        reference: { table: "trade_decisions", valueColumn: "id", labelColumns: ["id", "security_id", "action"], metadataColumns: ["security_id", "thesis_id"] }
      },
      { name: "transactionType", column: "transaction_type", labelZh: "操作类型", labelEn: "Type", type: "select", options: ["Buy", "Sell", "Subscribe", "Redeem", "TransferIn", "TransferOut"], defaultValue: "Buy" },
      { name: "quantity", column: "quantity", labelZh: "数量", labelEn: "Quantity", type: "number", required: true },
      { name: "unitPrice", column: "unit_price", labelZh: "成交单价", labelEn: "Unit Price", type: "number", required: true },
      { name: "grossAmount", column: "gross_amount", labelZh: "成交总额", labelEn: "Gross Amount", type: "computed", required: true },
      { name: "commission", column: "commission", labelZh: "佣金", labelEn: "Commission", type: "number", defaultValue: 0 },
      { name: "tax", column: "tax", labelZh: "税费", labelEn: "Tax", type: "number", defaultValue: 0 },
      { name: "otherFees", column: "other_fees", labelZh: "其他费用", labelEn: "Other Fees", type: "number", defaultValue: 0 },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "fxRate", column: "fx_rate", labelZh: "汇率", labelEn: "FX Rate", type: "number", defaultValue: 1 },
      { name: "baseCurrencyAmount", column: "base_currency_amount", labelZh: "基准货币金额", labelEn: "Base Amount", type: "computed", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Pending", "Settled", "Corrected"], defaultValue: "Draft" },
      { name: "dataSource", column: "data_source", labelZh: "数据来源", labelEn: "Source", type: "text", required: true },
      {
        name: "correctionOfId",
        column: "correction_of_id",
        labelZh: "更正关联 ID",
        labelEn: "Correction Of",
        type: "text",
        reference: { table: "transactions", valueColumn: "id", labelColumns: ["id", "trade_date", "transaction_type"], metadataColumns: ["security_id", "account_id"] }
      }
    ]
  },
  {
    id: "cashflows",
    table: "cashflows",
    navLabelZh: "账户现金流",
    navLabelEn: "Account Cashflows",
    descriptionZh: "记录账户出入金、分红、利息、费用和换汇等现金变动；金额按正数填写，系统根据类型判断方向。",
    descriptionEn: "Record account deposits, withdrawals, dividends, interest, fees, and FX cash movements. Enter positive amounts; direction is derived from type.",
    idPrefix: "CFL",
    tableColumns: ["id", "cashflow_date", "account_id", "cashflow_type", "amount", "currency", "is_external"],
    fields: [
      { name: "id", column: "id", labelZh: "现金流 ID", labelEn: "Cashflow ID", type: "text", hidden: true },
      { name: "cashflowDate", column: "cashflow_date", labelZh: "日期", labelEn: "Date", type: "date", required: true },
      { name: "accountId", column: "account_id", labelZh: "账户", labelEn: "Account", type: "text", required: true, reference: { table: "accounts", valueColumn: "id", labelColumns: ["account_name", "currency"], metadataColumns: ["institution_name", "currency"] } },
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "cashflowType", column: "cashflow_type", labelZh: "类型", labelEn: "Type", type: "select", options: ["Deposit", "Withdrawal", "Dividend", "Interest", "Tax", "ManagementFee", "MarginInterest", "FX"], defaultValue: "Deposit" },
      { name: "amount", column: "amount", labelZh: "金额", labelEn: "Amount", type: "number", required: true },
      { name: "currency", column: "currency", labelZh: "币种", labelEn: "Currency", type: "select", options: ["CNY", "HKD", "USD"], defaultValue: "CNY" },
      { name: "fxRate", column: "fx_rate", labelZh: "汇率", labelEn: "FX Rate", type: "number", defaultValue: 1 },
      { name: "baseCurrencyAmount", column: "base_currency_amount", labelZh: "基准金额", labelEn: "Base Amount", type: "number", required: true },
      { name: "isExternal", column: "is_external", labelZh: "外部现金流", labelEn: "External", type: "computed", defaultValue: true },
      { name: "isInvestmentIncome", column: "is_investment_income", labelZh: "计入收益", labelEn: "Income", type: "computed", defaultValue: false },
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
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", required: true, reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["currency"] } },
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
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "riskTheme", column: "risk_theme", labelZh: "风险主题", labelEn: "Risk Theme", type: "text" },
      { name: "informationType", column: "information_type", labelZh: "信息类型", labelEn: "Info Type", type: "select", options: ["Filing", "Announcement", "Policy", "IndustryData", "SellSide", "Media", "Social"], defaultValue: "Filing" },
      { name: "evidenceLevel", column: "evidence_level", labelZh: "证据等级", labelEn: "Evidence", type: "select", options: ["A", "B", "C", "D"], defaultValue: "A" },
      { name: "sourceName", column: "source_name", labelZh: "来源名称", labelEn: "Source Name", type: "text", required: true },
      { name: "sourceUrl", column: "source_url", labelZh: "原始链接", labelEn: "Source URL", type: "text", required: true },
      { name: "keyFacts", column: "key_facts", labelZh: "关键事实", labelEn: "Key Facts", type: "textarea", required: true },
      { name: "thesisImpact", column: "thesis_impact", labelZh: "论点影响", labelEn: "Impact", type: "select", options: ["Support", "Weaken", "Irrelevant", "Pending"], defaultValue: "Pending" },
      { name: "triggersReview", column: "triggers_review", labelZh: "触发复核", labelEn: "Triggers Review", type: "boolean", defaultValue: false },
      {
        name: "relatedThesisId",
        column: "related_thesis_id",
        labelZh: "关联论点",
        labelEn: "Related Thesis",
        type: "text",
        reference: { table: "theses", valueColumn: "id", labelColumns: ["one_line_thesis", "id"], metadataColumns: ["security_id"] }
      },
      { name: "enteredBy", column: "entered_by", labelZh: "录入人", labelEn: "Entered By", type: "text", defaultValue: "Owner" },
      { name: "enteredDate", column: "entered_date", labelZh: "录入日期", labelEn: "Entered Date", type: "date", required: true }
    ]
  },
  {
    id: "strategies",
    table: "strategies",
    navLabelZh: "策略库",
    navLabelEn: "Strategies",
    descriptionZh: "维护面向散户慢频投资的策略假设、证据门槛、仓位约束和复盘频率。",
    descriptionEn: "Maintain retail-friendly strategy hypotheses, evidence gates, risk budgets, and review cadence.",
    tableColumns: ["id", "name", "status", "review_cadence", "risk_budget"],
    fields: [
      { name: "id", column: "id", labelZh: "策略 ID", labelEn: "Strategy ID", type: "text" },
      { name: "name", column: "name", labelZh: "策略名称", labelEn: "Name", type: "text", required: true },
      { name: "description", column: "description", labelZh: "策略说明", labelEn: "Description", type: "textarea", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Active", "Paused", "Retired"], defaultValue: "Draft" },
      { name: "investorFit", column: "investor_fit", labelZh: "适用投资者", labelEn: "Investor Fit", type: "textarea", required: true },
      { name: "universeRules", column: "universe_rules", labelZh: "候选范围", labelEn: "Universe Rules", type: "textarea", required: true },
      { name: "entryRules", column: "entry_rules", labelZh: "进入条件", labelEn: "Entry Rules", type: "textarea", required: true },
      { name: "exitRules", column: "exit_rules", labelZh: "退出条件", labelEn: "Exit Rules", type: "textarea", required: true },
      { name: "evidenceRequirements", column: "evidence_requirements", labelZh: "证据要求", labelEn: "Evidence Requirements", type: "textarea", required: true },
      { name: "riskBudget", column: "risk_budget", labelZh: "风险预算", labelEn: "Risk Budget", type: "textarea", required: true },
      { name: "reviewCadence", column: "review_cadence", labelZh: "复盘频率", labelEn: "Review Cadence", type: "text", required: true },
      { name: "successMetrics", column: "success_metrics", labelZh: "成功指标", labelEn: "Success Metrics", type: "textarea", required: true },
      { name: "createdDate", column: "created_date", labelZh: "创建日期", labelEn: "Created Date", type: "date", required: true }
    ]
  },
  {
    id: "strategy-versions",
    table: "strategy_versions",
    navLabelZh: "策略版本",
    navLabelEn: "Strategy Versions",
    descriptionZh: "记录策略的可追溯版本，复盘后通过新版本承接规则变化。",
    descriptionEn: "Track versioned strategy rules so review changes are auditable.",
    tableColumns: ["id", "strategy_id", "version", "status", "effective_date"],
    fields: [
      { name: "id", column: "id", labelZh: "版本 ID", labelEn: "Version ID", type: "text" },
      { name: "strategyId", column: "strategy_id", labelZh: "策略", labelEn: "Strategy", type: "text", required: true, reference: { table: "strategies", valueColumn: "id", labelColumns: ["name", "id"] } },
      { name: "version", column: "version", labelZh: "版本", labelEn: "Version", type: "text", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Active", "Retired"], defaultValue: "Draft" },
      { name: "effectiveDate", column: "effective_date", labelZh: "生效日期", labelEn: "Effective Date", type: "date", required: true },
      { name: "investorFit", column: "investor_fit", labelZh: "适用投资者", labelEn: "Investor Fit", type: "textarea", required: true },
      { name: "universeRules", column: "universe_rules", labelZh: "候选范围", labelEn: "Universe Rules", type: "textarea", required: true },
      { name: "entryRules", column: "entry_rules", labelZh: "进入条件", labelEn: "Entry Rules", type: "textarea", required: true },
      { name: "exitRules", column: "exit_rules", labelZh: "退出条件", labelEn: "Exit Rules", type: "textarea", required: true },
      { name: "evidenceRequirements", column: "evidence_requirements", labelZh: "证据要求", labelEn: "Evidence Requirements", type: "textarea", required: true },
      { name: "riskBudget", column: "risk_budget", labelZh: "风险预算", labelEn: "Risk Budget", type: "textarea", required: true },
      { name: "reviewCadence", column: "review_cadence", labelZh: "复盘频率", labelEn: "Review Cadence", type: "text", required: true },
      { name: "successMetrics", column: "success_metrics", labelZh: "成功指标", labelEn: "Success Metrics", type: "textarea", required: true },
      { name: "revisionNotes", column: "revision_notes", labelZh: "修订说明", labelEn: "Revision Notes", type: "textarea", required: true }
    ]
  },
  {
    id: "strategy-runs",
    table: "strategy_runs",
    navLabelZh: "策略运行",
    navLabelEn: "Strategy Runs",
    descriptionZh: "记录每次策略筛选的输入范围、数据覆盖和最终摘要。",
    descriptionEn: "Record each strategy screening run, universe coverage, and final summary.",
    idPrefix: "SRUN",
    tableColumns: ["id", "strategy_id", "run_date", "status", "final_summary"],
    fields: [
      { name: "id", column: "id", labelZh: "运行 ID", labelEn: "Run ID", type: "text" },
      { name: "strategyId", column: "strategy_id", labelZh: "策略", labelEn: "Strategy", type: "text", required: true, reference: { table: "strategies", valueColumn: "id", labelColumns: ["name", "id"] } },
      { name: "strategyVersionId", column: "strategy_version_id", labelZh: "策略版本", labelEn: "Strategy Version", type: "text", reference: { table: "strategy_versions", valueColumn: "id", labelColumns: ["id", "version"], metadataColumns: ["strategy_id"] } },
      { name: "runDate", column: "run_date", labelZh: "运行日期", labelEn: "Run Date", type: "date", required: true },
      { name: "universeSummary", column: "universe_summary", labelZh: "候选范围摘要", labelEn: "Universe Summary", type: "textarea", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Completed", "Failed"], defaultValue: "Draft" },
      { name: "finalSummary", column: "final_summary", labelZh: "最终摘要", labelEn: "Final Summary", type: "textarea", required: true },
      { name: "createdAgentRunId", column: "created_agent_run_id", labelZh: "AI 运行 ID", labelEn: "AI Run", type: "text", reference: { table: "research_agent_runs", valueColumn: "id", labelColumns: ["id", "run_type"] } }
    ]
  },
  {
    id: "strategy-candidates",
    table: "strategy_candidates",
    navLabelZh: "候选卡片",
    navLabelEn: "Candidates",
    descriptionZh: "保存策略运行产生的候选标的、适配分、证据缺口、风险和下一步动作。",
    descriptionEn: "Store strategy candidates, fit scores, missing evidence, risks, and next actions.",
    idPrefix: "CAND",
    tableColumns: ["id", "strategy_run_id", "security_id", "fit_score", "next_action"],
    fields: [
      { name: "id", column: "id", labelZh: "候选 ID", labelEn: "Candidate ID", type: "text" },
      { name: "strategyRunId", column: "strategy_run_id", labelZh: "策略运行", labelEn: "Strategy Run", type: "text", required: true, reference: { table: "strategy_runs", valueColumn: "id", labelColumns: ["id", "run_date"], metadataColumns: ["strategy_id"] } },
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", required: true, reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "rank", column: "rank", labelZh: "排名", labelEn: "Rank", type: "number", required: true },
      { name: "fitScore", column: "fit_score", labelZh: "适配分", labelEn: "Fit Score", type: "number", required: true },
      { name: "recommendation", column: "recommendation", labelZh: "建议", labelEn: "Recommendation", type: "select", options: ["Observe", "CollectEvidence", "CreateThesis", "DraftDecision", "Skip"], defaultValue: "Observe" },
      { name: "matchedRules", column: "matched_rules", labelZh: "命中规则", labelEn: "Matched Rules", type: "textarea", required: true },
      { name: "missingEvidence", column: "missing_evidence", labelZh: "缺失证据", labelEn: "Missing Evidence", type: "textarea", required: true },
      { name: "riskFlags", column: "risk_flags", labelZh: "风险标记", labelEn: "Risk Flags", type: "textarea", required: true },
      { name: "nextAction", column: "next_action", labelZh: "下一步动作", labelEn: "Next Action", type: "textarea", required: true }
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
    calendar: { defaultColumn: "next_review_date" },
    tableColumns: ["id", "security_id", "strategy_type", "status", "version", "next_review_date"],
    fields: [
      { name: "id", column: "id", labelZh: "论点 ID", labelEn: "Thesis ID", type: "text" },
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", required: true, reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
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
      { name: "nextReviewDate", column: "next_review_date", labelZh: "下次复核日期", labelEn: "Next Review Date", type: "date", required: true },
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
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "strategyType", column: "strategy_type", labelZh: "策略", labelEn: "Strategy", type: "select", options: ["Core", "Active", "Trading", "Experimental"], defaultValue: "Active" },
      { name: "eventType", column: "event_type", labelZh: "事件类型", labelEn: "Event Type", type: "select", options: ["Earnings", "Dividend", "ShareholderMeeting", "Policy", "MacroData", "Review"], defaultValue: "Review" },
      { name: "expectedDate", column: "expected_date", labelZh: "预期日期", labelEn: "Expected Date", type: "date", required: true },
      { name: "importance", column: "importance", labelZh: "重要度", labelEn: "Importance", type: "select", options: ["High", "Medium", "Low"], defaultValue: "Medium" },
      { name: "variablesToCheck", column: "variables_to_check", labelZh: "检查变量", labelEn: "Variables", type: "tags", required: true },
      { name: "preEventAction", column: "pre_event_action", labelZh: "事件前行动", labelEn: "Pre Action", type: "text", required: true },
      { name: "postEventDeadline", column: "post_event_deadline", labelZh: "后续期限", labelEn: "Post Deadline", type: "text", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Pending", "Done", "Missed"], defaultValue: "Pending" },
      {
        name: "decisionId",
        column: "decision_id",
        labelZh: "决策单 ID",
        labelEn: "Decision ID",
        type: "text",
        reference: { table: "trade_decisions", valueColumn: "id", labelColumns: ["id", "security_id", "action"], metadataColumns: ["security_id", "thesis_id"] }
      }
    ]
  },
  {
    id: "review-sessions",
    table: "review_sessions",
    navLabelZh: "复盘会话",
    navLabelEn: "Review Sessions",
    descriptionZh: "记录按时间窗口、事件或策略触发的结构化复盘。",
    descriptionEn: "Record structured reviews triggered by a period, event, or strategy.",
    idPrefix: "REVW",
    tableColumns: ["id", "review_date", "scope", "trigger_reason", "status"],
    fields: [
      { name: "id", column: "id", labelZh: "复盘 ID", labelEn: "Review ID", type: "text" },
      { name: "reviewDate", column: "review_date", labelZh: "复盘日期", labelEn: "Review Date", type: "date", required: true },
      { name: "scope", column: "scope", labelZh: "复盘范围", labelEn: "Scope", type: "text", required: true },
      { name: "triggerReason", column: "trigger_reason", labelZh: "触发原因", labelEn: "Trigger Reason", type: "textarea", required: true },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["Draft", "Confirmed", "Closed"], defaultValue: "Draft" },
      { name: "summary", column: "summary", labelZh: "摘要", labelEn: "Summary", type: "textarea", required: true },
      { name: "createdAgentRunId", column: "created_agent_run_id", labelZh: "AI 运行 ID", labelEn: "AI Run", type: "text", reference: { table: "research_agent_runs", valueColumn: "id", labelColumns: ["id", "run_type"] } }
    ]
  },
  {
    id: "review-findings",
    table: "review_findings",
    navLabelZh: "复盘发现",
    navLabelEn: "Review Findings",
    descriptionZh: "把复盘结论结构化关联到策略、标的、论点或决策。",
    descriptionEn: "Link review findings to strategies, securities, theses, or decisions.",
    idPrefix: "FIND",
    tableColumns: ["id", "review_session_id", "finding_type", "severity", "next_action"],
    fields: [
      { name: "id", column: "id", labelZh: "发现 ID", labelEn: "Finding ID", type: "text" },
      { name: "reviewSessionId", column: "review_session_id", labelZh: "复盘会话", labelEn: "Review Session", type: "text", required: true, reference: { table: "review_sessions", valueColumn: "id", labelColumns: ["id", "scope"] } },
      { name: "findingType", column: "finding_type", labelZh: "发现类型", labelEn: "Finding Type", type: "select", options: ["Outcome", "Thesis", "Discipline", "Strategy", "DataGap"], defaultValue: "Outcome" },
      { name: "relatedSecurityId", column: "related_security_id", labelZh: "关联标的", labelEn: "Security", type: "text", reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "relatedStrategyId", column: "related_strategy_id", labelZh: "关联策略", labelEn: "Strategy", type: "text", reference: { table: "strategies", valueColumn: "id", labelColumns: ["name", "id"] } },
      { name: "relatedThesisId", column: "related_thesis_id", labelZh: "关联论点", labelEn: "Thesis", type: "text", reference: { table: "theses", valueColumn: "id", labelColumns: ["one_line_thesis", "id"], metadataColumns: ["security_id"] } },
      { name: "relatedDecisionId", column: "related_decision_id", labelZh: "关联决策", labelEn: "Decision", type: "text", reference: { table: "trade_decisions", valueColumn: "id", labelColumns: ["id", "security_id", "action"], metadataColumns: ["security_id", "thesis_id"] } },
      { name: "severity", column: "severity", labelZh: "级别", labelEn: "Severity", type: "select", options: ["Info", "Warning", "Critical"], defaultValue: "Info" },
      { name: "finding", column: "finding", labelZh: "发现", labelEn: "Finding", type: "textarea", required: true },
      { name: "nextAction", column: "next_action", labelZh: "下一步动作", labelEn: "Next Action", type: "textarea", required: true }
    ]
  },
  {
    id: "research-runs",
    table: "research_agent_runs",
    navLabelZh: "AI 运行记录",
    navLabelEn: "AI Runs",
    descriptionZh: "持久化策略运行、标的诊断和复盘会话的 AI/Agent 输入、摘要和状态。",
    descriptionEn: "Persist AI/agent runs for strategy screening, target diagnosis, and review sessions.",
    idPrefix: "AIRUN",
    tableColumns: ["id", "run_date", "run_type", "strategy_id", "security_id", "status"],
    fields: [
      { name: "id", column: "id", labelZh: "运行 ID", labelEn: "Run ID", type: "text" },
      { name: "runType", column: "run_type", labelZh: "运行类型", labelEn: "Run Type", type: "select", options: ["strategy-run", "target-diagnosis", "review-session"], defaultValue: "strategy-run" },
      { name: "runDate", column: "run_date", labelZh: "运行日期", labelEn: "Run Date", type: "date", required: true },
      { name: "securityId", column: "security_id", labelZh: "标的", labelEn: "Security", type: "text", reference: { table: "securities", valueColumn: "id", labelColumns: ["name"], metadataColumns: ["account_id", "currency"] } },
      { name: "strategyId", column: "strategy_id", labelZh: "策略", labelEn: "Strategy", type: "text", reference: { table: "strategies", valueColumn: "id", labelColumns: ["name", "id"] } },
      { name: "strategyVersionId", column: "strategy_version_id", labelZh: "策略版本", labelEn: "Strategy Version", type: "text", reference: { table: "strategy_versions", valueColumn: "id", labelColumns: ["id", "version"], metadataColumns: ["strategy_id"] } },
      { name: "reviewSessionId", column: "review_session_id", labelZh: "复盘会话", labelEn: "Review Session", type: "text", reference: { table: "review_sessions", valueColumn: "id", labelColumns: ["id", "scope"] } },
      { name: "question", column: "question", labelZh: "问题/范围", labelEn: "Question", type: "textarea", required: true },
      { name: "model", column: "model", labelZh: "模型", labelEn: "Model", type: "text", defaultValue: "local-structured-workflow" },
      { name: "status", column: "status", labelZh: "状态", labelEn: "Status", type: "select", options: ["draft", "completed", "failed"], defaultValue: "draft" },
      { name: "finalSummary", column: "final_summary", labelZh: "最终摘要", labelEn: "Final Summary", type: "textarea", required: true }
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
      {
        name: "decisionId",
        column: "decision_id",
        labelZh: "决策单 ID",
        labelEn: "Decision ID",
        type: "text",
        reference: { table: "trade_decisions", valueColumn: "id", labelColumns: ["id", "security_id", "action"], metadataColumns: ["security_id", "thesis_id"] }
      },
      {
        name: "transactionId",
        column: "transaction_id",
        labelZh: "交易 ID",
        labelEn: "Transaction ID",
        type: "text",
        reference: { table: "transactions", valueColumn: "id", labelColumns: ["id", "trade_date", "transaction_type"], metadataColumns: ["security_id", "account_id"] }
      },
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
  if (definition.id === "accounts") {
    return database.sqlite
      .prepare("SELECT rowid AS _rowid, * FROM accounts ORDER BY institution_name ASC, account_name ASC, currency ASC, rowid DESC")
      .all() as Row[];
  }

  return database.sqlite.prepare(`SELECT rowid AS _rowid, * FROM ${definition.table} ORDER BY rowid DESC`).all() as Row[];
}

export function buildModuleReferenceOptions(database: DatabaseContext, definition: ModuleDefinition): ModuleReferenceOptions {
  const referenceFields = definition.fields.filter((field) => field.reference);
  const tableReferences = [...new Map(referenceFields.map((field) => [field.reference!.table, field.reference!])).values()];
  const optionsByTable = new Map<string, ReferenceOption[]>();

  for (const reference of tableReferences) {
    const selectedColumns = [...new Set([reference.valueColumn, ...reference.labelColumns, ...(reference.metadataColumns ?? [])])];
    const rows = database.sqlite
      .prepare(`SELECT ${selectedColumns.join(", ")} FROM ${reference.table} ORDER BY rowid DESC`)
      .all() as Row[];

    optionsByTable.set(
      reference.table,
      rows.map((row) => {
        const value = String(row[reference.valueColumn]);
        const labelParts = reference.labelColumns
          .map((column) => row[column])
          .filter((part) => part !== null && part !== undefined && part !== "")
          .map(String);
        return {
          value,
          label: labelParts.length > 0 ? labelParts.join(" · ") : value,
          metadata: Object.fromEntries(
            (reference.metadataColumns ?? []).map((column) => [column, row[column] === null || row[column] === undefined ? "" : String(row[column])])
          )
        };
      })
    );
  }

  return Object.fromEntries(
    referenceFields.map((field) => [field.name, optionsByTable.get(field.reference!.table) ?? []])
  );
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

  if (field.type === "tags" || field.type === "multi-select") {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return JSON.stringify(String(value).split(",").map((item) => item.trim()).filter(Boolean));
  }

  return String(value);
}

function validateSelectFields(definition: ModuleDefinition, row: Row): void {
  for (const field of definition.fields) {
    if (field.type !== "select" && field.type !== "multi-select") {
      continue;
    }

    const value = row[field.column];
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const parentField = field.dependsOn ? definition.fields.find((candidate) => candidate.name === field.dependsOn) : undefined;
    const options = parentField && field.optionGroups ? field.optionGroups[String(row[parentField.column])] ?? [] : field.options ?? [];

    const values =
      field.type === "multi-select"
        ? typeof value === "string" && value.startsWith("[")
          ? (JSON.parse(value) as string[])
          : String(value).split(",").map((item) => item.trim()).filter(Boolean)
        : [String(value)];

    for (const item of values) {
      if (!options.includes(item)) {
        throw new Error(`Invalid option ${item} for ${field.column}`);
      }
    }
  }
}

function validateReferenceFields(database: DatabaseContext, definition: ModuleDefinition, row: Row): void {
  for (const field of definition.fields) {
    if (!field.reference) {
      continue;
    }

    const value = row[field.column];
    if (value === null || value === undefined || value === "") {
      if (field.required) {
        throw new Error(`Missing required reference ${field.column}`);
      }
      continue;
    }

    const exists = database.sqlite
      .prepare(`SELECT 1 FROM ${field.reference.table} WHERE ${field.reference.valueColumn} = ? LIMIT 1`)
      .get(String(value));
    if (!exists) {
      throw new Error(`Invalid reference ${field.column}: ${String(value)}`);
    }
  }
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
    try {
      return (JSON.parse(value) as string[]).map(String);
    } catch {
      return [];
    }
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateAccountMarketCapability(database: DatabaseContext, definition: ModuleDefinition, row: Row): void {
  if (definition.id !== "securities" || !row.account_id || !row.market) {
    return;
  }

  const account = database.sqlite
    .prepare("SELECT supported_markets FROM accounts WHERE id = ?")
    .get(String(row.account_id)) as { supported_markets: string } | undefined;
  const supportedMarkets = parseJsonArray(account?.supported_markets);

  if (!supportedMarkets.includes(String(row.market))) {
    throw new Error(`market ${String(row.market)} is not included in account supported_markets`);
  }
}

function sanitizeIdPart(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "UNKNOWN";
}

function assetTypeCode(value: unknown): string {
  const codes: Record<string, string> = {
    Stock: "STK",
    ETF: "ETF",
    ActiveFund: "FUND",
    Bond: "BOND",
    Gold: "GOLD",
    Cash: "CASH"
  };

  return codes[String(value)] ?? sanitizeIdPart(value);
}

function buildSecurityIdPrefix(row: Row): string {
  return `SEC-${sanitizeIdPart(row.account_id)}-${assetTypeCode(row.asset_type)}`;
}

function applyDerivedFields(definition: ModuleDefinition, row: Row): void {
  if (definition.id === "accounts") {
    if (!row.account_name) {
      row.account_name = row.institution_name;
    }

    const rawMarkets = row.supported_markets;
    const supportedMarkets = parseJsonArray(rawMarkets);
    if (supportedMarkets.length === 0) {
      throw new Error("supported_markets requires at least one market");
    }
    row.supported_markets = JSON.stringify([...new Set(supportedMarkets)]);
    row.market = supportedMarkets[0] ?? row.market ?? "A-Share";
  }

  if (definition.id === "securities") {
    row.lockup_days = normalizeLockupDays(row.asset_type, row.lockup_days);
    row.liquidity_level = deriveLiquidityLevel(row.asset_type, row.lockup_days);
  }

  if (definition.id === "transactions") {
    const quantity = Number(row.quantity ?? 0);
    const unitPrice = Number(row.unit_price ?? 0);
    const commission = Number(row.commission ?? 0);
    const tax = Number(row.tax ?? 0);
    const otherFees = Number(row.other_fees ?? 0);
    const fxRate = Number(row.fx_rate ?? 1) || 1;
    const grossAmount = quantity * unitPrice;
    const totalFees = commission + tax + otherFees;
    const proceedsTypes = new Set(["Sell", "Redeem", "TransferOut"]);
    const originalAmount = proceedsTypes.has(String(row.transaction_type)) ? grossAmount - totalFees : grossAmount + totalFees;

    row.gross_amount = Number(grossAmount.toFixed(4));
    row.base_currency_amount = Number((originalAmount * fxRate).toFixed(4));
  }

  if (definition.id === "cashflows") {
    const amount = Math.abs(Number(row.amount ?? 0));
    const submittedFxRate = Number(row.fx_rate);
    const submittedBaseAmount = Math.abs(Number(row.base_currency_amount));
    const hasFxRate = Number.isFinite(submittedFxRate) && submittedFxRate > 0;
    const hasBaseAmount = Number.isFinite(submittedBaseAmount) && submittedBaseAmount > 0;
    const derivedFxRate = amount > 0 && hasBaseAmount ? submittedBaseAmount / amount : 1;
    const baseFromFxRate = amount * (hasFxRate ? submittedFxRate : derivedFxRate);
    const relativeBaseDelta =
      hasBaseAmount && amount > 0 ? Math.abs(baseFromFxRate - submittedBaseAmount) / Math.max(submittedBaseAmount, 1) : Number.POSITIVE_INFINITY;
    const shouldPreserveSubmittedBase = hasBaseAmount && amount > 0 && (!hasFxRate || relativeBaseDelta <= 0.0001);
    const fxRate = shouldPreserveSubmittedBase ? derivedFxRate : hasFxRate ? submittedFxRate : 1;
    const baseAmount = shouldPreserveSubmittedBase ? submittedBaseAmount : amount * fxRate;
    const externalTypes = new Set(["Deposit", "Withdrawal"]);
    const incomeTypes = new Set(["Dividend", "Interest"]);

    row.amount = Number(amount.toFixed(4));
    row.fx_rate = Number(fxRate.toFixed(10));
    row.base_currency_amount = Number(baseAmount.toFixed(4));
    row.is_external = externalTypes.has(String(row.cashflow_type)) ? 1 : 0;
    row.is_investment_income = incomeTypes.has(String(row.cashflow_type)) ? 1 : 0;
  }
}

function nextUnusedBusinessId(database: DatabaseContext, table: string, prefix: string): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const id = nextBusinessId(database, prefix);
    const exists = database.sqlite.prepare(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`).get(id);
    if (!exists) {
      return id;
    }
  }

  throw new Error(`Unable to generate unused id for ${table}`);
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
    row.id = nextUnusedBusinessId(database, definition.table, definition.idPrefix);
  }
  if (definition.id === "securities" && idField && !row.id) {
    row.id = nextUnusedBusinessId(database, definition.table, buildSecurityIdPrefix(row));
  }

  applyDerivedFields(definition, row);
  validateSelectFields(definition, row);
  validateReferenceFields(database, definition, row);
  validateAccountMarketCapability(database, definition, row);

  const columns = Object.keys(row).filter((column) => row[column] !== undefined);
  const statement = database.sqlite.prepare(
    `INSERT INTO ${definition.table} (${columns.join(", ")}) VALUES (${columns.map((column) => `@${column}`).join(", ")})`
  );
  statement.run(row);
  return row;
}

export function updateModuleRecord(database: DatabaseContext, moduleId: string, rowId: number, values: Record<string, unknown>): Row {
  const definition = findModuleDefinition(moduleId);
  if (!definition) {
    throw new Error(`Unknown module ${moduleId}`);
  }

  if (!Number.isFinite(rowId)) {
    throw new Error("Missing record identifier");
  }

  const existing = database.sqlite
    .prepare(`SELECT rowid AS _rowid, * FROM ${definition.table} WHERE rowid = ?`)
    .get(rowId) as Row | undefined;

  if (!existing) {
    throw new Error("Record not found");
  }

  if (!isModuleRowEditable(definition, existing)) {
    throw new Error("Settled or corrected transactions cannot be edited directly. Create a correction record instead.");
  }

  const updatedValues: Row = {};
  for (const field of definition.fields) {
    if (isFieldReadOnlyOnEdit(field)) {
      continue;
    }

    const value = values[field.name] ?? existing[field.column];
    updatedValues[field.column] = coerceValue(field, value);
  }

  const candidateRow = { ...existing, ...updatedValues };
  applyDerivedFields(definition, candidateRow);
  for (const [column, value] of Object.entries(candidateRow)) {
    if (column in updatedValues || (definition.id === "accounts" && column === "market")) {
      updatedValues[column] = value;
    }
  }
  validateSelectFields(definition, candidateRow);
  validateReferenceFields(database, definition, candidateRow);
  validateAccountMarketCapability(database, definition, candidateRow);

  const columns = Object.keys(updatedValues);
  if (columns.length === 0) {
    throw new Error("No editable fields for this module");
  }

  database.sqlite
    .prepare(`UPDATE ${definition.table} SET ${columns.map((column) => `${column} = @${column}`).join(", ")} WHERE rowid = @rowId`)
    .run({ ...updatedValues, rowId });

  return database.sqlite.prepare(`SELECT rowid AS _rowid, * FROM ${definition.table} WHERE rowid = ?`).get(rowId) as Row;
}
