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

    const result = await refreshFxRates(database, {
      fetcher: async (url) => {
        if (url.includes("base=USD")) {
          return {
            ok: true,
            json: async () => ({ date: "2026-06-03", base: "USD", rates: { CNY: 7.1 } })
          };
        }
        return {
          ok: true,
          json: async () => ({ date: "2026-06-03", base: "HKD", rates: { CNY: 0.91 } })
        };
      },
      now: new Date("2026-06-04T00:00:00.000Z")
    });

    const rows = database.sqlite
      .prepare("SELECT rate_date, from_currency, to_currency, rate, source FROM fx_rates ORDER BY from_currency")
      .all() as Array<{ rate_date: string; from_currency: string; to_currency: string; rate: number; source: string }>;
    const settings = readAppSettings(database);

    expect(result).toEqual({ refreshed: true, inserted: 2, skipped: false, message: "Refreshed 2 FX rates." });
    expect(rows).toContainEqual({
      rate_date: "2026-06-03",
      from_currency: "HKD",
      to_currency: "CNY",
      rate: 0.91,
      source: "Frankfurter auto refresh"
    });
    expect(rows).toContainEqual({
      rate_date: "2026-06-03",
      from_currency: "USD",
      to_currency: "CNY",
      rate: 7.1,
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
