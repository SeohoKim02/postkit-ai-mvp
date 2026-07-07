import { mapExportPlatformToPostKitPlatform } from "@/lib/exportPresets";
import type {
  ExportAsset,
  ExportChecklistItem,
  ExportContentType,
  ExportPackage,
  ExportPlatform,
  ExportPreset,
  GeneratedPackage,
  PersonalizationProfile
} from "@/types";

const serviceName = "postkit";

const contentTypeSlug: Record<ExportContentType, string> = {
  feed_image: "feed",
  story_image: "story",
  reels_thumbnail: "reels_thumbnail",
  shorts_thumbnail: "shorts_thumbnail",
  original_image: "original_image",
  original_video: "original_video",
  vertical_video_webm: "video",
  video_frame_png: "video_frame",
  captions_txt: "caption",
  hashtags_txt: "hashtags",
  cta_txt: "cta",
  disclosure_txt: "disclosure",
  thumbnail_txt: "thumbnail",
  full_upload_txt: "upload_text",
  metadata_json: "metadata"
};

function splitTerms(value: string | undefined) {
  return (value ?? "")
    .split(/[,#\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateForFile(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10).replaceAll("-", "");
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function sanitizeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function getExportContentId(id: string) {
  const clean = id.replace(/[^a-z0-9]/gi, "");
  return (clean.slice(-3) || "001").padStart(3, "0");
}

export function getImageContentType(preset: ExportPreset): ExportContentType {
  if (preset.id === "instagram-story") return "story_image";
  if (preset.id === "instagram-reels" || preset.id === "tiktok") return "reels_thumbnail";
  if (preset.id === "youtube-shorts") return "shorts_thumbnail";
  return "feed_image";
}

export function makeExportFileName(result: GeneratedPackage, preset: ExportPreset, contentType: ExportContentType, extension: string) {
  const platform = sanitizeFilePart(preset.platform);
  const type = contentTypeSlug[contentType];
  const date = formatDateForFile(result.createdAt);
  const id = getExportContentId(result.id);
  return `${serviceName}_${platform}_${type}_${date}_${id}.${extension.replace(/^\./, "")}`;
}

export function getSelectedCaption(result: GeneratedPackage) {
  return result.selectedCaption ?? result.captions[result.selectedCaptionIndex ?? 0] ?? result.captions[0] ?? "";
}

export function composeFullUploadText(result: GeneratedPackage) {
  return [
    getSelectedCaption(result),
    result.ctas[0] ?? "",
    result.disclosure,
    result.hashtags.join(" ")
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function composeAllExportText(result: GeneratedPackage) {
  return [
    result.title,
    "",
    "[선택 캡션]",
    getSelectedCaption(result),
    "",
    "[전체 캡션]",
    ...result.captions.map((caption, index) => `${index + 1}. ${caption}`),
    "",
    "[해시태그]",
    result.hashtags.join(" "),
    "",
    "[CTA]",
    result.ctas.join("\n"),
    "",
    "[후킹 문구]",
    result.hooks.join("\n"),
    "",
    "[썸네일 문구]",
    result.thumbnails.join("\n"),
    "",
    "[광고/협찬 표시]",
    result.disclosure
  ].join("\n");
}

export function buildExportMetadata(result: GeneratedPackage, preset: ExportPreset) {
  return {
    service: "PostKit",
    contentId: result.id,
    title: result.title,
    platform: result.platform,
    exportPlatform: preset.platform,
    purpose: result.purpose,
    style: result.style,
    generatedAt: result.createdAt,
    usedCredits: result.usedCredits,
    exportCreditCost: 0,
    selectedCaptionIndex: result.selectedCaptionIndex ?? 0,
    selectedCaption: getSelectedCaption(result),
    sponsorDisclosure: result.input.sponsorDisclosure,
    uploadedFileName: result.input.uploadedFileName ?? null,
    personalizationStyle: result.personalization?.topStyle,
    personalizationLevel: result.personalization?.level,
    presetId: preset.id,
    recommendedAspectRatio: preset.recommendedAspectRatio,
    outputSize: `${preset.width}x${preset.height}`
  };
}

export function buildExportAssets(result: GeneratedPackage, preset: ExportPreset): ExportAsset[] {
  const imageContentType = getImageContentType(preset);
  const originalKind = result.input.uploadedFileName?.toLowerCase().match(/\.(mp4|mov|webm|avi)$/) ? "video" : "image";

  return [
    {
      id: `${preset.id}-image`,
      kind: "image",
      contentType: imageContentType,
      label: `${preset.platform} 이미지 PNG`,
      fileName: makeExportFileName(result, preset, imageContentType, "png"),
      mimeType: "image/png",
      available: true,
      source: "design_canvas",
      width: preset.width,
      height: preset.height
    },
    {
      id: `${preset.id}-original`,
      kind: originalKind,
      contentType: originalKind === "video" ? "original_video" : "original_image",
      label: originalKind === "video" ? "업로드한 원본 영상" : "업로드한 원본 사진",
      fileName: result.input.uploadedFileName ?? "uploaded-original",
      mimeType: originalKind === "video" ? "video/*" : "image/*",
      available: false,
      source: "uploaded_original",
      unavailableReason: "MVP는 원본 File 객체를 서버나 localStorage에 저장하지 않아 현재 브라우저 세션 밖에서는 원본 다운로드를 만들지 않습니다."
    },
    {
      id: `${preset.id}-captions`,
      kind: "text",
      contentType: "captions_txt",
      label: "생성된 캡션 TXT",
      fileName: makeExportFileName(result, preset, "captions_txt", "txt"),
      mimeType: "text/plain;charset=utf-8",
      available: true,
      source: "text",
      text: result.captions.join("\n\n")
    },
    {
      id: `${preset.id}-hashtags`,
      kind: "text",
      contentType: "hashtags_txt",
      label: "해시태그 TXT",
      fileName: makeExportFileName(result, preset, "hashtags_txt", "txt"),
      mimeType: "text/plain;charset=utf-8",
      available: true,
      source: "text",
      text: result.hashtags.join(" ")
    },
    {
      id: `${preset.id}-cta`,
      kind: "text",
      contentType: "cta_txt",
      label: "CTA 문구 TXT",
      fileName: makeExportFileName(result, preset, "cta_txt", "txt"),
      mimeType: "text/plain;charset=utf-8",
      available: true,
      source: "text",
      text: result.ctas.join("\n")
    },
    {
      id: `${preset.id}-disclosure`,
      kind: "text",
      contentType: "disclosure_txt",
      label: "광고/협찬 표시 문구 TXT",
      fileName: makeExportFileName(result, preset, "disclosure_txt", "txt"),
      mimeType: "text/plain;charset=utf-8",
      available: true,
      source: "text",
      text: result.disclosure
    },
    {
      id: `${preset.id}-thumbnail`,
      kind: "text",
      contentType: "thumbnail_txt",
      label: "썸네일 문구 TXT",
      fileName: makeExportFileName(result, preset, "thumbnail_txt", "txt"),
      mimeType: "text/plain;charset=utf-8",
      available: true,
      source: "text",
      text: result.thumbnails.join("\n")
    },
    {
      id: `${preset.id}-full-upload-text`,
      kind: "text",
      contentType: "full_upload_txt",
      label: "전체 업로드 문구 TXT",
      fileName: makeExportFileName(result, preset, "full_upload_txt", "txt"),
      mimeType: "text/plain;charset=utf-8",
      available: true,
      source: "text",
      text: composeFullUploadText(result)
    },
    {
      id: `${preset.id}-metadata`,
      kind: "json",
      contentType: "metadata_json",
      label: "콘텐츠 정보 JSON",
      fileName: makeExportFileName(result, preset, "metadata_json", "json"),
      mimeType: "application/json",
      available: true,
      source: "metadata",
      text: JSON.stringify(buildExportMetadata(result, preset), null, 2)
    }
  ];
}

export function buildExportPackage(result: GeneratedPackage, preset: ExportPreset): ExportPackage {
  return {
    contentId: result.id,
    title: result.title,
    platform: result.platform,
    purpose: result.purpose,
    style: result.style,
    generatedAt: result.createdAt,
    selectedCaption: getSelectedCaption(result),
    captions: result.captions,
    hashtags: result.hashtags,
    ctas: result.ctas,
    hooks: result.hooks,
    thumbnails: result.thumbnails,
    disclosure: result.disclosure,
    checklist: result.checklist,
    metadata: buildExportMetadata(result, preset),
    assets: buildExportAssets(result, preset)
  };
}

export function buildDisclosureChecklist(result: GeneratedPackage): ExportChecklistItem[] {
  const uploadText = composeAllExportText(result).toLowerCase();
  const requiredTerms = splitTerms(result.input.requiredKeywords);
  const bannedTerms = splitTerms(result.input.bannedKeywords);
  const missingRequired = requiredTerms.filter((term) => !uploadText.includes(term.toLowerCase()));
  const includedBanned = bannedTerms.filter((term) => uploadText.includes(term.toLowerCase()));
  const isSponsored = result.input.sponsorDisclosure !== "none" || result.purpose === "Sponsored Post";
  const hasDisclosure = Boolean(result.disclosure.trim()) && !result.disclosure.includes("표시 없음");
  const ctaText = result.ctas.join(" ");
  const hasLinkCue = /링크|프로필|댓글|DM|디엠|구매|저장/.test(ctaText);
  const hasDiscountCue = /할인|쿠폰|코드|%/.test(uploadText);

  return [
    {
      id: "disclosure",
      label: "광고·협찬 표시 문구 포함",
      status: !isSponsored || hasDisclosure ? "ok" : "missing",
      detail: isSponsored && !hasDisclosure ? "광고 표시 문구가 비어 있어요. 확인 후 내보내세요." : "표시 문구를 확인했어요."
    },
    {
      id: "required-keywords",
      label: "필수 키워드 포함",
      status: missingRequired.length === 0 ? "ok" : "warning",
      detail: missingRequired.length > 0 ? `빠진 키워드: ${missingRequired.join(", ")}` : "필수 키워드가 문구에 반영돼 있어요."
    },
    {
      id: "banned-keywords",
      label: "금지 키워드 확인",
      status: includedBanned.length === 0 ? "ok" : "warning",
      detail: includedBanned.length > 0 ? `금지 키워드가 포함됐을 수 있어요: ${includedBanned.join(", ")}` : "금지 키워드는 발견되지 않았어요."
    },
    {
      id: "discount-code",
      label: "할인코드 또는 이벤트 조건 확인",
      status: result.purpose !== "Discount Event" || hasDiscountCue ? "ok" : "warning",
      detail: result.purpose === "Discount Event" && !hasDiscountCue ? "할인 조건이나 코드를 확인해 주세요." : "할인/이벤트 문구를 확인했어요."
    },
    {
      id: "advertiser-phrase",
      label: "광고주 요청 문구 확인",
      status: !isSponsored || requiredTerms.length > 0 ? "ok" : "warning",
      detail: isSponsored && requiredTerms.length === 0 ? "광고주 요청 문구가 있다면 필수 키워드에 추가해 주세요." : "요청 문구 확인 항목을 통과했어요."
    },
    {
      id: "link-profile",
      label: "링크 또는 프로필 안내",
      status: hasLinkCue ? "ok" : "warning",
      detail: hasLinkCue ? "행동 안내 문구가 포함돼 있어요." : "필요하다면 링크, 프로필, 댓글 안내를 추가해 주세요."
    },
    {
      id: "final-review",
      label: "최종 게시 전 직접 확인",
      status: "warning",
      detail: "최종 게시 전 광고주 요구사항과 관련 기준을 직접 확인하세요."
    }
  ];
}

export function exportLearningWeight(action: "download" | "full_copy" | "share" | "platform_repeat") {
  const weights = {
    download: 1,
    full_copy: 2,
    share: 3,
    platform_repeat: 1
  };

  return weights[action];
}

export function applyExportLearning(profile: PersonalizationProfile, platform: ExportPlatform, weight: number) {
  const mappedPlatform = mapExportPlatformToPostKitPlatform(platform);

  if (!mappedPlatform) {
    return {
      ...profile,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  return {
    ...profile,
    preferredPlatforms: [mappedPlatform, ...profile.preferredPlatforms.filter((item) => item !== mappedPlatform)].slice(0, 5),
    scores: {
      ...profile.scores,
      platforms: {
        ...profile.scores.platforms,
        [mappedPlatform]: Number(profile.scores.platforms[mappedPlatform] ?? 0) + weight
      }
    },
    lastUpdatedAt: new Date().toISOString()
  };
}
