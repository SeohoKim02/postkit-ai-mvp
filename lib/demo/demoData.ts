import { createDefaultPersonalizationProfile } from "@/lib/personalization";
import type {
  AiRequestHistoryEntry,
  BrandProfile,
  Campaign,
  ContentIdea,
  ContentSchedule,
  CreditAccount,
  CreditLedgerEntry,
  DemoDataManifest,
  DesignProject,
  ExportHistoryEntry,
  GeneratedPackage,
  HistoryItem,
  PersonalizationProfile,
  PrivacyPreferences,
  UserAccount,
  UserProfile,
  UserSession,
  VideoProject,
  Workspace,
  WorkspaceMember
} from "@/types";

export type DemoRecord<T> = T & { demo: true; source: "demo" };

export type DemoDataBundle = {
  manifest: DemoDataManifest;
  account: DemoRecord<UserAccount>;
  profile: DemoRecord<UserProfile>;
  session: DemoRecord<UserSession>;
  workspaces: Array<DemoRecord<Workspace>>;
  members: Array<DemoRecord<WorkspaceMember>>;
  brandProfile: DemoRecord<BrandProfile>;
  personalizationProfile: DemoRecord<PersonalizationProfile>;
  packages: Array<DemoRecord<GeneratedPackage>>;
  history: Array<DemoRecord<HistoryItem>>;
  designs: Array<DemoRecord<DesignProject>>;
  videos: Array<DemoRecord<VideoProject>>;
  campaigns: Array<DemoRecord<Campaign>>;
  schedules: Array<DemoRecord<ContentSchedule>>;
  ideas: Array<DemoRecord<ContentIdea>>;
  exports: Array<DemoRecord<ExportHistoryEntry>>;
  aiRequests: Array<DemoRecord<AiRequestHistoryEntry>>;
  creditAccount: DemoRecord<CreditAccount>;
  creditLedger: Array<DemoRecord<CreditLedgerEntry>>;
  privacyPreferences: DemoRecord<PrivacyPreferences>;
};

const demoUserId = "demo-user-postkit";
const personalWorkspaceId = "demo-workspace-personal";
const brandWorkspaceId = "demo-workspace-brand";

function iso(offsetDays = 0, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function demo<T extends object>(value: T): DemoRecord<T> {
  return { ...value, demo: true, source: "demo" };
}

function makePackage(index: number, platform: GeneratedPackage["platform"], purpose: GeneratedPackage["purpose"], style: GeneratedPackage["style"]): DemoRecord<GeneratedPackage> {
  const id = `demo-content-${index}`;
  const createdAt = iso(-index, 9 + index);

  return demo({
    id,
    title: `Sample Brand 추천 아이템 ${index}`,
    createdAt,
    platform,
    purpose,
    style,
    usedCredits: 0,
    captions: [
      `Sample Brand 아이템 ${index} 실제로 써보니 데일리로 쓰기 부담 없는 쪽입니다.\n사진보다 책상 위나 가방 안에서 사용할 때 장점이 더 잘 보였어요.\n비슷한 제품을 비교 중이라면 저장해두고 확인해보세요.\n#SampleBrand #데일리템 #사용후기`,
      `Sample Brand 아이템 ${index} 고를 때는 사용감과 보관하기 쉬운 크기를 같이 보게 돼요.\n${style} 톤으로 소개해도 과하게 보이지 않는 쪽이라 데일리 후보로 괜찮습니다.\n궁금한 점은 댓글로 남겨주세요.\n#라이프스타일 #사용후기 #오늘의후기`,
      `선물용이나 데일리용으로 Sample Brand 아이템 ${index} 고민 중이라면\n가격보다 자주 쓸 수 있는지를 먼저 비교해보세요.\n필요할 때 다시 보려고 저장해두면 좋아요.\n#소장템 #취향공유 #데일리템`,
      `Sample Brand 아이템 ${index}는 책상 위나 가방 안에 두고 쓰기 편한 쪽이에요.\n크게 튀지 않지만 자주 꺼내 쓰는 제품을 찾는 분에게 잘 맞습니다.\n비슷한 제품 써본 분들은 댓글로 의견 남겨주세요.\n#사용후기 #데일리 #실사용`,
      `요즘 Sample Brand 아이템 ${index} 찾는 분들이 많아서 사용 장면 중심으로 적어봅니다.\n데일리로 쓰기 부담 없고, 선물용으로도 과하지 않습니다.\n옵션 남아 있을 때 한 번 비교해보세요.\n#SampleBrand #선물템 #리뷰`
    ],
    hashtags: ["#SampleBrand", "#데일리템", "#사용후기", "#라이프스타일", "#취향공유"],
    ctas: ["저장해두고 다시 보기", "댓글로 궁금한 점 남기기"],
    hooks: [`Sample Brand 아이템 ${index} 써보고 남긴 후기`, "데일리템 찾는 분이면 이 장면부터 보세요"],
    thumbnails: ["Sample Brand Pick", "저장각 데일리템"],
    disclosure: purpose === "Sponsored Post" ? "#협찬 콘텐츠입니다." : "광고/협찬 표시 없음",
    checklist: ["권리 확인", "광고 표시 확인", "해시태그 확인", "링크/할인코드 확인"],
    packageItems: ["캡션", "해시태그", "CTA", "썸네일 문구", "광고 표시 문구"],
    input: {
      platform,
      purpose,
      style,
      productName: `Sample Brand 아이템 ${index}`,
      requiredKeywords: "Sample Brand, 데일리",
      bannedKeywords: "과장 표현",
      sponsorDisclosure: purpose === "Sponsored Post" ? "sponsored" : "none",
      commercialRelationshipType: purpose === "Sponsored Post" ? "제품 제공" : "none",
      uploadedFileName: `demo-upload-${index}.jpg`,
      requiredHashtags: "#SampleBrand",
      disclosureStyle: "#광고 또는 #협찬을 첫 문장에 표시",
      discountCode: index === 2 ? "DEMO10" : undefined,
      linkGuide: "프로필 링크를 확인하세요.",
      brandName: "Sample Brand",
      rightsConfirmedAt: createdAt
    },
    personalization: {
      topStyle: style,
      topPlatform: platform,
      captionLength: "medium",
      level: "데모 학습",
      note: "데모 데이터의 스타일을 반영했어요."
    },
    selectedCaptionIndex: 0,
    selectedCaption: `Sample Brand 아이템 ${index} 실제로 써보니 데일리로 쓰기 부담 없는 쪽입니다.\n사진보다 책상 위나 가방 안에서 사용할 때 장점이 더 잘 보였어요.\n비슷한 제품을 비교 중이라면 저장해두고 확인해보세요.\n#SampleBrand #데일리템 #사용후기`,
    liked: index === 1,
    copiedResultTypes: ["caption", "hashtags"],
    savedToLibrary: true,
    aiRequestId: `demo-ai-request-${index}`,
    ai: {
      requestId: `demo-ai-request-${index}`,
      provider: "mock",
      taskTypes: ["caption_generation", "hashtag_generation", "cta_generation", "thumbnail_text_generation"],
      promptVersion: "postkit-prompt-v1",
      usedFallback: false,
      retryCount: 0,
      personalizationApplied: true,
      recommendedTemplateId: index === 1 ? "minimal" : "photo-focus",
      summary: "데모 콘텐츠 요약",
      warnings: [],
      modelMetadata: {
        provider: "mock",
        model: "postkit-mock",
        promptVersion: "postkit-prompt-v1",
        requestId: `demo-ai-request-${index}`,
        retryCount: 0
      }
    },
    recommendedDesignTemplateId: index === 2 ? "discount-event" : "photo-focus",
    campaignId: index <= 2 ? `demo-campaign-${index}` : undefined,
    campaignName: index <= 2 ? `Demo Campaign ${index}` : undefined,
    brandName: "Sample Brand",
    userId: demoUserId,
    workspaceId: brandWorkspaceId
  });
}

export function createDemoDataBundle(): DemoDataBundle {
  const createdAt = iso(0, 9);
  const packages = [
    makePackage(1, "Instagram Feed", "Product Promotion", "깔끔한 정보형"),
    makePackage(2, "Instagram Story", "Sponsored Post", "자연스러운 후기형"),
    makePackage(3, "YouTube Shorts", "Review Post", "짧고 강한 카피형")
  ];
  const history = packages.map((item) => demo({ id: item.id, createdAt: item.createdAt, package: item, userId: demoUserId, workspaceId: brandWorkspaceId }));
  const brandProfile = demo<BrandProfile>({
    accountName: "Sample Brand",
    category: "데모 라이프스타일 브랜드",
    voice: "친근함",
    feedMood: "밝고 깔끔한 피드",
    primaryColor: "#ff6b4a",
    secondaryColor: "#edf9f6",
    favoriteHashtags: "#SampleBrand #SampleDemo",
    requiredPhrases: "최종 게시 전 확인",
    bannedPhrases: "100% 보장",
    defaultDisclosure: "#광고 또는 #협찬을 첫 문장에 표시",
    preferredPlatform: "Instagram Feed"
  });
  const basePersonalization = createDefaultPersonalizationProfile(brandProfile);
  const personalizationProfile = demo<PersonalizationProfile>({
    ...basePersonalization,
    onboardingCompleted: true,
    onboardingCompletedAt: createdAt,
    accountType: "쇼핑몰/브랜드",
    preferredPlatforms: ["Instagram Feed", "Instagram Story", "YouTube Shorts"],
    preferredPurposes: ["Product Promotion", "Sponsored Post", "Review Post"],
    preferredStyles: ["깔끔한 정보형", "자연스러운 후기형", "짧고 강한 카피형"],
    selectedCaptionHistory: [],
    copiedResultHistory: [],
    likedResultHistory: [],
    dislikedResultHistory: [],
    editedCaptionHistory: [],
    regenerationHistory: [],
    lastUpdatedAt: createdAt
  });
  const account = demo<UserAccount>({
    id: demoUserId,
    email: "demo@example.invalid",
    displayName: "PostKit Demo",
    accountType: "쇼핑몰/브랜드",
    status: "active",
    createdAt,
    updatedAt: createdAt,
    version: 1
  });
  const profile = demo<UserProfile>({
    id: "demo-profile-postkit",
    userId: demoUserId,
    displayName: "PostKit Demo",
    accountType: "쇼핑몰/브랜드",
    preferredWorkspaceId: brandWorkspaceId,
    onboardingAccountType: "쇼핑몰/브랜드",
    createdAt,
    updatedAt: createdAt,
    version: 1
  });
  const workspaces: Array<DemoRecord<Workspace>> = [
    demo<Workspace>({
      id: personalWorkspaceId,
      name: "PostKit Demo Personal",
      type: "personal",
      ownerUserId: demoUserId,
      currentPlan: "Creator",
      memberIds: ["demo-member-owner"],
      createdAt,
      updatedAt: createdAt,
      version: 1
    }),
    demo<Workspace>({
      id: brandWorkspaceId,
      name: "Sample Brand Workspace",
      type: "brand",
      ownerUserId: demoUserId,
      currentPlan: "Creator Plus",
      brandProfileId: "demo-brand-profile",
      memberIds: ["demo-member-owner", "demo-member-editor"],
      createdAt,
      updatedAt: createdAt,
      version: 1
    })
  ];
  const members: Array<DemoRecord<WorkspaceMember>> = [
    demo<WorkspaceMember>({ id: "demo-member-owner", workspaceId: brandWorkspaceId, userId: demoUserId, displayName: "PostKit Demo", role: "owner", status: "active", createdAt, updatedAt: createdAt, version: 1 }),
    demo<WorkspaceMember>({ id: "demo-member-editor", workspaceId: brandWorkspaceId, userId: "mock-member-user-demo", displayName: "Demo Editor", role: "editor", status: "mock_invited", createdAt, updatedAt: createdAt, version: 1 })
  ];
  const campaigns: Array<DemoRecord<Campaign>> = [
    demo({
      id: "demo-campaign-1",
      version: 1,
      campaignName: "Demo Campaign 1",
      advertiserName: "Sample Advertiser",
      brandName: "Sample Brand",
      productName: "Demo Product 1",
      campaignType: "제품 제공",
      description: "진단센터 데모용 캠페인입니다.",
      startDate: iso(-2, 9),
      endDate: iso(14, 18),
      contentDeadline: iso(2, 18),
      publishStartAt: iso(3, 10),
      publishEndAt: iso(10, 18),
      targetPlatforms: ["Instagram Feed", "Instagram Story"],
      requiredDeliverables: [
        { id: "demo-deliverable-1", type: "Instagram 피드", status: "생성 완료" },
        { id: "demo-deliverable-2", type: "Instagram 스토리", status: "승인 대기" }
      ],
      requiredKeywords: ["Sample Brand"],
      bannedKeywords: ["100% 보장"],
      requiredHashtags: ["#SampleBrand"],
      disclosureStyle: "#광고 또는 #협찬을 첫 문장에 표시",
      discountCode: "DEMO10",
      landingUrl: "https://example.invalid/demo",
      contactName: "Demo Contact",
      contactChannel: "demo-channel",
      compensationType: "제품 제공",
      campaignStatus: "제작 중",
      relatedContentIds: ["demo-content-1", "demo-content-2"],
      relatedScheduleIds: ["demo-schedule-1", "demo-schedule-2"],
      internalMemo: "데모 캠페인입니다.",
      userId: demoUserId,
      workspaceId: brandWorkspaceId,
      createdAt,
      updatedAt: createdAt
    }),
    demo({
      id: "demo-campaign-2",
      version: 1,
      campaignName: "Demo Campaign 2",
      advertiserName: "Sample Advertiser",
      brandName: "Sample Brand",
      productName: "Demo Product 2",
      campaignType: "할인코드",
      description: "할인 이벤트 데모 캠페인입니다.",
      startDate: iso(1, 9),
      endDate: iso(21, 18),
      contentDeadline: iso(5, 18),
      publishStartAt: iso(6, 10),
      publishEndAt: iso(18, 18),
      targetPlatforms: ["YouTube Shorts", "TikTok"],
      requiredDeliverables: [{ id: "demo-deliverable-3", type: "YouTube Shorts", status: "미시작" }],
      requiredKeywords: ["DEMO10"],
      bannedKeywords: ["무료 보장"],
      requiredHashtags: ["#DemoDeal"],
      disclosureStyle: "#광고 표시",
      discountCode: "DEMO10",
      landingUrl: "https://example.invalid/deal",
      campaignStatus: "제안 검토 중",
      relatedContentIds: ["demo-content-3"],
      relatedScheduleIds: ["demo-schedule-3", "demo-schedule-4"],
      userId: demoUserId,
      workspaceId: brandWorkspaceId,
      createdAt,
      updatedAt: createdAt
    })
  ];
  const schedules: Array<DemoRecord<ContentSchedule>> = [1, 2, 3, 4].map((index) => demo({
    id: `demo-schedule-${index}`,
    version: 1,
    title: `Demo Schedule ${index}`,
    platform: index < 3 ? "Instagram Feed" : "YouTube Shorts",
    purpose: index === 4 ? "Discount Event" : "Product Promotion",
    scheduledAt: iso(index, 11 + index),
    brandName: "Sample Brand",
    campaignId: index < 3 ? "demo-campaign-1" : "demo-campaign-2",
    campaignName: index < 3 ? "Demo Campaign 1" : "Demo Campaign 2",
    productName: `Demo Product ${index}`,
    status: index === 1 ? "게시 준비 완료" : "작성 중",
    isSponsored: index !== 3,
    requiredKeywords: ["Sample Brand"],
    bannedKeywords: ["100% 보장"],
    requiredHashtags: ["#SampleDemo"],
    disclosureStyle: "#광고 또는 #협찬 표시",
    discountCode: index === 4 ? "DEMO10" : undefined,
    linkGuide: "프로필 링크 확인",
    internalMemo: "데모 일정입니다.",
    linkedContentId: index <= 3 ? `demo-content-${index}` : undefined,
    linkedExportIds: index <= 2 ? [`demo-export-${index}`] : [],
    repeatOption: "none",
    userId: demoUserId,
    workspaceId: brandWorkspaceId,
    createdAt,
    updatedAt: createdAt
  }));
  const ideas: Array<DemoRecord<ContentIdea>> = [1, 2, 3].map((index) => demo({
    id: `demo-idea-${index}`,
    version: 1,
    title: `Demo Idea ${index}`,
    category: "데모",
    platform: index === 3 ? "TikTok" : "Instagram Feed",
    purpose: index === 2 ? "Review Post" : "Product Promotion",
    memo: "데모 흐름에서 일정이나 Create로 보낼 수 있는 아이디어입니다.",
    preferredDate: iso(index + 3, 10),
    tags: ["demo", "sample"],
    convertedToSchedule: false,
    userId: demoUserId,
    workspaceId: brandWorkspaceId,
    createdAt,
    updatedAt: createdAt
  }));
  const designs: Array<DemoRecord<DesignProject>> = packages.slice(0, 2).map((pkg, index) => demo({
    id: `demo-design-${index + 1}`,
    version: 1,
    contentId: pkg.id,
    templateId: index === 0 ? "photo-focus" : "minimal",
    outputPresetId: index === 0 ? "instagram-feed-vertical" : "instagram-story",
    platform: index === 0 ? "Instagram Feed" : "Instagram Story",
    width: index === 0 ? 1080 : 1080,
    height: index === 0 ? 1350 : 1920,
    editedText: {
      title: pkg.thumbnails[0],
      subtitle: pkg.hooks[0],
      cta: pkg.ctas[0],
      brandName: "Sample Brand",
      disclosure: pkg.disclosure,
      footer: "Sample Brand"
    },
    imageSettings: { fit: "cover", scale: 1, offsetX: 0, offsetY: 0, brightness: 96, overlayOpacity: 0.32 },
    textPosition: index === 0 ? "bottom" : "center",
    textAlignment: "center",
    fontScale: 1,
    primaryColor: "#ff6b4a",
    secondaryColor: "#edf9f6",
    showTitle: true,
    showBrandName: true,
    showCta: true,
    showDisclosure: true,
    brandStyleSnapshot: {
      brandName: "Sample Brand",
      mood: "밝고 깔끔한 피드",
      voice: "친근함",
      primaryColor: "#ff6b4a",
      secondaryColor: "#edf9f6",
      disclosureStyle: "#광고 또는 #협찬 표시"
    },
    generatedAt: createdAt,
    downloaded: index === 0,
    exported: index === 0,
    userId: demoUserId,
    workspaceId: brandWorkspaceId,
    lastUpdatedAt: createdAt
  }));
  const videos: Array<DemoRecord<VideoProject>> = packages.slice(1).map((pkg, index) => demo({
    id: `demo-video-${index + 1}`,
    version: 1,
    contentId: pkg.id,
    templateId: index === 0 ? "soft-slide" : "discount-event-video",
    platform: index === 0 ? "Instagram Reels" : "YouTube Shorts",
    width: 1080,
    height: 1920,
    durationSeconds: index === 0 ? 8 : 10,
    frameRate: 24,
    transitionType: index === 0 ? "fade" : "zoom-in-out",
    textPosition: index === 0 ? "bottom" : "center",
    overlayStyle: index === 0 ? "brand-gradient" : "soft-dark",
    imageMotion: "ken-burns-in",
    overlayOpacity: 0.38,
    titleMaxLines: 3,
    showTitle: true,
    showCTA: true,
    showBrandName: true,
    showDisclosure: true,
    text: {
      title: pkg.thumbnails[0],
      hook: pkg.hooks[0],
      productName: pkg.input.productName,
      cta: pkg.ctas[0],
      brandName: "Sample Brand",
      disclosure: pkg.disclosure,
      discountCode: pkg.input.discountCode ?? ""
    },
    imageItems: [],
    brandStyleSnapshot: {
      brandName: "Sample Brand",
      mood: "밝고 깔끔한 피드",
      voice: "친근함",
      primaryColor: "#ff6b4a",
      secondaryColor: "#edf9f6",
      disclosureStyle: "#광고 또는 #협찬 표시"
    },
    outputFormat: "webm",
    generatedAt: createdAt,
    downloaded: false,
    exported: false,
    campaignId: pkg.campaignId,
    scheduleId: pkg.scheduleId,
    userId: demoUserId,
    workspaceId: brandWorkspaceId,
    lastUpdatedAt: createdAt
  }));
  const exports: Array<DemoRecord<ExportHistoryEntry>> = packages.slice(0, 2).map((pkg, index) => demo({
    exportId: `demo-export-${index + 1}`,
    contentId: pkg.id,
    platform: pkg.platform === "Instagram Story" ? "Instagram Story" : "Instagram Feed",
    exportType: index === 0 ? "full_download" : "text_copy",
    downloadedFiles: index === 0 ? [`postkit_demo_${index + 1}.png`] : [],
    copiedFields: ["caption", "hashtags"],
    shared: false,
    openedPlatform: index === 1,
    exportedAt: createdAt,
    status: "success",
    userId: demoUserId,
    workspaceId: brandWorkspaceId
  }));
  const aiRequests: Array<DemoRecord<AiRequestHistoryEntry>> = packages.map((pkg, index) => demo({
    requestId: `demo-ai-request-${index + 1}`,
    idempotencyKey: `demo-idempotency-${index + 1}`,
    taskType: "caption_generation",
    provider: "mock",
    status: "succeeded",
    creditCost: 0,
    relatedContentId: pkg.id,
    relatedCampaignId: pkg.campaignId,
    startedAt: pkg.createdAt,
    completedAt: iso(-index, 10 + index),
    usedFallback: false,
    personalizationApplied: true,
    userId: demoUserId,
    workspaceId: brandWorkspaceId,
    version: 1
  }));
  const creditAccount = demo<CreditAccount>({
    version: 1,
    currentPlan: "Creator Plus",
    subscriptionStatus: "active",
    billingCycleStartedAt: iso(-7, 9),
    nextCreditGrantAt: iso(23, 9),
    subscriptionCreditBalance: 360,
    purchasedCreditBalance: 90,
    totalCreditBalance: 450,
    lifetimeGrantedCredits: 450,
    lifetimePurchasedCredits: 100,
    lifetimeUsedCredits: 100,
    lifetimeRefundedCredits: 0,
    lastUpdatedAt: createdAt
  });
  const creditLedger: Array<DemoRecord<CreditLedgerEntry>> = [
    demo({ id: "demo-ledger-1", type: "initial_grant", amount: 450, balanceAfter: 450, subscriptionBalanceAfter: 450, purchasedBalanceAfter: 0, description: "Creator Plus 데모 월 크레딧 지급", relatedPlan: "Creator Plus", createdAt }),
    demo({ id: "demo-ledger-2", type: "generation_debit", amount: -30, balanceAfter: 420, subscriptionBalanceAfter: 420, purchasedBalanceAfter: 0, description: "데모 업로드 패키지 생성", relatedContentId: "demo-content-1", createdAt: iso(-1, 9), metadata: { requestId: "demo-ai-request-1", subscriptionCreditsUsed: 30, purchasedCreditsUsed: 0 } }),
    demo({ id: "demo-ledger-3", type: "credit_purchase", amount: 100, balanceAfter: 520, subscriptionBalanceAfter: 420, purchasedBalanceAfter: 100, description: "데모 추가 크레딧 mock 구매", createdAt: iso(-1, 10), metadata: { price: "8,900원" } })
  ];
  const privacyPreferences = demo({
    version: 1,
    personalizationLearningAllowed: true,
    contentAutoSaveAllowed: true,
    originalFileStorageAllowed: false,
    analyticsAllowed: false,
    marketingNotificationsAllowed: false,
    globalAiTrainingAllowed: false,
    userId: demoUserId,
    workspaceId: brandWorkspaceId,
    updatedAt: createdAt
  });
  const manifest: DemoDataManifest = {
    version: 1,
    demoId: `demo-${Date.now()}`,
    source: "demo",
    createdAt,
    itemCounts: {
      accounts: 1,
      workspaces: workspaces.length,
      contents: packages.length,
      history: history.length,
      designs: designs.length,
      videos: videos.length,
      campaigns: campaigns.length,
      schedules: schedules.length,
      ideas: ideas.length,
      exports: exports.length,
      aiRequests: aiRequests.length,
      creditLedger: creditLedger.length
    },
    contentIds: packages.map((pkg) => pkg.id),
    campaignIds: campaigns.map((campaign) => campaign.id),
    scheduleIds: schedules.map((schedule) => schedule.id),
    exportIds: exports.map((entry) => entry.exportId)
  };

  return {
    manifest,
    account,
    profile,
    session: demo({
      version: 1,
      mode: "test",
      userId: demoUserId,
      workspaceId: brandWorkspaceId,
      signedInMockAt: createdAt,
      lastActiveAt: createdAt
    }),
    workspaces,
    members,
    brandProfile,
    personalizationProfile,
    packages,
    history,
    designs,
    videos,
    campaigns,
    schedules,
    ideas,
    exports,
    aiRequests,
    creditAccount,
    creditLedger,
    privacyPreferences
  };
}
