"use client";

import { STORAGE_KEYS } from "@/lib/storageKeys";
import type {
  AiErrorCode,
  AiPreferences,
  AiProviderName,
  AiRequestHistoryEntry,
  AiRequestStatus,
  AiTaskType
} from "@/types";

const historyKey = STORAGE_KEYS.aiRequestHistory;
const preferencesKey = STORAGE_KEYS.aiPreferences;
const activeRequestWindowMs = 2 * 60 * 1000;

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

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // AI request history is non-authoritative mock metadata. Generation should not fail because this log cannot be stored.
  }
}

function normalizeEntry(value: unknown): AiRequestHistoryEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Partial<AiRequestHistoryEntry>;
  if (!raw.requestId || !raw.idempotencyKey || !raw.taskType || !raw.startedAt) {
    return null;
  }

  return {
    requestId: String(raw.requestId),
    idempotencyKey: String(raw.idempotencyKey),
    taskType: raw.taskType as AiTaskType,
    provider: (raw.provider ?? "mock") as AiProviderName,
    status: (raw.status ?? "pending") as AiRequestStatus,
    creditCost: Math.max(0, Number(raw.creditCost ?? 0)),
    relatedContentId: typeof raw.relatedContentId === "string" ? raw.relatedContentId : undefined,
    relatedCampaignId: typeof raw.relatedCampaignId === "string" ? raw.relatedCampaignId : undefined,
    startedAt: String(raw.startedAt),
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : undefined,
    errorCode: raw.errorCode as AiErrorCode | undefined,
    usedFallback: Boolean(raw.usedFallback),
    personalizationApplied: Boolean(raw.personalizationApplied),
    version: 1
  };
}

export function getAiRequestHistory() {
  const raw = readJson<unknown>(historyKey, []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(normalizeEntry).filter(Boolean) as AiRequestHistoryEntry[];
}

export function saveAiRequestHistory(entries: AiRequestHistoryEntry[]) {
  writeJson(historyKey, entries.map((entry) => ({ ...entry, version: 1 })).slice(0, 200));
}

export function hasActiveAiRequest(idempotencyKey: string) {
  const now = Date.now();

  return getAiRequestHistory().some((entry) => {
    if (entry.idempotencyKey !== idempotencyKey) {
      return false;
    }

    if (entry.status !== "pending" && entry.status !== "running") {
      return false;
    }

    const startedAt = new Date(entry.startedAt).getTime();
    return !Number.isNaN(startedAt) && now - startedAt < activeRequestWindowMs;
  });
}

export function startAiRequest(input: {
  requestId: string;
  idempotencyKey: string;
  taskType: AiTaskType;
  provider?: AiProviderName;
  creditCost: number;
  relatedCampaignId?: string;
  personalizationApplied: boolean;
}) {
  const entry: AiRequestHistoryEntry = {
    requestId: input.requestId,
    idempotencyKey: input.idempotencyKey,
    taskType: input.taskType,
    provider: input.provider ?? "mock",
    status: "running",
    creditCost: Math.max(0, input.creditCost),
    relatedCampaignId: input.relatedCampaignId,
    startedAt: new Date().toISOString(),
    usedFallback: false,
    personalizationApplied: input.personalizationApplied,
    version: 1
  };
  const next = [entry, ...getAiRequestHistory().filter((item) => item.requestId !== entry.requestId)].slice(0, 200);
  saveAiRequestHistory(next);
  return entry;
}

export function completeAiRequest(
  requestId: string,
  status: AiRequestStatus,
  options: {
    relatedContentId?: string;
    errorCode?: AiErrorCode;
    usedFallback?: boolean;
  } = {}
) {
  const completedAt = new Date().toISOString();
  const next = getAiRequestHistory().map((entry) =>
    entry.requestId === requestId
      ? {
          ...entry,
          status,
          completedAt,
          relatedContentId: options.relatedContentId ?? entry.relatedContentId,
          errorCode: options.errorCode,
          usedFallback: options.usedFallback ?? entry.usedFallback,
          version: 1
        }
      : entry
  );
  saveAiRequestHistory(next);
}

export function getAiPreferences(): AiPreferences {
  const fallback: AiPreferences = {
    version: 1,
    provider: "mock",
    allowSafeRetry: true,
    lastUpdatedAt: new Date().toISOString()
  };
  const raw = readJson<Partial<AiPreferences>>(preferencesKey, fallback);

  return {
    ...fallback,
    ...raw,
    provider: raw.provider === "mock" ? raw.provider : "mock",
    allowSafeRetry: raw.allowSafeRetry ?? true,
    version: 1,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : fallback.lastUpdatedAt
  };
}

export function saveAiPreferences(preferences: AiPreferences) {
  writeJson(preferencesKey, {
    ...preferences,
    provider: "mock",
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  });
}
