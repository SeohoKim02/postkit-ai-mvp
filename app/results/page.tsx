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
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { generateUploadPackageWithAi } from "@/lib/ai/client";
import { createAiRequestId, createGenerationIdempotencyKey } from "@/lib/ai/validation";
import { downloadJsonFile } from "@/lib/downloadUtils";
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
  style: "친구한테 말하듯",
  productName: "글로우 립밤",
  requiredKeywords: "촉촉함, 데일리, 선물 추천",
  bannedKeywords: "완벽, 1위",
  sponsorDisclosure: "gifted",
  uploadedFileName: "sample-lipbalm.jpg"
};

function createSampleFallbackPackage(requestId: string): GeneratedPackage {
  const now = new Date().toISOString();

  return {
    id: `sample-${requestId}`,
    title: "글로우 립밤 업로드 패키지",
    createdAt: now,
    platform: sampleInput.platform,
    purpose: sampleInput.purpose,
    style: sampleInput.style,
    usedCredits: 0,
    captions: [
      "오늘 파우치에 하나만 넣는다면 이 립밤. 촉촉함이 오래 남아 데일리로 쓰기 좋아요.",
      "선물하기 좋은 촉촉한 립밤을 찾고 있다면, 글로우 립밤을 체크해보세요.",
      "가볍게 바르고 자연스럽게 빛나는 데일리 립 케어 루틴.",
      "건조한 날에도 입술 컨디션을 편하게 챙기는 작은 추천템.",
      "부담 없이 쓰기 좋은 촉촉한 립밤, 오늘의 데일리템으로 저장해두세요."
    ],
    hashtags: ["#글로우립밤", "#데일리립밤", "#촉촉립밤", "#추천템", "#선물추천"],
    ctas: ["저장해두고 보기", "친구에게 공유하기", "오늘 루틴에 추가하기", "댓글로 궁금한 점 남기기", "프로필에서 더 보기"],
    hooks: ["2초 만에 촉촉해 보이는 입술", "파우치에 꼭 넣는 데일리템", "선물용 립밤 고르는 법", "건조한 날 챙겨야 할 한 가지", "자연스러운 윤기 루틴"],
    thumbnails: ["촉촉한 데일리 립밤", "선물 추천 립 케어", "오늘의 파우치템", "자연스러운 윤기", "저장각 추천템"],
    disclosure: "#협찬",
    checklist: ["광고 표시 문구 확인", "필수 키워드 포함 여부 확인", "금지 표현 미사용 확인", "해시태그 수 확인", "최종 게시 전 직접 검토"],
    packageItems: ["피드용 문구", "스토리용 문구", "릴스 썸네일 문구", "캡션 5개", "해시태그 세트", "CTA 문구", "광고/협찬 표시 문구"],
    input: sampleInput,
    aiRequestId: requestId,
    aiFallbackUsed: true,
    aiWarnings: ["AI API 라우트 응답을 받지 못해 샘플 fallback을 표시했어요."]
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

function composePackage(result: GeneratedPackage) {
  return [
    result.title,
    "",
    "[캡션]",
    ...result.captions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "[해시태그]",
    result.hashtags.join(" "),
    "",
    "[CTA]",
    ...result.ctas.map((item, index) => `${index + 1}. ${item}`),
    "",
    "[후킹 문구]",
    ...result.hooks.map((item, index) => `${index + 1}. ${item}`),
    "",
    "[썸네일 문구]",
    ...result.thumbnails.map((item, index) => `${index + 1}. ${item}`),
    "",
    "[광고/협찬 표시]",
    result.disclosure,
    "",
    "[체크리스트]",
    ...result.checklist.map((item) => `- ${item}`)
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
        setSelectedCaptionIndex(0);
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
      setSelectedCaptionIndex(0);
      setIsLoading(false);
    }

    loadResult();

    return () => {
      active = false;
    };
  }, []);

  const allText = useMemo(() => (result ? composePackage(result) : ""), [result]);
  const selectedCaption = result?.captions[selectedCaptionIndex] ?? "";
  const resultMetaItems = result
    ? [
        { label: "생성일", value: formatDate(result.createdAt) },
        { label: "플랫폼", value: result.platform },
        { label: "목적", value: result.purpose },
        { label: "사용 크레딧", value: `${result.usedCredits} 크레딧` }
      ]
    : [];

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
    flash("보관함 저장 기록을 내 스타일에 반영했어요.");
  }

  function handleRegenerate() {
    if (!result) {
      return;
    }

    updatePersonalizationProfile((profile) => recordRegeneration(profile, learningContext(selectedCaption, "caption")));
    savePrefill(result.input);
    flash("다시 생성 기록을 저장했어요.");
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
    flash("선택한 캡션을 내 스타일에 반영했어요.");
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
    flash("다음 생성에서는 이 표현을 줄일게요.");
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
    flash("수정한 말투를 저장했어요.");
  }

  async function handleShareReady() {
    if (!result) {
      return;
    }

    const shareText = [selectedCaption, "", result.hashtags.join(" "), "", result.disclosure].join("\n");
    try {
      await navigator.clipboard.writeText(shareText);
      setShareStatus("선택한 캡션, 해시태그, 광고 표시 문구가 복사됐습니다.");
      handleCopied("share-ready", shareText);
    } catch {
      setShareStatus("선택한 캡션과 해시태그를 화면에서 확인해 주세요.");
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
            <p className="mt-3 font-black">업로드 패키지를 준비하는 중</p>
          </div>
        </div>
      </AppShell>
    );
  }

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
              {isSaved ? "보관함 저장됨" : "보관함에 저장"}
            </Button>
            <Button onClick={handleShareReady} type="button" variant="soft">
              <Share2 size={17} aria-hidden="true" />
              SNS 공유 준비
            </Button>
            <LinkButton href="/studio" onClick={() => saveCurrentResult(result)} variant="secondary">
              <Palette size={17} aria-hidden="true" />
              디자인 편집
            </LinkButton>
            <LinkButton href="/video-studio" onClick={() => saveCurrentResult(result)} variant="secondary">
              <Video size={17} aria-hidden="true" />
              영상 만들기
            </LinkButton>
            <LinkButton href="/export" onClick={() => saveCurrentResult(result)} variant="primary">
              <Download size={17} aria-hidden="true" />
              내보내기 센터
            </LinkButton>
          </>
        }
        description="생성된 업로드 패키지를 확인하고 복사, 편집, 내보내기를 준비합니다."
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
                현재는 MockProvider가 결과를 만들었고 외부 AI API는 호출하지 않았어요.
                {result.ai?.personalizationApplied ? " 개인 맞춤 설정 요약이 반영됐습니다." : " 개인 맞춤 학습이 꺼져 있거나 기본 설정만 사용했습니다."}
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
              <Badge tone={result.aiFallbackUsed ? "lemon" : "mint"}>{result.aiFallbackUsed ? "fallback 표시" : "mock 생성"}</Badge>
              {result.recommendedDesignTemplateId ? <Badge tone="sky">추천 템플릿 {result.recommendedDesignTemplateId}</Badge> : null}
              {result.ai?.modelMetadata.retryCount ? <Badge tone="lemon">재시도 {result.ai.modelMetadata.retryCount}회</Badge> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">선택된 캡션</h2>
                <p className="mt-1 text-sm leading-6 text-muted [overflow-wrap:anywhere]">{selectedCaption}</p>
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
            description="SNS 본문에 바로 붙여넣을 수 있는 5개 버전입니다."
            footer={
              <FeedbackActions
                onDislike={() => handleDislike("caption", selectedCaption)}
                onEdit={() => startEdit(selectedCaptionIndex)}
                onLike={() => handleLike("caption", selectedCaption)}
                onRegenerate={handleRegenerate}
                onSaveStyle={() => handleSaveStyle("caption", selectedCaption)}
              />
            }
            items={result.captions}
            onCopyItem={(item) => handleCopied("caption", item)}
            onSelect={handleSelectCaption}
            onCopyAll={() => handleCopied("caption", result.captions.join("\n"))}
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
            title="캡션 5개"
          />
          <ResultSection
            description="필수 키워드와 브랜드 기본 해시태그를 반영했습니다."
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
            title="해시태그 20개"
          />
        </div>

        <div className="min-w-0 space-y-5">
          <ResultSection
            footer={
              <FeedbackActions
                onDislike={() => handleDislike("cta", result.ctas.join(" / "))}
                onLike={() => handleLike("cta", result.ctas.join(" / "))}
                onRegenerate={handleRegenerate}
                onSaveStyle={() => handleSaveStyle("cta", result.ctas.join(" / "))}
              />
            }
            items={result.ctas}
            onCopyAll={() => handleCopied("cta", result.ctas.join("\n"))}
            onCopyItem={(item) => handleCopied("cta", item)}
            title="CTA 문구 5개"
          />
          <ResultSection
            footer={
              <FeedbackActions
                onDislike={() => handleDislike("hook", result.hooks.join(" / "))}
                onLike={() => handleLike("hook", result.hooks.join(" / "))}
                onRegenerate={handleRegenerate}
                onSaveStyle={() => handleSaveStyle("hook", result.hooks.join(" / "))}
              />
            }
            items={result.hooks}
            onCopyAll={() => handleCopied("hook", result.hooks.join("\n"))}
            onCopyItem={(item) => handleCopied("hook", item)}
            title="릴스 첫 2초 후킹 문구 5개"
          />
          <ResultSection
            footer={
              <FeedbackActions
                onDislike={() => handleDislike("thumbnail", result.thumbnails.join(" / "))}
                onLike={() => handleLike("thumbnail", result.thumbnails.join(" / "))}
                onRegenerate={handleRegenerate}
                onSaveStyle={() => handleSaveStyle("thumbnail", result.thumbnails.join(" / "))}
              />
            }
            items={result.thumbnails}
            onCopyAll={() => handleCopied("thumbnail", result.thumbnails.join("\n"))}
            onCopyItem={(item) => handleCopied("thumbnail", item)}
            title="썸네일 문구 5개"
          />
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
            <p className="mt-1 break-keep text-sm leading-6 text-muted">JSON 파일은 mock 저장용으로만 내려받습니다.</p>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap sm:[&>*]:w-auto [&>*]:w-full">
              <Button onClick={handleDownload} type="button" variant="secondary">
                <Download size={17} aria-hidden="true" />
                JSON 저장
              </Button>
              <LinkButton href="/export" onClick={() => saveCurrentResult(result)} variant="soft">
                SNS 내보내기
              </LinkButton>
              <LinkButton href="/studio" onClick={() => saveCurrentResult(result)} variant="secondary">
                디자인 편집
              </LinkButton>
              <LinkButton href="/video-studio" onClick={() => saveCurrentResult(result)} variant="secondary">
                영상 만들기
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
