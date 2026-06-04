import { describe, expect, test } from "vitest";
import { defaultAppSettings } from "@/lib/app-settings";
import { buildInformationExtractionPrompt, draftInformationSource } from "@/lib/source-intelligence";

describe("source intelligence", () => {
  test("builds a reusable extraction prompt for information sources", () => {
    const prompt = buildInformationExtractionPrompt({
      securityName: "Apple Inc.",
      sourceText: "Apple announced new AI-related capex plans.",
      sourceUrl: "https://example.com/apple-ai"
    });

    expect(prompt).toContain("Apple Inc.");
    expect(prompt).toContain("sourceUrl");
    expect(prompt).toContain("keyFacts");
    expect(prompt).toContain("related thesis and trade-decision workflows");
  });

  test("creates a deterministic draft when model execution is not configured", async () => {
    const draft = await draftInformationSource({
      settings: {
        ...defaultAppSettings,
        modelApi: {
          ...defaultAppSettings.modelApi,
          apiKeyEnvVar: "MISSING_MODEL_KEY"
        }
      },
      sourceText: "Apple reported stronger iPhone demand and increased AI infrastructure spending.",
      sourceUrl: "https://example.com/apple-demand",
      securityName: "Apple Inc.",
      today: "2026-06-04"
    });

    expect(draft.mode).toBe("local");
    expect(draft.fields.sourceName).toBe("example.com");
    expect(draft.fields.informationDate).toBe("2026-06-04");
    expect(draft.fields.evidenceLevel).toBe("C");
    expect(draft.fields.thesisImpact).toBe("Pending");
    expect(draft.fields.keyFacts).toContain("Apple reported stronger iPhone demand");
    expect(draft.reuseTargets).toEqual(["sources", "theses", "trade-decisions", "review-events"]);
  });
});
