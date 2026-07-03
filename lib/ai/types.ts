import type {
  AiErrorCode,
  AiGenerationInfo,
  AiModelMetadata,
  AiProviderName,
  AiTaskType,
  BrandProfile,
  CreateFormInput,
  GeneratedPackage,
  PersonalizationProfile
} from "@/types";

export type {
  AiErrorCode,
  AiGenerationInfo,
  AiModelMetadata,
  AiProviderName,
  AiTaskType
};

export const AI_PROMPT_VERSION = "postkit-prompt-v1";

export const AI_TASK_TYPES: AiTaskType[] = [
  "caption_generation",
  "hashtag_generation",
  "cta_generation",
  "hook_generation",
  "thumbnail_text_generation",
  "disclosure_generation",
  "content_summary",
  "design_recommendation",
  "future_image_generation",
  "future_video_generation"
];

export const TEXT_GENERATION_TASKS: AiTaskType[] = [
  "caption_generation",
  "hashtag_generation",
  "cta_generation",
  "hook_generation",
  "thumbnail_text_generation",
  "disclosure_generation",
  "content_summary",
  "design_recommendation"
];

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  INVALID_INPUT: "입력값을 확인해 주세요.",
  INSUFFICIENT_CREDITS: "크레딧이 부족해요.",
  DUPLICATE_REQUEST: "이미 처리 중인 생성 요청이에요. 잠시만 기다려 주세요.",
  GENERATION_FAILED: "생성 중 문제가 생겼어요.",
  PROVIDER_UNAVAILABLE: "현재 생성 공급자를 사용할 수 없어요.",
  OUTPUT_VALIDATION_FAILED: "생성 결과 형식이 올바르지 않아요.",
  PRIVACY_RESTRICTION: "개인정보 보호 설정 때문에 생성 요청을 보낼 수 없어요.",
  UNSUPPORTED_TASK: "지원하지 않는 생성 작업이에요.",
  MISSING_CONFIGURATION: "생성 공급자 설정이 준비되지 않았어요.",
  TIMEOUT: "생성 요청 시간이 초과됐어요.",
  RATE_LIMIT: "생성 요청이 잠시 많아요. 다시 시도해 주세요.",
  AUTHENTICATION_ERROR: "생성 공급자 인증을 확인해 주세요.",
  INVALID_RESPONSE: "생성 결과 형식이 올바르지 않아요.",
  VALIDATION_FAILED: "생성 결과 검증에 실패했어요.",
  UNKNOWN_ERROR: "알 수 없는 문제가 생겼어요."
};

export type AiSafePromptContext = {
  platform: CreateFormInput["platform"];
  purpose: CreateFormInput["purpose"];
  style: CreateFormInput["style"];
  accountType?: string;
  brandName: string;
  category: string;
  productName: string;
  preferredTone: string;
  preferredCaptionLength?: string;
  preferredStyles: string[];
  frequentlyUsedHashtags: string[];
  requiredPhrases: string[];
  bannedPhrases: string[];
  preferredCTAStyle?: string;
  sponsoredDisclosureStyle: string;
  sponsorDisclosure: CreateFormInput["sponsorDisclosure"];
  commercialRelationshipType?: string;
  requiredKeywords: string[];
  bannedKeywords: string[];
  requiredHashtags: string[];
  discountCode?: string;
  landingUrlHost?: string;
  campaignName?: string;
  campaignId?: string;
  scheduleId?: string;
  designTemplateType?: string;
};

export type AiPrompt = {
  version: string;
  locale: "ko-KR";
  taskTypes: AiTaskType[];
  systemInstructions: string[];
  context: AiSafePromptContext;
  outputContract: {
    captions: number;
    hashtags: number;
    ctas: number;
    hooks: number;
    thumbnailTexts: number;
  };
  privacyNotes: string[];
};

export type AiStructuredResult = {
  captions: string[];
  hashtags: string[];
  ctas: string[];
  hooks: string[];
  thumbnailTexts: string[];
  disclosureText: string;
  summary: string;
  recommendedTemplateId?: string;
  personalizationExplanation: string;
  warnings: string[];
  modelMetadata: AiModelMetadata;
};

export type AiGenerateTextRequest = {
  requestId: string;
  idempotencyKey: string;
  input: CreateFormInput;
  brandProfile: BrandProfile;
  personalizationProfile?: PersonalizationProfile;
  taskTypes?: AiTaskType[];
  allowSafeRetry?: boolean;
  prompt?: AiPrompt;
};

export type AiGenerateTextResponse = {
  ok: boolean;
  requestId: string;
  idempotencyKey?: string;
  provider: AiProviderName;
  generatedPackage?: GeneratedPackage;
  structuredResult?: AiStructuredResult;
  ai?: AiGenerationInfo;
  errorCode?: AiErrorCode;
  userMessage?: string;
  usedFallback?: boolean;
  retryCount?: number;
};

export type AiRecommendDesignRequest = {
  requestId: string;
  input: CreateFormInput;
  brandProfile: BrandProfile;
  personalizationProfile?: PersonalizationProfile;
  prompt?: AiPrompt;
};

export type AiRecommendDesignResponse = {
  ok: boolean;
  requestId: string;
  provider: AiProviderName;
  recommendedTemplateId?: string;
  reason?: string;
  warnings: string[];
  errorCode?: AiErrorCode;
  userMessage?: string;
};

export type AiHealthResponse = {
  ok: boolean;
  provider: AiProviderName;
  mode: "mock" | "openai";
  selectedProvider?: AiProviderName;
  openaiConfigured?: boolean;
  fallbackAvailable?: boolean;
  supports: AiTaskType[];
  message: string;
};

export type AiProviderResult = {
  ok: boolean;
  structuredResult?: AiStructuredResult;
  generatedPackage?: GeneratedPackage;
  errorCode?: AiErrorCode;
  userMessage?: string;
  usedFallback: boolean;
  retryCount: number;
};

export interface AiProvider {
  name: AiProviderName;
  displayName: string;
  supports(taskType: AiTaskType): boolean;
  generateText(request: AiGenerateTextRequest): Promise<AiProviderResult>;
  recommendDesign(request: AiRecommendDesignRequest): Promise<AiRecommendDesignResponse>;
  health(): Promise<AiHealthResponse>;
}
