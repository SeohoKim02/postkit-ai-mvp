import type { Platform } from "@/types";

export type PlatformContentGuide = {
  label: string;
  shortLabel: string;
  recommendedRatio: string;
  resultFormat: string;
  createDescription: string;
  captionDescription: string;
  captionTitle: string;
  ctaTitle: string;
  hookTitle: string;
  thumbnailTitle: string;
  showHashtags: boolean;
  hashtagLimit: number;
  packageItems: string[];
  copyActionLabel: string;
  studioActionLabel: string;
  videoActionLabel: string;
  exportActionLabel: string;
  captionVariantLabels: string[];
  ctaVariantLabels: string[];
  hookVariantLabels: string[];
  thumbnailVariantLabels: string[];
  ctaExamples: string[];
  hookExamples: string[];
  thumbnailExamples: string[];
};

const instagramReelsGuide: PlatformContentGuide = {
  label: "Instagram Reels",
  shortLabel: "릴스",
  recommendedRatio: "9:16",
  resultFormat: "첫 3초 훅 + 영상 자막 + 릴스 캡션",
  createDescription: "짧은 영상 흐름에 맞춘 릴스용 문구",
  captionDescription: "릴스 설명란에 바로 붙여넣을 수 있는 짧은 캡션입니다.",
  captionTitle: "릴스 캡션 3개",
  ctaTitle: "댓글/팔로우 유도 문구 3개",
  hookTitle: "첫 3초 훅 5개",
  thumbnailTitle: "영상 자막용 짧은 문장 5개",
  showHashtags: false,
  hashtagLimit: 5,
  packageItems: ["첫 3초 훅", "영상 자막용 문장", "릴스 캡션", "댓글/팔로우 CTA", "광고/협찬 표시 문구"],
  copyActionLabel: "릴스 캡션 복사",
  studioActionLabel: "릴스 썸네일 만들기",
  videoActionLabel: "릴스 영상 만들기",
  exportActionLabel: "릴스 내보내기",
  captionVariantLabels: ["대표 릴스 캡션", "짧은 버전", "댓글 유도 버전"],
  ctaVariantLabels: ["댓글 유도", "팔로우 유도", "저장 유도"],
  hookVariantLabels: ["첫 장면 훅", "문제 제기 훅", "비교 훅", "저장 유도 훅", "댓글 유도 훅"],
  thumbnailVariantLabels: ["자막 1", "자막 2", "자막 3", "자막 4", "자막 5"],
  ctaExamples: ["제품에서 궁금한 점을 댓글로 남겨주세요.", "비교 영상이 더 필요하면 팔로우해 주세요.", "다시 보려고 저장해두세요."],
  hookExamples: ["실제 장면부터 보여드릴게요.", "고를 때 이 기준을 보면 편해요.", "영상으로 보면 비교하기 쉽습니다.", "다시 보려면 저장해두세요.", "여러분은 어떤 기준으로 고르나요?"],
  thumbnailExamples: ["사용 장면 보기", "주요 기준 체크", "실사용 비교", "찾는 분께", "댓글 의견"]
};

export const platformContentGuides: Record<Platform, PlatformContentGuide> = {
  "Instagram Feed": {
    label: "Instagram Feed",
    shortLabel: "피드",
    recommendedRatio: "4:5",
    resultFormat: "피드 본문 캡션 5개 + 해시태그 5~10개 + 짧은 CTA 3개",
    createDescription: "본문, 해시태그, 저장/댓글 CTA를 한 번에 정리",
    captionDescription: "Instagram Feed 본문에 바로 붙여넣을 수 있는 완성형 게시글 문구입니다.",
    captionTitle: "피드 본문 캡션 5개",
    ctaTitle: "짧은 CTA 3개",
    hookTitle: "피드 후킹 문구",
    thumbnailTitle: "피드 이미지 문구",
    showHashtags: true,
    hashtagLimit: 8,
    packageItems: ["피드 본문 캡션", "해시태그", "저장/댓글 CTA", "피드 이미지 문구", "광고/협찬 표시 문구"],
    copyActionLabel: "피드 본문 복사",
    studioActionLabel: "피드 이미지 만들기",
    videoActionLabel: "피드 영상 만들기",
    exportActionLabel: "피드 내보내기",
    captionVariantLabels: ["대표 본문", "짧은 프리미엄형", "상세 설명형", "사용 장면형", "구매 유도형"],
    ctaVariantLabels: ["저장 유도", "댓글 유도", "확인 유도"],
    hookVariantLabels: ["짧은 후킹", "저장 유도", "댓글 유도"],
    thumbnailVariantLabels: ["이미지 문구", "짧은 문구", "저장 문구"],
    ctaExamples: ["비교할 때 다시 보려고 저장해두세요.", "궁금한 기준을 댓글로 남겨주세요.", "자세한 옵션은 프로필에서 확인해보세요."],
    hookExamples: ["실제 사용 장면만 보여드려요.", "구매 전 비교하기 좋은 기준입니다.", "다시 보려고 저장해두세요."],
    thumbnailExamples: ["오늘의 사용 후기", "비교 기준", "저장하고 다시 보기"]
  },
  "Instagram Story": {
    label: "Instagram Story",
    shortLabel: "스토리",
    recommendedRatio: "9:16",
    resultFormat: "스토리 한 장 문구 5개 + 반응 유도 문구 3개",
    createDescription: "한 장에 짧게 읽히고 반응을 부르는 문구",
    captionDescription: "스토리 화면에 올리기 좋은 짧은 문장입니다.",
    captionTitle: "스토리 짧은 문구 5개",
    ctaTitle: "반응 유도 문구 3개",
    hookTitle: "스토리 첫 화면 문구",
    thumbnailTitle: "스토리 이미지 문구",
    showHashtags: false,
    hashtagLimit: 3,
    packageItems: ["스토리 한 장 문구", "반응 유도 문구", "링크/스티커 CTA", "스토리 이미지 문구", "광고/협찬 표시 문구"],
    copyActionLabel: "스토리 문구 복사",
    studioActionLabel: "스토리 이미지 만들기",
    videoActionLabel: "스토리 영상 만들기",
    exportActionLabel: "스토리 내보내기",
    captionVariantLabels: ["첫 장 문구", "짧은 안내", "링크 유도", "반응 유도", "저장 유도"],
    ctaVariantLabels: ["투표 스티커", "DM 유도", "링크 확인"],
    hookVariantLabels: ["짧은 훅", "링크 훅", "반응 훅"],
    thumbnailVariantLabels: ["스토리 문구", "링크 문구", "반응 문구"],
    ctaExamples: ["궁금하면 스티커로 반응해 주세요.", "필요한 정보는 링크에서 확인해보세요.", "더 알고 싶은 점은 DM으로 남겨주세요."],
    hookExamples: ["찾고 있었다면 체크.", "링크에서 바로 확인.", "어떤 기준이 더 중요해요?"],
    thumbnailExamples: ["바로 체크", "링크 확인", "반응 남기기"]
  },
  "Instagram Reels": instagramReelsGuide,
  "Reels Thumbnail": instagramReelsGuide,
  TikTok: {
    label: "TikTok",
    shortLabel: "틱톡",
    recommendedRatio: "9:16",
    resultFormat: "빠른 훅 5개 + 짧은 캡션 3개 + 댓글 유도 3개",
    createDescription: "빠르게 시선을 잡는 짧은 영상용 문구",
    captionDescription: "틱톡 캡션에 맞춘 짧고 말하듯 읽히는 문구입니다.",
    captionTitle: "틱톡 짧은 캡션 3개",
    ctaTitle: "댓글 유도 문구 3개",
    hookTitle: "빠른 훅 5개",
    thumbnailTitle: "영상 화면 문구",
    showHashtags: false,
    hashtagLimit: 4,
    packageItems: ["빠른 훅", "짧은 캡션", "댓글 유도 문구", "광고/협찬 표시 문구"],
    copyActionLabel: "틱톡 캡션 복사",
    studioActionLabel: "틱톡 썸네일 만들기",
    videoActionLabel: "틱톡 영상 만들기",
    exportActionLabel: "틱톡 내보내기",
    captionVariantLabels: ["말하듯 짧은 캡션", "실사용 버전", "댓글 유도 버전"],
    ctaVariantLabels: ["의견 유도", "비교 유도", "저장 유도"],
    hookVariantLabels: ["빠른 훅", "공감 훅", "비교 훅", "저장 훅", "댓글 훅"],
    thumbnailVariantLabels: ["화면 문구 1", "화면 문구 2", "화면 문구 3"],
    ctaExamples: ["여러분은 어떤 기준이 더 좋아요?", "비교 중이면 저장해두세요.", "궁금한 점은 댓글로 남겨주세요."],
    hookExamples: ["직접 써보면 이 부분이 먼저 보여요.", "보는 기준이 있으면 이 부분 보세요.", "고르기 전에 이 장면부터 보세요.", "같이 보면 차이가 보여요.", "여러분 취향인지 댓글로 알려주세요."],
    thumbnailExamples: ["짧은 사용 후기", "비교 기준", "댓글로 골라주세요"]
  },
  "YouTube Shorts": {
    label: "YouTube Shorts",
    shortLabel: "쇼츠",
    recommendedRatio: "9:16",
    resultFormat: "쇼츠 제목 후보 5개 + 설명란 문구 3개 + 고정댓글 3개",
    createDescription: "쇼츠 제목, 설명란, 고정댓글에 맞춘 문구",
    captionDescription: "쇼츠 설명란에 넣기 좋은 짧은 설명 문구입니다.",
    captionTitle: "쇼츠 설명란 문구 3개",
    ctaTitle: "고정댓글 문구 3개",
    hookTitle: "쇼츠 제목 후보 5개",
    thumbnailTitle: "쇼츠 화면 문구",
    showHashtags: false,
    hashtagLimit: 3,
    packageItems: ["쇼츠 제목 후보", "설명란 문구", "고정댓글 문구", "광고/협찬 표시 문구"],
    copyActionLabel: "쇼츠 설명 복사",
    studioActionLabel: "쇼츠 썸네일 만들기",
    videoActionLabel: "쇼츠 영상 만들기",
    exportActionLabel: "쇼츠 내보내기",
    captionVariantLabels: ["기본 설명", "짧은 설명", "확인 유도"],
    ctaVariantLabels: ["고정댓글 질문", "저장 유도", "다음 영상 유도"],
    hookVariantLabels: ["제목 후보 1", "제목 후보 2", "제목 후보 3", "제목 후보 4", "제목 후보 5"],
    thumbnailVariantLabels: ["화면 문구 1", "화면 문구 2", "화면 문구 3"],
    ctaExamples: ["궁금한 점은 고정댓글에 남겨주세요.", "비교할 때 다시 보려면 저장해두세요.", "다음 쇼츠에서 더 보여드릴게요."],
    hookExamples: ["사용해보고 남긴 짧은 후기", "고르기 전에 보면 좋은 장면", "같이 볼 때 달라지는 부분", "사도 괜찮을까?", "비교할 때 다시 보기"],
    thumbnailExamples: ["짧은 사용 후기", "비교 기준", "끝까지 보기"]
  },
  Facebook: {
    label: "Facebook",
    shortLabel: "Facebook",
    recommendedRatio: "1:1",
    resultFormat: "설명형 게시글 3개 + 공유 유도 문구 3개",
    createDescription: "조금 더 설명형으로 읽히는 게시글 문구",
    captionDescription: "Facebook 피드에 맞춘 설명형 게시글 문구입니다.",
    captionTitle: "Facebook 설명형 게시글 3개",
    ctaTitle: "공유 유도 문구 3개",
    hookTitle: "Facebook 후킹 문구",
    thumbnailTitle: "Facebook 이미지 문구",
    showHashtags: false,
    hashtagLimit: 4,
    packageItems: ["설명형 게시글", "공유 유도 문구", "광고/협찬 표시 문구"],
    copyActionLabel: "Facebook 본문 복사",
    studioActionLabel: "Facebook 이미지 만들기",
    videoActionLabel: "Facebook 영상 만들기",
    exportActionLabel: "Facebook 내보내기",
    captionVariantLabels: ["대표 게시글", "설명형 버전", "공유 유도 버전"],
    ctaVariantLabels: ["공유 유도", "댓글 유도", "확인 유도"],
    hookVariantLabels: ["소개 문구", "공유 문구", "댓글 문구"],
    thumbnailVariantLabels: ["이미지 문구", "짧은 문구", "공유 문구"],
    ctaExamples: ["필요한 분에게 공유해 주세요.", "궁금한 부분을 댓글로 남겨주세요.", "비교 기준을 다시 확인해보세요."],
    hookExamples: ["써보고 남긴 비교 기준.", "공유해두면 좋은 사용 후기.", "댓글로 이야기 나누기 좋은 질문."],
    thumbnailExamples: ["사용 후기", "공유할 정보", "비교 기준"]
  },
  X: {
    label: "X",
    shortLabel: "X",
    recommendedRatio: "16:9",
    resultFormat: "짧은 게시글 5개 + 최소 해시태그",
    createDescription: "짧고 명확한 한두 문장",
    captionDescription: "X 게시글에 맞춘 짧고 명확한 문장입니다.",
    captionTitle: "X 짧은 게시글 5개",
    ctaTitle: "짧은 반응 유도 문구",
    hookTitle: "X 후킹 문구",
    thumbnailTitle: "X 이미지 문구",
    showHashtags: true,
    hashtagLimit: 1,
    packageItems: ["짧은 게시글", "최소 해시태그", "반응 유도 문구", "광고/협찬 표시 문구"],
    copyActionLabel: "X 게시글 복사",
    studioActionLabel: "X 이미지 만들기",
    videoActionLabel: "X 영상 만들기",
    exportActionLabel: "X 내보내기",
    captionVariantLabels: ["대표 게시글", "짧은 버전", "정보 버전", "비교 버전", "댓글 유도 버전"],
    ctaVariantLabels: ["의견 유도", "공유 유도", "확인 유도"],
    hookVariantLabels: ["짧은 훅", "공유 훅", "댓글 훅"],
    thumbnailVariantLabels: ["이미지 문구", "짧은 문구", "공유 문구"],
    ctaExamples: ["써본 분들은 어떤가요?", "찾는 분에게 공유해 주세요.", "기준이 궁금하면 이어서 확인해보세요."],
    hookExamples: ["짧게 남기는 사용 후기.", "비교 기준만 바로 보기.", "공유하기 좋은 질문."],
    thumbnailExamples: ["짧은 후기", "비교 기준", "공유 질문"]
  }
};

export function normalizePlatform(platform: Platform): Platform {
  return platform === "Reels Thumbnail" ? "Instagram Reels" : platform;
}

export function getPlatformContentGuide(platform: Platform) {
  return platformContentGuides[platform] ?? platformContentGuides["Instagram Feed"];
}
