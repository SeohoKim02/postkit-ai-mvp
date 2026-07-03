"use client";

import { drawPostKitWatermark } from "@/lib/watermarkPolicy";
import type { DownloadResult, ExportAsset, ExportPackage, ExportPreset } from "@/types";

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

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (context.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });

  if (current) {
    lines.push(current);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

export async function createMockPreviewBlob(exportPackage: ExportPackage, preset: ExportPreset) {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1400 / Math.max(preset.width, preset.height));
  canvas.width = Math.round(preset.width * scale);
  canvas.height = Math.round(preset.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const width = canvas.width;
  const height = canvas.height;
  const padding = Math.max(36, Math.round(width * 0.06));

  context.fillStyle = "#fbf8f3";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(padding, padding, width - padding * 2, height - padding * 2);

  context.fillStyle = "#ff6b4a";
  context.fillRect(padding, padding, width - padding * 2, Math.max(8, Math.round(height * 0.012)));

  context.fillStyle = "#e8f7f0";
  context.fillRect(padding * 1.4, padding * 1.7, width - padding * 2.8, Math.round(height * 0.38));

  context.fillStyle = "#171717";
  context.font = `700 ${Math.max(24, Math.round(width * 0.04))}px sans-serif`;
  context.fillText("PostKit Preview", padding * 1.6, padding * 2.45);

  context.fillStyle = "#ff6b4a";
  context.font = `800 ${Math.max(28, Math.round(width * 0.052))}px sans-serif`;
  drawWrappedText(context, exportPackage.thumbnails[0] ?? exportPackage.title, padding * 1.6, padding * 3.4, width - padding * 3.2, Math.round(width * 0.07), 3);

  context.fillStyle = "#171717";
  context.font = `600 ${Math.max(18, Math.round(width * 0.028))}px sans-serif`;
  drawWrappedText(context, exportPackage.selectedCaption, padding * 1.6, Math.round(height * 0.56), width - padding * 3.2, Math.round(width * 0.042), 5);

  context.fillStyle = "#5b5b5b";
  context.font = `700 ${Math.max(16, Math.round(width * 0.024))}px sans-serif`;
  drawWrappedText(context, exportPackage.hashtags.slice(0, 8).join(" "), padding * 1.6, Math.round(height * 0.78), width - padding * 3.2, Math.round(width * 0.035), 3);

  context.fillStyle = "#171717";
  context.font = `700 ${Math.max(14, Math.round(width * 0.02))}px sans-serif`;
  context.fillText(`${preset.platform} · ${preset.recommendedAspectRatio} · mock image`, padding * 1.6, height - padding * 1.7);

  drawPostKitWatermark(context, width, height, {
    bottomSafeRatio: 0.08,
    rightSafeRatio: 0.055
  });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

export async function downloadMockPreview(exportPackage: ExportPackage, preset: ExportPreset, fileName: string) {
  const blob = await createMockPreviewBlob(exportPackage, preset);
  if (!blob) {
    return {
      ok: false,
      fileName,
      error: "이미지 미리보기를 만들 수 없어 문구 파일만 다운로드할 수 있어요."
    };
  }

  return downloadBlob(blob, fileName);
}

export async function downloadExportAsset(asset: ExportAsset, exportPackage: ExportPackage, preset: ExportPreset): Promise<DownloadResult> {
  if (!asset.available) {
    return {
      ok: false,
      fileName: asset.fileName,
      error: asset.unavailableReason ?? "이 파일은 현재 다운로드할 수 없어요."
    };
  }

  if (asset.kind === "image" && asset.source === "mock_preview") {
    return downloadMockPreview(exportPackage, preset, asset.fileName);
  }

  if (asset.kind === "image" && asset.source === "design_canvas") {
    return {
      ok: false,
      fileName: asset.fileName,
      error: "Studio 디자인 PNG는 Export Center에서 Canvas로 렌더링한 뒤 다운로드할 수 있어요."
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

export async function downloadAllAvailableAssets(exportPackage: ExportPackage, preset: ExportPreset): Promise<DownloadResult> {
  const downloadedFiles: string[] = [];

  for (const asset of exportPackage.assets) {
    if (!asset.available) {
      continue;
    }

    const result = await downloadExportAsset(asset, exportPackage, preset);
    if (result.ok && result.fileName) {
      downloadedFiles.push(result.fileName);
    }
  }

  return {
    ok: downloadedFiles.length > 0,
    downloadedFiles,
    message:
      downloadedFiles.length > 0
        ? "전체 다운로드를 순서대로 시작했어요. 브라우저 설정에 따라 여러 파일 다운로드 허용이 필요할 수 있어요."
        : "다운로드 가능한 파일이 없어요."
  };
}
