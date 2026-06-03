import type {
  AccountDailyPerformanceRow,
  AccountNavAnchorInput,
  AccountReference,
  CashflowInput,
  Currency,
  FxRateInput,
  Holding,
  MarketPriceInput,
  SecurityReference,
  TransactionInput
} from "@/lib/domain";
import { calculateHoldings } from "@/lib/portfolio";

function addDays(date: string, days: number): string {
  const current = new Date(`${date}T00:00:00.000Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function minDate(values: string[]): string | undefined {
  return values.filter(Boolean).sort()[0];
}

function maxDate(values: string[]): string | undefined {
  return values.filter(Boolean).sort().at(-1);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
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

function marketValueBase(input: {
  holding: Holding;
  asOfDate: string;
  prices: MarketPriceInput[];
  fxRates: FxRateInput[];
  baseCurrency: Currency;
}): number {
  const price = latestByDate(
    input.prices.filter((item) => item.securityId === input.holding.securityId),
    (item) => item.priceDate,
    input.asOfDate
  );

  if (!price) {
    return input.holding.totalCost;
  }

  try {
    return input.holding.quantity * price.closePrice * getFxRate(input.fxRates, price.currency, input.baseCurrency, input.asOfDate);
  } catch {
    return input.holding.totalCost;
  }
}

function accountAnchorKey(accountId: string, date: string): string {
  return `${accountId}:${date}`;
}

export function calculateAccountDailyPerformance(input: {
  accounts: AccountReference[];
  transactions: TransactionInput[];
  cashflows: CashflowInput[];
  prices: MarketPriceInput[];
  fxRates: FxRateInput[];
  securities: SecurityReference[];
  navAnchors: AccountNavAnchorInput[];
  baseCurrency?: Currency;
  startDate?: string;
  endDate?: string;
}): AccountDailyPerformanceRow[] {
  const baseCurrency = input.baseCurrency ?? "CNY";
  const startDate =
    input.startDate ??
    minDate([
      ...input.accounts.map((account) => account.initialEntryDate),
      ...input.transactions.map((transaction) => transaction.tradeDate),
      ...input.cashflows.map((cashflow) => cashflow.cashflowDate),
      ...input.navAnchors.map((anchor) => anchor.anchorDate)
    ]) ??
    new Date().toISOString().slice(0, 10);
  const endDate =
    input.endDate ??
    maxDate([
      ...input.transactions.map((transaction) => transaction.tradeDate),
      ...input.cashflows.map((cashflow) => cashflow.cashflowDate),
      ...input.prices.map((price) => price.priceDate),
      ...input.fxRates.map((rate) => rate.rateDate),
      ...input.navAnchors.map((anchor) => anchor.anchorDate),
      startDate
    ]) ??
    startDate;

  const anchorsByAccountDate = new Map<string, AccountNavAnchorInput>();
  for (const anchor of input.navAnchors) {
    anchorsByAccountDate.set(accountAnchorKey(anchor.accountId, anchor.anchorDate), anchor);
  }

  const dates = eachDate(startDate, endDate);
  const rows: AccountDailyPerformanceRow[] = [];

  for (const account of input.accounts) {
    let previousNav: number | null = null;
    let cumulativePnlBase = 0;

    for (const snapshotDate of dates) {
      if (snapshotDate < account.initialEntryDate) {
        continue;
      }

      const accountTransactions = input.transactions.filter(
        (transaction) => transaction.accountId === account.id && transaction.tradeDate <= snapshotDate
      );
      const accountCashflows = input.cashflows.filter(
        (cashflow) => cashflow.accountId === account.id && cashflow.cashflowDate <= snapshotDate
      );
      const holdings = calculateHoldings(accountTransactions);
      const marketValue = holdings.reduce(
        (sum, holding) =>
          sum +
          marketValueBase({
            holding,
            asOfDate: snapshotDate,
            prices: input.prices,
            fxRates: input.fxRates,
            baseCurrency
          }),
        0
      );
      const cashValue =
        accountCashflows.reduce((sum, cashflow) => sum + signedBaseCashflowAmount(cashflow), 0) +
        accountTransactions
          .filter((transaction) => transaction.status === "Settled")
          .reduce((sum, transaction) => sum + signedTradeCashAmount(transaction), 0);
      const computedNetAssetValueBase = roundMoney(cashValue + marketValue);
      const anchor = anchorsByAccountDate.get(accountAnchorKey(account.id, snapshotDate));
      const netAssetValueBase = roundMoney(anchor?.netAssetValueBase ?? computedNetAssetValueBase);
      const externalCashflowBase = roundMoney(
        input.cashflows
          .filter(
            (cashflow) =>
              cashflow.accountId === account.id && cashflow.cashflowDate === snapshotDate && cashflow.isExternal
          )
          .reduce((sum, cashflow) => sum + signedBaseCashflowAmount(cashflow), 0)
      );
      const dailyPnlBase =
        previousNav === null ? 0 : roundMoney(netAssetValueBase - previousNav - externalCashflowBase);
      cumulativePnlBase = roundMoney(cumulativePnlBase + dailyPnlBase);
      const dailyReturn = previousNav && previousNav !== 0 ? roundMoney(dailyPnlBase / Math.abs(previousNav)) : null;

      rows.push({
        accountId: account.id,
        accountName: account.institutionName,
        snapshotDate,
        cashValueBase: roundMoney(cashValue),
        marketValueBase: roundMoney(marketValue),
        computedNetAssetValueBase,
        netAssetValueBase,
        externalCashflowBase,
        dailyPnlBase,
        cumulativePnlBase,
        dailyReturn,
        isAnchored: Boolean(anchor),
        anchorSource: anchor?.source ?? null,
        anchorNotes: anchor?.notes ?? null
      });

      previousNav = netAssetValueBase;
    }
  }

  return rows.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate) || a.accountId.localeCompare(b.accountId));
}
