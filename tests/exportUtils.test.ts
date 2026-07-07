import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRecommendedPreset } from "@/lib/exportPresets";
import {
  buildExportAssets,
  buildExportMetadata,
  composeFullUploadText,
  getExportContentId,
  makeExportFileName,
  sanitizeFilePart
} from "@/lib/exportUtils";
import type { GeneratedPackage } from "@/types";

function sampleResult(): GeneratedPackage {
  return {
    id: "content-abc123",
    title: "글로우 립밤 피드 콘텐츠",
    createdAt: "2026-07-07T09:30:00.000Z",
    platform: "Instagram Feed",
    purpose: "Product Promotion",
    style: "친구한테 말하듯",
    usedCredits: 30,
    captions: ["첫 번째 캡션입니다.", "두 번째 캡션입니다."],
    hashtags: ["#글로우립밤", "#데일리립밤"],
    ctas: ["저장해두고 다시 확인해보세요."],
    hooks: ["오늘 이 립밤 어때요?"],
    thumbnails: ["촉촉함 하나로 정리"],
    disclosure: "제품을 제공받아 직접 사용해본 뒤 작성했습니다.",
    checklist: ["광고 표시 확인"],
    packageItems: ["캡션", "해시태그"],
    input: {
      platform: "Instagram Feed",
      purpose: "Product Promotion",
      style: "친구한테 말하듯",
      productName: "글로우 립밤",
      requiredKeywords: "촉촉함",
      bannedKeywords: "1위",
      sponsorDisclosure: "gifted",
      uploadedFileName: "lipbalm.jpg"
    }
  } as GeneratedPackage;
}

describe("exportUtils", () => {
  it("파일명이 postkit_{platform}_{type}_{date}_{id}.ext 규칙을 따른다", () => {
    const preset = getRecommendedPreset("Instagram Feed");
    const fileName = makeExportFileName(sampleResult(), preset, "captions_txt", "txt");
    assert.match(fileName, /^postkit_[a-z0-9_]+_caption_20260707_[a-z0-9]{3}\.txt$/);
  });

  it("sanitizeFilePart와 getExportContentId가 안전한 값을 만든다", () => {
    assert.equal(sanitizeFilePart("Instagram Feed & Story"), "instagram_feed_and_story");
    assert.equal(getExportContentId("content-abc123"), "123");
    assert.equal(getExportContentId("--"), "001");
  });

  it("이미지 자산은 placeholder 없이 design_canvas 소스로 제공된다", () => {
    const preset = getRecommendedPreset("Instagram Feed");
    const assets = buildExportAssets(sampleResult(), preset);
    const imageAsset = assets.find((asset) => asset.kind === "image");

    assert.ok(imageAsset);
    assert.equal(imageAsset!.source, "design_canvas");
    assert.equal(imageAsset!.available, true);
    assert.equal(imageAsset!.width, preset.width);
    assert.equal(imageAsset!.height, preset.height);
    assert.ok(!/mock/i.test(imageAsset!.label));
  });

  it("텍스트 자산에는 원문만 담긴다", () => {
    const preset = getRecommendedPreset("Instagram Feed");
    const result = sampleResult();
    const assets = buildExportAssets(result, preset);

    const captions = assets.find((asset) => asset.contentType === "captions_txt");
    assert.equal(captions?.text, result.captions.join("\n\n"));

    const hashtags = assets.find((asset) => asset.contentType === "hashtags_txt");
    assert.equal(hashtags?.text, result.hashtags.join(" "));
  });

  it("전체 업로드 문구는 캡션, CTA, 광고 표시, 해시태그 순으로 구성된다", () => {
    const result = sampleResult();
    const text = composeFullUploadText(result);
    assert.equal(
      text,
      [result.captions[0], result.ctas[0], result.disclosure, result.hashtags.join(" ")].join("\n\n")
    );
  });

  it("메타데이터에는 프리셋 원본 크기가 기록되고 원본 파일 내용은 없다", () => {
    const preset = getRecommendedPreset("Instagram Feed");
    const metadata = buildExportMetadata(sampleResult(), preset);
    assert.equal(metadata.outputSize, `${preset.width}x${preset.height}`);
    assert.equal(metadata.service, "PostKit");
    assert.ok(!("apiKey" in metadata));
  });
});
