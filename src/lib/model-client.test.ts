import { afterEach, describe, expect, test, vi } from "vitest";
import { defaultAppSettings, type AppSettings } from "@/lib/app-settings";
import { callConfiguredModel, getModelApiKey, testModelConnection } from "@/lib/model-client";

const originalModelTestKey = process.env.MODEL_CLIENT_TEST_KEY;

function modelSettings(patch: Partial<AppSettings["modelApi"]> = {}): AppSettings {
  return {
    ...defaultAppSettings,
    modelApi: {
      ...defaultAppSettings.modelApi,
      executionMode: "model",
      provider: "openai-compatible",
      baseUrl: "http://ai-hub.yingzhongtong.com/openai/v1/",
      model: "openai:test-model@default",
      apiKeyEnvVar: "MODEL_CLIENT_TEST_KEY",
      temperature: 0.1,
      maxTokens: 512,
      ...patch
    }
  };
}

afterEach(() => {
  if (originalModelTestKey === undefined) {
    delete process.env.MODEL_CLIENT_TEST_KEY;
  } else {
    process.env.MODEL_CLIENT_TEST_KEY = originalModelTestKey;
  }
});

describe("model client", () => {
  test("reads the configured API key from the environment without storing plaintext", () => {
    process.env.MODEL_CLIENT_TEST_KEY = "secret-from-env";

    expect(getModelApiKey(modelSettings())).toBe("secret-from-env");
    expect(getModelApiKey(modelSettings({ apiKeyEnvVar: "MISSING_MODEL_CLIENT_KEY" }))).toBeUndefined();
  });

  test("calls an OpenAI-compatible chat completion endpoint with configured model fields", async () => {
    process.env.MODEL_CLIENT_TEST_KEY = "secret-from-env";
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe("http://ai-hub.yingzhongtong.com/openai/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret-from-env");
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        temperature: number;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
        response_format?: { type: string };
      };
      expect(body.model).toBe("openai:test-model@default");
      expect(body.temperature).toBe(0.1);
      expect(body.max_tokens).toBe(512);
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.messages[0]).toEqual({ role: "user", content: "Return JSON." });
      return new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    const result = await callConfiguredModel({
      settings: modelSettings(),
      messages: [{ role: "user", content: "Return JSON." }],
      responseFormat: "json",
      fetcher
    });

    expect(result.content).toBe("{\"ok\":true}");
    expect(result.model).toBe("openai:test-model@default");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("tests model connectivity and reports upstream failures without throwing", async () => {
    process.env.MODEL_CLIENT_TEST_KEY = "secret-from-env";
    const fetcher = vi.fn(async () => new Response("model id invalid", { status: 403 }));

    const result = await testModelConnection({
      settings: modelSettings(),
      fetcher
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.message).toContain("model id invalid");
  });
});
