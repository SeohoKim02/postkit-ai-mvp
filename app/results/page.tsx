"use client";

import { CheckCircle2, Download, PackageCheck, Palette, RotateCcw, Save, Share2, Sparkles, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { FeedbackActions } from "@/components/FeedbackActions";
import { PageHeader } from "@/components/PageHeader";
import { ResultSection } from "@/components/ResultSection";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { generateUploadPackageWithAi } from "@/lib/ai/client";
import { createAiRequestId, createGenerationIdempotencyKey } from "@/lib/ai/validation";
import { getPurposeLabel, styles } from "@/lib/constants";
import { downloadJsonFile } from "@/lib/downloadUtils";
import { getPlatformContentGuide } from "@/lib/platformGuidance";
import {
  recordCopiedResult,
  recordDislikedResult,
  recordEditedCaption,
  recordLikedResult,
  recordRegeneration,
  recordSavedResult,
  recordSavedStyle,
  recordSelectedCaption
} from "@/lib/learning";
import {
  defaultBrandProfile,
  getCurrentResult,
  getHistory,
  getPersonalizationProfile,
  saveCurrentResult,
  savePrefill,
  saveHistory,
  updateHistoryResult,
  updatePersonalizationProfile
} from "@/lib/storage";
import type { CreateFormInput, GeneratedPackage, ResultCopyType } from "@/types";

const sampleInput: CreateFormInput = {
  platform: "Instagram Feed",
  purpose: "Product Promotion",
  style: styles[5] ?? styles[0],
  productName: "글로우 립밤",
  requiredKeywords: "촉촉함, 데일리, 선물 추천",
  bannedKeywords: "완벽, 1위",
  sponsorDisclosure: "gifted",
  uploadedFileName: "sample-lipbalm.jpg"
};

function createSampleFallbackPackage(requestId: string): GeneratedPackage {
  const now = new Date().toISOString();
  const guide = getPlatformContentGuide(sampleInput.platform);

  return {
    id: `sample-${requestId}`,
    title: "글로우 립밤 피드 콘텐츠",
    createdAt: now,
    platform: sampleInput.platform,
    purpose: sampleInput.purpose,
    style: sampleInput.style,
    usedCredits: 0,
    captions: [
      "글로우 립밤은 건조한 날 가방에 넣고 다니기 좋은 제품입니다.\n촉촉함이 오래 가고, 데일리로 바르기에도 부담이 적어요.\n비슷한 립밤을 비교 중이라면 저장해두고 확인해보세요.",
      "입술이 건조할 때 바로 꺼내 쓰기 좋은 립밤을 찾고 있다면\n글로우 립밤은 촉촉함과 휴대성을 같이 보기 좋습니다.\n선물용으로도 괜찮은지 댓글로 의견 남겨주세요.",
      "선물용 립밤 고를 때는 패키지만큼 실제로 자주 쓸지도 보게 돼요.\n글로우 립밤은 색이 부담스럽지 않고, 데일리로 바르기 편한 쪽입니다.\n자세한 옵션은 프로필에서 확인해보세요.",
      "글로우 립밤 써보고 괜찮았던 건 촉촉함 쪽이에요.\n가방에 넣고 다니기 편해서 건조할 때 바로 꺼내 쓰기 좋습니다.\n비슷한 제품과 비교 중이라면 이 글을 저장해두세요.",
      "데일리 립밤 찾는 분이라면 글로우 립밤도 같이 봐도 괜찮아요.\n선물용으로도 과하지 않고, 매일 바르기 편한 사용감이 먼저 느껴집니다.\n궁금한 컬러는 댓글로 남겨주세요."
    ],
    hashtags: ["#글로우립밤", "#데일리립밤", "#촉촉립밤", "#선물템", "#데일리아이템"],
    ctas: ["저장해두고 필요할 때 다시 확인해보세요.", "어떤 컬러가 더 좋은지 댓글로 남겨주세요.", "자세한 옵션은 프로필에서 확인해보세요."],
    hooks: [],
    thumbnails: [],
    disclosure: "제품을 제공받아 직접 사용해본 뒤 작성했습니다.",
    checklist: ["본문이 선택한 플랫폼 형식에 맞는지 확인", "광고/협찬 표시가 필요한 경우 앞부분에 배치", "금지 키워드와 과장 표현이 없는지 확인", "해시태그 수와 문구 길이가 적절한지 확인", "복사 후 최종 게시 화면에서 한 번 더 확인"],
    packageItems: guide.packageItems,
    input: sampleInput,
    aiRequestId: requestId,
    aiFallbackUsed: true,
    aiWarnings: ["샘플 결과입니다. 실제 게시 전 문구를 한 번 더 확인해 주세요."]
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function sectionLines(title: string, items: string[]) {
  if (items.length === 0) {
    return [];
  }

  return ["", `[${title}]`, ...items.map((item, index) => `${index + 1}. ${item}`)];
}

function composePackage(result: GeneratedPackage) {
  const guide = getPlatformContentGuide(result.platform);

  return [
    result.title,
    ...sectionLines(guide.captionTitle, result.captions),
    ...(guide.showHashtags ? sectionLines(`해시태그 ${result.hashtags.length}개`, [result.hashtags.join(" ")]) : []),
    ...sectionLines(guide.ctaTitle, result.ctas),
    ...sectionLines(guide.hookTitle, result.hooks),
    ...sectionLines(guide.thumbnailTitle, result.thumbnails),
    ...sectionLines("광고/협찬 표시 문구", [result.disclosure])
  ].join("\n");
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<GeneratedPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [shareStatus, setShareStatus] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  useEffect(() => {
    let active = true;

    async function loadResult() {
      const current = getCurrentResult();

      if (current) {
        const history = getHistory();
        if (!active) return;
        setResult(current);
        setIsSaved(history.some((item) => item.id === current.id));
        setSelectedCaptionIndex(current.selectedCaptionIndex ?? 0);
        setIsLoading(false);
        return;
      }

      const requestId = createAiRequestId("sample");
      let sample: GeneratedPackage;

      try {
        const sampleResponse = await generateUploadPackageWithAi({
          requestId,
          idempotencyKey: createGenerationIdempotencyKey(sampleInput),
          input: sampleInput,
          brandProfile: defaultBrandProfile,
          personalizationProfile: getPersonalizationProfile(),
          allowSafeRetry: true
        });
        sample = sampleResponse.generatedPackage ?? createSampleFallbackPackage(requestId);
      } catch {
        sample = createSampleFallbackPackage(requestId);
      }

      if (!active) return;
      setResult(sample);
      setIsSaved(false);
      setSelectedCaptionIndex(sample.selectedCaptionIndex ?? 0);
      setIsLoading(false);
    }

    loadResult();

    return () => {
      active = false;
    };
  }, []);

  const allText = useMemo(() => (result ? composePackage(result) : ""), [result]);

  function flash(message: string) {
    setFeedbackMessage(message);
    window.setTimeout(() => setFeedbackMessage(""), 1800);
  }

  function persistResult(nextResult: GeneratedPackage) {
    setResult(nextResult);
    saveCurrentResult(nextResult);
    updateHistoryResult(nextResult);
  }

  function learningContext(value: string, copyType?: ResultCopyType) {
    return {
      resultId: result?.id,
      value,
      platform: result?.platform,
      purpose: result?.purpose,
      style: result?.style,
      copyType
    };
  }

  function updateResultMeta(updater: (current: GeneratedPackage) => GeneratedPackage) {
    if (!result) return;
    persistResult(updater(result));
  }

  function handleSave() {
    if (!result) {
      return;
    }

    const selectedCaption = result.captions[selectedCaptionIndex] ?? result.captions[0] ?? "";
    const history = getHistory();
    const exists = history.some((item) => item.id === result.id);
    const nextResult = { ...result, savedToLibrary: true };
    const nextHistory = exists
      ? history.map((item) => (item.id === result.id ? { ...item, package: nextResult } : item))
      : [{ id: result.id, createdAt: result.createdAt, package: nextResult }, ...history].slice(0, 30);

    saveHistory(nextHistory);
    saveCurrentResult(nextResult);
    setResult(nextResult);
    setIsSaved(true);
    updatePersonalizationProfile((profile) => recordSavedResult(profile, learningContext(selectedCaption, "caption")));
    flash("보관함에 저장했고 학습 스타일에 반영했어요.");
  }

  function handleRegenerate() {
    if (!result) {
      return;
    }

    const selectedCaption = result.captions[selectedCaptionIndex] ?? result.captions[0] ?? "";
    updatePersonalizationProfile((profile) => recordRegeneration(profile, learningContext(selectedCaption, "caption")));
    savePrefill(result.input);
    flash("다시 생성할 입력값을 만들기 화면으로 보냈습니다.");
    router.push("/create");
  }

  function handleSelectCaption(index: number) {
    if (!result) return;
    const caption = result.captions[index];

    setSelectedCaptionIndex(index);
    updateResultMeta((current) => ({
      ...current,
      selectedCaptionIndex: index,
      selectedCaption: caption
    }));
    updatePersonalizationProfile((profile) => recordSelectedCaption(profile, learningContext(caption, "caption")));
    flash("선택한 문구를 학습 스타일에 반영했어요.");
  }

  function handleCopied(copyType: ResultCopyType, value: string) {
    updatePersonalizationProfile((profile) => recordCopiedResult(profile, learningContext(value, copyType)));
    updateResultMeta((current) => ({
      ...current,
      copiedResultTypes: Array.from(new Set([...(current.copiedResultTypes ?? []), copyType]))
    }));
    flash("복사했어요. 다음 생성에 반영할게요.");
  }

  function handleLike(target: ResultCopyType | "package", value: string) {
    updatePersonalizationProfile((profile) => recordLikedResult(profile, { ...learningContext(value), target }));
    updateResultMeta((current) => ({ ...current, liked: true, disliked: false }));
    flash("선호 스타일에 반영했어요.");
  }

  function handleDislike(target: ResultCopyType | "package", value: string) {
    updatePersonalizationProfile((profile) => recordDislikedResult(profile, { ...learningContext(value), target }));
    updateResultMeta((current) => ({ ...current, liked: false, disliked: true }));
    flash("다음 생성에서 이 표현은 줄일게요.");
  }

  function handleSaveStyle(target: ResultCopyType | "package", value: string) {
    updatePersonalizationProfile((profile) => recordSavedStyle(profile, { ...learningContext(value), target }));
    flash("내 스타일로 저장했어요.");
  }

  function startEdit(index: number) {
    if (!result) return;
    setEditingIndex(index);
    setCaptionDraft(result.captions[index]);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setCaptionDraft("");
  }

  function saveEdit() {
    if (!result || editingIndex === null) return;
    const before = result.captions[editingIndex];
    const after = captionDraft.trim();

    if (!after) {
      flash("수정할 문구를 입력해 주세요.");
      return;
    }

    const nextCaptions = result.captions.map((caption, index) => (index === editingIndex ? after : caption));
    const editEvent = {
      id: `edit-${Date.now()}`,
      resultId: result.id,
      value: after,
      before,
      after,
      platform: result.platform,
      purpose: result.purpose,
      style: result.style,
      createdAt: new Date().toISOString()
    };
    const nextResult = {
      ...result,
      captions: nextCaptions,
      selectedCaptionIndex: editingIndex,
      selectedCaption: after,
      editedCaptionHistory: [editEvent, ...(result.editedCaptionHistory ?? [])]
    };

    persistResult(nextResult);
    setSelectedCaptionIndex(editingIndex);
    updatePersonalizationProfile((profile) => recordEditedCaption(profile, { ...learningContext(after, "caption"), before, after }));
    setEditingIndex(null);
    setCaptionDraft("");
    flash("수정한 문구를 저장했어요.");
  }

  async function handleShareReady() {
    if (!result) {
      return;
    }

    const guide = getPlatformContentGuide(result.platform);
    const selectedCaption = result.captions[selectedCaptionIndex] ?? result.captions[0] ?? "";
    const shareText = [
      selectedCaption,
      guide.showHashtags ? result.hashtags.join(" ") : "",
      result.disclosure
    ].filter(Boolean).join("\n\n");

    try {
      await navigator.clipboard.writeText(shareText);
      setShareStatus(`${guide.copyActionLabel}용 문구가 복사됐습니다.`);
      handleCopied("share-ready", shareText);
    } catch {
      setShareStatus("선택한 문구를 화면에서 확인해 주세요.");
    }
    window.setTimeout(() => setShareStatus(""), 2200);
  }

  function handleDownload() {
    if (!result) {
      return;
    }

    downloadJsonFile(`${result.id}.json`, result);
  }

  if (isLoading || !result) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-lg border border-line bg-white p-6 text-center shadow-soft">
            <Sparkles className="mx-auto animate-pulse text-coral" size={32} aria-hidden="true" />
            <p className="mt-3 font-black">업로드용 결과를 준비하는 중</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const platformGuide = getPlatformContentGuide(result.platform);
  const selectedCaption = result.captions[selectedCaptionIndex] ?? result.captions[0] ?? "";
  const resultMetaItems = [
    { label: "생성일", value: formatDate(result.createdAt) },
    { label: "플랫폼", value: result.platform },
    { label: "권장 비율", value: platformGuide.recommendedRatio },
    { label: "결과 형식", value: platformGuide.resultFormat },
    { label: "목적", value: getPurposeLabel(result.purpose) },
    { label: "사용 크레딧", value: `${result.usedCredits} 크레딧` }
  ];

  return (
    <AppShell>
      <PageHeader
        action={
          <>
            <CopyButton label="전체 복사" onCopied={() => handleCopied("all", allText)} value={allText} />
            <Button onClick={handleRegenerate} type="button" variant="secondary">
              <RotateCcw size={17} aria-hidden="true" />
              다시 생성
            </Button>
            <Button onClick={handleSave} type="button" variant={isSaved ? "secondary" : "primary"}>
              <Save size={17} aria-hidden="true" />
              {isSaved ? "보관함 저장됨" : "보관함 저장"}
            </Button>
            <Button onClick={handleShareReady} type="button" variant="soft">
              <Share2 size={17} aria-hidden="true" />
              {platformGuide.copyActionLabel}
            </Button>
            <LinkButton href="/studio" onClick={() => saveCurrentResult(result)} variant="secondary">
              <Palette size={17} aria-hidden="true" />
              {platformGuide.studioActionLabel}
            </LinkButton>
            <LinkButton href="/video-studio" onClick={() => saveCurrentResult(result)} variant="secondary">
              <Video size={17} aria-hidden="true" />
              {platformGuide.videoActionLabel}
            </LinkButton>
            <LinkButton href="/export" onClick={() => saveCurrentResult(result)} variant="primary">
              <Download size={17} aria-hidden="true" />
              {platformGuide.exportActionLabel}
            </LinkButton>
          </>
        }
        description={`${platformGuide.label} 기준 결과만 모았습니다. 바로 복사하거나 Studio, Video Studio, Export로 이어갈 수 있습니다.`}
        eyebrow="Results"
        title={result.title}
      />

      <section className="mt-5 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 lg:grid-cols-4">
        {resultMetaItems.map((item) => (
          <div className="min-w-0 rounded-lg border border-line bg-white px-3 py-2 shadow-soft" key={item.label}>
            <p className="text-xs font-black text-muted">{item.label}</p>
            <p className="mt-1 break-keep text-sm font-black leading-snug text-ink [overflow-wrap:anywhere]">{item.value}</p>
          </div>
        ))}
      </section>

      {shareStatus ? (
        <div className="mt-5 flex min-w-0 items-start gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold leading-6 text-emerald-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{shareStatus}</span>
        </div>
      ) : null}

      {feedbackMessage ? (
        <div className="mt-5 flex min-w-0 items-start gap-2 rounded-lg border border-coral/20 bg-blush p-3 text-sm font-bold leading-6 text-coral">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{feedbackMessage}</span>
        </div>
      ) : null}

      <section className="mt-6 grid min-w-0 gap-3 rounded-lg border border-line bg-white p-3 shadow-soft sm:grid-cols-2 sm:p-4 lg:grid-cols-3 2xl:grid-cols-4">
        {result.packageItems.map((item) => (
          <div className="flex min-w-0 items-start gap-2 rounded-lg bg-wash px-3 py-2 text-sm font-bold leading-snug" key={item}>
            <PackageCheck className="mt-0.5 shrink-0 text-mint" size={17} aria-hidden="true" />
            <span className="min-w-0 break-keep">{item}</span>
          </div>
        ))}
      </section>

      {result.ai || result.aiWarnings?.length || result.recommendedDesignTemplateId ? (
        <Card className="mt-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">생성 정보</h2>
              <p className="mt-1 break-keep text-sm leading-6 text-muted">
                선택한 플랫폼과 입력값을 바탕으로 업로드용 문구를 만들었습니다.
                {result.ai?.personalizationApplied ? " 개인 맞춤 설정 요약을 반영했습니다." : " 개인 맞춤 학습이 꺼져 있으면 기본 설정만 사용합니다."}
              </p>
              {result.ai?.summary ? <p className="mt-2 text-sm font-bold text-coral [overflow-wrap:anywhere]">{result.ai.summary}</p> : null}
              {result.aiWarnings?.length ? (
                <ul className="mt-3 space-y-1 text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                  {result.aiWarnings.map((warning) => (
                    <li key={warning}>- {warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
              <Badge tone="mint">생성 완료</Badge>
              {result.recommendedDesignTemplateId ? <Badge tone="sky">디자인 후보 {result.recommendedDesignTemplateId}</Badge> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">선택된 {platformGuide.shortLabel} 문구</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted [overflow-wrap:anywhere]">{selectedCaption}</p>
                {result.personalization ? (
                  <p className="mt-3 text-xs font-bold leading-5 text-coral [overflow-wrap:anywhere]">{result.personalization.note}</p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                <Badge tone="coral">{selectedCaptionIndex + 1}번</Badge>
                <CopyButton onCopied={() => handleCopied("caption", selectedCaption)} value={selectedCaption} />
              </div>
            </div>
          </Card>

          <ResultSection
            description="SNS 본문에 바로 붙여넣을 수 있는 문구입니다."
            footer={
              <FeedbackActions
                onDislike={() => handleDislike("caption", selectedCaption)}
                onEdit={() => startEdit(selectedCaptionIndex)}
                onLike={() => handleLike("caption", selectedCaption)}
                onRegenerate={handleRegenerate}
                onSaveStyle={() => handleSaveStyle("caption", selectedCaption)}
              />
            }
            itemLabels={platformGuide.captionVariantLabels}
            items={result.captions}
            onCopyAll={() => handleCopied("caption", result.captions.join("\n"))}
            onCopyItem={(item) => handleCopied("caption", item)}
            onSelect={handleSelectCaption}
            renderItem={(item, index) =>
              editingIndex === index ? (
                <div className="space-y-3">
                  <textarea
                    className="field min-h-32 resize-none"
                    onChange={(event) => setCaptionDraft(event.target.value)}
                    value={captionDraft}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button className="min-h-9 px-3 py-1.5" onClick={saveEdit} type="button">
                      수정 내용 저장
                    </Button>
                    <Button className="min-h-9 px-3 py-1.5" onClick={cancelEdit} type="button" variant="secondary">
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                item
              )
            }
            selectedIndex={selectedCaptionIndex}
            selectLabel="선택"
            title={platformGuide.captionTitle}
          />

          {platformGuide.showHashtags && result.hashtags.length > 0 ? (
            <ResultSection
              description="선택한 플랫폼에 맞게 필요한 만큼만 정리한 해시태그입니다."
              footer={
                <FeedbackActions
                  onDislike={() => handleDislike("hashtags", result.hashtags.join(" "))}
                  onLike={() => handleLike("hashtags", result.hashtags.join(" "))}
                  onRegenerate={handleRegenerate}
                  onSaveStyle={() => handleSaveStyle("hashtags", result.hashtags.join(" "))}
                />
              }
              items={result.hashtags}
              onCopyAll={() => handleCopied("hashtags", result.hashtags.join(" "))}
              onCopyItem={(item) => handleCopied("hashtags", item)}
              renderItem={(item) => <span className="inline-flex max-w-full rounded-lg bg-white px-2 py-1 font-bold text-coral [overflow-wrap:anywhere]">{item}</span>}
              title={`해시태그 ${result.hashtags.length}개`}
            />
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          {result.hooks.length > 0 ? (
            <ResultSection
              footer={
                <FeedbackActions
                  onDislike={() => handleDislike("hook", result.hooks.join(" / "))}
                  onLike={() => handleLike("hook", result.hooks.join(" / "))}
                  onRegenerate={handleRegenerate}
                  onSaveStyle={() => handleSaveStyle("hook", result.hooks.join(" / "))}
                />
              }
              itemLabels={platformGuide.hookVariantLabels}
              items={result.hooks}
              onCopyAll={() => handleCopied("hook", result.hooks.join("\n"))}
              onCopyItem={(item) => handleCopied("hook", item)}
              title={platformGuide.hookTitle}
            />
          ) : null}

          {result.thumbnails.length > 0 ? (
            <ResultSection
              footer={
                <FeedbackActions
                  onDislike={() => handleDislike("thumbnail", result.thumbnails.join(" / "))}
                  onLike={() => handleLike("thumbnail", result.thumbnails.join(" / "))}
                  onRegenerate={handleRegenerate}
                  onSaveStyle={() => handleSaveStyle("thumbnail", result.thumbnails.join(" / "))}
                />
              }
              itemLabels={platformGuide.thumbnailVariantLabels}
              items={result.thumbnails}
              onCopyAll={() => handleCopied("thumbnail", result.thumbnails.join("\n"))}
              onCopyItem={(item) => handleCopied("thumbnail", item)}
              title={platformGuide.thumbnailTitle}
            />
          ) : null}

          {result.ctas.length > 0 ? (
            <ResultSection
              footer={
                <FeedbackActions
                  onDislike={() => handleDislike("cta", result.ctas.join(" / "))}
                  onLike={() => handleLike("cta", result.ctas.join(" / "))}
                  onRegenerate={handleRegenerate}
                  onSaveStyle={() => handleSaveStyle("cta", result.ctas.join(" / "))}
                />
              }
              itemLabels={platformGuide.ctaVariantLabels}
              items={result.ctas}
              onCopyAll={() => handleCopied("cta", result.ctas.join("\n"))}
              onCopyItem={(item) => handleCopied("cta", item)}
              title={platformGuide.ctaTitle}
            />
          ) : null}

          <ResultSection
            footer={
              <FeedbackActions
                onDislike={() => handleDislike("disclosure", result.disclosure)}
                onLike={() => handleLike("disclosure", result.disclosure)}
                onRegenerate={handleRegenerate}
                onSaveStyle={() => handleSaveStyle("disclosure", result.disclosure)}
              />
            }
            items={[result.disclosure]}
            onCopyAll={() => handleCopied("disclosure", result.disclosure)}
            onCopyItem={(item) => handleCopied("disclosure", item)}
            title="광고/협찬 표시 문구"
          />

          <ResultSection
            items={result.checklist}
            onCopyAll={() => handleCopied("checklist", result.checklist.join("\n"))}
            onCopyItem={(item) => handleCopied("checklist", item)}
            title="업로드 전 체크리스트"
          />

          <Card>
            <h2 className="break-keep text-lg font-black">내보내기</h2>
            <p className="mt-1 break-keep text-sm leading-6 text-muted">JSON 파일은 생성 결과를 백업해 두고 싶을 때 내려받습니다.</p>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap sm:[&>*]:w-auto [&>*]:w-full">
              <Button onClick={handleDownload} type="button" variant="secondary">
                <Download size={17} aria-hidden="true" />
                JSON 저장
              </Button>
              <LinkButton href="/export" onClick={() => saveCurrentResult(result)} variant="soft">
                {platformGuide.exportActionLabel}
              </LinkButton>
              <LinkButton href="/studio" onClick={() => saveCurrentResult(result)} variant="secondary">
                {platformGuide.studioActionLabel}
              </LinkButton>
              <LinkButton href="/video-studio" onClick={() => saveCurrentResult(result)} variant="secondary">
                {platformGuide.videoActionLabel}
              </LinkButton>
              <LinkButton href="/create" variant="soft">
                새로 만들기
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
