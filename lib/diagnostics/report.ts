"use client";

import { getAiPreferences, getAiRequestHistory } from "@/lib/ai/requestStorage";
import { AI_TASK_TYPES } from "@/lib/ai/types";
import { getAccountDiagnostics } from "@/lib/diagnostics/accountChecks";
import { getBrowserCapabilities, browserCapabilitiesToChecks } from "@/lib/diagnostics/browserChecks";
import { getCreditDiagnostics } from "@/lib/diagnostics/creditChecks";
import { getExportDiagnostics } from "@/lib/diagnostics/exportChecks";
import { getPrivacyDiagnostics } from "@/lib/diagnostics/privacyChecks";
import { getStorageDiagnostics } from "@/lib/diagnostics/storageChecks";
import { diagnosticsAppVersion, diagnosticsVersion, diagnosticStatuses, managedRoutes, defaultQaChecklist } from "@/lib/diagnostics/types";
import { getStudioDiagnostics } from "@/lib/diagnostics/studioChecks";
import { getVideoDiagnostics } from "@/lib/diagnostics/videoChecks";
import { getCurrentAccount, getUserSession } from "@/lib/accountStorage";
import { getLearningActionCount, getPersonalizationLevel, getTopPlatform, getTopStyle } from "@/lib/personalization";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { getPersonalizationProfile } from "@/lib/storage";
import type { DiagnosticCheck, DiagnosticReport, DiagnosticResult, DiagnosticStatus, QaChecklistItem } from "@/types";

function isBrowser() {
  return typeof window !== "undefined";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function summaryFromChecks(checks: DiagnosticCheck[]) {
  const summary = diagnosticStatuses.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<DiagnosticStatus, number>);

  checks.forEach((check) => {
    summary[check.status] += 1;
  });

  return summary;
}

function routeChecks(): DiagnosticCheck[] {
  return managedRoutes.map((route) => ({
    id: `route-${route.path === "/" ? "home" : route.path.slice(1).replaceAll("/", "-")}`,
    category: "라우트 상태",
    label: route.label,
    status: "정상",
    code: "ROUTE_DECLARED",
    message: "관리되는 라우트 목록에 등록되어 있습니다. 실제 HTTP 순회는 실행하지 않았습니다.",
    route: route.path
  }));
}

function appEnvironmentChecks(): DiagnosticCheck[] {
  const diagnosticsFlag = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_ENABLE_DIAGNOSTICS : undefined;

  return [
    {
      id: "app-runtime",
      category: "앱 환경",
      label: "실행 런타임",
      status: isBrowser() ? "정상" : "실행 전",
      code: isBrowser() ? "BROWSER_RUNTIME_READY" : "BROWSER_RUNTIME_REQUIRED",
      message: isBrowser() ? "브라우저 런타임에서 진단을 실행 중입니다." : "브라우저에서 진단센터를 열어야 합니다."
    },
    {
      id: "app-diagnostics-flag",
      category: "앱 환경",
      label: "진단센터 노출 설정",
      status: diagnosticsFlag === "false" ? "확인 필요" : "정상",
      code: "DIAGNOSTICS_FLAG_READY",
      message: "현재 MVP에서는 메뉴에서 진단센터에 접근할 수 있습니다. 실제 서비스에서는 관리자/개발 모드로 제한할 수 있습니다."
    },
    {
      id: "app-no-real-integrations",
      category: "앱 환경",
      label: "실제 외부 연동",
      status: "미구현",
      code: "REAL_INTEGRATIONS_NOT_CONNECTED",
      message: "실제 AI API, 인증, 결제, SNS API, 클라우드 저장은 연결하지 않았습니다."
    }
  ];
}

function aiChecks(): DiagnosticCheck[] {
  const preferences = getAiPreferences();
  const history = getAiRequestHistory();
  const succeeded = history.filter((entry) => entry.status === "succeeded").length;
  const failed = history.filter((entry) => entry.status === "failed" || entry.status === "refunded").length;
  const fallback = history.filter((entry) => entry.usedFallback).length;
  const runningKeys = new Set<string>();
  let duplicates = 0;
  history.forEach((entry) => {
    if (entry.status !== "pending" && entry.status !== "running") return;
    if (runningKeys.has(entry.idempotencyKey)) duplicates += 1;
    runningKeys.add(entry.idempotencyKey);
  });

  return [
    {
      id: "ai-provider",
      category: "AI 서비스 상태",
      label: "현재 provider",
      status: preferences.provider === "mock" ? "정상" : "확인 필요",
      code: preferences.provider === "mock" ? "MOCK_PROVIDER_ACTIVE" : "AI_PROVIDER_UNKNOWN",
      message: preferences.provider === "mock" ? "MockProvider가 기본 공급자로 사용됩니다." : "알 수 없는 provider 설정입니다."
    },
    {
      id: "ai-external-api",
      category: "AI 서비스 상태",
      label: "외부 AI API",
      status: "미구현",
      code: "EXTERNAL_AI_NOT_CONNECTED",
      message: "외부 AI API는 연결하지 않았습니다. API 키 존재 여부는 클라이언트에 노출하지 않습니다."
    },
    {
      id: "ai-health-route",
      category: "AI 서비스 상태",
      label: "AI health route",
      status: "정상",
      code: "AI_HEALTH_ROUTE_DECLARED",
      message: "/api/ai/health 라우트가 프로젝트에 있습니다. 실제 HTTP 호출은 진단에서 자동 실행하지 않습니다.",
      route: "/api/ai/health"
    },
    {
      id: "ai-task-types",
      category: "AI 서비스 상태",
      label: "지원 task type",
      status: AI_TASK_TYPES.length > 0 ? "정상" : "오류",
      code: "AI_TASK_TYPES_DECLARED",
      message: `지원 task type ${AI_TASK_TYPES.length}개가 등록되어 있습니다.`
    },
    {
      id: "ai-request-history",
      category: "AI 서비스 상태",
      label: "AI 요청 기록",
      status: history.length > 0 ? "정상" : "실행 전",
      code: "AI_REQUEST_HISTORY_SUMMARY",
      message: `최근 요청 ${history.length}개 · 성공 ${succeeded}개 · 실패/환불 ${failed}개 · fallback ${fallback}개`
    },
    {
      id: "ai-duplicate-request",
      category: "AI 서비스 상태",
      label: "중복 요청 차단",
      status: duplicates === 0 ? "정상" : "확인 필요",
      code: duplicates === 0 ? "AI_DUPLICATE_REQUESTS_CLEAR" : "AI_DUPLICATE_REQUESTS_ACTIVE",
      message: duplicates === 0 ? "동시에 처리 중인 중복 idempotencyKey를 발견하지 못했습니다." : `처리 중 중복 요청으로 보이는 항목 ${duplicates}개가 있습니다.`
    }
  ];
}

function personalizationChecks(): DiagnosticCheck[] {
  const profile = getPersonalizationProfile();
  return [
    {
      id: "personalization-profile",
      category: "개인화 상태",
      label: "개인화 프로필",
      status: profile ? "정상" : "실행 전",
      code: "PERSONALIZATION_PROFILE_READY",
      message: `${getPersonalizationLevel(profile)} · 선호 스타일 ${getTopStyle(profile)} · 선호 플랫폼 ${getTopPlatform(profile)}`
    },
    {
      id: "personalization-actions",
      category: "개인화 상태",
      label: "학습 행동 수",
      status: getLearningActionCount(profile) > 0 ? "정상" : "실행 전",
      code: "PERSONALIZATION_ACTION_COUNT",
      message: `저장된 학습 행동 ${getLearningActionCount(profile).toLocaleString()}개`
    }
  ];
}

function qaChecklistChecks(): DiagnosticCheck[] {
  const checklist = getQaChecklist();
  const done = checklist.filter((item) => item.checked).length;
  return [
    {
      id: "qa-checklist-summary",
      category: "전체 사용자 흐름 체크리스트",
      label: "수동 QA 체크리스트",
      status: done === checklist.length ? "정상" : "확인 필요",
      code: "QA_CHECKLIST_PROGRESS",
      message: `${done}/${checklist.length}개 수동 체크 완료`
    }
  ];
}

export function runDiagnostics(mode: "light" | "full" = "light"): DiagnosticResult {
  const browserCapabilities = getBrowserCapabilities();
  const checks: DiagnosticCheck[] = [
    ...appEnvironmentChecks(),
    ...browserCapabilitiesToChecks(browserCapabilities),
    ...routeChecks(),
    ...getStorageDiagnostics(mode === "full"),
    ...getCreditDiagnostics(),
    ...getAccountDiagnostics(),
    ...personalizationChecks(),
    ...aiChecks(),
    ...getStudioDiagnostics(),
    ...getVideoDiagnostics(),
    ...getExportDiagnostics(),
    ...getPrivacyDiagnostics(),
    ...qaChecklistChecks()
  ];
  const summary = summaryFromChecks(checks);
  const result: DiagnosticResult = {
    id: createId("diagnostic"),
    generatedAt: new Date().toISOString(),
    mode,
    checks,
    summary,
    unresolvedCount: summary["확인 필요"] + summary["오류"],
    version: diagnosticsVersion
  };
  saveDiagnosticResult(result);
  return result;
}

export function getDiagnosticHistory() {
  return readJson<DiagnosticResult[]>(STORAGE_KEYS.diagnosticHistory, []);
}

export function saveDiagnosticResult(result: DiagnosticResult) {
  const next = [result, ...getDiagnosticHistory().filter((item) => item.id !== result.id)].slice(0, 20);
  writeJson(STORAGE_KEYS.diagnosticHistory, next);
}

export function clearDiagnosticHistory() {
  writeJson(STORAGE_KEYS.diagnosticHistory, []);
}

export function getQaChecklist() {
  const stored = readJson<QaChecklistItem[]>(STORAGE_KEYS.qaChecklist, []);
  if (!Array.isArray(stored) || stored.length === 0) {
    return defaultQaChecklist;
  }

  const storedMap = new Map(stored.map((item) => [item.id, item]));
  return defaultQaChecklist.map((item) => ({ ...item, ...(storedMap.get(item.id) ?? {}) }));
}

export function saveQaChecklist(items: QaChecklistItem[]) {
  writeJson(STORAGE_KEYS.qaChecklist, items);
}

export function updateQaChecklistItem(id: string, checked: boolean) {
  const next = getQaChecklist().map((item) =>
    item.id === id ? { ...item, checked, updatedAt: new Date().toISOString() } : item
  );
  saveQaChecklist(next);
  return next;
}

export function resetQaChecklist() {
  saveQaChecklist(defaultQaChecklist);
  return defaultQaChecklist;
}

export function createDiagnosticReport(result: DiagnosticResult): DiagnosticReport {
  const session = getUserSession();
  const account = getCurrentAccount();
  const browserCapabilities = getBrowserCapabilities();
  const unresolvedChecks = result.checks
    .filter((check) => check.status === "확인 필요" || check.status === "오류" || check.status === "미지원")
    .map((check) => ({
      id: check.id,
      category: check.category,
      status: check.status,
      code: check.code,
      message: check.message,
      targetKey: check.targetKey
    }));

  return {
    schemaVersion: diagnosticsVersion,
    generatedAt: new Date().toISOString(),
    appVersion: diagnosticsAppVersion,
    browserCapabilities,
    routeStatus: result.checks.filter((check) => check.category === "라우트 상태"),
    storageKeyStatus: result.checks.filter((check) => check.category === "저장 데이터 상태").map((check) => ({
      ...check,
      metadata: check.metadata
    })),
    errorCount: result.summary["오류"],
    warningCount: result.summary["확인 필요"],
    mockProviderStatus: "mock",
    currentAccountMode: session.mode ?? "unknown",
    unresolvedChecks: unresolvedChecks.map((check) => ({
      ...check,
      message: account.email ? check.message.replace(account.email, "[redacted-email]") : check.message
    }))
  };
}
