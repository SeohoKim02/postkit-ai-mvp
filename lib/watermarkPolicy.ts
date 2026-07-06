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

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
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

  const fontSize = Math.round(clamp(Math.min(width, height) * 0.025, 12, 30));
  const paddingX = Math.round(fontSize * 0.78);
  const paddingY = Math.round(fontSize * 0.48);
  const boxRadius = Math.round(fontSize * 0.52);
  const bottomMargin = Math.max(Math.round(height * (placement.bottomSafeRatio ?? 0.045)), Math.round(fontSize * 1.75));
  const rightMargin = Math.max(Math.round(width * (placement.rightSafeRatio ?? 0.045)), Math.round(fontSize * 1.45));

  context.save();
  context.font = `800 ${fontSize}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textBaseline = "middle";
  context.textAlign = "left";

  const textWidth = context.measureText(status.text).width;
  const boxWidth = Math.round(textWidth + paddingX * 2);
  const boxHeight = Math.round(fontSize + paddingY * 2);
  const x = Math.max(Math.round(width * 0.03), width - rightMargin - boxWidth);
  const y = Math.max(Math.round(height * 0.03), height - bottomMargin - boxHeight);

  drawRoundedRect(context, x, y, boxWidth, boxHeight, boxRadius);
  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.2)";
  context.lineWidth = Math.max(1, Math.round(fontSize * 0.06));
  context.stroke();

  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.fillText(status.text, x + paddingX, y + boxHeight / 2);
  context.restore();
}
