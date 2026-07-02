import { recommendDesignTemplate } from "@/lib/designTemplates";
import { generateMockUploadPackage } from "@/lib/mockAi";
import { AI_PROMPT_VERSION, type AiProvider, type AiProviderResult, type AiRecommendDesignRequest } from "@/lib/ai/types";
import { normalizeAiStructuredResult, validateStructuredResult } from "@/lib/ai/validation";
import type { AiGenerationInfo, AiModelMetadata } from "@/types";

function shouldSimulateFailure(value: string) {
  return /\bmock[_-]?fail\b/i.test(value);
}

function makeSummary(productName: string, platform: string, purpose: string) {
  return `${productName || "콘텐츠"}를 ${platform}에 올리기 위한 ${purpose} 업로드 패키지입니다.`;
}

export const mockProvider: AiProvider = {
  name: "mock",
  displayName: "PostKit MockProvider",

  supports(taskType) {
    return taskType !== "future_image_generation" && taskType !== "future_video_generation";
  },

  async generateText(request): Promise<AiProviderResult> {
    const startedAt = Date.now();
    const prompt = request.prompt;
    const input = request.input;

    if (shouldSimulateFailure(`${input.productName} ${input.requiredKeywords} ${input.bannedKeywords}`)) {
      return {
        ok: false,
        errorCode: "GENERATION_FAILED",
        userMessage: "MockProvider 테스트 실패가 발생했어요.",
        usedFallback: false,
        retryCount: 0
      };
    }

    const generatedPackage = await generateMockUploadPackage(input, request.brandProfile, request.personalizationProfile);
    const recommendation = recommendDesignTemplate(generatedPackage, request.personalizationProfile);
    const modelMetadata: AiModelMetadata = {
      provider: "mock",
      model: "postkit-mock-text-v1",
      promptVersion: prompt?.version ?? AI_PROMPT_VERSION,
      requestId: request.requestId,
      retryCount: 0,
      durationMs: Date.now() - startedAt
    };
    const fallbackStructured = {
      captions: generatedPackage.captions,
      hashtags: generatedPackage.hashtags,
      ctas: generatedPackage.ctas,
      hooks: generatedPackage.hooks,
      thumbnailTexts: generatedPackage.thumbnails,
      disclosureText: generatedPackage.disclosure,
      summary: makeSummary(input.productName, input.platform, input.purpose),
      recommendedTemplateId: recommendation.template.id,
      personalizationExplanation: generatedPackage.personalization?.note ?? "브랜드 설정과 선택한 스타일을 반영했어요.",
      warnings: prompt?.context.commercialRelationshipType && prompt.context.commercialRelationshipType !== "none" && input.sponsorDisclosure === "none"
        ? ["경제적 이해관계가 선택되어 있어 광고 표시 문구를 최종 게시 전 직접 확인해 주세요."]
        : [],
      modelMetadata
    };
    const structuredResult = normalizeAiStructuredResult(fallbackStructured, fallbackStructured);
    const validation = validateStructuredResult(structuredResult);

    if (!validation.ok) {
      return {
        ok: false,
        errorCode: validation.errorCode,
        userMessage: validation.userMessage,
        usedFallback: false,
        retryCount: 0
      };
    }

    const ai: AiGenerationInfo = {
      requestId: request.requestId,
      provider: "mock",
      taskTypes: prompt?.taskTypes ?? request.taskTypes ?? [],
      promptVersion: modelMetadata.promptVersion,
      usedFallback: false,
      retryCount: 0,
      personalizationApplied: Boolean(request.personalizationProfile),
      recommendedTemplateId: structuredResult.recommendedTemplateId,
      summary: structuredResult.summary,
      warnings: structuredResult.warnings,
      modelMetadata
    };

    return {
      ok: true,
      structuredResult,
      generatedPackage: {
        ...generatedPackage,
        captions: structuredResult.captions,
        hashtags: structuredResult.hashtags,
        ctas: structuredResult.ctas,
        hooks: structuredResult.hooks,
        thumbnails: structuredResult.thumbnailTexts,
        disclosure: structuredResult.disclosureText,
        ai,
        aiRequestId: request.requestId,
        aiWarnings: structuredResult.warnings,
        aiFallbackUsed: false,
        recommendedDesignTemplateId: structuredResult.recommendedTemplateId
      },
      usedFallback: false,
      retryCount: 0
    };
  },

  async recommendDesign(request: AiRecommendDesignRequest) {
    const generatedShell = {
      id: request.requestId,
      title: request.input.productName || "디자인 추천",
      createdAt: new Date().toISOString(),
      platform: request.input.platform,
      purpose: request.input.purpose,
      style: request.input.style,
      usedCredits: 0,
      captions: [],
      hashtags: [],
      ctas: [],
      hooks: [],
      thumbnails: [],
      disclosure: "",
      checklist: [],
      packageItems: [],
      input: request.input
    };
    const recommendation = recommendDesignTemplate(generatedShell, request.personalizationProfile);

    return {
      ok: true,
      requestId: request.requestId,
      provider: "mock",
      recommendedTemplateId: recommendation.template.id,
      reason: recommendation.reason,
      warnings: []
    };
  },

  async health() {
    return {
      ok: true,
      provider: "mock",
      mode: "mock",
      supports: [
        "caption_generation",
        "hashtag_generation",
        "cta_generation",
        "hook_generation",
        "thumbnail_text_generation",
        "disclosure_generation",
        "content_summary",
        "design_recommendation"
      ],
      message: "MockProvider가 준비되어 있어요. 외부 AI API는 호출하지 않습니다."
    };
  }
};
