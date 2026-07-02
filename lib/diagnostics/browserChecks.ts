"use client";

import type { BrowserCapability, DiagnosticCheck } from "@/types";

function hasWindow() {
  return typeof window !== "undefined";
}

function support(id: string, label: string, supported: boolean, detail: string): BrowserCapability {
  return {
    id,
    label,
    supported,
    status: supported ? "정상" : "미지원",
    detail
  };
}

function canUseStorage(kind: "localStorage" | "sessionStorage") {
  if (!hasWindow()) return false;
  try {
    const key = `postkit-diagnostic-${kind}`;
    window[kind].setItem(key, "1");
    window[kind].removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function canCreateCanvas() {
  if (!hasWindow() || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("2d"));
  } catch {
    return false;
  }
}

function canvasHasToBlob() {
  if (!hasWindow() || typeof document === "undefined") return false;
  try {
    return typeof document.createElement("canvas").toBlob === "function";
  } catch {
    return false;
  }
}

function canvasHasCaptureStream() {
  if (!hasWindow() || typeof document === "undefined") return false;
  try {
    return typeof document.createElement("canvas").captureStream === "function";
  } catch {
    return false;
  }
}

function supportsWebMRecorder() {
  if (typeof MediaRecorder === "undefined") return false;
  try {
    return MediaRecorder.isTypeSupported("video/webm;codecs=vp9") || MediaRecorder.isTypeSupported("video/webm;codecs=vp8") || MediaRecorder.isTypeSupported("video/webm");
  } catch {
    return false;
  }
}

export function getBrowserCapabilities(): BrowserCapability[] {
  if (!hasWindow()) {
    return [
      support("browser", "브라우저 런타임", false, "서버 렌더링 중에는 브라우저 기능을 확인할 수 없습니다.")
    ];
  }

  return [
    support("localStorage", "localStorage", canUseStorage("localStorage"), "브라우저 내부 저장소 사용 가능 여부"),
    support("sessionStorage", "sessionStorage", canUseStorage("sessionStorage"), "현재 탭 세션 저장소 사용 가능 여부"),
    support("clipboard", "navigator.clipboard", Boolean(navigator.clipboard), "복사 버튼 지원 여부"),
    support("share", "navigator.share", typeof navigator.share === "function", "운영체제 공유창 지원 여부"),
    support("canShare", "navigator.canShare", typeof navigator.canShare === "function", "파일 공유 가능성 사전 확인 지원 여부"),
    support("canvas", "Canvas API", canCreateCanvas(), "Studio PNG 렌더링에 필요한 Canvas 2D 지원 여부"),
    support("canvasToBlob", "canvas.toBlob", canvasHasToBlob(), "Canvas 결과를 PNG Blob으로 변환할 수 있는지"),
    support("canvasCaptureStream", "canvas.captureStream", canvasHasCaptureStream(), "Video Studio WebM 생성을 위한 Canvas stream 지원 여부"),
    support("file", "File API", typeof File !== "undefined", "업로드 파일 객체 지원 여부"),
    support("blob", "Blob", typeof Blob !== "undefined", "다운로드 파일 생성 지원 여부"),
    support("createObjectUrl", "URL.createObjectURL", typeof URL !== "undefined" && typeof URL.createObjectURL === "function", "임시 다운로드 URL 생성 지원 여부"),
    support("revokeObjectUrl", "URL.revokeObjectURL", typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function", "임시 URL 해제 지원 여부"),
    support("fileReader", "FileReader", typeof FileReader !== "undefined", "파일 미리보기 읽기 지원 여부"),
    support("webWorker", "Web Workers", typeof Worker !== "undefined", "향후 무거운 진단 분리 가능 여부"),
    support("requestAnimationFrame", "requestAnimationFrame", typeof window.requestAnimationFrame === "function", "Studio 미리보기 렌더링 스케줄링 지원 여부"),
    support("mediaRecorder", "MediaRecorder", typeof MediaRecorder !== "undefined", "Video Studio WebM 녹화 지원 여부"),
    support("webmRecorder", "WebM mimeType", supportsWebMRecorder(), "MediaRecorder WebM mimeType 지원 여부"),
    support("getUserMedia", "getUserMedia", Boolean(navigator.mediaDevices?.getUserMedia), "권한 요청 없이 API 존재만 확인했습니다."),
    support("indexedDb", "IndexedDB", typeof indexedDB !== "undefined", "향후 큰 로컬 데이터 저장소 후보"),
    support("serviceWorker", "Service Worker", "serviceWorker" in navigator, "향후 오프라인/캐시 지원 후보"),
    support("notification", "Notification API", typeof Notification !== "undefined", "권한 요청 없이 API 존재만 확인했습니다.")
  ];
}

export function browserCapabilitiesToChecks(capabilities: BrowserCapability[]): DiagnosticCheck[] {
  return capabilities.map((capability) => ({
    id: `browser-${capability.id}`,
    category: "브라우저 지원 기능",
    label: capability.label,
    status: capability.status,
    code: capability.supported ? "BROWSER_FEATURE_SUPPORTED" : "BROWSER_FEATURE_UNSUPPORTED",
    message: capability.detail,
    fix: capability.supported ? undefined : "지원하지 않는 브라우저 기능입니다. 해당 기능은 fallback 흐름으로 확인하세요."
  }));
}
