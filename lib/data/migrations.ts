"use client";

import { localRepository } from "@/lib/data/localRepository";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { DataMigrationState, DataOwnership } from "@/types";

const migrationId = "ownership-v1";
const ownershipKeys = [
  STORAGE_KEYS.history,
  STORAGE_KEYS.currentResult,
  STORAGE_KEYS.personalizationProfile,
  STORAGE_KEYS.creditAccount,
  STORAGE_KEYS.creditLedger,
  STORAGE_KEYS.exportHistory,
  STORAGE_KEYS.designProjects,
  STORAGE_KEYS.contentSchedules,
  STORAGE_KEYS.campaigns,
  STORAGE_KEYS.contentIdeas,
  STORAGE_KEYS.notifications,
  STORAGE_KEYS.privacyPreferences,
  STORAGE_KEYS.aiRequestHistory
];

function makeOwnership(userId: string, workspaceId: string): DataOwnership {
  return {
    userId,
    workspaceId,
    ownerType: userId.startsWith("guest") ? "guest" : "workspace",
    subscriptionOwner: "workspace",
    migratedAt: new Date().toISOString()
  };
}

function attachToRecord<T>(value: T, userId: string, workspaceId: string): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return {
    ...(value as Record<string, unknown>),
    userId: (value as { userId?: string }).userId ?? userId,
    workspaceId: (value as { workspaceId?: string }).workspaceId ?? workspaceId,
    ownership: (value as { ownership?: DataOwnership }).ownership ?? makeOwnership(userId, workspaceId)
  } as T;
}

function attachOwnership(key: string, value: unknown, userId: string, workspaceId: string) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const record = attachToRecord(item, userId, workspaceId);
      if (key === STORAGE_KEYS.history && record && typeof record === "object" && "package" in record) {
        return {
          ...(record as Record<string, unknown>),
          package: attachToRecord((record as { package?: unknown }).package, userId, workspaceId)
        };
      }
      return record;
    });
  }

  if (key === STORAGE_KEYS.currentResult) {
    return attachToRecord(value, userId, workspaceId);
  }

  return attachToRecord(value, userId, workspaceId);
}

export function getDataMigrationState() {
  return localRepository.get<DataMigrationState>(STORAGE_KEYS.dataMigrationState, {
    version: 1,
    migrationId,
    status: "not_started",
    migratedKeys: [],
    updatedAt: new Date().toISOString()
  });
}

export function runOwnershipMigration(userId: string, workspaceId: string) {
  const state = getDataMigrationState();
  if (state.status === "completed" && state.migrationId === migrationId && state.userId === userId && state.workspaceId === workspaceId) {
    return state;
  }

  const backup = localRepository.exportData(ownershipKeys);
  const migratedKeys: string[] = [];

  try {
    ownershipKeys.forEach((key) => {
      const current = localRepository.get<unknown>(key, undefined);
      if (current === undefined || current === null) {
        return;
      }

      localRepository.set(key, attachOwnership(key, current, userId, workspaceId));
      migratedKeys.push(key);
    });

    const nextState: DataMigrationState = {
      version: 1,
      migrationId,
      status: "completed",
      userId,
      workspaceId,
      migratedKeys,
      backupCreatedAt: backup.exportedAt,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localRepository.set(STORAGE_KEYS.dataMigrationState, nextState);
    return nextState;
  } catch {
    localRepository.importData(backup, "replace");
    const failedState: DataMigrationState = {
      version: 1,
      migrationId,
      status: "failed",
      userId,
      workspaceId,
      migratedKeys,
      errorMessage: "소유권 마이그레이션 중 문제가 생겨 기존 데이터를 복구했어요.",
      backupCreatedAt: backup.exportedAt,
      updatedAt: new Date().toISOString()
    };
    localRepository.set(STORAGE_KEYS.dataMigrationState, failedState);
    return failedState;
  }
}
