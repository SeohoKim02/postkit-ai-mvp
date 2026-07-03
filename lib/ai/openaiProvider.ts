import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError
} from "openai";
import { recommendDesignTemplate, designTemplates } from "@/lib/designTemplates";
import { generateMockUploadPackage } from "@/lib/mockAi";
import { mockProvider } from "@/lib/ai/mockProvider";
import {
  AI_ERROR_MESSAGES,
  AI_PROMPT_VERSION,
  type AiGenerateTextRequest,
  type AiProvider,
  type AiProviderResult,
  type AiRecommendDesignRequest,
  type AiRecommendDesignResponse,
  type AiStructuredResult
} from "@/lib/ai/types";
import { normalizeAiStructuredResult, validateStructuredResult } from "@/lib/ai/validation";
import type { AiErrorCode, AiGenerationInfo, AiModelMetadata, AiTaskType } from "@/types";

type OpenAiConfig = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
};

type OpenAiCaptionType = "product_intro" | "usage" | "target" | "experience" | "action";

type OpenAiCaption = {
  type: OpenAiCaptionType;
  label: string;
  text: string;
};

type OpenAiUploadPackageOutput = {
  platform: string;
  captions: OpenAiCaption[];
  hashtags: string[];
  cta: string[];
  hooks: string[];
  thumbnailTexts: string[];
  disclosure: string;
  summary: string;
  recommendedTemplateId: string;
  warnings: string[];
};

type OpenAiDesignOutput = {
  recommendedTemplateId: string;
  reason: string;
  warnings: string[];
};

const supportedTasks: AiTaskType[] = [
  "caption_generation",
  "hashtag_generation",
  "cta_generation",
  "hook_generation",
  "thumbnail_text_generation",
  "disclosure_generation",
  "content_summary",
  "design_recommendation"
];

const defaultTimeoutMs = 20000;
const defaultMaxOutputTokens = 2500;
const designTemplateIds = designTemplates.map((template) => template.id);

const uploadPackageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["platform", "captions", "hashtags", "cta", "hooks", "thumbnailTexts", "disclosure", "summary", "recommendedTemplateId", "warnings"],
  properties: {
    platform: {
      type: "string",
      enum: ["instagram_feed", "instagram_story", "instagram_reels", "tiktok", "youtube_shorts", "facebook", "x"]
    },
    captions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "label", "text"],
        properties: {
          type: {
            type: "string",
            enum: ["product_intro", "usage", "target", "experience", "action"]
          },
          label: { type: "string", minLength: 1, maxLength: 40 },
          text: { type: "string", minLength: 1, maxLength: 420 }
        }
      }
    },
    hashtags: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 80 }
    },
    cta: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 120 }
    },
    hooks: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 120 }
    },
    thumbnailTexts: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 80 }
    },
    disclosure: { type: "string", minLength: 1, maxLength: 220 },
    summary: { type: "string", minLength: 1, maxLength: 240 },
    recommendedTemplateId: {
      type: "string",
      enum: designTemplateIds
    },
    warnings: {
      type: "array",
      minItems: 0,
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 220 }
    }
  }
};

const designRecommendationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["recommendedTemplateId", "reason", "warnings"],
  properties: {
    recommendedTemplateId: {
      type: "string",
      enum: designTemplateIds
    },
    reason: { type: "string", minLength: 1, maxLength: 240 },
    warnings: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 220 }
    }
  }
};

function parsePositiveInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function getOpenAiConfig(): OpenAiConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();

  if (!apiKey || !model) {
    return null;
  }

  return {
    apiKey,
    model,
    timeoutMs: parsePositiveInt(process.env.AI_TIMEOUT_MS, defaultTimeoutMs, 3000, 60000),
    maxOutputTokens: parsePositiveInt(process.env.AI_MAX_OUTPUT_TOKENS, defaultMaxOutputTokens, 500, 6000)
  };
}

export function isOpenAiConfigured() {
  return Boolean(getOpenAiConfig());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toShortString(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function toStringArray(value: unknown, maxItems: number, maxLength: number) {
  return (Array.isArray(value) ? value : [])
    .map((item) => toShortString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function toCaptionArray(value: unknown): OpenAiCaption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): OpenAiCaption | null => {
      if (!isRecord(item)) {
        return null;
      }

      const type = toShortString(item.type, 40);
      if (!["product_intro", "usage", "target", "experience", "action"].includes(type)) {
        return null;
      }

      return {
        type: type as OpenAiCaptionType,
        label: toShortString(item.label, 40),
        text: toShortString(item.text, 420)
      };
    })
    .filter((item): item is OpenAiCaption => Boolean(item));
}

function parseUploadOutput(value: unknown): OpenAiUploadPackageOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  const captions = toCaptionArray(value.captions);
  const recommendedTemplateId = toShortString(value.recommendedTemplateId, 80);

  return {
    platform: toShortString(value.platform, 40),
    captions,
    hashtags: toStringArray(value.hashtags, 20, 80),
    cta: toStringArray(value.cta, 5, 120),
    hooks: toStringArray(value.hooks, 5, 120),
    thumbnailTexts: toStringArray(value.thumbnailTexts, 5, 80),
    disclosure: toShortString(value.disclosure, 220),
    summary: toShortString(value.summary, 240),
    recommendedTemplateId: designTemplateIds.includes(recommendedTemplateId) ? recommendedTemplateId : designTemplateIds[0],
    warnings: toStringArray(value.warnings, 8, 220)
  };
}

function parseDesignOutput(value: unknown): OpenAiDesignOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  const recommendedTemplateId = toShortString(value.recommendedTemplateId, 80);

  return {
    recommendedTemplateId: designTemplateIds.includes(recommendedTemplateId) ? recommendedTemplateId : designTemplateIds[0],
    reason: toShortString(value.reason, 240),
    warnings: toStringArray(value.warnings, 5, 220)
  };
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function platformSlug(platform: string) {
  switch (platform) {
    case "Instagram Story":
      return "instagram_story";
    case "Instagram Reels":
    case "Reels Thumbnail":
      return "instagram_reels";
    case "TikTok":
      return "tiktok";
    case "YouTube Shorts":
      return "youtube_shorts";
    case "Facebook":
      return "facebook";
    case "X":
      return "x";
    case "Instagram Feed":
    default:
      return "instagram_feed";
  }
}

function buildMinimalPromptInput(request: AiGenerateTextRequest | AiRecommendDesignRequest) {
  const context = request.prompt?.context;

  return {
    platform: request.input.platform,
    purpose: request.input.purpose,
    style: request.input.style,
    productName: toShortString(request.input.productName, 100),
    brandName: toShortString(request.input.brandName || request.brandProfile.accountName, 100),
    category: toShortString(request.brandProfile.category, 100),
    preferredTone: toShortString(context?.preferredTone || request.input.style, 100),
    accountType: toShortString(context?.accountType, 80),
    sponsorDisclosure: request.input.sponsorDisclosure,
    commercialRelationshipType: toShortString(request.input.commercialRelationshipType, 80),
    requiredKeywords: toStringArray(request.input.requiredKeywords.split(/[,#\n]/), 12, 80),
    bannedKeywords: toStringArray(request.input.bannedKeywords.split(/[,#\n]/), 12, 80),
    requiredHashtags: toStringArray((request.input.requiredHashtags ?? "").split(/[,#\n]/), 10, 80),
    discountCode: toShortString(request.input.discountCode, 60),
    linkGuide: toShortString(request.input.linkGuide, 160),
    disclosureStyle: toShortString(request.input.disclosureStyle || request.brandProfile.defaultDisclosure, 160)
  };
}

function buildUploadInstructions(request: AiGenerateTextRequest, retry: boolean) {
  const baseInstructions = request.prompt?.systemInstructions ?? [];
  const feedRules = [
    "Instagram Feed captions must have distinct meanings: product intro, usage scene, target/gift, experience/review, and action/purchase.",
    "Do not repeat the same CTA, same sentence ending, or same advantage across every caption.",
    "Use verbs that match the product category: food uses eat/taste/pair/store language, fashion uses wear/match/wash, beauty uses apply/absorb/lasting, household uses install/place/adjust/store, cafe drinks use drink/order/take out.",
    "Do not invent prices, ingredients, medical effects, awards, sales volume, delivery guarantees, or claims the user did not provide."
  ];
  const retryInstruction = retry ? ["The previous output failed validation. Rewrite with more concrete, non-repetitive, role-specific copy and valid JSON only."] : [];

  return [...baseInstructions, ...feedRules, ...retryInstruction].join("\n");
}

function buildFallbackStructuredResult(request: AiGenerateTextRequest, metadata: AiModelMetadata): Promise<AiStructuredResult> {
  return generateMockUploadPackage(request.input, request.brandProfile, request.personalizationProfile).then((generatedPackage) => {
    const recommendation = recommendDesignTemplate(generatedPackage, request.personalizationProfile);

    return {
      captions: generatedPackage.captions,
      hashtags: generatedPackage.hashtags,
      ctas: generatedPackage.ctas,
      hooks: generatedPackage.hooks,
      thumbnailTexts: generatedPackage.thumbnails,
      disclosureText: generatedPackage.disclosure,
      summary: `${request.input.productName || "콘텐츠"}를 ${request.input.platform}에 올리기 위한 업로드 문구입니다.`,
      recommendedTemplateId: recommendation.template.id,
      personalizationExplanation: generatedPackage.personalization?.note ?? "브랜드 설정과 선택한 스타일을 반영했습니다.",
      warnings: [],
      modelMetadata: metadata
    };
  });
}

function hasForbiddenPhrase(value: string) {
  return /PostKit|Studio|MockProvider|AI가 작성|선택한 캡션|추천 템플릿|친구에게 말하듯|자연스러운 추천|오늘 이 포인트|저장해두고 보기|핵심은/i.test(value);
}

function hasDuplicateText(items: string[]) {
  const normalized = items.map((item) => item.replace(/\s+/g, " ").trim().toLocaleLowerCase("ko-KR"));
  return normalized.some((item, index) => item && normalized.indexOf(item) !== index);
}

function hasProductReference(value: string, productName: string) {
  const product = productName.trim().toLocaleLowerCase("ko-KR");
  if (!product) {
    return true;
  }

  return value.toLocaleLowerCase("ko-KR").includes(product);
}

function hasBrokenParticle(value: string) {
  return /캐비어을|제품이를|셔츠을|[가-힣A-Za-z0-9]+을을|[가-힣A-Za-z0-9]+를를|[가-힣A-Za-z0-9]+은는/.test(value);
}

function validateOpenAiStructuredResult(result: AiStructuredResult, request: AiGenerateTextRequest) {
  const basic = validateStructuredResult(result);
  if (!basic.ok) {
    return basic;
  }

  const joined = [
    ...result.captions,
    ...result.ctas,
    ...result.hooks,
    ...result.thumbnailTexts,
    result.disclosureText
  ].join("\n");

  if (hasForbiddenPhrase(joined) || hasBrokenParticle(joined)) {
    return {
      ok: false as const,
      errorCode: "VALIDATION_FAILED" as const,
      userMessage: AI_ERROR_MESSAGES.VALIDATION_FAILED,
      warnings: ["금지 표현 또는 어색한 조사 표현이 포함되었습니다."]
    };
  }

  if (hasDuplicateText(result.captions) || hasDuplicateText(result.ctas)) {
    return {
      ok: false as const,
      errorCode: "VALIDATION_FAILED" as const,
      userMessage: AI_ERROR_MESSAGES.VALIDATION_FAILED,
      warnings: ["동일하거나 유사한 결과 문구가 반복되었습니다."]
    };
  }

  if (result.captions.length > 0 && !result.captions.some((caption) => hasProductReference(caption, request.input.productName))) {
    return {
      ok: false as const,
      errorCode: "VALIDATION_FAILED" as const,
      userMessage: AI_ERROR_MESSAGES.VALIDATION_FAILED,
      warnings: ["제품명 또는 주제가 결과에 충분히 반영되지 않았습니다."]
    };
  }

  return basic;
}

function classifyOpenAiError(error: unknown): AiErrorCode {
  if (error instanceof APIConnectionTimeoutError) {
    return "TIMEOUT";
  }
  if (error instanceof RateLimitError) {
    return "RATE_LIMIT";
  }
  if (error instanceof AuthenticationError) {
    return "AUTHENTICATION_ERROR";
  }
  if (error instanceof APIError) {
    return "PROVIDER_UNAVAILABLE";
  }

  return "PROVIDER_UNAVAILABLE";
}

async function fallbackToMock(request: AiGenerateTextRequest, retryCount: number): Promise<AiProviderResult> {
  const fallbackResult = await mockProvider.generateText({ ...request, allowSafeRetry: false });

  if (!fallbackResult.ok) {
    return {
      ...fallbackResult,
      usedFallback: true,
      retryCount
    };
  }

  return {
    ...fallbackResult,
    usedFallback: true,
    retryCount,
    generatedPackage: fallbackResult.generatedPackage
      ? {
          ...fallbackResult.generatedPackage,
          aiFallbackUsed: true,
          ai: fallbackResult.generatedPackage.ai
            ? {
                ...fallbackResult.generatedPackage.ai,
                usedFallback: true,
                retryCount
              }
            : undefined
        }
      : undefined
  };
}

async function callOpenAiForUpload(config: OpenAiConfig, request: AiGenerateTextRequest, retry: boolean) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
    maxRetries: 0
  });
  const response = await client.responses.create(
    {
      model: config.model,
      input: JSON.stringify(buildMinimalPromptInput(request)),
      instructions: buildUploadInstructions(request, retry),
      max_output_tokens: config.maxOutputTokens,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "postkit_upload_package",
          description: "Structured SNS upload copy package for PostKit.",
          schema: uploadPackageSchema,
          strict: true
        }
      }
    },
    {
      timeout: config.timeoutMs,
      maxRetries: 0,
      idempotencyKey: request.idempotencyKey
    }
  );

  if (response.error || response.incomplete_details) {
    return null;
  }

  return parseUploadOutput(parseJsonObject(response.output_text));
}

function mapOpenAiOutputToStructuredResult(
  output: OpenAiUploadPackageOutput,
  fallback: AiStructuredResult,
  metadata: AiModelMetadata
): AiStructuredResult {
  return normalizeAiStructuredResult(
    {
      captions: output.captions.map((caption) => caption.text),
      hashtags: output.hashtags,
      ctas: output.cta,
      hooks: output.hooks,
      thumbnailTexts: output.thumbnailTexts,
      disclosureText: output.disclosure,
      summary: output.summary,
      recommendedTemplateId: output.recommendedTemplateId,
      personalizationExplanation: fallback.personalizationExplanation,
      warnings: output.warnings,
      modelMetadata: metadata
    },
    fallback
  );
}

async function generateWithOpenAi(config: OpenAiConfig, request: AiGenerateTextRequest, startedAt: number): Promise<AiProviderResult> {
  let lastErrorCode: AiErrorCode = "INVALID_RESPONSE";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const output = await callOpenAiForUpload(config, request, attempt > 0);
      if (!output || output.platform !== platformSlug(request.input.platform)) {
        lastErrorCode = "INVALID_RESPONSE";
        continue;
      }

      const metadata: AiModelMetadata = {
        provider: "openai",
        model: config.model,
        promptVersion: request.prompt?.version ?? AI_PROMPT_VERSION,
        requestId: request.requestId,
        retryCount: attempt,
        durationMs: Date.now() - startedAt
      };
      const fallback = await buildFallbackStructuredResult(request, metadata);
      const structuredResult = mapOpenAiOutputToStructuredResult(output, fallback, metadata);
      const validation = validateOpenAiStructuredResult(structuredResult, request);

      if (!validation.ok) {
        lastErrorCode = validation.errorCode;
        continue;
      }

      const generatedPackage = await generateMockUploadPackage(request.input, request.brandProfile, request.personalizationProfile);
      const ai: AiGenerationInfo = {
        requestId: request.requestId,
        provider: "openai",
        taskTypes: request.prompt?.taskTypes ?? request.taskTypes ?? [],
        promptVersion: metadata.promptVersion,
        usedFallback: false,
        retryCount: attempt,
        personalizationApplied: Boolean(request.personalizationProfile),
        recommendedTemplateId: structuredResult.recommendedTemplateId,
        summary: structuredResult.summary,
        warnings: structuredResult.warnings,
        modelMetadata: metadata
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
        retryCount: attempt
      };
    } catch (error) {
      lastErrorCode = classifyOpenAiError(error);
      break;
    }
  }

  const fallback = await fallbackToMock(request, 1);
  if (fallback.ok) {
    return fallback;
  }

  return {
    ok: false,
    errorCode: lastErrorCode,
    userMessage: AI_ERROR_MESSAGES.GENERATION_FAILED,
    usedFallback: true,
    retryCount: 1
  };
}

async function callOpenAiForDesign(config: OpenAiConfig, request: AiRecommendDesignRequest) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
    maxRetries: 0
  });
  const response = await client.responses.create(
    {
      model: config.model,
      input: JSON.stringify(buildMinimalPromptInput(request)),
      instructions: [
        "Choose one design template id for this SNS upload package.",
        "Return only structured JSON. Do not include API details, provider names, or internal service names."
      ].join("\n"),
      max_output_tokens: Math.min(800, config.maxOutputTokens),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "postkit_design_recommendation",
          description: "Structured design template recommendation.",
          schema: designRecommendationSchema,
          strict: true
        }
      }
    },
    {
      timeout: config.timeoutMs,
      maxRetries: 0
    }
  );

  if (response.error || response.incomplete_details) {
    return null;
  }

  return parseDesignOutput(parseJsonObject(response.output_text));
}

export const openAiProvider: AiProvider = {
  name: "openai",
  displayName: "OpenAI Provider",

  supports(taskType) {
    return supportedTasks.includes(taskType);
  },

  async generateText(request) {
    const config = getOpenAiConfig();
    if (!config) {
      return fallbackToMock(request, 0);
    }

    return generateWithOpenAi(config, request, Date.now());
  },

  async recommendDesign(request): Promise<AiRecommendDesignResponse> {
    const config = getOpenAiConfig();
    if (!config) {
      return mockProvider.recommendDesign(request);
    }

    try {
      const output = await callOpenAiForDesign(config, request);
      if (!output?.recommendedTemplateId || !output.reason) {
        return mockProvider.recommendDesign(request);
      }

      return {
        ok: true,
        requestId: request.requestId,
        provider: "openai",
        recommendedTemplateId: output.recommendedTemplateId,
        reason: output.reason,
        warnings: output.warnings
      };
    } catch {
      return mockProvider.recommendDesign(request);
    }
  },

  async health() {
    return {
      ok: true,
      provider: "openai" as const,
      mode: "openai" as const,
      selectedProvider: "openai" as const,
      openaiConfigured: isOpenAiConfigured(),
      fallbackAvailable: true,
      supports: supportedTasks,
      message: "AI 생성 계층이 준비되어 있습니다."
    };
  }
};
