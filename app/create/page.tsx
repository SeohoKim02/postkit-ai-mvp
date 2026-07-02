"use client";

import {
  AlertCircle,
  BadgeCheck,
  Clapperboard,
  Gift,
  ImagePlus,
  Instagram,
  Loader2,
  Megaphone,
  MessageCircle,
  PackageCheck,
  PenLine,
  RectangleHorizontal,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
  Youtube,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChoiceCard } from "@/components/ChoiceCard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { linkScheduleContent } from "@/lib/calendarStorage";
import { linkCampaignContent } from "@/lib/campaignStorage";
import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import {
  getCreditAccount,
  refundGenerationCredits,
  spendCreditsForGeneration
} from "@/lib/creditStorage";
import { platforms, purposes, styles } from "@/lib/constants";
import { generateUploadPackageWithAi } from "@/lib/ai/client";
import {
  completeAiRequest,
  getAiPreferences,
  hasActiveAiRequest,
  startAiRequest
} from "@/lib/ai/requestStorage";
import {
  createAiRequestId,
  createGenerationIdempotencyKey,
  validateCreateInputForAi
} from "@/lib/ai/validation";
import {
  getTopPlatform,
  getTopPurpose,
  getTopStyle
} from "@/lib/personalization";
import { commercialRelationshipOptions, rightsConfirmationItems, sensitiveInfoItems } from "@/lib/privacyContent";
import { addConsentRecord, addPrivacyAuditEvent, getPrivacyPreferences } from "@/lib/privacyStorage";
import { associateSessionImageWithContent, getSupportedStudioImageTypes, storeSessionImage } from "@/lib/sessionImageStore";
import {
  addToHistory,
  clearPrefill,
  defaultBrandProfile,
  getBrandProfile,
  getPersonalizationProfile,
  getPrefill,
  saveCurrentResult,
  updatePersonalizationProfile
} from "@/lib/storage";
import type {
  BrandProfile,
  CommercialRelationshipType,
  CreateFormInput,
  CreditAccount,
  PersonalizationProfile,
  Platform,
  PrivacyPreferences,
  Purpose,
  SponsorDisclosure,
  StyleTone
} from "@/types";

const defaultInput: CreateFormInput = {
  platform: "Instagram Feed",
  purpose: "Product Promotion",
  style: "친구한테 말하듯",
  productName: "",
  requiredKeywords: "",
  bannedKeywords: "",
  sponsorDisclosure: "none",
  commercialRelationshipType: "none"
};

const disclosureOptions: { label: string; value: SponsorDisclosure }[] = [
  { label: "광고/협찬 아님", value: "none" },
  { label: "협찬", value: "sponsored" },
  { label: "제품 제공", value: "gifted" },
  { label: "광고", value: "ad" }
];

const platformMeta: Record<Platform, { description: string; icon: ReactNode }> = {
  "Instagram Feed": { description: "피드 본문과 저장 유도 캡션", icon: <Instagram size={18} aria-hidden="true" /> },
  "Instagram Story": { description: "짧고 바로 반응하는 문구", icon: <RectangleHorizontal size={18} aria-hidden="true" /> },
  "Reels Thumbnail": { description: "첫 화면에서 멈추게 하는 썸네일", icon: <Clapperboard size={18} aria-hidden="true" /> },
  TikTok: { description: "짧고 강한 후킹 중심", icon: <Video size={18} aria-hidden="true" /> },
  "YouTube Shorts": { description: "쇼츠 피드에서 읽히는 카피", icon: <Youtube size={18} aria-hidden="true" /> }
};

const purposeMeta: Record<Purpose, { description: string; icon: ReactNode }> = {
  "Personal Post": { description: "일상처럼 자연스럽게", icon: <MessageCircle size={18} aria-hidden="true" /> },
  "Sponsored Post": { description: "신뢰가 남는 협찬 소개", icon: <BadgeCheck size={18} aria-hidden="true" /> },
  "Product Promotion": { description: "장점과 구매 포인트 강조", icon: <Megaphone size={18} aria-hidden="true" /> },
  "New Arrival": { description: "신상 느낌을 빠르게 전달", icon: <Sparkles size={18} aria-hidden="true" /> },
  "Discount Event": { description: "지금 행동하게 만드는 이벤트", icon: <Gift size={18} aria-hidden="true" /> },
  "Review Post": { description: "써본 듯한 후기 흐름", icon: <PenLine size={18} aria-hidden="true" /> }
};

const styleDescriptions: Record<StyleTone, string> = {
  감성형: "분위기와 감정 중심",
  "깔끔한 정보형": "핵심 정보가 빠르게 보임",
  "자연스러운 후기형": "직접 써본 듯한 문장",
  "광고 강한 판매형": "구매 전환에 집중",
  "고급 브랜드형": "차분하고 세련된 톤",
  "친구한테 말하듯": "편하고 친근한 말투",
  "전문 리뷰어형": "근거와 평가가 보이는 리뷰",
  "짧고 강한 카피형": "짧은 문장과 강한 후킹"
};

const steps = [
  "업로드",
  "플랫폼",
  "목적",
  "스타일",
  "세부 정보",
  "생성"
];

const defaultRightsChecks = rightsConfirmationItems.reduce<Record<string, boolean>>((acc, item) => {
  acc[item.id] = false;
  return acc;
}, {});

export default function CreatePage() {
  const router = useRouter();
  const [input, setInput] = useState<CreateFormInput>(defaultInput);
  const [brand, setBrand] = useState<BrandProfile>(defaultBrandProfile);
  const [personalization, setPersonalization] = useState<PersonalizationProfile | null>(null);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>(() => getPrivacyPreferences());
  const [rightsChecks, setRightsChecks] = useState<Record<string, boolean>>(defaultRightsChecks);
  const [creditAccount, setCreditAccount] = useState<CreditAccount>(() => getCreditAccount({ applyMonthlyGrant: false }));
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const generationLockRef = useRef(false);
  const transientPreviewUrlRef = useRef("");

  useEffect(() => {
    const savedBrand = getBrandProfile();
    const savedPersonalization = getPersonalizationProfile();
    const prefill = getPrefill();
    setBrand(savedBrand);
    setPersonalization(savedPersonalization);
    setPrivacyPreferences(getPrivacyPreferences());
    setCreditAccount(getCreditAccount());
    setInput(
      prefill ?? {
        ...defaultInput,
        platform: getTopPlatform(savedPersonalization),
        purpose: getTopPurpose(savedPersonalization),
        style: getTopStyle(savedPersonalization),
        sponsorDisclosure: savedPersonalization.accountType === "광고/제휴 계정" ? "ad" : "none"
      }
    );
    clearPrefill();
  }, []);

  useEffect(() => {
    return () => {
      if (transientPreviewUrlRef.current) {
        URL.revokeObjectURL(transientPreviewUrlRef.current);
      }
    };
  }, []);

  const requiredCreditText = useMemo(
    () =>
      `${PACKAGE_CREDIT_COST} 크레딧 차감 예정 · 현재 ${creditAccount.totalCreditBalance.toLocaleString()} 크레딧 · 생성 후 ${Math.max(
        0,
        creditAccount.totalCreditBalance - PACKAGE_CREDIT_COST
      ).toLocaleString()} 크레딧`,
    [creditAccount.totalCreditBalance]
  );

  const missingFields = [
    !input.uploadedFileName ? "사진 또는 영상 자료" : "",
    !input.productName.trim() ? "제품명 또는 콘텐츠 이름" : ""
  ].filter(Boolean);

  const rightsConfirmed = rightsConfirmationItems.every((item) => rightsChecks[item.id]);
  const commercialRelationshipType = input.commercialRelationshipType ?? "none";
  const hasCommercialRelationship = commercialRelationshipType !== "none";
  const disclosureMissingForRelationship = hasCommercialRelationship && input.sponsorDisclosure === "none";
  const currentStep = !input.uploadedFileName ? 1 : !input.productName.trim() ? 5 : 6;

  function updateInput<K extends keyof CreateFormInput>(key: K, value: CreateFormInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateRightsCheck(id: string, checked: boolean) {
    setRightsChecks((current) => ({ ...current, [id]: checked }));
    setError("");
  }

  function handleSelectedFile(file: File) {
    if (transientPreviewUrlRef.current) {
      URL.revokeObjectURL(transientPreviewUrlRef.current);
      transientPreviewUrlRef.current = "";
    }

    if (file.type.startsWith("image/")) {
      const stored = storeSessionImage(file, input.uploadedAssetId);

      if (!stored.ok || !stored.asset) {
        setError(stored.error ?? "이미지를 불러오지 못했어요.");
        return;
      }

      setPreviewUrl(stored.asset.objectUrl);
      updateInput("uploadedAssetId", stored.asset.id);
      updateInput("uploadedFileType", file.type);
      updateInput("uploadedFileName", file.name);
      return;
    }

    if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      transientPreviewUrlRef.current = url;
      setPreviewUrl(url);
      updateInput("uploadedAssetId", undefined);
      updateInput("uploadedFileType", file.type);
      updateInput("uploadedFileName", file.name);
      return;
    }

    setError("PNG, JPEG, WebP 이미지 또는 영상 파일만 업로드할 수 있어요.");
  }

  function renderUploadPreview() {
    if (!previewUrl) {
      return (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <ImagePlus size={26} aria-hidden="true" />
          </span>
          <span className="mt-4 text-base font-black">클릭하거나 파일을 끌어다 놓기</span>
          <span className="mt-2 text-sm leading-6 text-muted">이미지 또는 영상 파일을 선택하세요.</span>
        </>
      );
    }

    if (input.uploadedFileType?.startsWith("video/")) {
      return <video className="max-h-[280px] w-full rounded-lg object-cover" controls src={previewUrl} />;
    }

    return <img alt="업로드 미리보기" className="max-h-[280px] w-full rounded-lg object-cover" src={previewUrl} />;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleSelectedFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleSelectedFile(file);
    }
  }

  async function handleGenerate() {
    if (generationLockRef.current) {
      return;
    }

    setError("");

    if (missingFields.length > 0) {
      setError(`${missingFields.join(", ")}을(를) 입력하면 업로드 패키지를 만들 수 있습니다.`);
      return;
    }

    if (!rightsConfirmed) {
      setError("업로드 권리 확인 항목을 모두 확인해야 생성할 수 있습니다.");
      return;
    }

    const rightsConfirmedAt = new Date().toISOString();
    const validation = validateCreateInputForAi({
      ...input,
      rightsConfirmedAt
    });

    if (!validation.ok) {
      setError(validation.userMessage);
      return;
    }

    const generationInput = validation.value;
    const requestId = createAiRequestId("upload-package");
    const idempotencyKey = createGenerationIdempotencyKey(generationInput);

    if (hasActiveAiRequest(idempotencyKey)) {
      setError("이미 처리 중인 생성 요청이에요. 잠시만 기다려 주세요.");
      return;
    }

    if (creditAccount.totalCreditBalance < PACKAGE_CREDIT_COST) {
      setError(`크레딧이 부족해요. 업로드 패키지 생성에는 ${PACKAGE_CREDIT_COST} 크레딧이 필요합니다.`);
      return;
    }

    generationLockRef.current = true;
    setIsGenerating(true);

    addConsentRecord("rights_confirmation", true);
    addPrivacyAuditEvent("rights_confirmation");

    const nextPersonalization = updatePersonalizationProfile((current) => ({
      ...current,
      preferredPlatforms: [generationInput.platform, ...current.preferredPlatforms.filter((item) => item !== generationInput.platform)].slice(0, 5),
      preferredPurposes: [generationInput.purpose, ...current.preferredPurposes.filter((item) => item !== generationInput.purpose)].slice(0, 6),
      preferredStyles: [generationInput.style, ...current.preferredStyles.filter((item) => item !== generationInput.style)].slice(0, 5),
      requiredPhrases: Array.from(new Set([...current.requiredPhrases, ...generationInput.requiredKeywords.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean)])).slice(0, 30),
      bannedPhrases: Array.from(new Set([...current.bannedPhrases, ...generationInput.bannedKeywords.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean)])).slice(0, 30),
      scores: {
        ...current.scores,
        platforms: {
          ...current.scores.platforms,
          [generationInput.platform]: Number(current.scores.platforms[generationInput.platform] ?? 0) + 1
        },
        purposes: {
          ...current.scores.purposes,
          [generationInput.purpose]: Number(current.scores.purposes[generationInput.purpose] ?? 0) + 1
        },
        styles: {
          ...current.scores.styles,
          [generationInput.style]: Number(current.scores.styles[generationInput.style] ?? 0) + 1
        }
      },
      lastUpdatedAt: new Date().toISOString()
    }));
    setPersonalization(nextPersonalization);

    const personalizationForGeneration = privacyPreferences.personalizationLearningAllowed ? nextPersonalization : undefined;
    startAiRequest({
      requestId,
      idempotencyKey,
      taskType: "caption_generation",
      creditCost: PACKAGE_CREDIT_COST,
      relatedCampaignId: generationInput.campaignId,
      personalizationApplied: Boolean(personalizationForGeneration)
    });

    const debit = spendCreditsForGeneration(PACKAGE_CREDIT_COST, requestId);

    if (!debit.ok || !debit.ledgerEntry) {
      setCreditAccount(debit.account);
      setError(debit.error ?? "크레딧 차감에 실패했습니다.");
      completeAiRequest(requestId, "failed", { errorCode: "INSUFFICIENT_CREDITS" });
      generationLockRef.current = false;
      setIsGenerating(false);
      return;
    }

    try {
      const aiResponse = await generateUploadPackageWithAi({
        requestId,
        idempotencyKey,
        input: generationInput,
        brandProfile: brand,
        personalizationProfile: personalizationForGeneration,
        allowSafeRetry: getAiPreferences().allowSafeRetry
      });

      if (!aiResponse.ok || !aiResponse.generatedPackage) {
        throw new Error(aiResponse.errorCode ?? "GENERATION_FAILED");
      }

      const result = aiResponse.generatedPackage;
      const aiWarnings = Array.from(new Set([
        ...validation.warnings,
        ...(result.aiWarnings ?? []),
        ...(aiResponse.structuredResult?.warnings ?? [])
      ]));
      const resultWithCredit = {
        ...result,
        aiRequestId: requestId,
        aiWarnings,
        aiFallbackUsed: Boolean(aiResponse.usedFallback),
        creditLedgerId: debit.ledgerEntry.id,
        subscriptionCreditsUsed: debit.subscriptionCreditsUsed,
        purchasedCreditsUsed: debit.purchasedCreditsUsed,
        campaignId: generationInput.campaignId,
        campaignName: generationInput.campaignName,
        scheduleId: generationInput.scheduleId,
        brandName: generationInput.brandName
      };
      associateSessionImageWithContent(generationInput.uploadedAssetId, resultWithCredit.id);
      saveCurrentResult(resultWithCredit);
      if (privacyPreferences.contentAutoSaveAllowed) {
        addToHistory(resultWithCredit);
      }
      linkScheduleContent(generationInput.scheduleId, resultWithCredit.id);
      linkCampaignContent(generationInput.campaignId, resultWithCredit.id, resultWithCredit.platform);
      completeAiRequest(requestId, "succeeded", {
        relatedContentId: resultWithCredit.id,
        usedFallback: Boolean(aiResponse.usedFallback)
      });
      setCreditAccount(debit.account);
      router.push("/results");
    } catch {
      const refund = refundGenerationCredits(debit.ledgerEntry.id);
      setCreditAccount(refund.account);
      completeAiRequest(requestId, refund.refunded ? "refunded" : "failed", { errorCode: "GENERATION_FAILED" });
      setError("생성 중 문제가 생겨 차감된 크레딧을 환불했어요.");
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Badge tone={missingFields.length > 0 ? "lemon" : "mint"}>
            {missingFields.length > 0 ? "필수 입력 필요" : "생성 준비 완료"}
          </Badge>
        }
        description="자료를 넣고 플랫폼, 목적, 스타일을 고르면 업로드 직전 패키지가 생성됩니다."
        eyebrow="Create"
        title="사진 넣고 업로드 패키지 만들기"
      />

      <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 min-[430px]:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const done = currentStep > stepNumber;

          return (
            <div
              className={`min-w-0 rounded-lg border px-3 py-2 text-sm font-black ${
                active ? "border-coral bg-blush text-coral" : done ? "border-mint/40 bg-aqua text-emerald-700" : "border-line bg-white text-muted"
              }`}
              key={step}
            >
              {stepNumber}. {step}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">1. 사진 또는 영상 업로드</h2>
              <p className="mt-1 text-sm text-muted">브라우저 안에서만 미리보며 서버로 전송하지 않습니다.</p>
            </div>
            <UploadCloud className="text-coral" size={22} aria-hidden="true" />
          </div>
          <label
            className={`mt-4 flex min-h-[260px] min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition sm:min-h-[320px] ${
              isDragging ? "border-coral bg-blush" : "border-stone-300 bg-wash hover:border-coral/60 hover:bg-blush/40"
            }`}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDrop={handleDrop}
          >
            {renderUploadPreview()}
            <input accept={`${getSupportedStudioImageTypes().join(",")},video/*`} className="sr-only" onChange={handleFileChange} type="file" />
          </label>
          {input.uploadedFileName ? (
            <p className="mt-3 flex min-w-0 items-start gap-2 text-sm font-bold text-muted">
              <UploadCloud size={16} aria-hidden="true" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{input.uploadedFileName}</span>
            </p>
          ) : null}

          <div className="mt-5 rounded-lg border border-line bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint/15 text-mint">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-black">업로드 권리 확인</h3>
                <p className="mt-1 text-sm leading-6 text-muted">아래 항목은 생성 전에 모두 확인해야 합니다.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {rightsConfirmationItems.map((item) => (
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-bold leading-6" key={item.id}>
                  <input
                    checked={Boolean(rightsChecks[item.id])}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-coral"
                    onChange={(event) => updateRightsCheck(item.id, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <Badge className="mt-4" tone={rightsConfirmed ? "mint" : "lemon"}>
              {rightsConfirmed ? "권리 확인 완료" : "생성 전 확인 필요"}
            </Badge>
          </div>

          <div className="mt-4 rounded-lg border border-lemon/30 bg-yellow-50/70 p-4">
            <p className="flex items-start gap-2 text-sm font-black text-yellow-800">
              <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
              민감정보 업로드 주의
            </p>
            <p className="mt-2 text-sm leading-6 text-yellow-800">
              자동 탐지는 아직 제공하지 않습니다. 다음 자료는 포함하지 않도록 직접 확인해 주세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sensitiveInfoItems.map((item) => (
                <Badge key={item} tone="lemon">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">2-4. 생성 방향 선택</h2>
                <p className="mt-1 text-sm text-muted">
                  {brand.accountName} 프로필과 {personalization?.preferredTone ?? "기본"} 말투 기준으로 결과가 조정됩니다.
                </p>
              </div>
              <LinkButton className="w-full sm:w-auto" href="/settings" variant="secondary">
                브랜드 설정
              </LinkButton>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-3 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                  <h3 className="text-sm font-black">플랫폼 선택</h3>
                  <Badge tone="sky">{input.platform}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {platforms.map((platform) => (
                    <ChoiceCard
                      description={platformMeta[platform].description}
                      icon={platformMeta[platform].icon}
                      key={platform}
                      onClick={() => updateInput("platform", platform)}
                      selected={input.platform === platform}
                      title={platform}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                  <h3 className="text-sm font-black">게시물 목적 선택</h3>
                  <Badge tone="mint">{input.purpose}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {purposes.map((purpose) => (
                    <ChoiceCard
                      description={purposeMeta[purpose].description}
                      icon={purposeMeta[purpose].icon}
                      key={purpose}
                      onClick={() => updateInput("purpose", purpose)}
                      selected={input.purpose === purpose}
                      title={purpose}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                  <h3 className="text-sm font-black">스타일 선택</h3>
                  <Badge tone="coral">{input.style}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {styles.map((style) => (
                    <ChoiceCard
                      description={styleDescriptions[style]}
                      key={style}
                      onClick={() => updateInput("style", style)}
                      selected={input.style === style}
                      title={style}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">5. 세부 정보 입력</h2>
            {input.campaignId || input.scheduleId ? (
              <div className="mt-4 rounded-lg border border-sky/20 bg-sky/5 p-4">
                <p className="text-sm font-black text-sky">캠페인·일정 연결됨</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {input.campaignName ?? "캠페인"} 정보를 바탕으로 필수 키워드, 해시태그, 광고 표시 방식을 반영합니다. 생성 후 캠페인과 일정에 콘텐츠 ID가 자동 연결됩니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {input.brandName ? <Badge tone="sky">{input.brandName}</Badge> : null}
                  {input.requiredHashtags ? <Badge tone="mint">{input.requiredHashtags}</Badge> : null}
                  {input.discountCode ? <Badge tone="lemon">{input.discountCode}</Badge> : null}
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="field-label">제품명 또는 콘텐츠 이름</span>
                <input
                  className="field"
                  onChange={(event) => updateInput("productName", event.target.value)}
                  placeholder="예: 글로우 립밤, 신상 니트, 카페 메뉴"
                  value={input.productName}
                />
              </label>

              <label>
                <span className="field-label">필수 키워드</span>
                <textarea
                  className="field min-h-28 resize-none"
                  onChange={(event) => updateInput("requiredKeywords", event.target.value)}
                  placeholder="예: 촉촉함, 데일리, 선물 추천"
                  value={input.requiredKeywords}
                />
              </label>

              <label>
                <span className="field-label">금지 키워드</span>
                <textarea
                  className="field min-h-28 resize-none"
                  onChange={(event) => updateInput("bannedKeywords", event.target.value)}
                  placeholder="예: 1위, 완벽, 의학적 표현"
                  value={input.bannedKeywords}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="field-label">광고/협찬 여부</span>
                <select
                  className="field"
                  onChange={(event) => updateInput("sponsorDisclosure", event.target.value as SponsorDisclosure)}
                  value={input.sponsorDisclosure}
                >
                  {disclosureOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="field-label">경제적 이해관계 유형</span>
                <select
                  className="field"
                  onChange={(event) => updateInput("commercialRelationshipType", event.target.value as CommercialRelationshipType)}
                  value={commercialRelationshipType}
                >
                  {commercialRelationshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {disclosureMissingForRelationship ? (
                <div className="rounded-lg border border-lemon/40 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
                  <p className="font-black">광고·협찬 표시 문구를 확인해 주세요.</p>
                  <p className="mt-1">
                    {commercialRelationshipType} 관계가 선택되어 있지만 광고/협찬 여부가 “광고/협찬 아님”으로 되어 있습니다. 이 경고는 법률 준수를 보장하지 않으며,
                    최종 게시 전 광고주 요구사항과 관련 기준을 직접 확인해야 합니다.
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-line bg-wash p-4 text-sm leading-6 text-muted">
                업로드 자료와 생성 결과는 서비스 전체 AI 모델 학습에 사용하지 않습니다. 개인 맞춤 학습은 이 브라우저의 사용자 설정 안에서만 반영되며, 설정에서 끌 수 있습니다.
                {privacyPreferences.personalizationLearningAllowed ? "" : " 현재 개인 맞춤 학습이 꺼져 있어 저장된 학습 프로필을 생성 결과에 반영하지 않습니다."}
                {privacyPreferences.contentAutoSaveAllowed ? "" : " 현재 콘텐츠 자동 저장이 꺼져 있어 생성 결과는 History에 자동 저장되지 않습니다."}
              </div>
            </div>

            {error ? (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-coral/30 bg-coral/10 p-4 text-sm text-coral">
                <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                <div>
                  <p className="font-bold">{error}</p>
                  {creditAccount.totalCreditBalance < PACKAGE_CREDIT_COST ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <LinkButton href="/pricing" variant="soft">
                        상위 플랜 보기
                      </LinkButton>
                      <LinkButton href="/pricing" variant="secondary">
                        추가 크레딧 구매
                      </LinkButton>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : missingFields.length > 0 ? (
              <div className="mt-5 rounded-lg border border-line bg-wash p-4 text-sm leading-6 text-muted">
                필수 항목: {missingFields.join(", ")}
              </div>
            ) : null}

            <div className="mt-6 rounded-lg border border-line bg-wash p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-ink">
                    <PackageCheck size={17} aria-hidden="true" />
                    6. 생성
                  </p>
                  <p className="mt-1 text-sm text-muted">{requiredCreditText}</p>
                </div>
                <Button className="w-full sm:w-auto" disabled={isGenerating} onClick={handleGenerate} type="button">
                  {isGenerating ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Zap size={17} aria-hidden="true" />}
                  업로드 패키지 생성
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
