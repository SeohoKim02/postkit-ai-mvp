"use client";

import { exportPresets } from "@/lib/exportPresets";
import { getExportHistory } from "@/lib/exportStorage";
import { getHistory } from "@/lib/storage";
import { getBrowserCapabilities } from "@/lib/diagnostics/browserChecks";
import type { DiagnosticCheck } from "@/types";

function check(input: Omit<DiagnosticCheck, "category">): DiagnosticCheck {
  return { category: "내보내기·공유 상태", ...input };
}

export function getExportDiagnostics(): DiagnosticCheck[] {
  const capabilities = getBrowserCapabilities();
  const share = capabilities.find((item) => item.id === "share");
  const canShare = capabilities.find((item) => item.id === "canShare");
  const clipboard = capabilities.find((item) => item.id === "clipboard");
  const contentIds = new Set(getHistory().map((item) => item.package.id));
  const entries = getExportHistory();
  const presetPlatforms = new Set(exportPresets.map((preset) => preset.platform));
  const badPlatform = entries.filter((entry) => !presetPlatforms.has(entry.platform));
  const missingContent = entries.filter((entry) => entry.contentId && !contentIds.has(entry.contentId));
  const repeatedFailures = entries.filter((entry) => entry.status === "failed");

  return [
    check({
      id: "export-web-share",
      label: "Web Share",
      status: share?.supported ? "정상" : "미지원",
      code: share?.supported ? "WEB_SHARE_SUPPORTED" : "WEB_SHARE_UNSUPPORTED",
      message: share?.supported ? "운영체제 공유창을 열 수 있습니다." : "공유 미지원 시 다운로드와 복사 fallback을 사용합니다."
    }),
    check({
      id: "export-file-share",
      label: "파일 공유 사전 확인",
      status: canShare?.supported ? "정상" : "미지원",
      code: canShare?.supported ? "CAN_SHARE_SUPPORTED" : "CAN_SHARE_UNSUPPORTED",
      message: canShare?.supported ? "navigator.canShare로 파일 공유 가능 여부를 확인할 수 있습니다." : "파일 공유 가능 여부를 사전에 확인할 수 없습니다."
    }),
    check({
      id: "export-clipboard",
      label: "Clipboard",
      status: clipboard?.supported ? "정상" : "미지원",
      code: clipboard?.supported ? "CLIPBOARD_SUPPORTED" : "CLIPBOARD_UNSUPPORTED",
      message: clipboard?.supported ? "텍스트 복사 API를 사용할 수 있습니다." : "복사 기능이 브라우저 정책에 따라 제한될 수 있습니다."
    }),
    check({
      id: "export-presets",
      label: "플랫폼 프리셋",
      status: exportPresets.length > 0 ? "정상" : "오류",
      code: exportPresets.length > 0 ? "EXPORT_PRESETS_PRESENT" : "EXPORT_PRESETS_MISSING",
      message: `내보내기 프리셋 ${exportPresets.length}개가 등록되어 있습니다. 실제 SNS 자동 게시 API는 연결되어 있지 않습니다.`
    }),
    check({
      id: "export-history-content",
      label: "내보내기 콘텐츠 참조",
      status: missingContent.length === 0 ? "정상" : "확인 필요",
      code: missingContent.length === 0 ? "EXPORT_CONTENT_REFERENCES_OK" : "EXPORT_CONTENT_REFERENCE_MISSING",
      message: missingContent.length === 0 ? "존재하지 않는 콘텐츠 참조가 없습니다." : `존재하지 않는 콘텐츠를 참조하는 내보내기 기록 ${missingContent.length}개가 있습니다.`
    }),
    check({
      id: "export-platform-id",
      label: "플랫폼 ID",
      status: badPlatform.length === 0 ? "정상" : "확인 필요",
      code: badPlatform.length === 0 ? "EXPORT_PLATFORM_VALID" : "EXPORT_PLATFORM_INVALID",
      message: badPlatform.length === 0 ? "잘못된 플랫폼 ID가 없습니다." : `잘못된 플랫폼 ID를 가진 내보내기 기록 ${badPlatform.length}개가 있습니다.`
    }),
    check({
      id: "export-failures",
      label: "실패 반복",
      status: repeatedFailures.length < 5 ? "정상" : "확인 필요",
      code: repeatedFailures.length < 5 ? "EXPORT_FAILURES_ACCEPTABLE" : "EXPORT_FAILURES_REPEATED",
      message: repeatedFailures.length < 5 ? "반복 실패가 과도하지 않습니다." : `실패 상태 내보내기 기록 ${repeatedFailures.length}개가 있습니다.`
    }),
    check({
      id: "export-credit-policy",
      label: "크레딧 정책",
      status: "정상",
      code: "EXPORT_NO_CREDIT_DEBIT",
      message: "다운로드, 복사, Web Share, 플랫폼 열기에는 크레딧을 차감하지 않는 정책입니다."
    })
  ];
}
