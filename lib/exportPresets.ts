import type { ExportPlatform, ExportPreset, Platform } from "@/types";

export const exportDimensions = {
  verticalFeed: { width: 1080, height: 1350 },
  squareFeed: { width: 1080, height: 1080 },
  verticalVideo: { width: 1080, height: 1920 },
  horizontalThumbnail: { width: 1280, height: 720 },
  youtubeThumbnail: { width: 1280, height: 720 },
  xHorizontal: { width: 1600, height: 900 }
};

export const exportPresets: ExportPreset[] = [
  {
    id: "instagram-feed",
    platform: "Instagram Feed",
    contentType: "피드 이미지와 캡션",
    recommendedAspectRatio: "4:5",
    ...exportDimensions.verticalFeed,
    supportedFileTypes: ["png", "jpg", "txt", "json"],
    titleMaxLength: 80,
    descriptionMaxLength: 2200,
    hashtagStyle: "본문 마지막 줄에 공백 후 표시",
    disclosurePosition: "캡션 첫 문장 또는 첫 해시태그 앞",
    shareableItems: ["text", "image"],
    openUrl: "https://www.instagram.com/"
  },
  {
    id: "instagram-story",
    platform: "Instagram Story",
    contentType: "세로 스토리 이미지",
    recommendedAspectRatio: "9:16",
    ...exportDimensions.verticalVideo,
    supportedFileTypes: ["png", "jpg", "txt", "json"],
    titleMaxLength: 70,
    descriptionMaxLength: 500,
    hashtagStyle: "짧은 해시태그만 3~5개 사용",
    disclosurePosition: "스토리 화면 안쪽 하단 또는 첫 텍스트",
    shareableItems: ["text", "image"],
    openUrl: "https://www.instagram.com/"
  },
  {
    id: "instagram-reels",
    platform: "Instagram Reels",
    contentType: "릴스 썸네일과 후킹 문구",
    recommendedAspectRatio: "9:16",
    ...exportDimensions.verticalVideo,
    supportedFileTypes: ["png", "jpg", "mp4", "txt", "json"],
    titleMaxLength: 80,
    descriptionMaxLength: 2200,
    hashtagStyle: "캡션 하단에 릴스 키워드와 함께 표시",
    disclosurePosition: "캡션 첫 문장 또는 영상 첫 화면",
    shareableItems: ["text", "image", "video"],
    openUrl: "https://www.instagram.com/"
  },
  {
    id: "tiktok",
    platform: "TikTok",
    contentType: "틱톡 문구와 썸네일",
    recommendedAspectRatio: "9:16",
    ...exportDimensions.verticalVideo,
    supportedFileTypes: ["png", "jpg", "mp4", "txt", "json"],
    titleMaxLength: 80,
    descriptionMaxLength: 2200,
    hashtagStyle: "짧은 키워드를 본문 끝에 붙여 표시",
    disclosurePosition: "본문 앞쪽 또는 영상 첫 화면",
    shareableItems: ["text", "image", "video"],
    openUrl: "https://www.tiktok.com/upload"
  },
  {
    id: "youtube-shorts",
    platform: "YouTube Shorts",
    contentType: "쇼츠 제목, 설명, 썸네일",
    recommendedAspectRatio: "9:16",
    ...exportDimensions.verticalVideo,
    supportedFileTypes: ["png", "jpg", "mp4", "txt", "json"],
    titleMaxLength: 100,
    descriptionMaxLength: 5000,
    hashtagStyle: "제목 또는 설명 끝에 #Shorts와 함께 표시",
    disclosurePosition: "설명 첫 줄 또는 영상 내 고지",
    shareableItems: ["text", "image", "video"],
    openUrl: "https://studio.youtube.com/"
  },
  {
    id: "facebook",
    platform: "Facebook",
    contentType: "피드 게시물 문구",
    recommendedAspectRatio: "1:1",
    ...exportDimensions.squareFeed,
    supportedFileTypes: ["png", "jpg", "txt", "json"],
    titleMaxLength: 80,
    descriptionMaxLength: 5000,
    hashtagStyle: "본문 마지막에 2~5개만 표시",
    disclosurePosition: "본문 첫 줄",
    shareableItems: ["text", "image"],
    openUrl: "https://www.facebook.com/"
  },
  {
    id: "x",
    platform: "X",
    contentType: "짧은 게시 문구",
    recommendedAspectRatio: "16:9",
    ...exportDimensions.xHorizontal,
    supportedFileTypes: ["png", "jpg", "txt", "json"],
    titleMaxLength: 70,
    descriptionMaxLength: 280,
    hashtagStyle: "핵심 해시태그 1~3개만 표시",
    disclosurePosition: "게시글 앞쪽",
    shareableItems: ["text", "image"],
    openUrl: "https://x.com/compose/post"
  }
];

export function getExportPresetById(id: string) {
  return exportPresets.find((preset) => preset.id === id) ?? exportPresets[0];
}

export function getRecommendedPreset(platform: Platform) {
  const map: Record<Platform, string> = {
    "Instagram Feed": "instagram-feed",
    "Instagram Story": "instagram-story",
    "Reels Thumbnail": "instagram-reels",
    TikTok: "tiktok",
    "YouTube Shorts": "youtube-shorts"
  };

  return getExportPresetById(map[platform]);
}

export function mapExportPlatformToPostKitPlatform(platform: ExportPlatform): Platform | undefined {
  const map: Partial<Record<ExportPlatform, Platform>> = {
    "Instagram Feed": "Instagram Feed",
    "Instagram Story": "Instagram Story",
    "Instagram Reels": "Reels Thumbnail",
    TikTok: "TikTok",
    "YouTube Shorts": "YouTube Shorts"
  };

  return map[platform];
}
