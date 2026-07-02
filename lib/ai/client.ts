"use client";

import { AI_ERROR_MESSAGES } from "@/lib/ai/types";
import type {
  AiErrorCode,
  AiGenerateTextRequest,
  AiGenerateTextResponse,
  AiHealthResponse,
  AiRecommendDesignRequest,
  AiRecommendDesignResponse
} from "@/lib/ai/types";

type JsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; errorCode: AiErrorCode; userMessage: string };

async function requestJson<T>(url: string, body?: unknown): Promise<JsonResult<T>> {
  try {
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => null)) as Partial<T> & {
      errorCode?: AiErrorCode;
      userMessage?: string;
    } | null;

    if (!response.ok || !payload) {
      return {
        ok: false,
        errorCode: payload?.errorCode ?? "UNKNOWN_ERROR",
        userMessage: payload?.userMessage ?? AI_ERROR_MESSAGES[payload?.errorCode ?? "UNKNOWN_ERROR"]
      };
    }

    return { ok: true, value: payload as T };
  } catch {
    return {
      ok: false,
      errorCode: "PROVIDER_UNAVAILABLE",
      userMessage: AI_ERROR_MESSAGES.PROVIDER_UNAVAILABLE
    };
  }
}

export async function generateUploadPackageWithAi(
  request: AiGenerateTextRequest
): Promise<AiGenerateTextResponse> {
  const response = await requestJson<AiGenerateTextResponse>("/api/ai/generate-text", request);

  if (!response.ok) {
    return {
      ok: false,
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      provider: "mock",
      errorCode: response.errorCode,
      userMessage: response.userMessage
    };
  }

  return response.value;
}

export async function recommendDesignWithAi(
  request: AiRecommendDesignRequest
): Promise<AiRecommendDesignResponse> {
  const response = await requestJson<AiRecommendDesignResponse>("/api/ai/recommend-design", request);

  if (!response.ok) {
    return {
      ok: false,
      requestId: request.requestId,
      provider: "mock",
      warnings: [],
      errorCode: response.errorCode,
      userMessage: response.userMessage
    };
  }

  return response.value;
}

export async function getAiHealth(): Promise<AiHealthResponse> {
  const response = await requestJson<AiHealthResponse>("/api/ai/health");

  if (!response.ok) {
    return {
      ok: false,
      provider: "mock",
      mode: "mock",
      supports: [],
      message: response.userMessage
    };
  }

  return response.value;
}
