export type Platform =
  | "Instagram Feed"
  | "Instagram Story"
  | "Instagram Reels"
  | "Reels Thumbnail"
  | "TikTok"
  | "YouTube Shorts"
  | "Facebook"
  | "X";

export type Purpose =
  | "Personal Post"
  | "Sponsored Post"
  | "Product Promotion"
  | "New Arrival"
  | "Discount Event"
  | "Review Post";

export type StyleTone =
  | "감성형"
  | "깔끔한 정보형"
  | "자연스러운 후기형"
  | "광고 강한 판매형"
  | "고급 브랜드형"
  | "친구한테 말하듯"
  | "전문 리뷰어형"
  | "짧고 강한 카피형";

export type SponsorDisclosure = "none" | "sponsored" | "gifted" | "ad";

export type CommercialRelationshipType =
  | "none"
  | "제품 제공"
  | "원고료"
  | "제휴 링크"
  | "할인코드"
  | "공동구매"
  | "자체 제품";

export type AccountType =
  | "개인 계정"
  | "인플루언서"
  | "광고/제휴 계정"
  | "쇼핑몰/브랜드"
  | "소상공인"
  | "마케팅 대행사";

export type ContentPreference =
  | "개인 일상"
  | "제품 홍보"
  | "광고/협찬"
  | "후기"
  | "신상품"
  | "할인 이벤트"
  | "정보형 콘텐츠";

export type AccountMode = "guest" | "test";

export type AccountStatus = "guest" | "active" | "signed_out" | "disabled";

export type WorkspaceType = "personal" | "creator" | "brand" | "business" | "agency";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type SubscriptionOwner = "user" | "workspace";

export type SyncStatus = "idle" | "pending" | "syncing" | "synced" | "failed" | "conflict";

export type StorageAdapterStatus = {
  adapter: "local" | "cloud";
  available: boolean;
  mode: "guest" | "test" | "unavailable";
  message: string;
  lastCheckedAt: string;
  version: number;
};

export type DataOwnership = {
  userId?: string;
  workspaceId?: string;
  ownerType: "guest" | "user" | "workspace";
  subscriptionOwner?: SubscriptionOwner;
  migratedAt?: string;
};

export type UserAccount = {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  accountType: AccountType;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type UserProfile = {
  id: string;
  userId: string;
  displayName: string;
  accountType: AccountType;
  preferredWorkspaceId?: string;
  onboardingAccountType?: AccountType;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type UserSession = {
  version: number;
  mode: AccountMode;
  userId: string;
  workspaceId: string;
  signedInMockAt: string;
  lastActiveAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerUserId: string;
  currentPlan: string;
  brandProfileId?: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  displayName: string;
  role: WorkspaceRole;
  status: "active" | "mock_invited" | "removed";
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SyncQueueAction = "create" | "update" | "delete" | "clear" | "import";

export type SyncQueueStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  action: SyncQueueAction;
  workspaceId?: string;
  userId?: string;
  localUpdatedAt: string;
  retryCount: number;
  status: SyncQueueStatus;
  lastError?: string;
  version: number;
};

export type StoragePreferences = {
  version: number;
  activeAdapter: "local" | "cloud";
  syncEnabled: boolean;
  conflictPolicy: "localUpdatedAt" | "manual";
  lastUpdatedAt: string;
};

export type DataMigrationState = {
  version: number;
  migrationId: string;
  status: "not_started" | "completed" | "failed";
  userId?: string;
  workspaceId?: string;
  migratedKeys: string[];
  errorMessage?: string;
  backupCreatedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type AccountDataExport = {
  schemaVersion: number;
  exportedAt: string;
  source: "postkit-local";
  userId?: string;
  workspaceId?: string;
  excluded: string[];
  data: Record<string, unknown>;
};

export type DiagnosticStatus = "정상" | "확인 필요" | "오류" | "미지원" | "미구현" | "실행 전";

export type DiagnosticCategory =
  | "앱 환경"
  | "브라우저 지원 기능"
  | "라우트 상태"
  | "저장 데이터 상태"
  | "크레딧 상태"
  | "계정·워크스페이스 상태"
  | "개인화 상태"
  | "AI 서비스 상태"
  | "Studio·Canvas 상태"
  | "Video Studio 상태"
  | "내보내기·공유 상태"
  | "개인정보 설정 상태"
  | "전체 사용자 흐름 체크리스트";

export type BrowserCapability = {
  id: string;
  label: string;
  supported: boolean;
  status: DiagnosticStatus;
  detail: string;
};

export type DiagnosticCheck = {
  id: string;
  category: DiagnosticCategory;
  label: string;
  status: DiagnosticStatus;
  code: string;
  message: string;
  fix?: string;
  targetKey?: string;
  route?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type DiagnosticSummary = Record<DiagnosticStatus, number>;

export type DiagnosticResult = {
  id: string;
  generatedAt: string;
  mode: "light" | "full";
  checks: DiagnosticCheck[];
  summary: DiagnosticSummary;
  unresolvedCount: number;
  version: number;
};

export type DiagnosticReport = {
  schemaVersion: number;
  generatedAt: string;
  appVersion: string;
  browserCapabilities: BrowserCapability[];
  routeStatus: DiagnosticCheck[];
  storageKeyStatus: DiagnosticCheck[];
  errorCount: number;
  warningCount: number;
  mockProviderStatus: "mock" | "unknown";
  currentAccountMode: AccountMode | "unknown";
  unresolvedChecks: Array<Pick<DiagnosticCheck, "id" | "category" | "status" | "code" | "message" | "targetKey">>;
};

export type RepairProposal = {
  id: string;
  targetKey: string;
  title: string;
  description: string;
  action: "export" | "reset_default" | "clean_refs" | "recalculate_credits";
  riskLevel: "low" | "medium" | "high";
};

export type DemoDataManifest = {
  version: number;
  demoId: string;
  source: "demo";
  createdAt: string;
  itemCounts: Record<string, number>;
  contentIds: string[];
  campaignIds: string[];
  scheduleIds: string[];
  exportIds: string[];
};

export type QaChecklistItem = {
  id: string;
  category: string;
  label: string;
  checked: boolean;
  updatedAt?: string;
};

export type PreferredCaptionLength = "short" | "medium" | "long";

export type PreferredCTAStyle = "save" | "comment" | "share" | "link" | "purchase";

export type ResultCopyType =
  | "caption"
  | "hashtags"
  | "cta"
  | "hook"
  | "thumbnail"
  | "disclosure"
  | "checklist"
  | "all"
  | "share-ready";

export type AiTaskType =
  | "caption_generation"
  | "hashtag_generation"
  | "cta_generation"
  | "hook_generation"
  | "thumbnail_text_generation"
  | "disclosure_generation"
  | "content_summary"
  | "design_recommendation"
  | "future_image_generation"
  | "future_video_generation";

export type AiProviderName = "mock" | "openai" | "custom";

export type AiRequestStatus = "pending" | "running" | "succeeded" | "failed" | "refunded";

export type AiErrorCode =
  | "INVALID_INPUT"
  | "INSUFFICIENT_CREDITS"
  | "DUPLICATE_REQUEST"
  | "GENERATION_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "OUTPUT_VALIDATION_FAILED"
  | "PRIVACY_RESTRICTION"
  | "UNSUPPORTED_TASK"
  | "MISSING_CONFIGURATION"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTHENTICATION_ERROR"
  | "INVALID_RESPONSE"
  | "VALIDATION_FAILED"
  | "UNKNOWN_ERROR";

export type AiModelMetadata = {
  provider: AiProviderName;
  model: string;
  promptVersion: string;
  requestId: string;
  retryCount: number;
  durationMs?: number;
};

export type AiGenerationInfo = {
  requestId: string;
  provider: AiProviderName;
  taskTypes: AiTaskType[];
  promptVersion: string;
  usedFallback: boolean;
  retryCount: number;
  personalizationApplied: boolean;
  recommendedTemplateId?: string;
  summary?: string;
  warnings: string[];
  modelMetadata: AiModelMetadata;
};

export type AiRequestHistoryEntry = {
  requestId: string;
  idempotencyKey: string;
  taskType: AiTaskType;
  provider: AiProviderName;
  status: AiRequestStatus;
  creditCost: number;
  relatedContentId?: string;
  relatedCampaignId?: string;
  startedAt: string;
  completedAt?: string;
  errorCode?: AiErrorCode;
  usedFallback: boolean;
  personalizationApplied: boolean;
  userId?: string;
  workspaceId?: string;
  version: number;
};

export type AiPreferences = {
  version: number;
  provider: AiProviderName;
  allowSafeRetry: boolean;
  lastUpdatedAt: string;
};

export type LearningHistoryEvent = {
  id: string;
  resultId?: string;
  value: string;
  platform?: Platform;
  purpose?: Purpose;
  style?: StyleTone;
  captionLength?: PreferredCaptionLength;
  ctaStyle?: PreferredCTAStyle;
  createdAt: string;
};

export type CopiedResultEvent = LearningHistoryEvent & {
  copyType: ResultCopyType;
};

export type EditedCaptionEvent = LearningHistoryEvent & {
  before: string;
  after: string;
};

export type FeedbackResultEvent = LearningHistoryEvent & {
  target: ResultCopyType | "package";
};

export type RegenerationEvent = {
  id: string;
  resultId?: string;
  platform?: Platform;
  purpose?: Purpose;
  style?: StyleTone;
  createdAt: string;
};

export type PersonalizationScores = {
  styles: Partial<Record<StyleTone, number>>;
  tones: Record<string, number>;
  captionLengths: Record<PreferredCaptionLength, number>;
  ctaStyles: Record<PreferredCTAStyle, number>;
  hashtagTypes: Record<string, number>;
  platforms: Partial<Record<Platform, number>>;
  purposes: Partial<Record<Purpose, number>>;
};

export type PersonalizationProfile = {
  version: number;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  accountType: AccountType;
  preferredPlatforms: Platform[];
  preferredPurposes: Purpose[];
  preferredStyles: StyleTone[];
  preferredTone: string;
  preferredCaptionLength: PreferredCaptionLength;
  frequentlyUsedHashtags: string[];
  requiredPhrases: string[];
  bannedPhrases: string[];
  preferredCTAStyle: PreferredCTAStyle;
  sponsoredDisclosureStyle: string;
  selectedCaptionHistory: LearningHistoryEvent[];
  copiedResultHistory: CopiedResultEvent[];
  editedCaptionHistory: EditedCaptionEvent[];
  likedResultHistory: FeedbackResultEvent[];
  dislikedResultHistory: FeedbackResultEvent[];
  savedStyleHistory: FeedbackResultEvent[];
  savedResultHistory: FeedbackResultEvent[];
  regenerationHistory: RegenerationEvent[];
  scores: PersonalizationScores;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  lastUpdatedAt: string;
};

export type PersonalizationSnapshot = {
  topStyle: StyleTone;
  topPlatform: Platform;
  captionLength: PreferredCaptionLength;
  level: string;
  note: string;
};

export type BrandProfile = {
  accountName: string;
  category: string;
  voice: string;
  feedMood: string;
  primaryColor?: string;
  secondaryColor?: string;
  favoriteHashtags: string;
  requiredPhrases: string;
  bannedPhrases: string;
  defaultDisclosure: string;
  preferredPlatform: Platform;
};

export type CreateFormInput = {
  platform: Platform;
  purpose: Purpose;
  style: StyleTone;
  productName: string;
  requiredKeywords: string;
  bannedKeywords: string;
  sponsorDisclosure: SponsorDisclosure;
  commercialRelationshipType?: CommercialRelationshipType;
  uploadedFileName?: string;
  uploadedPreview?: string;
  uploadedAssetId?: string;
  uploadedFileType?: string;
  requiredHashtags?: string;
  disclosureStyle?: string;
  discountCode?: string;
  landingUrl?: string;
  linkGuide?: string;
  brandName?: string;
  campaignId?: string;
  campaignName?: string;
  scheduleId?: string;
  rightsConfirmedAt?: string;
};

export type GeneratedPackage = {
  id: string;
  title: string;
  createdAt: string;
  platform: Platform;
  purpose: Purpose;
  style: StyleTone;
  usedCredits: number;
  captions: string[];
  hashtags: string[];
  ctas: string[];
  hooks: string[];
  thumbnails: string[];
  disclosure: string;
  checklist: string[];
  packageItems: string[];
  input: CreateFormInput;
  personalization?: PersonalizationSnapshot;
  selectedCaptionIndex?: number;
  selectedCaption?: string;
  editedCaptionHistory?: EditedCaptionEvent[];
  copiedResultTypes?: ResultCopyType[];
  liked?: boolean;
  disliked?: boolean;
  savedToLibrary?: boolean;
  ai?: AiGenerationInfo;
  aiRequestId?: string;
  aiWarnings?: string[];
  aiFallbackUsed?: boolean;
  recommendedDesignTemplateId?: string;
  creditLedgerId?: string;
  refundedCreditLedgerId?: string;
  refunded?: boolean;
  subscriptionCreditsUsed?: number;
  purchasedCreditsUsed?: number;
  campaignId?: string;
  campaignName?: string;
  scheduleId?: string;
  brandName?: string;
  designs?: DesignProject[];
  videoProjects?: VideoProject[];
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
};

export type HistoryItem = {
  id: string;
  createdAt: string;
  package: GeneratedPackage;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
};

export type SubscriptionPlan = {
  name: string;
  price: string;
  priceWon: number;
  credits: number;
  description: string;
  recommendedFor: string;
  highlighted?: boolean;
  /** "available"은 지금 사용 가능, "coming_soon"은 결제 연동 후 제공 예정 */
  availability: "available" | "coming_soon";
};

export type CreditPack = {
  credits: number;
  price: string;
  priceWon: number;
};

export type CreditCost = {
  label: string;
  credits: string;
};

export type SubscriptionStatus = "active" | "free" | "canceled" | "past_due";

export type ScheduledPlanChange = {
  planName: string;
  effectiveAt: string;
  requestedAt: string;
};

export type CreditAccount = {
  version: number;
  currentPlan: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycleStartedAt: string;
  nextCreditGrantAt: string;
  subscriptionCreditBalance: number;
  purchasedCreditBalance: number;
  totalCreditBalance: number;
  lifetimeGrantedCredits: number;
  lifetimePurchasedCredits: number;
  lifetimeUsedCredits: number;
  lifetimeRefundedCredits: number;
  scheduledPlanChange?: ScheduledPlanChange;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  lastUpdatedAt: string;
};

export type CreditLedgerType =
  | "initial_grant"
  | "subscription_grant"
  | "plan_upgrade"
  | "plan_downgrade"
  | "credit_purchase"
  | "generation_debit"
  | "generation_refund"
  | "manual_adjustment"
  | "credit_expiration"
  | "rollover";

export type CreditLedgerEntry = {
  id: string;
  type: CreditLedgerType;
  amount: number;
  balanceAfter: number;
  subscriptionBalanceAfter: number;
  purchasedBalanceAfter: number;
  description: string;
  relatedContentId?: string;
  relatedPlan?: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
};

export type CreditDebitResult = {
  ok: boolean;
  account: CreditAccount;
  ledgerEntry?: CreditLedgerEntry;
  subscriptionCreditsUsed: number;
  purchasedCreditsUsed: number;
  error?: string;
};

export type LegacyAccountState = {
  planName: string;
  credits: number;
  monthlyGenerations: number;
};

export type ExportPlatform =
  | "Instagram Feed"
  | "Instagram Story"
  | "Instagram Reels"
  | "TikTok"
  | "YouTube Shorts"
  | "Facebook"
  | "X";

export type ExportContentType =
  | "feed_image"
  | "story_image"
  | "reels_thumbnail"
  | "shorts_thumbnail"
  | "original_image"
  | "original_video"
  | "vertical_video_webm"
  | "video_frame_png"
  | "captions_txt"
  | "hashtags_txt"
  | "cta_txt"
  | "disclosure_txt"
  | "thumbnail_txt"
  | "full_upload_txt"
  | "metadata_json";

export type ExportAssetKind = "image" | "video" | "text" | "json";

export type ExportPreset = {
  id: string;
  platform: ExportPlatform;
  contentType: string;
  recommendedAspectRatio: string;
  width: number;
  height: number;
  supportedFileTypes: string[];
  titleMaxLength: number;
  descriptionMaxLength: number;
  hashtagStyle: string;
  disclosurePosition: string;
  shareableItems: Array<"text" | "url" | "image" | "video">;
  openUrl: string;
};

export type ExportAsset = {
  id: string;
  kind: ExportAssetKind;
  contentType: ExportContentType;
  label: string;
  fileName: string;
  mimeType: string;
  available: boolean;
  source: "mock_preview" | "uploaded_original" | "design_canvas" | "video_studio" | "text" | "metadata";
  text?: string;
  unavailableReason?: string;
  width?: number;
  height?: number;
};

export type ExportPackage = {
  contentId: string;
  title: string;
  platform: Platform;
  purpose: Purpose;
  style: StyleTone;
  generatedAt: string;
  selectedCaption: string;
  captions: string[];
  hashtags: string[];
  ctas: string[];
  hooks: string[];
  thumbnails: string[];
  disclosure: string;
  checklist: string[];
  metadata: Record<string, string | number | boolean | string[] | null | undefined>;
  assets: ExportAsset[];
};

export type ExportHistoryType =
  | "single_download"
  | "full_download"
  | "text_copy"
  | "web_share"
  | "platform_open"
  | "video_render"
  | "export_retry";

export type ExportHistoryStatus = "success" | "failed" | "fallback";

export type ExportHistoryEntry = {
  exportId: string;
  contentId: string;
  platform: ExportPlatform;
  exportType: ExportHistoryType;
  downloadedFiles: string[];
  copiedFields: string[];
  shared: boolean;
  openedPlatform: boolean;
  exportedAt: string;
  status: ExportHistoryStatus;
  errorMessage?: string;
  videoProjectId?: string;
  templateId?: string;
  durationSeconds?: number;
  outputFormat?: "webm" | "png_frames" | "text_pack";
  downloaded?: boolean;
  exported?: boolean;
  campaignId?: string;
  scheduleId?: string;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
};

export type ShareResult = {
  ok: boolean;
  shared: boolean;
  fallbackUsed: boolean;
  message: string;
  canceled?: boolean;
  error?: string;
};

export type DownloadResult = {
  ok: boolean;
  fileName?: string;
  downloadedFiles?: string[];
  message?: string;
  error?: string;
};

export type ExportChecklistItem = {
  id: string;
  label: string;
  status: "ok" | "warning" | "missing";
  detail?: string;
};

export type ExportPreferences = {
  version: number;
  preferredExportPlatform?: ExportPlatform;
  lastSelectedPresetId?: string;
  lastUpdatedAt: string;
};

export type DesignTextPosition = "top" | "center" | "bottom" | "left" | "right";

export type DesignTextAlignment = "left" | "center" | "right";

export type DesignOverlayStyle = "none" | "soft-dark" | "soft-light" | "gradient-bottom" | "brand-panel" | "blur-card";

export type DesignFitMode = "cover" | "contain";

export type DesignOutputPreset = {
  id: string;
  name: string;
  platform: ExportPlatform | "YouTube Thumbnail";
  contentType: string;
  width: number;
  height: number;
  aspectRatio: string;
  exportPresetId?: string;
};

export type DesignTemplate = {
  id: string;
  name: string;
  category: string;
  textPosition: DesignTextPosition;
  textAlignment: DesignTextAlignment;
  overlayStyle: DesignOverlayStyle;
  fontScale: number;
  padding: number;
  titleMaxLines: number;
  showBrandName: boolean;
  showDisclosure: boolean;
  defaultAspectRatio: string;
};

export type CanvasTextElement = {
  title: string;
  subtitle: string;
  cta: string;
  brandName: string;
  disclosure: string;
  footer: string;
};

export type CanvasImageSettings = {
  fit: DesignFitMode;
  scale: number;
  offsetX: number;
  offsetY: number;
  brightness: number;
  overlayOpacity: number;
};

export type BrandStyleSnapshot = {
  brandName: string;
  mood: string;
  voice: string;
  primaryColor: string;
  secondaryColor: string;
  disclosureStyle: string;
};

export type DesignProject = {
  id: string;
  version: number;
  contentId: string;
  templateId: string;
  outputPresetId: string;
  platform: ExportPlatform | "YouTube Thumbnail";
  width: number;
  height: number;
  editedText: CanvasTextElement;
  imageSettings: CanvasImageSettings;
  textPosition: DesignTextPosition;
  textAlignment: DesignTextAlignment;
  fontScale: number;
  primaryColor: string;
  secondaryColor: string;
  showTitle: boolean;
  showBrandName: boolean;
  showCta: boolean;
  showDisclosure: boolean;
  brandStyleSnapshot: BrandStyleSnapshot;
  uploadedAssetId?: string;
  generatedAt: string;
  downloaded: boolean;
  exported: boolean;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  lastUpdatedAt: string;
};

export type DesignPreferences = {
  version: number;
  lastTemplateId?: string;
  lastOutputPresetId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  lastUpdatedAt: string;
};

export type RenderResult = {
  ok: boolean;
  blob?: Blob;
  dataUrl?: string;
  fileName?: string;
  error?: string;
};

export type DesignExportAsset = {
  designId: string;
  contentId: string;
  fileName: string;
  width: number;
  height: number;
  mimeType: "image/png";
};

export type VideoPlatform = "Instagram Reels" | "Instagram Story" | "TikTok" | "YouTube Shorts";

export type VideoTransitionType = "none" | "fade" | "slide-up" | "slide-side" | "slow-zoom" | "zoom-in-out";

export type VideoImageMotion = "none" | "ken-burns-in" | "ken-burns-out" | "pan-up" | "quick-cut";

export type VideoTextPosition = "top" | "center" | "bottom";

export type VideoOverlayStyle = "none" | "soft-dark" | "soft-light" | "brand-gradient" | "product-panel";

export type VideoTemplate = {
  id: string;
  name: string;
  category: string;
  durationSeconds: 5 | 8 | 10 | 15;
  frameRate: number;
  transitionType: VideoTransitionType;
  textPosition: VideoTextPosition;
  overlayStyle: VideoOverlayStyle;
  imageMotion: VideoImageMotion;
  titleMaxLines: number;
  showBrandName: boolean;
  showCTA: boolean;
  showDisclosure: boolean;
};

export type VideoTextSettings = {
  title: string;
  hook: string;
  productName: string;
  cta: string;
  brandName: string;
  disclosure: string;
  discountCode: string;
};

export type VideoImageItem = {
  assetId: string;
  name: string;
  type: string;
  size: number;
};

export type VideoRenderSettings = {
  platform: VideoPlatform;
  width: number;
  height: number;
  durationSeconds: 5 | 8 | 10 | 15;
  frameRate: number;
  transitionType: VideoTransitionType;
  textPosition: VideoTextPosition;
  overlayStyle: VideoOverlayStyle;
  imageMotion: VideoImageMotion;
  overlayOpacity: number;
  titleMaxLines: number;
  showTitle: boolean;
  showCTA: boolean;
  showBrandName: boolean;
  showDisclosure: boolean;
  primaryColor: string;
  secondaryColor: string;
  brandStyleSnapshot: BrandStyleSnapshot;
  text: VideoTextSettings;
};

export type VideoFramePlan = {
  index: number;
  imageIndex: number;
  startSeconds: number;
  endSeconds: number;
  transitionInSeconds: number;
  transitionOutSeconds: number;
};

export type VideoProject = {
  id: string;
  version: number;
  contentId: string;
  templateId: string;
  platform: VideoPlatform;
  width: number;
  height: number;
  durationSeconds: 5 | 8 | 10 | 15;
  frameRate: number;
  transitionType: VideoTransitionType;
  textPosition: VideoTextPosition;
  overlayStyle: VideoOverlayStyle;
  imageMotion: VideoImageMotion;
  overlayOpacity: number;
  titleMaxLines: number;
  showTitle: boolean;
  showCTA: boolean;
  showBrandName: boolean;
  showDisclosure: boolean;
  text: VideoTextSettings;
  imageItems: VideoImageItem[];
  brandStyleSnapshot: BrandStyleSnapshot;
  outputFormat: "webm";
  generatedAt?: string;
  downloaded: boolean;
  exported: boolean;
  campaignId?: string;
  scheduleId?: string;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  lastUpdatedAt: string;
};

export type VideoExportAsset = {
  videoProjectId: string;
  contentId: string;
  fileName: string;
  width: number;
  height: number;
  durationSeconds: number;
  mimeType: "video/webm";
  blob?: Blob;
  objectUrl?: string;
  createdAt: string;
};

export type VideoRenderResult = {
  ok: boolean;
  videoProjectId?: string;
  blob?: Blob;
  fileName?: string;
  durationSeconds?: number;
  mimeType?: "video/webm";
  error?: string;
  fallbackUsed?: boolean;
};

export type VideoPreviewState = {
  playing: boolean;
  currentTimeSeconds: number;
  supported: boolean;
  supportMessage: string;
};

export type ContentScheduleStatus =
  | "아이디어"
  | "작성 중"
  | "검토 필요"
  | "게시 준비 완료"
  | "게시 예정"
  | "게시 완료"
  | "보류"
  | "기한 초과";

export type CalendarViewMode = "month" | "week" | "list";

export type RepeatOption = "none" | "weekly" | "biweekly" | "monthly";

export type ContentSchedule = {
  id: string;
  version: number;
  title: string;
  platform: Platform;
  purpose: Purpose;
  scheduledAt: string;
  brandName: string;
  campaignId?: string;
  campaignName?: string;
  productName: string;
  status: ContentScheduleStatus;
  isSponsored: boolean;
  requiredKeywords: string[];
  bannedKeywords: string[];
  requiredHashtags: string[];
  disclosureStyle: string;
  discountCode?: string;
  linkGuide?: string;
  internalMemo?: string;
  linkedContentId?: string;
  linkedExportIds: string[];
  lastExportedAt?: string;
  repeatOption: RepeatOption;
  repeatGroupId?: string;
  publishedAt?: string;
  publishedUrl?: string;
  actualCaption?: string;
  publishedPlatform?: Platform;
  publishMemo?: string;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  createdAt: string;
  updatedAt: string;
};

export type CampaignType =
  | "제품 제공"
  | "원고료 광고"
  | "공동구매"
  | "제휴 링크"
  | "할인코드"
  | "브랜드 앰배서더"
  | "자체 제품 홍보"
  | "일반 콘텐츠";

export type CampaignStatus =
  | "제안 검토 중"
  | "수락"
  | "제작 중"
  | "광고주 검토 중"
  | "수정 요청"
  | "게시 준비 완료"
  | "진행 중"
  | "완료"
  | "취소";

export type DeliverableStatus =
  | "미시작"
  | "생성 완료"
  | "수정 중"
  | "승인 대기"
  | "승인 완료"
  | "게시 완료";

export type DeliverableType =
  | "Instagram 피드"
  | "Instagram 스토리"
  | "Instagram 릴스"
  | "TikTok"
  | "YouTube Shorts"
  | "Facebook 게시물"
  | "X 게시물"
  | "썸네일"
  | "캡션"
  | "해시태그"
  | "광고주 확인용 시안";

export type CampaignDeliverable = {
  id: string;
  type: DeliverableType;
  status: DeliverableStatus;
};

export type Campaign = {
  id: string;
  version: number;
  campaignName: string;
  advertiserName: string;
  brandName: string;
  productName: string;
  campaignType: CampaignType;
  description: string;
  startDate: string;
  endDate: string;
  contentDeadline: string;
  publishStartAt: string;
  publishEndAt: string;
  targetPlatforms: Platform[];
  requiredDeliverables: CampaignDeliverable[];
  requiredKeywords: string[];
  bannedKeywords: string[];
  requiredHashtags: string[];
  disclosureStyle: string;
  discountCode?: string;
  landingUrl?: string;
  contactName?: string;
  contactChannel?: string;
  compensationType?: string;
  compensationNote?: string;
  campaignStatus: CampaignStatus;
  relatedContentIds: string[];
  relatedScheduleIds: string[];
  internalMemo?: string;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  createdAt: string;
  updatedAt: string;
};

export type ContentIdea = {
  id: string;
  version: number;
  title: string;
  category: string;
  platform: Platform;
  purpose: Purpose;
  memo: string;
  preferredDate?: string;
  tags: string[];
  convertedToSchedule: boolean;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  createdAt: string;
  updatedAt: string;
};

export type NotificationType =
  | "게시 예정 24시간 전"
  | "게시 예정 1시간 전"
  | "캠페인 마감 임박"
  | "필수 결과물 미완료"
  | "광고 표시 문구 누락"
  | "기한 초과"
  | "검토 대기";

export type PostKitNotification = {
  id: string;
  version: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedScheduleId?: string;
  relatedCampaignId?: string;
  read: boolean;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  createdAt: string;
};

export type CalendarPreferences = {
  version: number;
  viewMode: CalendarViewMode;
  selectedDate: string;
  platform?: Platform | "전체";
  status?: ContentScheduleStatus | "전체";
  campaignId?: string | "전체";
  brandName?: string;
  sponsoredOnly?: boolean;
  overdueOnly?: boolean;
  lastUpdatedAt: string;
};

export type ScheduleChecklistItem = {
  id: string;
  label: string;
  status: "ok" | "warning" | "hidden";
  detail?: string;
};

export type RetentionOption = "none" | "7d" | "30d" | "90d" | "until_deleted";

export type PrivacyPreferences = {
  version: number;
  personalizationLearningAllowed: boolean;
  contentAutoSaveAllowed: boolean;
  originalFileStorageAllowed: boolean;
  analyticsAllowed: boolean;
  marketingNotificationsAllowed: boolean;
  globalAiTrainingAllowed: boolean;
  userId?: string;
  workspaceId?: string;
  ownership?: DataOwnership;
  updatedAt: string;
};

export type RetentionSettings = {
  version: number;
  originalFileRetention: RetentionOption;
  lastCleanupAt?: string;
  updatedAt: string;
};

export type ConsentRecordType =
  | "privacy_preferences"
  | "rights_confirmation"
  | "global_ai_training";

export type ConsentRecord = {
  id: string;
  version: number;
  type: ConsentRecordType;
  granted: boolean;
  createdAt: string;
};

export type PrivacyAuditEventType =
  | "consent_updated"
  | "personalization_enabled"
  | "personalization_disabled"
  | "data_exported"
  | "content_deleted"
  | "personalization_deleted"
  | "all_data_deleted"
  | "retention_changed"
  | "rights_confirmation"
  | "infringement_reported";

export type PrivacyAuditLogEntry = {
  id: string;
  version: number;
  eventType: PrivacyAuditEventType;
  createdAt: string;
};

export type InfringementReportStatus = "접수됨" | "검토 중" | "삭제 처리됨" | "반려됨";

export type InfringementReport = {
  id: string;
  version: number;
  reportType: "저작권" | "초상권" | "상표권" | "기타";
  targetContentId?: string;
  targetUrl?: string;
  reason: string;
  requestedAction: string;
  status: InfringementReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type RetentionCleanupCandidate = {
  id: string;
  label: string;
  reason: string;
};
