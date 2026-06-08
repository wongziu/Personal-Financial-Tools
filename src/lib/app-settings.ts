import type { DatabaseContext } from "@/lib/db/client";
import type { Currency } from "@/lib/domain";
import type { Language } from "@/lib/i18n";
import { normalizeMarketChangeColorMode, type MarketChangeColorMode } from "@/lib/market-change";

export type FxProvider = "frankfurter";
export type ModelExecutionMode = "local" | "model";
export type ModelApiProvider = "openai-compatible" | "disabled";
export type ApiKeyMode = "env";

export interface FxSettings {
  provider: FxProvider;
  autoRefreshEnabled: boolean;
  refreshIntervalHours: number;
  pairs: string[];
  lastRefreshAt: string | null;
  lastRefreshStatus: string | null;
}

export interface ModelApiSettings {
  executionMode: ModelExecutionMode;
  provider: ModelApiProvider;
  baseUrl: string;
  model: string;
  apiKeyMode: ApiKeyMode;
  apiKeyEnvVar: string;
  temperature: number;
  maxTokens: number;
}

export interface SourceIntelligenceSettings {
  enabled: boolean;
  maxSources: number;
  defaultDomains: string[];
  reuseTargets: string[];
  extractionPrompt: string;
}

export interface MarketChangeSettings {
  colorMode: MarketChangeColorMode;
}

export interface AppSettings {
  baseCurrency: Currency;
  uiLanguage: Language;
  fx: FxSettings;
  marketChange: MarketChangeSettings;
  modelApi: ModelApiSettings;
  sourceIntelligence: SourceIntelligenceSettings;
}

export type AppSettingsPatch = Partial<{
  baseCurrency: Currency;
  uiLanguage: Language;
  fx: Partial<FxSettings>;
  marketChange: Partial<MarketChangeSettings>;
  modelApi: Partial<ModelApiSettings>;
  sourceIntelligence: Partial<SourceIntelligenceSettings>;
}>;

export const defaultAppSettings: AppSettings = {
  baseCurrency: "CNY",
  uiLanguage: "zh-CN",
  fx: {
    provider: "frankfurter",
    autoRefreshEnabled: true,
    refreshIntervalHours: 24,
    pairs: ["USD/CNY", "HKD/CNY"],
    lastRefreshAt: null,
    lastRefreshStatus: null
  },
  marketChange: {
    colorMode: "green-up-red-down"
  },
  modelApi: {
    executionMode: "model",
    provider: "openai-compatible",
    baseUrl: "http://ai-hub.yingzhongtong.com/openai/v1",
    model: process.env.ANTHROPIC_MODEL ?? "claude:claude-sonnet-4-6@default",
    apiKeyMode: "env",
    apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
    temperature: 0.2,
    maxTokens: 2400
  },
  sourceIntelligence: {
    enabled: true,
    maxSources: 5,
    defaultDomains: ["sec.gov", "hkexnews.hk", "eastmoney.com", "cninfo.com.cn"],
    reuseTargets: ["sources", "theses", "trade-decisions", "review-events"],
    extractionPrompt:
      "Extract investment-relevant facts, evidence quality, thesis impact, review triggers, and reusable decision context. Return strict JSON."
  }
};

const settingKeys = {
  baseCurrency: "baseCurrency",
  uiLanguage: "uiLanguage",
  fxProvider: "settings.fx.provider",
  fxAutoRefreshEnabled: "settings.fx.autoRefreshEnabled",
  fxRefreshIntervalHours: "settings.fx.refreshIntervalHours",
  fxPairs: "settings.fx.pairs",
  fxLastRefreshAt: "settings.fx.lastRefreshAt",
  fxLastRefreshStatus: "settings.fx.lastRefreshStatus",
  marketChangeColorMode: "settings.marketChange.colorMode",
  modelExecutionMode: "settings.modelApi.executionMode",
  modelProvider: "settings.modelApi.provider",
  modelBaseUrl: "settings.modelApi.baseUrl",
  modelModel: "settings.modelApi.model",
  modelApiKeyMode: "settings.modelApi.apiKeyMode",
  modelApiKeyEnvVar: "settings.modelApi.apiKeyEnvVar",
  modelTemperature: "settings.modelApi.temperature",
  modelMaxTokens: "settings.modelApi.maxTokens",
  sourceEnabled: "settings.sourceIntelligence.enabled",
  sourceMaxSources: "settings.sourceIntelligence.maxSources",
  sourceDefaultDomains: "settings.sourceIntelligence.defaultDomains",
  sourceReuseTargets: "settings.sourceIntelligence.reuseTargets",
  sourceExtractionPrompt: "settings.sourceIntelligence.extractionPrompt"
} as const;

export const defaultSystemSettingRows = [
  { key: settingKeys.baseCurrency, value: defaultAppSettings.baseCurrency },
  { key: settingKeys.uiLanguage, value: defaultAppSettings.uiLanguage },
  { key: settingKeys.fxProvider, value: defaultAppSettings.fx.provider },
  { key: settingKeys.fxAutoRefreshEnabled, value: String(defaultAppSettings.fx.autoRefreshEnabled) },
  { key: settingKeys.fxRefreshIntervalHours, value: String(defaultAppSettings.fx.refreshIntervalHours) },
  { key: settingKeys.fxPairs, value: JSON.stringify(defaultAppSettings.fx.pairs) },
  { key: settingKeys.fxLastRefreshAt, value: "" },
  { key: settingKeys.fxLastRefreshStatus, value: "" },
  { key: settingKeys.marketChangeColorMode, value: defaultAppSettings.marketChange.colorMode },
  { key: settingKeys.modelExecutionMode, value: defaultAppSettings.modelApi.executionMode },
  { key: settingKeys.modelProvider, value: defaultAppSettings.modelApi.provider },
  { key: settingKeys.modelBaseUrl, value: defaultAppSettings.modelApi.baseUrl },
  { key: settingKeys.modelModel, value: defaultAppSettings.modelApi.model },
  { key: settingKeys.modelApiKeyMode, value: defaultAppSettings.modelApi.apiKeyMode },
  { key: settingKeys.modelApiKeyEnvVar, value: defaultAppSettings.modelApi.apiKeyEnvVar },
  { key: settingKeys.modelTemperature, value: String(defaultAppSettings.modelApi.temperature) },
  { key: settingKeys.modelMaxTokens, value: String(defaultAppSettings.modelApi.maxTokens) },
  { key: settingKeys.sourceEnabled, value: String(defaultAppSettings.sourceIntelligence.enabled) },
  { key: settingKeys.sourceMaxSources, value: String(defaultAppSettings.sourceIntelligence.maxSources) },
  { key: settingKeys.sourceDefaultDomains, value: JSON.stringify(defaultAppSettings.sourceIntelligence.defaultDomains) },
  { key: settingKeys.sourceReuseTargets, value: JSON.stringify(defaultAppSettings.sourceIntelligence.reuseTargets) },
  { key: settingKeys.sourceExtractionPrompt, value: defaultAppSettings.sourceIntelligence.extractionPrompt }
];

function settingMap(database: DatabaseContext): Map<string, string> {
  const rows = database.sqlite.prepare("SELECT key, value FROM system_settings").all() as Array<{ key: string; value: string }>;
  return new Map(rows.map((row) => [row.key, row.value]));
}

function stringSetting(settings: Map<string, string>, key: string, fallback: string): string {
  const value = settings.get(key);
  return value === undefined || value === "" ? fallback : value;
}

function nullableStringSetting(settings: Map<string, string>, key: string): string | null {
  const value = settings.get(key);
  return value ? value : null;
}

function booleanSetting(settings: Map<string, string>, key: string, fallback: boolean): boolean {
  const value = settings.get(key);
  if (value === undefined || value === "") {
    return fallback;
  }
  return value === "true" || value === "1";
}

function numberSetting(settings: Map<string, string>, key: string, fallback: number): number {
  const value = Number(settings.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function arraySetting(settings: Map<string, string>, key: string, fallback: string[]): string[] {
  const value = settings.get(key);
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : fallback;
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function normalizePair(pair: string): string | null {
  const normalized = pair.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z]{3}\/[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizePairs(pairs: string[]): string[] {
  const normalized = pairs.map(normalizePair).filter((pair): pair is string => Boolean(pair));
  return normalized.length > 0 ? [...new Set(normalized)] : defaultAppSettings.fx.pairs;
}

export function readAppSettings(database: DatabaseContext): AppSettings {
  const settings = settingMap(database);

  return {
    baseCurrency: stringSetting(settings, settingKeys.baseCurrency, defaultAppSettings.baseCurrency) as Currency,
    uiLanguage: stringSetting(settings, settingKeys.uiLanguage, defaultAppSettings.uiLanguage) as Language,
    fx: {
      provider: stringSetting(settings, settingKeys.fxProvider, defaultAppSettings.fx.provider) as FxProvider,
      autoRefreshEnabled: booleanSetting(settings, settingKeys.fxAutoRefreshEnabled, defaultAppSettings.fx.autoRefreshEnabled),
      refreshIntervalHours: numberSetting(settings, settingKeys.fxRefreshIntervalHours, defaultAppSettings.fx.refreshIntervalHours),
      pairs: normalizePairs(arraySetting(settings, settingKeys.fxPairs, defaultAppSettings.fx.pairs)),
      lastRefreshAt: nullableStringSetting(settings, settingKeys.fxLastRefreshAt),
      lastRefreshStatus: nullableStringSetting(settings, settingKeys.fxLastRefreshStatus)
    },
    marketChange: {
      colorMode: normalizeMarketChangeColorMode(stringSetting(settings, settingKeys.marketChangeColorMode, defaultAppSettings.marketChange.colorMode))
    },
    modelApi: {
      executionMode: stringSetting(settings, settingKeys.modelExecutionMode, defaultAppSettings.modelApi.executionMode) as ModelExecutionMode,
      provider: stringSetting(settings, settingKeys.modelProvider, defaultAppSettings.modelApi.provider) as ModelApiProvider,
      baseUrl: stringSetting(settings, settingKeys.modelBaseUrl, defaultAppSettings.modelApi.baseUrl),
      model: stringSetting(settings, settingKeys.modelModel, defaultAppSettings.modelApi.model),
      apiKeyMode: stringSetting(settings, settingKeys.modelApiKeyMode, defaultAppSettings.modelApi.apiKeyMode) as ApiKeyMode,
      apiKeyEnvVar: stringSetting(settings, settingKeys.modelApiKeyEnvVar, defaultAppSettings.modelApi.apiKeyEnvVar),
      temperature: numberSetting(settings, settingKeys.modelTemperature, defaultAppSettings.modelApi.temperature),
      maxTokens: numberSetting(settings, settingKeys.modelMaxTokens, defaultAppSettings.modelApi.maxTokens)
    },
    sourceIntelligence: {
      enabled: booleanSetting(settings, settingKeys.sourceEnabled, defaultAppSettings.sourceIntelligence.enabled),
      maxSources: numberSetting(settings, settingKeys.sourceMaxSources, defaultAppSettings.sourceIntelligence.maxSources),
      defaultDomains: arraySetting(settings, settingKeys.sourceDefaultDomains, defaultAppSettings.sourceIntelligence.defaultDomains),
      reuseTargets: arraySetting(settings, settingKeys.sourceReuseTargets, defaultAppSettings.sourceIntelligence.reuseTargets),
      extractionPrompt: stringSetting(settings, settingKeys.sourceExtractionPrompt, defaultAppSettings.sourceIntelligence.extractionPrompt)
    }
  };
}

function upsertSetting(database: DatabaseContext, key: string, value: string): void {
  database.sqlite
    .prepare(
      `
        INSERT INTO system_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `
    )
    .run(key, value);
}

function optionalString(value: string | null | undefined): string {
  return value ?? "";
}

export function updateAppSettings(database: DatabaseContext, patch: AppSettingsPatch): AppSettings {
  const current = readAppSettings(database);
  const next: AppSettings = {
    ...current,
    ...patch,
    fx: {
      ...current.fx,
      ...(patch.fx ?? {}),
      pairs: patch.fx?.pairs ? normalizePairs(patch.fx.pairs) : current.fx.pairs
    },
    marketChange: {
      ...current.marketChange,
      ...(patch.marketChange ?? {}),
      colorMode: normalizeMarketChangeColorMode(patch.marketChange?.colorMode ?? current.marketChange.colorMode)
    },
    modelApi: {
      ...current.modelApi,
      ...(patch.modelApi ?? {})
    },
    sourceIntelligence: {
      ...current.sourceIntelligence,
      ...(patch.sourceIntelligence ?? {})
    }
  };

  upsertSetting(database, settingKeys.baseCurrency, next.baseCurrency);
  upsertSetting(database, settingKeys.uiLanguage, next.uiLanguage);
  upsertSetting(database, settingKeys.fxProvider, next.fx.provider);
  upsertSetting(database, settingKeys.fxAutoRefreshEnabled, String(next.fx.autoRefreshEnabled));
  upsertSetting(database, settingKeys.fxRefreshIntervalHours, String(Math.max(1, next.fx.refreshIntervalHours)));
  upsertSetting(database, settingKeys.fxPairs, JSON.stringify(normalizePairs(next.fx.pairs)));
  upsertSetting(database, settingKeys.fxLastRefreshAt, optionalString(next.fx.lastRefreshAt));
  upsertSetting(database, settingKeys.fxLastRefreshStatus, optionalString(next.fx.lastRefreshStatus));
  upsertSetting(database, settingKeys.marketChangeColorMode, next.marketChange.colorMode);
  upsertSetting(database, settingKeys.modelExecutionMode, next.modelApi.executionMode);
  upsertSetting(database, settingKeys.modelProvider, next.modelApi.provider);
  upsertSetting(database, settingKeys.modelBaseUrl, next.modelApi.baseUrl);
  upsertSetting(database, settingKeys.modelModel, next.modelApi.model);
  upsertSetting(database, settingKeys.modelApiKeyMode, next.modelApi.apiKeyMode);
  upsertSetting(database, settingKeys.modelApiKeyEnvVar, next.modelApi.apiKeyEnvVar);
  upsertSetting(database, settingKeys.modelTemperature, String(next.modelApi.temperature));
  upsertSetting(database, settingKeys.modelMaxTokens, String(Math.max(1, next.modelApi.maxTokens)));
  upsertSetting(database, settingKeys.sourceEnabled, String(next.sourceIntelligence.enabled));
  upsertSetting(database, settingKeys.sourceMaxSources, String(Math.max(1, next.sourceIntelligence.maxSources)));
  upsertSetting(database, settingKeys.sourceDefaultDomains, JSON.stringify(next.sourceIntelligence.defaultDomains));
  upsertSetting(database, settingKeys.sourceReuseTargets, JSON.stringify(next.sourceIntelligence.reuseTargets));
  upsertSetting(database, settingKeys.sourceExtractionPrompt, next.sourceIntelligence.extractionPrompt);

  return readAppSettings(database);
}
