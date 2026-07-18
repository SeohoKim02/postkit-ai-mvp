import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearVideoExportAsset,
  createVideoObjectUrl,
  getVideoExportAsset,
  revokeVideoObjectUrl,
  storeVideoExportAsset
} from "@/lib/video/videoSessionStore";

function installUrlStubs() {
  const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const revoked: string[] = [];
  let counter = 0;

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => `blob:postkit-video-${++counter}`
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => {
      revoked.push(url);
    }
  });

  return {
    revoked,
    restore() {
      if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
      if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
    }
  };
}

describe("videoSessionStore object URL cleanup", () => {
  it("Object URL을 재사용하고 교체·revoke·clear 시 정리한다", () => {
    const stubs = installUrlStubs();
    try {
      const projectId = "video-url-cleanup";
      storeVideoExportAsset({
        videoProjectId: projectId,
        contentId: "content-1",
        fileName: "postkit_reels_20260718_abc123.webm",
        width: 1080,
        height: 1920,
        durationSeconds: 5,
        mimeType: "video/webm",
        blob: new Blob(["one"], { type: "video/webm" }),
        createdAt: "2026-07-18T00:00:00.000Z"
      });

      const firstUrl = createVideoObjectUrl(projectId);
      const secondUrl = createVideoObjectUrl(projectId);
      assert.equal(secondUrl, firstUrl);

      storeVideoExportAsset({
        videoProjectId: projectId,
        contentId: "content-1",
        fileName: "postkit_reels_20260718_abc123.webm",
        width: 1080,
        height: 1920,
        durationSeconds: 5,
        mimeType: "video/webm",
        blob: new Blob(["two"], { type: "video/webm" }),
        createdAt: "2026-07-18T00:00:01.000Z"
      });
      assert.deepEqual(stubs.revoked, [firstUrl]);

      const nextUrl = createVideoObjectUrl(projectId);
      revokeVideoObjectUrl(projectId);
      assert.ok(stubs.revoked.includes(nextUrl));
      assert.equal(getVideoExportAsset(projectId)?.objectUrl, undefined);

      const finalUrl = createVideoObjectUrl(projectId);
      clearVideoExportAsset(projectId);
      assert.ok(stubs.revoked.includes(finalUrl));
      assert.equal(getVideoExportAsset(projectId), undefined);
    } finally {
      stubs.restore();
    }
  });
});
