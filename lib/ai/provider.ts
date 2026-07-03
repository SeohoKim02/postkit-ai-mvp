import { AI_ERROR_MESSAGES, type AiGenerateTextRequest, type AiProvider, type AiProviderResult } from "@/lib/ai/types";

function withRetryMetadata(result: AiProviderResult, retryCount: number): AiProviderResult {
  if (!result.ok || !result.generatedPackage || !result.structuredResult) {
    return {
      ...result,
      retryCount
    };
  }

  const retryWarning = retryCount > 0 ? ["문구 안정화를 위해 결과를 한 번 더 확인했습니다."] : [];
  const warnings = Array.from(new Set([...result.structuredResult.warnings, ...retryWarning]));
  const modelMetadata = {
    ...result.structuredResult.modelMetadata,
    retryCount
  };
  const ai = result.generatedPackage.ai
    ? {
        ...result.generatedPackage.ai,
        retryCount,
        warnings,
        modelMetadata
      }
    : undefined;

  return {
    ...result,
    retryCount,
    structuredResult: {
      ...result.structuredResult,
      warnings,
      modelMetadata
    },
    generatedPackage: {
      ...result.generatedPackage,
      ai,
      aiWarnings: warnings
    }
  };
}

export async function generateTextWithProvider(provider: AiProvider, request: AiGenerateTextRequest): Promise<AiProviderResult> {
  const taskTypes = request.prompt?.taskTypes ?? request.taskTypes ?? [];
  const unsupported = taskTypes.find((taskType) => !provider.supports(taskType));

  if (unsupported) {
    return {
      ok: false,
      errorCode: "UNSUPPORTED_TASK",
      userMessage: AI_ERROR_MESSAGES.UNSUPPORTED_TASK,
      usedFallback: false,
      retryCount: 0
    };
  }

  const maxRetry = request.allowSafeRetry === false ? 0 : 1;
  let lastResult: AiProviderResult | null = null;

  for (let attempt = 0; attempt <= maxRetry; attempt += 1) {
    const result = await provider.generateText(request).catch<AiProviderResult>(() => ({
      ok: false,
      errorCode: "PROVIDER_UNAVAILABLE",
      userMessage: AI_ERROR_MESSAGES.PROVIDER_UNAVAILABLE,
      usedFallback: false,
      retryCount: attempt
    }));
    lastResult = result;

    if (result.ok) {
      return withRetryMetadata(result, attempt);
    }
  }

  return {
    ok: false,
    errorCode: lastResult?.errorCode ?? "GENERATION_FAILED",
    userMessage: lastResult?.userMessage ?? AI_ERROR_MESSAGES.GENERATION_FAILED,
    usedFallback: lastResult?.usedFallback ?? false,
    retryCount: maxRetry
  };
}
