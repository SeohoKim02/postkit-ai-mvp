"use client";

import {
  getConsentRecords,
  getInfringementReports,
  getPrivacyAuditLog,
  getPrivacyPreferences,
  getRetentionSettings
} from "@/lib/privacyStorage";
import { readStorageEntries } from "@/lib/diagnostics/storageChecks";
import type { DiagnosticCheck } from "@/types";

const rawContentPattern = /(caption|캡션|hashtags|해시태그|data:image\/|data:video\/|blob:)/i;
const secretPattern = /(sk-[A-Za-z0-9]{12,}|AKIA[0-9A-Z]{12,}|BEGIN PRIVATE KEY|api[_-]?key|auth[_-]?token|session[_-]?secret|password)/i;

function check(input: Omit<DiagnosticCheck, "category">): DiagnosticCheck {
  return { category: "개인정보 설정 상태", ...input };
}

function valueContainsPattern(value: unknown, pattern: RegExp): boolean {
  if (typeof value === "string") return pattern.test(value);
  if (Array.isArray(value)) return value.some((item) => valueContainsPattern(item, pattern));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => pattern.test(key) || valueContainsPattern(nested, pattern));
  }
  return false;
}

export function getPrivacyDiagnostics(): DiagnosticCheck[] {
  const preferences = getPrivacyPreferences();
  const retention = getRetentionSettings();
  const audit = getPrivacyAuditLog();
  const consent = getConsentRecords();
  const reports = getInfringementReports();
  const checks: DiagnosticCheck[] = [];

  checks.push(check({
    id: "privacy-preferences",
    label: "개인정보 설정",
    status: preferences ? "정상" : "확인 필요",
    code: preferences ? "PRIVACY_PREFERENCES_PRESENT" : "PRIVACY_PREFERENCES_MISSING",
    message: preferences ? "개인정보 설정을 불러왔습니다." : "개인정보 설정이 아직 생성되지 않았습니다."
  }));

  checks.push(check({
    id: "privacy-global-training",
    label: "전체 모델 학습 동의",
    status: preferences.globalAiTrainingAllowed ? "오류" : "정상",
    code: preferences.globalAiTrainingAllowed ? "GLOBAL_AI_TRAINING_ENABLED" : "GLOBAL_AI_TRAINING_DISABLED",
    message: preferences.globalAiTrainingAllowed
      ? "전체 모델 학습 동의가 켜져 있습니다. 현재 정책은 기본 비동의입니다."
      : "사용자 콘텐츠를 전체 모델 학습에 사용하지 않는 기본 정책이 유지됩니다."
  }));

  checks.push(check({
    id: "privacy-personalization",
    label: "내 스타일 학습",
    status: preferences.personalizationLearningAllowed ? "정상" : "확인 필요",
    code: preferences.personalizationLearningAllowed ? "PERSONALIZATION_ALLOWED" : "PERSONALIZATION_DISABLED",
    message: preferences.personalizationLearningAllowed ? "개인 맞춤 학습이 허용되어 있습니다." : "개인 맞춤 학습이 꺼져 있어 새 학습 행동은 저장하지 않습니다."
  }));

  checks.push(check({
    id: "privacy-retention",
    label: "원본 파일 보관 기간",
    status: "정상",
    code: "RETENTION_SETTING_PRESENT",
    message: `현재 보관 정책: ${retention.originalFileRetention}`
  }));

  checks.push(check({
    id: "privacy-audit-log",
    label: "감사 로그",
    status: audit.length > 0 ? "정상" : "실행 전",
    code: audit.length > 0 ? "PRIVACY_AUDIT_EXISTS" : "PRIVACY_AUDIT_NOT_CREATED",
    message: audit.length > 0 ? `감사 이벤트 ${audit.length}개가 있습니다.` : "아직 개인정보 감사 이벤트가 없습니다."
  }));

  const auditHasRawContent = audit.some((entry) => valueContainsPattern(entry, rawContentPattern));
  if (auditHasRawContent) {
    checks.push(check({
      id: "privacy-audit-raw-content",
      label: "감사 로그 원문 저장",
      status: "오류",
      code: "PRIVACY_AUDIT_RAW_CONTENT",
      message: "감사 로그에 캡션, 이미지 데이터 또는 Blob URL처럼 보이는 값이 있습니다. 값 자체는 표시하지 않습니다."
    }));
  }

  const sensitiveStorageKeys = readStorageEntries()
    .filter((entry) => entry.parseOk && entry.exists && valueContainsPattern(entry.parsed, secretPattern))
    .map((entry) => entry.key);
  if (sensitiveStorageKeys.length > 0) {
    checks.push(check({
      id: "privacy-sensitive-storage",
      label: "민감 문자열 저장",
      status: "오류",
      code: "SENSITIVE_PATTERN_STORED",
      message: `API 키, 토큰, 비밀번호처럼 보이는 값이 있는 키 ${sensitiveStorageKeys.length}개를 발견했습니다. 값 자체는 표시하지 않습니다.`,
      metadata: { count: sensitiveStorageKeys.length }
    }));
  } else {
    checks.push(check({
      id: "privacy-sensitive-storage-ok",
      label: "민감 문자열 저장",
      status: "정상",
      code: "NO_SENSITIVE_PATTERN_STORED",
      message: "관리 중인 localStorage 키에서 민감 문자열 패턴을 발견하지 못했습니다."
    }));
  }

  checks.push(check({
    id: "privacy-consent-reports",
    label: "권리 확인·신고 기록",
    status: consent.length || reports.length ? "정상" : "실행 전",
    code: "PRIVACY_RECORDS_SUMMARY",
    message: `동의 기록 ${consent.length}개, 권리 침해 신고 ${reports.length}개가 있습니다.`
  }));

  return checks;
}
