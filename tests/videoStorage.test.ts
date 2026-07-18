import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultVideoProject } from "@/lib/video/videoStorage";
import type { BrandProfile, GeneratedPackage } from "@/types";

function brand(): BrandProfile {
  return {
    accountName: "PostKit QA",
    category: "SNS",
    feedMood: "깔끔한",
    voice: "담백한",
    primaryColor: "#ff6b4a",
    secondaryColor: "#edf9f6",
    favoriteHashtags: "",
    requiredPhrases: "",
    bannedPhrases: "",
    defaultDisclosure: "광고/협찬 표시 없음",
    preferredPlatform: "Instagram Feed"
  };
}

function resultWithImage(): GeneratedPackage {
  return {
    id: "content-video-abc123",
    title: "여름 셔츠 피드 콘텐츠",
    createdAt: "2026-07-18T09:00:00.000Z",
    platform: "Instagram Feed",
    purpose: "Product Promotion",
    style: "고급 브랜드형",
    usedCredits: 30,
    captions: ["여름 셔츠를 가볍게 걸치기 좋은 날씨입니다."],
    hashtags: ["#여름셔츠"],
    ctas: ["사이즈와 색상을 확인해보세요."],
    hooks: ["여름 셔츠 고를 때 중요한 기준"],
    thumbnails: ["가벼운 여름 셔츠"],
    disclosure: "",
    checklist: [],
    packageItems: ["본문", "해시태그"],
    input: {
      platform: "Instagram Feed",
      purpose: "Product Promotion",
      style: "고급 브랜드형",
      productName: "여름용 린넨 셔츠",
      requiredKeywords: "가벼움, 통기성",
      bannedKeywords: "",
      sponsorDisclosure: "none",
      uploadedAssetId: "session-image-1",
      uploadedFileName: "linen-shirt.png",
      uploadedFileType: "image/png"
    }
  };
}

describe("videoStorage", () => {
  it("결과에서 넘어온 세션 이미지를 Video Studio 기본 프로젝트에 연결한다", () => {
    const project = createDefaultVideoProject(resultWithImage(), brand());

    assert.equal(project.imageItems.length, 1);
    assert.deepEqual(project.imageItems[0], {
      assetId: "session-image-1",
      name: "linen-shirt.png",
      type: "image/png",
      size: 0
    });
  });
});
