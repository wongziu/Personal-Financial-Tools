import OpenCC from "opencc-js";

export type Language = "zh-CN" | "zh-TW" | "en-US";

export const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "en-US", label: "English" }
];

export interface Dictionary {
  appName: string;
  dashboard: string;
  tradeDecisions: string;
  export: string;
  newRecord: string;
  save: string;
  cancel: string;
  search: string;
  noRecords: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  metrics: string;
  riskWarnings: string;
  recentDecisions: string;
  pendingExceptions: string;
  reviewEvents: string;
  downloadWorkbook: string;
  createDecision: string;
  riskCheck: string;
  submitDecision: string;
  formSaved: string;
  formError: string;
  portfolioNetValue: string;
  cashValue: string;
  largestHolding: string;
  maxTheme: string;
  records: string;
  holdingsAndNav: string;
  holdingsAndNavDescription: string;
  weakRiskDescription: string;
  exportDescription: string;
  exportWorkbookDescription: string;
}

const simplifiedToTraditional = OpenCC.Converter({ from: "cn", to: "tw" });

const zhCN: Dictionary = {
  appName: "投资决策系统",
  dashboard: "仪表盘",
  tradeDecisions: "交易决策",
  export: "导出",
  newRecord: "新建记录",
  save: "保存",
  cancel: "取消",
  search: "筛选",
  noRecords: "暂无记录",
  language: "语言",
  theme: "主题",
  light: "浅色",
  dark: "深色",
  metrics: "关键指标",
  riskWarnings: "风险警告",
  recentDecisions: "最近决策",
  pendingExceptions: "待处理例外",
  reviewEvents: "待复核事件",
  downloadWorkbook: "下载 Excel 工作簿",
  createDecision: "新建交易决策",
  riskCheck: "风险校验",
  submitDecision: "提交决策",
  formSaved: "记录已保存",
  formError: "保存失败",
  portfolioNetValue: "组合净值",
  cashValue: "现金价值",
  largestHolding: "最大持仓",
  maxTheme: "最大主题暴露",
  records: "条记录",
  holdingsAndNav: "持仓与净值",
  holdingsAndNavDescription: "由已结算交易、手动价格和汇率计算。",
  weakRiskDescription: "弱提示；允许执行，但硬限制会生成审计草稿。",
  exportDescription: "将 V1 所有模块导出为一个包含多个 sheet 的工作簿。",
  exportWorkbookDescription: "账户、标的、交易、现金流、价格、汇率、信息来源、论点、事件、决策、风险规则和例外。"
};

const enUS: Dictionary = {
  appName: "Investment Decision System",
  dashboard: "Dashboard",
  tradeDecisions: "Trade Decisions",
  export: "Export",
  newRecord: "New Record",
  save: "Save",
  cancel: "Cancel",
  search: "Filter",
  noRecords: "No records",
  language: "Language",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  metrics: "Key Metrics",
  riskWarnings: "Risk Warnings",
  recentDecisions: "Recent Decisions",
  pendingExceptions: "Pending Exceptions",
  reviewEvents: "Review Events",
  downloadWorkbook: "Download Excel Workbook",
  createDecision: "Create Trade Decision",
  riskCheck: "Risk Check",
  submitDecision: "Submit Decision",
  formSaved: "Record saved",
  formError: "Save failed",
  portfolioNetValue: "Portfolio Net Value",
  cashValue: "Cash Value",
  largestHolding: "Largest Holding",
  maxTheme: "Max Theme Exposure",
  records: "records",
  holdingsAndNav: "Holdings & NAV",
  holdingsAndNavDescription: "Calculated from settled trades, manual prices, and FX rates.",
  weakRiskDescription: "Weak warnings; execution is allowed, with hard limits creating audit drafts.",
  exportDescription: "Export all V1 modules into one workbook with multiple sheets.",
  exportWorkbookDescription:
    "Accounts, securities, transactions, cashflows, prices, FX, sources, theses, events, decisions, risk rules, and exceptions."
};

const zhTW = Object.fromEntries(
  Object.entries(zhCN).map(([key, value]) => [key, simplifiedToTraditional(value)])
) as unknown as Dictionary;

export const dictionaries: Record<Language, Dictionary> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en-US": enUS
};

const tableColumns: Record<string, Record<string, { zh: string; en: string }>> = {
  accounts: {
    id: { zh: "账户 ID", en: "Account ID" },
    institution_name: { zh: "机构名称", en: "Institution" },
    account_type: { zh: "账户类型", en: "Account Type" },
    market: { zh: "市场", en: "Market" },
    currency: { zh: "币种", en: "Currency" },
    include_in_net_worth: { zh: "纳入净值", en: "Included in NAV" }
  },
  securities: {
    id: { zh: "标的 ID", en: "Security ID" },
    name: { zh: "标的名称", en: "Security Name" },
    ticker: { zh: "交易代码", en: "Ticker" },
    asset_type: { zh: "资产类型", en: "Asset Type" },
    market: { zh: "市场", en: "Market" },
    currency: { zh: "交易币种", en: "Currency" },
    investment_status: { zh: "投资状态", en: "Investment Status" }
  },
  transactions: {
    id: { zh: "交易 ID", en: "Transaction ID" },
    trade_date: { zh: "成交日期", en: "Trade Date" },
    account_id: { zh: "账户 ID", en: "Account ID" },
    security_id: { zh: "标的 ID", en: "Security ID" },
    transaction_type: { zh: "操作类型", en: "Transaction Type" },
    quantity: { zh: "数量", en: "Quantity" },
    base_currency_amount: { zh: "基准货币金额", en: "Base Amount" },
    status: { zh: "状态", en: "Status" }
  },
  cashflows: {
    id: { zh: "现金流 ID", en: "Cashflow ID" },
    cashflow_date: { zh: "日期", en: "Date" },
    account_id: { zh: "账户 ID", en: "Account ID" },
    cashflow_type: { zh: "类型", en: "Type" },
    amount: { zh: "金额", en: "Amount" },
    currency: { zh: "币种", en: "Currency" },
    is_external: { zh: "外部现金流", en: "External Cashflow" }
  },
  market_prices: {
    price_date: { zh: "日期", en: "Date" },
    security_id: { zh: "标的 ID", en: "Security ID" },
    close_price: { zh: "收盘价", en: "Close Price" },
    currency: { zh: "币种", en: "Currency" },
    source: { zh: "来源", en: "Source" }
  },
  fx_rates: {
    rate_date: { zh: "日期", en: "Date" },
    from_currency: { zh: "原币", en: "From Currency" },
    to_currency: { zh: "目标币种", en: "To Currency" },
    rate: { zh: "汇率", en: "Rate" },
    source: { zh: "来源", en: "Source" }
  },
  information_sources: {
    id: { zh: "信息 ID", en: "Source ID" },
    information_date: { zh: "信息日期", en: "Information Date" },
    security_id: { zh: "标的 ID", en: "Security ID" },
    evidence_level: { zh: "证据等级", en: "Evidence Level" },
    source_name: { zh: "来源名称", en: "Source Name" },
    thesis_impact: { zh: "论点影响", en: "Thesis Impact" }
  },
  theses: {
    id: { zh: "论点 ID", en: "Thesis ID" },
    security_id: { zh: "标的 ID", en: "Security ID" },
    strategy_type: { zh: "策略类型", en: "Strategy" },
    status: { zh: "状态", en: "Status" },
    version: { zh: "版本", en: "Version" },
    next_review_date: { zh: "下次复核日期", en: "Next Review Date" }
  },
  review_events: {
    id: { zh: "事件 ID", en: "Event ID" },
    expected_date: { zh: "预期日期", en: "Expected Date" },
    security_id: { zh: "标的 ID", en: "Security ID" },
    event_type: { zh: "事件类型", en: "Event Type" },
    importance: { zh: "重要度", en: "Importance" },
    status: { zh: "状态", en: "Status" }
  },
  trade_decisions: {
    id: { zh: "决策单 ID", en: "Decision ID" },
    decision_time: { zh: "决策时间", en: "Decision Time" },
    security_id: { zh: "标的 ID", en: "Security ID" },
    action: { zh: "操作", en: "Action" },
    post_trade_weight: { zh: "交易后仓位", en: "Post-trade Weight" },
    final_decision: { zh: "最终决策", en: "Final Decision" },
    status: { zh: "状态", en: "Status" },
    thesis_id: { zh: "论点 ID", en: "Thesis ID" },
    strategy_type: { zh: "策略类型", en: "Strategy" },
    current_price: { zh: "当前价格", en: "Current Price" },
    planned_amount_base: { zh: "计划金额 CNY", en: "Planned Amount CNY" },
    planned_price_min: { zh: "计划最低价", en: "Price Min" },
    planned_price_max: { zh: "计划最高价", en: "Price Max" },
    pre_trade_weight: { zh: "交易前仓位", en: "Pre-trade Weight" },
    max_allowed_weight: { zh: "最大允许仓位", en: "Max Allowed" },
    similar_theme_exposure: { zh: "同主题暴露", en: "Theme Exposure" },
    trigger: { zh: "触发因素", en: "Trigger" },
    expected_return_source: { zh: "收益来源", en: "Return Source" },
    downside_loss_base: { zh: "悲观损失", en: "Downside Loss" },
    emotion_tag: { zh: "情绪标签", en: "Emotion" },
    source_ids: { zh: "信息来源 ID", en: "Source IDs" },
    main_risks: { zh: "主要风险", en: "Main Risks" },
    stop_loss_or_invalidation: { zh: "止损/失效处理", en: "Stop Loss / Invalidation" }
  },
  risk_rules: {
    code: { zh: "规则代码", en: "Code" },
    label: { zh: "规则名称", en: "Label" },
    threshold: { zh: "阈值", en: "Threshold" },
    severity: { zh: "级别", en: "Severity" },
    enabled: { zh: "启用", en: "Enabled" }
  },
  exceptions: {
    id: { zh: "记录 ID", en: "Record ID" },
    exception_date: { zh: "日期", en: "Date" },
    exception_type: { zh: "类型", en: "Type" },
    related_rule: { zh: "涉及规则", en: "Related Rule" },
    status: { zh: "状态", en: "Status" },
    decision_id: { zh: "决策单 ID", en: "Decision ID" }
  },
  dashboard_positions: {
    security: { zh: "标的", en: "Security" },
    strategy: { zh: "策略", en: "Strategy" },
    quantity: { zh: "数量", en: "Quantity" },
    market_value: { zh: "市值", en: "Market Value" },
    weight: { zh: "权重", en: "Weight" }
  }
};

const fieldHelp: Record<string, { zh: string; en: string }> = {
  id: {
    zh: "系统内唯一标识。若该模块支持自动编号，留空保存时会自动生成。",
    en: "Unique internal identifier. Leave it blank when this module supports automatic ID generation."
  },
  institution_name: {
    zh: "开户券商、银行、基金平台或其他资金托管机构名称。",
    en: "Broker, bank, fund platform, or other custody institution name."
  },
  account_type: {
    zh: "用于区分现金账户、融资账户、基金账户、银行现金等账户类型。",
    en: "Classifies cash, margin, fund, bank cash, or other account types."
  },
  market: {
    zh: "该账户或标的主要交易的市场，用于后续查询、分类和风险汇总。",
    en: "Primary trading market, used for filtering, classification, and risk aggregation."
  },
  currency: {
    zh: "原始交易或计价币种。非 CNY 金额会按录入汇率折算为基准货币。",
    en: "Original transaction or quote currency. Non-CNY amounts are converted by the entered FX rate."
  },
  allow_margin_or_derivatives: {
    zh: "标记该账户是否允许融资、融券或衍生品交易，用于风险识别。",
    en: "Marks whether the account allows margin, shorting, or derivatives for risk review."
  },
  include_in_net_worth: {
    zh: "开启后，该账户资产会纳入组合净值、现金和持仓统计。",
    en: "When enabled, this account is included in portfolio NAV, cash, and holding calculations."
  },
  initial_entry_date: {
    zh: "该账户首次纳入系统管理的日期。",
    en: "Date when this account was first added to the system."
  },
  data_update_method: {
    zh: "记录该账户数据的维护方式，例如手工录入、券商导出或 API。",
    en: "How account data is maintained, such as manual entry, broker export, or API."
  },
  notes: {
    zh: "补充记录无法结构化归类的信息，便于后续追溯。",
    en: "Additional context that does not fit structured fields."
  },
  name: {
    zh: "标的或记录的显示名称，建议使用全称或系统内统一名称。",
    en: "Display name for the security or record; prefer a full or standardized name."
  },
  ticker: {
    zh: "交易代码或基金代码。请按交易市场的通用代码填写。",
    en: "Exchange ticker or fund code; use the market-standard identifier."
  },
  asset_type: {
    zh: "标的资产类别，会影响持仓分类、统计口径和风险展示。",
    en: "Asset class used for holding classification, reporting, and risk views."
  },
  industry_level_1: {
    zh: "一级行业分类，用于组合行业暴露和查询筛选。",
    en: "Top-level industry classification for exposure analysis and filtering."
  },
  industry_level_2: {
    zh: "二级行业分类，用于更细粒度的行业暴露和查询筛选。",
    en: "Second-level industry classification for more granular exposure analysis."
  },
  risk_theme_tags: {
    zh: "风险主题标签，多个标签用逗号分隔，例如 AI Capex, USD。",
    en: "Risk theme tags separated by commas, for example AI Capex, USD."
  },
  liquidity_level: {
    zh: "对标的流动性的主观分级，用于交易前风险判断。",
    en: "Subjective liquidity tier used for pre-trade risk judgment."
  },
  investment_status: {
    zh: "控制标的是否允许进入交易决策；禁止状态应避免新增买入。",
    en: "Controls whether the security can enter trade decisions; prohibited names should avoid new buys."
  },
  benchmark: {
    zh: "用于对照表现或风险暴露的基准，例如指数、基金业绩基准或现金利率。",
    en: "Benchmark for performance or risk comparison, such as an index, fund benchmark, or cash rate."
  },
  fee_note: {
    zh: "记录申赎费、交易费、管理费等会影响净收益的费用规则。",
    en: "Fee rules that affect net returns, such as subscription, trading, or management fees."
  },
  complexity: {
    zh: "标的复杂度。需要审批或禁止的标的应触发更严格的交易前检查。",
    en: "Security complexity. Approval-needed or prohibited names should trigger stricter pre-trade checks."
  },
  trade_date: {
    zh: "交易实际成交日期，是持仓、现金和净值计算的基础日期。",
    en: "Actual trade date used for holdings, cash, and NAV calculations."
  },
  trade_time: {
    zh: "交易实际成交时间，便于回看当时的市场环境。",
    en: "Actual execution time, useful for reviewing market context."
  },
  account_id: {
    zh: "关联账户 ID，用于定位资金来源、现金余额和账户维度统计。",
    en: "Linked account ID for cash source, balances, and account-level reporting."
  },
  security_id: {
    zh: "关联标的 ID，必须与标的库中的 ID 保持一致。",
    en: "Linked security ID; it should match an existing security record."
  },
  strategy_type: {
    zh: "交易或论点所属策略类型，用于区分核心、主动、交易和实验仓位。",
    en: "Strategy bucket for the trade or thesis: core, active, trading, or experimental."
  },
  thesis_id: {
    zh: "关联投资论点 ID，主动和实验交易建议填写。",
    en: "Linked thesis ID; recommended for active and experimental trades."
  },
  decision_id: {
    zh: "关联交易决策单 ID，用于把事实交易与事前决策闭环。",
    en: "Linked decision ID, connecting executed trades back to pre-trade decisions."
  },
  transaction_type: {
    zh: "交易方向或操作类型，会影响持仓数量、成本和现金余额。",
    en: "Trade direction or action type; affects quantity, cost, and cash balance."
  },
  quantity: {
    zh: "成交份额或股数。卖出或转出会减少持仓。",
    en: "Executed shares or units. Sells or transfers reduce holdings."
  },
  unit_price: {
    zh: "成交单价，按交易币种填写。",
    en: "Execution price per unit in the transaction currency."
  },
  gross_amount: {
    zh: "未扣费用前的成交总额，按交易币种填写。",
    en: "Gross trade amount before fees in the transaction currency."
  },
  commission: {
    zh: "券商佣金或交易手续费，按交易币种填写。",
    en: "Broker commission or trading fee in the transaction currency."
  },
  tax: {
    zh: "交易税费，按交易币种填写。",
    en: "Transaction taxes in the transaction currency."
  },
  other_fees: {
    zh: "其他与该笔交易直接相关的费用。",
    en: "Other fees directly related to this transaction."
  },
  fx_rate: {
    zh: "原币折算到基准货币 CNY 的汇率。",
    en: "FX rate from original currency to base currency CNY."
  },
  base_currency_amount: {
    zh: "折算为 CNY 后的金额，用于净值、现金和风控计算。",
    en: "Amount converted to CNY for NAV, cash, and risk calculations."
  },
  status: {
    zh: "记录当前状态。已结算交易不能直接修改，应通过更正记录修正。",
    en: "Current record status. Settled trades should be corrected through correction records."
  },
  data_source: {
    zh: "数据来源，例如手工录入、券商流水、对账单或内部计算。",
    en: "Data source, such as manual entry, broker statement, account statement, or internal calculation."
  },
  correction_of_id: {
    zh: "若该记录用于更正历史交易，填写被更正交易 ID。",
    en: "If this record corrects a prior trade, enter the corrected transaction ID."
  },
  cashflow_date: {
    zh: "现金流或公司行为发生日期。",
    en: "Date when the cashflow or corporate action occurred."
  },
  cashflow_type: {
    zh: "区分入金、出金、分红、利息、费用、拆股、配股或换汇等类型。",
    en: "Classifies deposits, withdrawals, dividends, interest, fees, splits, rights issues, or FX."
  },
  amount: {
    zh: "现金流原币金额。流入为正，流出为负或按类型规则处理。",
    en: "Cashflow amount in original currency. Inflows are positive; outflows follow type rules."
  },
  is_external: {
    zh: "标记是否来自组合外部资金变动，如入金或出金。",
    en: "Marks whether the movement comes from outside the portfolio, such as deposits or withdrawals."
  },
  is_investment_income: {
    zh: "标记该现金流是否计入投资收益，例如分红或利息。",
    en: "Marks whether the cashflow counts as investment income, such as dividends or interest."
  },
  price_date: {
    zh: "价格对应日期，用于按日期生成持仓和净值快照。",
    en: "Price date used for holding and NAV snapshots."
  },
  close_price: {
    zh: "收盘价、基金净值或估值价格，按标的交易币种填写。",
    en: "Closing price, fund NAV, or valuation price in the security currency."
  },
  source: {
    zh: "价格或汇率来源，便于后续核对。",
    en: "Price or FX source for later reconciliation."
  },
  rate_date: {
    zh: "汇率日期，应与交易、价格或快照日期匹配。",
    en: "FX date; align it with transaction, price, or snapshot dates."
  },
  from_currency: {
    zh: "汇率换算的原始币种。",
    en: "Source currency for the FX rate."
  },
  to_currency: {
    zh: "汇率换算的目标币种，V1 默认基准币种为 CNY。",
    en: "Target currency for the FX rate; V1 base currency defaults to CNY."
  },
  rate: {
    zh: "1 单位原币可折算的目标币种数量。",
    en: "Target-currency amount for 1 unit of source currency."
  },
  evidence_level: {
    zh: "证据强度等级。等级越高，越适合作为决策依据。",
    en: "Evidence strength. Higher levels are better suited for decision support."
  },
  source_name: {
    zh: "信息来源名称，例如公司公告、交易所文件、研报或新闻媒体。",
    en: "Source name, such as filing, exchange document, research report, or media outlet."
  },
  source_url: {
    zh: "原始链接。V1 只记录 URL 或文本，不上传附件。",
    en: "Original URL. V1 records URLs or text only and does not upload attachments."
  },
  key_facts: {
    zh: "从信息来源中提炼出的关键事实，避免只保存链接不保存结论。",
    en: "Key facts extracted from the source so the record is useful without reopening the link."
  },
  thesis_impact: {
    zh: "该信息对投资论点的影响：支持、削弱、无关或待判断。",
    en: "How the source affects the thesis: supports, weakens, irrelevant, or pending."
  },
  final_decision: {
    zh: "最终处理结果。选择执行且触及硬限制时，会生成事前例外草稿。",
    en: "Final action. Executing through a hard limit creates a pre-trade exception draft."
  },
  post_trade_weight: {
    zh: "计划成交后的组合权重，用于单一标的和主题暴露校验。",
    en: "Expected portfolio weight after the trade, used for position and theme exposure checks."
  },
  downside_loss_base: {
    zh: "悲观情景下可能损失金额，按 CNY 填写。",
    en: "Potential loss in the pessimistic scenario, entered in CNY."
  },
  main_risks: {
    zh: "本次交易最重要的风险点，建议写成可复核的事实或条件。",
    en: "Most important risks for this trade; write them as reviewable facts or conditions."
  },
  stop_loss_or_invalidation: {
    zh: "触发止损、暂停加仓或论点失效的条件。",
    en: "Conditions that trigger stop-loss, pause additions, or thesis invalidation."
  },
  threshold: {
    zh: "风控阈值。仓位类规则通常用小数表示，例如 0.10 代表 10%。",
    en: "Risk threshold. Position rules usually use decimals, for example 0.10 means 10%."
  },
  severity: {
    zh: "规则级别。硬限制被突破后执行交易会生成审计例外草稿。",
    en: "Rule severity. Executing through hard limits creates an audit exception draft."
  },
  enabled: {
    zh: "关闭后，该规则不参与交易决策风险校验。",
    en: "When disabled, the rule is excluded from trade decision checks."
  }
};

const enums: Record<string, { zh: string; en: string }> = {
  Allowed: { zh: "允许", en: "Allowed" },
  Watch: { zh: "观察", en: "Watch" },
  Prohibited: { zh: "禁止", en: "Prohibited" },
  Stock: { zh: "股票", en: "Stock" },
  ETF: { zh: "ETF", en: "ETF" },
  ActiveFund: { zh: "主动基金", en: "Active Fund" },
  Bond: { zh: "债券", en: "Bond" },
  Gold: { zh: "黄金", en: "Gold" },
  Cash: { zh: "现金", en: "Cash" },
  "A-Share": { zh: "A 股", en: "A-Share" },
  HK: { zh: "港股", en: "HK" },
  US: { zh: "美股", en: "US" },
  MutualFund: { zh: "场外基金", en: "Mutual Fund" },
  Core: { zh: "核心配置", en: "Core" },
  Active: { zh: "主动投资", en: "Active" },
  Trading: { zh: "交易", en: "Trading" },
  Experimental: { zh: "实验", en: "Experimental" },
  Draft: { zh: "草稿", en: "Draft" },
  Pending: { zh: "待处理", en: "Pending" },
  Settled: { zh: "已结算", en: "Settled" },
  Corrected: { zh: "已更正", en: "Corrected" },
  Submitted: { zh: "已提交", en: "Submitted" },
  Execute: { zh: "执行", en: "Execute" },
  Abandon: { zh: "放弃", en: "Abandon" },
  Delay: { zh: "延迟", en: "Delay" },
  Buy: { zh: "买入", en: "Buy" },
  Sell: { zh: "卖出", en: "Sell" },
  Add: { zh: "加仓", en: "Add" },
  Reduce: { zh: "减仓", en: "Reduce" },
  Exit: { zh: "清仓", en: "Exit" },
  NoAction: { zh: "不行动", en: "No Action" },
  High: { zh: "高", en: "High" },
  Medium: { zh: "中", en: "Medium" },
  Low: { zh: "低", en: "Low" },
  Warning: { zh: "预警", en: "Warning" },
  Hard: { zh: "硬限制", en: "Hard" },
  Open: { zh: "未关闭", en: "Open" },
  Closed: { zh: "已关闭", en: "Closed" },
  PreTradeException: { zh: "事前例外", en: "Pre-trade Exception" },
  PostTradeViolation: { zh: "事后违规", en: "Post-trade Violation" },
  DataError: { zh: "数据错误", en: "Data Error" },
  ProcessMiss: { zh: "流程遗漏", en: "Process Miss" },
  Filing: { zh: "财报/文件", en: "Filing" },
  Support: { zh: "支持", en: "Support" },
  Weaken: { zh: "削弱", en: "Weaken" },
  Irrelevant: { zh: "无关", en: "Irrelevant" },
  Earnings: { zh: "财报", en: "Earnings" },
  Review: { zh: "复核", en: "Review" },
  Calm: { zh: "平静", en: "Calm" },
  FOMO: { zh: "FOMO", en: "FOMO" },
  RevengeTrade: { zh: "报复性交易", en: "Revenge Trade" },
  Fear: { zh: "恐惧", en: "Fear" },
  RecoverLoss: { zh: "急于回本", en: "Recover Loss" },
  Other: { zh: "其他", en: "Other" },
  Simple: { zh: "简单", en: "Simple" },
  NeedsApproval: { zh: "需要审批", en: "Needs Approval" }
};

export function normalizeLanguage(value: unknown): Language {
  return value === "zh-TW" || value === "en-US" || value === "zh-CN" ? value : "zh-CN";
}

export function translateText(text: string, language: Language): string {
  if (language === "zh-TW") {
    return simplifiedToTraditional(text);
  }

  return text;
}

function translatePair(pair: { zh: string; en: string } | undefined, fallback: string, language: Language): string {
  if (!pair) {
    return language === "zh-TW" ? translateText(fallback, language) : fallback;
  }

  if (language === "en-US") {
    return pair.en;
  }

  return language === "zh-TW" ? translateText(pair.zh, language) : pair.zh;
}

export function translateColumn(table: string, column: string, language: Language): string {
  return translatePair(tableColumns[table]?.[column], column, language);
}

export function translateFieldHelp({
  column,
  labelZh,
  labelEn,
  language
}: {
  column: string;
  labelZh: string;
  labelEn: string;
  language: Language;
}): string {
  const fallback = {
    zh: `用于记录「${labelZh}」。保存前请确认口径一致，后续查询、持仓计算和风险校验会引用该字段。`,
    en: `Use this field to record ${labelEn}. Keep the definition consistent because later queries, holding calculations, and risk checks may use it.`
  };
  const help = fieldHelp[column] ?? fallback;

  if (language === "en-US") {
    return help.en;
  }

  return language === "zh-TW" ? translateText(help.zh, language) : help.zh;
}

export function translateColumnHelp(table: string, column: string, language: Language): string {
  const labelPair = tableColumns[table]?.[column];
  return translateFieldHelp({
    column,
    labelZh: labelPair?.zh ?? column,
    labelEn: labelPair?.en ?? column,
    language
  });
}

export function translateEnum(value: unknown, language: Language): string {
  if (typeof value !== "string") {
    return String(value);
  }

  return translatePair(enums[value], value, language);
}
