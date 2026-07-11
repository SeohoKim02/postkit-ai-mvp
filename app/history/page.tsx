"use client";

import { Clock3, Download, Eye, Palette, RotateCcw, Share2, Sparkles, Trash2, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { renderDesignToBlob } from "@/lib/canvasRenderer";
import { duplicateDesignProject, getLatestDesignForContent, makeDesignFileName, markDesignDownloaded } from "@/lib/designStorage";
import { downloadBlob } from "@/lib/downloadUtils";
import { addExportHistoryEntry, getExportHistory } from "@/lib/exportStorage";
import { getRecommendedPreset } from "@/lib/exportPresets";
import { composeFullUploadText } from "@/lib/exportUtils";
import { getHistory, saveCurrentResult, saveHistory, savePrefill } from "@/lib/storage";
import { duplicateVideoProject, getLatestVideoProjectForContent, markVideoProjectDownloaded } from "@/lib/video/videoStorage";
import { getVideoExportAsset } from "@/lib/video/videoSessionStore";
import type { ExportHistoryEntry, HistoryItem } from "@/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setHistory(getHistory());
    setExportHistory(getExportHistory());
  }, []);

  function handleOpen(item: HistoryItem) {
    saveCurrentResult(item.package);
    router.push("/results");
  }

  function handleRegenerate(item: HistoryItem) {
    savePrefill(item.package.input);
    router.push("/create");
  }

  function handleRegenerateStyle(item: HistoryItem) {
    savePrefill({
      ...item.package.input,
      platform: item.package.personalization?.topPlatform ?? item.package.platform,
      style: item.package.personalization?.topStyle ?? item.package.style
    });
    router.push("/create");
  }

  function handleExport(item: HistoryItem) {
    saveCurrentResult(item.package);
    router.push("/export");
  }

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function handleStudio(item: HistoryItem) {
    saveCurrentResult(item.package);
    router.push("/studio");
  }

  function getVideoProject(item: HistoryItem) {
    return item.package.videoProjects?.[0] ?? getLatestVideoProjectForContent(item.package.id);
  }

  function handleVideoStudio(item: HistoryItem) {
    saveCurrentResult(item.package);
    router.push("/video-studio");
  }

  function handleDuplicateVideo(item: HistoryItem) {
    const video = getVideoProject(item);

    if (!video) {
      handleVideoStudio(item);
      return;
    }

    const clone = duplicateVideoProject(video);
    const nextPackage = {
      ...item.package,
      videoProjects: [clone, ...(item.package.videoProjects ?? []).filter((project) => project.id !== clone.id)].slice(0, 20)
    };
    const nextHistory = history.map((historyItem) => (historyItem.id === item.id ? { ...historyItem, package: nextPackage } : historyItem));
    setHistory(nextHistory);
    saveHistory(nextHistory);
    saveCurrentResult(nextPackage);
    router.push("/video-studio");
  }

  function handleVideoExport(item: HistoryItem) {
    saveCurrentResult(item.package);
    router.push("/export");
  }

  function handleVideoDownload(item: HistoryItem) {
    const video = getVideoProject(item);

    if (!video) {
      handleVideoStudio(item);
      return;
    }

    const asset = getVideoExportAsset(video.id);
    if (!asset?.blob) {
      saveCurrentResult(item.package);
      router.push("/video-studio");
      return;
    }

    const download = downloadBlob(asset.blob, asset.fileName);
    if (download.ok) {
      markVideoProjectDownloaded(video.id);
      addExportHistoryEntry({
        contentId: item.package.id,
        platform: video.platform,
        exportType: "single_download",
        downloadedFiles: [asset.fileName],
        copiedFields: [],
        shared: false,
        openedPlatform: false,
        status: "success",
        videoProjectId: video.id,
        templateId: video.templateId,
        durationSeconds: video.durationSeconds,
        outputFormat: "webm",
        downloaded: true,
        campaignId: video.campaignId,
        scheduleId: video.scheduleId
      });
      setExportHistory(getExportHistory());
      flash("영상 WebM 다운로드를 시작했어요.");
    } else {
      flash(download.error ?? "영상 다운로드를 시작하지 못했어요.");
    }
  }

  function handleDuplicateDesign(item: HistoryItem) {
    const design = item.package.designs?.[0] ?? getLatestDesignForContent(item.package.id);

    if (!design) {
      handleStudio(item);
      return;
    }

    const clone = duplicateDesignProject(design);
    const nextPackage = {
      ...item.package,
      designs: [clone, ...(item.package.designs ?? []).filter((project) => project.id !== clone.id)].slice(0, 20)
    };
    const nextHistory = history.map((historyItem) => (historyItem.id === item.id ? { ...historyItem, package: nextPackage } : historyItem));
    setHistory(nextHistory);
    saveHistory(nextHistory);
    saveCurrentResult(nextPackage);
    router.push("/studio");
  }

  async function handleDesignDownload(item: HistoryItem) {
    const design = item.package.designs?.[0] ?? getLatestDesignForContent(item.package.id);

    if (!design) {
      saveCurrentResult(item.package);
      router.push("/studio");
      return;
    }

    try {
      const rendered = await renderDesignToBlob(design);
      if (!rendered.ok || !rendered.blob) {
        flash(rendered.error ?? "디자인 PNG를 생성하지 못했어요.");
        return;
      }

      // Studio와 같은 기준: 치명적 품질 문제(사진 유실·피사체 겹침 등)는 어디서 받아도 차단한다.
      const fatal = (rendered.info?.quality ?? []).filter((issue) => issue.severity === "error");
      if (fatal.length > 0) {
        flash(`다운로드를 중단했어요. ${fatal.map((issue) => issue.message).join(" ")} Studio에서 수정할 수 있어요.`);
        return;
      }

      const fileName = makeDesignFileName(design);
      const download = downloadBlob(rendered.blob, fileName);
      if (download.ok) {
        markDesignDownloaded(design.id);
        flash("Studio 디자인 PNG 다운로드를 시작했어요.");
      } else {
        flash(download.error ?? "디자인 PNG를 다운로드하지 못했어요.");
      }
    } catch (error) {
      flash(error instanceof Error ? error.message : "디자인 PNG를 생성하지 못했어요.");
    }
  }

  function handleFullTextCopied(item: HistoryItem) {
    const preset = getRecommendedPreset(item.package.platform);
    addExportHistoryEntry({
      contentId: item.package.id,
      platform: preset.platform,
      exportType: "text_copy",
      downloadedFiles: [],
      copiedFields: ["전체 업로드 문구"],
      shared: false,
      openedPlatform: false,
      status: "success"
    });
    setExportHistory(getExportHistory());
  }

  function exportBadges(item: HistoryItem) {
    const related = exportHistory.filter((entry) => entry.contentId === item.package.id);
    return {
      downloaded: related.some((entry) => entry.exportType === "single_download" || entry.exportType === "full_download"),
      copied: related.some((entry) => entry.exportType === "text_copy"),
      shared: related.some((entry) => entry.shared || entry.exportType === "web_share"),
      video: related.some((entry) => Boolean(entry.videoProjectId)) || Boolean(getVideoProject(item)),
      failed: related.some((entry) => entry.status === "failed")
    };
  }

  function handleDelete(id: string) {
    const nextHistory = history.filter((item) => item.id !== id);
    setHistory(nextHistory);
    saveHistory(nextHistory);
    setPendingDeleteId(null);
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <LinkButton className="w-full sm:w-auto" href="/create">
            <Sparkles size={17} aria-hidden="true" />
            새 패키지 만들기
          </LinkButton>
        }
        description="생성 기록을 다시 열거나 같은 입력으로 새 패키지를 만들 수 있습니다."
        eyebrow="History"
        title="생성한 콘텐츠 목록"
      />

      {feedback ? (
        <div className="mt-5 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">{feedback}</div>
      ) : null}

      <Card className="mt-6">
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-wash p-4" key={item.id}>
                <div className="min-w-0 max-w-none">
                  <div className="min-w-0 max-w-none">
                    <div className="flex min-w-0 max-w-none flex-wrap items-center gap-2 [&>*]:max-w-full">
                      <Badge>
                        <Clock3 className="mr-1" size={14} aria-hidden="true" />
                        {formatDate(item.createdAt)}
                      </Badge>
                      <Badge tone="sky">{item.package.platform}</Badge>
                      <Badge tone="mint">{item.package.purpose}</Badge>
                      <Badge tone="lemon">{item.package.usedCredits} 크레딧</Badge>
                      {item.package.creditLedgerId ? <Badge>원장 {item.package.creditLedgerId.slice(0, 18)}...</Badge> : null}
                      {typeof item.package.subscriptionCreditsUsed === "number" ? (
                        <Badge tone="mint">구독 {item.package.subscriptionCreditsUsed}</Badge>
                      ) : null}
                      {typeof item.package.purchasedCreditsUsed === "number" ? (
                        <Badge tone="sky">구매 {item.package.purchasedCreditsUsed}</Badge>
                      ) : null}
                      {item.package.refunded ? <Badge tone="coral">환불됨</Badge> : null}
                      {item.package.campaignName ? <Badge tone="lemon">{item.package.campaignName}</Badge> : null}
                      {item.package.personalization ? <Badge tone="coral">{item.package.personalization.topStyle}</Badge> : null}
                      {typeof item.package.selectedCaptionIndex === "number" ? <Badge>선택 {item.package.selectedCaptionIndex + 1}번</Badge> : null}
                      {item.package.editedCaptionHistory?.length ? <Badge tone="mint">수정됨</Badge> : null}
                      {item.package.liked ? <Badge tone="coral">좋아요</Badge> : null}
                      {item.package.copiedResultTypes?.length ? <Badge tone="sky">복사 기록</Badge> : null}
                      {exportBadges(item).downloaded ? <Badge tone="mint">다운로드 완료</Badge> : null}
                      {exportBadges(item).copied ? <Badge tone="sky">문구 복사 완료</Badge> : null}
                      {exportBadges(item).shared ? <Badge tone="coral">SNS 공유 준비 완료</Badge> : null}
                      {exportBadges(item).video ? <Badge tone="sky">Video Studio</Badge> : null}
                      {exportBadges(item).failed ? <Badge tone="lemon">내보내기 실패</Badge> : null}
                      {item.package.designs?.length || getLatestDesignForContent(item.package.id) ? <Badge tone="mint">Studio 디자인</Badge> : null}
                    </div>
                    <h2 className="mt-2 line-clamp-2 max-w-none break-keep text-lg font-black [overflow-wrap:anywhere]">{item.package.title}</h2>
                    <p className="mt-2 line-clamp-3 max-w-none text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                      {item.package.selectedCaption ?? item.package.captions[0]}
                    </p>
                  </div>
                  <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 [&>*]:w-full">
                    <Button onClick={() => handleOpen(item)} type="button" variant="secondary">
                      <Eye size={16} aria-hidden="true" />
                      결과 보기
                    </Button>
                    <CopyButton label="전체 문구 복사" onCopied={() => handleFullTextCopied(item)} value={composeFullUploadText(item.package)} />
                    <Button onClick={() => handleExport(item)} type="button" variant="secondary">
                      <Download size={16} aria-hidden="true" />
                      다운로드
                    </Button>
                    <Button onClick={() => handleExport(item)} type="button" variant="soft">
                      <Share2 size={16} aria-hidden="true" />
                      SNS로 내보내기
                    </Button>
                    <Button onClick={() => handleStudio(item)} type="button" variant="secondary">
                      <Palette size={16} aria-hidden="true" />
                      디자인 다시 열기
                    </Button>
                    <Button onClick={() => handleVideoStudio(item)} type="button" variant="secondary">
                      <Video size={16} aria-hidden="true" />
                      영상 다시 열기
                    </Button>
                    <Button onClick={() => handleDuplicateDesign(item)} type="button" variant="secondary">
                      디자인 복제
                    </Button>
                    <Button onClick={() => handleDuplicateVideo(item)} type="button" variant="secondary">
                      영상 복제
                    </Button>
                    <Button onClick={() => handleDesignDownload(item)} type="button" variant="soft">
                      <Download size={16} aria-hidden="true" />
                      디자인 PNG
                    </Button>
                    <Button onClick={() => handleVideoDownload(item)} type="button" variant="soft">
                      <Download size={16} aria-hidden="true" />
                      영상 WebM
                    </Button>
                    <Button onClick={() => handleVideoExport(item)} type="button" variant="soft">
                      <Share2 size={16} aria-hidden="true" />
                      영상 내보내기
                    </Button>
                    <Button onClick={() => handleRegenerate(item)} type="button" variant="soft">
                      <RotateCcw size={16} aria-hidden="true" />
                      다시 생성
                    </Button>
                    <Button onClick={() => handleRegenerateStyle(item)} type="button" variant="secondary">
                      이 스타일로 다시 만들기
                    </Button>
                    <Button onClick={() => setPendingDeleteId(item.id)} type="button" variant="danger">
                      <Trash2 size={16} aria-hidden="true" />
                      삭제
                    </Button>
                  </div>
                </div>
                {pendingDeleteId === item.id ? (
                  <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-bold text-red-700">이 기록을 삭제할까요? 삭제 후에는 이 브라우저 보관함에서 사라집니다.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => setPendingDeleteId(null)} type="button" variant="secondary">
                        취소
                      </Button>
                      <Button onClick={() => handleDelete(item.id)} type="button" variant="danger">
                        삭제 확인
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center">
            <Sparkles className="mx-auto text-coral" size={32} aria-hidden="true" />
            <p className="mt-3 font-black">저장된 생성 기록이 없습니다.</p>
            <p className="mt-1 text-sm text-muted">업로드 패키지를 만들면 이곳에 자동 저장됩니다.</p>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
