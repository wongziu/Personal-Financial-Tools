import { describe, expect, test } from "vitest";
import { createDatabase } from "@/lib/db/client";
import { readAppSettings, updateAppSettings } from "@/lib/app-settings";

describe("application settings", () => {
  test("reads default settings from a fresh database", () => {
    const database = createDatabase(":memory:");

    const settings = readAppSettings(database);

    expect(settings.baseCurrency).toBe("CNY");
    expect(settings.uiLanguage).toBe("zh-CN");
    expect(settings.fx.provider).toBe("frankfurter");
    expect(settings.fx.autoRefreshEnabled).toBe(true);
    expect(settings.fx.refreshIntervalHours).toBe(24);
    expect(settings.fx.pairs).toEqual(["USD/CNY", "HKD/CNY"]);
    expect(settings.marketChange.colorMode).toBe("green-up-red-down");
    expect(settings.modelApi.provider).toBe("openai-compatible");
    expect(settings.modelApi.apiKeyMode).toBe("env");
    expect(settings.sourceIntelligence.enabled).toBe(true);
  });

  test("updates nested settings without dropping existing defaults", () => {
    const database = createDatabase(":memory:");

    updateAppSettings(database, {
      uiLanguage: "en-US",
      fx: {
        refreshIntervalHours: 6,
        pairs: ["USD/CNY", "HKD/CNY", "CNY/USD"]
      },
      modelApi: {
        model: "gpt-4.1-mini",
        apiKeyEnvVar: "OPENAI_API_KEY"
      },
      marketChange: {
        colorMode: "red-up-green-down"
      },
      sourceIntelligence: {
        maxSources: 8
      }
    });

    const settings = readAppSettings(database);

    expect(settings.uiLanguage).toBe("en-US");
    expect(settings.fx.refreshIntervalHours).toBe(6);
    expect(settings.fx.provider).toBe("frankfurter");
    expect(settings.fx.pairs).toEqual(["USD/CNY", "HKD/CNY", "CNY/USD"]);
    expect(settings.modelApi.model).toBe("gpt-4.1-mini");
    expect(settings.modelApi.baseUrl).toBe("https://api.openai.com/v1");
    expect(settings.modelApi.apiKeyEnvVar).toBe("OPENAI_API_KEY");
    expect(settings.marketChange.colorMode).toBe("red-up-green-down");
    expect(settings.sourceIntelligence.maxSources).toBe(8);
  });
});
