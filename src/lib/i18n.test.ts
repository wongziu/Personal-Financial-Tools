import { describe, expect, test } from "vitest";
import { languageOptions, normalizeLanguage, translateBoolean, translateColumn, translateColumnHelp, translateEnum, translateFieldHelp, translateText, translateUiHelp } from "@/lib/i18n";

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
    expect(translateColumn("accounts", "supported_markets", "zh-CN")).toBe("支持市场");
    expect(translateColumn("accounts", "supported_markets", "en-US")).toBe("Supported Markets");
  });

  test("translates enum display values across all supported languages", () => {
    expect(translateEnum("Allowed", "zh-CN")).toBe("允许");
    expect(translateEnum("Allowed", "zh-TW")).toBe("允許");
    expect(translateEnum("Allowed", "en-US")).toBe("Allowed");
  });

  test("translates canonical stored account type values without leaking database codes", () => {
    expect(translateEnum("cash", "zh-CN")).toBe("现金");
    expect(translateEnum("fund", "zh-CN")).toBe("基金/理财");
    expect(translateEnum("bank_cash", "zh-CN")).toBe("银行现金");
    expect(translateEnum("cash", "en-US")).toBe("Cash");
    expect(translateEnum("fund", "en-US")).toBe("Fund / Wealth Management");
  });

  test("translates canonical industry enum values", () => {
    expect(translateEnum("InformationTechnology", "zh-CN")).toBe("信息技术");
    expect(translateEnum("FixedIncome", "zh-CN")).toBe("固定收益");
    expect(translateEnum("BankWealthManagement", "zh-CN")).toBe("银行理财");
    expect(translateEnum("Semiconductors", "en-US")).toBe("Semiconductors");
  });

  test("translates database boolean values as localized labels", () => {
    expect(translateBoolean(1, "zh-CN")).toBe("是");
    expect(translateBoolean(0, "zh-CN")).toBe("否");
    expect(translateBoolean(true, "zh-TW")).toBe("是");
    expect(translateBoolean(false, "en-US")).toBe("No");
  });

  test("provides localized field help text", () => {
    expect(translateColumnHelp("securities", "benchmark", "zh-CN")).toContain("对照表现");
    expect(translateColumnHelp("securities", "benchmark", "zh-TW")).toContain("對照表現");
    expect(translateColumnHelp("securities", "benchmark", "en-US")).toContain("Benchmark");
  });

  test("provides localized UI help text", () => {
    expect(translateUiHelp("module.totalRecords", "zh-CN")).toContain("全部记录数");
    expect(translateUiHelp("module.totalRecords", "zh-TW")).toContain("全部記錄數");
    expect(translateUiHelp("module.totalRecords", "en-US")).toContain("All records");
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
