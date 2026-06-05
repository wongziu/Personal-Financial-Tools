import type { DatabaseContext } from "@/lib/db/client";
import { readAppSettings, updateAppSettings } from "@/lib/app-settings";

interface FetchLikeResponse {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}

export interface FxRefreshOptions {
  mode?: "manual" | "auto";
  now?: Date;
  fetcher?: (url: string) => Promise<FetchLikeResponse>;
}

export interface FxRefreshResult {
  refreshed: boolean;
  inserted: number;
  skipped: boolean;
  message: string;
}

interface FrankfurterRateResponse {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

function isFrankfurterRateResponse(value: unknown): value is FrankfurterRateResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as FrankfurterRateResponse;
  return (
    typeof candidate.date === "string" &&
    typeof candidate.base === "string" &&
    typeof candidate.quote === "string" &&
    typeof candidate.rate === "number"
  );
}

function findFrankfurterRate(
  payload: unknown,
  fromCurrency: string,
  toCurrency: string
): FrankfurterRateResponse | undefined {
  if (!Array.isArray(payload)) {
    return undefined;
  }

  return payload.find((item) => {
    return (
      isFrankfurterRateResponse(item) &&
      item.base.toUpperCase() === fromCurrency.toUpperCase() &&
      item.quote.toUpperCase() === toCurrency.toUpperCase()
    );
  });
}

function splitPair(pair: string): { fromCurrency: string; toCurrency: string } {
  const [fromCurrency, toCurrency] = pair.split("/");
  return { fromCurrency, toCurrency };
}

function buildFrankfurterUrl(pair: string): string {
  const { fromCurrency, toCurrency } = splitPair(pair);
  const params = new URLSearchParams({ base: fromCurrency, quotes: toCurrency });
  return `https://api.frankfurter.dev/v2/rates?${params.toString()}`;
}

function hoursSince(date: string | null, now: Date): number {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(date).getTime();
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }

  return (now.getTime() - parsed) / 3_600_000;
}

function upsertFxRate(database: DatabaseContext, input: {
  rateDate: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
}): void {
  const existing = database.sqlite
    .prepare("SELECT id FROM fx_rates WHERE rate_date = ? AND from_currency = ? AND to_currency = ? LIMIT 1")
    .get(input.rateDate, input.fromCurrency, input.toCurrency) as { id: number } | undefined;

  if (existing) {
    database.sqlite
      .prepare("UPDATE fx_rates SET rate = ?, source = ? WHERE id = ?")
      .run(input.rate, input.source, existing.id);
    return;
  }

  database.sqlite
    .prepare("INSERT INTO fx_rates (rate_date, from_currency, to_currency, rate, source) VALUES (?, ?, ?, ?, ?)")
    .run(input.rateDate, input.fromCurrency, input.toCurrency, input.rate, input.source);
}

export async function refreshFxRates(database: DatabaseContext, options: FxRefreshOptions = {}): Promise<FxRefreshResult> {
  const settings = readAppSettings(database);
  const mode = options.mode ?? "manual";
  const now = options.now ?? new Date();

  if (mode === "auto" && !settings.fx.autoRefreshEnabled) {
    return {
      refreshed: false,
      inserted: 0,
      skipped: true,
      message: "FX auto refresh is disabled."
    };
  }

  if (mode === "auto" && hoursSince(settings.fx.lastRefreshAt, now) < settings.fx.refreshIntervalHours) {
    return {
      refreshed: false,
      inserted: 0,
      skipped: true,
      message: "FX refresh skipped because the configured interval has not elapsed."
    };
  }

  const fetcher = options.fetcher ?? fetch;
  let inserted = 0;

  for (const pair of settings.fx.pairs) {
    const { fromCurrency, toCurrency } = splitPair(pair);
    const response = await fetcher(buildFrankfurterUrl(pair));
    if (!response.ok) {
      throw new Error(`Frankfurter request failed for ${pair}: ${response.status ?? "unknown status"}`);
    }

    const payload = await response.json();
    const rateRecord = findFrankfurterRate(payload, fromCurrency, toCurrency);
    if (!rateRecord) {
      throw new Error(`Frankfurter response for ${pair} is not valid`);
    }

    const rate = Number(rateRecord.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Frankfurter response for ${pair} does not include a positive rate`);
    }

    upsertFxRate(database, {
      rateDate: rateRecord.date,
      fromCurrency,
      toCurrency,
      rate,
      source: "Frankfurter auto refresh"
    });
    inserted += 1;
  }

  const message = `Refreshed ${inserted} FX rates.`;
  updateAppSettings(database, {
    fx: {
      lastRefreshAt: now.toISOString(),
      lastRefreshStatus: message
    }
  });

  return {
    refreshed: true,
    inserted,
    skipped: false,
    message
  };
}
