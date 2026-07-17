import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { resolveInitialResultsViewState } from "@/lib/resultsViewState";
import type { GeneratedPackage, HistoryItem } from "@/types";

function readProjectFile(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

function sampleResult(): GeneratedPackage {
  return {
    id: "result-1",
    title: "테스트 결과",
    createdAt: "2026-07-18T00:00:00.000Z",
    platform: "Instagram Feed",
    purpose: "Product Promotion",
    style: "친구한테 말하듯",
    usedCredits: 30,
    captions: ["테스트 캡션"],
    hashtags: ["#테스트"],
    ctas: ["자세히 확인해보세요."],
    hooks: [],
    thumbnails: [],
    disclosure: "광고/협찬 없음",
    checklist: ["최종 문구 확인"],
    packageItems: ["피드 본문"],
    input: {
      platform: "Instagram Feed",
      purpose: "Product Promotion",
      style: "친구한테 말하듯",
      productName: "테스트 제품",
      requiredKeywords: "",
      bannedKeywords: "",
      sponsorDisclosure: "none"
    },
    selectedCaptionIndex: 0
  };
}

describe("results page AI cost guard", () => {
  it("결과 데이터 없이 /results 초기화 시 생성 결과가 없는 상태만 반환한다", () => {
    const state = resolveInitialResultsViewState(null, []);

    assert.equal(state.result, null);
    assert.equal(state.isSaved, false);
    assert.equal(state.selectedCaptionIndex, 0);
  });

  it("/results 새로고침 상당의 재마운트에서도 generate-text 호출 경로가 없다", () => {
    const first = resolveInitialResultsViewState(null, []);
    const second = resolveInitialResultsViewState(null, []);
    const resultsSource = readProjectFile("app/results/page.tsx");

    assert.deepEqual(second, first);
    assert.doesNotMatch(resultsSource, /generateUploadPackageWithAi/);
    assert.doesNotMatch(resultsSource, /\/api\/ai\/generate-text/);
  });

  it("온보딩 표시 상태와 무관하게 Results 페이지는 AI client를 import하지 않는다", () => {
    const resultsSource = readProjectFile("app/results/page.tsx");

    assert.doesNotMatch(resultsSource, /@\/lib\/ai\/client/);
    assert.doesNotMatch(resultsSource, /createGenerationIdempotencyKey/);
    assert.match(resultsSource, /생성된 결과가 없습니다/);
  });

  it("기존 localStorage 결과가 있으면 API 호출 없이 저장 결과 표시 상태를 만든다", () => {
    const result = sampleResult();
    const history: HistoryItem[] = [{ id: result.id, createdAt: result.createdAt, package: result }];
    const state = resolveInitialResultsViewState(result, history);

    assert.equal(state.result?.id, result.id);
    assert.equal(state.isSaved, true);
    assert.equal(state.selectedCaptionIndex, 0);
  });

  it("/create에서 사용자가 생성 실행할 때 generate-text client 호출은 한 번만 남아 있다", () => {
    const createSource = readProjectFile("app/create/page.tsx");
    const callMatches = createSource.match(/await generateUploadPackageWithAi\(/g) ?? [];

    assert.equal(callMatches.length, 1);
    assert.match(createSource, /async function handleGenerate\(/);
  });

  it("생성 실패 후 단순 재렌더가 자동 재호출하지 않도록 생성 호출은 handleGenerate 내부에만 있다", () => {
    const createSource = readProjectFile("app/create/page.tsx");
    const handleGenerateStart = createSource.indexOf("async function handleGenerate(");
    const handleGenerateEnd = createSource.indexOf("\n  return (", handleGenerateStart);
    const callIndex = createSource.indexOf("await generateUploadPackageWithAi(");

    assert.ok(handleGenerateStart >= 0);
    assert.ok(handleGenerateEnd > handleGenerateStart);
    assert.ok(callIndex > handleGenerateStart && callIndex < handleGenerateEnd);
    const outsideHandleGenerate = createSource.slice(0, handleGenerateStart) + createSource.slice(handleGenerateEnd);
    assert.doesNotMatch(outsideHandleGenerate, /await generateUploadPackageWithAi\(/);
  });
});
