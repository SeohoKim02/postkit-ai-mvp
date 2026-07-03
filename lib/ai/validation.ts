import { purposes, styles, supportedPlatforms } from "@/lib/constants";
import { AI_ERROR_MESSAGES, AI_TASK_TYPES, type AiStructuredResult } from "@/lib/ai/types";
import type { AiErrorCode, AiTaskType, CreateFormInput } from "@/types";

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errorCode: AiErrorCode; userMessage: string; warnings: string[] };

const MAX_TEXT = {
  productName: 100,
  keywords: 700,
  fileName: 180,
  id: 120
};
const sponsorDisclosureValues: CreateFormInput["sponsorDisclosure"][] = ["none", "sponsored", "gifted", "ad"];

function trimText(value: string | undefined, max: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function trimMultilineText(value: string | undefined, max: number) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function validId(value: string | undefined) {
  return !value || /^[a-z0-9-_:.]+$/i.test(value);
}

function splitCount(value: string | undefined) {
  return (value ?? "").split(/[,#\n]/).map((item) => item.trim()).filter(Boolean).length;
}

export function createAiRequestId(prefix = "ai") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function hashForIdempotency(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(36);
}

export function createGenerationIdempotencyKey(input: CreateFormInput) {
  const safeParts = [
    input.platform,
    input.purpose,
    input.style,
    trimText(input.productName, 80).toLowerCase(),
    trimText(input.requiredKeywords, 160).toLowerCase(),
    trimText(input.bannedKeywords, 120).toLowerCase(),
    input.sponsorDisclosure,
    input.commercialRelationshipType ?? "none",
    input.campaignId ?? "",
    input.scheduleId ?? "",
    input.uploadedFileName ? hashForIdempotency(input.uploadedFileName) : "no-file"
  ];

  return `gen-${hashForIdempotency(safeParts.join("|"))}`;
}

export function validateAiTasks(taskTypes: unknown): ValidationResult<AiTaskType[]> {
  if (taskTypes === undefined) {
    return { ok: true, value: [], warnings: [] };
  }

  if (!Array.isArray(taskTypes)) {
    return {
      ok: false,
      errorCode: "UNSUPPORTED_TASK",
      userMessage: AI_ERROR_MESSAGES.UNSUPPORTED_TASK,
      warnings: ["작업 유형은 배열이어야 합니다."]
    };
  }

  const invalid = taskTypes.filter((item) => !AI_TASK_TYPES.includes(item as AiTaskType));
  if (invalid.length > 0) {
    return {
      ok: false,
      errorCode: "UNSUPPORTED_TASK",
      userMessage: AI_ERROR_MESSAGES.UNSUPPORTED_TASK,
      warnings: ["지원하지 않는 작업 유형이 포함되어 있습니다."]
    };
  }

  return {
    ok: true,
    value: taskTypes.slice(0, 10) as AiTaskType[],
    warnings: []
  };
}

export function validateCreateInputForAi(input: unknown): ValidationResult<CreateFormInput> {
  const warnings: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      errorCode: "INVALID_INPUT",
      userMessage: "생성 입력값을 다시 확인해 주세요.",
      warnings: ["입력 객체가 올바르지 않습니다."]
    };
  }

  const raw = input as Partial<CreateFormInput>;
  if (!supportedPlatforms.includes(raw.platform as CreateFormInput["platform"])) {
    return { ok: false, errorCode: "INVALID_INPUT", userMessage: "플랫폼을 다시 선택해 주세요.", warnings };
  }

  if (!purposes.includes(raw.purpose as CreateFormInput["purpose"])) {
    return { ok: false, errorCode: "INVALID_INPUT", userMessage: "게시물 목적을 다시 선택해 주세요.", warnings };
  }

  if (!styles.includes(raw.style as CreateFormInput["style"])) {
    return { ok: false, errorCode: "INVALID_INPUT", userMessage: "스타일을 다시 선택해 주세요.", warnings };
  }

  const productName = trimText(raw.productName, MAX_TEXT.productName);
  if (!productName) {
    return { ok: false, errorCode: "INVALID_INPUT", userMessage: "제품명 또는 콘텐츠 이름을 입력해 주세요.", warnings };
  }

  if (!raw.uploadedFileName || typeof raw.uploadedFileName !== "string") {
    return { ok: false, errorCode: "INVALID_INPUT", userMessage: "사진 또는 영상 자료를 먼저 선택해 주세요.", warnings };
  }

  if (raw.requiredKeywords && raw.requiredKeywords.length > MAX_TEXT.keywords) {
    warnings.push("필수 키워드가 길어 앞부분만 생성 요청에 반영합니다.");
  }

  if (raw.bannedKeywords && raw.bannedKeywords.length > MAX_TEXT.keywords) {
    warnings.push("금지 키워드가 길어 앞부분만 생성 요청에 반영합니다.");
  }

  if (splitCount(raw.requiredKeywords) > 30 || splitCount(raw.bannedKeywords) > 30) {
    warnings.push("키워드 항목이 많아 일부만 반영될 수 있습니다.");
  }

  if (!validId(raw.campaignId) || !validId(raw.scheduleId)) {
    return { ok: false, errorCode: "INVALID_INPUT", userMessage: "연결된 캠페인 또는 일정 ID가 올바르지 않아요.", warnings };
  }

  const sponsorDisclosure = sponsorDisclosureValues.includes(raw.sponsorDisclosure as CreateFormInput["sponsorDisclosure"])
    ? (raw.sponsorDisclosure as CreateFormInput["sponsorDisclosure"])
    : "none";

  return {
    ok: true,
    value: {
      platform: raw.platform as CreateFormInput["platform"],
      purpose: raw.purpose as CreateFormInput["purpose"],
      style: raw.style as CreateFormInput["style"],
      productName,
      requiredKeywords: trimText(raw.requiredKeywords, MAX_TEXT.keywords),
      bannedKeywords: trimText(raw.bannedKeywords, MAX_TEXT.keywords),
      sponsorDisclosure,
      commercialRelationshipType: raw.commercialRelationshipType ?? "none",
      uploadedFileName: trimText(raw.uploadedFileName, MAX_TEXT.fileName),
      uploadedPreview: undefined,
      uploadedAssetId: validId(raw.uploadedAssetId) ? raw.uploadedAssetId : undefined,
      uploadedFileType: trimText(raw.uploadedFileType, 80),
      requiredHashtags: trimText(raw.requiredHashtags, MAX_TEXT.keywords),
      disclosureStyle: trimText(raw.disclosureStyle, 180),
      discountCode: trimText(raw.discountCode, 60),
      landingUrl: trimText(raw.landingUrl, 220),
      linkGuide: trimText(raw.linkGuide, 180),
      brandName: trimText(raw.brandName, 100),
      campaignId: trimText(raw.campaignId, MAX_TEXT.id),
      campaignName: trimText(raw.campaignName, 120),
      scheduleId: trimText(raw.scheduleId, MAX_TEXT.id),
      rightsConfirmedAt: trimText(raw.rightsConfirmedAt, 80)
    },
    warnings
  };
}

function normalizeArray(value: unknown, fallback: string[], maxItems: number, maxLength = 220, preserveLineBreaks = false) {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((item) => (preserveLineBreaks ? trimMultilineText(String(item), maxLength) : trimText(String(item), maxLength)))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function normalizeAiStructuredResult(value: Partial<AiStructuredResult>, fallback: AiStructuredResult): AiStructuredResult {
  return {
    captions: normalizeArray(value.captions, fallback.captions, 5, 420, true),
    hashtags: normalizeArray(value.hashtags, fallback.hashtags, 20, 80),
    ctas: normalizeArray(value.ctas, fallback.ctas, 5, 120),
    hooks: normalizeArray(value.hooks, fallback.hooks, 5, 120),
    thumbnailTexts: normalizeArray(value.thumbnailTexts, fallback.thumbnailTexts, 5, 80),
    disclosureText: trimText(value.disclosureText, 220) || fallback.disclosureText,
    summary: trimText(value.summary, 240) || fallback.summary,
    recommendedTemplateId: trimText(value.recommendedTemplateId, 80) || fallback.recommendedTemplateId,
    personalizationExplanation: trimText(value.personalizationExplanation, 240) || fallback.personalizationExplanation,
    warnings: normalizeArray(value.warnings, fallback.warnings, 8, 220),
    modelMetadata: value.modelMetadata ?? fallback.modelMetadata
  };
}

export function validateStructuredResult(result: AiStructuredResult): ValidationResult<AiStructuredResult> {
  if (result.captions.length === 0 || result.hashtags.length === 0 || result.ctas.length === 0) {
    return {
      ok: false,
      errorCode: "OUTPUT_VALIDATION_FAILED",
      userMessage: AI_ERROR_MESSAGES.OUTPUT_VALIDATION_FAILED,
      warnings: ["필수 결과 배열이 비어 있습니다."]
    };
  }

  return { ok: true, value: result, warnings: [] };
}
