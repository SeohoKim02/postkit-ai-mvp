import type { AccountDataExport, StorageAdapterStatus } from "@/types";

export type RepositoryKey = string;

export type RepositoryImportMode = "merge" | "replace";

export type RepositoryResult<T = unknown> = {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type RepositoryImportResult = RepositoryResult<{
  importedKeys: string[];
  skippedKeys: string[];
}>;

export interface DataRepository {
  getStatus(): StorageAdapterStatus;
  get<T>(key: RepositoryKey, fallback: T): T;
  getAll<T>(key: RepositoryKey): T[];
  set<T>(key: RepositoryKey, value: T): RepositoryResult<T>;
  create<T extends { id?: string }>(key: RepositoryKey, value: T): RepositoryResult<T>;
  update<T extends { id: string }>(key: RepositoryKey, id: string, updater: (current: T) => T): RepositoryResult<T>;
  delete(key: RepositoryKey, id?: string): RepositoryResult;
  clear(keys?: RepositoryKey[]): RepositoryResult;
  exportData(keys?: RepositoryKey[]): AccountDataExport;
  importData(exportData: AccountDataExport, mode: RepositoryImportMode): RepositoryImportResult;
  migrate(migrationId: string, runner: () => RepositoryResult): RepositoryResult;
}
