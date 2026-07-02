import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import {
  getPersonalizationSnapshot,
  getTopCaptionLength,
  getTopStyle
} from "@/lib/personalization";
import type { BrandProfile, CreateFormInput, GeneratedPackage, PersonalizationProfile } from "@/types";

const platformPhrase: Record<CreateFormInput["platform"], string> = {
  "Instagram Feed": "피드에서 오래 머무르게",
  "Instagram Story": "스토리에서 바로 반응하게",
  "Reels Thumbnail": "릴스 썸네일에서 손이 멈추게",
  TikTok: "틱톡 첫 화면에서 바로 눌러보게",
  "YouTube Shorts": "쇼츠 피드에서 빠르게 기억나게"
};

const purposePhrase: Record<CreateFormInput["purpose"], string> = {
  "Personal Post": "일상 속 자연스러운 추천",
  "Sponsored Post": "신뢰가 남는 협찬 소개",
  "Product Promotion": "구매 포인트가 선명한 제품 소개",
  "New Arrival": "새로움이 먼저 보이는 신상 알림",
  "Discount Event": "지금 행동하게 만드는 할인 소식",
  "Review Post": "직접 써본 듯한 후기 콘텐츠"
};

function normalizeList(value: string) {
  return value
    .split(/[,#\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function styleLead(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile) {
  const product = input.productName || "오늘의 콘텐츠";
  const base = `${product}을(를) ${platformPhrase[input.platform]} 보여주는`;
  const preferredStyle = personalization ? getTopStyle(personalization) : input.style;
  const effectiveStyle = preferredStyle || input.style;

  if (effectiveStyle === "고급 브랜드형" || brand.voice.includes("고급")) {
    return `${base} 차분하고 세련된 톤`;
  }

  if (effectiveStyle === "친구한테 말하듯" || personalization?.preferredTone.includes("친근") || brand.voice.includes("친근")) {
    return `${base} 친구에게 말하듯 편한 톤`;
  }

  if (effectiveStyle === "짧고 강한 카피형") {
    return `${base} 짧고 강한 톤`;
  }

  if (effectiveStyle === "전문 리뷰어형") {
    return `${base} 근거가 보이는 리뷰 톤`;
  }

  return `${base} ${effectiveStyle} 톤`;
}

function disclosureText(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile) {
  const shouldAutoDisclose = personalization?.accountType === "광고/제휴 계정" && input.sponsorDisclosure === "none";

  if (input.sponsorDisclosure === "none") {
    return shouldAutoDisclose ? personalization.sponsoredDisclosureStyle : "광고/협찬 표시 없음";
  }

  const map = {
    sponsored: "#협찬 콘텐츠입니다.",
    gifted: "제품을 제공받아 직접 사용해본 후기입니다.",
    ad: "#광고 | 브랜드와 함께 만든 콘텐츠입니다."
  };

  return `${map[input.sponsorDisclosure]} ${personalization?.sponsoredDisclosureStyle || brand.defaultDisclosure}`;
}

function buildHashtags(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile) {
  const required = normalizeList(input.requiredKeywords).map((item) => `#${item.replace(/\s+/g, "")}`);
  const favorites = normalizeList(brand.favoriteHashtags).map((item) => `#${item.replace(/^#/, "").replace(/\s+/g, "")}`);
  const learned = personalization?.frequentlyUsedHashtags ?? [];
  const product = input.productName ? [`#${input.productName.replace(/\s+/g, "")}`] : [];
  const category = brand.category ? [`#${brand.category.split("/")[0].trim().replace(/\s+/g, "")}`] : [];

  const base = [
    ...product,
    ...category,
    ...required,
    ...learned,
    ...favorites,
    "#인스타콘텐츠",
    "#콘텐츠기획",
    "#오늘의추천",
    "#리뷰",
    "#신상",
    "#소장템",
    "#일상기록",
    "#취향공유",
    "#브랜드스토리",
    "#쇼츠",
    "#릴스",
    "#틱톡",
    "#업로드준비",
    "#콘텐츠패키지",
    "#마케팅"
  ];

  return Array.from(new Set(base)).slice(0, 20);
}

function reorderByCaptionLength(captions: string[], personalization?: PersonalizationProfile) {
  if (!personalization) {
    return captions;
  }

  const length = getTopCaptionLength(personalization);

  return [...captions].sort((a, b) => {
    if (length === "short") return a.length - b.length;
    if (length === "long") return b.length - a.length;
    return Math.abs(a.length - 130) - Math.abs(b.length - 130);
  });
}

function personalizedCtas(personalization?: PersonalizationProfile) {
  const base = {
    save: "저장해두고 업로드 전에 다시 확인하기",
    comment: "궁금한 점은 댓글로 남겨주세요",
    share: "지금 필요한 친구에게 공유하기",
    link: "프로필 링크에서 자세히 보기",
    purchase: "오늘 바로 써보고 싶은 포인트 체크하기"
  };
  const preferred = personalization?.preferredCTAStyle ?? "save";

  return [
    base[preferred],
    base.save,
    base.comment,
    base.share,
    base.link,
    base.purchase
  ].filter((item, index, array) => array.indexOf(item) === index).slice(0, 5);
}

function filterBanned(items: string[], banned: string) {
  const bannedWords = normalizeList(banned).map((word) => word.toLowerCase());

  if (bannedWords.length === 0) {
    return items;
  }

  return items.map((item) => {
    let nextItem = item;
    bannedWords.forEach((word) => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextItem = nextItem.replace(new RegExp(escapedWord, "gi"), "좋은");
    });
    return nextItem;
  });
}

export async function generateMockUploadPackage(
  input: CreateFormInput,
  brand: BrandProfile,
  personalization?: PersonalizationProfile
): Promise<GeneratedPackage> {
  await new Promise((resolve) => setTimeout(resolve, 650));

  const product = input.productName || "오늘의 추천템";
  const lead = styleLead(input, brand, personalization);
  const required = input.requiredKeywords ? ` ${input.requiredKeywords}` : "";
  const learnedRequired = personalization?.requiredPhrases.length ? ` ${personalization.requiredPhrases.slice(0, 2).join(" ")}` : "";
  const requiredPhrase = brand.requiredPhrases ? ` ${brand.requiredPhrases}${learnedRequired}` : learnedRequired;
  const title = `${product} ${input.platform} 업로드 패키지`;
  const toneHint = personalization?.preferredTone ? `${personalization.preferredTone} 톤으로 ` : "";

  const captions = reorderByCaptionLength(
    filterBanned(
      [
        `${lead}으로 준비했어요. ${purposePhrase[input.purpose]}가 필요했다면 오늘 이 포인트만 기억해 주세요.${requiredPhrase}`,
        `${product}, 써보면 왜 저장해두는지 알게 되는 아이템이에요. 핵심은 편하고 예쁘게, 그리고 오래 쓰기 좋은 균형감입니다.${required}`,
        `오늘 콘텐츠는 ${brand.accountName} 계정 무드에 맞춰 ${toneHint}정돈해봤어요. 사진 한 장에서도 ${brand.feedMood} 느낌이 살아나도록 문장을 가볍게 잡았습니다.`,
        `${purposePhrase[input.purpose]}를 만들고 싶다면 첫 문장은 짧게, 장점은 구체적으로, 마지막은 행동으로 이어지게 가져가면 좋아요.`,
        `${input.platform}에 올리기 전 체크 완료. ${product}의 분위기와 사용 이유가 한 번에 보이도록 캡션, 해시태그, CTA까지 묶어두었습니다.`
      ],
      `${input.bannedKeywords},${brand.bannedPhrases},${(personalization?.bannedPhrases ?? []).join(",")}`
    ),
    personalization
  );

  const ctas = personalizedCtas(personalization);

  const hooks = [
    `${product}, 첫 2초 안에 이 포인트만 보여주세요`,
    "넘기기 전에 색감과 결과를 먼저 보여주기",
    "이 장면 하나로 사용 이유 설명 끝",
    "처음 보는 사람도 바로 이해하는 한 줄",
    "후기처럼 시작하고 혜택으로 마무리하기"
  ];

  const thumbnails = [
    "오늘 업로드는 이걸로",
    "저장 부르는 추천템",
    "첫눈에 보는 핵심 포인트",
    "써보면 다른 이유",
    "짧고 확실한 사용 후기"
  ];

  const checklist = [
    "첫 문장에 핵심 가치가 보이는지 확인",
    "광고/협찬 표시가 필요한 경우 앞부분에 배치",
    "해시태그가 20개 이하이고 금지 키워드가 없는지 확인",
    "썸네일 문구가 모바일에서 한눈에 읽히는지 확인",
    "CTA가 댓글, 저장, 링크 중 하나로 명확한지 확인"
  ];

  return {
    id: `pkg-${Date.now()}`,
    title,
    createdAt: new Date().toISOString(),
    platform: input.platform,
    purpose: input.purpose,
    style: input.style,
    usedCredits: PACKAGE_CREDIT_COST,
    captions,
    hashtags: buildHashtags(input, brand, personalization),
    ctas,
    hooks,
    thumbnails,
    disclosure: disclosureText(input, brand, personalization),
    checklist,
    packageItems: [
      "피드용 문구",
      "스토리용 문구",
      "릴스 썸네일 문구",
      "캡션 5개",
      "해시태그 세트",
      "CTA 문구",
      "광고/협찬 표시 문구"
    ],
    input,
    personalization: personalization ? getPersonalizationSnapshot(personalization) : undefined
  };
}
