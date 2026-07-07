import type { AccountDataExport } from "@/types";
import type { DataRepository, RepositoryResult } from "@/lib/data/types";

function unavailable(): RepositoryResult {
  return {
    ok: false,
    error: "CloudRepository는 아직 mock 준비 상태입니다. 실제 네트워크 요청을 보내지 않습니다."
  };
}

export const cloudRepository: DataRepository = {
  getStatus() {
    return {
      adapter: "cloud",
      available: false,
      mode: "unavailable",
      message: "실제 인증, 클라우드 DB, 파일 저장소는 아직 연결하지 않았습니다.",
      lastCheckedAt: new Date().toISOString(),
      version: 1
    };
  },
  get<T>(_key: string, fallback: T): T {
    return fallback;
  },
  getAll<T>(): T[] {
    return [];
  },
  set<T>(): RepositoryResult<T> {
    return unavailable() as RepositoryResult<T>;
  },
  create<T extends { id?: string }>(): RepositoryResult<T> {
    return unavailable() as RepositoryResult<T>;
  },
  update<T extends { id: string }>(): RepositoryResult<T> {
    return unavailable() as RepositoryResult<T>;
  },
  delete: unavailable,
  clear: unavailable,
  exportData(): AccountDataExport {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      source: "postkit-local",
      excluded: ["cloud export unavailable"],
      data: {}
    };
  },
  importData() {
    return { ok: false, error: "CloudRepository 가져오기는 아직 구현되지 않았어요." };
  },
  migrate: unavailable
};
