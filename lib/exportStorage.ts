"use client";

import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { ExportHistoryEntry, ExportHistoryStatus, ExportHistoryType, ExportPlatform, ExportPreferences } from "@/types";

export const exportHistoryKey = STORAGE_KEYS.exportHistory;
export const exportPreferencesKey = STORAGE_KEYS.exportPreferences;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
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
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateEntry(value: unknown): ExportHistoryEntry | null {
  if (!isObject(value)) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    exportId: typeof value.exportId === "string" ? value.exportId : createId("export"),
    contentId: typeof value.contentId === "string" ? value.contentId : "",
    platform: (value.platform as ExportPlatform) || "Instagram Feed",
    exportType: (value.exportType as ExportHistoryType) || "single_download",
    downloadedFiles: Array.isArray(value.downloadedFiles) ? (value.downloadedFiles as string[]) : [],
    copiedFields: Array.isArray(value.copiedFields) ? (value.copiedFields as string[]) : [],
    shared: Boolean(value.shared),
    openedPlatform: Boolean(value.openedPlatform),
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : now,
    status: (value.status as ExportHistoryStatus) || "success",
    errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : undefined
  };
}

export function getExportHistory() {
  const raw = readJson<unknown[]>(exportHistoryKey, []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(migrateEntry).filter(Boolean) as ExportHistoryEntry[];
}

export function saveExportHistory(entries: ExportHistoryEntry[]) {
  const unique = new Map(entries.map((entry) => [entry.exportId, entry]));
  writeJson(exportHistoryKey, Array.from(unique.values()).slice(0, 300));
}

export function addExportHistoryEntry(
  entry: Omit<ExportHistoryEntry, "exportId" | "exportedAt"> & {
    exportId?: string;
    exportedAt?: string;
  }
) {
  const nextEntry: ExportHistoryEntry = {
    ...entry,
    exportId: entry.exportId ?? createId("export"),
    exportedAt: entry.exportedAt ?? new Date().toISOString()
  };
  saveExportHistory([nextEntry, ...getExportHistory()]);
  return nextEntry;
}

export function getExportPreferences(): ExportPreferences {
  const fallback: ExportPreferences = {
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  };
  const raw = readJson<Partial<ExportPreferences>>(exportPreferencesKey, fallback);

  return {
    ...fallback,
    ...raw,
    version: 1,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : fallback.lastUpdatedAt
  };
}

export function saveExportPreferences(preferences: ExportPreferences) {
  writeJson(exportPreferencesKey, {
    ...preferences,
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function getExportStorageKeys() {
  return {
    exportHistoryKey,
    exportPreferencesKey
  };
}
