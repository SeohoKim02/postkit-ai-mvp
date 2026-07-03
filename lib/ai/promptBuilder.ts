import { purposes, styles, supportedPlatforms } from "@/lib/constants";
import { AI_PROMPT_VERSION, TEXT_GENERATION_TASKS, type AiPrompt, type AiSafePromptContext } from "@/lib/ai/types";
import type { AiTaskType, BrandProfile, CreateFormInput, PersonalizationProfile } from "@/types";

function truncate(value: string | undefined, max = 180) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function splitList(value: string | undefined, maxItems = 12, maxLength = 40) {
  return (value ?? "")
    .split(/[,#\n]/)
    .map((item) => truncate(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeHashTags(value: string[] | undefined, maxItems = 10) {
  return (value ?? [])
    .map((item) => truncate(item, 32))
    .filter(Boolean)
    .map((item) => `#${item.replace(/^#/, "").replace(/\s+/g, "")}`)
    .slice(0, maxItems);
}

function landingHost(value: string | undefined) {
  if (!value) return undefined;

  try {
    return new URL(value).host.slice(0, 80);
  } catch {
    return undefined;
  }
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function buildSafePromptContext(
  input: CreateFormInput,
  brand: BrandProfile,
  personalization?: PersonalizationProfile,
  options: { designTemplateType?: string } = {}
): AiSafePromptContext {
  return {
    platform: supportedPlatforms.includes(input.platform) ? input.platform : "Instagram Feed",
    purpose: purposes.includes(input.purpose) ? input.purpose : "Product Promotion",
    style: styles.includes(input.style) ? input.style : "친구한테 말하듯",
    accountType: personalization?.accountType,
    brandName: truncate(input.brandName || brand.accountName, 80),
    category: truncate(brand.category, 80),
    productName: truncate(input.productName, 100),
    preferredTone: truncate(personalization?.preferredTone || brand.voice, 80),
    preferredCaptionLength: personalization?.preferredCaptionLength,
    preferredStyles: unique([...(personalization?.preferredStyles ?? []), input.style]).slice(0, 5),
    frequentlyUsedHashtags: unique([
      ...safeHashTags(personalization?.frequentlyUsedHashtags),
      ...safeHashTags(splitList(brand.favoriteHashtags))
    ]).slice(0, 12),
    requiredPhrases: unique([
      ...splitList(brand.requiredPhrases, 8, 48),
      ...(personalization?.requiredPhrases ?? []).map((item) => truncate(item, 48))
    ]).filter(Boolean).slice(0, 12),
    bannedPhrases: unique([
      ...splitList(brand.bannedPhrases, 8, 48),
      ...splitList(input.bannedKeywords, 10, 48),
      ...(personalization?.bannedPhrases ?? []).map((item) => truncate(item, 48))
    ]).filter(Boolean).slice(0, 16),
    preferredCTAStyle: personalization?.preferredCTAStyle,
    sponsoredDisclosureStyle: truncate(personalization?.sponsoredDisclosureStyle || input.disclosureStyle || brand.defaultDisclosure, 140),
    sponsorDisclosure: input.sponsorDisclosure,
    commercialRelationshipType: input.commercialRelationshipType,
    requiredKeywords: splitList(input.requiredKeywords, 14, 48),
    bannedKeywords: splitList(input.bannedKeywords, 14, 48),
    requiredHashtags: safeHashTags(splitList(input.requiredHashtags, 12, 32), 12),
    discountCode: truncate(input.discountCode, 40),
    landingUrlHost: landingHost(input.landingUrl),
    campaignName: truncate(input.campaignName, 100),
    campaignId: /^[a-z0-9-_]+$/i.test(input.campaignId ?? "") ? input.campaignId : undefined,
    scheduleId: /^[a-z0-9-_]+$/i.test(input.scheduleId ?? "") ? input.scheduleId : undefined,
    designTemplateType: truncate(options.designTemplateType, 80)
  };
}

export function buildUploadPackagePrompt(
  input: CreateFormInput,
  brand: BrandProfile,
  personalization?: PersonalizationProfile,
  options: { taskTypes?: AiTaskType[]; designTemplateType?: string } = {}
): AiPrompt {
  return {
    version: AI_PROMPT_VERSION,
    locale: "ko-KR",
    taskTypes: options.taskTypes?.length ? options.taskTypes : TEXT_GENERATION_TASKS,
    systemInstructions: [
      "PostKit은 SNS 업로드 직전 패키지를 만드는 서비스입니다.",
      "결과 본문은 작성 가이드가 아니라 사용자가 SNS 본문에 그대로 붙여넣을 수 있는 완성형 게시글 문구로 작성합니다.",
      "제품명 또는 주제는 첫 문장이나 핵심 문장에 반드시 자연스럽게 포함합니다.",
      "장점은 나열하지 말고 사용 장면 속 문장으로 녹여 씁니다.",
      "캡션 본문에는 앱 이름, PostKit, Studio, 생성, AI, 샘플 AI, 추천 템플릿, 작성 조언, 선택 안내, 생성기가 자기 작업을 설명하는 문장을 넣지 않습니다.",
      "자연스럽게, 친구에게 말하듯, 핵심은, 오늘 이 포인트만 기억, 작은 차이, 분위기를 바꿔요, 일상 속, 매일 손이 가는, 편하고 예쁘게, 기억해 주세요 같은 지시문이나 추상 표현을 결과에 넣지 않습니다.",
      "결과는 선택된 플랫폼 하나에 맞는 한국어 SNS 본문, 해시태그, CTA, 후킹 문구, 썸네일 문구로 구성합니다.",
      "광고·협찬 관계가 있으면 표시 문구를 누락하지 않도록 경고를 포함합니다.",
      "금지 문구와 과장 표현은 피하고, 사용자가 직접 최종 검토해야 한다는 안전한 톤을 유지합니다."
    ],
    context: buildSafePromptContext(input, brand, personalization, options),
    outputContract: {
      captions: 5,
      hashtags: 20,
      ctas: 5,
      hooks: 5,
      thumbnailTexts: 5
    },
    privacyNotes: [
      "원본 사진, 영상, 개인정보 원문은 프롬프트에 포함하지 않습니다.",
      "전체 History가 아니라 최근 선호 요약값만 사용합니다.",
      "사용자 콘텐츠는 서비스 전체 모델 학습에 사용하지 않는 정책을 유지합니다."
    ]
  };
}
