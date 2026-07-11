import { exportDimensions, exportPresets } from "@/lib/exportPresets";
import type { DesignOutputPreset, DesignTemplate, GeneratedPackage, PersonalizationProfile } from "@/types";

export const designOutputPresets: DesignOutputPreset[] = [
  {
    id: "instagram-feed-vertical",
    name: "Instagram 세로 피드",
    platform: "Instagram Feed",
    contentType: "세로 피드 이미지",
    width: exportDimensions.verticalFeed.width,
    height: exportDimensions.verticalFeed.height,
    aspectRatio: "4:5",
    exportPresetId: "instagram-feed"
  },
  {
    id: "instagram-feed-square",
    name: "Instagram 정사각 피드",
    platform: "Instagram Feed",
    contentType: "정사각 피드 이미지",
    width: exportDimensions.squareFeed.width,
    height: exportDimensions.squareFeed.height,
    aspectRatio: "1:1",
    exportPresetId: "instagram-feed"
  },
  {
    id: "instagram-story",
    name: "Instagram Story",
    platform: "Instagram Story",
    contentType: "스토리 이미지",
    width: exportDimensions.verticalVideo.width,
    height: exportDimensions.verticalVideo.height,
    aspectRatio: "9:16",
    exportPresetId: "instagram-story"
  },
  {
    id: "instagram-reels-thumbnail",
    name: "Instagram Reels 썸네일",
    platform: "Instagram Reels",
    contentType: "릴스 썸네일",
    width: exportDimensions.verticalVideo.width,
    height: exportDimensions.verticalVideo.height,
    aspectRatio: "9:16",
    exportPresetId: "instagram-reels"
  },
  {
    id: "tiktok",
    name: "TikTok",
    platform: "TikTok",
    contentType: "틱톡 이미지",
    width: exportDimensions.verticalVideo.width,
    height: exportDimensions.verticalVideo.height,
    aspectRatio: "9:16",
    exportPresetId: "tiktok"
  },
  {
    id: "youtube-shorts",
    name: "YouTube Shorts",
    platform: "YouTube Shorts",
    contentType: "쇼츠 이미지",
    width: exportDimensions.verticalVideo.width,
    height: exportDimensions.verticalVideo.height,
    aspectRatio: "9:16",
    exportPresetId: "youtube-shorts"
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube 가로 썸네일",
    platform: "YouTube Thumbnail",
    contentType: "가로 썸네일",
    width: exportDimensions.youtubeThumbnail.width,
    height: exportDimensions.youtubeThumbnail.height,
    aspectRatio: "16:9"
  },
  {
    id: "facebook-square",
    name: "Facebook 정사각 게시물",
    platform: "Facebook",
    contentType: "정사각 게시물",
    width: exportDimensions.squareFeed.width,
    height: exportDimensions.squareFeed.height,
    aspectRatio: "1:1",
    exportPresetId: "facebook"
  },
  {
    id: "x-horizontal",
    name: "X 가로 이미지",
    platform: "X",
    contentType: "가로 이미지",
    width: exportDimensions.xHorizontal.width,
    height: exportDimensions.xHorizontal.height,
    aspectRatio: "16:9",
    exportPresetId: "x"
  }
];

export const designTemplates: DesignTemplate[] = [
  {
    id: "photo-focus",
    name: "사진 중심",
    category: "기본",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.86,
    padding: 0.07,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "4:5"
  },
  {
    id: "bottom-title",
    name: "아래쪽 제목",
    category: "기본",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.84,
    padding: 0.075,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "1:1"
  },
  {
    id: "center-copy",
    name: "중앙 문구",
    category: "후킹",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.88,
    padding: 0.075,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "9:16"
  },
  {
    id: "left-info",
    name: "좌측 정렬 정보형",
    category: "정보형",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.82,
    padding: 0.07,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "4:5"
  },
  {
    id: "product-promo",
    name: "제품 홍보형",
    category: "판매",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.86,
    padding: 0.07,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "4:5"
  },
  {
    id: "review-natural",
    name: "자연스러운 후기형",
    category: "후기",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.82,
    padding: 0.07,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "1:1"
  },
  {
    id: "discount-event",
    name: "할인 이벤트형",
    category: "이벤트",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.88,
    padding: 0.075,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "9:16"
  },
  {
    id: "new-arrival",
    name: "신상품 출시형",
    category: "런칭",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.86,
    padding: 0.075,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "9:16"
  },
  {
    id: "premium-brand",
    name: "고급 브랜드형",
    category: "브랜드",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.84,
    padding: 0.075,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "4:5"
  },
  {
    id: "minimal",
    name: "미니멀형",
    category: "브랜드",
    textPosition: "bottom",
    textAlignment: "left",
    overlayStyle: "gradient-bottom",
    fontScale: 0.8,
    padding: 0.075,
    titleMaxLines: 2,
    showBrandName: false,
    showDisclosure: false,
    defaultAspectRatio: "1:1"
  }
];

export function getDesignTemplate(id: string) {
  return designTemplates.find((template) => template.id === id) ?? designTemplates[0];
}

export function getDesignOutputPreset(id: string) {
  return designOutputPresets.find((preset) => preset.id === id) ?? designOutputPresets[0];
}

export function findOutputPresetForExportPreset(exportPresetId: string) {
  return designOutputPresets.find((preset) => preset.exportPresetId === exportPresetId) ?? designOutputPresets[0];
}

export function getExportPresetForDesign(outputPresetId: string) {
  const output = getDesignOutputPreset(outputPresetId);
  if (!output.exportPresetId) {
    return exportPresets[0];
  }

  return exportPresets.find((preset) => preset.id === output.exportPresetId) ?? exportPresets[0];
}

export function recommendDesignTemplate(result: GeneratedPackage, personalization?: PersonalizationProfile | null) {
  const style = personalization?.preferredStyles[0] ?? result.personalization?.topStyle ?? result.style;

  if (style === "고급 브랜드형") {
    return {
      template: getDesignTemplate("premium-brand"),
      reason: "최근 선호한 고급 브랜드형 스타일을 반영했어요."
    };
  }

  if (result.purpose === "Discount Event") {
    return {
      template: getDesignTemplate("discount-event"),
      reason: "할인 이벤트 목적에 맞춰 사진을 살리는 짧은 하단 카피 템플릿을 추천했어요."
    };
  }

  if (result.purpose === "New Arrival") {
    return {
      template: getDesignTemplate("new-arrival"),
      reason: "신상품 출시 느낌을 사진 위 짧은 하단 문구로 정리하는 템플릿을 추천했어요."
    };
  }

  if (style === "자연스러운 후기형" || result.purpose === "Review Post") {
    return {
      template: getDesignTemplate("review-natural"),
      reason: "자연스러운 후기 흐름에 맞춰 사진 중심 템플릿을 추천했어요."
    };
  }

  if (result.purpose === "Product Promotion") {
    return {
      template: getDesignTemplate("product-promo"),
      reason: "제품 사진을 가리지 않고 제품명과 CTA만 짧게 얹는 템플릿을 추천했어요."
    };
  }

  return {
    template: getDesignTemplate("photo-focus"),
    reason: "업로드 사진을 가장 크게 보여주는 기본 템플릿을 추천했어요."
  };
}
