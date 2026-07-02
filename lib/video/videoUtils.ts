"use client";

import { getSelectedCaption, sanitizeFilePart } from "@/lib/exportUtils";
import type { GeneratedPackage, VideoFramePlan, VideoPlatform, VideoRenderSettings } from "@/types";

export function createVideoId(prefix = "video") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatVideoDateStamp(value = new Date().toISOString()) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = String(safeDate.getFullYear());
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function makeVideoFileName(project: { id: string; platform: VideoPlatform; generatedAt?: string; contentId?: string }, extension = "webm") {
  const platform = sanitizeFilePart(project.platform.replace("Instagram ", ""));
  const date = formatVideoDateStamp(project.generatedAt);
  const id = (project.contentId ?? project.id).replace(/[^a-z0-9]/gi, "").slice(-6) || "video";
  return `postkit_${platform}_${date}_${id}.${extension.replace(/^\./, "")}`;
}

export function makeVideoFrameFileName(project: { id: string; platform: VideoPlatform; generatedAt?: string; contentId?: string }, index: number) {
  const base = makeVideoFileName(project, "png").replace(/\.png$/, "");
  return `${base}_frame_${String(index + 1).padStart(2, "0")}.png`;
}

export function getSupportedWebMMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

export function getVideoSupportStatus() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      canvas: false,
      captureStream: false,
      mediaRecorder: false,
      webm: false,
      blob: false,
      supported: false,
      message: "브라우저에서만 영상 생성 지원 여부를 확인할 수 있어요."
    };
  }

  const canvas = document.createElement("canvas");
  const captureStream = typeof canvas.captureStream === "function";
  const mediaRecorder = typeof MediaRecorder !== "undefined";
  const webm = Boolean(getSupportedWebMMimeType());
  const blob = typeof Blob !== "undefined";
  const supported = captureStream && mediaRecorder && webm && blob;

  return {
    canvas: Boolean(canvas.getContext("2d")),
    captureStream,
    mediaRecorder,
    webm,
    blob,
    supported,
    message: supported
      ? "WebM 영상 생성을 지원합니다."
      : "이 브라우저에서는 영상 다운로드 대신 PNG 이미지 세트와 문구 패키지를 사용할 수 있어요."
  };
}

export function buildVideoFramePlan(durationSeconds: number, imageCount: number): VideoFramePlan[] {
  const safeCount = Math.max(1, imageCount);
  const segment = durationSeconds / safeCount;

  return Array.from({ length: safeCount }, (_, index) => ({
    index,
    imageIndex: index,
    startSeconds: index * segment,
    endSeconds: (index + 1) * segment,
    transitionInSeconds: index === 0 ? 0 : Math.min(0.45, segment * 0.25),
    transitionOutSeconds: index === safeCount - 1 ? 0 : Math.min(0.45, segment * 0.25)
  }));
}

export function composeVideoUploadText(result: GeneratedPackage | null, settings?: VideoRenderSettings) {
  if (!result) {
    return "";
  }

  const discount = settings?.text.discountCode || result.input.discountCode;
  return [
    getSelectedCaption(result),
    result.ctas[0] ?? settings?.text.cta ?? "",
    result.disclosure,
    discount ? `할인코드 ${discount}` : "",
    result.hashtags.join(" ")
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function composeVideoTextPack(result: GeneratedPackage | null, settings?: VideoRenderSettings) {
  if (!result) {
    return "PostKit video text pack";
  }

  return [
    "PostKit Video Text Pack",
    "",
    "[영상 제목]",
    settings?.text.title ?? result.thumbnails[0] ?? result.title,
    "",
    "[후킹 문구]",
    settings?.text.hook ?? result.hooks[0] ?? "",
    "",
    "[제품명]",
    settings?.text.productName ?? result.input.productName,
    "",
    "[CTA]",
    settings?.text.cta ?? result.ctas[0] ?? "",
    "",
    "[브랜드명]",
    settings?.text.brandName ?? result.brandName ?? result.input.brandName ?? "",
    "",
    "[광고/협찬 표시]",
    settings?.text.disclosure ?? result.disclosure,
    "",
    "[할인코드]",
    settings?.text.discountCode ?? result.input.discountCode ?? "",
    "",
    "[전체 업로드 문구]",
    composeVideoUploadText(result, settings)
  ].join("\n");
}

export function clampVideoDuration(value: number): 5 | 8 | 10 | 15 {
  if (value <= 5) return 5;
  if (value <= 8) return 8;
  if (value <= 10) return 10;
  return 15;
}

export function videoPlatformLabelForFile(platform: VideoPlatform) {
  if (platform === "Instagram Reels") return "reels";
  if (platform === "Instagram Story") return "story";
  if (platform === "YouTube Shorts") return "shorts";
  return "tiktok";
}
