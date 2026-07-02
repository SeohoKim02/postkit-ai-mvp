"use client";

import { ALL_POSTKIT_STORAGE_KEYS, STORAGE_KEYS } from "@/lib/storageKeys";
import { expectedStorageShapes } from "@/lib/diagnostics/types";
import type { DiagnosticCheck, RepairProposal } from "@/types";

type StorageEntry = {
  key: string;
  exists: boolean;
  raw: string | null;
  parsed: unknown;
  parseOk: boolean;
  size: number;
};

type PostKitStorageKey = (typeof ALL_POSTKIT_STORAGE_KEYS)[number];

const sensitivePattern = /(sk-[A-Za-z0-9]{12,}|AKIA[0-9A-Z]{12,}|BEGIN PRIVATE KEY|api[_-]?key|auth[_-]?token|session[_-]?secret|password|payment|card)/i;
const oversizedStorageBytes = 700_000;

function isBrowser() {
  return typeof window !== "undefined";
}

function createCheck(input: Omit<DiagnosticCheck, "category"> & { category?: DiagnosticCheck["category"] }): DiagnosticCheck {
  return {
    category: "저장 데이터 상태",
    ...input
  };
}

export function readStorageEntry(key: string): StorageEntry {
  if (!isBrowser()) {
    return { key, exists: false, raw: null, parsed: null, parseOk: false, size: 0 };
  }

  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return { key, exists: false, raw, parsed: null, parseOk: true, size: 0 };
  }

  try {
    return { key, exists: true, raw, parsed: JSON.parse(raw), parseOk: true, size: raw.length };
  } catch {
    return { key, exists: true, raw, parsed: null, parseOk: false, size: raw.length };
  }
}

export function readStorageEntries(keys = ALL_POSTKIT_STORAGE_KEYS) {
  return keys.map(readStorageEntry);
}

function valueType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPostKitStorageKey(key: string): key is PostKitStorageKey {
  return (ALL_POSTKIT_STORAGE_KEYS as readonly string[]).includes(key);
}

function hasVersion(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => !isObject(item) || typeof item.version === "number");
  }

  if (isObject(value)) {
    return typeof value.version === "number";
  }

  return true;
}

function findDuplicateIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  value.forEach((item) => {
    if (!isObject(item) || typeof item.id !== "string") return;
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  });

  return Array.from(duplicates);
}

function walkValue(
  value: unknown,
  visitor: (value: unknown, keyPath: string, keyName: string) => void,
  keyPath = "",
  keyName = "",
  depth = 0
) {
  if (depth > 6) return;

  if (Array.isArray(value)) {
    value.slice(0, 300).forEach((item, index) => walkValue(item, visitor, `${keyPath}[${index}]`, String(index), depth + 1));
    return;
  }

  if (!isObject(value)) {
    visitor(value, keyPath, keyName || (keyPath.split(".").pop() ?? ""));
    return;
  }

  Object.entries(value).slice(0, 300).forEach(([key, nested]) => {
    const nextPath = keyPath ? `${keyPath}.${key}` : key;
    visitor(nested, nextPath, key);
    walkValue(nested, visitor, nextPath, key, depth + 1);
  });
}

function shouldDisallowNegative(keyPath: string, keyName: string) {
  if (keyName === "amount" && keyPath.includes("creditLedger")) return false;
  return /(credit|balance|credits|price|count|total|lifetime|width|height|scale|zoom|retryCount|fontScale|version)/i.test(keyName);
}

function scanValue(value: unknown) {
  const invalidDates: string[] = [];
  const badNumbers: string[] = [];
  const sensitiveLocations: string[] = [];
  const mediaLocations: string[] = [];

  walkValue(value, (nested, keyPath, keyName) => {
    if (typeof nested === "number" && (!Number.isFinite(nested) || Number.isNaN(nested) || (nested < 0 && shouldDisallowNegative(keyPath, keyName)))) {
      badNumbers.push(keyPath);
    }

    if (typeof nested === "string") {
      if (sensitivePattern.test(keyName) || sensitivePattern.test(nested)) {
        sensitiveLocations.push(keyPath || keyName);
      }

      if (nested.startsWith("data:image/") || nested.startsWith("data:video/") || nested.startsWith("blob:")) {
        mediaLocations.push(keyPath || keyName);
      }

      const dateLike = /(^|\.)(createdAt|updatedAt|generatedAt|scheduledAt|exportedAt|startedAt|completedAt|lastUpdatedAt|nextCreditGrantAt|billingCycleStartedAt|startDate|endDate|contentDeadline|publishStartAt|publishEndAt)$/i.test(keyPath);
      if (dateLike && nested && Number.isNaN(new Date(nested).getTime())) {
        invalidDates.push(keyPath);
      }
    }
  });

  return { invalidDates, badNumbers, sensitiveLocations, mediaLocations };
}

function statusForShape(entry: StorageEntry) {
  const expected = expectedStorageShapes[entry.key] ?? "any";
  if (expected === "any" || !entry.exists || !entry.parseOk) return null;
  const actual = valueType(entry.parsed);
  if (expected === "array" && actual !== "array") return `배열이어야 하지만 ${actual}입니다.`;
  if (expected === "object" && actual !== "object") return `객체여야 하지만 ${actual}입니다.`;
  return null;
}

export function getStorageDiagnostics(full = false): DiagnosticCheck[] {
  if (!isBrowser()) {
    return [
      createCheck({
        id: "storage-browser-runtime",
        label: "localStorage 접근",
        status: "실행 전",
        code: "BROWSER_RUNTIME_REQUIRED",
        message: "브라우저에서만 localStorage 진단을 실행할 수 있습니다."
      })
    ];
  }

  const checks: DiagnosticCheck[] = [];
  const entries = readStorageEntries();

  entries.forEach((entry) => {
    if (!entry.exists) {
      checks.push(createCheck({
        id: `storage-${entry.key}-missing`,
        label: entry.key,
        status: "실행 전",
        code: "STORAGE_KEY_NOT_CREATED_YET",
        targetKey: entry.key,
        message: "아직 생성되지 않은 localStorage 키입니다. 기능을 사용하면 생성될 수 있습니다."
      }));
      return;
    }

    if (!entry.parseOk) {
      checks.push(createCheck({
        id: `storage-${entry.key}-json`,
        label: entry.key,
        status: "오류",
        code: "STORAGE_JSON_PARSE_ERROR",
        targetKey: entry.key,
        message: "저장된 JSON을 파싱할 수 없습니다.",
        fix: "해당 키를 백업한 뒤 기본값으로 복구하세요."
      }));
      return;
    }

    const shapeError = statusForShape(entry);
    if (shapeError) {
      checks.push(createCheck({
        id: `storage-${entry.key}-shape`,
        label: entry.key,
        status: "오류",
        code: "STORAGE_TYPE_MISMATCH",
        targetKey: entry.key,
        message: shapeError,
        fix: "백업 후 기본값 복구 또는 올바른 데이터 가져오기를 실행하세요."
      }));
    } else {
      checks.push(createCheck({
        id: `storage-${entry.key}-shape-ok`,
        label: entry.key,
        status: "정상",
        code: "STORAGE_KEY_READABLE",
        targetKey: entry.key,
        message: `JSON 파싱과 기본 타입 확인을 통과했습니다. (${entry.size.toLocaleString()} bytes)`
      }));
    }

    if (entry.size > oversizedStorageBytes) {
      checks.push(createCheck({
        id: `storage-${entry.key}-size`,
        label: `${entry.key} 크기`,
        status: "확인 필요",
        code: "STORAGE_KEY_OVERSIZED",
        targetKey: entry.key,
        message: "데이터가 커서 브라우저 성능에 영향을 줄 수 있습니다.",
        fix: "필요 없는 기록을 내보낸 뒤 정리하세요.",
        metadata: { size: entry.size }
      }));
    }

    if (full) {
      if (!hasVersion(entry.parsed)) {
        checks.push(createCheck({
          id: `storage-${entry.key}-version`,
          label: `${entry.key} version`,
          status: "확인 필요",
          code: "STORAGE_VERSION_MISSING",
          targetKey: entry.key,
          message: "일부 객체에 version 값이 없습니다. 기존 구조 호환 데이터일 수 있습니다."
        }));
      }

      const duplicates = findDuplicateIds(entry.parsed);
      if (duplicates.length > 0) {
        checks.push(createCheck({
          id: `storage-${entry.key}-duplicate-id`,
          label: `${entry.key} 중복 ID`,
          status: "확인 필요",
          code: "DUPLICATE_ID_FOUND",
          targetKey: entry.key,
          message: `중복 ID ${duplicates.length}개를 발견했습니다.`,
          fix: "데이터를 백업한 뒤 중복 항목을 정리하세요.",
          metadata: { count: duplicates.length }
        }));
      }

      const scan = scanValue(entry.parsed);
      if (scan.invalidDates.length > 0) {
        checks.push(createCheck({
          id: `storage-${entry.key}-date`,
          label: `${entry.key} 날짜`,
          status: "확인 필요",
          code: "INVALID_DATE_VALUE",
          targetKey: entry.key,
          message: `손상된 날짜 값 ${scan.invalidDates.length}개를 발견했습니다.`,
          metadata: { count: scan.invalidDates.length }
        }));
      }
      if (scan.badNumbers.length > 0) {
        checks.push(createCheck({
          id: `storage-${entry.key}-number`,
          label: `${entry.key} 숫자`,
          status: "오류",
          code: "INVALID_NUMBER_VALUE",
          targetKey: entry.key,
          message: `음수, NaN 또는 Infinity로 의심되는 숫자 ${scan.badNumbers.length}개를 발견했습니다.`,
          metadata: { count: scan.badNumbers.length }
        }));
      }
      if (scan.sensitiveLocations.length > 0) {
        checks.push(createCheck({
          id: `storage-${entry.key}-sensitive`,
          label: `${entry.key} 민감 문자열`,
          status: "오류",
          code: "SENSITIVE_PATTERN_STORED",
          targetKey: entry.key,
          message: `API 키, 토큰, 비밀번호처럼 보이는 문자열 위치 ${scan.sensitiveLocations.length}개를 발견했습니다. 값 자체는 표시하지 않습니다.`,
          fix: "해당 데이터를 백업한 뒤 민감 문자열을 제거하세요.",
          metadata: { count: scan.sensitiveLocations.length }
        }));
      }
      if (scan.mediaLocations.length > 0) {
        checks.push(createCheck({
          id: `storage-${entry.key}-media`,
          label: `${entry.key} 장기 저장 미디어`,
          status: "확인 필요",
          code: "BLOB_OR_DATA_URL_STORED",
          targetKey: entry.key,
          message: `Blob URL 또는 data URL로 보이는 값 ${scan.mediaLocations.length}개를 발견했습니다.`,
          fix: "원본 이미지 Blob이나 Object URL은 장기 localStorage에 저장하지 않는 것이 좋습니다.",
          metadata: { count: scan.mediaLocations.length }
        }));
      }
    }
  });

  if (full) {
    checks.push(...getReferenceDiagnostics());
  }

  return checks;
}

function getIdsFromArray(key: string) {
  const parsed = readStorageEntry(key).parsed;
  if (!Array.isArray(parsed)) return new Set<string>();
  return new Set(
    parsed
      .map((item) => (isObject(item) && typeof item.id === "string" ? item.id : undefined))
      .filter(Boolean) as string[]
  );
}

function getHistoryContentIds() {
  const parsed = readStorageEntry(STORAGE_KEYS.history).parsed;
  if (!Array.isArray(parsed)) return new Set<string>();
  return new Set(
    parsed
      .map((item) => {
        if (!isObject(item)) return undefined;
        const pkg = item.package;
        return isObject(pkg) && typeof pkg.id === "string" ? pkg.id : undefined;
      })
      .filter(Boolean) as string[]
  );
}

export function getReferenceDiagnostics(): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];
  const contentIds = getHistoryContentIds();
  const campaignIds = getIdsFromArray(STORAGE_KEYS.campaigns);
  const scheduleIds = getIdsFromArray(STORAGE_KEYS.contentSchedules);
  const workspaceIds = getIdsFromArray(STORAGE_KEYS.workspaces);
  const userIds = new Set(["guest-local-user", ...Array.from(getIdsFromArray(STORAGE_KEYS.userAccounts))]);

  const designProjects = readStorageEntry(STORAGE_KEYS.designProjects).parsed;
  if (Array.isArray(designProjects)) {
    const missing = designProjects.filter((item) => isObject(item) && typeof item.contentId === "string" && item.contentId && !contentIds.has(item.contentId));
    if (missing.length > 0) {
      checks.push(createCheck({
        id: "reference-design-content",
        label: "DesignProject 콘텐츠 연결",
        status: "확인 필요",
        code: "MISSING_CONTENT_REFERENCE",
        targetKey: STORAGE_KEYS.designProjects,
        message: `존재하지 않는 콘텐츠를 참조하는 디자인 ${missing.length}개를 발견했습니다.`,
        fix: "연결되지 않은 참조만 정리할 수 있습니다.",
        metadata: { count: missing.length }
      }));
    }
  }

  const exportHistory = readStorageEntry(STORAGE_KEYS.exportHistory).parsed;
  if (Array.isArray(exportHistory)) {
    const missing = exportHistory.filter((item) => isObject(item) && typeof item.contentId === "string" && item.contentId && !contentIds.has(item.contentId));
    if (missing.length > 0) {
      checks.push(createCheck({
        id: "reference-export-content",
        label: "Export 콘텐츠 연결",
        status: "확인 필요",
        code: "MISSING_CONTENT_REFERENCE",
        targetKey: STORAGE_KEYS.exportHistory,
        message: `존재하지 않는 콘텐츠를 참조하는 내보내기 기록 ${missing.length}개를 발견했습니다.`,
        fix: "연결되지 않은 참조만 정리할 수 있습니다.",
        metadata: { count: missing.length }
      }));
    }
  }

  const schedules = readStorageEntry(STORAGE_KEYS.contentSchedules).parsed;
  if (Array.isArray(schedules)) {
    const missingCampaign = schedules.filter((item) => isObject(item) && typeof item.campaignId === "string" && item.campaignId && !campaignIds.has(item.campaignId));
    const missingContent = schedules.filter((item) => isObject(item) && typeof item.linkedContentId === "string" && item.linkedContentId && !contentIds.has(item.linkedContentId));
    if (missingCampaign.length > 0 || missingContent.length > 0) {
      checks.push(createCheck({
        id: "reference-schedule-links",
        label: "Calendar 연결",
        status: "확인 필요",
        code: "MISSING_SCHEDULE_REFERENCE",
        targetKey: STORAGE_KEYS.contentSchedules,
        message: `캠페인 또는 콘텐츠 참조가 끊긴 일정 ${missingCampaign.length + missingContent.length}개를 발견했습니다.`,
        fix: "연결되지 않은 참조만 정리할 수 있습니다.",
        metadata: { campaignCount: missingCampaign.length, contentCount: missingContent.length }
      }));
    }
  }

  const campaigns = readStorageEntry(STORAGE_KEYS.campaigns).parsed;
  if (Array.isArray(campaigns)) {
    const broken = campaigns.filter((item) => {
      if (!isObject(item)) return false;
      const relatedScheduleIds = Array.isArray(item.relatedScheduleIds) ? item.relatedScheduleIds : [];
      const relatedContentIds = Array.isArray(item.relatedContentIds) ? item.relatedContentIds : [];
      return relatedScheduleIds.some((id) => typeof id === "string" && !scheduleIds.has(id)) || relatedContentIds.some((id) => typeof id === "string" && !contentIds.has(id));
    });
    if (broken.length > 0) {
      checks.push(createCheck({
        id: "reference-campaign-links",
        label: "Campaign 연결",
        status: "확인 필요",
        code: "MISSING_CAMPAIGN_REFERENCE",
        targetKey: STORAGE_KEYS.campaigns,
        message: `존재하지 않는 일정 또는 콘텐츠를 참조하는 캠페인 ${broken.length}개를 발견했습니다.`,
        fix: "연결되지 않은 참조만 정리할 수 있습니다.",
        metadata: { count: broken.length }
      }));
    }
  }

  ALL_POSTKIT_STORAGE_KEYS.forEach((key) => {
    const entry = readStorageEntry(key);
    if (!entry.parseOk || !entry.exists) return;
    const refs = { users: 0, workspaces: 0 };
    walkValue(entry.parsed, (nested, keyPath, keyName) => {
      if (keyName === "userId" && typeof nested === "string" && nested && !userIds.has(nested)) refs.users += 1;
      if (keyName === "workspaceId" && typeof nested === "string" && nested && !workspaceIds.has(nested)) refs.workspaces += 1;
      void keyPath;
    });
    if (refs.users > 0 || refs.workspaces > 0) {
      checks.push(createCheck({
        id: `reference-owner-${key}`,
        label: `${key} 소유권 연결`,
        status: "확인 필요",
        code: "MISSING_OWNER_REFERENCE",
        targetKey: key,
        message: `존재하지 않는 userId 또는 workspaceId 참조 ${refs.users + refs.workspaces}개를 발견했습니다.`,
        metadata: { userRefs: refs.users, workspaceRefs: refs.workspaces }
      }));
    }
  });

  return checks;
}

export function createStorageRepairProposals(checks: DiagnosticCheck[]): RepairProposal[] {
  const proposals = new Map<string, RepairProposal>();

  checks.forEach((check) => {
    if (!check.targetKey) return;
    if (check.code === "STORAGE_JSON_PARSE_ERROR" || check.code === "STORAGE_TYPE_MISMATCH") {
      proposals.set(`reset-${check.targetKey}`, {
        id: `reset-${check.targetKey}`,
        targetKey: check.targetKey,
        title: `${check.targetKey} 기본값 복구`,
        description: "백업 후 해당 키를 안전한 기본값으로 되돌립니다.",
        action: "reset_default",
        riskLevel: "high"
      });
    }
    if (check.code.includes("REFERENCE")) {
      proposals.set("clean-refs", {
        id: "clean-refs",
        targetKey: "postkit-references",
        title: "연결되지 않은 참조 정리",
        description: "존재하지 않는 콘텐츠, 캠페인, 일정 ID 참조만 제거합니다.",
        action: "clean_refs",
        riskLevel: "medium"
      });
    }
  });

  return Array.from(proposals.values());
}

function defaultValueForKey(key: string) {
  const shape = expectedStorageShapes[key] ?? "any";
  if (shape === "array") return [];
  if (shape === "object") return {};
  return null;
}

export function resetStorageKeyToDefault(key: string) {
  if (!isBrowser()) return { ok: false, message: "브라우저에서만 복구할 수 있습니다." };
  if (!isPostKitStorageKey(key)) return { ok: false, message: "PostKit 관리 키가 아닙니다." };

  const value = defaultValueForKey(key);
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  return { ok: true, message: `${key} 기본값 복구를 완료했습니다.` };
}

function setArrayKey(key: string, items: unknown[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

export function cleanDanglingReferences() {
  if (!isBrowser()) return { ok: false, message: "브라우저에서만 정리할 수 있습니다.", cleaned: 0 };

  const contentIds = getHistoryContentIds();
  const campaignIds = getIdsFromArray(STORAGE_KEYS.campaigns);
  const scheduleIds = getIdsFromArray(STORAGE_KEYS.contentSchedules);
  let cleaned = 0;

  const designs = readStorageEntry(STORAGE_KEYS.designProjects).parsed;
  if (Array.isArray(designs)) {
    const next = designs.filter((item) => !isObject(item) || !item.contentId || contentIds.has(String(item.contentId)));
    cleaned += designs.length - next.length;
    setArrayKey(STORAGE_KEYS.designProjects, next);
  }

  const exports = readStorageEntry(STORAGE_KEYS.exportHistory).parsed;
  if (Array.isArray(exports)) {
    const next = exports.filter((item) => !isObject(item) || !item.contentId || contentIds.has(String(item.contentId)));
    cleaned += exports.length - next.length;
    setArrayKey(STORAGE_KEYS.exportHistory, next);
  }

  const schedules = readStorageEntry(STORAGE_KEYS.contentSchedules).parsed;
  if (Array.isArray(schedules)) {
    const next = schedules.map((item) => {
      if (!isObject(item)) return item;
      const record = { ...item };
      if (typeof record.campaignId === "string" && record.campaignId && !campaignIds.has(record.campaignId)) {
        delete record.campaignId;
        delete record.campaignName;
        cleaned += 1;
      }
      if (typeof record.linkedContentId === "string" && record.linkedContentId && !contentIds.has(record.linkedContentId)) {
        delete record.linkedContentId;
        cleaned += 1;
      }
      return record;
    });
    setArrayKey(STORAGE_KEYS.contentSchedules, next);
  }

  const campaigns = readStorageEntry(STORAGE_KEYS.campaigns).parsed;
  if (Array.isArray(campaigns)) {
    const next = campaigns.map((item) => {
      if (!isObject(item)) return item;
      const relatedContentIds = Array.isArray(item.relatedContentIds) ? item.relatedContentIds.filter((id) => typeof id === "string" && contentIds.has(id)) : [];
      const relatedScheduleIds = Array.isArray(item.relatedScheduleIds) ? item.relatedScheduleIds.filter((id) => typeof id === "string" && scheduleIds.has(id)) : [];
      cleaned += Math.max(0, (Array.isArray(item.relatedContentIds) ? item.relatedContentIds.length : 0) - relatedContentIds.length);
      cleaned += Math.max(0, (Array.isArray(item.relatedScheduleIds) ? item.relatedScheduleIds.length : 0) - relatedScheduleIds.length);
      return { ...item, relatedContentIds, relatedScheduleIds };
    });
    setArrayKey(STORAGE_KEYS.campaigns, next);
  }

  return { ok: true, message: `연결되지 않은 참조 ${cleaned}개를 정리했습니다.`, cleaned };
}

export function exportStorageKeyData(key: string) {
  const entry = readStorageEntry(key);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    key,
    parseOk: entry.parseOk,
    data: entry.parsed
  };
}
