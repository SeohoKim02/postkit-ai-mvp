"use client";

import type { ShareResult } from "@/types";

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

function getShareNavigator() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator as NavigatorWithShare;
}

export function isWebShareSupported() {
  return Boolean(getShareNavigator()?.share);
}

export function canShareFiles(files: File[]) {
  const shareNavigator = getShareNavigator();

  if (!shareNavigator?.canShare || files.length === 0) {
    return false;
  }

  try {
    return shareNavigator.canShare({ files });
  } catch {
    return false;
  }
}

export async function shareUploadPackage({
  title,
  text,
  url,
  files = []
}: {
  title: string;
  text: string;
  url?: string;
  files?: File[];
}): Promise<ShareResult> {
  const shareNavigator = getShareNavigator();

  if (!shareNavigator?.share) {
    return {
      ok: false,
      shared: false,
      fallbackUsed: true,
      message: "이 브라우저는 SNS 공유창을 지원하지 않아 fallback 흐름을 사용해야 해요."
    };
  }

  const data: ShareData = {
    title,
    text,
    url
  };

  if (files.length > 0 && canShareFiles(files)) {
    data.files = files;
  }

  try {
    await shareNavigator.share(data);
    return {
      ok: true,
      shared: true,
      fallbackUsed: false,
      message: "운영체제 공유창으로 전달했어요. 원하는 SNS 앱을 직접 선택해 주세요."
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        shared: false,
        fallbackUsed: false,
        canceled: true,
        message: "공유를 취소했어요. 다운로드와 복사는 언제든 다시 시도할 수 있습니다."
      };
    }

    return {
      ok: false,
      shared: false,
      fallbackUsed: true,
      message: "공유가 취소되었거나 실패했어요. 파일 다운로드와 문구 복사로 이어갈 수 있어요.",
      error: error instanceof Error ? error.message : "공유 실패"
    };
  }
}

export function openPlatformUrl(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
