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
  asOfDate: string;
  cashValue: string;
  largestHolding: string;
  maxTheme: string;
  records: string;
  holdingsAndNav: string;
  holdingsAndNavDescription: string;
  weakRiskDescription: string;
  exportDescription: string;
  exportWorkbookDescription: string;
  totalRecords: string;
  visibleRecords: string;
  latestDate: string;
  dateRange: string;
  dateDimension: string;
  dateField: string;
  allDates: string;
  last30Days: string;
  selectedMonth: string;
  selectedDay: string;
  clearDateFilter: string;
  calendarActivity: string;
  noDateField: string;
  activeFilters: string;
  quickFx: string;
  latestRates: string;
  addQuickRate: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  source: string;
  asOf: string;
  manualQuickSet: string;
  saveRate: string;
  recordsOnDate: string;
  actions: string;
  edit: string;
  editRecord: string;
  recordUpdated: string;
  recordLocked: string;
  details: string;
  linkedAccount: string;
  securityDetail: string;
  relatedTransactions: string;
  priceRecords: string;
  priceQueue: string;
  priceQueueDescription: string;
  priceDate: string;
  savePrice: string;
  allPricesEntered: string;
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
  asOfDate: "数据日期",
  cashValue: "现金价值",
  largestHolding: "最大持仓",
  maxTheme: "最大主题暴露",
  records: "条记录",
  holdingsAndNav: "持仓与净值",
  holdingsAndNavDescription: "由已结算交易、手动价格和汇率计算。",
  weakRiskDescription: "弱提示；允许执行，但硬限制会生成审计草稿。",
  exportDescription: "将 V1 所有模块导出为一个包含多个 sheet 的工作簿。",
  exportWorkbookDescription: "账户、标的、交易、现金流、价格、汇率、信息来源、论点、事件、决策、风险规则和例外。",
  totalRecords: "总记录",
  visibleRecords: "当前显示",
  latestDate: "最新日期",
  dateRange: "日期范围",
  dateDimension: "日历维度",
  dateField: "日期字段",
  allDates: "全部日期",
  last30Days: "近 30 天",
  selectedMonth: "选定月份",
  selectedDay: "选定日期",
  clearDateFilter: "清除日期",
  calendarActivity: "日历活动",
  noDateField: "该页面没有日期字段",
  activeFilters: "当前筛选",
  quickFx: "汇率速查",
  latestRates: "最新汇率",
  addQuickRate: "快速设置汇率",
  fromCurrency: "原币",
  toCurrency: "目标币种",
  rate: "汇率",
  source: "来源",
  asOf: "截至",
  manualQuickSet: "手动快速设置",
  saveRate: "保存汇率",
  recordsOnDate: "条记录",
  actions: "操作",
  edit: "编辑",
  editRecord: "编辑记录",
  recordUpdated: "记录已更新",
  recordLocked: "锁定",
  details: "详情",
  linkedAccount: "关联账户",
  securityDetail: "标的详情",
  relatedTransactions: "关联交易流水",
  priceRecords: "价格记录",
  priceQueue: "待补价格",
  priceQueueDescription: "按日期列出需要录入价格的标的：关联账户纳入净值、投资状态为允许或观察、非现金资产且当日缺少价格。",
  priceDate: "补价日期",
  savePrice: "保存价格",
  allPricesEntered: "该日期暂无待补价格"
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
  asOfDate: "Data Date",
  cashValue: "Cash Value",
  largestHolding: "Largest Holding",
  maxTheme: "Max Theme Exposure",
  records: "records",
  holdingsAndNav: "Holdings & NAV",
  holdingsAndNavDescription: "Calculated from settled trades, manual prices, and FX rates.",
  weakRiskDescription: "Weak warnings; execution is allowed, with hard limits creating audit drafts.",
  exportDescription: "Export all V1 modules into one workbook with multiple sheets.",
  exportWorkbookDescription:
    "Accounts, securities, transactions, cashflows, prices, FX, sources, theses, events, decisions, risk rules, and exceptions.",
  totalRecords: "Total Records",
  visibleRecords: "Visible Records",
  latestDate: "Latest Date",
  dateRange: "Date Range",
  dateDimension: "Calendar Dimension",
  dateField: "Date Field",
  allDates: "All Dates",
  last30Days: "Last 30 Days",
  selectedMonth: "Selected Month",
  selectedDay: "Selected Day",
  clearDateFilter: "Clear Date",
  calendarActivity: "Calendar Activity",
  noDateField: "This page has no date field",
  activeFilters: "Active Filters",
  quickFx: "FX Quick View",
  latestRates: "Latest Rates",
  addQuickRate: "Quick Add Rate",
  fromCurrency: "From",
  toCurrency: "To",
  rate: "Rate",
  source: "Source",
  asOf: "As of",
  manualQuickSet: "Manual quick set",
  saveRate: "Save Rate",
  recordsOnDate: "records",
  actions: "Actions",
  edit: "Edit",
  editRecord: "Edit Record",
  recordUpdated: "Record updated",
  recordLocked: "Locked",
  details: "Details",
  linkedAccount: "Linked Account",
  securityDetail: "Security Detail",
  relatedTransactions: "Related Transactions",
  priceRecords: "Price Records",
  priceQueue: "Missing Prices",
  priceQueueDescription: "Shows securities that need prices on the selected date: linked NAV account, allowed or watch status, non-cash asset, and no price for the date.",
  priceDate: "Price Date",
  savePrice: "Save Price",
  allPricesEntered: "No missing prices for this date"
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
    supported_markets: { zh: "支持市场", en: "Supported Markets" },
    currency: { zh: "币种", en: "Currency" },
    include_in_net_worth: { zh: "纳入净值", en: "Included in NAV" }
  },
  securities: {
    id: { zh: "标的 ID", en: "Security ID" },
    account_id: { zh: "关联账户", en: "Linked Account" },
    name: { zh: "标的名称", en: "Security Name" },
    ticker: { zh: "交易代码", en: "Ticker" },
    asset_type: { zh: "资产类型", en: "Asset Type" },
    market: { zh: "市场", en: "Market" },
    currency: { zh: "交易币种", en: "Currency" },
    liquidity_level: { zh: "流动性", en: "Liquidity" },
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

const uiHelp: Record<string, { zh: string; en: string }> = {
  "dashboard.page": {
    zh: "集中查看组合净值、现金、持仓集中度、主题暴露、风险警告和待处理事项。",
    en: "Use this overview to monitor NAV, cash, concentration, theme exposure, warnings, and pending work."
  },
  "dashboard.portfolioNetValue": {
    zh: "组合内所有纳入净值账户的持仓市值和现金折算后的合计值。",
    en: "Total converted value of holdings and cash for accounts included in NAV."
  },
  "dashboard.asOfDate": {
    zh: "仪表盘计算采用的价格日期。系统会使用当前已录入价格中的最新日期重新计算。",
    en: "Price date used for dashboard calculations. The system recomputes from the latest entered market date."
  },
  "dashboard.cashValue": {
    zh: "按账户和币种汇总现金余额，再折算为基准货币后的金额。",
    en: "Cash balances grouped by account and currency, converted into the base currency."
  },
  "dashboard.largestHolding": {
    zh: "当前权重最高的单一标的，用于识别集中度风险。",
    en: "The single largest security by portfolio weight, used to spot concentration risk."
  },
  "dashboard.maxTheme": {
    zh: "当前暴露最高的风险主题，用于识别同类风险是否过度集中。",
    en: "The largest risk-theme exposure, used to spot crowding in related positions."
  },
  "dashboard.holdingsAndNav": {
    zh: "由已结算交易、价格和汇率推算出的持仓、估值和权重。",
    en: "Holdings, valuation, and weights derived from settled trades, prices, and FX rates."
  },
  "dashboard.riskWarnings": {
    zh: "根据风险规则计算的预警。硬限制突破后仍执行，会进入例外审计。",
    en: "Warnings calculated from risk rules. Executing through hard limits enters exception review."
  },
  "dashboard.pendingExceptions": {
    zh: "尚未关闭的事前例外或事后违规记录，需要后续补充原因和处理结果。",
    en: "Open pre-trade exceptions or post-trade violations that still need rationale and resolution."
  },
  "module.pageTitle": {
    zh: "该页面用于维护本模块的基础数据，保存后会进入查询、统计或风控计算。",
    en: "This page maintains module data used later in queries, reporting, or risk checks."
  },
  "module.newRecord": {
    zh: "新增一条本模块记录。带 ID 前缀的模块可留空 ID，由系统保存时生成。",
    en: "Create a module record. For prefixed modules, leave the ID blank and the system will generate it."
  },
  "module.totalRecords": {
    zh: "当前模块保存的全部记录数，不受搜索和日期筛选影响。",
    en: "All records stored in this module before search or date filtering."
  },
  "module.visibleRecords": {
    zh: "应用当前搜索和日期条件后，列表中实际显示的记录数。",
    en: "Records currently visible after applying search and date filters."
  },
  "module.latestDate": {
    zh: "当前日期维度下的最新记录日期，用于判断数据是否需要更新。",
    en: "Latest record date under the selected date dimension, useful for freshness checks."
  },
  "module.activeFilters": {
    zh: "当前正在生效的搜索或日期条件。清除后会恢复查看全部记录。",
    en: "The search or date condition currently applied. Clear it to view all records."
  },
  "module.dateDimension": {
    zh: "按选定日期字段查看记录分布，并可点击某一天快速筛选。",
    en: "View record distribution by a selected date field and click a day to filter quickly."
  },
  "module.dateField": {
    zh: "选择用于日历和日期筛选的字段，例如成交日期、价格日期或复核日期。",
    en: "Choose the field used by the calendar and date filters, such as trade, price, or review date."
  },
  "module.selectedMonth": {
    zh: "控制日历展示的月份；改变月份后会自动切换为按月筛选。",
    en: "Controls the displayed calendar month; changing it switches to month filtering."
  },
  "module.calendarActivity": {
    zh: "每个日期角标代表当天记录数，点击日期可只看当天数据。",
    en: "The badge on each date is the record count; click a date to show only that day's rows."
  },
  "module.table": {
    zh: "列表展示本模块最常用的查询字段，字段旁的问号说明该字段口径。",
    en: "The table shows common query fields; question marks explain each column's definition."
  },
  "module.search": {
    zh: "在当前模块记录中做全文筛选，适合按 ID、名称、状态或备注快速定位。",
    en: "Full-text filter within this module, useful for finding IDs, names, statuses, or notes."
  },
  "fx.quickFx": {
    zh: "快速查看最新有效汇率，也可以直接录入一条新的手动汇率。",
    en: "Quickly review latest available rates and enter a new manual FX rate."
  },
  "fx.latestRates": {
    zh: "每个币种对展示当前表内最新日期的汇率记录。",
    en: "Each currency pair shows the latest dated rate available in this table."
  },
  "fx.fromCurrency": {
    zh: "汇率换算的原始币种，例如 USD 表示 1 美元。",
    en: "Source currency for conversion, for example USD means 1 US dollar."
  },
  "fx.toCurrency": {
    zh: "汇率换算后的目标币种。V1 默认用 CNY 做基准币种。",
    en: "Target currency after conversion. V1 uses CNY as the default base currency."
  },
  "fx.rate": {
    zh: "1 单位原币可折算的目标币种数量，例如 USD 到 CNY 填 7.20。",
    en: "Target-currency amount for 1 source-currency unit, for example USD to CNY as 7.20."
  },
  "fx.rateDate": {
    zh: "该汇率适用的日期。交易和快照折算时应尽量使用同日汇率。",
    en: "Date the rate applies to. Trades and snapshots should use same-day rates when possible."
  },
  "fx.source": {
    zh: "记录汇率来源，便于之后核对或替换为正式数据。",
    en: "Source of the FX rate, used for later reconciliation or replacement."
  },
  "fx.saveRate": {
    zh: "保存后会新增一条汇率记录，并刷新当前汇率列表。",
    en: "Saving creates a new FX rate record and refreshes the current list."
  },
  "prices.queue": {
    zh: "价格表以日期和标的为维度。创建标的并关联纳入净值账户后，只要标的可投资且当日缺少价格，就会出现在这里。",
    en: "Prices are keyed by date and security. Once a security is linked to an included account, investable names without a same-day price appear here."
  },
  "tradeDecisions.page": {
    zh: "事前记录交易理由、预期仓位、悲观损失和风控结果，形成交易闭环。",
    en: "Record pre-trade rationale, expected weights, downside loss, and risk results for the trading loop."
  },
  "tradeDecisions.riskCheck": {
    zh: "提交时服务端会按风险规则校验；硬限制仍可执行，但会生成例外草稿。",
    en: "On submit, server rules run the risk check; hard limits can still execute but create exception drafts."
  },
  "export.page": {
    zh: "把当前 SQLite 中的 V1 数据导出为 Excel，多张表保存在同一个工作簿中。",
    en: "Export current V1 data from SQLite into one Excel workbook with multiple sheets."
  },
  "export.workbook": {
    zh: "下载的工作簿覆盖账户、标的、交易、现金流、价格、汇率、来源、论点、事件、决策、风险和例外。",
    en: "The workbook covers accounts, securities, trades, cashflows, prices, FX, sources, theses, events, decisions, risk, and exceptions."
  },
  "app.language": {
    zh: "切换界面语言。代码和数据字段保持英文，界面文案支持简体、繁体和英文。",
    en: "Switch display language. Code and data fields stay English while UI copy supports Simplified, Traditional, and English."
  },
  "accountCalendar.page": {
    zh: "账户日历不是账户主数据日历，而是账户每日净值和日盈亏的表现视图。所有数值按已结算交易、现金流、价格、汇率和校准净值实时重算。",
    en: "The account calendar is a daily performance view, not a master-data calendar. Values recompute from settled trades, cashflows, prices, FX, and NAV anchors."
  },
  "accountCalendar.dailyNav": {
    zh: "所选账户在最新数据日的账户净值。若该日有校准净值，则优先使用校准值。",
    en: "Account NAV on the latest data date. If a same-day anchor exists, the anchored NAV is used."
  },
  "accountCalendar.dailyPnl": {
    zh: "当日净值减前一日净值，再扣除当日外部现金流。入金和出金不计入投资盈亏。",
    en: "Current NAV minus prior-day NAV, excluding same-day external cashflow. Deposits and withdrawals are not investment P&L."
  },
  "accountCalendar.externalCashflow": {
    zh: "当日来自组合外部的资金变动，例如入金或出金，用于从日盈亏中剔除资金进出影响。",
    en: "Same-day capital movement from outside the portfolio, such as deposits or withdrawals, excluded from daily P&L."
  },
  "accountCalendar.anchoredDays": {
    zh: "所选范围内存在手工校准净值的账户日期数量，用于识别哪些日期已按对账单修正。",
    en: "Number of account-date rows with manual NAV anchors in the selected scope."
  },
  "accountCalendar.filters": {
    zh: "选择账户和月份后，日历和列表会基于已保存来源数据实时重算。",
    en: "Choose an account and month; the calendar and table recompute from saved source data."
  },
  "accountCalendar.accountFilter": {
    zh: "选择单一账户查看其每日净值和盈亏；全部账户会按日期合计。",
    en: "Choose one account for daily NAV/P&L, or all accounts for date-level totals."
  },
  "accountCalendar.month": {
    zh: "控制日历展示月份。该月份内没有来源数据的日期会显示为空。",
    en: "Controls the displayed calendar month. Dates without source data remain empty."
  },
  "accountCalendar.anchorForm": {
    zh: "录入某账户某日的对账净值。保存后同一账户同一日期会被更新，并触发账户日历重新计算。",
    en: "Enter reconciled NAV for one account on one date. Saving updates that account-date and triggers recomputation."
  },
  "accountCalendar.grid": {
    zh: "每个日期展示净值、日盈亏和校准状态。点击日期可筛选下方明细。",
    en: "Each day shows NAV, daily P&L, and anchor status. Click a day to filter the detail table."
  },
  "accountCalendar.dateColumn": {
    zh: "净值与盈亏归属的日期，按自然日计算。",
    en: "The calendar date to which NAV and P&L belong."
  },
  "accountCalendar.accountColumn": {
    zh: "该行所属账户。全部账户视图下仍保留账户级明细，便于定位问题。",
    en: "The account for this row. All-account view still keeps account-level detail for diagnosis."
  },
  "accountCalendar.navColumn": {
    zh: "账户当日净值，等于现金价值加持仓市值；若录入校准净值，则使用校准值。",
    en: "Daily account NAV: cash value plus holding market value; anchored NAV overrides computed NAV."
  },
  "accountCalendar.pnlColumn": {
    zh: "日盈亏 = 当日净值 - 前日净值 - 当日外部现金流。",
    en: "Daily P&L = current NAV - prior NAV - same-day external cashflow."
  },
  "accountCalendar.returnColumn": {
    zh: "日盈亏除以前一日净值。首日或前日净值为零时不展示。",
    en: "Daily P&L divided by prior-day NAV. Hidden when prior NAV is missing or zero."
  },
  "accountCalendar.cashflowColumn": {
    zh: "当日外部入金或出金，作为资金进出从投资盈亏中剔除。",
    en: "Same-day external deposit or withdrawal, excluded from investment P&L."
  },
  "accountCalendar.marketColumn": {
    zh: "当日持仓按最新可用价格和汇率折算的市值；缺少价格时暂按成本口径兜底。",
    en: "Holding value converted by latest available price and FX; falls back to cost when price is missing."
  },
  "accountCalendar.cashColumn": {
    zh: "由现金流和已结算交易推算出的账户现金价值，按基准货币展示。",
    en: "Account cash value derived from cashflows and settled trades, shown in base currency."
  },
  "accountCalendar.anchorColumn": {
    zh: "标记该日是否使用了手工校准净值。校准会影响当日及相邻日期的日盈亏。",
    en: "Marks whether a manual NAV anchor is used. Anchors affect same-day and adjacent daily P&L."
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
    zh: "兼容旧数据的默认市场。账户真实可交易范围以支持市场为准，标的市场仍由标的自身决定。",
    en: "Legacy default market. Account trading capability is defined by supported markets, while security market remains security-specific."
  },
  supported_markets: {
    zh: "该账户可交易或可录入的市场，可多选。后续标的、交易和账户表现会按实际标的市场统计。",
    en: "Markets this account can trade or record. Select multiple when applicable; reporting still uses each security's actual market."
  },
  industry_level_1: {
    zh: "一级行业使用系统约定枚举，便于跨 A 股、港股、美股和基金理财统一统计。",
    en: "Level-1 industry uses a system enum so A-shares, HK, US, funds, and wealth products can be aggregated consistently."
  },
  industry_level_2: {
    zh: "二级行业会跟随一级行业联动筛选，用于更细的行业暴露和复盘分析。",
    en: "Level-2 industry options are filtered by level-1 industry for exposure and review analysis."
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
  risk_theme_tags: {
    zh: "风险主题标签，多个标签用逗号分隔，例如 AI Capex, USD。",
    en: "Risk theme tags separated by commas, for example AI Capex, USD."
  },
  liquidity_level: {
    zh: "系统根据资产类型和锁定期自动判断。股票、ETF、黄金和现金默认为高流动性；主动基金和债券按锁定期计算。",
    en: "Calculated from asset type and lock-up days. Stocks, ETFs, gold, and cash default to high liquidity; active funds and bonds are derived from lock-up days."
  },
  lockup_days: {
    zh: "主动基金、债券和理财类标的需要填写锁定或最短持有天数；系统据此推导流动性。",
    en: "Enter lock-up or minimum holding days for active funds, bonds, and wealth products; the system derives liquidity from it."
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
    zh: "选择账户名称，用于定位资金来源、现金余额和账户维度统计。",
    en: "Choose the account name used for cash source, balances, and account-level reporting."
  },
  security_id: {
    zh: "选择标的名称；系统会自动保存对应的内部标识并保持账户关系正确。",
    en: "Choose the security name; the system stores the internal identifier and keeps account relationships consistent."
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
    zh: "现金流原币金额。按正数填写，系统按现金流类型判断方向。",
    en: "Cashflow amount in original currency. Enter a positive amount; the system derives direction from type."
  },
  is_external: {
    zh: "系统根据类型判断是否为组合外部资金变动；入金和出金会从日盈亏中剔除。",
    en: "Derived from type. Deposits and withdrawals are external capital flows excluded from daily P&L."
  },
  is_investment_income: {
    zh: "系统根据类型判断是否计入投资收益；V1 中分红和利息计入收益。",
    en: "Derived from type. In V1, dividends and interest count as investment income."
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
  cash: { zh: "现金", en: "Cash" },
  margin: { zh: "融资/保证金", en: "Margin" },
  fund: { zh: "基金/理财", en: "Fund / Wealth Management" },
  bank_cash: { zh: "银行现金", en: "Bank Cash" },
  pension: { zh: "养老金", en: "Pension" },
  Margin: { zh: "融资/保证金", en: "Margin" },
  Fund: { zh: "基金/理财", en: "Fund / Wealth Management" },
  BankCash: { zh: "银行现金", en: "Bank Cash" },
  Pension: { zh: "养老金", en: "Pension" },
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
  InformationTechnology: { zh: "信息技术", en: "Information Technology" },
  CommunicationServices: { zh: "通信服务", en: "Communication Services" },
  ConsumerDiscretionary: { zh: "可选消费", en: "Consumer Discretionary" },
  ConsumerStaples: { zh: "日常消费", en: "Consumer Staples" },
  HealthCare: { zh: "医疗保健", en: "Health Care" },
  Financials: { zh: "金融", en: "Financials" },
  Industrials: { zh: "工业", en: "Industrials" },
  Energy: { zh: "能源", en: "Energy" },
  Materials: { zh: "材料", en: "Materials" },
  Utilities: { zh: "公用事业", en: "Utilities" },
  RealEstate: { zh: "房地产", en: "Real Estate" },
  FixedIncome: { zh: "固定收益", en: "Fixed Income" },
  BroadMarket: { zh: "宽基指数", en: "Broad Market" },
  MultiAsset: { zh: "多资产", en: "Multi-Asset" },
  CashAndMoneyMarket: { zh: "现金及货币市场", en: "Cash & Money Market" },
  Unclassified: { zh: "待分类", en: "Unclassified" },
  OtherIndustry: { zh: "其他行业", en: "Other Industry" },
  Software: { zh: "软件", en: "Software" },
  Hardware: { zh: "硬件", en: "Hardware" },
  Semiconductors: { zh: "半导体", en: "Semiconductors" },
  ITServices: { zh: "IT 服务", en: "IT Services" },
  InternetPlatforms: { zh: "互联网平台", en: "Internet Platforms" },
  OtherTechnology: { zh: "其他科技", en: "Other Technology" },
  Telecom: { zh: "电信", en: "Telecom" },
  Media: { zh: "媒体", en: "Media" },
  Entertainment: { zh: "娱乐", en: "Entertainment" },
  InteractiveMedia: { zh: "互动媒体", en: "Interactive Media" },
  OtherCommunicationServices: { zh: "其他通信服务", en: "Other Communication Services" },
  Automobiles: { zh: "汽车", en: "Automobiles" },
  ConsumerDurables: { zh: "耐用消费品", en: "Consumer Durables" },
  DiscretionaryRetail: { zh: "可选零售", en: "Discretionary Retail" },
  TravelLeisure: { zh: "旅游休闲", en: "Travel & Leisure" },
  Restaurants: { zh: "餐饮", en: "Restaurants" },
  OtherDiscretionary: { zh: "其他可选消费", en: "Other Discretionary" },
  FoodBeverage: { zh: "食品饮料", en: "Food & Beverage" },
  HouseholdProducts: { zh: "家庭用品", en: "Household Products" },
  StaplesRetail: { zh: "必需消费零售", en: "Staples Retail" },
  Agriculture: { zh: "农业", en: "Agriculture" },
  OtherStaples: { zh: "其他日常消费", en: "Other Staples" },
  Pharmaceuticals: { zh: "制药", en: "Pharmaceuticals" },
  Biotechnology: { zh: "生物科技", en: "Biotechnology" },
  MedicalDevices: { zh: "医疗器械", en: "Medical Devices" },
  HealthCareServices: { zh: "医疗服务", en: "Health Care Services" },
  OtherHealthCare: { zh: "其他医疗", en: "Other Health Care" },
  Banks: { zh: "银行", en: "Banks" },
  Insurance: { zh: "保险", en: "Insurance" },
  Brokerage: { zh: "券商", en: "Brokerage" },
  AssetManagement: { zh: "资产管理", en: "Asset Management" },
  Fintech: { zh: "金融科技", en: "Fintech" },
  OtherFinancials: { zh: "其他金融", en: "Other Financials" },
  CapitalGoods: { zh: "资本品", en: "Capital Goods" },
  Transportation: { zh: "交通运输", en: "Transportation" },
  CommercialServices: { zh: "商业服务", en: "Commercial Services" },
  AerospaceDefense: { zh: "航空航天与国防", en: "Aerospace & Defense" },
  OtherIndustrials: { zh: "其他工业", en: "Other Industrials" },
  OilGas: { zh: "石油天然气", en: "Oil & Gas" },
  Renewables: { zh: "可再生能源", en: "Renewables" },
  EnergyEquipment: { zh: "能源设备", en: "Energy Equipment" },
  OtherEnergy: { zh: "其他能源", en: "Other Energy" },
  Chemicals: { zh: "化工", en: "Chemicals" },
  MetalsMining: { zh: "金属矿业", en: "Metals & Mining" },
  ConstructionMaterials: { zh: "建材", en: "Construction Materials" },
  PaperPackaging: { zh: "纸业包装", en: "Paper & Packaging" },
  OtherMaterials: { zh: "其他材料", en: "Other Materials" },
  ElectricUtilities: { zh: "电力公用事业", en: "Electric Utilities" },
  GasUtilities: { zh: "燃气公用事业", en: "Gas Utilities" },
  WaterUtilities: { zh: "水务公用事业", en: "Water Utilities" },
  PowerGeneration: { zh: "发电", en: "Power Generation" },
  OtherUtilities: { zh: "其他公用事业", en: "Other Utilities" },
  PropertyDevelopment: { zh: "地产开发", en: "Property Development" },
  REITs: { zh: "REITs", en: "REITs" },
  PropertyServices: { zh: "物业服务", en: "Property Services" },
  OtherRealEstate: { zh: "其他房地产", en: "Other Real Estate" },
  GovernmentBond: { zh: "政府债", en: "Government Bond" },
  CreditBond: { zh: "信用债", en: "Credit Bond" },
  BondFund: { zh: "债券基金", en: "Bond Fund" },
  BankWealthManagement: { zh: "银行理财", en: "Bank Wealth Management" },
  OtherFixedIncome: { zh: "其他固定收益", en: "Other Fixed Income" },
  BroadIndex: { zh: "宽基指数", en: "Broad Index" },
  IndexETF: { zh: "指数 ETF", en: "Index ETF" },
  OtherBroadMarket: { zh: "其他宽基", en: "Other Broad Market" },
  BalancedFund: { zh: "平衡型基金", en: "Balanced Fund" },
  FOF: { zh: "FOF", en: "FOF" },
  OtherMultiAsset: { zh: "其他多资产", en: "Other Multi-Asset" },
  CashSubIndustry: { zh: "现金", en: "Cash" },
  MoneyMarketFund: { zh: "货币基金", en: "Money Market Fund" },
  BankDeposit: { zh: "银行存款", en: "Bank Deposit" },
  OtherCash: { zh: "其他现金类", en: "Other Cash" },
  UnclassifiedSubIndustry: { zh: "待分类", en: "Unclassified" },
  OtherSubIndustry: { zh: "其他细分行业", en: "Other Sub-Industry" },
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
  Deposit: { zh: "入金", en: "Deposit" },
  Withdrawal: { zh: "出金", en: "Withdrawal" },
  Dividend: { zh: "分红", en: "Dividend" },
  Interest: { zh: "利息", en: "Interest" },
  Tax: { zh: "税费", en: "Tax" },
  ManagementFee: { zh: "管理费", en: "Management Fee" },
  MarginInterest: { zh: "融资利息", en: "Margin Interest" },
  Split: { zh: "拆股", en: "Split" },
  RightsIssue: { zh: "配股", en: "Rights Issue" },
  FX: { zh: "换汇", en: "FX" },
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

export function translateUiHelp(key: string, language: Language): string {
  const help = uiHelp[key];

  if (!help) {
    return language === "en-US" ? "Hover help for this area." : translateText("该区域的悬停说明。", language);
  }

  if (language === "en-US") {
    return help.en;
  }

  return language === "zh-TW" ? translateText(help.zh, language) : help.zh;
}

export function translateEnum(value: unknown, language: Language): string {
  if (typeof value !== "string") {
    return String(value);
  }

  return translatePair(enums[value], value, language);
}

export function translateBoolean(value: unknown, language: Language): string {
  const normalized = value === true || value === 1 || value === "1" || value === "true";

  if (language === "en-US") {
    return normalized ? "Yes" : "No";
  }

  return normalized ? "是" : "否";
}
