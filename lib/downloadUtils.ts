"use client";

import type { DownloadResult, ExportAsset, ExportPackage } from "@/types";

function getBrowserUnavailableResult(): DownloadResult {
  return {
    ok: false,
    error: "브라우저에서만 다운로드할 수 있어요."
  };
}

export function downloadBlob(blob: Blob, fileName: string): DownloadResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return getBrowserUnavailableResult();
  }

  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 800);

    return {
      ok: true,
      fileName,
      downloadedFiles: [fileName],
      message: `${fileName} 다운로드를 시작했어요.`
    };
  } catch (error) {
    return {
      ok: false,
      fileName,
      error: error instanceof Error ? error.message : "다운로드를 시작하지 못했어요."
    };
  }
}

export function downloadTextFile(fileName: string, text: string) {
  return downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), fileName);
}

export function downloadJsonFile(fileName: string, value: unknown) {
  return downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }), fileName);
}

export async function downloadExportAsset(asset: ExportAsset, exportPackage: ExportPackage): Promise<DownloadResult> {
  if (!asset.available) {
    return {
      ok: false,
      fileName: asset.fileName,
      error: asset.unavailableReason ?? "이 파일은 현재 다운로드할 수 없어요."
    };
  }

  if (asset.kind === "image" && asset.source === "design_canvas") {
    return {
      ok: false,
      fileName: asset.fileName,
      error: "디자인 PNG는 내보내기 센터에서 렌더링한 뒤 다운로드할 수 있어요."
    };
  }

  if (asset.kind === "json") {
    return downloadJsonFile(asset.fileName, exportPackage.metadata);
  }

  if (asset.kind === "text") {
    return downloadTextFile(asset.fileName, asset.text ?? "");
  }

  return {
    ok: false,
    fileName: asset.fileName,
    error: "영상 파일은 실제 생성 또는 원본 File 객체가 있을 때만 다운로드할 수 있어요."
  };
}
