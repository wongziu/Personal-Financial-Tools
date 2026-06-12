import type { AppSettings } from "@/lib/app-settings";

export type ModelChatRole = "system" | "user" | "assistant";

export interface ModelChatMessage {
  role: ModelChatRole;
  content: string;
}

export interface ModelCallInput {
  settings: AppSettings;
  messages: ModelChatMessage[];
  responseFormat?: "json" | "text";
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export interface ModelCallResult {
  content: string;
  model: string;
  status: number;
}

export interface ModelConnectionResult {
  ok: boolean;
  status?: number;
  model: string;
  message: string;
  latencyMs: number;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function getModelApiKey(settings: AppSettings): string | undefined {
  if (settings.modelApi.apiKeyMode !== "env") {
    return undefined;
  }

  const envVar = settings.modelApi.apiKeyEnvVar.trim();
  return envVar ? process.env[envVar] : undefined;
}

function assertModelApiConfigured(settings: AppSettings): string {
  if (settings.modelApi.executionMode !== "model" || settings.modelApi.provider === "disabled") {
    throw new Error("Model execution is not enabled.");
  }

  if (settings.modelApi.provider !== "openai-compatible") {
    throw new Error(`Unsupported model provider: ${settings.modelApi.provider}`);
  }

  if (!settings.modelApi.baseUrl.trim()) {
    throw new Error("Model API base URL is required.");
  }

  if (!settings.modelApi.model.trim()) {
    throw new Error("Model name is required.");
  }

  const apiKey = getModelApiKey(settings);
  if (!apiKey) {
    throw new Error(`Model API key environment variable is not set: ${settings.modelApi.apiKeyEnvVar}`);
  }

  return apiKey;
}

export async function callConfiguredModel(input: ModelCallInput): Promise<ModelCallResult> {
  const apiKey = assertModelApiConfigured(input.settings);
  const fetcher = input.fetcher ?? fetch;
  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 45_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetcher(`${normalizeBaseUrl(input.settings.modelApi.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.settings.modelApi.model,
        temperature: input.settings.modelApi.temperature,
        max_tokens: input.settings.modelApi.maxTokens,
        ...(input.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
        messages: input.messages
      })
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Model API request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Model API request failed: ${response.status}${detail ? ` ${detail.slice(0, 500)}` : ""}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model API response did not include message content.");
  }

  return {
    content,
    model: input.settings.modelApi.model,
    status: response.status
  };
}

export async function testModelConnection({
  settings,
  fetcher
}: {
  settings: AppSettings;
  fetcher?: typeof fetch;
}): Promise<ModelConnectionResult> {
  const startedAt = Date.now();

  try {
    const result = await callConfiguredModel({
      settings,
      messages: [{ role: "user", content: "Return exactly OK." }],
      responseFormat: "text",
      fetcher
    });

    return {
      ok: true,
      status: result.status,
      model: result.model,
      message: result.content.slice(0, 160),
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown model connection error";
    const statusMatch = /failed: (\d+)/.exec(message);
    return {
      ok: false,
      status: statusMatch ? Number(statusMatch[1]) : undefined,
      model: settings.modelApi.model,
      message,
      latencyMs: Date.now() - startedAt
    };
  }
}

export function parseJsonObjectFromModel(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(withoutFence) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Model output was not a JSON object.");
  }
  return parsed as Record<string, unknown>;
}
