"use client";

import { ALL_POSTKIT_STORAGE_KEYS } from "@/lib/storageKeys";
import type { AccountDataExport } from "@/types";
import type { DataRepository, RepositoryImportMode, RepositoryImportResult, RepositoryResult } from "@/lib/data/types";

function isBrowser() {
  return typeof window !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uniqueById<T extends { id?: string }>(items: T[]) {
  const seen = new Set<string>();
  const output: T[] = [];

  items.forEach((item) => {
    const id = item.id;
    if (!id || !seen.has(id)) {
      if (id) seen.add(id);
      output.push(item);
    }
  });

  return output;
}

export const localRepository: DataRepository = {
  getStatus() {
    return {
      adapter: "local",
      available: isBrowser(),
      mode: isBrowser() ? "guest" : "unavailable",
      message: isBrowser()
        ? "현재 데이터는 이 브라우저 localStorage에 저장됩니다."
        : "브라우저에서만 localStorage 저장소를 사용할 수 있습니다.",
      lastCheckedAt: new Date().toISOString(),
      version: 1
    };
  },

  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) {
      return fallback;
    }

    return safeParse(window.localStorage.getItem(key), fallback);
  },

  getAll<T>(key: string): T[] {
    const value = this.get<unknown>(key, []);
    return Array.isArray(value) ? (value as T[]) : [];
  },

  set<T>(key: string, value: T): RepositoryResult<T> {
    if (!isBrowser()) {
      return { ok: false, error: "브라우저에서만 저장할 수 있어요." };
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return { ok: true, data: value };
    } catch {
      return { ok: false, error: "localStorage 저장 공간을 사용할 수 없어요." };
    }
  },

  create<T extends { id?: string }>(key: string, value: T): RepositoryResult<T> {
    const current = this.getAll<T>(key);
    const next = uniqueById([value, ...current]);
    const result = this.set(key, next);
    return result.ok ? { ok: true, data: value } : { ok: false, error: result.error, message: result.message };
  },

  update<T extends { id: string }>(key: string, id: string, updater: (current: T) => T): RepositoryResult<T> {
    const current = this.getAll<T>(key);
    const target = current.find((item) => item.id === id);

    if (!target) {
      return { ok: false, error: "수정할 데이터를 찾을 수 없어요." };
    }

    const nextItem = updater(target);
    const result = this.set(key, current.map((item) => (item.id === id ? nextItem : item)));
    return result.ok ? { ok: true, data: nextItem } : { ok: false, error: result.error, message: result.message };
  },

  delete(key: string, id?: string): RepositoryResult {
    if (!isBrowser()) {
      return { ok: false, error: "브라우저에서만 삭제할 수 있어요." };
    }

    if (!id) {
      window.localStorage.removeItem(key);
      return { ok: true };
    }

    const current = this.getAll<{ id?: string }>(key);
    this.set(key, current.filter((item) => item.id !== id));
    return { ok: true };
  },

  clear(keys = ALL_POSTKIT_STORAGE_KEYS): RepositoryResult {
    if (!isBrowser()) {
      return { ok: false, error: "브라우저에서만 삭제할 수 있어요." };
    }

    keys.forEach((key) => window.localStorage.removeItem(key));
    return { ok: true };
  },

  exportData(keys = ALL_POSTKIT_STORAGE_KEYS): AccountDataExport {
    const data = keys.reduce<Record<string, unknown>>((acc, key) => {
      if (!isBrowser()) {
        acc[key] = null;
        return acc;
      }

      acc[key] = safeParse(window.localStorage.getItem(key), null);
      return acc;
    }, {});

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      source: "postkit-local",
      excluded: ["password", "authToken", "apiKey", "paymentCard", "originalImageBlob", "temporaryObjectUrl"],
      data
    };
  },

  importData(exportData: AccountDataExport, mode: RepositoryImportMode): RepositoryImportResult {
    if (!isBrowser()) {
      return { ok: false, error: "브라우저에서만 가져올 수 있어요." };
    }

    const importedKeys: string[] = [];
    const skippedKeys: string[] = [];
    const allowedKeys = new Set<string>(ALL_POSTKIT_STORAGE_KEYS);
    const backup = this.exportData(ALL_POSTKIT_STORAGE_KEYS);

    try {
      if (mode === "replace") {
        this.clear(ALL_POSTKIT_STORAGE_KEYS);
      }

      Object.entries(exportData.data).forEach(([key, value]) => {
        if (!allowedKeys.has(key)) {
          skippedKeys.push(key);
          return;
        }

        if (mode === "merge") {
          const current = this.get<unknown>(key, null);
          if (Array.isArray(current) && Array.isArray(value)) {
            this.set(key, uniqueById([...(value as Array<{ id?: string }>), ...(current as Array<{ id?: string }>)]));
          } else {
            this.set(key, value);
          }
        } else {
          this.set(key, value);
        }
        importedKeys.push(key);
      });

      return { ok: true, data: { importedKeys, skippedKeys } };
    } catch {
      Object.entries(backup.data).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      });
      return { ok: false, error: "가져오기에 실패해 기존 데이터를 복구했어요." };
    }
  },

  migrate(_migrationId: string, runner: () => RepositoryResult): RepositoryResult {
    return runner();
  }
};
