import type { CreditCost, SubscriptionPlan } from "@/types";

// 무료 공개 베타 정책:
// - Free 베타 플랜만 실제로 사용 가능하고 결제는 발생하지 않는다.
// - 유료 플랜은 결제·서버 인증 연동 전까지 "준비 중"으로만 안내한다.
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: "Free",
    price: "무료 (공개 베타)",
    priceWon: 0,
    credits: 300,
    description: "베타 기간 동안 매달 300 체험 크레딧으로 업로드 패키지 10개를 만들 수 있어요.",
    recommendedFor: "지금 PostKit을 써보는 모든 사용자",
    availability: "available"
  },
  {
    name: "Starter",
    price: "월 9,900원 예정",
    priceWon: 9900,
    credits: 120,
    description: "주 1~2회 업로드하는 개인 크리에이터",
    recommendedFor: "주 1~2회 게시하는 개인 계정",
    availability: "coming_soon"
  },
  {
    name: "Creator",
    price: "월 14,900원 예정",
    priceWon: 14900,
    credits: 260,
    description: "꾸준히 콘텐츠를 만드는 성장 계정",
    recommendedFor: "주 3~5회 꾸준히 올리는 계정",
    availability: "coming_soon"
  },
  {
    name: "Creator Plus",
    price: "월 19,900원 예정",
    priceWon: 19900,
    credits: 450,
    description: "릴스와 쇼츠까지 자주 만드는 계정 · 워터마크 제거 포함 예정",
    recommendedFor: "릴스와 쇼츠를 자주 만드는 크리에이터",
    highlighted: true,
    availability: "coming_soon"
  },
  {
    name: "Business",
    price: "월 49,000원 예정",
    priceWon: 49000,
    credits: 1400,
    description: "브랜드와 소상공인 운영 계정",
    recommendedFor: "브랜드와 소상공인 운영 계정",
    availability: "coming_soon"
  },
  {
    name: "Agency",
    price: "월 149,000원 예정",
    priceWon: 149000,
    credits: 5500,
    description: "여러 브랜드를 관리하는 팀",
    recommendedFor: "여러 계정을 관리하는 팀",
    availability: "coming_soon"
  }
];

export const FREE_BETA_PLAN_NAME = "Free";

// 베타에서 실제로 차감되는 항목만 표시한다. 이미지·영상 제작과 내보내기는 추가 차감이 없다.
export const creditCosts: CreditCost[] = [
  { label: "업로드 패키지 1개 (문구·해시태그·CTA·체크리스트)", credits: "30" },
  { label: "Studio 이미지 제작", credits: "0 (베타 무료)" },
  { label: "Video Studio 영상 제작", credits: "0 (베타 무료)" },
  { label: "내보내기 · 다운로드", credits: "0 (베타 무료)" }
];
