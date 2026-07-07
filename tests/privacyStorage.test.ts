import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { installBrowserStubs } from "./helpers.ts";
import { cleanupExpiredMockUploads, getRetentionCleanupCandidates } from "@/lib/privacyStorage";

function historyItem(id: string, createdAt: string, fileName?: string) {
  return {
    id,
    createdAt,
    package: {
      id,
      title: `${id} 콘텐츠`,
      createdAt,
      platform: "Instagram Feed",
      purpose: "Product Promotion",
      style: "감성형",
      usedCredits: 30,
      captions: ["a"],
      hashtags: [],
      ctas: [],
      hooks: [],
      thumbnails: [],
      disclosure: "",
      checklist: [],
      packageItems: [],
      input: {
        platform: "Instagram Feed",
        purpose: "Product Promotion",
        style: "감성형",
        productName: id,
        requiredKeywords: "",
        bannedKeywords: "",
        sponsorDisclosure: "none",
        uploadedFileName: fileName,
        uploadedAssetId: fileName ? `asset-${id}` : undefined
      }
    }
  };
}

describe("privacyStorage 보관 기간 정리 (작업 세션 보호)", () => {
  let storage: ReturnType<typeof installBrowserStubs>;

  beforeEach(() => {
    storage = installBrowserStubs();
  });

  it("기본 정책(none)에서 방금 만든 콘텐츠는 정리 대상이 아니다", () => {
    const fresh = historyItem("fresh-1", new Date().toISOString(), "photo.png");
    storage.setItem("postkit-history", JSON.stringify([fresh]));

    assert.equal(getRetentionCleanupCandidates().length, 0);
    assert.equal(cleanupExpiredMockUploads().deletedCount, 0);

    const after = JSON.parse(storage.getItem("postkit-history")!);
    assert.equal(after[0].package.input.uploadedFileName, "photo.png");
    assert.equal(after[0].package.input.uploadedAssetId, "asset-fresh-1");
  });

  it("none 정책에서 24시간이 지난 콘텐츠만 참조를 정리하고 나머지는 보존한다", () => {
    const old = historyItem("old-1", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), "old.png");
    const fresh = historyItem("fresh-2", new Date().toISOString(), "new.png");
    const current = historyItem("fresh-2", new Date().toISOString(), "new.png").package;
    storage.setItem("postkit-history", JSON.stringify([old, fresh]));
    storage.setItem("postkit-current-result", JSON.stringify(current));

    const candidates = getRetentionCleanupCandidates();
    assert.deepEqual(candidates.map((c) => c.id), ["old-1"]);

    const result = cleanupExpiredMockUploads();
    assert.equal(result.deletedCount, 1);

    const after = JSON.parse(storage.getItem("postkit-history")!);
    const oldAfter = after.find((i: { id: string }) => i.id === "old-1");
    const freshAfter = after.find((i: { id: string }) => i.id === "fresh-2");
    assert.equal(oldAfter.package.input.uploadedFileName, undefined);
    assert.equal(freshAfter.package.input.uploadedFileName, "new.png");

    // 작업 중인 current-result는 정리 대상이 아니면 그대로 보존
    const currentAfter = JSON.parse(storage.getItem("postkit-current-result")!);
    assert.equal(currentAfter.input.uploadedFileName, "new.png");
  });

  it("until_deleted 정책에서는 아무것도 정리하지 않는다", () => {
    storage.setItem(
      "postkit-retention-settings",
      JSON.stringify({ version: 1, originalFileRetention: "until_deleted", updatedAt: new Date().toISOString() })
    );
    const old = historyItem("old-2", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), "old.png");
    storage.setItem("postkit-history", JSON.stringify([old]));

    assert.equal(getRetentionCleanupCandidates().length, 0);
  });
});
