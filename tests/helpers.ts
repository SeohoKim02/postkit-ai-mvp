// 브라우저 전용 모듈(localStorage 접근)을 node:test에서 실행하기 위한 최소 스텁.
class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }

  removeItem(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

export function installBrowserStubs() {
  const storage = new MemoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  return storage;
}
