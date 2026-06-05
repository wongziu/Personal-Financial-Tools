import type { Currency, FxRateInput } from "@/lib/domain";

const supportedCurrencyOrder: Currency[] = ["CNY", "USD", "HKD"];

function roundDisplayAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function latestByDate<T>(items: T[], dateOf: (item: T) => string, asOfDate: string): T | undefined {
  const datedItems = items.filter((item) => dateOf(item) <= asOfDate);
  const candidates = datedItems.length > 0 ? datedItems : items;
  return candidates.sort((left, right) => dateOf(right).localeCompare(dateOf(left)))[0];
}

function fxRateAsOf(fxRates: FxRateInput[], fromCurrency: Currency, toCurrency: Currency, asOfDate: string): number | null {
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
  return inverse ? 1 / inverse.rate : null;
}

export function convertBaseAmountForView(
  amount: number,
  baseCurrency: Currency,
  viewCurrency: Currency,
  asOfDate: string,
  fxRates: FxRateInput[]
): number {
  const rate = fxRateAsOf(fxRates, baseCurrency, viewCurrency, asOfDate);
  return rate === null ? amount : roundDisplayAmount(amount * rate);
}

export function accountCalendarViewCurrencies({
  baseCurrency,
  accountCurrencies,
  fxRates
}: {
  baseCurrency: Currency;
  accountCurrencies: Currency[];
  fxRates: FxRateInput[];
}): Currency[] {
  const currencies = new Set<Currency>([
    baseCurrency,
    ...accountCurrencies,
    ...fxRates.map((rate) => rate.fromCurrency),
    ...fxRates.map((rate) => rate.toCurrency)
  ]);
  return supportedCurrencyOrder.filter((currency) => currencies.has(currency)).sort((left, right) => {
    if (left === baseCurrency) {
      return -1;
    }
    if (right === baseCurrency) {
      return 1;
    }
    return supportedCurrencyOrder.indexOf(left) - supportedCurrencyOrder.indexOf(right);
  });
}
