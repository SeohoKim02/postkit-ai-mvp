import type { Platform, Purpose, StyleTone } from "@/types";

export const platforms: Platform[] = [
  "Instagram Feed",
  "Instagram Story",
  "Instagram Reels",
  "TikTok",
  "YouTube Shorts",
  "Facebook",
  "X"
];

export const legacyPlatforms: Platform[] = ["Reels Thumbnail"];

export const supportedPlatforms: Platform[] = [...platforms, ...legacyPlatforms];

export const purposes: Purpose[] = [
  "Personal Post",
  "Sponsored Post",
  "Product Promotion",
  "New Arrival",
  "Discount Event",
  "Review Post"
];

export const styles: StyleTone[] = [
  "감성형",
  "깔끔한 정보형",
  "자연스러운 후기형",
  "광고 강한 판매형",
  "고급 브랜드형",
  "친구한테 말하듯",
  "전문 리뷰어형",
  "짧고 강한 카피형"
];
