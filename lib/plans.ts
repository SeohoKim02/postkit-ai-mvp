import type { CreditCost, CreditPack, SubscriptionPlan } from "@/types";

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: "Free",
    price: "0원",
    priceWon: 0,
    credits: 10,
    description: "가볍게 둘러보는 1인 계정",
    recommendedFor: "처음 테스트하는 사용자"
  },
  {
    name: "Starter",
    price: "월 9,900원",
    priceWon: 9900,
    credits: 120,
    description: "주 1~2회 업로드하는 개인 크리에이터",
    recommendedFor: "주 1~2회 게시하는 개인 계정"
  },
  {
    name: "Creator",
    price: "월 14,900원",
    priceWon: 14900,
    credits: 260,
    description: "꾸준히 콘텐츠를 만드는 성장 계정",
    recommendedFor: "주 3~5회 꾸준히 올리는 계정"
  },
  {
    name: "Creator Plus",
    price: "월 19,900원",
    priceWon: 19900,
    credits: 450,
    description: "릴스와 쇼츠까지 자주 만드는 계정",
    recommendedFor: "릴스와 쇼츠를 자주 만드는 크리에이터",
    highlighted: true
  },
  {
    name: "Business",
    price: "월 49,000원",
    priceWon: 49000,
    credits: 1400,
    description: "브랜드와 소상공인 운영 계정",
    recommendedFor: "브랜드와 소상공인 운영 계정"
  },
  {
    name: "Agency",
    price: "월 149,000원",
    priceWon: 149000,
    credits: 5500,
    description: "여러 브랜드를 관리하는 팀",
    recommendedFor: "여러 계정을 관리하는 팀"
  }
];

export const creditPacks: CreditPack[] = [
  { credits: 100, price: "8,900원", priceWon: 8900 },
  { credits: 300, price: "24,900원", priceWon: 24900 },
  { credits: 700, price: "54,900원", priceWon: 54900 },
  { credits: 1500, price: "99,000원", priceWon: 99000 },
  { credits: 5000, price: "249,000원", priceWon: 249000 }
];

export const creditCosts: CreditCost[] = [
  { label: "캡션 5개 생성", credits: "2" },
  { label: "해시태그 세트 생성", credits: "1" },
  { label: "광고/협찬 표시 문구", credits: "1" },
  { label: "후킹 문구 5개", credits: "2" },
  { label: "썸네일 문구 생성", credits: "2" },
  { label: "피드 이미지 1장", credits: "8" },
  { label: "스토리 이미지 1장", credits: "8" },
  { label: "릴스 썸네일 1장", credits: "10" },
  { label: "카드뉴스 3장", credits: "20" },
  { label: "업로드 패키지 1개", credits: "30" },
  { label: "짧은 릴스 영상", credits: "80~120" }
];
