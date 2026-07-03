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
  Sparkles
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
import { linkScheduleContent } from "@/lib/calendarStorage";
import { drawDesignToCanvas, renderDesignToBlob } from "@/lib/canvasRenderer";
import { designOutputPresets, designTemplates, getDesignOutputPreset, recommendDesignTemplate } from "@/lib/designTemplates";
import {
  createDefaultDesignProject,
  getDesignPreferences,
  getLatestDesignForContent,
  makeDesignFileName,
  markDesignDownloaded,
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
  DesignProject,
  DesignTextAlignment,
  DesignTextPosition,
  GeneratedPackage
} from "@/types";

const textPositions: Array<{ value: DesignTextPosition; label: string }> = [
  { value: "top", label: "상단" },
  { value: "center", label: "중앙" },
  { value: "bottom", label: "하단" },
  { value: "left", label: "좌측" },
  { value: "right", label: "우측" }
];

const textAlignments: Array<{ value: DesignTextAlignment; label: string }> = [
  { value: "left", label: "왼쪽" },
  { value: "center", label: "가운데" },
  { value: "right", label: "오른쪽" }
];

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
  const [isRendering, setIsRendering] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
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
    const preferredOutput = current.scheduleId ? undefined : preferences.lastOutputPresetId;
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
        await drawDesignToCanvas(canvasRef.current as HTMLCanvasElement, project);
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
    setError("");
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

  async function handleDownload(downloadProject = project) {
    if (!downloadProject || isWorking) return;

    setIsWorking(true);
    try {
      const rendered = await renderDesignToBlob(downloadProject);
      if (!rendered.ok || !rendered.blob) {
        setError(rendered.error ?? "PNG를 생성하지 못했어요.");
        return;
      }

      const fileName = makeDesignFileName(downloadProject);
      const download = downloadBlob(rendered.blob, fileName);
      if (download.ok) {
        const saved = persistProject({ ...downloadProject, downloaded: true });
        if (saved) markDesignDownloaded(saved.id);
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
          <>
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
          </>
        }
        description={`${result.platform} · ${result.purpose} · Canvas 기반 PNG · 추가 크레딧 0`}
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
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
          <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          {error}
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
              <div className="rounded-lg border border-line bg-wash p-3 text-sm leading-6 text-muted">
                {imageAvailable ? "현재 브라우저 세션의 업로드 이미지를 합성합니다." : "업로드 이미지가 없거나 새로고침 후 세션 이미지가 사라져 PostKit 기본 이미지를 fallback으로 사용합니다."}
              </div>
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
                <span className="field-label">텍스트 위치</span>
                <select className="field" onChange={(event) => updateProject((current) => ({ ...current, textPosition: event.target.value as DesignTextPosition }))} value={project.textPosition}>
                  {textPositions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">텍스트 정렬</span>
                <select className="field" onChange={(event) => updateProject((current) => ({ ...current, textAlignment: event.target.value as DesignTextAlignment }))} value={project.textAlignment}>
                  {textAlignments.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="field-label">글자 크기</span>
                <input
                  className="w-full accent-coral"
                  max="1.28"
                  min="0.78"
                  onChange={(event) => updateProject((current) => ({ ...current, fontScale: clampSlider(Number(event.target.value), 0.78, 1.28) }))}
                  step="0.03"
                  type="range"
                  value={project.fontScale}
                />
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
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-3">
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
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2 min-[430px]:grid-cols-3">
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
