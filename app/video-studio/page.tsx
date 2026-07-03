"use client";

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateScheduleAfterExport } from "@/lib/calendarStorage";
import { downloadBlob, downloadTextFile } from "@/lib/downloadUtils";
import { addExportHistoryEntry } from "@/lib/exportStorage";
import { getSelectedCaption } from "@/lib/exportUtils";
import {
  associateSessionImageWithContent,
  getSessionImage,
  getSupportedStudioImageTypes,
  releaseSessionImage,
  storeSessionImage
} from "@/lib/sessionImageStore";
import { getBrandProfile, getCurrentResult, saveCurrentResult, updateHistoryResult } from "@/lib/storage";
import { openPlatformUrl, shareUploadPackage } from "@/lib/shareUtils";
import { drawVideoFrameToCanvas, renderVideoFrameToBlob, renderVideoToWebM } from "@/lib/video/videoRenderer";
import { getVideoPresetByPlatform, videoDurationOptions, videoPresets } from "@/lib/video/videoPresets";
import { getVideoTemplate, videoTemplates } from "@/lib/video/videoTemplates";
import { getPostKitWatermarkStatus } from "@/lib/watermarkPolicy";
import {
  createDefaultVideoProject,
  getLatestVideoProjectForContent,
  getVideoPreferences,
  mergeVideoProjectIntoResult,
  markVideoProjectDownloaded,
  markVideoProjectExported,
  projectToRenderSettings,
  saveVideoPreferences,
  upsertVideoProject
} from "@/lib/video/videoStorage";
import { createVideoObjectUrl, getVideoExportAsset, storeVideoExportAsset } from "@/lib/video/videoSessionStore";
import {
  buildVideoFramePlan,
  composeVideoTextPack,
  composeVideoUploadText,
  getVideoSupportStatus,
  makeVideoFileName,
  makeVideoFrameFileName
} from "@/lib/video/videoUtils";
import type {
  GeneratedPackage,
  VideoImageItem,
  VideoPlatform,
  VideoProject,
  VideoTextPosition,
  VideoTransitionType
} from "@/types";

const transitionOptions: Array<{ value: VideoTransitionType; label: string }> = [
  { value: "none", label: "없음" },
  { value: "fade", label: "페이드" },
  { value: "slide-up", label: "슬라이드 업" },
  { value: "slide-side", label: "슬라이드 좌우" },
  { value: "slow-zoom", label: "천천히 확대" },
  { value: "zoom-in-out", label: "줌 인/아웃" }
];

const textPositions: Array<{ value: VideoTextPosition; label: string }> = [
  { value: "top", label: "상단" },
  { value: "center", label: "중앙" },
  { value: "bottom", label: "하단" }
];

const toggleOptions: Array<{ key: "showTitle" | "showCTA" | "showBrandName" | "showDisclosure"; label: string }> = [
  { key: "showTitle", label: "제목 표시" },
  { key: "showCTA", label: "CTA 표시" },
  { key: "showBrandName", label: "브랜드명 표시" },
  { key: "showDisclosure", label: "광고·협찬 표시" }
];

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function supportTone(supported: boolean) {
  return supported ? "mint" : "lemon";
}

function mergeProject(result: GeneratedPackage, project: VideoProject) {
  return mergeVideoProjectIntoResult(result, project);
}

export default function VideoStudioPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewTimeRef = useRef(0);
  const [result, setResult] = useState<GeneratedPackage | null>(null);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const watermarkStatus = useMemo(() => getPostKitWatermarkStatus(), []);
  const [support, setSupport] = useState(() => ({
    canvas: false,
    captureStream: false,
    mediaRecorder: false,
    webm: false,
    blob: false,
    supported: false,
    message: "브라우저 확인 전"
  }));
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    const current = getCurrentResult();
    const brand = getBrandProfile();
    const preferences = getVideoPreferences();

    if (!current) {
      setResult(null);
      setProject(null);
      setSupport(getVideoSupportStatus());
      return;
    }

    const saved = getLatestVideoProjectForContent(current.id);
    const initial = saved ?? createDefaultVideoProject(current, brand, preferences);
    setResult(current);
    setProject(initial);
    setSupport(getVideoSupportStatus());
  }, []);

  const imageUrls = useMemo(() => {
    if (!project) return [];
    return project.imageItems
      .map((item) => getSessionImage(item.assetId)?.objectUrl)
      .filter(Boolean) as string[];
  }, [project]);

  const imageKey = imageUrls.join("|");
  const selectedTemplate = project ? getVideoTemplate(project.templateId) : videoTemplates[0];
  const selectedPreset = project ? getVideoPresetByPlatform(project.platform) : videoPresets[0];
  const generatedAsset = project ? getVideoExportAsset(project.id) : undefined;
  const uploadText = useMemo(() => (project ? composeVideoUploadText(result, projectToRenderSettings(project)) : ""), [project, result]);
  const settings = useMemo(() => (project ? projectToRenderSettings(project) : null), [project]);

  useEffect(() => {
    if (!project || !generatedAsset?.blob) {
      setVideoUrl("");
      return;
    }

    const url = createVideoObjectUrl(project.id);
    setVideoUrl(url);
  }, [generatedAsset?.createdAt, generatedAsset?.videoProjectId, project]);

  useEffect(() => {
    if (!project || !settings || !canvasRef.current) return;

    let active = true;
    let raf = 0;
    let lastStateUpdate = 0;
    const previewWidth = 360;
    const previewHeight = 640;
    const startedAt = performance.now() - previewTimeRef.current * 1000;

    async function tick(timestamp: number) {
      if (!active || !canvasRef.current || !settings) return;

      const nextTime = previewPlaying
        ? ((timestamp - startedAt) / 1000) % settings.durationSeconds
        : previewTimeRef.current;
      previewTimeRef.current = nextTime;

      try {
        await drawVideoFrameToCanvas(canvasRef.current, settings, imageUrls, nextTime, {
          width: previewWidth,
          height: previewHeight
        });
      } catch (renderError) {
        if (active) {
          setError(renderError instanceof Error ? renderError.message : "미리보기를 그리지 못했어요.");
        }
      }

      if (previewPlaying && timestamp - lastStateUpdate > 220) {
        lastStateUpdate = timestamp;
        setPreviewTime(nextTime);
      }

      if (previewPlaying) {
        raf = window.requestAnimationFrame(tick);
      }
    }

    raf = window.requestAnimationFrame(tick);

    return () => {
      active = false;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [imageKey, previewPlaying, previewRefreshKey, project, settings]);

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2400);
  }

  function updateProject(updater: (current: VideoProject) => VideoProject) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...updater(current),
        lastUpdatedAt: new Date().toISOString()
      };
    });
    setError("");
    setPreviewRefreshKey((current) => current + 1);
  }

  function updateText<K extends keyof VideoProject["text"]>(key: K, value: VideoProject["text"][K]) {
    updateProject((current) => ({
      ...current,
      text: {
        ...current.text,
        [key]: value
      }
    }));
  }

  function updateToggle(key: "showTitle" | "showCTA" | "showBrandName" | "showDisclosure", checked: boolean) {
    updateProject((current) => ({
      ...current,
      [key]: checked
    }));
  }

  function handleTemplateChange(templateId: string) {
    const template = getVideoTemplate(templateId);
    updateProject((current) => ({
      ...current,
      templateId: template.id,
      durationSeconds: template.durationSeconds,
      frameRate: template.frameRate,
      transitionType: template.transitionType,
      textPosition: template.textPosition,
      overlayStyle: template.overlayStyle,
      imageMotion: template.imageMotion,
      titleMaxLines: template.titleMaxLines,
      showCTA: template.showCTA,
      showBrandName: template.showBrandName,
      showDisclosure: template.showDisclosure
    }));
  }

  function handlePlatformChange(platform: VideoPlatform) {
    const preset = getVideoPresetByPlatform(platform);
    updateProject((current) => ({
      ...current,
      platform,
      width: preset.width,
      height: preset.height
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (!project || !result) return;

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextItems: VideoImageItem[] = [];
    const errors: string[] = [];

    files.slice(0, 10).forEach((file) => {
      const stored = storeSessionImage(file);
      if (!stored.ok || !stored.asset) {
        errors.push(stored.error ?? `${file.name} 파일을 사용할 수 없어요.`);
        return;
      }

      associateSessionImageWithContent(stored.asset.id, result.id);
      nextItems.push({
        assetId: stored.asset.id,
        name: stored.asset.name,
        type: stored.asset.type,
        size: stored.asset.size
      });
    });

    if (nextItems.length > 0) {
      updateProject((current) => ({
        ...current,
        imageItems: [...current.imageItems, ...nextItems].slice(0, 12)
      }));
      flash(`${nextItems.length}장 사진을 영상 프로젝트에 추가했어요.`);
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
    }

    event.target.value = "";
  }

  function removeImage(item: VideoImageItem) {
    releaseSessionImage(item.assetId);
    updateProject((current) => ({
      ...current,
      imageItems: current.imageItems.filter((image) => image.assetId !== item.assetId)
    }));
  }

  function persistProject(nextProject = project) {
    if (!nextProject || !result) return null;

    const saved = upsertVideoProject(nextProject);
    saveVideoPreferences({
      version: 1,
      lastTemplateId: saved.templateId,
      lastPlatform: saved.platform,
      lastDurationSeconds: saved.durationSeconds,
      lastTransitionType: saved.transitionType,
      lastTextPosition: saved.textPosition,
      overlayOpacity: saved.overlayOpacity,
      lastUpdatedAt: new Date().toISOString()
    });

    const nextResult = mergeProject(result, saved);
    setProject(saved);
    setResult(nextResult);
    saveCurrentResult(nextResult);
    updateHistoryResult(nextResult);
    return saved;
  }

  function recordVideoHistory(
    savedProject: VideoProject,
    entry: {
      exportType: "video_render" | "single_download" | "full_download" | "web_share" | "platform_open" | "text_copy";
      downloadedFiles: string[];
      copiedFields: string[];
      shared: boolean;
      openedPlatform: boolean;
      status: "success" | "failed" | "fallback";
      errorMessage?: string;
      downloaded?: boolean;
      exported?: boolean;
      outputFormat?: "webm" | "png_frames" | "text_pack";
    }
  ) {
    const exportEntry = addExportHistoryEntry({
      contentId: savedProject.contentId,
      platform: savedProject.platform,
      exportType: entry.exportType,
      downloadedFiles: entry.downloadedFiles,
      copiedFields: entry.copiedFields,
      shared: entry.shared,
      openedPlatform: entry.openedPlatform,
      status: entry.status,
      errorMessage: entry.errorMessage,
      videoProjectId: savedProject.id,
      templateId: savedProject.templateId,
      durationSeconds: savedProject.durationSeconds,
      outputFormat: entry.outputFormat ?? "webm",
      downloaded: entry.downloaded,
      exported: entry.exported,
      campaignId: savedProject.campaignId,
      scheduleId: savedProject.scheduleId
    });
    updateScheduleAfterExport(savedProject.scheduleId, exportEntry.exportId);
    return exportEntry;
  }

  function handleSave() {
    const saved = persistProject();
    if (saved) {
      flash("영상 설정을 저장했어요. 원본 사진과 영상 Blob은 localStorage에 저장하지 않습니다.");
    }
  }

  async function handleGenerate() {
    if (!project || !settings || isGenerating) return;

    if (imageUrls.length === 0) {
      setError("사진을 1장 이상 추가해야 영상 미리보기와 다운로드를 만들 수 있어요.");
      return;
    }

    if (!support.supported) {
      setError("현재 브라우저에서는 WebM 생성이 미지원입니다. PNG 이미지 세트와 문구 패키지 다운로드를 사용해 주세요.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    const generatedAt = new Date().toISOString();
    const saved = persistProject({
      ...project,
      generatedAt,
      downloaded: false,
      exported: false
    });

    if (!saved) {
      setIsGenerating(false);
      return;
    }

    const renderResult = await renderVideoToWebM({
      settings: projectToRenderSettings(saved),
      imageUrls,
      signal: controller.signal,
      onProgress: setProgress
    });

    if (!renderResult.ok || !renderResult.blob) {
      setError(renderResult.error ?? "WebM 영상을 생성하지 못했어요. fallback 다운로드를 사용해 주세요.");
      recordVideoHistory(saved, {
        exportType: "video_render",
        downloadedFiles: [],
        copiedFields: [],
        shared: false,
        openedPlatform: false,
        status: "failed",
        errorMessage: renderResult.error,
        outputFormat: "webm"
      });
      setIsGenerating(false);
      abortRef.current = null;
      return;
    }

    const fileName = makeVideoFileName(saved);
    storeVideoExportAsset({
      videoProjectId: saved.id,
      contentId: saved.contentId,
      fileName,
      width: saved.width,
      height: saved.height,
      durationSeconds: saved.durationSeconds,
      mimeType: "video/webm",
      blob: renderResult.blob,
      createdAt: generatedAt
    });
    recordVideoHistory(saved, {
      exportType: "video_render",
      downloadedFiles: [],
      copiedFields: [],
      shared: false,
      openedPlatform: false,
      status: "success",
      outputFormat: "webm"
    });
    setVideoUrl(createVideoObjectUrl(saved.id));
    setProgress(100);
    setIsGenerating(false);
    abortRef.current = null;
    flash("WebM 영상 생성이 완료됐어요.");
  }

  function handleCancelGenerate() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setProgress(0);
  }

  function handleDownloadVideo() {
    if (!project) return null;
    const asset = getVideoExportAsset(project.id);
    if (!asset?.blob) {
      setError("먼저 WebM 영상을 생성해 주세요. 미지원 브라우저에서는 fallback 다운로드를 사용하세요.");
      return null;
    }

    const download = downloadBlob(asset.blob, asset.fileName);
    if (download.ok) {
      const updated = markVideoProjectDownloaded(project.id);
      if (updated) {
        const nextResult = result ? mergeProject(result, updated) : result;
        setProject(updated);
        if (nextResult) {
          setResult(nextResult);
          saveCurrentResult(nextResult);
          updateHistoryResult(nextResult);
        }
      }
      recordVideoHistory(project, {
        exportType: "single_download",
        downloadedFiles: [asset.fileName],
        copiedFields: [],
        shared: false,
        openedPlatform: false,
        status: "success",
        downloaded: true,
        outputFormat: "webm"
      });
      flash("WebM 다운로드를 시작했어요.");
    } else {
      setError(download.error ?? "다운로드를 시작하지 못했어요.");
    }

    return download;
  }

  async function handleFallbackDownload() {
    if (!project || !settings) return;

    setError("");
    const urls = imageUrls;
    const plan = buildVideoFramePlan(project.durationSeconds, Math.max(1, urls.length));
    const downloaded: string[] = [];

    for (const frame of plan) {
      const time = frame.startSeconds + (frame.endSeconds - frame.startSeconds) / 2;
      const blob = await renderVideoFrameToBlob(settings, urls, time);
      if (!blob) continue;
      const fileName = makeVideoFrameFileName(project, frame.index);
      const download = downloadBlob(blob, fileName);
      if (download.ok) downloaded.push(fileName);
    }

    const textFile = makeVideoFileName(project, "txt");
    const textDownload = downloadTextFile(textFile, composeVideoTextPack(result, settings));
    if (textDownload.ok) downloaded.push(textFile);

    recordVideoHistory(project, {
      exportType: "full_download",
      downloadedFiles: downloaded,
      copiedFields: ["영상 문구 패키지"],
      shared: false,
      openedPlatform: false,
      status: downloaded.length > 0 ? "fallback" : "failed",
      outputFormat: "png_frames",
      downloaded: downloaded.length > 0
    });
    flash("PNG 프레임과 문구 패키지 다운로드를 시작했어요.");
  }

  async function handleShare() {
    if (!project) return;

    const asset = getVideoExportAsset(project.id);
    if (!asset?.blob) {
      await navigator.clipboard?.writeText(uploadText);
      openPlatformUrl(selectedPreset.openUrl);
      recordVideoHistory(project, {
        exportType: "web_share",
        downloadedFiles: [],
        copiedFields: ["전체 업로드 문구"],
        shared: false,
        openedPlatform: true,
        status: "fallback",
        outputFormat: "text_pack"
      });
      flash("문구를 복사하고 플랫폼을 열었어요. WebM 생성 후 파일 공유도 사용할 수 있습니다.");
      return;
    }

    const file = typeof File !== "undefined" ? new File([asset.blob], asset.fileName, { type: "video/webm" }) : null;
    const share = await shareUploadPackage({
      title: result?.title ?? "PostKit video",
      text: uploadText,
      url: selectedPreset.openUrl,
      files: file ? [file] : []
    });

    if (share.ok) {
      recordVideoHistory(project, {
        exportType: "web_share",
        downloadedFiles: [asset.fileName],
        copiedFields: ["전체 업로드 문구"],
        shared: true,
        openedPlatform: false,
        status: "success",
        outputFormat: "webm",
        exported: true
      });
      markVideoProjectExported(project.id);
      flash(share.message);
      return;
    }

    await navigator.clipboard?.writeText(uploadText);
    openPlatformUrl(selectedPreset.openUrl);
    recordVideoHistory(project, {
      exportType: "web_share",
      downloadedFiles: [],
      copiedFields: ["전체 업로드 문구"],
      shared: false,
      openedPlatform: true,
      status: "fallback",
      errorMessage: share.error,
      outputFormat: "webm"
    });
    flash("공유창 대신 문구 복사와 플랫폼 열기로 이어갔어요.");
  }

  function handleExportCenter() {
    if (!project || !result) return;

    const saved = persistProject({ ...project, exported: true });
    if (saved) {
      markVideoProjectExported(saved.id);
      recordVideoHistory(saved, {
        exportType: "platform_open",
        downloadedFiles: getVideoExportAsset(saved.id)?.fileName ? [getVideoExportAsset(saved.id)?.fileName ?? ""] : [],
        copiedFields: [],
        shared: false,
        openedPlatform: false,
        status: "success",
        exported: true,
        outputFormat: "webm"
      });
      const nextResult = mergeProject(result, saved);
      saveCurrentResult(nextResult);
      router.push("/export");
    }
  }

  async function copyUploadText() {
    if (!project || !uploadText) return;
    await navigator.clipboard.writeText(uploadText);
      recordVideoHistory(project, {
      exportType: "text_copy",
      downloadedFiles: [],
      copiedFields: ["전체 업로드 문구"],
      shared: false,
      openedPlatform: false,
      status: "success",
      outputFormat: "text_pack"
    });
    flash("영상 업로드 문구를 복사했어요.");
  }

  function seekStart() {
    previewTimeRef.current = 0;
    setPreviewTime(0);
    setPreviewRefreshKey((current) => current + 1);
  }

  if (!result || !project || !settings) {
    return (
      <AppShell>
        <PageHeader
          action={
            <LinkButton href="/history" variant="secondary">
              <Film size={17} aria-hidden="true" />
              History 보기
            </LinkButton>
          }
          description="생성된 업로드 패키지를 먼저 선택하면 업로드 사진과 문구로 짧은 세로 영상을 만들 수 있어요."
          eyebrow="Video Studio"
          title="영상으로 만들 콘텐츠가 없어요"
        />
        <Card className="mt-6">
          <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center">
            <Video className="mx-auto text-coral" size={34} aria-hidden="true" />
            <p className="mt-3 font-black">Results 또는 History에서 영상 만들기를 열어주세요.</p>
            <p className="mt-2 text-sm leading-6 text-muted">Video Studio는 외부 영상 생성 API 없이 브라우저 Canvas와 MediaRecorder만 사용합니다.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <LinkButton href="/create">새 패키지 만들기</LinkButton>
              <LinkButton href="/history" variant="soft">History 보기</LinkButton>
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
            <Button disabled={isGenerating} onClick={handleSave} type="button" variant="secondary">
              <Save size={17} aria-hidden="true" />
              저장
            </Button>
            <Button disabled={isGenerating} onClick={support.supported ? handleGenerate : handleFallbackDownload} type="button">
              {isGenerating ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Video size={17} aria-hidden="true" />}
              {support.supported ? "영상 생성" : "Fallback 저장"}
            </Button>
            <Button disabled={isGenerating || !generatedAsset?.blob} onClick={handleDownloadVideo} type="button" variant="secondary">
              <Download size={17} aria-hidden="true" />
              WebM 다운로드
            </Button>
            <Button disabled={isGenerating} onClick={handleExportCenter} type="button" variant="soft">
              <Share2 size={17} aria-hidden="true" />
              Export Center
            </Button>
          </>
        }
        description={`${project.platform} · ${project.durationSeconds}초 · ${selectedTemplate.name} · 영상 편집 추가 차감 0`}
        eyebrow="Video Studio"
        title="릴스·쇼츠용 짧은 영상 만들기"
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

      <div className="mt-5 grid gap-3 rounded-lg border border-coral/20 bg-blush p-4 lg:grid-cols-4">
        <div>
          <p className="text-sm font-black text-coral">크레딧 정책</p>
          <p className="mt-1 text-sm leading-6 text-muted">이미 생성한 콘텐츠로 영상 템플릿을 만드는 작업에는 크레딧이 추가로 사용되지 않아요.</p>
        </div>
        <div>
          <p className="text-sm font-black text-coral">출력 포맷</p>
          <p className="mt-1 text-sm leading-6 text-muted">현재 브라우저 기반 영상 생성은 WebM 파일로 저장돼요. MP4 변환은 향후 서버 영상 처리 기능에서 지원할 예정입니다.</p>
        </div>
        <div>
          <p className="text-sm font-black text-coral">브라우저 지원</p>
          <p className="mt-1 text-sm leading-6 text-muted">{support.message}</p>
        </div>
        <div>
          <p className="text-sm font-black text-coral">워터마크</p>
          <p className="mt-1 text-sm leading-6 text-muted">{watermarkStatus.message}</p>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 space-y-5 xl:order-1">
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint/15 text-mint">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black">권리와 개인정보 확인</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  업로드 이미지의 사용 권리, 인물 동의, 민감정보 노출, 광고·협찬 표시 필요 여부를 확인하세요. 사진과 영상은 외부 서버로 전송하지 않습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={result.input.rightsConfirmedAt ? "mint" : "lemon"}>
                    {result.input.rightsConfirmedAt ? "Create 권리 확인 이어받음" : "권리 확인 필요"}
                  </Badge>
                  <Badge tone="sky">Blob localStorage 저장 안 함</Badge>
                  <Badge tone="coral">추가 차감 0 크레딧</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">1. 플랫폼과 사진</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {videoPresets.map((preset) => (
                <button
                  className={`rounded-lg border p-3 text-left transition ${
                    project.platform === preset.platform ? "border-coral bg-blush text-coral" : "border-line bg-wash hover:border-coral/50"
                  }`}
                  key={preset.id}
                  onClick={() => handlePlatformChange(preset.platform)}
                  type="button"
                >
                  <span className="block text-sm font-black">{preset.label}</span>
                  <span className="mt-1 block text-xs font-bold text-muted">{preset.width}×{preset.height} · {preset.aspectRatio}</span>
                </button>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="field-label">사진 여러 장 선택</span>
              <input
                accept={getSupportedStudioImageTypes().join(",")}
                className="field"
                multiple
                onChange={handleImageChange}
                type="file"
              />
            </label>
            <div className="mt-4 space-y-2">
              {project.imageItems.length > 0 ? project.imageItems.map((item, index) => (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-wash p-3" key={item.assetId}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{index + 1}. {item.name}</p>
                    <p className="text-xs font-bold text-muted">{formatSize(item.size)} · {getSessionImage(item.assetId) ? "세션 연결됨" : "세션 이미지 없음"}</p>
                  </div>
                  <Button className="min-h-9 px-3 py-1.5" onClick={() => removeImage(item)} type="button" variant="ghost">
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-line bg-wash p-4 text-sm font-bold text-muted">
                  영상 생성을 위해 사진을 1장 이상 추가하세요.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">2. 템플릿과 길이</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {videoTemplates.map((template) => (
                <button
                  className={`rounded-lg border p-3 text-left transition ${
                    project.templateId === template.id ? "border-coral bg-blush text-coral" : "border-line bg-wash hover:border-coral/50"
                  }`}
                  key={template.id}
                  onClick={() => handleTemplateChange(template.id)}
                  type="button"
                >
                  <span className="block text-sm font-black">{template.name}</span>
                  <span className="mt-1 block text-xs font-bold text-muted">{template.category} · {template.durationSeconds}초</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <span className="field-label">영상 길이</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {videoDurationOptions.map((duration) => (
                    <button
                      className={`min-h-11 rounded-lg border text-sm font-black ${
                        project.durationSeconds === duration ? "border-coral bg-blush text-coral" : "border-line bg-wash text-muted"
                      }`}
                      key={duration}
                      onClick={() => updateProject((current) => ({ ...current, durationSeconds: duration }))}
                      type="button"
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>
              <label>
                <span className="field-label">전환 효과</span>
                <select className="field" onChange={(event) => updateProject((current) => ({ ...current, transitionType: event.target.value as VideoTransitionType }))} value={project.transitionType}>
                  {transitionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">텍스트 위치</span>
                <select className="field" onChange={(event) => updateProject((current) => ({ ...current, textPosition: event.target.value as VideoTextPosition }))} value={project.textPosition}>
                  {textPositions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">배경 오버레이 강도</span>
                <input
                  className="w-full accent-coral"
                  max="0.75"
                  min="0"
                  onChange={(event) => updateProject((current) => ({ ...current, overlayOpacity: Number(event.target.value) }))}
                  step="0.03"
                  type="range"
                  value={project.overlayOpacity}
                />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">3. 문구와 표시 옵션</h2>
            <div className="mt-4 grid gap-4">
              <label><span className="field-label">제목</span><textarea className="field min-h-20 resize-none" onChange={(event) => updateText("title", event.target.value)} value={project.text.title} /></label>
              <label><span className="field-label">후킹 문구</span><textarea className="field min-h-20 resize-none" onChange={(event) => updateText("hook", event.target.value)} value={project.text.hook} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="field-label">제품명</span><input className="field" onChange={(event) => updateText("productName", event.target.value)} value={project.text.productName} /></label>
                <label><span className="field-label">CTA</span><input className="field" onChange={(event) => updateText("cta", event.target.value)} value={project.text.cta} /></label>
                <label><span className="field-label">브랜드명</span><input className="field" onChange={(event) => updateText("brandName", event.target.value)} value={project.text.brandName} /></label>
                <label><span className="field-label">할인코드</span><input className="field" onChange={(event) => updateText("discountCode", event.target.value)} value={project.text.discountCode} /></label>
                <label className="sm:col-span-2"><span className="field-label">광고·협찬 표시 문구</span><input className="field" onChange={(event) => updateText("disclosure", event.target.value)} value={project.text.disclosure} /></label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {toggleOptions.map((option) => (
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-wash px-3 text-sm font-bold" key={option.key}>
                    <input checked={project[option.key]} className="h-4 w-4 accent-coral" onChange={(event) => updateToggle(option.key, event.target.checked)} type="checkbox" />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">미리보기</h2>
                <p className="mt-1 break-keep text-sm leading-6 text-muted [overflow-wrap:anywhere]">{selectedTemplate.name} · {project.durationSeconds}초 · {project.platform}</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Badge tone={supportTone(support.captureStream)}>captureStream</Badge>
                <Badge tone={supportTone(support.mediaRecorder)}>MediaRecorder</Badge>
                <Badge tone={supportTone(support.webm)}>WebM</Badge>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-white p-3">
              <div className="mx-auto flex max-h-[66vh] min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg bg-wash">
                <canvas
                  aria-label="짧은 영상 미리보기"
                  className="block h-auto max-h-[66vh] w-full max-w-[360px] rounded-lg"
                  ref={canvasRef}
                  style={{ aspectRatio: "9 / 16" }}
                />
              </div>
            </div>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 2xl:grid-cols-4">
              <Button onClick={() => setPreviewPlaying((current) => !current)} type="button" variant="secondary">
                {previewPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                {previewPlaying ? "일시정지" : "재생"}
              </Button>
              <Button onClick={seekStart} type="button" variant="secondary">
                <RotateCcw size={16} aria-hidden="true" />
                처음으로
              </Button>
              <Button onClick={copyUploadText} type="button" variant="secondary">
                <Copy size={16} aria-hidden="true" />
                문구 복사
              </Button>
              <Button onClick={handleShare} type="button" variant="soft">
                <Send size={16} aria-hidden="true" />
                SNS
              </Button>
            </div>
            <div className="mt-3 h-2 rounded-full bg-wash">
              <div className="h-2 rounded-full bg-coral" style={{ width: `${Math.round((previewTime / project.durationSeconds) * 100)}%` }} />
            </div>
          </Card>

          {isGenerating ? (
            <Card>
              <div className="flex min-w-0 items-center justify-between gap-3 text-sm font-bold">
                <span>WebM 생성 중</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-wash">
                <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${progress}%` }} />
              </div>
              <Button className="mt-4" onClick={handleCancelGenerate} type="button" variant="danger">생성 취소</Button>
            </Card>
          ) : null}

          {videoUrl ? (
            <Card>
              <h2 className="text-lg font-black">생성된 WebM</h2>
              <video className="mt-4 block w-full rounded-lg border border-line bg-black" controls src={videoUrl} />
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-3">
                <Button onClick={handleDownloadVideo} type="button">
                  <Download size={16} aria-hidden="true" />
                  WebM
                </Button>
                <Button onClick={handleShare} type="button" variant="secondary">
                  <Share2 size={16} aria-hidden="true" />
                  공유
                </Button>
                <Button onClick={handleExportCenter} type="button" variant="soft">
                  <Send size={16} aria-hidden="true" />
                  Export
                </Button>
              </div>
              <p className="mt-3 rounded-lg bg-wash px-3 py-2 text-xs font-bold leading-5 text-muted">{watermarkStatus.message}</p>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-lg font-black">Fallback 내보내기</h2>
            <p className="mt-1 text-sm leading-6 text-muted">MediaRecorder가 없거나 WebM 생성이 실패하면 플랫폼별 PNG 프레임과 문구 패키지를 내려받을 수 있습니다.</p>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              <Button disabled={isGenerating} onClick={handleFallbackDownload} type="button" variant="secondary">
                <ImageIcon size={16} aria-hidden="true" />
                PNG 세트
              </Button>
              <Button disabled={isGenerating} onClick={() => downloadTextFile(makeVideoFileName(project, "txt"), composeVideoTextPack(result, settings))} type="button" variant="secondary">
                <Upload size={16} aria-hidden="true" />
                문구 TXT
              </Button>
            </div>
            <p className="mt-3 rounded-lg bg-wash px-3 py-2 text-xs font-bold leading-5 text-muted">{watermarkStatus.message}</p>
          </Card>

          <Card>
            <h2 className="text-lg font-black">선택 콘텐츠</h2>
            <p className="mt-2 text-sm font-bold">{result.title}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{getSelectedCaption(result)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="sky">{result.platform}</Badge>
              <Badge tone="mint">{result.purpose}</Badge>
              {result.campaignName ? <Badge tone="lemon">{result.campaignName}</Badge> : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="mobile-fixed-action fixed inset-x-0 bottom-[78px] z-10 border-t border-line bg-white/95 p-3 shadow-lift backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2 min-[430px]:grid-cols-3">
          <Button className="px-2 text-xs" disabled={isGenerating} onClick={support.supported ? handleGenerate : handleFallbackDownload} type="button">
            <Video size={15} aria-hidden="true" />
            생성
          </Button>
          <Button className="px-2 text-xs" disabled={isGenerating || !generatedAsset?.blob} onClick={handleDownloadVideo} type="button" variant="secondary">
            <Download size={15} aria-hidden="true" />
            WebM
          </Button>
          <Button className="px-2 text-xs" disabled={isGenerating} onClick={handleExportCenter} type="button" variant="soft">
            <Share2 size={15} aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
