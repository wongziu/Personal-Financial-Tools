import type {
  CashflowInput,
  Currency,
  FxRateInput,
  Holding,
  MarketPriceInput,
  PortfolioSnapshot,
  SecurityReference,
  TransactionInput
} from "@/lib/domain";

function holdingKey(transaction: TransactionInput): string {
  return `${transaction.accountId}:${transaction.securityId}:${transaction.strategyType}`;
}

function cashKey(accountId: string, currency: Currency): string {
  return `${accountId}:${currency}`;
}

function signedCashflowAmount(cashflow: CashflowInput): number {
  switch (cashflow.cashflowType) {
    case "Withdrawal":
    case "Tax":
    case "ManagementFee":
    case "MarginInterest":
      return -Math.abs(cashflow.amount);
    default:
      return cashflow.amount;
  }
}

function signedBaseCashflowAmount(cashflow: CashflowInput): number {
  switch (cashflow.cashflowType) {
    case "Withdrawal":
    case "Tax":
    case "ManagementFee":
    case "MarginInterest":
      return -Math.abs(cashflow.baseCurrencyAmount);
    default:
      return cashflow.baseCurrencyAmount;
  }
}

function signedTradeCashAmount(transaction: TransactionInput): number {
  switch (transaction.transactionType) {
    case "Buy":
    case "Subscribe":
      return -Math.abs(transaction.baseCurrencyAmount);
    case "Sell":
    case "Redeem":
      return Math.abs(transaction.baseCurrencyAmount);
    default:
      return 0;
  }
}

export function calculateHoldings(transactions: TransactionInput[]): Holding[] {
  const states = new Map<string, Holding>();
  const sorted = [...transactions]
    .filter((transaction) => transaction.status === "Settled")
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.id.localeCompare(b.id));

  for (const transaction of sorted) {
    if (!["Buy", "Sell", "Subscribe", "Redeem"].includes(transaction.transactionType)) {
      continue;
    }

    const key = holdingKey(transaction);
    const current =
      states.get(key) ??
      ({
        accountId: transaction.accountId,
        securityId: transaction.securityId,
        strategyType: transaction.strategyType,
        quantity: 0,
        averageCost: 0,
        totalCost: 0,
        realizedProfit: 0
      } satisfies Holding);

    if (transaction.transactionType === "Buy" || transaction.transactionType === "Subscribe") {
      const newTotalCost = current.totalCost + Math.abs(transaction.baseCurrencyAmount);
      const newQuantity = current.quantity + transaction.quantity;
      states.set(key, {
        ...current,
        quantity: newQuantity,
        totalCost: newTotalCost,
        averageCost: newQuantity === 0 ? 0 : newTotalCost / newQuantity
      });
      continue;
    }

    const soldQuantity = Math.min(transaction.quantity, current.quantity);
    const costBasis = current.averageCost * soldQuantity;
    const proceeds = Math.abs(transaction.baseCurrencyAmount);
    const remainingQuantity = current.quantity - soldQuantity;
    const remainingCost = Math.max(0, current.totalCost - costBasis);

    states.set(key, {
      ...current,
      quantity: remainingQuantity,
      totalCost: remainingCost,
      averageCost: remainingQuantity === 0 ? 0 : remainingCost / remainingQuantity,
      realizedProfit: current.realizedProfit + (proceeds - costBasis)
    });
  }

  return [...states.values()].filter((holding) => holding.quantity > 0.000001);
}

export function calculateCashBalances(
  cashflows: CashflowInput[],
  transactions: TransactionInput[],
  baseCurrency: Currency = "CNY"
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const cashflow of cashflows) {
    const key = cashKey(cashflow.accountId, cashflow.currency);
    balances.set(key, (balances.get(key) ?? 0) + signedCashflowAmount(cashflow));
  }

  for (const transaction of transactions.filter((item) => item.status === "Settled")) {
    const key = cashKey(transaction.accountId, baseCurrency);
    balances.set(key, (balances.get(key) ?? 0) + signedTradeCashAmount(transaction));
  }

  return balances;
}

export function calculateBaseCashValue(cashflows: CashflowInput[], transactions: TransactionInput[]): number {
  return [...calculateBaseCashValueFallbacks(cashflows, transactions).values()].reduce((sum, value) => sum + value, 0);
}

export function calculateBaseCashValueFallbacks(
  cashflows: CashflowInput[],
  transactions: TransactionInput[],
  baseCurrency: Currency = "CNY"
): Map<string, number> {
  const fallbacks = new Map<string, number>();

  for (const cashflow of cashflows) {
    const key = cashKey(cashflow.accountId, cashflow.currency);
    fallbacks.set(key, (fallbacks.get(key) ?? 0) + signedBaseCashflowAmount(cashflow));
  }

  for (const transaction of transactions.filter((item) => item.status === "Settled")) {
    const key = cashKey(transaction.accountId, baseCurrency);
    fallbacks.set(key, (fallbacks.get(key) ?? 0) + signedTradeCashAmount(transaction));
  }

  return fallbacks;
}

function latestByDate<T>(items: T[], dateOf: (item: T) => string, asOfDate: string): T | undefined {
  return items
    .filter((item) => dateOf(item) <= asOfDate)
    .sort((a, b) => dateOf(b).localeCompare(dateOf(a)))[0];
}

function getFxRate(fxRates: FxRateInput[], fromCurrency: Currency, toCurrency: Currency, asOfDate: string): number {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const exact = latestByDate(
    fxRates.filter((rate) => rate.fromCurrency === fromCurrency && rate.toCurrency === toCurrency),
    (rate) => rate.rateDate,
    asOfDate
  );
  if (exact) {
    return exact.rate;
  }

  const inverse = latestByDate(
    fxRates.filter((rate) => rate.fromCurrency === toCurrency && rate.toCurrency === fromCurrency),
    (rate) => rate.rateDate,
    asOfDate
  );
  if (inverse) {
    return 1 / inverse.rate;
  }

  throw new Error(`Missing FX rate ${fromCurrency}/${toCurrency}`);
}

export function calculatePortfolioSnapshot(input: {
  asOfDate: string;
  holdings: Holding[];
  cashBalances: Map<string, number>;
  cashValueBaseOverride?: number;
  cashValueBaseFallbacks?: Map<string, number>;
  prices: MarketPriceInput[];
  fxRates: FxRateInput[];
  securities: SecurityReference[];
  baseCurrency?: Currency;
}): PortfolioSnapshot {
  const baseCurrency = input.baseCurrency ?? "CNY";
  const securityMap = new Map(input.securities.map((security) => [security.id, security]));
  const positions = input.holdings.map((holding) => {
    const costFallbackPosition = {
      ...holding,
      marketPrice: holding.averageCost,
      marketValueOriginal: holding.totalCost,
      marketValueBase: holding.totalCost,
      unrealizedProfit: 0,
      weight: 0
    };
    const price = latestByDate(
      input.prices.filter((item) => item.securityId === holding.securityId),
      (item) => item.priceDate,
      input.asOfDate
    );
    if (!price) {
      return costFallbackPosition;
    }

    const marketValueOriginal = holding.quantity * price.closePrice;
    let marketValueBase: number;
    try {
      marketValueBase = marketValueOriginal * getFxRate(input.fxRates, price.currency, baseCurrency, input.asOfDate);
    } catch {
      return {
        ...costFallbackPosition,
        marketPrice: price.closePrice,
        marketValueOriginal
      };
    }

    return {
      ...holding,
      marketPrice: price.closePrice,
      marketValueOriginal,
      marketValueBase,
      unrealizedProfit: marketValueBase - holding.totalCost,
      weight: 0
    };
  });

  const cashValueBase =
    input.cashValueBaseOverride ??
    [...input.cashBalances.entries()].reduce((sum, [key, amount]) => {
      const [, currency] = key.split(":") as [string, Currency];
      try {
        return sum + amount * getFxRate(input.fxRates, currency, baseCurrency, input.asOfDate);
      } catch (error) {
        const fallback = input.cashValueBaseFallbacks?.get(key);
        if (fallback !== undefined) {
          return sum + fallback;
        }
        throw error;
      }
    }, 0);
  const portfolioNetValue = positions.reduce((sum, position) => sum + position.marketValueBase, 0) + cashValueBase;
  const riskThemeWeights = new Map<string, number>();
  const industryWeights = new Map<string, number>();

  for (const position of positions) {
    position.weight = portfolioNetValue === 0 ? 0 : position.marketValueBase / portfolioNetValue;
    const security = securityMap.get(position.securityId);

    for (const theme of security?.riskThemeTags ?? []) {
      riskThemeWeights.set(theme, (riskThemeWeights.get(theme) ?? 0) + position.weight);
    }

    if (security?.industryLevel1) {
      industryWeights.set(security.industryLevel1, (industryWeights.get(security.industryLevel1) ?? 0) + position.weight);
    }
  }

  return {
    asOfDate: input.asOfDate,
    portfolioNetValue,
    positions,
    cashValueBase,
    riskThemeWeights,
    industryWeights
  };
}
