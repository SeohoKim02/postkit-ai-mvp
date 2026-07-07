import { NextResponse } from "next/server";
import { buildUploadPackagePrompt } from "@/lib/ai/promptBuilder";
import { generateTextWithProvider } from "@/lib/ai/provider";
import { getAiProvider, getActiveProviderName } from "@/lib/ai/providerRegistry";
import { AI_ERROR_MESSAGES, TEXT_GENERATION_TASKS } from "@/lib/ai/types";
import { validateAiTasks, validateCreateInputForAi } from "@/lib/ai/validation";
import { checkAiRateLimit, getRateLimitMessage } from "@/lib/server/rateLimit";
import type { AiGenerateTextRequest } from "@/lib/ai/types";
import type { BrandProfile } from "@/types";

const fallbackBrandProfile: BrandProfile = {
  accountName: "PostKit Studio",
  category: "라이프스타일 / 커머스",
  voice: "친근함",
  feedMood: "밝고 정돈된 피드",
  primaryColor: "#ff6b4a",
  secondaryColor: "#edf9f6",
  favoriteHashtags: "#데일리 #사용후기 #소통",
  requiredPhrases: "저장해서 비교하기",
  bannedPhrases: "과장된 1위 표현",
  defaultDisclosure: "#광고 또는 #협찬을 첫 문장에 표시",
  preferredPlatform: "Instagram Feed"
};

function jsonError(errorCode: keyof typeof AI_ERROR_MESSAGES, status = 400, userMessage = AI_ERROR_MESSAGES[errorCode]) {
  return NextResponse.json(
    {
      ok: false,
      requestId: "unknown",
      provider: "mock",
      errorCode,
      userMessage
    },
    { status }
  );
}

export async function POST(request: Request) {
  const rateLimit = checkAiRateLimit(request, "generate-text");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        requestId: "unknown",
        provider: "mock",
        errorCode: "RATE_LIMIT",
        userMessage: getRateLimitMessage(rateLimit.scope)
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: Partial<AiGenerateTextRequest>;

  try {
    body = (await request.json()) as Partial<AiGenerateTextRequest>;
  } catch {
    return jsonError("INVALID_INPUT");
  }

  if (!body.requestId || !body.idempotencyKey) {
    return jsonError("INVALID_INPUT", 400, "생성 요청 ID가 필요해요.");
  }

  const inputValidation = validateCreateInputForAi(body.input);
  if (!inputValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        requestId: body.requestId,
        idempotencyKey: body.idempotencyKey,
        provider: "mock",
        errorCode: inputValidation.errorCode,
        userMessage: inputValidation.userMessage
      },
      { status: 400 }
    );
  }

  const tasksValidation = validateAiTasks(body.taskTypes ?? TEXT_GENERATION_TASKS);
  if (!tasksValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        requestId: body.requestId,
        idempotencyKey: body.idempotencyKey,
        provider: "mock",
        errorCode: tasksValidation.errorCode,
        userMessage: tasksValidation.userMessage
      },
      { status: 400 }
    );
  }

  const provider = getAiProvider(getActiveProviderName());
  const brandProfile = body.brandProfile ?? fallbackBrandProfile;
  const prompt = buildUploadPackagePrompt(inputValidation.value, brandProfile, body.personalizationProfile, {
    taskTypes: tasksValidation.value.length ? tasksValidation.value : TEXT_GENERATION_TASKS
  });
  const result = await generateTextWithProvider(provider, {
    requestId: body.requestId,
    idempotencyKey: body.idempotencyKey,
    input: inputValidation.value,
    brandProfile,
    personalizationProfile: body.personalizationProfile,
    taskTypes: tasksValidation.value,
    allowSafeRetry: body.allowSafeRetry,
    prompt
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        requestId: body.requestId,
        idempotencyKey: body.idempotencyKey,
        provider: provider.name,
        errorCode: result.errorCode ?? "GENERATION_FAILED",
        userMessage: result.userMessage ?? AI_ERROR_MESSAGES.GENERATION_FAILED,
        usedFallback: result.usedFallback,
        retryCount: result.retryCount
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: body.requestId,
    idempotencyKey: body.idempotencyKey,
    provider: provider.name,
    generatedPackage: result.generatedPackage,
    structuredResult: result.structuredResult,
    ai: result.generatedPackage?.ai,
    usedFallback: result.usedFallback,
    retryCount: result.retryCount
  });
}
