import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import { getPlatformContentGuide, normalizePlatform } from "@/lib/platformGuidance";
import {
  getPersonalizationSnapshot,
  getTopCaptionLength
} from "@/lib/personalization";
import type { BrandProfile, CreateFormInput, GeneratedPackage, PersonalizationProfile, Platform } from "@/types";

type GeneratedTextKind = "caption" | "hashtag" | "cta" | "hook" | "thumbnail" | "disclosure" | "checklist";

type CopyContext = {
  platform: Platform;
  product: string;
  category: string;
  keywords: string[];
  primaryKeyword: string;
  secondaryKeyword: string;
  keywordSummary: string;
  keywordLine: string;
  mood: string;
  benefit: string;
  action: string;
  useScene: string;
  featurePhrase: string;
  audiencePhrase: string;
  sourceText: string;
  productIsFallback: boolean;
};

type PlatformCopyBundle = {
  captions: string[];
  ctas: string[];
  hooks: string[];
  thumbnails: string[];
};

const purposeBenefit: Record<CreateFormInput["purpose"], string> = {
  "Personal Post": "평소 쓰는 장면에 맞는 사용감",
  "Sponsored Post": "직접 써본 뒤 말할 수 있는 부분",
  "Product Promotion": "구매 전 비교하기 좋은 장점",
  "New Arrival": "새 제품에서 먼저 볼 만한 특징",
  "Discount Event": "가격 조건을 확인하기 좋은 타이밍",
  "Review Post": "써본 뒤 남은 사용감"
};

const purposeAction: Record<CreateFormInput["purpose"], string> = {
  "Personal Post": "저장해두고 나중에 다시 봐도 좋아요.",
  "Sponsored Post": "궁금한 점은 댓글로 남겨주세요.",
  "Product Promotion": "자세한 옵션은 프로필에서 확인해보세요.",
  "New Arrival": "먼저 확인하고 싶은 분들은 지금 둘러보세요.",
  "Discount Event": "조건이 끝나기 전에 확인해보세요.",
  "Review Post": "비슷한 취향이라면 저장해두고 비교해보세요."
};

const platformTermGroups: Array<{ platform: Platform; terms: string[] }> = [
  { platform: "Instagram Feed", terms: ["instagram feed", "인스타그램 피드", "피드"] },
  { platform: "Instagram Story", terms: ["instagram story", "인스타그램 스토리", "스토리"] },
  { platform: "Instagram Reels", terms: ["instagram reels", "인스타그램 릴스", "reels", "릴스"] },
  { platform: "TikTok", terms: ["tiktok", "틱톡"] },
  { platform: "YouTube Shorts", terms: ["youtube shorts", "유튜브 쇼츠", "shorts", "쇼츠"] },
  { platform: "Facebook", terms: ["facebook", "페이스북"] },
  { platform: "X", terms: ["x 게시글", "x 포스트", "트위터"] }
];

const forbiddenOutputPatterns = [
  /PostKit/gi,
  /Studio/gi,
  /샘플\s*AI/gi,
  /\bAI\b/gi,
  /생성기/gi,
  /추천 템플릿/gi,
  /MockProvider/gi,
  /첫 문장은 짧게/g,
  /장점은 구체적으로/g,
  /마지막은 행동으로/g,
  /핵심은\s*[^.\n]*입니다/g,
  /핵심은/g,
  /오늘 이 포인트/g,
  /오늘 콘텐츠는/g,
  /체크 완료/g,
  /준비했어요/g,
  /기억해 주세요/g,
  /자연스러운 추천/g,
  /분위기를 바꿔요/g,
  /계정 무드/g,
  /바로 반응하게/g,
  /일상 속/g,
  /매일 손이 가는/g,
  /편하고 예쁘게/g,
  /오래 쓰기 좋은 균형감/g,
  /써보면 왜/g,
  /스토리에 올리기 전/g,
  /캡션,\s*해시태그,\s*CTA까지\s*묶어두었습니다/g,
  /선택한 캡션/g,
  /이 캡션 선택/g,
  /저장해두고 보기/g,
  /친구에게 말하듯/g,
  /자연스럽게/g,
  /업로드 패키지/g,
  /콘텐츠 패키지/g,
  /기준을\s*(보는|같이|먼저|확인|비교)/g,
  /기준도\s*놓치지/g,
  /쓰임이\s*분명한\s*쪽/g,
  /실제로\s*쓰는\s*장면/g,
  /필요한\s*옵션/g,
  /게시물에서\s*먼저\s*확인/g,
  /바로\s*쓰\s*기\s*좋/g,
  /선물용이나/g,
  /링크\s*열어두었어요/g,
  /스토리에서\s*바로\s*저장/g,
  /오늘\s*확인\s*가능합니다/g
];

const overblownPatterns = [
  /완벽/g,
  /무조건/g,
  /역대급/g,
  /인생템/g,
  /대박/g,
  /최고/g,
  /필수템/g,
  /혁명/g,
  /난리/g,
  /품절대란/g,
  /100%/g,
  /절대/g
];

const meaninglessPatterns = [
  /저장해두고 보기\s*저장해두고 보기/g,
  /([가-힣A-Za-z0-9]{2,})\s+\1\s+\1/g,
  /(.)\1{6,}/g
];

const abstractPatterns = [
  /작은 차이/g,
  /분위기를?\s*(크게\s*)?바꾸/g,
  /충분히 달라질/g,
  /오래 봐도 질리지/g,
  /첫눈에 들어오는/g,
  /무드/g,
  /분위기/g,
  /느낌/g,
  /선택/g,
  /포인트/g,
  /디테일/g,
  /구성/g
];

const guideLikePatterns = [
  /기준으로\s*(확인|비교)해보세요/g,
  /먼저\s*체크해보세요/g,
  /필요한 부분만/g,
  /사용 장면을 떠올리/g,
  /후보에 넣어볼 만/g,
  /설명합니다/g,
  /정리했습니다/g,
  /담았습니다/g,
  /작성\s*가이드/g,
  /설명서처럼/g
];

const brokenParticlePatterns = [
  /캐비어을/g,
  /캐비어이/g,
  /제품이를/g,
  /커버이어/g,
  /[가-힣A-Za-z0-9]+을을/g,
  /[가-힣A-Za-z0-9]+를를/g,
  /[가-힣A-Za-z0-9]+은는/g,
  /[가-힣A-Za-z0-9]+이는/g
];

const ctaActionPatterns = [
  /저장/g,
  /댓글/g,
  /확인/g,
  /링크/g,
  /DM/i,
  /공유/g,
  /팔로우/g,
  /반응/g,
  /비교/g,
  /문의/g,
  /보기/g,
  /방문/g,
  /둘러보/g,
  /고정댓글/g,
  /남겨/g,
  /골라/g
];

function normalizeList(value: string | undefined) {
  return (value ?? "")
    .split(/[,#\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scrubGeneratedText(value: string) {
  let nextValue = value;

  forbiddenOutputPatterns.forEach((pattern) => {
    nextValue = nextValue.replace(pattern, "");
  });

  return nextValue
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function cleanDisplayText(value: string | undefined, fallback: string) {
  const cleaned = scrubGeneratedText(value ?? "")
    .replace(/[|/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

function firstCategory(value: string | undefined) {
  return cleanDisplayText((value ?? "").split("/")[0], "라이프스타일");
}

function styleMood(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile) {
  const preferred = cleanDisplayText(personalization?.preferredTone, "");
  if (preferred) {
    return preferred;
  }

  const source = `${input.style} ${brand.voice}`;
  if (source.includes("고급")) return "차분한 톤";
  if (source.includes("정보") || source.includes("리뷰")) return "정보 위주 톤";
  if (source.includes("광고") || source.includes("판매")) return "구매 전 확인 톤";
  if (source.includes("감성")) return "부드럽게 읽히는 톤";
  if (source.includes("친구")) return "가볍게 말하는 톤";
  if (source.includes("짧")) return "짧고 분명한 문장";
  return "편하게 읽히는 톤";
}

function makeKeywordLine(keywords: string[]) {
  if (keywords.length === 0) {
    return "";
  }

  return `${keywords.slice(0, 2).join(", ")} 쪽을 중요하게 보는 분에게 맞습니다.`;
}

function withOptionalLine(lines: string[]) {
  return lines.map((line) => scrubGeneratedText(line)).filter(Boolean).join("\n");
}

function createCopyContext(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile): CopyContext {
  const cleanedProduct = cleanDisplayText(input.productName, "");
  const product = cleanedProduct || "오늘의 추천";
  const category = firstCategory(brand.category);
  const keywords = normalizeList(input.requiredKeywords).map((item) => cleanDisplayText(item, "")).filter(Boolean).slice(0, 3);
  const platform = normalizePlatform(input.platform);
  const primaryKeyword = keywords[0] ?? category;
  const secondaryKeyword = keywords[1] ?? "실사용";
  const topicSource = `${product} ${category} ${keywords.join(" ")}`.toLocaleLowerCase("ko-KR");
  const useScene = makeUseScene(topicSource, category);
  const featurePhrase = makeFeaturePhrase(keywords, purposeBenefit[input.purpose]);
  const audiencePhrase = makeAudiencePhrase(topicSource, category);

  return {
    platform,
    product,
    category,
    keywords,
    primaryKeyword,
    secondaryKeyword,
    keywordSummary: keywords.length > 0 ? keywords.join(", ") : category,
    keywordLine: makeKeywordLine(keywords),
    mood: styleMood(input, brand, personalization),
    benefit: purposeBenefit[input.purpose],
    action: purposeAction[input.purpose],
    useScene,
    featurePhrase,
    audiencePhrase,
    sourceText: `${input.productName} ${input.requiredKeywords} ${input.requiredHashtags ?? ""}`.toLocaleLowerCase("ko-KR"),
    productIsFallback: !cleanedProduct
  };
}

function makeFeaturePhrase(keywords: string[], fallback: string) {
  if (keywords.length >= 2) {
    return `${keywords[0]}, ${keywords[1]}`;
  }

  return keywords[0] ?? fallback;
}

function makeUseScene(source: string, category: string) {
  if (/캐비어|식탁|와인|파스타|크래커|안주|선물/.test(source)) {
    return "특별한 날의 식탁";
  }
  if (/셔츠|린넨|운동화|신발|데님|슬랙스|룩|코디|원피스|니트/.test(source)) {
    return "출근룩이나 주말 코디";
  }
  if (/카페|딸기라떼|라떼|커피|디저트|메뉴|음료/.test(source)) {
    return "달달한 메뉴가 생각나는 날";
  }
  if (/거치대|스마트폰|휴대폰|침대|책상|영상|각도/.test(source)) {
    return "침대나 책상에서 영상 볼 때";
  }
  if (/세일|할인|특가|이벤트|쿠폰/.test(source)) {
    return "사이즈나 옵션이 남아 있을 때";
  }
  if (/향수|립밤|크림|스킨|뷰티|메이크업/.test(source)) {
    return "외출 전이나 가방에 챙길 때";
  }

  return `${category}를 고르는 순간`;
}

function makeAudiencePhrase(source: string, category: string) {
  if (/선물/.test(source)) return "선물용으로 고민하는 분들";
  if (/세일|할인|특가|이벤트/.test(source)) return "이번 주에 필요한 제품을 찾는 분들";
  if (/카페|메뉴|라떼|디저트/.test(source)) return "달달한 메뉴를 찾는 분들";
  if (/셔츠|운동화|룩|코디|옷/.test(source)) return "데일리룩을 고민하는 분들";
  if (/거치대|스마트폰|영상|책상/.test(source)) return "영상 보거나 작업할 때 손이 불편했던 분들";
  return `${category}를 찾는 분들`;
}

function productLabel(context: CopyContext) {
  return context.productIsFallback ? context.category : context.product;
}

function compactProductLabel(context: CopyContext) {
  const label = productLabel(context);
  return Array.from(label).slice(0, 32).join("");
}

function productUseDetail(context: CopyContext) {
  const source = context.sourceText;

  if (/캐비어|식탁|와인|파스타|크래커|안주|선물/.test(source)) {
    return "차갑게 준비한 와인, 담백한 크래커, 간단한 치즈와 함께 내기 좋습니다.";
  }
  if (/셔츠|린넨|데님|슬랙스|룩|코디|원피스|니트/.test(source)) {
    return "가볍게 걸쳐도 답답하지 않고 데님이나 슬랙스에 맞추기 쉽습니다.";
  }
  if (/운동화|신발|스니커즈/.test(source)) {
    return "데일리로 신기 좋은 모델 위주라 출근길과 주말 외출에 모두 맞습니다.";
  }
  if (/카페|딸기라떼|라떼|커피|디저트|메뉴|음료/.test(source)) {
    return "달달한 메뉴가 생각나는 날, 부담 없이 고르기 좋은 맛입니다.";
  }
  if (/거치대|스마트폰|휴대폰|침대|책상|영상|각도/.test(source)) {
    return "침대나 책상에서 영상을 볼 때 각도를 잡기 쉽고 자리도 많이 차지하지 않습니다.";
  }
  if (/세일|할인|특가|이벤트|쿠폰/.test(source)) {
    return "데일리로 쓰기 좋은 옵션 위주라 사이즈가 남아 있을 때 비교하기 좋습니다.";
  }
  if (/향수|립밤|크림|스킨|뷰티|메이크업/.test(source)) {
    return "가방에 넣고 수시로 꺼내 쓰기 좋고 사용감도 무겁지 않습니다.";
  }

  if (context.keywords.length >= 2) {
    return `${context.primaryKeyword}, ${context.secondaryKeyword} 부분을 함께 살펴보고 고르기 좋습니다.`;
  }

  return `${context.useScene}에 ${context.primaryKeyword}를 먼저 살펴보기 좋습니다.`;
}

function purchaseCta(context: CopyContext) {
  if (context.sourceText.includes("문의")) {
    return "궁금한 점은 DM이나 댓글로 남겨주세요.";
  }
  if (/세일|할인|특가|이벤트|쿠폰/.test(context.sourceText)) {
    return "사이즈나 옵션이 남아 있을 때 먼저 확인해 보세요.";
  }
  if (/카페|메뉴|라떼|커피|디저트/.test(context.sourceText)) {
    return "매장 방문 전 메뉴와 판매 시간을 확인해 주세요.";
  }

  return "구성과 보관 방법을 확인한 뒤 필요한 수량으로 선택해 주세요.";
}

function productQuestion(context: CopyContext) {
  return `${productLabel(context)} 궁금한 부분은 댓글로 남겨주세요.`;
}

// Good output baseline: write ready-to-post copy such as
// "요즘 자주 쓰는 제품이라 한 번 적어봤어요..." instead of abstract writing advice.
function buildFeedCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      withOptionalLine([
        `${label}, ${context.useScene}에 잘 어울립니다.`,
        `${context.primaryKeyword}을 찾는 분이라면 ${productUseDetail(context)}`,
        "복잡하게 준비하지 않아도 첫인상이 또렷하게 남습니다."
      ]),
      withOptionalLine([
        `${label}, ${context.useScene}에 조금 더해보세요.`,
        `${context.secondaryKeyword}를 살리기 좋아서 사진보다 실제 자리에서 더 잘 어울립니다.`,
        "함께 둘 메뉴나 소품을 고르면 준비가 한결 쉬워집니다."
      ]),
      withOptionalLine([
        `${label}, ${context.audiencePhrase}에게 소개하기 좋습니다.`,
        `${context.primaryKeyword}을 고민하고 있다면 너무 과하지 않으면서도 기억에 남는 쪽입니다.`,
        "기념일이나 작은 모임을 준비할 때 후보로 남겨두세요."
      ]),
      withOptionalLine([
        `${label}, 처음 준비할 때 어렵게 느껴질 수 있지만 생각보다 간단했습니다.`,
        `${context.secondaryKeyword}와 함께 두면 준비한 자리가 훨씬 선명해집니다.`,
        `${context.primaryKeyword}이 필요했던 날이라면 다시 찾게 될 만합니다.`
      ]),
      withOptionalLine([
        `${label} 관련 정보가 궁금하다면 구성과 보관 방법을 먼저 확인해 주세요.`,
        `${context.primaryKeyword} 구성인지, ${context.secondaryKeyword}로 어울리는지 살펴보고 선택하면 됩니다.`,
        purchaseCta(context)
      ])
    ],
    ctas: [
      `${label} 비교 중이라면 이 글을 저장해두세요.`,
      `${context.primaryKeyword} 관련해서 궁금한 점을 댓글로 남겨주세요.`,
      `${context.secondaryKeyword}도 중요하다면 구성 정보를 확인해 주세요.`
    ],
    hooks: [],
    thumbnails: []
  };
}

function buildStoryCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      withOptionalLine([`${label} 오늘 준비됐어요.`, `${context.primaryKeyword} 찾던 분께 맞아요.`]),
      withOptionalLine([`${label} ${context.secondaryKeyword}`, "짧게 보고 결정해도 충분해요."]),
      withOptionalLine([`${label} ${context.primaryKeyword} 궁금하면`, "DM으로 물어봐 주세요."]),
      withOptionalLine([`${label} ${context.secondaryKeyword} 마음에 드나요?`, "스티커로 골라주세요."]),
      withOptionalLine([`${label} 놓치기 전에`, `${context.primaryKeyword} 먼저 확인해 주세요.`])
    ],
    ctas: [
      `${label} 궁금하면 스티커로 반응해 주세요.`,
      `${context.primaryKeyword} 정보가 필요하면 DM 주세요.`,
      `${label}에서 더 알고 싶은 점은 DM으로 남겨주세요.`
    ],
    hooks: [],
    thumbnails: []
  };
}

function buildReelsCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      withOptionalLine([
        `${label}, 영상으로 짧게 보여드립니다.`,
        `${context.primaryKeyword}, ${context.secondaryKeyword} 포인트를 바로 확인할 수 있습니다.`,
        productQuestion(context)
      ]),
      withOptionalLine([
        `${label} 사진만으로 판단하기 어려웠다면 이 장면을 봐주세요.`,
        `${context.useScene}에 맞는지, ${context.secondaryKeyword} 부분이 어떤지 확인하기 쉽습니다.`,
        "다시 보고 싶다면 저장해두세요."
      ]),
      withOptionalLine([
        `${label}, ${context.useScene}에 맞는지 짧은 영상으로 보여드립니다.`,
        `${context.primaryKeyword}, ${context.secondaryKeyword} 부분을 중요하게 본다면 짧게 확인해 주세요.`,
        "다음 영상도 보고 싶다면 팔로우해 주세요."
      ])
    ],
    ctas: [
      `${label} 궁금한 점을 댓글로 남겨주세요.`,
      `${label} 비교 영상이 더 필요하면 팔로우해 주세요.`,
      `${label} 다시 보려고 저장해두세요.`
    ],
    hooks: [
      `${label} ${context.primaryKeyword}, 첫 장면에서 바로 보여드릴게요.`,
      `${label} 고를 때 ${context.primaryKeyword} 본다면 이 부분부터 보세요.`,
      `${label} ${context.secondaryKeyword} 장면은 사진보다 이해가 빠릅니다.`,
      `${label} ${context.secondaryKeyword} 부분은 이 컷에서 보입니다.`,
      `${label} ${context.primaryKeyword} 궁금한 점을 댓글로 남겨주세요.`
    ],
    thumbnails: [
      `${label} 실제 장면`,
      `${context.primaryKeyword} 체크`,
      `${context.secondaryKeyword} 비교`,
      `${label} 고르기 전`,
      `${label} 댓글 질문`
    ]
  };
}

function buildTikTokCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      withOptionalLine([
        `${label} 써봤는데 ${context.primaryKeyword} 쪽은 괜찮았어요.`,
        `${context.secondaryKeyword}까지 보는 분이면 영상으로 먼저 보세요.`,
        "여러분 취향인지 댓글로 알려주세요."
      ]),
      withOptionalLine([
        `${label} 찾고 있었다면 이 장면부터 보면 됩니다.`,
        `${context.primaryKeyword}을 중요하게 볼 때 실제 사용감이 더 잘 보입니다.`,
        productUseDetail(context),
        "비슷한 취향이면 저장해두세요."
      ]),
      withOptionalLine([
        `${label}, ${context.useScene}에 바로 써봤습니다.`,
        `${context.keywordSummary}을 중요하게 보는 분이면 댓글로 의견 남겨주세요.`,
        "궁금한 점은 댓글로 남겨주세요."
      ])
    ],
    ctas: [
      `${label} 어떤 쪽이 더 좋은지 댓글로 알려주세요.`,
      `${label} 찾는 중이면 저장해두세요.`,
      `${label} 궁금한 점은 댓글로 남겨주세요.`
    ],
    hooks: [
      `${label} ${context.primaryKeyword}, 직접 사용하면 이 부분이 먼저 보입니다.`,
      `${label} ${context.primaryKeyword} 중요하면 여기 보세요.`,
      `${label} ${context.secondaryKeyword} 찾는 중이면 이 장면만 봐도 됩니다.`,
      `${label} ${context.secondaryKeyword}는 여기서 차이가 보입니다.`,
      `${label} ${context.primaryKeyword}, 여러분 취향인지 댓글로 알려주세요.`
    ],
    thumbnails: []
  };
}

function buildShortsCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      withOptionalLine([
        `${label} 짧게 사용해보고 남긴 영상입니다.`,
        `${context.primaryKeyword}, ${context.secondaryKeyword} 부분을 함께 보는 분이라면 끝까지 확인해 주세요.`
      ]),
      withOptionalLine([
        `${label} 고민 중인 분들을 위해 실제 장면만 모았습니다.`,
        `${context.primaryKeyword}을 중요하게 봐도 부담 없는지 확인할 수 있어요.`,
        `${context.useScene} 어떤지 짧게 확인해 주세요.`
      ]),
      withOptionalLine([
        `${label} 실제 장면에서 ${context.featurePhrase} 부분을 함께 볼 수 있어요.`,
        "궁금한 점은 고정댓글에 남겨주세요."
      ])
    ],
    ctas: [
      `${label} 궁금한 점은 고정댓글에 남겨주세요.`,
      `${context.category} 비교할 때 다시 보려면 저장해두세요.`,
      `${context.primaryKeyword} 관련해서 더 보고 싶은 점은 댓글로 남겨주세요.`
    ],
    hooks: [
      `${label} ${context.primaryKeyword} 후기`,
      `${label} ${context.primaryKeyword} 보기 전 장면`,
      `${label} ${context.secondaryKeyword}까지 볼 때 다른 부분`,
      `${label}, ${context.primaryKeyword} 괜찮을까?`,
      `${label} ${context.secondaryKeyword} 비교할 때 다시 보기`
    ],
    thumbnails: []
  };
}

function buildXCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      `${label}, ${context.primaryKeyword}을 먼저 보는 분이라면 비교해볼 만합니다.`,
      `${label} 찾는 중이면 ${context.secondaryKeyword}까지 같이 확인해 보세요.`,
      `${label}, 짧게 말하면 ${context.primaryKeyword}을 중요하게 보는 분께 맞습니다.`,
      `${label} 관련해서 ${context.keywordSummary}을 궁금해한 분께 맞습니다.`,
      `${label} 구성과 ${context.secondaryKeyword}를 함께 확인해 보세요.`
    ],
    ctas: [
      `${label} 써본 분들은 댓글로 알려주세요.`,
      `${label} 찾는 분에게 공유해 주세요.`,
      `${context.primaryKeyword} 관련해서 궁금하면 이어서 확인해 보세요.`
    ],
    hooks: [],
    thumbnails: []
  };
}

function buildFacebookCopy(context: CopyContext): PlatformCopyBundle {
  const label = productLabel(context);

  return {
    captions: [
      withOptionalLine([
        `${label} 찾고 있었다면 이번에 비교해볼 만합니다.`,
        `${context.useScene}, ${context.featurePhrase}을 함께 살펴볼 수 있어 필요한 분에게 잘 맞습니다.`,
        `${label} 필요한 분에게 공유해 주세요.`
      ]),
      withOptionalLine([
        `${label} 고를 때는 ${context.primaryKeyword}을 먼저 보게 됩니다.`,
        `${context.secondaryKeyword}까지 같이 확인할 수 있어서 구매 전 비교용으로 괜찮습니다.`,
        productQuestion(context)
      ]),
      withOptionalLine([
        `${label} 실제로 쓸 상황을 생각해보면`,
        `${context.primaryKeyword}, ${context.benefit}이 필요한 분에게 맞는지 판단하기 쉽습니다.`,
        "주변에 필요한 분이 있다면 공유해 주세요."
      ])
    ],
    ctas: [
      `${label} 필요한 분에게 공유해 주세요.`,
      `${label} 궁금한 부분을 댓글로 남겨주세요.`,
      `${context.keywordSummary} 기준으로 다시 확인해 보세요.`
    ],
    hooks: [],
    thumbnails: []
  };
}

function buildPlatformCopy(context: CopyContext): PlatformCopyBundle {
  switch (context.platform) {
    case "Instagram Story":
      return buildStoryCopy(context);
    case "Instagram Reels":
      return buildReelsCopy(context);
    case "TikTok":
      return buildTikTokCopy(context);
    case "YouTube Shorts":
      return buildShortsCopy(context);
    case "Facebook":
      return buildFacebookCopy(context);
    case "X":
      return buildXCopy(context);
    case "Instagram Feed":
    case "Reels Thumbnail":
    default:
      return buildFeedCopy(context);
  }
}

function hashtagFrom(value: string) {
  const cleaned = cleanDisplayText(value, "")
    .replace(/^#/, "")
    .replace(/[^0-9A-Za-z가-힣_]/g, "");

  return cleaned ? `#${cleaned}` : "";
}

function platformHashtagDefaults(platform: Platform) {
  switch (normalizePlatform(platform)) {
    case "Instagram Story":
      return ["#오늘메뉴", "#신상", "#메뉴소식"];
    case "Instagram Reels":
      return ["#릴스", "#사용후기", "#데일리", "#리뷰", "#실사용"];
    case "TikTok":
      return ["#틱톡", "#사용후기", "#리뷰", "#실사용"];
    case "YouTube Shorts":
      return ["#쇼츠", "#리뷰", "#실사용"];
    case "Facebook":
      return ["#소식", "#공유", "#생활정보", "#리뷰"];
    case "X":
      return ["#소식"];
    case "Instagram Feed":
    case "Reels Thumbnail":
    default:
      return ["#데일리템", "#라이프스타일", "#사용후기", "#선물템", "#리뷰"];
  }
}

function buildHashtags(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile) {
  const guide = getPlatformContentGuide(input.platform);
  const sourceItems = [
    input.productName,
    firstCategory(brand.category),
    ...normalizeList(input.requiredKeywords),
    ...normalizeList(input.requiredHashtags),
    ...(personalization?.frequentlyUsedHashtags ?? []),
    ...normalizeList(brand.favoriteHashtags),
    ...platformHashtagDefaults(input.platform)
  ];

  const hashtags = sourceItems
    .map(hashtagFrom)
    .filter((item) => item && item.length <= 18 && !/PostKit|Studio|AI|템플릿|Demo/i.test(item));

  return Array.from(new Set(hashtags)).slice(0, guide.hashtagLimit);
}

function disclosureText(input: CreateFormInput, brand: BrandProfile, personalization?: PersonalizationProfile) {
  const shouldAutoDisclose = personalization?.accountType === "광고/제휴 계정" && input.sponsorDisclosure === "none";

  if (input.sponsorDisclosure === "none") {
    return shouldAutoDisclose ? personalization.sponsoredDisclosureStyle : "광고/협찬 표시 없음";
  }

  const map: Record<Exclude<CreateFormInput["sponsorDisclosure"], "none">, string> = {
    sponsored: "#협찬 콘텐츠입니다.",
    gifted: "제품을 제공받아 직접 사용해본 뒤 작성했습니다.",
    ad: "#광고 | 브랜드와 함께 만든 콘텐츠입니다."
  };

  return `${map[input.sponsorDisclosure]} ${personalization?.sponsoredDisclosureStyle || brand.defaultDisclosure}`.trim();
}

function hasRepeatedWord(value: string) {
  const words = value.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [];
  const counts = new Map<string, number>();

  return words.some((word) => {
    const key = word.toLocaleLowerCase("ko-KR");
    const nextCount = Number(counts.get(key) ?? 0) + 1;
    counts.set(key, nextCount);
    return nextCount >= 3;
  });
}

function hasAwkwardRepeatedWord(value: string, context: CopyContext) {
  const words = value.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [];
  const topicWords = new Set(
    [context.product, context.category, ...context.keywords]
      .flatMap((item) => item.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [])
      .map((item) => item.toLocaleLowerCase("ko-KR"))
  );
  const allowedWords = new Set(["댓글", "저장", "비교", "확인", "궁금", "제품", "메뉴", "영상", "사용", "분들", "좋아요", "기준", "옵션"]);
  const counts = new Map<string, number>();

  return words.some((word, index) => {
    const key = word.toLocaleLowerCase("ko-KR");
    const previousKey = words[index - 1]?.toLocaleLowerCase("ko-KR");

    if (key === previousKey) {
      return true;
    }

    if (word.length < 3 || topicWords.has(key) || allowedWords.has(key)) {
      return false;
    }

    const nextCount = Number(counts.get(key) ?? 0) + 1;
    counts.set(key, nextCount);
    return nextCount >= 2;
  });
}

function hasWrongPlatformMention(value: string, platform: Platform, sourceText: string) {
  const selectedPlatform = normalizePlatform(platform);
  const lowerValue = value.toLocaleLowerCase("ko-KR");

  return platformTermGroups.some((group) => {
    const groupPlatform = normalizePlatform(group.platform);
    if (groupPlatform === selectedPlatform) {
      return false;
    }

    return group.terms.some((term) => {
      const lowerTerm = term.toLocaleLowerCase("ko-KR");
      return lowerValue.includes(lowerTerm) && !sourceText.includes(lowerTerm);
    });
  });
}

function hasSentenceCutoff(value: string, kind: GeneratedTextKind) {
  if (kind === "hashtag") {
    return false;
  }

  const withoutTags = value.replace(/#[^\s#]+/g, "").trim();
  return /(그리고|하지만|그래서|때문에|위해|같은|처럼|에서|으로|에게|부터|까지|보다|를|을|은|는|이|가|의)$/.test(withoutTags);
}

function countPatternMatches(patterns: RegExp[], value: string) {
  return patterns.reduce((count, pattern) => {
    pattern.lastIndex = 0;
    return count + (value.match(pattern)?.length ?? 0);
  }, 0);
}

function hasTooManyAbstractExpressions(value: string, kind: GeneratedTextKind) {
  if (kind === "hashtag" || kind === "disclosure" || kind === "checklist") {
    return false;
  }

  const count = countPatternMatches(abstractPatterns, value);
  if (kind === "thumbnail") return count > 1;
  if (kind === "hook" || kind === "cta") return count > 2;
  return count > 3;
}

function includesTopicReference(value: string, context: CopyContext) {
  const lowerValue = value.toLocaleLowerCase("ko-KR");
  const references = [
    context.productIsFallback ? "" : context.product,
    context.category,
    ...context.keywords
  ]
    .map((item) => item.toLocaleLowerCase("ko-KR").trim())
    .filter((item) => item.length >= 2);

  return references.some((item) => lowerValue.includes(item));
}

function includesProductReference(value: string, context: CopyContext) {
  if (context.productIsFallback) {
    return includesTopicReference(value, context);
  }

  return value.toLocaleLowerCase("ko-KR").includes(context.product.toLocaleLowerCase("ko-KR"));
}

function hasMissingTopicReference(value: string, context: CopyContext, kind: GeneratedTextKind) {
  if (kind !== "caption" && kind !== "hook" && kind !== "thumbnail") {
    return false;
  }

  if (context.productIsFallback && context.keywords.length === 0) {
    return false;
  }

  if (kind === "caption" || kind === "hook") {
    return !includesProductReference(value, context);
  }

  return !includesTopicReference(value, context);
}

function hasMissingBenefitReference(value: string, context: CopyContext, kind: GeneratedTextKind) {
  if ((kind !== "caption" && kind !== "hook") || context.keywords.length === 0) {
    return false;
  }

  const lowerValue = value.toLocaleLowerCase("ko-KR");
  return !context.keywords.some((keyword) => lowerValue.includes(keyword.toLocaleLowerCase("ko-KR")));
}

function hasWeakCTA(value: string, context: CopyContext, kind: GeneratedTextKind) {
  if (kind !== "cta") {
    return false;
  }

  const hasAction = hasPatternMatch(ctaActionPatterns, value);
  const hasReference = includesTopicReference(value, context);

  return !hasAction || (!context.productIsFallback && !hasReference);
}

function exceedsPlatformLength(value: string, platform: Platform, kind: GeneratedTextKind) {
  const length = value.replace(/\s+/g, " ").trim().length;
  const normalizedPlatform = normalizePlatform(platform);

  if (kind === "thumbnail") return length > 34;
  if (kind === "cta") return length > 70;

  if (normalizedPlatform === "Instagram Story") return length > 70;
  if (normalizedPlatform === "Instagram Reels" && kind === "hook") return length > 75;
  if (normalizedPlatform === "TikTok" && kind === "hook") return length > 65;
  if (normalizedPlatform === "YouTube Shorts" && kind === "hook") return length > 58;
  if (normalizedPlatform === "X" && kind === "caption") return length > 140;
  if (normalizedPlatform === "Facebook" && kind === "caption") return length > 320;
  if (kind === "caption") return length > 260;

  return false;
}

function hasPatternMatch(patterns: RegExp[], value: string) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function strictFallbackItems(context: CopyContext, kind: GeneratedTextKind) {
  const label = compactProductLabel(context);

  if (kind === "caption") {
    switch (context.platform) {
      case "Instagram Story":
        return [
          `${label} 오늘 준비됐어요.\n${context.primaryKeyword} 찾던 분께 맞아요.`,
          `${label} ${context.secondaryKeyword}\n짧게 보고 결정해도 충분해요.`,
          `${label} ${context.primaryKeyword} 궁금하면 DM 주세요.`
        ];
      case "Instagram Reels":
        return [
          `${label}, 영상으로 짧게 보여드립니다.\n${context.primaryKeyword}, ${context.secondaryKeyword} 포인트를 바로 확인해 주세요.`,
          `${context.useScene}, ${label} 어떤지 짧게 보여드립니다.\n궁금한 점은 댓글로 남겨주세요.`,
          `${label} ${context.primaryKeyword} 장면부터 보세요.\n다시 보려면 저장해두세요.`
        ];
      case "TikTok":
        return [
          `${label} 써봤는데 ${context.primaryKeyword} 쪽은 괜찮아요.\n${context.secondaryKeyword}까지 보는 분이면 영상으로 먼저 보세요.`,
          `${context.useScene}, ${label} ${context.primaryKeyword} 쪽이 꽤 편합니다.\n궁금하면 댓글로 남겨주세요.`,
          `${label} ${context.secondaryKeyword} 찾던 분들이 볼 만한 장면만 골랐습니다.\n취향인지 댓글로 알려주세요.`
        ];
      case "YouTube Shorts":
        return [
          `${label} 짧게 사용해보고 남긴 영상입니다.\n${context.featurePhrase}을 중요하게 본다면 끝까지 확인해 주세요.`,
          `${context.useScene}, ${label} ${context.primaryKeyword} 어떤지 짧게 보여드립니다.`,
          `${label} 실제 사용 장면을 보고 궁금한 점은 고정댓글에 남겨주세요.`
        ];
      case "Facebook":
        return [
          `${label} 찾고 있었다면 이번에 비교해볼 만합니다.\n${context.useScene}, ${context.featurePhrase}을 함께 살펴볼 수 있어 필요한 분에게 잘 맞습니다.\n필요한 분에게 공유해 주세요.`,
          `${label} 고를 때 ${context.primaryKeyword}을 먼저 본다면 같이 비교해 보세요.\n궁금한 부분은 댓글로 남겨주세요.`,
          `${label} 실제로 쓸 상황을 생각해보면 ${context.primaryKeyword}, ${context.benefit}이 필요한 분에게 맞는지 판단하기 쉽습니다.`
        ];
      case "X":
        return [
          `${label}, ${context.primaryKeyword}을 먼저 보는 분이라면 비교해볼 만합니다.`,
          `${label} 찾는 중이면 ${context.secondaryKeyword}까지 같이 확인해 보세요.`,
          `${label}, ${context.secondaryKeyword}까지 챙긴 쪽입니다.`
        ];
      case "Instagram Feed":
      case "Reels Thumbnail":
      default:
        return [
          `${label}, ${context.useScene}에 잘 어울립니다.\n${context.primaryKeyword}을 찾는 분이라면 ${productUseDetail(context)}`,
          `${label}, ${context.useScene}에 조금 더해보세요.\n${context.secondaryKeyword}를 살리기 좋아서 사진보다 실제 자리에서 더 잘 어울립니다.`,
          `${label}, ${context.audiencePhrase}에게 소개하기 좋습니다.\n${context.primaryKeyword}을 고민하고 있다면 너무 과하지 않으면서도 기억에 남는 쪽입니다.`,
          `${label}, 처음 준비할 때 어렵게 느껴질 수 있지만 생각보다 간단했습니다.\n${context.secondaryKeyword}와 함께 두면 준비한 자리가 훨씬 선명해집니다.`,
          `${label} 관련 정보가 궁금하다면 구성과 보관 방법을 먼저 확인해 주세요.\n${context.primaryKeyword} 구성인지, ${context.secondaryKeyword}로 어울리는지 살펴보고 선택하면 됩니다.`
        ];
    }
  }

  if (kind === "hook") {
    return [
      `${label} ${context.primaryKeyword}, 첫 장면에서 바로 보여드릴게요.`,
      `${label} ${context.primaryKeyword}은 이 장면부터 보세요.`,
      `${context.useScene}, ${label} ${context.secondaryKeyword} 쪽이 꽤 편합니다.`,
      `${label} ${context.secondaryKeyword} 부분까지 보면 차이가 보입니다.`,
      `${label} ${context.primaryKeyword} 궁금하면 댓글로 의견 남겨주세요.`
    ];
  }

  if (kind === "thumbnail") {
    return [
      `${label} 사용 장면`,
      `${context.primaryKeyword} 체크`,
      `${context.secondaryKeyword} 비교`,
      `${context.category} 찾는 분께`,
      `${label} 댓글 의견`
    ];
  }

  if (kind === "cta") {
    return [
      `${label} 비교 중이라면 이 글을 저장해두세요.`,
      `${context.primaryKeyword} 관련해서 궁금한 점을 댓글로 남겨주세요.`,
      `${context.secondaryKeyword}까지 보고 싶다면 옵션을 확인해 주세요.`
    ];
  }

  if (kind === "hashtag") {
    return platformHashtagDefaults(context.platform);
  }

  return [];
}

function hasUnsafeQuality(value: string, context: CopyContext, kind: GeneratedTextKind) {
  const cleaned = scrubGeneratedText(value);

  if (!cleaned) return true;
  if (hasRepeatedWord(cleaned)) return true;
  if (hasAwkwardRepeatedWord(cleaned, context)) return true;
  if (hasWrongPlatformMention(cleaned, context.platform, context.sourceText)) return true;
  if (hasSentenceCutoff(cleaned, kind)) return true;
  if (hasTooManyAbstractExpressions(cleaned, kind)) return true;
  if (hasMissingTopicReference(cleaned, context, kind)) return true;
  if (hasMissingBenefitReference(cleaned, context, kind)) return true;
  if (hasWeakCTA(cleaned, context, kind)) return true;
  if (exceedsPlatformLength(cleaned, context.platform, kind)) return true;
  if (hasPatternMatch(overblownPatterns, cleaned)) return true;
  if (hasPatternMatch(meaninglessPatterns, cleaned)) return true;
  if (hasPatternMatch(guideLikePatterns, cleaned)) return true;
  if (hasPatternMatch(brokenParticlePatterns, cleaned)) return true;
  if (hasPatternMatch(forbiddenOutputPatterns, cleaned)) return true;

  return false;
}

function sentenceSignature(value: string, context: CopyContext) {
  const firstSentence = value.split(/[\n.!?]/)[0] ?? value;
  return firstSentence
    .replaceAll(context.product, "{product}")
    .replaceAll(context.category, "{category}")
    .replace(/[0-9A-Za-z가-힣]{3,}/g, (token) => token.slice(0, 3))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}

function qualityFilterItems(items: string[], fallbackItems: string[], context: CopyContext, kind: GeneratedTextKind, targetCount: number) {
  const candidates = [...items, ...fallbackItems, ...strictFallbackItems(context, kind)].map(scrubGeneratedText).filter(Boolean);
  const output: string[] = [];
  const signatures = new Set<string>();

  for (let index = 0; index < candidates.length && output.length < targetCount; index += 1) {
    const candidate = candidates[index];
    const fallback = fallbackItems[output.length % fallbackItems.length] ?? "";
    const nextItem = hasUnsafeQuality(candidate, context, kind) ? scrubGeneratedText(fallback) : candidate;
    const signature = sentenceSignature(nextItem, context);

    if (nextItem && !signatures.has(signature) && !hasUnsafeQuality(nextItem, context, kind) && !output.includes(nextItem)) {
      output.push(nextItem);
      signatures.add(signature);
    }
  }

  if (output.length < targetCount) {
    strictFallbackItems(context, kind).forEach((item) => {
      const nextItem = scrubGeneratedText(item);
      const signature = sentenceSignature(nextItem, context);
      if (
        output.length < targetCount &&
        nextItem &&
        !signatures.has(signature) &&
        !hasUnsafeQuality(nextItem, context, kind) &&
        !output.includes(nextItem)
      ) {
        output.push(nextItem);
        signatures.add(signature);
      }
    });
  }

  return output.slice(0, targetCount);
}

function qualityFilterDisclosure(value: string, context: CopyContext) {
  const fallback = "광고/협찬 표시 없음";
  const cleaned = scrubGeneratedText(value);
  return hasUnsafeQuality(cleaned, context, "disclosure") ? fallback : cleaned;
}

function applyBannedPhrases(items: string[], banned: string) {
  const bannedWords = normalizeList(banned)
    .map((word) => cleanDisplayText(word, ""))
    .filter(Boolean);

  if (bannedWords.length === 0) {
    return items;
  }

  return items.map((item) => {
    let nextItem = item;
    bannedWords.forEach((word) => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextItem = nextItem.replace(new RegExp(escapedWord, "gi"), "");
    });
    return scrubGeneratedText(nextItem);
  });
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

function targetCounts(platform: Platform) {
  switch (normalizePlatform(platform)) {
    case "Instagram Story":
      return { captions: 5, ctas: 3, hooks: 0, thumbnails: 0 };
    case "Instagram Reels":
      return { captions: 3, ctas: 3, hooks: 5, thumbnails: 5 };
    case "TikTok":
      return { captions: 3, ctas: 3, hooks: 5, thumbnails: 0 };
    case "YouTube Shorts":
      return { captions: 3, ctas: 3, hooks: 5, thumbnails: 0 };
    case "Facebook":
      return { captions: 3, ctas: 3, hooks: 0, thumbnails: 0 };
    case "X":
      return { captions: 5, ctas: 3, hooks: 0, thumbnails: 0 };
    case "Instagram Feed":
    case "Reels Thumbnail":
    default:
      return { captions: 5, ctas: 3, hooks: 0, thumbnails: 0 };
  }
}

export async function generateMockUploadPackage(
  input: CreateFormInput,
  brand: BrandProfile,
  personalization?: PersonalizationProfile
): Promise<GeneratedPackage> {
  await new Promise((resolve) => setTimeout(resolve, 650));

  const context = createCopyContext(input, brand, personalization);
  const guide = getPlatformContentGuide(input.platform);
  const counts = targetCounts(input.platform);
  const generated = buildPlatformCopy(context);
  const fallback = buildPlatformCopy({
    ...context,
    product: context.category,
    productIsFallback: true
  });
  const banned = `${input.bannedKeywords},${brand.bannedPhrases},${(personalization?.bannedPhrases ?? []).join(",")}`;
  const rawCaptions = applyBannedPhrases(generated.captions, banned);
  const rawCtas = applyBannedPhrases(generated.ctas, banned);
  const rawHooks = applyBannedPhrases(generated.hooks, banned);
  const rawThumbnails = applyBannedPhrases(generated.thumbnails, banned);
  const rawHashtags = applyBannedPhrases(buildHashtags(input, brand, personalization), banned);
  const captions = reorderByCaptionLength(
    qualityFilterItems(rawCaptions, fallback.captions, context, "caption", counts.captions),
    personalization
  );
  const ctas = qualityFilterItems(rawCtas, fallback.ctas, context, "cta", counts.ctas);
  const hooks = counts.hooks > 0 ? qualityFilterItems(rawHooks, fallback.hooks, context, "hook", counts.hooks) : [];
  const thumbnails = counts.thumbnails > 0 ? qualityFilterItems(rawThumbnails, fallback.thumbnails, context, "thumbnail", counts.thumbnails) : [];
  const hashtags = qualityFilterItems(
    rawHashtags,
    platformHashtagDefaults(input.platform),
    context,
    "hashtag",
    Math.max(1, guide.hashtagLimit)
  );
  const disclosure = qualityFilterDisclosure(disclosureText(input, brand, personalization), context);
  const title = `${context.product} ${guide.shortLabel} 콘텐츠`;
  const checklist = [
    "본문이 선택한 플랫폼 형식에 맞는지 확인",
    "광고/협찬 표시가 필요한 경우 앞부분에 배치",
    "금지 키워드와 과장 표현이 없는지 확인",
    "해시태그 수와 문구 길이가 적절한지 확인",
    "복사 후 최종 게시 화면에서 한 번 더 확인"
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
    hashtags,
    ctas,
    hooks,
    thumbnails,
    disclosure,
    checklist,
    packageItems: guide.packageItems,
    input,
    personalization: personalization ? getPersonalizationSnapshot(personalization) : undefined,
    selectedCaptionIndex: 0,
    selectedCaption: captions[0]
  };
}
