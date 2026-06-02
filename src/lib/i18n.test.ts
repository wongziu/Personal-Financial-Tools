import { describe, expect, test } from "vitest";
import { languageOptions, normalizeLanguage, translateColumn, translateColumnHelp, translateEnum, translateFieldHelp, translateText } from "@/lib/i18n";

describe("i18n system", () => {
  test("supports visible Simplified Chinese, Traditional Chinese, and English options", () => {
    expect(languageOptions.map((option) => option.value)).toEqual(["zh-CN", "zh-TW", "en-US"]);
  });

  test("normalizes unsupported or removed preferences to Simplified Chinese", () => {
    expect(normalizeLanguage("hidden")).toBe("zh-CN");
    expect(normalizeLanguage("en-US")).toBe("en-US");
  });

  test("translates table column names for the securities list", () => {
    expect(translateColumn("securities", "asset_type", "zh-CN")).toBe("资产类型");
    expect(translateColumn("securities", "asset_type", "zh-TW")).toBe("資產類型");
    expect(translateColumn("securities", "asset_type", "en-US")).toBe("Asset Type");
  });

  test("translates enum display values across all supported languages", () => {
    expect(translateEnum("Allowed", "zh-CN")).toBe("允许");
    expect(translateEnum("Allowed", "zh-TW")).toBe("允許");
    expect(translateEnum("Allowed", "en-US")).toBe("Allowed");
  });

  test("provides localized field help text", () => {
    expect(translateColumnHelp("securities", "benchmark", "zh-CN")).toContain("对照表现");
    expect(translateColumnHelp("securities", "benchmark", "zh-TW")).toContain("對照表現");
    expect(translateColumnHelp("securities", "benchmark", "en-US")).toContain("Benchmark");
  });

  test("falls back to generated field help when no specific copy exists", () => {
    expect(
      translateFieldHelp({
        column: "custom_column",
        labelZh: "自定义字段",
        labelEn: "Custom Field",
        language: "zh-CN"
      })
    ).toContain("自定义字段");
  });

  test("converts missing Traditional Chinese labels from Simplified Chinese fallback", () => {
    expect(translateText("投资决策系统", "zh-TW")).toBe("投資決策系統");
  });
});
