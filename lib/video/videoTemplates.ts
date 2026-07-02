import type { Purpose, StyleTone, VideoTemplate } from "@/types";

export const videoTemplates: VideoTemplate[] = [
  {
    id: "soft-slide",
    name: "부드러운 슬라이드",
    category: "기본",
    durationSeconds: 8,
    frameRate: 24,
    transitionType: "fade",
    textPosition: "bottom",
    overlayStyle: "brand-gradient",
    imageMotion: "ken-burns-in",
    titleMaxLines: 3,
    showBrandName: true,
    showCTA: true,
    showDisclosure: true
  },
  {
    id: "product-zoom",
    name: "확대되는 제품 사진",
    category: "제품",
    durationSeconds: 8,
    frameRate: 24,
    transitionType: "slow-zoom",
    textPosition: "bottom",
    overlayStyle: "product-panel",
    imageMotion: "ken-burns-in",
    titleMaxLines: 2,
    showBrandName: true,
    showCTA: true,
    showDisclosure: true
  },
  {
    id: "vlog-mood",
    name: "감성 브이로그",
    category: "감성",
    durationSeconds: 10,
    frameRate: 24,
    transitionType: "fade",
    textPosition: "center",
    overlayStyle: "soft-light",
    imageMotion: "pan-up",
    titleMaxLines: 3,
    showBrandName: false,
    showCTA: true,
    showDisclosure: false
  },
  {
    id: "new-arrival-video",
    name: "신상품 소개",
    category: "런칭",
    durationSeconds: 8,
    frameRate: 24,
    transitionType: "slide-up",
    textPosition: "top",
    overlayStyle: "brand-gradient",
    imageMotion: "ken-burns-in",
    titleMaxLines: 3,
    showBrandName: true,
    showCTA: true,
    showDisclosure: false
  },
  {
    id: "discount-event-video",
    name: "할인 이벤트",
    category: "이벤트",
    durationSeconds: 8,
    frameRate: 24,
    transitionType: "zoom-in-out",
    textPosition: "center",
    overlayStyle: "soft-dark",
    imageMotion: "ken-burns-out",
    titleMaxLines: 3,
    showBrandName: true,
    showCTA: true,
    showDisclosure: true
  },
  {
    id: "review-ad-video",
    name: "후기형 광고",
    category: "후기",
    durationSeconds: 10,
    frameRate: 24,
    transitionType: "slide-side",
    textPosition: "bottom",
    overlayStyle: "brand-gradient",
    imageMotion: "pan-up",
    titleMaxLines: 3,
    showBrandName: false,
    showCTA: true,
    showDisclosure: true
  },
  {
    id: "premium-brand-video",
    name: "고급 브랜드형",
    category: "브랜드",
    durationSeconds: 8,
    frameRate: 24,
    transitionType: "fade",
    textPosition: "bottom",
    overlayStyle: "soft-dark",
    imageMotion: "ken-burns-in",
    titleMaxLines: 2,
    showBrandName: true,
    showCTA: false,
    showDisclosure: true
  },
  {
    id: "quick-cuts",
    name: "빠른 컷 전환",
    category: "숏폼",
    durationSeconds: 5,
    frameRate: 24,
    transitionType: "none",
    textPosition: "center",
    overlayStyle: "soft-dark",
    imageMotion: "quick-cut",
    titleMaxLines: 2,
    showBrandName: true,
    showCTA: true,
    showDisclosure: false
  }
];

export function getVideoTemplate(id: string | undefined) {
  return videoTemplates.find((template) => template.id === id) ?? videoTemplates[0];
}

export function recommendVideoTemplate(purpose: Purpose | undefined, style: StyleTone | undefined) {
  if (purpose === "Discount Event") return getVideoTemplate("discount-event-video");
  if (purpose === "New Arrival") return getVideoTemplate("new-arrival-video");
  if (purpose === "Review Post" || style === "자연스러운 후기형") return getVideoTemplate("review-ad-video");
  if (purpose === "Product Promotion") return getVideoTemplate("product-zoom");
  if (style === "고급 브랜드형") return getVideoTemplate("premium-brand-video");
  if (style === "감성형") return getVideoTemplate("vlog-mood");
  return getVideoTemplate("soft-slide");
}
