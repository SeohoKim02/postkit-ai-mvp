import { NextResponse } from "next/server";
import { buildUploadPackagePrompt } from "@/lib/ai/promptBuilder";
import { getAiProvider, getActiveProviderName } from "@/lib/ai/providerRegistry";
import { AI_ERROR_MESSAGES } from "@/lib/ai/types";
import { validateCreateInputForAi } from "@/lib/ai/validation";
import type { AiRecommendDesignRequest } from "@/lib/ai/types";
import type { BrandProfile } from "@/types";

const fallbackBrandProfile: BrandProfile = {
  accountName: "PostKit Studio",
  category: "라이프스타일 / 커머스",
  voice: "친근함",
  feedMood: "밝고 정돈된 피드",
  primaryColor: "#ff6b4a",
  secondaryColor: "#edf9f6",
  favoriteHashtags: "#데일리 #추천템 #소통",
  requiredPhrases: "저장해두고 보기",
  bannedPhrases: "과장된 1위 표현",
  defaultDisclosure: "#광고 또는 #협찬을 첫 문장에 표시",
  preferredPlatform: "Instagram Feed"
};

export async function POST(request: Request) {
  let body: Partial<AiRecommendDesignRequest>;

  try {
    body = (await request.json()) as Partial<AiRecommendDesignRequest>;
  } catch {
    return NextResponse.json(
      { ok: false, requestId: "unknown", provider: "mock", warnings: [], errorCode: "INVALID_INPUT", userMessage: AI_ERROR_MESSAGES.INVALID_INPUT },
      { status: 400 }
    );
  }

  if (!body.requestId) {
    return NextResponse.json(
      { ok: false, requestId: "unknown", provider: "mock", warnings: [], errorCode: "INVALID_INPUT", userMessage: "디자인 추천 요청 ID가 필요해요." },
      { status: 400 }
    );
  }

  const inputValidation = validateCreateInputForAi(body.input);
  if (!inputValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        requestId: body.requestId,
        provider: "mock",
        warnings: [],
        errorCode: inputValidation.errorCode,
        userMessage: inputValidation.userMessage
      },
      { status: 400 }
    );
  }

  const provider = getAiProvider(getActiveProviderName());
  const brandProfile = body.brandProfile ?? fallbackBrandProfile;
  const prompt = buildUploadPackagePrompt(inputValidation.value, brandProfile, body.personalizationProfile, {
    taskTypes: ["design_recommendation"]
  });

  const result = await provider.recommendDesign({
      requestId: body.requestId,
      input: inputValidation.value,
      brandProfile,
      personalizationProfile: body.personalizationProfile,
      prompt
    }).catch(() => ({
      ok: false,
      requestId: body.requestId ?? "unknown",
      provider: provider.name,
      warnings: [],
      errorCode: "PROVIDER_UNAVAILABLE" as const,
      userMessage: AI_ERROR_MESSAGES.PROVIDER_UNAVAILABLE
    }));

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
