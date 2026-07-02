import { Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ExportChecklistItem, ExportPackage, ExportPreset } from "@/types";

function checklistTone(status: ExportChecklistItem["status"]) {
  if (status === "ok") return "mint";
  if (status === "missing") return "coral";
  return "lemon";
}

export function ExportPlatformCard({
  preset,
  exportPackage,
  checklist,
  onDownload,
  onCopy,
  onShare,
  onOpen,
  statusLabel
}: {
  preset: ExportPreset;
  exportPackage: ExportPackage;
  checklist: ExportChecklistItem[];
  onDownload: () => void;
  onCopy: () => void;
  onShare: () => void;
  onOpen: () => void;
  statusLabel?: string;
}) {
  const warnings = checklist.filter((item) => item.status !== "ok");

  return (
    <article className="soft-card overflow-hidden">
      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 bg-wash p-4">
          <div
            className="mx-auto flex max-h-[440px] min-h-[260px] w-full max-w-sm flex-col justify-between overflow-hidden rounded-lg border border-line bg-white p-4 shadow-soft"
            style={{ aspectRatio: `${preset.width}/${preset.height}` }}
          >
            <div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <Badge tone="coral">{preset.platform}</Badge>
                <span className="shrink-0 text-xs font-bold text-muted">{preset.recommendedAspectRatio}</span>
              </div>
              <div className="mt-5 rounded-lg bg-aqua p-4">
                <p className="text-xs font-black text-emerald-700">썸네일 문구</p>
                <p className="mt-2 break-keep text-xl font-black leading-tight text-coral [overflow-wrap:anywhere]">{exportPackage.thumbnails[0]}</p>
              </div>
            </div>
            <div>
              <p className="line-clamp-4 text-sm leading-6 text-ink [overflow-wrap:anywhere]">{exportPackage.selectedCaption}</p>
              <p className="mt-3 line-clamp-2 text-xs font-bold leading-5 text-muted [overflow-wrap:anywhere]">{exportPackage.hashtags.slice(0, 8).join(" ")}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black [overflow-wrap:anywhere]">{preset.platform}</h2>
              <p className="mt-1 break-keep text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                {preset.contentType} · {preset.width}×{preset.height}px 권장
              </p>
            </div>
            {statusLabel ? <Badge tone="sky">{statusLabel}</Badge> : <Badge>자동 게시 아님</Badge>}
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
              <p className="text-xs font-black text-muted">사용할 캡션</p>
              <p className="mt-2 line-clamp-4 text-sm leading-6 [overflow-wrap:anywhere]">{exportPackage.selectedCaption}</p>
            </div>
            <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
              <p className="text-xs font-black text-muted">해시태그</p>
              <p className="mt-2 line-clamp-4 text-sm font-bold leading-6 text-coral [overflow-wrap:anywhere]">{exportPackage.hashtags.join(" ")}</p>
            </div>
            <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
              <p className="text-xs font-black text-muted">광고·협찬 표시</p>
              <p className="mt-2 text-sm leading-6 [overflow-wrap:anywhere]">{exportPackage.disclosure}</p>
            </div>
            <div className="min-w-0 rounded-lg border border-line bg-wash p-3">
              <p className="text-xs font-black text-muted">플랫폼 프리셋</p>
              <p className="mt-2 break-keep text-sm leading-6 text-muted [overflow-wrap:anywhere]">{preset.hashtagStyle}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-lemon/60 bg-lemon/20 p-3">
            <p className="text-sm font-black">내보내기 전 확인</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {warnings.slice(0, 4).map((item) => (
                <Badge key={item.id} tone={checklistTone(item.status)}>
                  {item.label}
                </Badge>
              ))}
              {warnings.length === 0 ? <Badge tone="mint">필수 확인 완료</Badge> : null}
            </div>
          </div>

          <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 2xl:grid-cols-4">
            <Button onClick={onDownload} type="button" variant="secondary">
              <Download size={16} aria-hidden="true" />
              다운로드
            </Button>
            <Button onClick={onCopy} type="button" variant="secondary">
              <Copy size={16} aria-hidden="true" />
              문구 복사
            </Button>
            <Button onClick={onShare} type="button" variant="soft">
              <Share2 size={16} aria-hidden="true" />
              SNS 공유
            </Button>
            <Button onClick={onOpen} type="button" variant="ghost">
              <ExternalLink size={16} aria-hidden="true" />
              플랫폼 열기
            </Button>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">현재는 파일과 문구를 준비해 SNS 앱으로 전달하는 방식입니다. 자동 게시 API는 연결하지 않았습니다.</p>
        </div>
      </div>
    </article>
  );
}
