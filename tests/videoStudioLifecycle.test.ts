import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { makeVideoFileName } from "@/lib/video/videoUtils";

function source(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("Video Studio lifecycle guards", () => {
  it("Video Studio 진입·미리보기·다운로드 코드에 AI generate-text 호출 경로가 없다", () => {
    const page = source("app/video-studio/page.tsx");

    assert.doesNotMatch(page, /generateUploadPackageWithAi/);
    assert.doesNotMatch(page, /\/api\/ai\/generate-text/);
    assert.doesNotMatch(page, /@\/lib\/ai\/client/);
  });

  it("중복 클릭을 ref와 disabled 상태로 차단하고 완료·실패·취소 후 복구한다", () => {
    const page = source("app/video-studio/page.tsx");

    assert.match(page, /const generatingRef = useRef\(false\)/);
    assert.match(page, /isGenerating \|\| generatingRef\.current/);
    assert.match(page, /generatingRef\.current = true/);
    assert.ok((page.match(/generatingRef\.current = false/g) ?? []).length >= 4);
    assert.match(page, /disabled=\{isGenerating\}/);
  });

  it("Object URL과 생성 중 recorder를 unmount 시 정리한다", () => {
    const page = source("app/video-studio/page.tsx");
    const renderer = source("lib/video/videoRenderer.ts");

    assert.match(page, /revokeVideoObjectUrl\(projectId\)/);
    assert.match(page, /abortRef\.current\?\.abort\(\)/);
    assert.match(renderer, /signal\?\.removeEventListener\("abort", abort\)/);
  });

  it("이미지가 없는 상태에서는 영상 생성을 차단한다", () => {
    const page = source("app/video-studio/page.tsx");

    assert.match(page, /imageUrls\.length === 0/);
    assert.match(page, /사진을 1장 이상 추가해야 영상 미리보기와 다운로드를 만들 수 있어요/);
  });

  it("다운로드 파일명은 플랫폼과 날짜, 콘텐츠 식별자를 포함한 webm 확장자를 사용한다", () => {
    assert.equal(
      makeVideoFileName({
        id: "video-1",
        contentId: "content-caviar-abc123",
        platform: "Instagram Reels",
        generatedAt: "2026-07-18T12:34:56.000Z"
      }),
      "postkit_reels_20260718_abc123.webm"
    );
  });
});
