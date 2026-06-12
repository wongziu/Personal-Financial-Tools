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
    expect(settings.modelApi.executionMode).toBe("model");
    expect(settings.modelApi.provider).toBe("openai-compatible");
    expect(settings.modelApi.baseUrl).toBe("http://ai-hub.yingzhongtong.com/openai/v1");
    expect(settings.modelApi.apiKeyEnvVar).toBe("ANTHROPIC_AUTH_TOKEN");
    expect(settings.modelApi.apiKeyMode).toBe("env");
    expect(settings.modelApi.maxTokens).toBe(2400);
    expect(settings.sourceIntelligence.enabled).toBe(true);
    expect(settings.agentWorkflow.enabled).toBe(true);
    expect(settings.agentWorkflow.defaultMarket).toBe("all");
    expect(settings.agentWorkflow.defaultUniverse).toBe("active-research");
    expect(settings.agentWorkflow.maxModelCandidates).toBe(3);
    expect(settings.agentWorkflow.requireHumanApproval).toBe(true);
    expect(settings.agentWorkflow.recordHistory).toBe(true);
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
        apiKeyEnvVar: "OPENAI_API_KEY",
        maxTokens: 2048
      },
      marketChange: {
        colorMode: "red-up-green-down"
      },
      sourceIntelligence: {
        maxSources: 8
      },
      agentWorkflow: {
        defaultMarket: "US",
        defaultUniverse: "holding",
        maxModelCandidates: 5,
        requireHumanApproval: false
      }
    });

    const settings = readAppSettings(database);

    expect(settings.uiLanguage).toBe("en-US");
    expect(settings.fx.refreshIntervalHours).toBe(6);
    expect(settings.fx.provider).toBe("frankfurter");
    expect(settings.fx.pairs).toEqual(["USD/CNY", "HKD/CNY", "CNY/USD"]);
    expect(settings.modelApi.model).toBe("gpt-4.1-mini");
    expect(settings.modelApi.baseUrl).toBe("http://ai-hub.yingzhongtong.com/openai/v1");
    expect(settings.modelApi.apiKeyEnvVar).toBe("OPENAI_API_KEY");
    expect(settings.modelApi.maxTokens).toBe(2048);
    expect(settings.marketChange.colorMode).toBe("red-up-green-down");
    expect(settings.sourceIntelligence.maxSources).toBe(8);
    expect(settings.agentWorkflow.enabled).toBe(true);
    expect(settings.agentWorkflow.defaultMarket).toBe("US");
    expect(settings.agentWorkflow.defaultUniverse).toBe("holding");
    expect(settings.agentWorkflow.maxModelCandidates).toBe(5);
    expect(settings.agentWorkflow.requireHumanApproval).toBe(false);
    expect(settings.agentWorkflow.recordHistory).toBe(true);
  });
});
