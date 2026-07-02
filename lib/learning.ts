import {
  normalizeHashtags,
  splitList
} from "@/lib/personalization";
import type {
  CopiedResultEvent,
  EditedCaptionEvent,
  FeedbackResultEvent,
  LearningHistoryEvent,
  PersonalizationProfile,
  Platform,
  PreferredCaptionLength,
  PreferredCTAStyle,
  Purpose,
  RegenerationEvent,
  ResultCopyType,
  StyleTone
} from "@/types";

export const learningWeights = {
  selectedCaption: 2,
  copied: 3,
  liked: 4,
  savedStyle: 5,
  editedCaption: 6,
  disliked: -4,
  regeneration: -2,
  savedResult: 3
};

type LearningContext = {
  resultId?: string;
  value?: string;
  platform?: Platform;
  purpose?: Purpose;
  style?: StyleTone;
  ctaStyle?: PreferredCTAStyle;
  copyType?: ResultCopyType;
  target?: ResultCopyType | "package";
  before?: string;
  after?: string;
};

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function touch(profile: PersonalizationProfile) {
  return {
    ...profile,
    lastUpdatedAt: new Date().toISOString()
  };
}

function cap<T>(items: T[], limit = 80) {
  return items.slice(0, limit);
}

function captionLength(value: string): PreferredCaptionLength {
  if (value.length <= 70) return "short";
  if (value.length >= 180) return "long";
  return "medium";
}

function inferCTAStyle(value: string): PreferredCTAStyle | undefined {
  if (!value) return undefined;
  if (value.includes("저장")) return "save";
  if (value.includes("댓글")) return "comment";
  if (value.includes("공유")) return "share";
  if (value.includes("링크") || value.includes("프로필")) return "link";
  if (value.includes("구매") || value.includes("지금") || value.includes("써보고")) return "purchase";
  return undefined;
}

function inferHashtagType(value: string) {
  if (value.includes("광고") || value.includes("협찬")) return "sponsored";
  if (value.includes("리뷰") || value.includes("후기")) return "review";
  if (value.includes("신상") || value.includes("할인")) return "promo";
  if (value.includes("데일리") || value.includes("일상")) return "daily";
  return "general";
}

function addScore<T extends string>(scores: Partial<Record<T, number>>, key: T | undefined, weight: number) {
  if (!key) return scores;
  return {
    ...scores,
    [key]: Number(scores[key] ?? 0) + weight
  };
}

function addTextScore(scores: Record<string, number>, key: string | undefined, weight: number) {
  if (!key) return scores;
  return {
    ...scores,
    [key]: Number(scores[key] ?? 0) + weight
  };
}

function addSharedScores(profile: PersonalizationProfile, context: LearningContext, weight: number) {
  const length = context.value ? captionLength(context.value) : undefined;
  const ctaStyle = context.ctaStyle ?? (context.copyType === "cta" ? inferCTAStyle(context.value ?? "") : undefined);
  const captionLengths = { ...profile.scores.captionLengths };
  const ctaStyles = { ...profile.scores.ctaStyles };
  const hashtagTypes = { ...profile.scores.hashtagTypes };

  if (length) {
    captionLengths[length] = Number(captionLengths[length] ?? 0) + weight;
  }

  if (ctaStyle) {
    ctaStyles[ctaStyle] = Number(ctaStyles[ctaStyle] ?? 0) + weight;
  }

  if (context.copyType === "hashtags" && context.value) {
    const type = inferHashtagType(context.value);
    hashtagTypes[type] = Number(hashtagTypes[type] ?? 0) + weight;
  }

  return {
    ...profile,
    scores: {
      ...profile.scores,
      styles: addScore(profile.scores.styles, context.style, weight),
      platforms: addScore(profile.scores.platforms, context.platform, weight),
      purposes: addScore(profile.scores.purposes, context.purpose, weight),
      tones: addTextScore(profile.scores.tones, profile.preferredTone, weight),
      captionLengths,
      ctaStyles,
      hashtagTypes
    }
  };
}

function makeBaseEvent(context: LearningContext): LearningHistoryEvent {
  const value = context.value ?? "";

  return {
    id: nowId("learn"),
    resultId: context.resultId,
    value,
    platform: context.platform,
    purpose: context.purpose,
    style: context.style,
    captionLength: value ? captionLength(value) : undefined,
    ctaStyle: context.ctaStyle,
    createdAt: new Date().toISOString()
  };
}

function mergeHashtags(profile: PersonalizationProfile, value: string) {
  const incoming = normalizeHashtags(splitList(value));
  return normalizeHashtags([...incoming, ...profile.frequentlyUsedHashtags]).slice(0, 40);
}

export function recordSelectedCaption(profile: PersonalizationProfile, context: LearningContext) {
  const event = makeBaseEvent(context);
  const next = addSharedScores(profile, context, learningWeights.selectedCaption);

  return touch({
    ...next,
    selectedCaptionHistory: cap([event, ...profile.selectedCaptionHistory])
  });
}

export function recordCopiedResult(profile: PersonalizationProfile, context: LearningContext) {
  const event: CopiedResultEvent = {
    ...makeBaseEvent(context),
    copyType: context.copyType ?? "caption"
  };
  const next = addSharedScores(profile, context, learningWeights.copied);

  return touch({
    ...next,
    frequentlyUsedHashtags: event.copyType === "hashtags" ? mergeHashtags(profile, event.value) : profile.frequentlyUsedHashtags,
    copiedResultHistory: cap([event, ...profile.copiedResultHistory])
  });
}

export function recordEditedCaption(profile: PersonalizationProfile, context: LearningContext) {
  const after = context.after ?? context.value ?? "";
  const event: EditedCaptionEvent = {
    ...makeBaseEvent({ ...context, value: after }),
    before: context.before ?? "",
    after
  };
  const next = addSharedScores(profile, { ...context, value: after }, learningWeights.editedCaption);

  return touch({
    ...next,
    editedCaptionHistory: cap([event, ...profile.editedCaptionHistory])
  });
}

export function recordLikedResult(profile: PersonalizationProfile, context: LearningContext) {
  const event: FeedbackResultEvent = {
    ...makeBaseEvent(context),
    target: context.target ?? "package"
  };
  const next = addSharedScores(profile, context, learningWeights.liked);

  return touch({
    ...next,
    likedResultHistory: cap([event, ...profile.likedResultHistory])
  });
}

export function recordDislikedResult(profile: PersonalizationProfile, context: LearningContext) {
  const event: FeedbackResultEvent = {
    ...makeBaseEvent(context),
    target: context.target ?? "package"
  };
  const next = addSharedScores(profile, context, learningWeights.disliked);

  return touch({
    ...next,
    dislikedResultHistory: cap([event, ...profile.dislikedResultHistory])
  });
}

export function recordSavedStyle(profile: PersonalizationProfile, context: LearningContext) {
  const event: FeedbackResultEvent = {
    ...makeBaseEvent(context),
    target: context.target ?? "package"
  };
  const next = addSharedScores(profile, context, learningWeights.savedStyle);

  return touch({
    ...next,
    savedStyleHistory: cap([event, ...profile.savedStyleHistory])
  });
}

export function recordSavedResult(profile: PersonalizationProfile, context: LearningContext) {
  const event: FeedbackResultEvent = {
    ...makeBaseEvent(context),
    target: context.target ?? "package"
  };
  const next = addSharedScores(profile, context, learningWeights.savedResult);

  return touch({
    ...next,
    savedResultHistory: cap([event, ...profile.savedResultHistory])
  });
}

export function recordRegeneration(profile: PersonalizationProfile, context: LearningContext) {
  const event: RegenerationEvent = {
    id: nowId("regen"),
    resultId: context.resultId,
    platform: context.platform,
    purpose: context.purpose,
    style: context.style,
    createdAt: new Date().toISOString()
  };
  const next = addSharedScores(profile, context, learningWeights.regeneration);

  return touch({
    ...next,
    regenerationHistory: cap([event, ...profile.regenerationHistory])
  });
}
