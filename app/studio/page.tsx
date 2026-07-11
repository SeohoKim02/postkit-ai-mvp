"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { linkCampaignContent } from "@/lib/campaignStorage";
import { getPurposeLabel } from "@/lib/constants";
import { linkScheduleContent } from "@/lib/calendarStorage";
import { drawDesignToCanvas, nextRecommendedPlacement, renderDesignToBlob } from "@/lib/canvasRenderer";
import type { DesignRenderInfo } from "@/lib/canvasRenderer";
import { designOutputPresets, designTemplates, getDesignOutputPreset, recommendDesignTemplate } from "@/lib/designTemplates";
import {
  createDefaultDesignProject,
  getDesignPreferences,
  getLatestDesignForContent,
  makeDesignFileName,
  markDesignDownloaded,
  resolveInitialOutputPresetId,
  saveDesignPreferences,
  upsertDesignProject
} from "@/lib/designStorage";
import { downloadBlob } from "@/lib/downloadUtils";
import {
  associateSessionImageWithContent,
  getSessionImage,
  getSupportedStudioImageTypes,
  storeSessionImage
} from "@/lib/sessionImageStore";
import {
  getBrandProfile,
  getCurrentResult,
  getPersonalizationProfile,
  saveCurrentResult,
  updateHistoryResult
} from "@/lib/storage";
import { getPostKitWatermarkStatus } from "@/lib/watermarkPolicy";
import type {
  CanvasImageSettings,
  CanvasTextElement,
  DesignContentCategory,
  DesignProject,
  DesignTextAlignment,
  DesignTextAnchorX,
  DesignTextSizePreset,
  DesignWatermarkPosition,
  GeneratedPackage
} from "@/types";

// 자동 배치가 못 미더울 때 사용자가 바로 고를 수 있는 네 모서리 위치.
const textPlacements: Array<{ value: string; label: string }> = [
  { value: "auto", label: "자동 (사진 분석)" },
  { value: "top-left", label: "좌측 상단" },
  { value: "top-right", label: "우측 상단" },
  { value: "bottom-left", label: "좌측 하단" },
  { value: "bottom-right", label: "우측 하단" }
];

const textAlignments: Array<{ value: DesignTextAlignment; label: string }> = [
  { value: "left", label: "왼쪽" },
  { value: "center", label: "가운데" },
  { value: "right", label: "오른쪽" }
];

const textSizePresets: Array<{ value: DesignTextSizePreset; label: string }> = [
  { value: "small", label: "작게" },
  { value: "medium", label: "보통" },
  { value: "large", label: "크게" }
];

const watermarkPositions: Array<{ value: DesignWatermarkPosition; label: string }> = [
  { value: "auto", label: "자동 (텍스트 반대쪽)" },
  { value: "bottom-left", label: "좌측 하단" },
  { value: "bottom-right", label: "우측 하단" }
];

// 카테고리별 배치·타이포 규칙: 패션은 절제형, 음식·카페는 조금 더 또렷한 제목을 허용한다.
const contentCategories: Array<{ value: DesignContentCategory; label: string }> = [
  { value: "auto", label: "자동 분류" },
  { value: "fashion", label: "패션" },
  { value: "food", label: "음식·카페" },
  { value: "general", label: "일반 제품" }
];

const placementLabels: Record<string, string> = {
  "top-left": "좌측 상단",
  "top-right": "우측 상단",
  "bottom-left": "좌측 하단",
  "bottom-right": "우측 하단"
};

const feedSet = ["instagram-feed-vertical", "instagram-story", "instagram-reels-thumbnail"];
const shortSet = ["tiktok", "youtube-shorts"];

const toggleOptions: Array<{
  key: "showTitle" | "showBrandName" | "showCta" | "showDisclosure";
  label: string;
}> = [
  { key: "showTitle", label: "제목 표시" },
  { key: "showBrandName", label: "브랜드명 표시" },
  { key: "showCta", label: "CTA 표시" },
  { key: "showDisclosure", label: "광고 표시 문구 표시" }
];

function clampSlider(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function applyOutputPreset(project: DesignProject, outputPresetId: string): DesignProject {
  const output = getDesignOutputPreset(outputPresetId);

  return {
    ...project,
    outputPresetId: output.id,
    platform: output.platform,
    width: output.width,
    height: output.height
  };
}

function mergeDesignIntoResult(result: GeneratedPackage, project: DesignProject) {
  const designs = [project, ...(result.designs ?? []).filter((item) => item.id !== project.id)].slice(0, 20);
  return { ...result, designs };
}

function formatSize(width: number, height: number) {
  return `${width.toLocaleString()} x ${height.toLocaleString()}`;
}

export default function StudioPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [result, setResult] = useState<GeneratedPackage | null>(null);
  const [project, setProject] = useState<DesignProject | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [placementNote, setPlacementNote] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [renderInfo, setRenderInfo] = useState<DesignRenderInfo | null>(null);
  // 다운로드 검사에서 위치 문제(피사체 겹침)가 원인일 때, 오류 안내 안에 바로 "다른 위치 추천" 버튼을 보여준다.
  const [errorSuggestsPlacement, setErrorSuggestsPlacement] = useState(false);
  // 다운로드 전 검사에서 경고가 나오면 true로 바꾸고, 사용자가 한 번 더 누르면 그대로 진행한다.
  const warningAckRef = useRef(false);
  const watermarkStatus = useMemo(() => getPostKitWatermarkStatus(), []);

  useEffect(() => {
    const current = getCurrentResult();
    const brand = getBrandProfile();
    const personalization = getPersonalizationProfile();
    const preferences = getDesignPreferences();

    if (!current) {
      setResult(null);
      setProject(null);
      return;
    }

    const saved = getLatestDesignForContent(current.id);
    // 이번 결과의 플랫폼이 우선. 이전 세션의 다른 플랫폼 프리셋(예: Story 결과에 Feed 4:5)이 남지 않게 한다.
    const preferredOutput = current.scheduleId ? undefined : resolveInitialOutputPresetId(current, preferences.lastOutputPresetId);
    const initial = saved ?? createDefaultDesignProject(current, brand, personalization, preferredOutput);
    const withPreferences = saved
      ? saved
      : {
          ...initial,
          primaryColor: preferences.primaryColor ?? initial.primaryColor,
          secondaryColor: preferences.secondaryColor ?? initial.secondaryColor
        };

    setResult(current);
    setProject(withPreferences);
  }, []);

  useEffect(() => {
    if (!project || !canvasRef.current) return;

    let active = true;
    const frame = window.requestAnimationFrame(async () => {
      try {
        setIsRendering(true);
        setError("");
        const info = await drawDesignToCanvas(canvasRef.current as HTMLCanvasElement, project);
        if (active) {
          setRenderInfo(info);
          setPlacementNote(
            info.photoMissing
              ? "제품 사진이 사라져 복구 안내 화면이 표시되고 있어요. 사진을 다시 업로드하면 사진 기반 디자인으로 돌아갑니다."
              : info.autoPlacement && info.placementUncertain
                ? "자동 배치가 피사체와 겹칠 수 있어요. 다른 위치 추천 버튼이나 텍스트 위치에서 모서리를 직접 선택해 보세요."
                : ""
          );
        }
      } catch (renderError) {
        if (active) {
          setError(renderError instanceof Error ? renderError.message : "미리보기를 그리지 못했어요.");
        }
      } finally {
        if (active) {
          setIsRendering(false);
        }
      }
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [project]);

  const recommendation = useMemo(() => {
    if (!result) return null;
    const aiTemplateId = result.recommendedDesignTemplateId ?? result.ai?.recommendedTemplateId;
    const aiTemplate = aiTemplateId ? designTemplates.find((template) => template.id === aiTemplateId) : undefined;
    if (aiTemplate) {
      return {
        template: aiTemplate,
        reason: "생성 결과의 추천 디자인 템플릿을 기본 제안으로 가져왔어요."
      };
    }
    return recommendDesignTemplate(result, getPersonalizationProfile());
  }, [result]);

  const imageAvailable = Boolean(project?.uploadedAssetId && getSessionImage(project.uploadedAssetId));
  const selectedOutput = project ? getDesignOutputPreset(project.outputPresetId) : null;
  const selectedTemplate = project ? designTemplates.find((template) => template.id === project.templateId) : null;

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function updateProject(updater: (current: DesignProject) => DesignProject) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...updater(current),
        lastUpdatedAt: new Date().toISOString()
      };
    });
    // 디자인이 바뀌면 이전 경고 확인 상태는 무효가 된다.
    warningAckRef.current = false;
    setError("");
    setErrorSuggestsPlacement(false);
  }

  function updateImageSettings<K extends keyof CanvasImageSettings>(key: K, value: CanvasImageSettings[K]) {
    updateProject((current) => ({
      ...current,
      imageSettings: {
        ...current.imageSettings,
        [key]: value
      }
    }));
  }

  function updateText<K extends keyof CanvasTextElement>(key: K, value: CanvasTextElement[K]) {
    updateProject((current) => ({
      ...current,
      editedText: {
        ...current.editedText,
        [key]: value
      }
    }));
  }

  function handleTemplateChange(templateId: string) {
    const template = designTemplates.find((item) => item.id === templateId) ?? designTemplates[0];
    updateProject((current) => ({
      ...current,
      templateId: template.id,
      textPosition: template.textPosition,
      textAlignment: template.textAlignment,
      textPlacementMode: "auto",
      fontScale: template.fontScale,
      showBrandName: template.showBrandName,
      showDisclosure: template.showDisclosure
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !project || !result) return;

    const stored = storeSessionImage(file, project.uploadedAssetId);
    if (!stored.ok || !stored.asset) {
      setError(stored.error ?? "이미지를 불러오지 못했어요.");
      return;
    }

    associateSessionImageWithContent(stored.asset.id, result.id);
    updateProject((current) => ({ ...current, uploadedAssetId: stored.asset?.id }));
    flash("업로드 이미지를 Studio 미리보기에 연결했어요.");
  }

  function persistProject(nextProject = project) {
    if (!nextProject || !result) return null;

    const saved = upsertDesignProject(nextProject);
    saveDesignPreferences({
      version: 1,
      lastTemplateId: saved.templateId,
      lastOutputPresetId: saved.outputPresetId,
      primaryColor: saved.primaryColor,
      secondaryColor: saved.secondaryColor,
      lastUpdatedAt: new Date().toISOString()
    });

    const nextResult = mergeDesignIntoResult(result, saved);
    setResult(nextResult);
    setProject(saved);
    saveCurrentResult(nextResult);
    updateHistoryResult(nextResult);
    linkScheduleContent(nextResult.scheduleId, nextResult.id);
    linkCampaignContent(nextResult.campaignId, nextResult.id, nextResult.platform);
    return saved;
  }

  function handleSave() {
    const saved = persistProject();
    if (saved) {
      flash("디자인 설정을 저장했어요. 이미지 파일 자체는 localStorage에 저장하지 않아요.");
    }
  }

  // "다른 위치 추천": 사진 분석이 매긴 코너 안전 순위에서 다음 후보로 이동한다.
  // 수동 위치 상태에서 누르면 자동 추천 후보로 전환된다는 것을 안내 문구로 알린다.
  function handleSuggestPlacement() {
    if (!project) return;
    const ranked = renderInfo?.rankedPlacements ?? [];
    const current = renderInfo ? renderInfo.placement : null;
    const next = nextRecommendedPlacement(ranked, current);
    if (!next) {
      flash("미리보기 분석이 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 추천할 만한 다른 자리가 없어 현재 위치가 유일한 후보인 경우: 더 나쁜 자리로 옮기는 대신 정직하게 알린다.
    if (current && current.position === next.position && current.anchorX === next.anchorX) {
      flash("지금 위치가 분석상 가장 안전한 자리예요. 문구를 줄이거나 확대를 낮추면 다른 위치도 추천할 수 있어요.");
      return;
    }

    const wasManual = project.textPlacementMode === "manual";
    updateProject((current) => ({
      ...current,
      textPlacementMode: "manual",
      textPosition: next.position,
      textAnchorX: next.anchorX,
      textAlignment: next.anchorX === "right" ? "right" : "left"
    }));

    const rankIndex = ranked.findIndex((item) => item.position === next.position && item.anchorX === next.anchorX) + 1;
    const label = placementLabels[`${next.position}-${next.anchorX}`] ?? "다음 후보";
    flash(
      wasManual
        ? `자동 추천 후보로 전환해 ${rankIndex}순위 위치(${label})로 이동했어요.`
        : `사진 분석 ${rankIndex}순위 위치(${label})로 이동했어요.`
    );
  }

  async function handleDownload(downloadProject = project) {
    if (!downloadProject || isWorking) return;

    setIsWorking(true);
    try {
      const rendered = await renderDesignToBlob(downloadProject);
      if (!rendered.ok || !rendered.blob) {
        setError(rendered.error ?? "PNG를 생성하지 못했어요.");
        return;
      }

      // 다운로드 전 품질 검사: 치명적 문제는 차단, 경고는 한 번 더 누르면 진행.
      const issues = rendered.info?.quality ?? [];
      const overlapIssue = issues.some((issue) => issue.code === "subject-overlap-high" || issue.code === "subject-overlap");
      const fatal = issues.filter((issue) => issue.severity === "error");
      if (fatal.length > 0) {
        setError(fatal.map((issue) => issue.message).join(" "));
        setErrorSuggestsPlacement(overlapIssue);
        return;
      }
      const warnings = issues.filter((issue) => issue.severity === "warning");
      if (warnings.length > 0 && !warningAckRef.current) {
        warningAckRef.current = true;
        setError(
          `아직 저장되지 않았어요. ${warnings.map((issue) => issue.message).join(" ")} 그대로 진행하려면 PNG 다운로드를 한 번 더 눌러주세요.`
        );
        setErrorSuggestsPlacement(overlapIssue);
        return;
      }
      warningAckRef.current = false;

      const fileName = makeDesignFileName(downloadProject);
      const download = downloadBlob(rendered.blob, fileName);
      if (download.ok) {
        const saved = persistProject({ ...downloadProject, downloaded: true });
        if (saved) markDesignDownloaded(saved.id);
        setError("");
        setErrorSuggestsPlacement(false);
        flash(`${fileName} 다운로드를 시작했어요.`);
      } else {
        setError(download.error ?? "PNG 다운로드를 시작하지 못했어요.");
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "PNG를 생성하지 못했어요.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleBatchDownload(outputIds: string[]) {
    if (!project || isWorking) return;

    setIsWorking(true);
    const downloaded: string[] = [];

    try {
      for (const outputId of outputIds) {
        const nextProject = applyOutputPreset(project, outputId);
        const rendered = await renderDesignToBlob(nextProject);
        if (!rendered.ok || !rendered.blob) {
          throw new Error(rendered.error ?? "PNG를 생성하지 못했어요.");
        }

        const fatal = (rendered.info?.quality ?? []).filter((issue) => issue.severity === "error");
        if (fatal.length > 0) {
          throw new Error(`${getDesignOutputPreset(outputId).name} 검사 실패: ${fatal.map((issue) => issue.message).join(" ")}`);
        }

        const fileName = makeDesignFileName(nextProject);
        const result = downloadBlob(rendered.blob, fileName);
        if (result.ok && result.fileName) {
          downloaded.push(result.fileName);
        }
      }

      flash(
        downloaded.length > 0
          ? "플랫폼 세트 다운로드를 시작했어요. 브라우저 설정에 따라 여러 파일 다운로드 허용이 필요할 수 있어요."
          : "다운로드된 파일이 없어요."
      );
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "일괄 PNG 생성을 완료하지 못했어요.");
    } finally {
      setIsWorking(false);
    }
  }

  function handleExport() {
    const saved = persistProject();
    if (saved && result) saveCurrentResult(mergeDesignIntoResult(result, saved));
    router.push("/export");
  }

  if (!result || !project || !selectedOutput) {
    return (
      <AppShell>
        <PageHeader
          action={
            <LinkButton href="/create">
              <Sparkles size={17} aria-hidden="true" />
              새 패키지 만들기
            </LinkButton>
          }
          description="생성된 업로드 패키지를 먼저 선택하면 Studio에서 실제 PNG 디자인을 만들 수 있어요."
          eyebrow="Studio"
          title="디자인할 콘텐츠가 없어요"
        />
        <Card className="mt-6">
          <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center">
            <Palette className="mx-auto text-coral" size={34} aria-hidden="true" />
            <p className="mt-3 font-black">Results 또는 History에서 디자인 편집을 열어주세요.</p>
            <p className="mt-2 text-sm leading-6 text-muted">업로드 이미지가 현재 브라우저 세션에 남아 있으면 실제 사진을 합성하고, 없으면 PostKit 기본 이미지로 안전하게 대체합니다.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <LinkButton href="/history" variant="secondary">
                History 보기
              </LinkButton>
              <LinkButton href="/create" variant="soft">
                새로 만들기
              </LinkButton>
            </div>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        action={
          // 모바일에서는 하단 고정 바(저장/PNG/내보내기)가 같은 액션을 제공하므로 헤더 버튼은 데스크톱에서만 보여준다.
          <div className="hidden flex-wrap justify-end gap-2 lg:flex">
            <Button disabled={isWorking} onClick={handleSave} type="button" variant="secondary">
              <Save size={17} aria-hidden="true" />
              디자인 저장
            </Button>
            <Button disabled={isWorking} onClick={() => handleDownload()} type="button">
              {isWorking ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
              PNG 다운로드
            </Button>
            <Button disabled={isWorking} onClick={handleExport} type="button" variant="soft">
              <Share2 size={17} aria-hidden="true" />
              내보내기 센터
            </Button>
          </div>
        }
        description={`${result.platform} · ${getPurposeLabel(result.purpose)} · Canvas 기반 PNG · 추가 크레딧 0`}
        eyebrow="PostKit Studio"
        title="SNS 게시물 이미지 만들기"
      />

      {feedback ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={18} aria-hidden="true" />
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            {error}
          </div>
          {errorSuggestsPlacement ? (
            <div className="mt-2 pl-6">
              <Button disabled={isWorking} onClick={handleSuggestPlacement} type="button" variant="secondary">
                <Wand2 size={15} aria-hidden="true" />
                다른 위치 추천받기
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-5 xl:order-1">
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint/15 text-mint">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black">권리와 개인정보 확인</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  이미 Create에서 업로드 권리를 확인했다면 그 상태를 이어받습니다. Studio는 현재 브라우저 내부 Canvas로만 이미지를 처리하고 외부 서버로 전송하지 않습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={result.input.rightsConfirmedAt ? "mint" : "lemon"}>
                    {result.input.rightsConfirmedAt ? "업로드 권리 확인됨" : "권리 확인 상태 없음"}
                  </Badge>
                  <Badge tone="sky">원본 Blob localStorage 저장 안 함</Badge>
                  <Badge tone="coral">디자인 추가 차감 0 크레딧</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">1. 출력 크기</h2>
            <p className="mt-1 text-sm leading-6 text-muted">미리보기는 축소해 보여주고, 다운로드는 원본 해상도 PNG로 생성합니다.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {designOutputPresets.map((output) => (
                <button
                  className={`rounded-lg border p-3 text-left transition ${
                    project.outputPresetId === output.id ? "border-coral bg-blush text-coral" : "border-line bg-wash hover:border-coral/50"
                  }`}
                  key={output.id}
                  onClick={() => updateProject((current) => applyOutputPreset(current, output.id))}
                  type="button"
                >
                  <span className="block text-sm font-black">{output.name}</span>
                  <span className="mt-1 block text-xs font-bold text-muted">
                    {output.aspectRatio} · {formatSize(output.width, output.height)}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">2. 이미지와 템플릿</h2>
            <div className="mt-4 grid gap-4">
              <label>
                <span className="field-label">업로드 이미지 선택</span>
                <input
                  accept={getSupportedStudioImageTypes().join(",")}
                  className="field"
                  onChange={handleImageChange}
                  type="file"
                />
              </label>
              {imageAvailable ? (
                <div className="rounded-lg border border-line bg-wash p-3 text-sm leading-6 text-muted">
                  현재 브라우저 세션의 업로드 이미지를 합성합니다.
                </div>
              ) : project.uploadedAssetId ? (
                <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
                  제품 사진이 새로고침 등으로 세션에서 사라졌어요. 같은 사진을 다시 업로드해주세요. 복구 전에는 PNG 저장이 차단됩니다.
                </div>
              ) : (
                <div className="rounded-lg border border-line bg-wash p-3 text-sm leading-6 text-muted">
                  업로드 이미지가 없어 PostKit 기본 배경을 사용합니다. 제품 사진을 업로드하면 사진 기반 디자인으로 만들어져요.
                </div>
              )}
              <div>
                <span className="field-label">템플릿 선택</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {designTemplates.map((template) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition ${
                        project.templateId === template.id ? "border-coral bg-blush text-coral" : "border-line bg-wash hover:border-coral/50"
                      }`}
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      type="button"
                    >
                      <span className="block text-sm font-black">{template.name}</span>
                      <span className="mt-1 block text-xs font-bold text-muted">{template.category}</span>
                    </button>
                  ))}
                </div>
                {recommendation ? (
                  <p className="mt-3 rounded-lg border border-mint/25 bg-aqua p-3 text-sm font-bold leading-6 text-emerald-700">
                    추천: {recommendation.template.name} · {recommendation.reason}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">3. 이미지 편집</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">확대</span>
                <input
                  className="w-full accent-coral"
                  max="1.8"
                  min="0.8"
                  onChange={(event) => updateImageSettings("scale", clampSlider(Number(event.target.value), 0.8, 1.8))}
                  step="0.05"
                  type="range"
                  value={project.imageSettings.scale}
                />
              </label>
              <label>
                <span className="field-label">밝기</span>
                <input
                  className="w-full accent-coral"
                  max="120"
                  min="55"
                  onChange={(event) => updateImageSettings("brightness", clampSlider(Number(event.target.value), 55, 120))}
                  step="1"
                  type="range"
                  value={project.imageSettings.brightness}
                />
              </label>
              <label>
                <span className="field-label">위치 X</span>
                <input
                  className="w-full accent-coral"
                  max="0.4"
                  min="-0.4"
                  onChange={(event) => updateImageSettings("offsetX", clampSlider(Number(event.target.value), -0.4, 0.4))}
                  step="0.02"
                  type="range"
                  value={project.imageSettings.offsetX}
                />
              </label>
              <label>
                <span className="field-label">위치 Y</span>
                <input
                  className="w-full accent-coral"
                  max="0.4"
                  min="-0.4"
                  onChange={(event) => updateImageSettings("offsetY", clampSlider(Number(event.target.value), -0.4, 0.4))}
                  step="0.02"
                  type="range"
                  value={project.imageSettings.offsetY}
                />
              </label>
              <label>
                <span className="field-label">오버레이 강도</span>
                <input
                  className="w-full accent-coral"
                  max="0.75"
                  min="0"
                  onChange={(event) => updateImageSettings("overlayOpacity", clampSlider(Number(event.target.value), 0, 0.75))}
                  step="0.03"
                  type="range"
                  value={project.imageSettings.overlayOpacity}
                />
              </label>
              <label>
                <span className="field-label">맞춤 방식</span>
                <select className="field" onChange={(event) => updateImageSettings("fit", event.target.value as CanvasImageSettings["fit"])} value={project.imageSettings.fit}>
                  <option value="cover">채우기</option>
                  <option value="contain">전체 보이기</option>
                </select>
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">4. 문구와 브랜드</h2>
            <div className="mt-4 grid gap-4">
              <label>
                <span className="field-label">제목 문구</span>
                <textarea className="field min-h-24 resize-none" onChange={(event) => updateText("title", event.target.value)} value={project.editedText.title} />
              </label>
              <label>
                <span className="field-label">보조 문구</span>
                <textarea className="field min-h-24 resize-none" onChange={(event) => updateText("subtitle", event.target.value)} value={project.editedText.subtitle} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="field-label">CTA</span>
                  <input className="field" onChange={(event) => updateText("cta", event.target.value)} value={project.editedText.cta} />
                </label>
                <label>
                  <span className="field-label">브랜드명</span>
                  <input className="field" onChange={(event) => updateText("brandName", event.target.value)} value={project.editedText.brandName} />
                </label>
                <label>
                  <span className="field-label">광고 표시 문구</span>
                  <input className="field" onChange={(event) => updateText("disclosure", event.target.value)} value={project.editedText.disclosure} />
                </label>
                <label>
                  <span className="field-label">하단 안내</span>
                  <input className="field" onChange={(event) => updateText("footer", event.target.value)} value={project.editedText.footer} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="field-label">대표색</span>
                  <input className="h-12 w-full rounded-lg border border-line bg-white p-1" onChange={(event) => updateProject((current) => ({ ...current, primaryColor: event.target.value }))} type="color" value={project.primaryColor} />
                </label>
                <label>
                  <span className="field-label">보조색</span>
                  <input className="h-12 w-full rounded-lg border border-line bg-white p-1" onChange={(event) => updateProject((current) => ({ ...current, secondaryColor: event.target.value }))} type="color" value={project.secondaryColor} />
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">5. 레이아웃 옵션</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">콘텐츠 카테고리</span>
                <select
                  className="field"
                  onChange={(event) =>
                    updateProject((current) => ({
                      ...current,
                      contentCategory: event.target.value as DesignContentCategory
                    }))
                  }
                  value={project.contentCategory ?? "auto"}
                >
                  {contentCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {(project.contentCategory ?? "auto") === "auto" && renderInfo ? (
                  <p className="mt-1 text-xs font-bold leading-5 text-muted">
                    현재 자동 분류: {contentCategories.find((item) => item.value === renderInfo.category)?.label ?? "일반 제품"}
                  </p>
                ) : null}
              </label>
              <div>
                <span className="field-label">다른 위치 추천</span>
                <Button className="w-full" disabled={isWorking} onClick={handleSuggestPlacement} type="button" variant="secondary">
                  <Wand2 size={16} aria-hidden="true" />
                  다른 위치 추천
                </Button>
                <p className="mt-1 text-xs font-bold leading-5 text-muted">사진 분석 순위에 따라 다음으로 안전한 모서리로 이동해요.</p>
              </div>
              <label>
                <span className="field-label">텍스트 위치</span>
                <select
                  className="field"
                  onChange={(event) =>
                    updateProject((current) => {
                      if (event.target.value === "auto") {
                        return { ...current, textPlacementMode: "auto" };
                      }
                      const [vertical, horizontal] = event.target.value.split("-");
                      return {
                        ...current,
                        textPlacementMode: "manual",
                        textPosition: vertical === "top" ? "top" : "bottom",
                        textAnchorX: (horizontal === "right" ? "right" : "left") as DesignTextAnchorX
                      };
                    })
                  }
                  value={
                    project.textPlacementMode === "manual"
                      ? `${project.textPosition === "top" ? "top" : "bottom"}-${project.textAnchorX === "right" ? "right" : "left"}`
                      : "auto"
                  }
                >
                  {textPlacements.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">텍스트 정렬</span>
                <select
                  className="field"
                  onChange={(event) =>
                    updateProject((current) => ({
                      ...current,
                      textAlignment: event.target.value as DesignTextAlignment,
                      textPlacementMode: "manual"
                    }))
                  }
                  value={project.textAlignment}
                >
                  {textAlignments.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="field-label">텍스트 크기</span>
                <div className="grid grid-cols-3 gap-2">
                  {textSizePresets.map((item) => (
                    <button
                      className={`min-h-11 rounded-lg border px-2 text-sm font-black transition ${
                        (project.textSizePreset ?? "medium") === item.value
                          ? "border-coral bg-blush text-coral"
                          : "border-line bg-wash hover:border-coral/50"
                      }`}
                      key={item.value}
                      onClick={() => updateProject((current) => ({ ...current, textSizePreset: item.value }))}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                <span className="field-label">워터마크 위치</span>
                <select
                  className="field"
                  onChange={(event) =>
                    updateProject((current) => ({
                      ...current,
                      watermarkPosition: event.target.value as DesignWatermarkPosition
                    }))
                  }
                  value={project.watermarkPosition ?? "auto"}
                >
                  {watermarkPositions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {toggleOptions.map(({ key, label }) => (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-wash px-3 text-sm font-bold" key={key}>
                  <input
                    checked={project[key]}
                    className="h-4 w-4 accent-coral"
                    onChange={(event) => updateProject((current) => ({ ...current, [key]: event.target.checked }))}
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">실시간 미리보기</h2>
                <p className="mt-1 break-keep text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                  {selectedOutput.name} · {formatSize(project.width, project.height)}
                  {selectedTemplate ? ` · ${selectedTemplate.name}` : ""}
                </p>
              </div>
              <Badge tone={isRendering ? "lemon" : "mint"}>{isRendering ? "렌더링 중" : "미리보기 준비"}</Badge>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-white p-3">
              <div className="mx-auto flex max-h-[72vh] max-w-full items-center justify-center overflow-hidden rounded-lg bg-wash">
                <canvas
                  aria-label="SNS 디자인 미리보기"
                  className="block h-auto max-h-[72vh] w-full rounded-lg"
                  ref={canvasRef}
                  style={{ aspectRatio: `${project.width} / ${project.height}` }}
                />
              </div>
            </div>
            {/* 모바일에서는 하단 고정 액션 바가 같은 버튼을 제공하므로, 이 행은 고정 바가 사라지는 lg 이상에서만 보여 시선 흐름을 단순하게 유지한다. */}
            <div className="mt-4 hidden min-w-0 grid-cols-3 gap-2 lg:grid">
              <Button disabled={isWorking} onClick={handleSave} type="button" variant="secondary">
                <Save size={16} aria-hidden="true" />
                저장
              </Button>
              <Button disabled={isWorking} onClick={() => handleDownload()} type="button">
                <Download size={16} aria-hidden="true" />
                PNG
              </Button>
              <Button disabled={isWorking} onClick={handleExport} type="button" variant="soft">
                <Share2 size={16} aria-hidden="true" />
                내보내기
              </Button>
            </div>
            {placementNote ? (
              <p className="mt-3 rounded-lg border border-lemon/40 bg-lemon/10 px-3 py-2 text-xs font-bold leading-5 text-amber-700">{placementNote}</p>
            ) : null}
            <p className="mt-3 rounded-lg bg-wash px-3 py-2 text-xs font-bold leading-5 text-muted">{watermarkStatus.message}</p>
          </Card>

          <Card>
            <h2 className="break-keep text-lg font-black">플랫폼 세트 생성</h2>
            <p className="mt-1 break-keep text-sm leading-6 text-muted">하나의 디자인 설정을 기준으로 각 비율에 맞춰 다시 계산해 PNG를 만듭니다.</p>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              <Button disabled={isWorking} onClick={() => handleBatchDownload(feedSet)} type="button" variant="secondary">
                <RefreshCw size={16} aria-hidden="true" />
                피드·스토리·릴스
              </Button>
              <Button disabled={isWorking} onClick={() => handleBatchDownload(shortSet)} type="button" variant="secondary">
                <RefreshCw size={16} aria-hidden="true" />
                TikTok·Shorts
              </Button>
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-muted">브라우저 설정에 따라 여러 파일 다운로드 허용이 필요할 수 있어요.</p>
          </Card>

          <Card>
            <h2 className="text-lg font-black">디자인 저장 방식</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p className="flex gap-2">
                <ImageIcon className="mt-0.5 shrink-0 text-coral" size={17} aria-hidden="true" />
                업로드 원본 이미지는 서버로 보내지 않고, 현재 브라우저 세션의 Object URL로만 연결합니다.
              </p>
              <p className="flex gap-2">
                <Palette className="mt-0.5 shrink-0 text-coral" size={17} aria-hidden="true" />
                History에는 템플릿, 문구, 색상, 위치 같은 디자인 설정값만 저장합니다.
              </p>
              <p className="flex gap-2">
                <Download className="mt-0.5 shrink-0 text-coral" size={17} aria-hidden="true" />
                실제 PNG 파일은 다운로드 또는 공유 준비 시 Canvas에서 새로 생성합니다.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="mobile-fixed-action fixed inset-x-0 bottom-[78px] z-10 border-t border-line bg-white/95 p-3 shadow-lift backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <Button className="px-2 text-xs" disabled={isWorking} onClick={handleSave} type="button" variant="secondary">
            <Save size={15} aria-hidden="true" />
            저장
          </Button>
          <Button className="px-2 text-xs" disabled={isWorking} onClick={() => handleDownload()} type="button">
            <Download size={15} aria-hidden="true" />
            PNG
          </Button>
          <Button className="px-2 text-xs" disabled={isWorking} onClick={handleExport} type="button" variant="soft">
            <Share2 size={15} aria-hidden="true" />
            내보내기
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
