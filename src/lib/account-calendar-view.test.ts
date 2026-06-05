import { describe, expect, test } from "vitest";
import { accountCalendarViewCurrencies, convertBaseAmountForView } from "@/lib/account-calendar-view";

describe("account calendar currency view helpers", () => {
  const fxRates = [
    { rateDate: "2026-06-02", fromCurrency: "USD" as const, toCurrency: "CNY" as const, rate: 7.2 },
    { rateDate: "2026-06-02", fromCurrency: "HKD" as const, toCurrency: "CNY" as const, rate: 0.92 }
  ];

  test("converts base-currency values into the selected currency using inverse FX when needed", () => {
    expect(convertBaseAmountForView(720, "CNY", "USD", "2026-06-02", fxRates)).toBe(100);
    expect(convertBaseAmountForView(92, "CNY", "HKD", "2026-06-02", fxRates)).toBe(100);
    expect(convertBaseAmountForView(720, "CNY", "CNY", "2026-06-02", fxRates)).toBe(720);
  });

  test("uses available account and FX currencies while keeping the base currency first", () => {
    expect(
      accountCalendarViewCurrencies({
        baseCurrency: "CNY",
        accountCurrencies: ["USD"],
        fxRates
      })
    ).toEqual(["CNY", "USD", "HKD"]);
  });
});
