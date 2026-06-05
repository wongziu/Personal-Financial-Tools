import { describe, expect, test } from "vitest";
import { createDatabase } from "@/lib/db/client";
import { refreshFxRates } from "@/lib/fx-refresh";
import { readAppSettings, updateAppSettings } from "@/lib/app-settings";

describe("fx refresh", () => {
  test("refreshes configured currency pairs from Frankfurter data", async () => {
    const database = createDatabase(":memory:");
    updateAppSettings(database, {
      fx: {
        provider: "frankfurter",
        pairs: ["USD/CNY", "HKD/CNY"]
      }
    });

    const requestedUrls: string[] = [];

    const result = await refreshFxRates(database, {
      fetcher: async (url) => {
        requestedUrls.push(url);
        if (url.includes("base=USD")) {
          return {
            ok: true,
            json: async () => [{ date: "2026-06-05", base: "USD", quote: "CNY", rate: 6.7692 }]
          };
        }
        return {
          ok: true,
          json: async () => [{ date: "2026-06-05", base: "HKD", quote: "CNY", rate: 0.86326 }]
        };
      },
      now: new Date("2026-06-04T00:00:00.000Z")
    });

    const rows = database.sqlite
      .prepare("SELECT rate_date, from_currency, to_currency, rate, source FROM fx_rates ORDER BY from_currency")
      .all() as Array<{ rate_date: string; from_currency: string; to_currency: string; rate: number; source: string }>;
    const settings = readAppSettings(database);

    expect(result).toEqual({ refreshed: true, inserted: 2, skipped: false, message: "Refreshed 2 FX rates." });
    expect(requestedUrls).toEqual([
      "https://api.frankfurter.dev/v2/rates?base=USD&quotes=CNY",
      "https://api.frankfurter.dev/v2/rates?base=HKD&quotes=CNY"
    ]);
    expect(rows).toContainEqual({
      rate_date: "2026-06-05",
      from_currency: "HKD",
      to_currency: "CNY",
      rate: 0.86326,
      source: "Frankfurter auto refresh"
    });
    expect(rows).toContainEqual({
      rate_date: "2026-06-05",
      from_currency: "USD",
      to_currency: "CNY",
      rate: 6.7692,
      source: "Frankfurter auto refresh"
    });
    expect(settings.fx.lastRefreshAt).toBe("2026-06-04T00:00:00.000Z");
    expect(settings.fx.lastRefreshStatus).toBe("Refreshed 2 FX rates.");
  });

  test("skips automatic refresh when the configured interval has not elapsed", async () => {
    const database = createDatabase(":memory:");
    updateAppSettings(database, {
      fx: {
        autoRefreshEnabled: true,
        refreshIntervalHours: 24,
        lastRefreshAt: "2026-06-03T12:00:00.000Z",
        pairs: ["USD/CNY"]
      }
    });

    const result = await refreshFxRates(database, {
      mode: "auto",
      now: new Date("2026-06-04T00:00:00.000Z"),
      fetcher: async () => {
        throw new Error("should not fetch");
      }
    });

    expect(result).toEqual({
      refreshed: false,
      inserted: 0,
      skipped: true,
      message: "FX refresh skipped because the configured interval has not elapsed."
    });
  });
});
