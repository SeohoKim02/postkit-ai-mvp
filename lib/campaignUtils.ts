import { createCalendarId, platformFromDeliverable, purposeFromCampaignType, splitList } from "@/lib/calendarUtils";
import type {
  Campaign,
  CampaignDeliverable,
  CampaignStatus,
  CampaignType,
  CreateFormInput,
  DeliverableStatus,
  DeliverableType,
  Platform
} from "@/types";

export const campaignTypes: CampaignType[] = [
  "제품 제공",
  "원고료 광고",
  "공동구매",
  "제휴 링크",
  "할인코드",
  "브랜드 앰배서더",
  "자체 제품 홍보",
  "일반 콘텐츠"
];

export const campaignStatuses: CampaignStatus[] = [
  "제안 검토 중",
  "수락",
  "제작 중",
  "광고주 검토 중",
  "수정 요청",
  "게시 준비 완료",
  "진행 중",
  "완료",
  "취소"
];

export const deliverableTypes: DeliverableType[] = [
  "Instagram 피드",
  "Instagram 스토리",
  "Instagram 릴스",
  "TikTok",
  "YouTube Shorts",
  "Facebook 게시물",
  "X 게시물",
  "썸네일",
  "캡션",
  "해시태그",
  "광고주 확인용 시안"
];

export const deliverableStatuses: DeliverableStatus[] = [
  "미시작",
  "생성 완료",
  "수정 중",
  "승인 대기",
  "승인 완료",
  "게시 완료"
];

export function createDeliverable(type: DeliverableType, status: DeliverableStatus = "미시작"): CampaignDeliverable {
  return {
    id: createCalendarId("deliverable"),
    type,
    status
  };
}

export function createDefaultCampaign(): Campaign {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 14);
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 7);

  return {
    id: createCalendarId("campaign"),
    version: 1,
    campaignName: "",
    advertiserName: "",
    brandName: "",
    productName: "",
    campaignType: "제품 제공",
    description: "",
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    contentDeadline: deadline.toISOString(),
    publishStartAt: deadline.toISOString(),
    publishEndAt: end.toISOString(),
    targetPlatforms: ["Instagram Feed"],
    requiredDeliverables: [createDeliverable("Instagram 피드"), createDeliverable("캡션"), createDeliverable("해시태그")],
    requiredKeywords: [],
    bannedKeywords: [],
    requiredHashtags: [],
    disclosureStyle: "#광고 또는 #협찬을 첫 문장에 표시",
    discountCode: "",
    landingUrl: "",
    contactName: "",
    contactChannel: "",
    compensationType: "제품 제공",
    compensationNote: "",
    campaignStatus: "제안 검토 중",
    relatedContentIds: [],
    relatedScheduleIds: [],
    internalMemo: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function normalizeCampaignDates(campaign: Campaign) {
  const start = new Date(campaign.startDate);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const end = new Date(campaign.endDate);
  const nextEnd = Number.isNaN(end.getTime()) || end < safeStart ? safeStart : end;

  return {
    ...campaign,
    startDate: safeStart.toISOString(),
    endDate: nextEnd.toISOString(),
    contentDeadline: new Date(campaign.contentDeadline).toString() === "Invalid Date" ? safeStart.toISOString() : campaign.contentDeadline,
    publishStartAt: new Date(campaign.publishStartAt).toString() === "Invalid Date" ? safeStart.toISOString() : campaign.publishStartAt,
    publishEndAt: new Date(campaign.publishEndAt).toString() === "Invalid Date" ? nextEnd.toISOString() : campaign.publishEndAt
  };
}

export function getCampaignProgress(campaign: Campaign) {
  const total = campaign.requiredDeliverables.length;
  const done = campaign.requiredDeliverables.filter((deliverable) => deliverable.status === "승인 완료" || deliverable.status === "게시 완료").length;
  const generated = campaign.requiredDeliverables.filter((deliverable) => deliverable.status !== "미시작").length;

  return {
    total,
    done,
    generated,
    percent: total === 0 ? 0 : Math.round((done / total) * 100)
  };
}

export function campaignToCreatePrefill(campaign: Campaign, platform?: Platform): CreateFormInput {
  const selectedPlatform = platform ?? campaign.targetPlatforms[0] ?? platformFromDeliverable(campaign.requiredDeliverables[0]?.type ?? "Instagram 피드");

  return {
    platform: selectedPlatform,
    purpose: purposeFromCampaignType(campaign.campaignType),
    style: campaign.campaignType === "자체 제품 홍보" ? "깔끔한 정보형" : "자연스러운 후기형",
    productName: campaign.productName || campaign.campaignName,
    requiredKeywords: [...campaign.requiredKeywords, ...campaign.requiredHashtags, campaign.discountCode ?? "", campaign.landingUrl ?? ""]
      .filter(Boolean)
      .join(", "),
    bannedKeywords: campaign.bannedKeywords.join(", "),
    sponsorDisclosure: campaign.campaignType === "일반 콘텐츠" || campaign.campaignType === "자체 제품 홍보" ? "none" : "ad",
    requiredHashtags: campaign.requiredHashtags.join(" "),
    disclosureStyle: campaign.disclosureStyle,
    discountCode: campaign.discountCode,
    landingUrl: campaign.landingUrl,
    linkGuide: campaign.landingUrl ? "프로필 링크 또는 상세 링크 안내 포함" : "",
    brandName: campaign.brandName,
    campaignId: campaign.id,
    campaignName: campaign.campaignName
  };
}

export function markDeliverableGenerated(campaign: Campaign, platform?: Platform): Campaign {
  const platformLabel = platform ? platformToDeliverableLabel(platform) : "";
  return {
    ...campaign,
    requiredDeliverables: campaign.requiredDeliverables.map<CampaignDeliverable>((deliverable) =>
      deliverable.status === "미시작" && (!platformLabel || deliverable.type === platformLabel || deliverable.type === "캡션" || deliverable.type === "해시태그")
        ? { ...deliverable, status: "생성 완료" }
        : deliverable
    )
  };
}

export function platformToDeliverableLabel(platform: Platform): DeliverableType {
  const map: Record<Platform, DeliverableType> = {
    "Instagram Feed": "Instagram 피드",
    "Instagram Story": "Instagram 스토리",
    "Reels Thumbnail": "Instagram 릴스",
    TikTok: "TikTok",
    "YouTube Shorts": "YouTube Shorts"
  };

  return map[platform];
}

export function parseCampaignList(value: string) {
  return splitList(value);
}
