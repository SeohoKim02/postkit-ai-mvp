import type {
  AccountType,
  BrandProfile,
  ContentPreference,
  PersonalizationProfile,
  PersonalizationSnapshot,
  Platform,
  PreferredCaptionLength,
  PreferredCTAStyle,
  Purpose,
  StyleTone
} from "@/types";

export const PERSONALIZATION_VERSION = 1;

export const accountTypeOptions: AccountType[] = [
  "개인 계정",
  "인플루언서",
  "광고/제휴 계정",
  "쇼핑몰/브랜드",
  "소상공인",
  "마케팅 대행사"
];

export const contentPreferenceOptions: ContentPreference[] = [
  "개인 일상",
  "제품 홍보",
  "광고/협찬",
  "후기",
  "신상품",
  "할인 이벤트",
  "정보형 콘텐츠"
];

export const onboardingStyleOptions: StyleTone[] = [
  "감성형",
  "자연스러운 후기형",
  "깔끔한 정보형",
  "짧고 강한 카피형",
  "고급 브랜드형",
  "친구한테 말하듯",
  "전문 리뷰어형"
];

const contentPurposeMap: Record<ContentPreference, Purpose> = {
  "개인 일상": "Personal Post",
  "제품 홍보": "Product Promotion",
  "광고/협찬": "Sponsored Post",
  후기: "Review Post",
  신상품: "New Arrival",
  "할인 이벤트": "Discount Event",
  "정보형 콘텐츠": "Product Promotion"
};

export function splitList(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  const raw = Array.isArray(value) ? value.join(",") : value;

  return raw
    .split(/[,#\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeHashtags(items: string[]) {
  return Array.from(new Set(items.map((item) => `#${item.replace(/^#/, "").replace(/\s+/g, "")}`).filter((item) => item.length > 1)));
}

export function createDefaultPersonalizationProfile(brand?: BrandProfile): PersonalizationProfile {
  const now = new Date().toISOString();
  const requiredPhrases = splitList(brand?.requiredPhrases);
  const bannedPhrases = splitList(brand?.bannedPhrases);
  const hashtags = normalizeHashtags(splitList(brand?.favoriteHashtags));
  const preferredPlatform = brand?.preferredPlatform ?? "Instagram Feed";

  return {
    version: PERSONALIZATION_VERSION,
    onboardingCompleted: false,
    accountType: "개인 계정",
    preferredPlatforms: [preferredPlatform],
    preferredPurposes: ["Product Promotion"],
    preferredStyles: ["친구한테 말하듯"],
    preferredTone: brand?.voice ?? "친근함",
    preferredCaptionLength: "medium",
    frequentlyUsedHashtags: hashtags,
    requiredPhrases,
    bannedPhrases,
    preferredCTAStyle: "save",
    sponsoredDisclosureStyle: brand?.defaultDisclosure ?? "#광고 또는 #협찬을 첫 문장에 표시",
    selectedCaptionHistory: [],
    copiedResultHistory: [],
    editedCaptionHistory: [],
    likedResultHistory: [],
    dislikedResultHistory: [],
    savedStyleHistory: [],
    savedResultHistory: [],
    regenerationHistory: [],
    scores: {
      styles: {},
      tones: {},
      captionLengths: { short: 0, medium: 0, long: 0 },
      ctaStyles: { save: 0, comment: 0, share: 0, link: 0, purchase: 0 },
      hashtagTypes: {},
      platforms: {},
      purposes: {}
    },
    lastUpdatedAt: now
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function migratePersonalizationProfile(value: unknown, brand?: BrandProfile): PersonalizationProfile {
  const fallback = createDefaultPersonalizationProfile(brand);

  if (!isObject(value)) {
    return fallback;
  }

  const maybeScores = isObject(value.scores) ? value.scores : {};
  const maybeCaptionLengths = isObject(maybeScores.captionLengths) ? maybeScores.captionLengths : {};
  const maybeCTAStyles = isObject(maybeScores.ctaStyles) ? maybeScores.ctaStyles : {};

  return {
    ...fallback,
    ...value,
    version: PERSONALIZATION_VERSION,
    onboardingCompleted: typeof value.onboardingCompleted === "boolean" ? value.onboardingCompleted : fallback.onboardingCompleted,
    accountType: (value.accountType as AccountType) || fallback.accountType,
    preferredPlatforms: safeArray<Platform>(value.preferredPlatforms, fallback.preferredPlatforms),
    preferredPurposes: safeArray<Purpose>(value.preferredPurposes, fallback.preferredPurposes),
    preferredStyles: safeArray<StyleTone>(value.preferredStyles, fallback.preferredStyles),
    preferredTone: typeof value.preferredTone === "string" ? value.preferredTone : fallback.preferredTone,
    preferredCaptionLength: (value.preferredCaptionLength as PreferredCaptionLength) || fallback.preferredCaptionLength,
    frequentlyUsedHashtags: normalizeHashtags(safeArray<string>(value.frequentlyUsedHashtags, fallback.frequentlyUsedHashtags)),
    requiredPhrases: safeArray<string>(value.requiredPhrases, fallback.requiredPhrases),
    bannedPhrases: safeArray<string>(value.bannedPhrases, fallback.bannedPhrases),
    preferredCTAStyle: (value.preferredCTAStyle as PreferredCTAStyle) || fallback.preferredCTAStyle,
    sponsoredDisclosureStyle:
      typeof value.sponsoredDisclosureStyle === "string" ? value.sponsoredDisclosureStyle : fallback.sponsoredDisclosureStyle,
    selectedCaptionHistory: safeArray(value.selectedCaptionHistory, []),
    copiedResultHistory: safeArray(value.copiedResultHistory, []),
    editedCaptionHistory: safeArray(value.editedCaptionHistory, []),
    likedResultHistory: safeArray(value.likedResultHistory, []),
    dislikedResultHistory: safeArray(value.dislikedResultHistory, []),
    savedStyleHistory: safeArray(value.savedStyleHistory, []),
    savedResultHistory: safeArray(value.savedResultHistory, []),
    regenerationHistory: safeArray(value.regenerationHistory, []),
    scores: {
      styles: isObject(maybeScores.styles) ? (maybeScores.styles as Partial<Record<StyleTone, number>>) : fallback.scores.styles,
      tones: isObject(maybeScores.tones) ? (maybeScores.tones as Record<string, number>) : fallback.scores.tones,
      captionLengths: {
        short: Number(maybeCaptionLengths.short ?? fallback.scores.captionLengths.short),
        medium: Number(maybeCaptionLengths.medium ?? fallback.scores.captionLengths.medium),
        long: Number(maybeCaptionLengths.long ?? fallback.scores.captionLengths.long)
      },
      ctaStyles: {
        save: Number(maybeCTAStyles.save ?? fallback.scores.ctaStyles.save),
        comment: Number(maybeCTAStyles.comment ?? fallback.scores.ctaStyles.comment),
        share: Number(maybeCTAStyles.share ?? fallback.scores.ctaStyles.share),
        link: Number(maybeCTAStyles.link ?? fallback.scores.ctaStyles.link),
        purchase: Number(maybeCTAStyles.purchase ?? fallback.scores.ctaStyles.purchase)
      },
      hashtagTypes: isObject(maybeScores.hashtagTypes) ? (maybeScores.hashtagTypes as Record<string, number>) : fallback.scores.hashtagTypes,
      platforms: isObject(maybeScores.platforms) ? (maybeScores.platforms as Partial<Record<Platform, number>>) : fallback.scores.platforms,
      purposes: isObject(maybeScores.purposes) ? (maybeScores.purposes as Partial<Record<Purpose, number>>) : fallback.scores.purposes
    },
    lastUpdatedAt: typeof value.lastUpdatedAt === "string" ? value.lastUpdatedAt : fallback.lastUpdatedAt
  };
}

function topKey<T extends string>(scores: Partial<Record<T, number>>, fallback: T) {
  return (Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] as T | undefined) ?? fallback;
}

export function getTopStyle(profile: PersonalizationProfile) {
  return topKey<StyleTone>(profile.scores.styles, profile.preferredStyles[0] ?? "친구한테 말하듯");
}

export function getTopPlatform(profile: PersonalizationProfile) {
  return topKey<Platform>(profile.scores.platforms, profile.preferredPlatforms[0] ?? "Instagram Feed");
}

export function getTopPurpose(profile: PersonalizationProfile) {
  return topKey<Purpose>(profile.scores.purposes, profile.preferredPurposes[0] ?? "Product Promotion");
}

export function getTopCaptionLength(profile: PersonalizationProfile) {
  return topKey<PreferredCaptionLength>(profile.scores.captionLengths, profile.preferredCaptionLength);
}

export function getLearningActionCount(profile: PersonalizationProfile) {
  return (
    profile.selectedCaptionHistory.length +
    profile.copiedResultHistory.length +
    profile.editedCaptionHistory.length +
    profile.likedResultHistory.length +
    profile.dislikedResultHistory.length +
    profile.savedStyleHistory.length +
    profile.savedResultHistory.length +
    profile.regenerationHistory.length
  );
}

export function getPersonalizationLevel(profile: PersonalizationProfile) {
  const count = getLearningActionCount(profile);

  if (!profile.onboardingCompleted && count === 0) return "학습 시작 전";
  if (count < 5) return "기본 학습";
  if (count < 15) return "개인 스타일 학습 중";
  return "맞춤화 완료";
}

export function getPersonalizationSnapshot(profile: PersonalizationProfile): PersonalizationSnapshot {
  const topStyle = getTopStyle(profile);
  const topPlatform = getTopPlatform(profile);
  const captionLength = getTopCaptionLength(profile);
  const level = getPersonalizationLevel(profile);

  return {
    topStyle,
    topPlatform,
    captionLength,
    level,
    note: `최근 선택한 ${profile.preferredTone || "친근한"} ${topStyle} 스타일을 반영했어요.`
  };
}

export function mapContentPreferencesToPurposes(contents: ContentPreference[]) {
  return Array.from(new Set(contents.map((content) => contentPurposeMap[content])));
}

export function captionLengthLabel(length: PreferredCaptionLength) {
  const labels: Record<PreferredCaptionLength, string> = {
    short: "짧은 문장",
    medium: "중간 길이",
    long: "긴 설명형"
  };

  return labels[length];
}
