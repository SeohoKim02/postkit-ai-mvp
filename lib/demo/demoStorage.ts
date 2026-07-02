"use client";

import { createDemoDataBundle, type DemoDataBundle } from "@/lib/demo/demoData";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { DemoDataManifest } from "@/types";

export type DemoInstallMode = "merge" | "replace";

const arrayTargets = [
  "workspaces",
  "members",
  "history",
  "designs",
  "videos",
  "campaigns",
  "schedules",
  "ideas",
  "exports",
  "aiRequests",
  "creditLedger"
] as const;

const arrayKeyMap: Record<(typeof arrayTargets)[number], string> = {
  workspaces: STORAGE_KEYS.workspaces,
  members: STORAGE_KEYS.workspaceMembers,
  history: STORAGE_KEYS.history,
  designs: STORAGE_KEYS.designProjects,
  videos: STORAGE_KEYS.videoProjects,
  campaigns: STORAGE_KEYS.campaigns,
  schedules: STORAGE_KEYS.contentSchedules,
  ideas: STORAGE_KEYS.contentIdeas,
  exports: STORAGE_KEYS.exportHistory,
  aiRequests: STORAGE_KEYS.aiRequestHistory,
  creditLedger: STORAGE_KEYS.creditLedger
};

function isBrowser() {
  return typeof window !== "undefined";
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

function removeKey(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

function recordId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  return String(record.id ?? record.exportId ?? record.requestId ?? "");
}

function isDemoRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.demo === true || record.source === "demo";
}

function mergeArray(key: string, items: unknown[]) {
  const current = readJson<unknown[]>(key, []);
  const base = Array.isArray(current) ? current.filter((item) => !isDemoRecord(item)) : [];
  const map = new Map<string, unknown>();
  [...items, ...base].forEach((item) => {
    const id = recordId(item) || `${key}-${map.size}`;
    map.set(id, item);
  });
  writeJson(key, Array.from(map.values()));
}

function replaceDemoData(bundle: DemoDataBundle) {
  writeJson(STORAGE_KEYS.userSession, bundle.session);
  writeJson(STORAGE_KEYS.userAccounts, [bundle.account]);
  writeJson(STORAGE_KEYS.userProfiles, [bundle.profile]);
  writeJson(STORAGE_KEYS.workspaces, bundle.workspaces);
  writeJson(STORAGE_KEYS.workspaceMembers, bundle.members);
  writeJson(STORAGE_KEYS.brandProfile, bundle.brandProfile);
  writeJson(STORAGE_KEYS.personalizationProfile, bundle.personalizationProfile);
  writeJson(STORAGE_KEYS.currentResult, bundle.packages[0]);
  writeJson(STORAGE_KEYS.history, bundle.history);
  writeJson(STORAGE_KEYS.designProjects, bundle.designs);
  writeJson(STORAGE_KEYS.videoProjects, bundle.videos);
  writeJson(STORAGE_KEYS.campaigns, bundle.campaigns);
  writeJson(STORAGE_KEYS.contentSchedules, bundle.schedules);
  writeJson(STORAGE_KEYS.contentIdeas, bundle.ideas);
  writeJson(STORAGE_KEYS.exportHistory, bundle.exports);
  writeJson(STORAGE_KEYS.aiRequestHistory, bundle.aiRequests);
  writeJson(STORAGE_KEYS.creditAccount, bundle.creditAccount);
  writeJson(STORAGE_KEYS.creditLedger, bundle.creditLedger);
  writeJson(STORAGE_KEYS.privacyPreferences, bundle.privacyPreferences);
  writeJson(STORAGE_KEYS.demoManifest, bundle.manifest);
}

function mergeDemoData(bundle: DemoDataBundle) {
  mergeArray(STORAGE_KEYS.userAccounts, [bundle.account]);
  mergeArray(STORAGE_KEYS.userProfiles, [bundle.profile]);

  arrayTargets.forEach((target) => {
    const value = bundle[target];
    if (Array.isArray(value)) {
      mergeArray(arrayKeyMap[target], value);
    }
  });

  if (!window.localStorage.getItem(STORAGE_KEYS.brandProfile)) writeJson(STORAGE_KEYS.brandProfile, bundle.brandProfile);
  if (!window.localStorage.getItem(STORAGE_KEYS.personalizationProfile)) writeJson(STORAGE_KEYS.personalizationProfile, bundle.personalizationProfile);
  if (!window.localStorage.getItem(STORAGE_KEYS.currentResult)) writeJson(STORAGE_KEYS.currentResult, bundle.packages[0]);
  if (!window.localStorage.getItem(STORAGE_KEYS.creditAccount)) writeJson(STORAGE_KEYS.creditAccount, bundle.creditAccount);
  if (!window.localStorage.getItem(STORAGE_KEYS.privacyPreferences)) writeJson(STORAGE_KEYS.privacyPreferences, bundle.privacyPreferences);
  writeJson(STORAGE_KEYS.demoManifest, bundle.manifest);
}

export function hasExistingPostKitData() {
  if (!isBrowser()) return false;
  return Object.values(STORAGE_KEYS).some((key) => key !== STORAGE_KEYS.demoManifest && window.localStorage.getItem(key) !== null);
}

export function getDemoManifest() {
  return readJson<DemoDataManifest | null>(STORAGE_KEYS.demoManifest, null);
}

export function createDemoData(mode: DemoInstallMode) {
  if (!isBrowser()) {
    return { ok: false, message: "브라우저에서만 데모 데이터를 만들 수 있습니다.", manifest: null as DemoDataManifest | null };
  }

  const bundle = createDemoDataBundle();
  if (mode === "replace") {
    replaceDemoData(bundle);
  } else {
    mergeDemoData(bundle);
  }

  return {
    ok: true,
    message: mode === "replace" ? "백업 후 데모 데이터로 교체했습니다." : "기존 데이터를 유지하고 데모 데이터를 추가했습니다.",
    manifest: bundle.manifest
  };
}

export function countDemoData() {
  if (!isBrowser()) return 0;
  let count = 0;
  Object.values(STORAGE_KEYS).forEach((key) => {
    const value = readJson<unknown>(key, null);
    if (Array.isArray(value)) {
      count += value.filter(isDemoRecord).length;
    } else if (isDemoRecord(value)) {
      count += 1;
    }
  });
  return count;
}

export function deleteDemoDataOnly() {
  if (!isBrowser()) {
    return { ok: false, message: "브라우저에서만 데모 데이터를 삭제할 수 있습니다.", deleted: 0 };
  }

  let deleted = 0;
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key === STORAGE_KEYS.demoManifest) return;
    const value = readJson<unknown>(key, null);
    if (Array.isArray(value)) {
      const next = value.filter((item) => !isDemoRecord(item));
      deleted += value.length - next.length;
      writeJson(key, next);
      return;
    }
    if (isDemoRecord(value)) {
      deleted += 1;
      removeKey(key);
    }
  });

  const session = readJson<{ userId?: string } | null>(STORAGE_KEYS.userSession, null);
  if (session?.userId === "demo-user-postkit") {
    removeKey(STORAGE_KEYS.userSession);
  }
  if (readJson<DemoDataManifest | null>(STORAGE_KEYS.demoManifest, null)) {
    deleted += 1;
    removeKey(STORAGE_KEYS.demoManifest);
  }

  return { ok: true, message: `데모 표시가 있는 항목 ${deleted}개를 삭제했습니다.`, deleted };
}

export function prefillDemoCreate() {
  const bundle = createDemoDataBundle();
  writeJson(STORAGE_KEYS.createPrefill, bundle.packages[0].input);
  writeJson(STORAGE_KEYS.currentResult, bundle.packages[0]);
  return bundle.packages[0];
}
