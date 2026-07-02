"use client";

import { cloudRepository } from "@/lib/data/cloudRepository";
import { localRepository } from "@/lib/data/localRepository";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { DataRepository } from "@/lib/data/types";
import type { StoragePreferences } from "@/types";

const defaultPreferences: StoragePreferences = {
  version: 1,
  activeAdapter: "local",
  syncEnabled: false,
  conflictPolicy: "manual",
  lastUpdatedAt: new Date(0).toISOString()
};

export function getStoragePreferences(): StoragePreferences {
  const raw = localRepository.get<Partial<StoragePreferences>>(STORAGE_KEYS.storagePreferences, defaultPreferences);

  return {
    ...defaultPreferences,
    ...raw,
    activeAdapter: raw.activeAdapter === "cloud" ? "cloud" : "local",
    syncEnabled: Boolean(raw.syncEnabled),
    conflictPolicy: raw.conflictPolicy === "localUpdatedAt" ? "localUpdatedAt" : "manual",
    version: 1,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : new Date().toISOString()
  };
}

export function saveStoragePreferences(preferences: StoragePreferences) {
  return localRepository.set(STORAGE_KEYS.storagePreferences, {
    ...preferences,
    activeAdapter: "local",
    syncEnabled: false,
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function getRepository(): DataRepository {
  const preferences = getStoragePreferences();
  return preferences.activeAdapter === "cloud" ? cloudRepository : localRepository;
}

export function getRepositoryStatus() {
  const local = localRepository.getStatus();
  const cloud = cloudRepository.getStatus();
  const active = getRepository().getStatus();

  return { local, cloud, active };
}
