"use client";

import { getCreditAccount } from "@/lib/creditStorage";
import { clamp } from "@/lib/imageUtils";
import type { CreditAccount } from "@/types";

export const POSTKIT_WATERMARK_TEXT = "Made with PostKit";

export type WatermarkStatus = {
  enabled: boolean;
  text: string;
  message: string;
};

type WatermarkPlacement = {
  bottomSafeRatio?: number;
  rightSafeRatio?: number;
  side?: "left" | "right";
  // 배경 밝기에 따른 글자색: light(어두운 배경 → 흰색) / dark(밝은 배경 → 짙은 회색)
  tone?: "light" | "dark";
};

export type WatermarkSpec = {
  text: string;
  fontSize: number;
  opacity: number;
  maxWidthRatio: number;
  marginX: number;
  marginY: number;
  hasBackgroundCard: boolean;
};

// 무료 공개 베타 정책: 서버 인증·결제로 유료 자격을 검증할 수 없으므로
// 플랜과 무관하게 모든 결과물에 워터마크를 적용한다.
// 서버 결제 연동 후 이 함수만 서버 검증 기반으로 바꾸면 제거 정책을 되살릴 수 있다.
function canRemoveWatermark(account: Pick<CreditAccount, "currentPlan" | "subscriptionStatus">) {
  void account;
  return false;
}

export function getPostKitWatermarkStatus(account?: Pick<CreditAccount, "currentPlan" | "subscriptionStatus">): WatermarkStatus {
  const currentAccount = account ?? getCreditAccount({ applyMonthlyGrant: false });
  const enabled = !canRemoveWatermark(currentAccount);

  return {
    enabled,
    text: POSTKIT_WATERMARK_TEXT,
    message: enabled
      ? "무료 베타 기간에는 모든 결과물에 PostKit 워터마크가 표시됩니다."
      : "워터마크 없이 내보냅니다."
  };
}

// 워터마크는 본문보다 덜 눈에 띄는 작은 평문이어야 한다: 배경 카드 없음,
// 캔버스 너비의 16% 이내, 절제된 불투명도(0.42~0.58 범위).
// 크기는 Feed 약 16~20px, Story 약 18~22px. 가장자리 여백은 32~44px.
export function getPostKitWatermarkSpec(width: number, height: number): WatermarkSpec {
  const story = height / width >= 1.6;
  const fontSize = Math.round(clamp(width * (story ? 0.0175 : 0.016), story ? 18 : 16, story ? 22 : 20));

  return {
    text: POSTKIT_WATERMARK_TEXT,
    fontSize,
    opacity: 0.52,
    maxWidthRatio: 0.16,
    marginX: Math.round(clamp(width * 0.034, 32, 44)),
    marginY: Math.round(clamp(height * 0.028, 32, 44)),
    hasBackgroundCard: false
  };
}

export function drawPostKitWatermark(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  placement: WatermarkPlacement = {}
) {
  const status = getPostKitWatermarkStatus();
  if (!status.enabled) {
    return;
  }

  const spec = getPostKitWatermarkSpec(width, height);
  const side = placement.side ?? "right";
  const bottomMargin = Math.max(spec.marginY, Math.round(height * (placement.bottomSafeRatio ?? 0)));
  const sideMargin = Math.max(spec.marginX, Math.round(width * (placement.rightSafeRatio ?? 0)));

  context.save();

  let fontSize = spec.fontSize;
  const wmFont = (size: number) => `600 ${size}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.font = wmFont(fontSize);
  while (context.measureText(spec.text).width > width * spec.maxWidthRatio && fontSize > 12) {
    fontSize -= 1;
    context.font = wmFont(fontSize);
  }

  context.textBaseline = "alphabetic";
  context.textAlign = side === "right" ? "right" : "left";
  const x = side === "right" ? width - sideMargin : sideMargin;
  const y = height - bottomMargin;

  // 그림자는 1px 수준으로만: 흰 글자엔 어두운 그림자, 짙은 글자엔 밝은 그림자.
  const tone = placement.tone ?? "light";
  if (tone === "dark") {
    context.shadowColor = "rgba(255,255,255,0.4)";
    context.shadowBlur = 1;
    context.shadowOffsetY = 0;
    context.fillStyle = `rgba(45,49,58,${spec.opacity + 0.04})`;
  } else {
    context.shadowColor = "rgba(0,0,0,0.42)";
    context.shadowBlur = 1;
    context.shadowOffsetY = 1;
    context.fillStyle = `rgba(255,255,255,${spec.opacity})`;
  }
  context.fillText(spec.text, x, y);
  context.restore();
}
