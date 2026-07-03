"use client";

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileJson,
  FileText,
  Image as ImageIcon,
  PackageCheck,
  Share2,
  Sparkles,
  Video
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExportPlatformCard } from "@/components/ExportPlatformCard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateScheduleAfterExport } from "@/lib/calendarStorage";
import { renderDesignToBlob } from "@/lib/canvasRenderer";
import { findOutputPresetForExportPreset } from "@/lib/designTemplates";
import { getLatestDesignForContent, makeDesignFileName, markDesignExported } from "@/lib/designStorage";
import { createMockPreviewBlob, downloadBlob, downloadExportAsset } from "@/lib/downloadUtils";
import { addExportHistoryEntry, getExportHistory, saveExportPreferences } from "@/lib/exportStorage";
import { getExportPresetById, getRecommendedPreset } from "@/lib/exportPresets";
import {
  applyExportLearning,
  buildDisclosureChecklist,
  buildExportPackage,
  composeAllExportText,
  composeFullUploadText,
  exportLearningWeight
} from "@/lib/exportUtils";
import { isWebShareSupported, openPlatformUrl, shareUploadPackage } from "@/lib/shareUtils";
import { getPlatformContentGuide } from "@/lib/platformGuidance";
import { getCurrentResult, getHistory, saveCurrentResult, updatePersonalizationProfile } from "@/lib/storage";
import { getLatestVideoProjectForContent, markVideoProjectDownloaded, markVideoProjectExported, mergeVideoProjectIntoResult, projectToRenderSettings } from "@/lib/video/videoStorage";
import { getVideoPresetByPlatform } from "@/lib/video/videoPresets";
import { createVideoObjectUrl, getVideoExportAsset } from "@/lib/video/videoSessionStore";
import { composeVideoUploadText } from "@/lib/video/videoUtils";
import type { DesignProject, DownloadResult, ExportAsset, ExportChecklistItem, ExportHistoryEntry, ExportPackage, ExportPlatform, ExportPreset, GeneratedPackage } from "@/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function assetIcon(asset: ExportAsset) {
  if (asset.kind === "image") return ImageIcon;
  if (asset.kind === "video") return Video;
  if (asset.kind === "json") return FileJson;
  return FileText;
}

function checklistTone(status: ExportChecklistItem["status"]) {
  if (status === "ok") return "mint";
  if (status === "missing") return "coral";
  return "lemon";
}

function statusLabelFor(entries: ExportHistoryEntry[], contentId: string, platform: ExportPlatform) {
  const related = entries.filter((entry) => entry.contentId === contentId && entry.platform === platform);
  if (related.some((entry) => entry.status === "failed")) return "내보내기 실패";
  if (related.some((entry) => entry.shared)) return "SNS 공유 준비 완료";
  if (related.some((entry) => entry.exportType === "full_download" || entry.exportType === "single_download")) return "다운로드 완료";
  if (related.some((entry) => entry.exportType === "text_copy")) return "문구 복사 완료";
  return "";
}

function designForExportPreset(project: DesignProject, preset: ExportPreset): DesignProject {
  const output = findOutputPresetForExportPreset(preset.id);

  return {
    ...project,
    outputPresetId: output.id,
    platform: output.platform,
    width: output.width,
    height: output.height
  };
}

function withDesignCanvasAsset(exportPackage: ExportPackage, preset: ExportPreset, design?: DesignProject): ExportPackage {
  if (!design) {
    return exportPackage;
  }

  const project = designForExportPreset(design, preset);

  return {
    ...exportPackage,
    metadata: {
      ...exportPackage.metadata,
      designId: design.id,
      designTemplateId: design.templateId,
      designOutputSize: `${project.width}x${project.height}`
    },
    assets: exportPackage.assets.map((asset) =>
      asset.kind === "image" && asset.source === "mock_preview"
        ? {
            ...asset,
            id: `${preset.id}-design-canvas`,
            label: "Studio 실제 디자인 PNG",
            fileName: makeDesignFileName(project),
            source: "design_canvas" as const,
            width: project.width,
            height: project.height
          }
        : asset
    )
  };
}

export default function ExportPage() {
  const router = useRouter();
  const [result, setResult] = useState<GeneratedPackage | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState(getRecommendedPreset("Instagram Feed").id);
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
  const [feedback, setFeedback] = useState("");
  const [shareSupported, setShareSupported] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    const current = getCurrentResult();
    setResult(current);
    setExportHistory(getExportHistory());
    setShareSupported(isWebShareSupported());

    if (current) {
      const recommended = getRecommendedPreset(current.platform);
      setSelectedPresetId(recommended.id);
    }
  }, []);

  const selectedPreset = getExportPresetById(selectedPresetId);
  const platformGuide = result ? getPlatformContentGuide(result.platform) : null;
  const latestDesign = useMemo(
    () => (result ? result.designs?.[0] ?? getLatestDesignForContent(result.id) : undefined),
    [result, selectedPresetId, exportHistory.length]
  );
  const latestVideo = useMemo(
    () => (result ? result.videoProjects?.[0] ?? getLatestVideoProjectForContent(result.id) : undefined),
    [result, exportHistory.length]
  );
  const videoAsset = latestVideo ? getVideoExportAsset(latestVideo.id) : undefined;
  const exportPackage = useMemo(
    () => (result ? withDesignCanvasAsset(buildExportPackage(result, selectedPreset), selectedPreset, latestDesign) : null),
    [latestDesign, result, selectedPreset]
  );
  const checklist = useMemo(() => (result ? buildDisclosureChecklist(result) : []), [result]);
  const fullUploadText = useMemo(() => (result ? composeFullUploadText(result) : ""), [result]);
  const allExportText = useMemo(() => (result ? composeAllExportText(result) : ""), [result]);
  const warningCount = checklist.filter((item) => item.status !== "ok").length;

  useEffect(() => {
    if (!latestVideo || !videoAsset?.blob) {
      setVideoUrl("");
      return;
    }

    setVideoUrl(createVideoObjectUrl(latestVideo.id));
  }, [latestVideo, videoAsset?.createdAt]);

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2400);
  }

  function refreshHistory() {
    setExportHistory(getExportHistory());
  }

  function persistPreference(preset: ExportPreset) {
    saveExportPreferences({
      version: 1,
      preferredExportPlatform: preset.platform,
      lastSelectedPresetId: preset.id,
      lastUpdatedAt: new Date().toISOString()
    });
  }

  function learnFromExport(platform: ExportPlatform, action: "download" | "full_copy" | "share" | "platform_repeat") {
    updatePersonalizationProfile((profile) => applyExportLearning(profile, platform, exportLearningWeight(action)));
  }

  function recordExport(
    preset: ExportPreset,
    entry: Omit<ExportHistoryEntry, "exportId" | "exportedAt" | "contentId" | "platform">
  ) {
    if (!result) return;

    const nextEntry = addExportHistoryEntry({
      ...entry,
      contentId: result.id,
      platform: preset.platform
    });
    updateScheduleAfterExport(result.scheduleId, nextEntry.exportId);
    refreshHistory();
    persistPreference(preset);
  }

  function recordVideoExport(
    entry: Omit<ExportHistoryEntry, "exportId" | "exportedAt" | "contentId" | "platform">
  ) {
    if (!result || !latestVideo) return;

    const nextEntry = addExportHistoryEntry({
      ...entry,
      contentId: result.id,
      platform: latestVideo.platform,
      videoProjectId: latestVideo.id,
      templateId: latestVideo.templateId,
      durationSeconds: latestVideo.durationSeconds,
      outputFormat: entry.outputFormat ?? "webm",
      campaignId: latestVideo.campaignId ?? result.campaignId,
      scheduleId: latestVideo.scheduleId ?? result.scheduleId
    });
    updateScheduleAfterExport(latestVideo.scheduleId ?? result.scheduleId, nextEntry.exportId);
    refreshHistory();
  }

  function openVideoStudio() {
    if (result) saveCurrentResult(result);
    router.push("/video-studio");
  }

  function persistVideoProjectAsResult(downloaded?: boolean, exported?: boolean) {
    if (!result || !latestVideo) return;
    const updated = exported
      ? markVideoProjectExported(latestVideo.id)
      : downloaded
        ? markVideoProjectDownloaded(latestVideo.id)
        : latestVideo;
    const nextResult = mergeVideoProjectIntoResult(result, updated ?? latestVideo);
    setResult(nextResult);
    saveCurrentResult(nextResult);
  }

  function handleVideoDownload() {
    if (!latestVideo || !videoAsset?.blob) {
      flash("세션에 영상 Blob이 없어요. Video Studio에서 다시 생성해 주세요.");
      openVideoStudio();
      return;
    }

    const download = downloadBlob(videoAsset.blob, videoAsset.fileName);
    recordVideoExport({
      exportType: "single_download",
      downloadedFiles: download.ok ? [videoAsset.fileName] : [],
      copiedFields: [],
      shared: false,
      openedPlatform: false,
      status: download.ok ? "success" : "failed",
      errorMessage: download.error,
      downloaded: download.ok,
      outputFormat: "webm"
    });
    if (download.ok) {
      persistVideoProjectAsResult(true, false);
      flash("Video Studio WebM 다운로드를 시작했어요.");
    } else {
      flash(download.error ?? "영상 다운로드를 시작하지 못했어요.");
    }
  }

  async function handleVideoShare() {
    if (!result || !latestVideo) return;
    const shareText = composeVideoUploadText(result, projectToRenderSettings(latestVideo));

    if (!videoAsset?.blob || typeof File === "undefined") {
      await navigator.clipboard.writeText(shareText);
      openPlatformUrl(getVideoPresetByPlatform(latestVideo.platform).openUrl);
      recordVideoExport({
        exportType: "web_share",
        downloadedFiles: [],
        copiedFields: ["전체 업로드 문구"],
        shared: false,
        openedPlatform: true,
        status: "fallback",
        outputFormat: "text_pack"
      });
      flash("영상 파일은 없어서 문구 복사와 플랫폼 열기로 이어갔어요.");
      return;
    }

    const file = new File([videoAsset.blob], videoAsset.fileName, { type: "video/webm" });
    const share = await shareUploadPackage({
      title: result.title,
      text: shareText,
      files: [file]
    });

    recordVideoExport({
      exportType: "web_share",
      downloadedFiles: share.ok ? [videoAsset.fileName] : [],
      copiedFields: ["전체 업로드 문구"],
      shared: share.ok,
      openedPlatform: false,
      status: share.ok ? "success" : share.canceled ? "fallback" : "failed",
      errorMessage: share.error,
      exported: share.ok,
      outputFormat: "webm"
    });

    if (share.ok) {
      persistVideoProjectAsResult(false, true);
    }
    flash(share.message);
  }

  async function downloadAssetForPreset(asset: ExportAsset, nextPackage: ExportPackage, preset: ExportPreset): Promise<DownloadResult> {
    if (asset.kind === "image" && asset.source === "design_canvas" && latestDesign) {
      try {
        const project = designForExportPreset(latestDesign, preset);
        const rendered = await renderDesignToBlob(project);
        if (!rendered.ok || !rendered.blob) {
          return {
            ok: false,
            fileName: asset.fileName,
            error: rendered.error ?? "Studio 디자인 PNG를 생성하지 못했어요."
          };
        }

        const download = downloadBlob(rendered.blob, asset.fileName || makeDesignFileName(project));

        if (download.ok) {
          markDesignExported(latestDesign.id);
        }

        return download;
      } catch (error) {
        return {
          ok: false,
          fileName: asset.fileName,
          error: error instanceof Error ? error.message : "Studio 디자인 PNG를 생성하지 못했어요."
        };
      }
    }

    return downloadExportAsset(asset, nextPackage, preset);
  }

  async function createShareImageBlob(nextPackage: ExportPackage, preset: ExportPreset) {
    const imageAsset = nextPackage.assets.find((asset) => asset.kind === "image" && asset.available);

    if (!imageAsset) {
      return { imageAsset: undefined, imageBlob: null };
    }

    if (imageAsset.source === "design_canvas" && latestDesign) {
      try {
        const project = designForExportPreset(latestDesign, preset);
        const rendered = await renderDesignToBlob(project);
        return { imageAsset, imageBlob: rendered.ok ? rendered.blob ?? null : null };
      } catch {
        return { imageAsset, imageBlob: null };
      }
    }

    return {
      imageAsset,
      imageBlob: await createMockPreviewBlob(nextPackage, preset)
    };
  }

  async function copyText(label: string, field: string, text: string, preset = selectedPreset) {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(text);
      recordExport(preset, {
        exportType: "text_copy",
        downloadedFiles: [],
        copiedFields: [field],
        shared: false,
        openedPlatform: false,
        status: "success"
      });
      if (field === "전체 업로드 문구") {
        learnFromExport(preset.platform, "full_copy");
      }
      flash(`${label}을 복사했어요.`);
    } catch (error) {
      recordExport(preset, {
        exportType: "text_copy",
        downloadedFiles: [],
        copiedFields: [field],
        shared: false,
        openedPlatform: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "복사 실패"
      });
      flash("복사 권한을 확인해 주세요.");
    }
  }

  async function handleAssetDownload(asset: ExportAsset, preset = selectedPreset) {
    if (!exportPackage || isWorking) return;

    setIsWorking(true);
    const nextPackage = result
      ? withDesignCanvasAsset(buildExportPackage(result, preset), preset, latestDesign)
      : exportPackage;
    const nextAsset = nextPackage.assets.find((item) => item.contentType === asset.contentType && item.kind === asset.kind) ?? asset;
    const download = await downloadAssetForPreset(nextAsset, nextPackage, preset);

    recordExport(preset, {
      exportType: "single_download",
      downloadedFiles: download.fileName ? [download.fileName] : [],
      copiedFields: [],
      shared: false,
      openedPlatform: false,
      status: download.ok ? "success" : "failed",
      errorMessage: download.error
    });

    if (download.ok) {
      learnFromExport(preset.platform, "download");
      flash(download.message ?? "다운로드를 시작했어요.");
    } else {
      flash(download.error ?? "다운로드할 수 없는 파일이에요.");
    }
    setIsWorking(false);
  }

  async function handleFullDownload(preset = selectedPreset) {
    if (!result || isWorking) return;

    setIsWorking(true);
    const nextPackage = withDesignCanvasAsset(buildExportPackage(result, preset), preset, latestDesign);
    const downloadedFiles: string[] = [];

    for (const asset of nextPackage.assets) {
      if (!asset.available) {
        continue;
      }

      const assetDownload = await downloadAssetForPreset(asset, nextPackage, preset);
      if (assetDownload.ok && assetDownload.fileName) {
        downloadedFiles.push(assetDownload.fileName);
      }
    }

    const download: DownloadResult = {
      ok: downloadedFiles.length > 0,
      downloadedFiles,
      message:
        downloadedFiles.length > 0
          ? "전체 다운로드를 순서대로 시작했어요. 브라우저 설정에 따라 여러 파일 다운로드 허용이 필요할 수 있어요."
          : "다운로드 가능한 파일이 없어요."
    };
    recordExport(preset, {
      exportType: "full_download",
      downloadedFiles: download.downloadedFiles ?? [],
      copiedFields: [],
      shared: false,
      openedPlatform: false,
      status: download.ok ? "success" : "failed",
      errorMessage: download.error
    });

    if (download.ok) {
      learnFromExport(preset.platform, "download");
    }
    flash(download.message ?? "전체 다운로드를 시작했어요.");
    setIsWorking(false);
  }

  async function handleShare(preset = selectedPreset) {
    if (!result || isWorking) return;

    setIsWorking(true);
    const shareText = composeFullUploadText(result);
    const nextPackage = withDesignCanvasAsset(buildExportPackage(result, preset), preset, latestDesign);
    const { imageAsset, imageBlob } = await createShareImageBlob(nextPackage, preset);
    const files = imageBlob && typeof File !== "undefined" && imageAsset ? [new File([imageBlob], imageAsset.fileName, { type: "image/png" })] : [];
    const share = await shareUploadPackage({
      title: result.title,
      text: shareText,
      url: preset.openUrl,
      files
    });

    if (share.canceled) {
      flash(share.message);
      setIsWorking(false);
      return;
    }

    if (share.ok) {
      recordExport(preset, {
        exportType: "web_share",
        downloadedFiles: [],
        copiedFields: ["전체 업로드 문구"],
        shared: true,
        openedPlatform: false,
        status: "success"
      });
      learnFromExport(preset.platform, "share");
      flash(share.message);
      setIsWorking(false);
      return;
    }

    try {
      const download = imageAsset ? await downloadAssetForPreset(imageAsset, nextPackage, preset) : undefined;
      await navigator.clipboard.writeText(shareText);
      openPlatformUrl(preset.openUrl);
      recordExport(preset, {
        exportType: "web_share",
        downloadedFiles: download?.fileName ? [download.fileName] : [],
        copiedFields: ["전체 업로드 문구"],
        shared: false,
        openedPlatform: true,
        status: "fallback",
        errorMessage: share.error
      });
      learnFromExport(preset.platform, "platform_repeat");
      flash("공유창 대신 미디어 다운로드, 문구 복사, 플랫폼 열기를 진행했어요. SNS 앱에서 붙여넣어 업로드하세요.");
    } catch (error) {
      recordExport(preset, {
        exportType: "web_share",
        downloadedFiles: [],
        copiedFields: [],
        shared: false,
        openedPlatform: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "fallback 실패"
      });
      flash("공유 준비에 실패했어요. 개별 다운로드와 복사를 이용해 주세요.");
    }
    setIsWorking(false);
  }

  function handleOpenPlatform(preset = selectedPreset) {
    const opened = openPlatformUrl(preset.openUrl);
    recordExport(preset, {
      exportType: "platform_open",
      downloadedFiles: [],
      copiedFields: [],
      shared: false,
      openedPlatform: opened,
      status: opened ? "success" : "failed",
      errorMessage: opened ? undefined : "브라우저에서 플랫폼 페이지를 열 수 없어요."
    });
    learnFromExport(preset.platform, "platform_repeat");
    flash(opened ? `${preset.platform} 페이지를 열었어요.` : "플랫폼 페이지를 열 수 없어요.");
  }

  function openLatestHistoryItem() {
    const latest = getHistory()[0];
    if (!latest) return;
    saveCurrentResult(latest.package);
    setResult(latest.package);
    setSelectedPresetId(getRecommendedPreset(latest.package.platform).id);
    flash("최근 콘텐츠를 내보내기 센터에 불러왔어요.");
  }

  if (!result || !exportPackage) {
    return (
      <AppShell>
        <PageHeader
          action={
            <LinkButton href="/create">
              <Sparkles size={17} aria-hidden="true" />
              새 패키지 만들기
            </LinkButton>
          }
          description="생성된 업로드 패키지를 먼저 선택하면 다운로드와 SNS 공유 준비를 할 수 있어요."
          eyebrow="Export"
          title="내보낼 콘텐츠가 없어요"
        />
        <Card className="mt-6">
          <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center">
            <PackageCheck className="mx-auto text-coral" size={34} aria-hidden="true" />
            <p className="mt-3 font-black">현재 선택된 생성 결과가 없습니다.</p>
            <p className="mt-2 text-sm leading-6 text-muted">History에서 콘텐츠를 열거나 최근 콘텐츠를 불러와 내보내기를 시작하세요.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={openLatestHistoryItem} type="button" variant="secondary">
                최근 콘텐츠 불러오기
              </Button>
              <LinkButton href="/history" variant="soft">
                History 보기
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
            <Button disabled={isWorking} onClick={() => handleFullDownload()} type="button" variant="secondary">
              <Download size={17} aria-hidden="true" />
              {platformGuide?.exportActionLabel ?? "전체 다운로드"}
            </Button>
            <Button disabled={isWorking} onClick={() => copyText(platformGuide?.copyActionLabel ?? "전체 업로드 문구", "전체 업로드 문구", fullUploadText)} type="button" variant="soft">
              <Copy size={17} aria-hidden="true" />
              {platformGuide?.copyActionLabel ?? "전체 문구 복사"}
            </Button>
            <LinkButton href="/studio" onClick={() => result && saveCurrentResult(result)} variant="secondary">
              <ImageIcon size={17} aria-hidden="true" />
              {platformGuide?.studioActionLabel ?? "디자인 편집"}
            </LinkButton>
            <Button disabled={isWorking} onClick={() => handleShare()} type="button">
              <Share2 size={17} aria-hidden="true" />
              {platformGuide ? `${platformGuide.shortLabel} 공유 준비` : "SNS 공유"}
            </Button>
          </>
        }
        description={`${formatDate(result.createdAt)} · ${result.platform} · ${platformGuide?.resultFormat ?? result.purpose} · 다운로드/내보내기 추가 크레딧 0`}
        eyebrow="Export Center"
        title="SNS 내보내기 센터"
      />

      {feedback ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={18} aria-hidden="true" />
          {feedback}
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-coral/20 bg-blush p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-coral">크레딧 정책</p>
            <p className="mt-1 text-sm leading-6 text-muted">이미 생성한 콘텐츠의 다운로드와 SNS 내보내기에는 크레딧이 추가로 사용되지 않아요.</p>
          </div>
          <Badge tone="mint">추가 차감 0 크레딧</Badge>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-ink">{latestDesign ? "Studio 실제 디자인 PNG 사용 중" : "아직 Studio 디자인 PNG가 없어요"}</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {latestDesign
                ? `${platformGuide?.shortLabel ?? "SNS"} 내보내기에는 mock 이미지보다 Studio에서 만든 Canvas PNG를 우선 사용합니다.`
                : `${platformGuide?.studioActionLabel ?? "Studio에서 PNG 만들기"}를 진행하면 Export Center에서 실제 PNG를 우선 사용할 수 있어요.`}
            </p>
          </div>
          <LinkButton href="/studio" onClick={() => result && saveCurrentResult(result)} variant={latestDesign ? "secondary" : "soft"}>
            <ImageIcon size={17} aria-hidden="true" />
            {latestDesign ? "디자인 다시 열기" : platformGuide?.studioActionLabel ?? "Studio에서 PNG 만들기"}
          </LinkButton>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-ink">{latestVideo ? "Video Studio 영상 프로젝트 연결됨" : "아직 Video Studio 영상이 없어요"}</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {latestVideo
                ? `${latestVideo.platform} · ${latestVideo.durationSeconds}초 · ${videoAsset?.blob ? "세션 WebM Blob 사용 가능" : "Blob은 저장하지 않아 재생성이 필요"}`
                : `${platformGuide?.videoActionLabel ?? "Video Studio"}은 업로드 사진 기반 WebM을 만들고, Blob은 현재 브라우저 세션에만 보관합니다.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestVideo && videoAsset?.blob ? (
              <>
                <Button disabled={isWorking} onClick={handleVideoDownload} type="button" variant="secondary">
                  <Download size={17} aria-hidden="true" />
                  WebM 다운로드
                </Button>
                <Button disabled={isWorking} onClick={handleVideoShare} type="button" variant="soft">
                  <Video size={17} aria-hidden="true" />
                  영상 공유
                </Button>
              </>
            ) : null}
            <Button onClick={openVideoStudio} type="button" variant={latestVideo ? "secondary" : "soft"}>
              <Video size={17} aria-hidden="true" />
              {latestVideo ? "영상 다시 열기" : platformGuide?.videoActionLabel ?? "Video Studio 열기"}
            </Button>
          </div>
        </div>
        {videoUrl ? (
          <video className="mt-4 block max-h-[520px] w-full rounded-lg border border-line bg-black" controls src={videoUrl} />
        ) : null}
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">선택한 생성 콘텐츠</h2>
                <p className="mt-1 break-keep text-sm leading-6 text-muted [overflow-wrap:anywhere]">{result.title}</p>
              </div>
              <Badge tone="sky">{selectedPreset.platform}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
                <p className="text-xs font-black text-muted">플랫폼</p>
                <p className="mt-1 break-keep font-bold [overflow-wrap:anywhere]">{result.platform}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
                <p className="text-xs font-black text-muted">게시물 목적</p>
                <p className="mt-1 break-keep font-bold [overflow-wrap:anywhere]">{result.purpose}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
                <p className="text-xs font-black text-muted">개인화 스타일</p>
                <p className="mt-1 break-keep font-bold [overflow-wrap:anywhere]">{result.personalization?.topStyle ?? result.style}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
                <p className="text-xs font-black text-muted">업로드 자료</p>
                <p className="mt-1 truncate font-bold">{result.input.uploadedFileName ?? "자료명 없음"}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-keep text-lg font-black">선택 플랫폼 프리셋</h2>
                <p className="mt-1 text-sm text-muted">처음 선택한 플랫폼 기준으로 필요한 내보내기 옵션만 표시합니다.</p>
              </div>
              <Badge>{shareSupported ? "Web Share 지원" : "Fallback 준비"}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-coral bg-blush p-3 text-coral">
                <span className="block text-sm font-black">{selectedPreset.platform}</span>
                <span className="mt-1 block text-xs font-bold">{selectedPreset.contentType}</span>
              </div>
              <div className="rounded-lg border border-line bg-wash p-3">
                <span className="block text-sm font-black">{selectedPreset.recommendedAspectRatio}</span>
                <span className="mt-1 block text-xs text-muted">{selectedPreset.width}×{selectedPreset.height}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">광고·협찬 내보내기 체크리스트</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              경고가 있어도 사용자가 확인 후 내보낼 수 있습니다. 최종 게시 전 광고주 요구사항과 관련 기준을 직접 확인하세요.
            </p>
            <div className="mt-4 space-y-2">
              {checklist.map((item) => (
                <div className="flex flex-col gap-2 rounded-lg border border-line bg-wash p-3 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
                  <div>
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
                  </div>
                  <Badge tone={checklistTone(item.status)}>{item.status === "ok" ? "확인" : item.status === "missing" ? "누락" : "주의"}</Badge>
                </div>
              ))}
            </div>
            {warningCount > 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-lemon/70 bg-lemon/20 p-3 text-sm leading-6 text-ink">
                <AlertCircle className="mt-0.5 shrink-0 text-coral" size={18} aria-hidden="true" />
                확인이 필요한 항목이 {warningCount}개 있어요. 자동 게시가 아니라 파일과 문구 준비 단계이므로, 게시 전 직접 검토해 주세요.
              </div>
            ) : null}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <h2 className="text-lg font-black">문구 복사</h2>
            <p className="mt-1 text-sm text-muted">필요한 문구만 골라 복사하거나 전체 업로드 문구를 한 번에 복사하세요.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                [platformGuide?.copyActionLabel ?? "선택한 문구", "선택한 문구", exportPackage.selectedCaption],
                [`전체 ${platformGuide?.shortLabel ?? "SNS"} 문구`, "전체 문구", exportPackage.captions.join("\n\n")],
                ["해시태그", "해시태그", exportPackage.hashtags.join(" ")],
                ["CTA", "CTA", exportPackage.ctas.join("\n")],
                ["광고·협찬 표시 문구", "광고·협찬 표시 문구", exportPackage.disclosure],
                ["썸네일 문구", "썸네일 문구", exportPackage.thumbnails.join("\n")],
                ["제목", "제목", exportPackage.title],
                ["설명", "설명", allExportText],
                ["전체 업로드 문구", "전체 업로드 문구", fullUploadText]
              ].map(([label, field, text]) => (
                <Button
                  className="justify-start"
                  key={field}
                  onClick={() => copyText(label, field, text)}
                  type="button"
                  variant={field === "전체 업로드 문구" ? "soft" : "secondary"}
                >
                  <Copy size={16} aria-hidden="true" />
                  {label}
                </Button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black">다운로드 파일</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              ZIP 없이 안전하게 개별 파일로 내려받습니다. 브라우저 설정에 따라 여러 파일 다운로드 허용이 필요할 수 있어요.
            </p>
            <div className="mt-4 space-y-2">
              {exportPackage.assets.map((asset) => {
                const Icon = assetIcon(asset);
                return (
                  <div className="min-w-0 rounded-lg border border-line bg-wash p-3" key={asset.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-black">
                          <Icon className="text-coral" size={17} aria-hidden="true" />
                          <span className="min-w-0 break-keep">{asset.label}</span>
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-muted">{asset.fileName}</p>
                        {!asset.available ? <p className="mt-1 text-xs leading-5 text-muted">{asset.unavailableReason}</p> : null}
                      </div>
                      <Button
                        className="w-full sm:w-auto"
                        disabled={!asset.available || isWorking}
                        onClick={() => handleAssetDownload(asset)}
                        type="button"
                        variant="secondary"
                      >
                        <Download size={16} aria-hidden="true" />
                        다운로드
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-xl font-black">{platformGuide?.shortLabel ?? "선택 플랫폼"} 내보내기 카드</h2>
          <p className="mt-1 text-sm leading-6 text-muted">처음 선택한 플랫폼에 맞는 크기, 문구, 공유 준비 상태만 확인하세요.</p>
        </div>
        <ExportPlatformCard
          checklist={checklist}
          exportPackage={exportPackage}
          onCopy={() => copyText(platformGuide?.copyActionLabel ?? "전체 업로드 문구", "전체 업로드 문구", composeFullUploadText(result), selectedPreset)}
          onDownload={() => handleFullDownload(selectedPreset)}
          onOpen={() => handleOpenPlatform(selectedPreset)}
          onShare={() => handleShare(selectedPreset)}
          preset={selectedPreset}
          statusLabel={statusLabelFor(exportHistory, result.id, selectedPreset.platform)}
        />
      </section>

      <div className="mobile-fixed-action fixed inset-x-0 bottom-[78px] z-10 border-t border-line bg-white/95 p-3 shadow-lift backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2 min-[430px]:grid-cols-3">
          <Button className="px-2 text-xs" disabled={isWorking} onClick={() => handleFullDownload()} type="button" variant="secondary">
            <Download size={15} aria-hidden="true" />
            전체 저장
          </Button>
          <Button className="px-2 text-xs" disabled={isWorking} onClick={() => copyText("전체 업로드 문구", "전체 업로드 문구", fullUploadText)} type="button" variant="soft">
            <Copy size={15} aria-hidden="true" />
            {platformGuide?.shortLabel ?? "SNS"} 문구
          </Button>
          <Button className="px-2 text-xs" disabled={isWorking} onClick={() => handleShare()} type="button">
            <Share2 size={15} aria-hidden="true" />
            공유 준비
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
