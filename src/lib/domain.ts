export type Currency = "CNY" | "HKD" | "USD";
export type Market = "A-Share" | "HK" | "US" | "MutualFund";
export type StrategyType = "Core" | "Active" | "Trading" | "Experimental";
export type TransactionType = "Buy" | "Sell" | "Subscribe" | "Redeem" | "TransferIn" | "TransferOut";
export type TransactionStatus = "Draft" | "Pending" | "Settled" | "Corrected";
export type CashflowType =
  | "Deposit"
  | "Withdrawal"
  | "Dividend"
  | "Interest"
  | "Tax"
  | "ManagementFee"
  | "MarginInterest"
  | "Split"
  | "RightsIssue"
  | "FX";

export type RuleSeverity = "Warning" | "Hard";

export interface TransactionInput {
  id: string;
  accountId: string;
  securityId: string;
  strategyType: StrategyType;
  transactionType: TransactionType;
  status: TransactionStatus;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  totalFees: number;
  baseCurrencyAmount: number;
  tradeDate: string;
}

export interface CashflowInput {
  id: string;
  accountId: string;
  securityId?: string | null;
  cashflowType: CashflowType;
  currency: Currency;
  amount: number;
  baseCurrencyAmount: number;
  isExternal: boolean;
  isInvestmentIncome: boolean;
  cashflowDate: string;
}

export interface Holding {
  accountId: string;
  securityId: string;
  strategyType: StrategyType;
  quantity: number;
  averageCost: number;
  totalCost: number;
  realizedProfit: number;
}

export interface MarketPriceInput {
  securityId: string;
  priceDate: string;
  closePrice: number;
  currency: Currency;
}

export interface FxRateInput {
  rateDate: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
}

export interface SecurityReference {
  id: string;
  riskThemeTags: string[];
  industryLevel1?: string | null;
}

export interface PositionSnapshot extends Holding {
  marketPrice: number;
  marketValueOriginal: number;
  marketValueBase: number;
  unrealizedProfit: number;
  weight: number;
}

export interface PortfolioSnapshot {
  asOfDate: string;
  portfolioNetValue: number;
  positions: PositionSnapshot[];
  cashValueBase: number;
  riskThemeWeights: Map<string, number>;
  industryWeights: Map<string, number>;
}

export interface RiskRuleInput {
  code: string;
  threshold: number;
  severity: RuleSeverity;
}

export interface TradeDecisionRiskInput {
  decisionId: string;
  securityId: string;
  strategyType: StrategyType;
  plannedAmountBase: number;
  portfolioNetValue: number;
  postTradeSecurityWeight: number;
  postTradeThemeWeights: Map<string, number>;
  rules: RiskRuleInput[];
}

export interface RiskWarning {
  ruleCode: string;
  severity: RuleSeverity;
  threshold: number;
  actual: number;
  message: string;
}

export interface RiskEvaluationResult {
  canExecute: boolean;
  requiresExceptionDraft: boolean;
  warnings: RiskWarning[];
}
