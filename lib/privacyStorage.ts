"use client";

import { ALL_POSTKIT_STORAGE_KEYS, APP_EVENT_KEYS, STORAGE_KEYS } from "@/lib/storageKeys";
import type {
  ConsentRecord,
  ConsentRecordType,
  GeneratedPackage,
  HistoryItem,
  InfringementReport,
  PrivacyAuditEventType,
  PrivacyAuditLogEntry,
  PrivacyPreferences,
  RetentionCleanupCandidate,
  RetentionOption,
  RetentionSettings
} from "@/types";

export const privacyPreferencesKey = STORAGE_KEYS.privacyPreferences;
export const consentRecordsKey = STORAGE_KEYS.consentRecords;
export const privacyAuditLogKey = STORAGE_KEYS.privacyAuditLog;
export const infringementReportsKey = STORAGE_KEYS.infringementReports;
export const retentionSettingsKey = STORAGE_KEYS.retentionSettings;

const historyKey = STORAGE_KEYS.history;
const currentResultKey = STORAGE_KEYS.currentResult;
const personalizationKey = STORAGE_KEYS.personalizationProfile;
const exportHistoryKey = STORAGE_KEYS.exportHistory;
const exportPreferencesKey = STORAGE_KEYS.exportPreferences;
const schedulesKey = STORAGE_KEYS.contentSchedules;
const campaignsKey = STORAGE_KEYS.campaigns;
const ideasKey = STORAGE_KEYS.contentIdeas;
const notificationsKey = STORAGE_KEYS.notifications;
const calendarPreferencesKey = STORAGE_KEYS.calendarPreferences;
const designProjectsKey = STORAGE_KEYS.designProjects;
const designPreferencesKey = STORAGE_KEYS.designPreferences;
const aiRequestHistoryKey = STORAGE_KEYS.aiRequestHistory;
const aiPreferencesKey = STORAGE_KEYS.aiPreferences;

export type DeleteDataScope =
  | "uploads"
  | "generated"
  | "history"
  | "personalization"
  | "exports"
  | "planning"
  | "all";

export const defaultPrivacyPreferences: PrivacyPreferences = {
  version: 1,
  personalizationLearningAllowed: true,
  contentAutoSaveAllowed: true,
  originalFileStorageAllowed: false,
  analyticsAllowed: false,
  marketingNotificationsAllowed: false,
  globalAiTrainingAllowed: false,
  updatedAt: new Date(0).toISOString()
};

export const defaultRetentionSettings: RetentionSettings = {
  version: 1,
  originalFileRetention: "none",
  updatedAt: new Date(0).toISOString()
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readArray<T>(key: string): T[] {
  const value = readJson<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizePreferences(value: unknown): PrivacyPreferences {
  const raw = value && typeof value === "object" ? (value as Partial<PrivacyPreferences>) : {};
  return {
    version: 1,
    personalizationLearningAllowed: safeBoolean(raw.personalizationLearningAllowed, defaultPrivacyPreferences.personalizationLearningAllowed),
    contentAutoSaveAllowed: safeBoolean(raw.contentAutoSaveAllowed, defaultPrivacyPreferences.contentAutoSaveAllowed),
    originalFileStorageAllowed: safeBoolean(raw.originalFileStorageAllowed, defaultPrivacyPreferences.originalFileStorageAllowed),
    analyticsAllowed: safeBoolean(raw.analyticsAllowed, defaultPrivacyPreferences.analyticsAllowed),
    marketingNotificationsAllowed: safeBoolean(raw.marketingNotificationsAllowed, defaultPrivacyPreferences.marketingNotificationsAllowed),
    globalAiTrainingAllowed: safeBoolean(raw.globalAiTrainingAllowed, false),
    updatedAt: safeString(raw.updatedAt, new Date().toISOString())
  };
}

function normalizeRetention(value: unknown): RetentionSettings {
  const raw = value && typeof value === "object" ? (value as Partial<RetentionSettings>) : {};
  const allowed: RetentionOption[] = ["none", "7d", "30d", "90d", "until_deleted"];
  const option = allowed.includes(raw.originalFileRetention as RetentionOption)
    ? (raw.originalFileRetention as RetentionOption)
    : defaultRetentionSettings.originalFileRetention;

  return {
    version: 1,
    originalFileRetention: option,
    lastCleanupAt: typeof raw.lastCleanupAt === "string" ? raw.lastCleanupAt : undefined,
    updatedAt: safeString(raw.updatedAt, new Date().toISOString())
  };
}

function notifyPrivacyUpdated() {
  if (isBrowser()) {
    window.dispatchEvent(new Event(APP_EVENT_KEYS.privacyUpdated));
  }
}

export function addPrivacyAuditEvent(eventType: PrivacyAuditEventType) {
  const current = readArray<PrivacyAuditLogEntry>(privacyAuditLogKey);
  const entry: PrivacyAuditLogEntry = {
    id: createId("privacy-audit"),
    version: 1,
    eventType,
    createdAt: new Date().toISOString()
  };

  writeJson(privacyAuditLogKey, [entry, ...current].slice(0, 300));
  return entry;
}

export function getPrivacyAuditLog() {
  return readArray<PrivacyAuditLogEntry>(privacyAuditLogKey).filter(
    (entry) => typeof entry.id === "string" && typeof entry.createdAt === "string"
  );
}

export function addConsentRecord(type: ConsentRecordType, granted: boolean) {
  const current = readArray<ConsentRecord>(consentRecordsKey);
  const entry: ConsentRecord = {
    id: createId("consent"),
    version: 1,
    type,
    granted,
    createdAt: new Date().toISOString()
  };

  writeJson(consentRecordsKey, [entry, ...current].slice(0, 200));
  return entry;
}

export function getConsentRecords() {
  return readArray<ConsentRecord>(consentRecordsKey).filter(
    (record) => typeof record.id === "string" && typeof record.createdAt === "string"
  );
}

export function getPrivacyPreferences() {
  return normalizePreferences(readJson<unknown>(privacyPreferencesKey, defaultPrivacyPreferences));
}

export function savePrivacyPreferences(nextPreferences: PrivacyPreferences) {
  const previous = getPrivacyPreferences();
  const next = normalizePreferences({
    ...nextPreferences,
    globalAiTrainingAllowed: Boolean(nextPreferences.globalAiTrainingAllowed),
    updatedAt: new Date().toISOString()
  });

  writeJson(privacyPreferencesKey, next);
  addConsentRecord("privacy_preferences", true);
  addPrivacyAuditEvent("consent_updated");

  if (previous.personalizationLearningAllowed !== next.personalizationLearningAllowed) {
    addPrivacyAuditEvent(next.personalizationLearningAllowed ? "personalization_enabled" : "personalization_disabled");
  }

  if (previous.globalAiTrainingAllowed !== next.globalAiTrainingAllowed) {
    addConsentRecord("global_ai_training", next.globalAiTrainingAllowed);
  }

  notifyPrivacyUpdated();
  return next;
}

export function isPersonalizationLearningAllowed() {
  return getPrivacyPreferences().personalizationLearningAllowed;
}

export function getRetentionSettings() {
  return normalizeRetention(readJson<unknown>(retentionSettingsKey, defaultRetentionSettings));
}

export function saveRetentionSettings(nextSettings: RetentionSettings) {
  const next = normalizeRetention({
    ...nextSettings,
    updatedAt: new Date().toISOString()
  });

  writeJson(retentionSettingsKey, next);
  addPrivacyAuditEvent("retention_changed");
  notifyPrivacyUpdated();
  return next;
}

function sanitizePackageUploadData(value: GeneratedPackage): GeneratedPackage {
  return {
    ...value,
    input: {
      ...value.input,
      uploadedFileName: undefined,
      uploadedPreview: undefined,
      uploadedAssetId: undefined,
      uploadedFileType: undefined
    }
  };
}

// 정리 대상으로 판정된 콘텐츠만 업로드 참조를 제거한다.
// 전체를 무차별 제거하면 방금 생성해 작업 중인 콘텐츠의 사진 연결까지 끊어진다.
function sanitizeHistoryUploads(candidateIds: Set<string>) {
  const history = readArray<HistoryItem>(historyKey);
  const nextHistory = history
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      package: item.package && candidateIds.has(item.id) ? sanitizePackageUploadData(item.package) : item.package
    }));
  writeJson(historyKey, nextHistory);

  const current = readJson<GeneratedPackage | null>(currentResultKey, null);
  if (current && typeof current === "object" && "input" in current && candidateIds.has(current.id)) {
    writeJson(currentResultKey, sanitizePackageUploadData(current));
  }
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function retentionDays(option: RetentionOption) {
  if (option === "7d") {
    return 7;
  }
  if (option === "30d") {
    return 30;
  }
  if (option === "90d") {
    return 90;
  }
  return null;
}

export function getRetentionCleanupCandidates(): RetentionCleanupCandidate[] {
  const settings = getRetentionSettings();
  const history = readArray<HistoryItem>(historyKey);
  const now = Date.now();
  const days = retentionDays(settings.originalFileRetention);

  if (settings.originalFileRetention === "until_deleted") {
    return [];
  }

  return history
    .filter((item) => item && typeof item === "object")
    .filter((item) => Boolean(item.package?.input?.uploadedFileName))
    .filter((item) => {
      const createdAt = parseDate(item.createdAt);
      if (!createdAt) {
        return true;
      }

      if (settings.originalFileRetention === "none") {
        // 즉시 지우면 방금 만든 콘텐츠의 Studio/Video 사진 연결이 끊어지므로
        // "저장 안 함"도 작업 세션을 보호하는 24시간 유예 후 참조를 정리한다.
        return now - createdAt.getTime() > 24 * 60 * 60 * 1000;
      }

      if (!days) {
        return false;
      }

      return now - createdAt.getTime() > days * 24 * 60 * 60 * 1000;
    })
    .map((item) => ({
      id: item.id,
      label: item.package?.title ?? "제목 없는 콘텐츠",
      reason:
        settings.originalFileRetention === "none"
          ? "원본 파일 저장 안 함 정책에 따라 정리 대상입니다."
          : `${settings.originalFileRetention.replace("d", "일")} 보관 기간을 지난 원본 파일 정리 대상입니다.`
    }));
}

export function cleanupExpiredMockUploads() {
  const candidates = getRetentionCleanupCandidates();
  if (candidates.length === 0) {
    return { deletedCount: 0 };
  }

  sanitizeHistoryUploads(new Set(candidates.map((candidate) => candidate.id)));
  const nextSettings = {
    ...getRetentionSettings(),
    lastCleanupAt: new Date().toISOString()
  };
  writeJson(retentionSettingsKey, nextSettings);
  addPrivacyAuditEvent("content_deleted");
  return { deletedCount: candidates.length };
}

export function addInfringementReport(input: Pick<InfringementReport, "reportType" | "targetContentId" | "targetUrl" | "reason" | "requestedAction">) {
  const current = readArray<InfringementReport>(infringementReportsKey);
  const now = new Date().toISOString();
  const report: InfringementReport = {
    id: createId("rights-report"),
    version: 1,
    reportType: input.reportType,
    targetContentId: input.targetContentId?.trim() || undefined,
    targetUrl: input.targetUrl?.trim() || undefined,
    reason: input.reason.trim(),
    requestedAction: input.requestedAction.trim(),
    status: "접수됨",
    createdAt: now,
    updatedAt: now
  };

  writeJson(infringementReportsKey, [report, ...current].slice(0, 100));
  addPrivacyAuditEvent("infringement_reported");
  return report;
}

export function getInfringementReports() {
  return readArray<InfringementReport>(infringementReportsKey).filter(
    (report) => typeof report.id === "string" && typeof report.createdAt === "string"
  );
}

export function collectPostKitDataForExport() {
  if (!isBrowser()) {
    return {
      exportedAt: new Date().toISOString(),
      keys: {}
    };
  }

  const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("postkit-")).sort();
  const values = keys.reduce<Record<string, unknown>>((acc, key) => {
    try {
      const raw = window.localStorage.getItem(key);
      acc[key] = raw ? JSON.parse(raw) : null;
    } catch {
      acc[key] = "[unreadable-json]";
    }
    return acc;
  }, {});

  addPrivacyAuditEvent("data_exported");

  return {
    exportedAt: new Date().toISOString(),
    note: "이 브라우저(localStorage)에 저장된 PostKit 데이터의 내보내기 파일입니다.",
    keys: values
  };
}

function removeKeys(keys: string[]) {
  if (!isBrowser()) {
    return;
  }

  keys.forEach((key) => window.localStorage.removeItem(key));
}

export function deleteDataScope(scope: DeleteDataScope) {
  if (!isBrowser()) {
    return { ok: false, message: "브라우저에서만 삭제할 수 있어요." };
  }

  try {
    if (scope === "uploads") {
      // 사용자가 명시적으로 요청한 삭제이므로 모든 콘텐츠의 업로드 참조를 정리한다.
      const allIds = new Set(
        readArray<HistoryItem>(historyKey)
          .filter((item) => item && typeof item === "object" && typeof item.id === "string")
          .map((item) => item.id)
      );
      const current = readJson<GeneratedPackage | null>(currentResultKey, null);
      if (current && typeof current === "object" && typeof current.id === "string") {
        allIds.add(current.id);
      }
      sanitizeHistoryUploads(allIds);
      addPrivacyAuditEvent("content_deleted");
      return { ok: true, message: "업로드 파일 참조를 정리했어요." };
    }

    if (scope === "generated" || scope === "history") {
      removeKeys([historyKey, currentResultKey, designProjectsKey, designPreferencesKey, aiRequestHistoryKey]);
      addPrivacyAuditEvent("content_deleted");
      return { ok: true, message: scope === "history" ? "History를 삭제했어요." : "생성 결과를 삭제했어요." };
    }

    if (scope === "personalization") {
      removeKeys([personalizationKey, aiPreferencesKey]);
      addPrivacyAuditEvent("personalization_deleted");
      return { ok: true, message: "개인 맞춤 학습 데이터를 삭제했어요." };
    }

    if (scope === "exports") {
      removeKeys([exportHistoryKey, exportPreferencesKey]);
      addPrivacyAuditEvent("content_deleted");
      return { ok: true, message: "내보내기 기록을 삭제했어요." };
    }

    if (scope === "planning") {
      removeKeys([schedulesKey, campaignsKey, ideasKey, notificationsKey, calendarPreferencesKey]);
      addPrivacyAuditEvent("content_deleted");
      return { ok: true, message: "캠페인과 일정을 삭제했어요." };
    }

    const keys = Array.from(new Set([...ALL_POSTKIT_STORAGE_KEYS, ...Object.keys(window.localStorage).filter((key) => key.startsWith("postkit-"))]));
    removeKeys(keys);
    addPrivacyAuditEvent("all_data_deleted");
    notifyPrivacyUpdated();
    return { ok: true, message: "전체 계정 데이터를 삭제했어요. 감사 기록에는 삭제 이벤트만 남겼습니다." };
  } catch {
    return { ok: false, message: "삭제 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}

export function getPrivacyStorageKeys() {
  return {
    privacyPreferencesKey,
    consentRecordsKey,
    privacyAuditLogKey,
    infringementReportsKey,
    retentionSettingsKey
  };
}
