import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  assessDesignQuality,
  classifyDesignCategory,
  getCentralForbiddenRect,
  getOverlayBand,
  growSubjectBounds,
  getTextStrokeWidth,
  getTypographySpec,
  getTypographyWeights,
  inspectCanvasTextLayout,
  isPlacementUncertain,
  nextRecommendedPlacement,
  pickAutoPlacement,
  prepareCanvasImageText,
  rankAutoPlacements,
  resolveDesignCategory,
  safeRecommendedPlacements,
  shouldBlockDownload,
  subjectOverlapRatio,
  textColorForLuma,
  watermarkSideFor
} from "@/lib/canvasRenderer";
import type { DesignQualityInput, PlacementRegionStats, RecommendedPlacement } from "@/lib/canvasRenderer";
import { designTemplates, getDesignOutputPreset } from "@/lib/designTemplates";
import { createDefaultDesignProject, pickImageTextSources, resolveInitialOutputPresetId } from "@/lib/designStorage";
import { getPostKitWatermarkSpec } from "@/lib/watermarkPolicy";
import type { BrandProfile, DesignProject, GeneratedPackage } from "@/types";

// node:test에는 캔버스가 없으므로 폰트 크기 기반 폭 근사로 measureText를 흉내 낸다.
function fakeMeasureContext(): Pick<CanvasRenderingContext2D, "font" | "measureText"> {
  let currentFont = "700 20px Inter";
  return {
    get font() {
      return currentFont;
    },
    set font(value: string) {
      currentFont = value;
    },
    measureText(text: string) {
      const size = Number(/ (\d+)px/.exec(currentFont)?.[1] ?? 16);
      return { width: Array.from(text).length * size * 0.62 } as TextMetrics;
    }
  };
}

function makeProject(overrides: Partial<DesignProject> = {}): DesignProject {
  const now = new Date().toISOString();
  return {
    id: "design-test",
    version: 1,
    contentId: "content-test",
    templateId: "photo-focus",
    outputPresetId: "instagram-feed-vertical",
    platform: "Instagram Feed",
    width: 1080,
    height: 1350,
    editedText: {
      title: "여름 출근룩을 가볍게",
      subtitle: "시원한 착용감과 자연스러운 핏으로 출근룩과 주말 코디에 잘 어울립니다.",
      cta: "자세히 보기",
      brandName: "",
      disclosure: "",
      footer: ""
    },
    imageSettings: { fit: "cover", scale: 1, offsetX: 0, offsetY: 0, brightness: 100, overlayOpacity: 0.2 },
    textPosition: "bottom",
    textAlignment: "left",
    textPlacementMode: "auto",
    fontScale: 0.86,
    primaryColor: "#ff6b4a",
    secondaryColor: "#edf9f6",
    showTitle: true,
    showBrandName: false,
    showCta: false,
    showDisclosure: false,
    brandStyleSnapshot: {
      brandName: "",
      mood: "",
      voice: "",
      primaryColor: "#ff6b4a",
      secondaryColor: "#edf9f6",
      disclosureStyle: ""
    },
    generatedAt: now,
    downloaded: false,
    exported: false,
    lastUpdatedAt: now,
    ...overrides
  };
}

function makeResult(): GeneratedPackage {
  const now = new Date().toISOString();
  return {
    id: "content-test",
    title: "여름용 린넨 셔츠",
    createdAt: now,
    platform: "Instagram Feed",
    purpose: "Product Promotion",
    style: "고급 브랜드형",
    usedCredits: 1,
    captions: ["시원한 여름 셔츠를 소개합니다."],
    hashtags: ["#린넨셔츠"],
    ctas: ["자세히 보기"],
    hooks: ["여름 출근룩을 가볍게"],
    thumbnails: ["여름 출근룩을 가볍게"],
    disclosure: "",
    checklist: [],
    packageItems: [],
    input: {
      platform: "Instagram Feed",
      purpose: "Product Promotion",
      style: "고급 브랜드형",
      productName: "여름용 린넨 셔츠",
      requiredKeywords: "가벼운 착용감",
      bannedKeywords: "",
      sponsorDisclosure: "none"
    }
  };
}

function makeBrand(): BrandProfile {
  return {
    accountName: "테스트 브랜드",
    category: "패션",
    voice: "친근한",
    feedMood: "밝은",
    favoriteHashtags: "",
    requiredPhrases: "",
    bannedPhrases: "",
    defaultDisclosure: "광고/협찬 표시 없음",
    preferredPlatform: "Instagram Feed"
  };
}

describe("canvasRenderer image text", () => {
  it("이미지용 문구에서 해시태그와 과도한 길이를 제거한다", () => {
    const text = prepareCanvasImageText(
      "시원한 착용감으로 출근룩과 주말 코디에 잘 어울립니다. 자세한 설명은 본문에서 확인해 주세요. #린넨셔츠 #여름셔츠",
      34
    );

    assert.equal(text.includes("#"), false);
    assert.ok(Array.from(text).length <= 34);
    assert.equal(text.endsWith("..."), false);
  });

  it("짧은 CTA는 그대로 유지한다", () => {
    assert.equal(prepareCanvasImageText("자세히 보기", 18), "자세히 보기");
  });

  it("긴 명사구 제목은 마지막 관형절 뒤의 제품명 구절을 살려 축약한다", () => {
    const text = prepareCanvasImageText("한여름 출근길과 주말 나들이를 모두 편안하게 만들어주는 가벼운 린넨 셔츠", 18);

    assert.ok(Array.from(text).length <= 18, `${text} (${Array.from(text).length})`);
    assert.equal(text.endsWith("..."), false);
    // 관형형 수식어("만들어주는", "위한")나 조사로 끝나는 미완성 절단 금지
    assert.equal(/(만들어주는|위한|모두|을|를)$/u.test(text), false, `dangling ending: ${text}`);
    // 핵심 제품명은 유지되어야 한다
    assert.ok(text.includes("린넨 셔츠"), `product name lost: ${text}`);
  });

  it("이미지 제목은 약 18자 제한 안에서 단어 중간 절단 없이 축약된다", () => {
    const inputs = [
      "한여름 출근길과 주말 나들이를 모두 편안하게 만들어주는 가벼운 린넨 셔츠",
      "특별한 식탁을 위한 프리미엄 캐비어와 어울리는 와인 페어링 안내"
    ];
    for (const input of inputs) {
      const text = prepareCanvasImageText(input, 18);
      assert.ok(Array.from(text).length <= 18, `${text} (${Array.from(text).length})`);
      // 원문 어절이 잘리지 않고 그대로 존재해야 한다(단어 중간 절단 금지)
      const inputWords = new Set(input.replace(/[.。!！?？]/gu, "").split(" "));
      text.split(" ").forEach((word) => {
        assert.ok(inputWords.has(word), `word cut in middle: ${word} of ${text}`);
      });
    }
  });

  it("완결형 문장은 앞쪽 수식어를 덜어내고 문장 끝 서술어를 보존한다", () => {
    const text = prepareCanvasImageText(
      "가볍고 시원한 착용감과 자연스럽게 떨어지는 핏으로 출근룩부터 편안한 주말 코디까지 폭넓게 활용할 수 있습니다.",
      46
    );

    assert.ok(Array.from(text).length <= 46, `${text} (${Array.from(text).length})`);
    assert.ok(text.endsWith("있습니다"), `predicate lost: ${text}`);
    assert.ok(text.includes("착용감"), `core benefit lost: ${text}`);
  });

  it("기본 디자인 템플릿은 사진을 가리는 카드형 오버레이를 쓰지 않는다", () => {
    const blockedStyles = new Set(["brand-panel", "blur-card", "soft-dark", "soft-light"]);

    designTemplates.forEach((template) => {
      assert.equal(blockedStyles.has(template.overlayStyle), false, `${template.id} should stay photo-focused`);
      assert.equal(template.showBrandName, false, `${template.id} should not duplicate brand labels`);
      assert.equal(template.showDisclosure, false, `${template.id} should not place long disclosure text on image`);
    });
  });
});

describe("canvasRenderer typography spec", () => {
  it("Feed 제목은 카테고리 범위(패션 36~45, 음식 42~54, 일반 40~52)를 지킨다", () => {
    const ranges = { fashion: [36, 45], food: [42, 54], general: [40, 52] } as const;
    for (const category of ["fashion", "food", "general"] as const) {
      for (const preset of ["small", "medium", "large"] as const) {
        const spec = getTypographySpec({ width: 1080, height: 1350, textSizePreset: preset }, category);
        assert.ok(
          spec.titleMax >= ranges[category][0] && spec.titleMax <= ranges[category][1],
          `feed ${category} ${preset} title ${spec.titleMax}`
        );
        assert.ok(spec.bodyMax >= 23 && spec.bodyMax <= 29, `feed ${category} ${preset} body ${spec.bodyMax}`);
        assert.ok(spec.ctaMax >= 19 && spec.ctaMax <= 24, `feed ${category} ${preset} cta ${spec.ctaMax}`);
      }
    }
  });

  it("Story 제목은 카테고리 범위(패션 42~52, 음식 48~60, 일반 46~58)를 지킨다", () => {
    const ranges = { fashion: [42, 52], food: [48, 60], general: [46, 58] } as const;
    for (const category of ["fashion", "food", "general"] as const) {
      for (const preset of ["small", "medium", "large"] as const) {
        const spec = getTypographySpec({ width: 1080, height: 1920, textSizePreset: preset }, category);
        assert.ok(
          spec.titleMax >= ranges[category][0] && spec.titleMax <= ranges[category][1],
          `story ${category} ${preset} title ${spec.titleMax}`
        );
        assert.ok(spec.bodyMax >= 25 && spec.bodyMax <= 32, `story ${category} ${preset} body ${spec.bodyMax}`);
        assert.ok(spec.ctaMax >= 21 && spec.ctaMax <= 26, `story ${category} ${preset} cta ${spec.ctaMax}`);
      }
    }
  });

  it("패션 제목은 음식·카페 제목보다 작고 가볍다", () => {
    const fashion = getTypographySpec({ width: 1080, height: 1350, textSizePreset: "medium" }, "fashion");
    const food = getTypographySpec({ width: 1080, height: 1350, textSizePreset: "medium" }, "food");
    assert.ok(fashion.titleMax < food.titleMax, `fashion ${fashion.titleMax} vs food ${food.titleMax}`);

    const fashionWeights = getTypographyWeights("fashion");
    const foodWeights = getTypographyWeights("food");
    assert.ok(fashionWeights.title <= 650, `fashion title weight ${fashionWeights.title}`);
    assert.ok(fashionWeights.subtitle <= 500, `fashion subtitle weight ${fashionWeights.subtitle}`);
    assert.ok(fashionWeights.title < foodWeights.title);
  });

  it("크기 프리셋은 작게 < 보통 < 크게 순서를 지킨다", () => {
    const small = getTypographySpec({ width: 1080, height: 1350, textSizePreset: "small" });
    const medium = getTypographySpec({ width: 1080, height: 1350, textSizePreset: "medium" });
    const large = getTypographySpec({ width: 1080, height: 1350, textSizePreset: "large" });

    assert.ok(small.titleMax < medium.titleMax && medium.titleMax < large.titleMax);
  });

  it("크기 프리셋이 실제 레이아웃 글자 크기에 반영된다", () => {
    const smallLayout = inspectCanvasTextLayout(fakeMeasureContext(), makeProject({ textSizePreset: "small" }));
    const largeLayout = inspectCanvasTextLayout(fakeMeasureContext(), makeProject({ textSizePreset: "large" }));
    const smallTitle = smallLayout.lines.find((line) => line.role === "title");
    const largeTitle = largeLayout.lines.find((line) => line.role === "title");

    assert.ok(smallTitle && largeTitle);
    assert.ok(smallTitle.size < largeTitle.size, `small ${smallTitle.size} vs large ${largeTitle.size}`);
  });

  it("패션으로 분류된 디자인의 제목 굵기는 650 이하로 렌더링된다", () => {
    // makeProject 제목("출근룩")이 패션으로 자동 분류된다
    const layout = inspectCanvasTextLayout(fakeMeasureContext(), makeProject());
    const title = layout.lines.find((line) => line.role === "title");
    assert.ok(title);
    assert.ok(title.weight <= 650, `fashion title weight ${title.weight}`);
  });

  it("글자 외곽선은 최대 1px로 절제한다", () => {
    for (const size of [16, 24, 34, 48, 62]) {
      const width = getTextStrokeWidth(size);
      assert.ok(width >= 0 && width <= 1, `stroke ${width} at ${size}px`);
    }
  });
});

describe("canvasRenderer text layout", () => {
  it("긴 한글 제목도 최대 2줄 안에서 캔버스 경계를 지킨다", () => {
    const context = fakeMeasureContext();
    const project = makeProject({
      editedText: {
        title: "한여름 출근길과 주말 나들이를 모두 편안하게 만들어주는 가벼운 린넨 셔츠",
        subtitle: "가볍고 시원한 착용감과 자연스럽게 떨어지는 핏으로 출근룩부터 편안한 주말 코디까지 폭넓게 활용할 수 있습니다.",
        cta: "자세히 보기",
        brandName: "",
        disclosure: "",
        footer: ""
      }
    });
    const layout = inspectCanvasTextLayout(context, project);
    const titleLines = layout.lines.filter((line) => line.role === "title");
    const subtitleLines = layout.lines.filter((line) => line.role === "subtitle");

    assert.ok(titleLines.length >= 1 && titleLines.length <= 2, `title ${titleLines.length} lines`);
    assert.ok(subtitleLines.length <= 3, `subtitle ${subtitleLines.length} lines`);
    layout.lines.forEach((line) => {
      assert.ok(line.width <= layout.box.width + 1, `${line.role} overflows box width`);
      assert.ok(line.y >= layout.box.y - 1, `${line.role} above box`);
      assert.ok(line.y + line.height <= layout.height + 1, `${line.role} below canvas`);
      assert.equal(line.line.endsWith("..."), false);
    });
  });

  it("공백 없는 초장문 영문 문자열도 무한 반복 없이 폭 안에서 감싼다", () => {
    const context = fakeMeasureContext();
    const project = makeProject({
      editedText: {
        title: "SUPERLIGHTWEIGHTBREATHABLELINENSHIRTLIMITEDSUMMEREDITIONPREMIUMQUALITY",
        subtitle: "UltraComfortableEverydayLinenwearForCommutersAndWeekendTravelersMadeWithNaturalFiber",
        cta: "SHOPNOW",
        brandName: "",
        disclosure: "",
        footer: ""
      }
    });
    const layout = inspectCanvasTextLayout(context, project);

    assert.ok(layout.lines.length > 0);
    layout.lines.forEach((line) => {
      assert.ok(line.width <= layout.box.width + 1, `${line.role} overflows box width`);
    });
  });

  it("CTA는 기본 숨김이고 표시 설정을 켠 경우에만 렌더링된다", () => {
    const hidden = inspectCanvasTextLayout(fakeMeasureContext(), makeProject());
    assert.equal(hidden.lines.some((line) => line.role === "cta"), false, "CTA must stay hidden by default");

    const shown = inspectCanvasTextLayout(fakeMeasureContext(), makeProject({ showCta: true }));
    const ctaLines = shown.lines.filter((line) => line.role === "cta");
    assert.equal(ctaLines.length, 1);
    const titleLine = shown.lines.find((line) => line.role === "title");
    assert.ok(titleLine && ctaLines[0].size < titleLine.size, "CTA must be smaller than title");
  });

  it("수동 위치(우측 상단)가 레이아웃 좌표에 반영된다", () => {
    const layout = inspectCanvasTextLayout(
      fakeMeasureContext(),
      makeProject({ textPlacementMode: "manual", textPosition: "top", textAnchorX: "right" })
    );

    assert.ok(layout.box.x + layout.box.width >= layout.width * 0.9, "box must hug right edge");
    assert.ok(layout.lines[0].y <= layout.height * 0.2, "text must start near top");
  });

  it("수동 위치(좌측 하단)는 하단에 붙는다", () => {
    const layout = inspectCanvasTextLayout(
      fakeMeasureContext(),
      makeProject({ textPlacementMode: "manual", textPosition: "bottom", textAnchorX: "left" })
    );
    const lastLine = layout.lines[layout.lines.length - 1];

    assert.ok(layout.box.x <= layout.width * 0.1, "box must hug left edge");
    assert.ok(lastLine.y + lastLine.height >= layout.height * 0.6, "text must sit in bottom area");
  });

  it("정렬 설정이 글줄 기준 좌표에 반영된다", () => {
    const centered = inspectCanvasTextLayout(
      fakeMeasureContext(),
      makeProject({ textPlacementMode: "manual", textAlignment: "center" })
    );
    centered.lines.forEach((line) => {
      assert.equal(line.x, centered.box.x + centered.box.width / 2);
    });

    const right = inspectCanvasTextLayout(
      fakeMeasureContext(),
      makeProject({ textPlacementMode: "manual", textAlignment: "right" })
    );
    right.lines.forEach((line) => {
      assert.equal(line.x, right.box.x + right.box.width);
    });
  });

  it("새 설정 필드가 없는 기존 저장 데이터도 안전한 기본값으로 렌더링된다", () => {
    const legacy = makeProject();
    delete legacy.textPlacementMode;
    delete legacy.textAnchorX;
    delete legacy.textSizePreset;
    delete legacy.watermarkPosition;

    const layout = inspectCanvasTextLayout(fakeMeasureContext(), legacy);
    assert.ok(layout.lines.some((line) => line.role === "title"));
  });
});

describe("canvasRenderer auto placement", () => {
  const base = { position: "bottom", anchorX: "left", meanLuma: 128, lumaSpread: 30, edgeDensity: 12, subjectOverlap: 0 } as const;

  it("복잡도가 가장 낮은 코너를 고른다", () => {
    const candidates: PlacementRegionStats[] = [
      { ...base, position: "bottom", anchorX: "left", lumaSpread: 60, edgeDensity: 30 },
      { ...base, position: "bottom", anchorX: "right", lumaSpread: 8, edgeDensity: 3 },
      { ...base, position: "top", anchorX: "left", lumaSpread: 40, edgeDensity: 20 },
      { ...base, position: "top", anchorX: "right", lumaSpread: 45, edgeDensity: 25 }
    ];

    const picked = pickAutoPlacement(candidates);
    assert.equal(picked.position, "bottom");
    assert.equal(picked.anchorX, "right");
  });

  it("중앙 피사체 금지 영역과 겹치는 후보는 단순해도 피한다", () => {
    const candidates: PlacementRegionStats[] = [
      { ...base, position: "bottom", anchorX: "left", lumaSpread: 5, edgeDensity: 2, subjectOverlap: 0.5 },
      { ...base, position: "top", anchorX: "right", lumaSpread: 25, edgeDensity: 14, subjectOverlap: 0 }
    ];

    const picked = pickAutoPlacement(candidates);
    assert.equal(picked.position, "top");
    assert.equal(picked.anchorX, "right");
  });

  it("복잡도가 같으면 상단보다 하단을 선호한다", () => {
    const candidates: PlacementRegionStats[] = [
      { ...base, position: "top", anchorX: "left" },
      { ...base, position: "bottom", anchorX: "left" }
    ];

    assert.equal(pickAutoPlacement(candidates).position, "bottom");
  });

  it("경고 수준(0.28 초과) 겹침 후보는 아무리 단순해도 깨끗한 코너에 밀린다", () => {
    const candidates: PlacementRegionStats[] = [
      // 겹치지만 매우 단순한 영역 vs 겹치지 않지만 복잡한 영역
      { ...base, position: "bottom", anchorX: "left", lumaSpread: 5, edgeDensity: 2, subjectOverlap: 0.32 },
      { ...base, position: "top", anchorX: "right", lumaSpread: 60, edgeDensity: 30, subjectOverlap: 0 }
    ];

    const picked = pickAutoPlacement(candidates);
    assert.equal(picked.position, "top");
    assert.equal(picked.anchorX, "right");
  });

  it("패션 카테고리는 동점일 때 하단 대신 상단 코너를 선호한다", () => {
    const candidates: PlacementRegionStats[] = [
      { ...base, position: "bottom", anchorX: "left" },
      { ...base, position: "top", anchorX: "left" }
    ];

    assert.equal(pickAutoPlacement(candidates, "fashion").position, "top");
    assert.equal(pickAutoPlacement(candidates, "general").position, "bottom");
  });

  it("추천 순환 후보에서 경고 수준 이상 겹치는 코너는 제외된다", () => {
    const ranked = rankAutoPlacements<PlacementRegionStats>([
      { ...base, position: "top", anchorX: "left", subjectOverlap: 0 },
      { ...base, position: "top", anchorX: "right", subjectOverlap: 0.1 },
      { ...base, position: "bottom", anchorX: "left", subjectOverlap: 0.5 },
      { ...base, position: "bottom", anchorX: "right", subjectOverlap: 0.62 }
    ]);

    const safe = safeRecommendedPlacements(ranked);
    assert.equal(safe.length, 2);
    assert.ok(safe.every((candidate) => candidate.subjectOverlap <= 0.28));
    assert.ok(safe.every((candidate) => candidate.position === "top"));
  });

  it("안전한 코너가 2개 미만이면 경고 수준까지만 채우고 차단 수준(0.55 초과)은 추천하지 않는다", () => {
    const ranked = rankAutoPlacements<PlacementRegionStats>([
      { ...base, position: "top", anchorX: "left", subjectOverlap: 0.1 },
      { ...base, position: "top", anchorX: "right", subjectOverlap: 0.4 },
      { ...base, position: "bottom", anchorX: "left", subjectOverlap: 0.5 },
      { ...base, position: "bottom", anchorX: "right", subjectOverlap: 0.62 }
    ]);

    const safe = safeRecommendedPlacements(ranked);
    assert.equal(safe.length, 3);
    assert.ok(safe.every((candidate) => candidate.subjectOverlap <= 0.55));
    assert.deepEqual(safe[0], ranked[0]);
  });

  it("모든 코너가 차단 수준이면 그나마 나은 한 곳만 남긴다", () => {
    const ranked = rankAutoPlacements<PlacementRegionStats>([
      { ...base, position: "top", anchorX: "left", subjectOverlap: 0.58 },
      { ...base, position: "top", anchorX: "right", subjectOverlap: 0.7 },
      { ...base, position: "bottom", anchorX: "left", subjectOverlap: 0.8 },
      { ...base, position: "bottom", anchorX: "right", subjectOverlap: 0.9 }
    ]);

    const safe = safeRecommendedPlacements(ranked);
    assert.equal(safe.length, 1);
    assert.deepEqual(safe[0], ranked[0]);
  });

  it("모든 후보가 불안하면 자동 배치 경고 대상으로 판정한다", () => {
    assert.equal(isPlacementUncertain({ lumaSpread: 20, edgeDensity: 10, subjectOverlap: 0.05 }), false);
    assert.equal(isPlacementUncertain({ lumaSpread: 20, edgeDensity: 10, subjectOverlap: 0.4 }), true);
    assert.equal(isPlacementUncertain({ lumaSpread: 20, edgeDensity: 40, subjectOverlap: 0 }), true);
  });

  it("중앙 금지 영역은 가로 50% × 세로 65%다", () => {
    const rect = getCentralForbiddenRect(1080, 1350);
    assert.equal(rect.width, 540);
    assert.equal(rect.height, 877.5);

    // 중앙에 놓인 텍스트는 전부 겹치고, 모서리 텍스트는 겹치지 않는다
    assert.equal(subjectOverlapRatio({ x: 400, y: 500, width: 200, height: 200 }, 1080, 1350), 1);
    assert.equal(subjectOverlapRatio({ x: 0, y: 0, width: 200, height: 150 }, 1080, 1350), 0);
    assert.equal(subjectOverlapRatio({ x: 880, y: 1200, width: 200, height: 150 }, 1080, 1350), 0);
  });

  it("피사체 경계 추정은 중앙 유사색 블록만 감싼다", () => {
    const grid = 20;
    const similar = Array.from({ length: grid }, (_, row) =>
      Array.from({ length: grid }, (_, col) => row >= 6 && row <= 14 && col >= 5 && col <= 12)
    );

    const bounds = growSubjectBounds(similar, 10, 10);
    assert.ok(bounds);
    assert.equal(bounds.top, 6);
    assert.equal(bounds.bottom, 14);
    assert.equal(bounds.left, 5);
    assert.equal(bounds.right, 12);
  });

  it("영역 밝기에 따라 텍스트 색을 일관되게 고른다", () => {
    assert.equal(textColorForLuma(210), "dark");
    assert.equal(textColorForLuma(70), "light");
  });

  it("워터마크는 텍스트 반대쪽에 배치한다", () => {
    assert.equal(watermarkSideFor("right"), "left");
    assert.equal(watermarkSideFor("left"), "right");
  });
});

describe("canvasRenderer overlay band", () => {
  it("오버레이 밴드는 이미지 높이의 25%를 넘지 않는다", () => {
    const height = 1350;
    for (const position of ["top", "bottom", "center"] as const) {
      const band = getOverlayBand(height, 1000, 1300, 75, position);
      assert.ok(band.y1 - band.y0 <= height * 0.25 + 1, `${position} band too tall: ${band.y1 - band.y0}`);
      assert.ok(band.y0 >= 0 && band.y1 <= height);
    }
  });

  it("사진 전체를 덮는 blur·opacity·전면 오버레이 코드가 없다", () => {
    const source = readFileSync(path.resolve(process.cwd(), "lib/canvasRenderer.ts"), "utf8");
    assert.equal(/blur\(/.test(source), false, "full-photo blur must not exist");
    assert.equal(/globalAlpha/.test(source), false, "photo opacity reduction must not exist");
    assert.equal(/grayscale\(|saturate\(|opacity\(/.test(source), false, "photo desaturation must not exist");
    assert.equal(/fillRoundedRect|roundRect/.test(source), false, "text background card must not exist");
  });
});

describe("watermark spec", () => {
  it("워터마크는 카드 없이 Feed 16~20px·불투명도 0.42~0.58의 작은 평문이다", () => {
    for (const [width, height] of [[1080, 1350], [1080, 1080], [1280, 720]] as const) {
      const spec = getPostKitWatermarkSpec(width, height);
      assert.equal(spec.hasBackgroundCard, false);
      assert.ok(spec.fontSize >= 16 && spec.fontSize <= 20, `feed fontSize ${spec.fontSize}`);
      assert.ok(spec.opacity >= 0.42 && spec.opacity <= 0.58, `opacity ${spec.opacity}`);
      assert.ok(spec.maxWidthRatio <= 0.16, `maxWidthRatio ${spec.maxWidthRatio}`);
      assert.ok(spec.marginX >= 32 && spec.marginX <= 44, `marginX ${spec.marginX}`);
      assert.ok(spec.marginY >= 32 && spec.marginY <= 44, `marginY ${spec.marginY}`);
    }
  });

  it("Story 워터마크는 18~22px 범위를 쓴다", () => {
    const spec = getPostKitWatermarkSpec(1080, 1920);
    assert.ok(spec.fontSize >= 18 && spec.fontSize <= 22, `story fontSize ${spec.fontSize}`);
    assert.ok(spec.marginX >= 32 && spec.marginX <= 44);
    assert.ok(spec.marginY >= 32 && spec.marginY <= 44);
  });

  it("워터마크 렌더 코드에 둥근 카드가 없다", () => {
    const source = readFileSync(path.resolve(process.cwd(), "lib/watermarkPolicy.ts"), "utf8");
    assert.equal(/quadraticCurveTo|roundRect|drawRoundedRect/.test(source), false);
  });
});

describe("design project defaults", () => {
  it("새 디자인의 CTA는 기본 숨김이고 새 설정은 안전한 기본값으로 시작한다", () => {
    const project = createDefaultDesignProject(makeResult(), makeBrand(), null);

    assert.equal(project.showCta, false, "CTA must be hidden by default");
    assert.equal(project.textPlacementMode, "auto");
    assert.equal(project.textSizePreset, "medium");
    assert.equal(project.watermarkPosition, "auto");
    assert.equal(project.textAnchorX, "left");
    assert.equal(project.contentCategory, "auto");
  });

  it("패션 결과의 기본 이미지 문구는 상품명형 제목 + 어절 절단 없는 본문으로 시작한다", () => {
    const project = createDefaultDesignProject(makeResult(), makeBrand(), null);

    // 훅("여름 출근룩을 가볍게")에 제품명이 없으므로 제품명 자체가 제목이 된다.
    assert.equal(project.editedText.title, "여름용 린넨 셔츠");
    // 본문은 설명형 캡션이 서술어를 유지한 채 들어간다.
    assert.equal(project.editedText.subtitle, "시원한 여름 셔츠를 소개합니다.");
  });
});

describe("image copy tone by category", () => {
  it("패션은 후킹 문장 대신 제품명이 들어간 상품 홍보형 제목을 우선한다", () => {
    const picked = pickImageTextSources({
      productName: "프리미엄 린넨 셔츠",
      productLine: "프리미엄 린넨 셔츠, 시원한 여름",
      thumbnail: "시원한 프리미엄 린넨 셔츠 컬렉션",
      hook: "여름 출근룩을 가볍게",
      caption: "출근룩부터 주말 코디와 휴가 스타일링까지 활용할 수 있습니다."
    });

    assert.equal(picked.titleSource, "시원한 프리미엄 린넨 셔츠 컬렉션");
    assert.equal(picked.subtitleSource, "출근룩부터 주말 코디와 휴가 스타일링까지 활용할 수 있습니다.");
  });

  it("패션 후보에 제품명이 없으면 제품명 자체를 제목으로 쓴다", () => {
    const picked = pickImageTextSources({
      productName: "여름용 린넨 셔츠",
      productLine: "여름용 린넨 셔츠, 가벼운 착용감",
      thumbnail: "여름 출근룩을 가볍게",
      hook: "여름 출근룩을 가볍게",
      caption: "시원한 착용감의 셔츠입니다."
    });

    assert.equal(picked.titleSource, "여름용 린넨 셔츠");
    assert.equal(picked.subtitleSource, "시원한 착용감의 셔츠입니다.");
  });

  it("패션 캡션이 38자 안에 끝나는 문장이 아니면 문장 중간을 자르지 않고 훅으로 넘어간다", () => {
    const picked = pickImageTextSources({
      productName: "프리미엄 린넨 셔츠",
      productLine: "프리미엄 린넨 셔츠, 시원한 여름",
      thumbnail: "",
      hook: "여름 출근룩을 가볍게",
      caption: "프리미엄 린넨 셔츠 관련 정보가 궁금하다면 구성과 보관 방법을 먼저 확인해 주세요. 착용감 구성인지 살펴보세요."
    });

    assert.equal(picked.titleSource, "프리미엄 린넨 셔츠");
    assert.equal(picked.subtitleSource, "여름 출근룩을 가볍게");
  });

  it("패션 본문이 제목 구절로 시작하면 제품명 반복을 떼어낸다", () => {
    const picked = pickImageTextSources({
      productName: "프리미엄 린넨 셔츠",
      productLine: "프리미엄 린넨 셔츠, 가볍고 시원한 착용감",
      thumbnail: "",
      hook: "",
      caption: ""
    });

    assert.equal(picked.titleSource, "프리미엄 린넨 셔츠");
    assert.equal(picked.subtitleSource, "가볍고 시원한 착용감");
  });

  it("제목 구절을 떼어낸 나머지가 너무 짧으면 원문 본문을 유지한다", () => {
    const picked = pickImageTextSources({
      productName: "프리미엄 린넨 셔츠",
      productLine: "프리미엄 린넨 셔츠, 여름용",
      thumbnail: "",
      hook: "",
      caption: ""
    });

    assert.equal(picked.subtitleSource, "프리미엄 린넨 셔츠, 여름용");
  });

  it("음식·카페는 기존 메뉴 소개형(썸네일·훅 우선) 톤을 유지한다", () => {
    const picked = pickImageTextSources({
      productName: "딸기 라떼",
      productLine: "딸기 라떼, 시즌 한정",
      thumbnail: "산뜻한 딸기 라떼 시즌 메뉴",
      hook: "달콤한 한 잔의 여유",
      caption: "생딸기와 우유가 어우러진 시즌 음료입니다."
    });

    assert.equal(picked.titleSource, "산뜻한 딸기 라떼 시즌 메뉴");
    assert.equal(picked.subtitleSource, "달콤한 한 잔의 여유");
  });

  it("일반 제품도 기존 소스 순서를 유지한다", () => {
    const picked = pickImageTextSources({
      productName: "프리미엄 기프트 세트",
      productLine: "프리미엄 기프트 세트, 한정 수량",
      thumbnail: "",
      hook: "특별한 날을 위한 선택",
      caption: "감사의 마음을 전하는 프리미엄 기프트 세트입니다."
    });

    assert.equal(picked.titleSource, "특별한 날을 위한 선택");
    assert.equal(picked.subtitleSource, "프리미엄 기프트 세트, 한정 수량");
  });
});

describe("design category classification", () => {
  it("패션 키워드가 있으면 패션으로 분류한다", () => {
    assert.equal(classifyDesignCategory("여름 출근룩을 가볍게 만드는 린넨 셔츠 코디"), "fashion");
    assert.equal(classifyDesignCategory("데일리룩에 어울리는 가방과 신발"), "fashion");
  });

  it("음식·카페 키워드가 있으면 음식·카페로 분류한다", () => {
    assert.equal(classifyDesignCategory("산뜻한 딸기와 부드러운 우유가 어우러진 시즌 메뉴"), "food");
    assert.equal(classifyDesignCategory("특별한 식탁을 위한 캐비어와 와인"), "food");
  });

  it("분류가 확실하지 않으면 일반 제품으로 처리한다", () => {
    assert.equal(classifyDesignCategory("새로운 프리미엄 제품을 소개합니다"), "general");
    // 패션·음식 키워드가 동점인 경우도 일반 제품
    assert.equal(classifyDesignCategory("셔츠 커피"), "general");
  });

  it("사용자가 수동으로 고른 카테고리가 자동 분류보다 우선한다", () => {
    const project = makeProject({ contentCategory: "food" });
    assert.equal(resolveDesignCategory(project), "food");

    const auto = makeProject({ contentCategory: "auto" });
    assert.equal(resolveDesignCategory(auto), "fashion", "출근룩 문구는 자동으로 패션이어야 한다");
  });

  it("스트레스 입력: 명확한 키워드는 분류하고 근거 없는 입력은 일반 제품으로 남긴다", () => {
    // 패션 예상
    assert.equal(classifyDesignCategory("여름 데일리 셔츠"), "fashion");
    assert.equal(classifyDesignCategory("출근룩 컬렉션"), "fashion");
    assert.equal(classifyDesignCategory("가벼운 휴가용 의류"), "fashion");
    // 음식·카페 예상
    assert.equal(classifyDesignCategory("여름 시즌 딸기 음료"), "food");
    assert.equal(classifyDesignCategory("프리미엄 테이블 메뉴"), "food");
    assert.equal(classifyDesignCategory("와인과 즐기는 캐비어"), "food");
    // 근거 부족 → 억지 분류 없이 일반 제품
    assert.equal(classifyDesignCategory("프리미엄 기프트 컬렉션"), "general");
    assert.equal(classifyDesignCategory("여름 신상품"), "general");
    assert.equal(classifyDesignCategory("새로운 라이프스타일 아이템"), "general");
  });

  it("패션 중앙 금지 영역은 가로 55%로 더 보수적이다", () => {
    const fashion = getCentralForbiddenRect(1080, 1350, "fashion");
    const general = getCentralForbiddenRect(1080, 1350);
    assert.equal(fashion.width, 1080 * 0.55);
    assert.ok(fashion.width > general.width);
    assert.ok(fashion.height > general.height);
  });
});

describe("placement recommendation cycle", () => {
  const base = { meanLuma: 128, lumaSpread: 30, edgeDensity: 12, subjectOverlap: 0 } as const;
  const candidates: PlacementRegionStats[] = [
    { ...base, position: "bottom", anchorX: "left", lumaSpread: 60 },
    { ...base, position: "bottom", anchorX: "right", lumaSpread: 8 },
    { ...base, position: "top", anchorX: "left", lumaSpread: 20 },
    { ...base, position: "top", anchorX: "right", lumaSpread: 40 }
  ];

  it("후보 순위는 안전한 순서로 정렬되고 첫 순위가 자동 배치와 같다", () => {
    const ranked = rankAutoPlacements(candidates);
    assert.equal(ranked.length, 4);
    assert.deepEqual(ranked[0], pickAutoPlacement(candidates));
    assert.equal(ranked[0].anchorX, "right");
    assert.equal(ranked[0].position, "bottom");
    // 4개 코너는 전부 서로 달라야 한다
    const keys = new Set(ranked.map((item) => `${item.position}-${item.anchorX}`));
    assert.equal(keys.size, 4);
  });

  it("다른 위치 추천은 다음 순위로 이동하고 같은 위치를 반복하지 않는다", () => {
    const ranked: RecommendedPlacement[] = [
      { position: "bottom", anchorX: "right" },
      { position: "top", anchorX: "left" },
      { position: "top", anchorX: "right" },
      { position: "bottom", anchorX: "left" }
    ];

    // 현재 위치를 모르면 1순위부터
    assert.deepEqual(nextRecommendedPlacement(ranked, null), ranked[0]);
    // 1순위에 있으면 2순위로
    assert.deepEqual(nextRecommendedPlacement(ranked, ranked[0]), ranked[1]);
    // 마지막 순위에서는 1순위로 순환
    assert.deepEqual(nextRecommendedPlacement(ranked, ranked[3]), ranked[0]);
    // 어떤 현재 위치에서도 같은 위치가 반복되지 않는다
    for (const current of ranked) {
      const next = nextRecommendedPlacement(ranked, current);
      assert.ok(next);
      assert.notDeepEqual(next, current);
    }
    // 후보가 없으면 null
    assert.equal(nextRecommendedPlacement([], null), null);
  });
});

describe("pre-download quality check", () => {
  function makeQualityInput(overrides: Partial<DesignQualityInput> = {}): DesignQualityInput {
    return {
      width: 1080,
      height: 1350,
      footprint: { x: 76, y: 90, width: 480, height: 260 },
      titleLines: 2,
      bodyLines: 2,
      subjectOverlap: 0,
      textColor: "light",
      brightFraction: 0.05,
      darkFraction: 0.2,
      watermarkRect: { x: 900, y: 1290, width: 140, height: 24 },
      ...overrides
    };
  }

  it("정상 상태에서는 문제를 보고하지 않는다", () => {
    assert.deepEqual(assessDesignQuality(makeQualityInput()), []);
  });

  it("안전 영역을 벗어난 문구는 치명적 문제로 다운로드를 막는다", () => {
    const issues = assessDesignQuality(makeQualityInput({ footprint: { x: 900, y: 90, width: 300, height: 200 } }));
    assert.ok(issues.some((issue) => issue.code === "out-of-safe-area" && issue.severity === "error"));
    assert.equal(shouldBlockDownload(issues).block, true);
  });

  it("피사체와 크게 겹치면 차단, 조금 겹치면 경고 후 진행 가능", () => {
    const fatal = assessDesignQuality(makeQualityInput({ subjectOverlap: 0.6 }));
    assert.ok(fatal.some((issue) => issue.code === "subject-overlap-high" && issue.severity === "error"));
    assert.equal(shouldBlockDownload(fatal).block, true);

    const warned = assessDesignQuality(makeQualityInput({ subjectOverlap: 0.35 }));
    assert.ok(warned.some((issue) => issue.code === "subject-overlap" && issue.severity === "warning"));
    assert.equal(shouldBlockDownload(warned).block, false, "warning must not block after user confirms");
    assert.equal(shouldBlockDownload(warned).warn, true);
  });

  it("사진이 있어야 하는 디자인이 임시 배경으로 렌더링되면 다운로드를 막는다", () => {
    const issues = assessDesignQuality(makeQualityInput({ photoMissing: true }));
    assert.ok(issues.some((issue) => issue.code === "photo-missing" && issue.severity === "error"));
    assert.equal(shouldBlockDownload(issues).block, true);

    // 사진이 처음부터 없는 디자인(photoMissing 미지정)은 정상 통과한다.
    assert.deepEqual(assessDesignQuality(makeQualityInput()), []);
  });

  it("배경과 글자 대비가 낮으면 경고한다", () => {
    const lightOnBright = assessDesignQuality(makeQualityInput({ textColor: "light", brightFraction: 0.6 }));
    assert.ok(lightOnBright.some((issue) => issue.code === "low-contrast"));

    const darkOnDark = assessDesignQuality(makeQualityInput({ textColor: "dark", darkFraction: 0.6, brightFraction: 0 }));
    assert.ok(darkOnDark.some((issue) => issue.code === "low-contrast"));
  });

  it("워터마크가 본문과 겹치면 경고한다", () => {
    const issues = assessDesignQuality(
      makeQualityInput({ watermarkRect: { x: 100, y: 200, width: 140, height: 24 } })
    );
    assert.ok(issues.some((issue) => issue.code === "watermark-proximity"));
  });

  it("제목·본문이 최대 줄 수를 넘으면 경고한다", () => {
    const issues = assessDesignQuality(makeQualityInput({ titleLines: 3, bodyLines: 4 }));
    assert.ok(issues.some((issue) => issue.code === "title-lines"));
    assert.ok(issues.some((issue) => issue.code === "body-lines"));
  });
});

describe("image copy stress inputs", () => {
  it("극한 길이 명사구 제목도 제품명을 유지한 채 18자 안에서 축약된다", () => {
    const cases = [
      "한여름 출근길과 주말 나들이는 물론 여행과 휴가에서도 시원하고 편안하게 입을 수 있는 가벼운 프리미엄 린넨 셔츠",
      "한여름 출근길과 주말 나들이를 모두 편안하게 만들어주는 가볍고 시원한 프리미엄 린넨 셔츠 컬렉션"
    ];
    for (const input of cases) {
      const text = prepareCanvasImageText(input, 18);
      assert.ok(Array.from(text).length <= 18, `${text} (${Array.from(text).length})`);
      assert.ok(text.includes("린넨 셔츠"), `product name lost: ${text}`);
      // 명사(제품명)로 끝나야 하고 조사·수식어로 끝나는 미완성 절단 금지
      assert.ok(/(셔츠|컬렉션)$/u.test(text), `dangling ending: ${text}`);
    }
  });

  it("수식어 제거로도 안 줄어드는 극한 본문은 서술어를 포함한 뒤쪽 구간을 남긴다", () => {
    const cases = [
      "가볍고 시원한 착용감과 자연스럽게 떨어지는 핏을 갖춰 출근룩부터 주말 나들이와 여행 코디까지 폭넓게 활용할 수 있는 여름용 데일리 셔츠입니다.",
      "통기성이 좋은 가벼운 착용감과 자연스럽게 떨어지는 실루엣으로 출근룩부터 편안한 주말 코디와 휴가 스타일링까지 폭넓게 활용할 수 있습니다."
    ];
    for (const input of cases) {
      const text = prepareCanvasImageText(input, 38);
      assert.ok(Array.from(text).length <= 38, `${text} (${Array.from(text).length})`);
      // 문장 중간("~으로", "~주말")에서 끊기지 않고 서술어로 끝나야 한다
      assert.ok(/(니다|습니다)$/u.test(text), `predicate lost: ${text}`);
      assert.equal(text.endsWith("..."), false);
    }
  });
});

describe("image copy length limits", () => {
  it("보조문구는 약 38자 안에서 서술어를 보존하며 축약된다", () => {
    const text = prepareCanvasImageText(
      "가볍고 시원한 착용감과 자연스럽게 떨어지는 핏으로 출근룩부터 편안한 주말 코디까지 폭넓게 활용할 수 있습니다.",
      38
    );

    assert.ok(Array.from(text).length <= 38, `${text} (${Array.from(text).length})`);
    assert.ok(text.endsWith("있습니다"), `predicate lost: ${text}`);
    assert.ok(text.includes("착용감"), `core benefit lost: ${text}`);
  });

  it("실제 레이아웃에서 제목은 2줄, 본문은 3줄을 넘지 않는다", () => {
    const layout = inspectCanvasTextLayout(
      fakeMeasureContext(),
      makeProject({
        editedText: {
          title: "한여름 출근길과 주말 나들이를 모두 편안하게 만들어주는 가벼운 린넨 셔츠",
          subtitle: "가볍고 시원한 착용감과 자연스럽게 떨어지는 핏으로 출근룩부터 편안한 주말 코디까지 폭넓게 활용할 수 있습니다.",
          cta: "",
          brandName: "",
          disclosure: "",
          footer: ""
        }
      })
    );

    assert.ok(layout.lines.filter((line) => line.role === "title").length <= 2);
    assert.ok(layout.lines.filter((line) => line.role === "subtitle").length <= 3);
  });
});

describe("studio initial output preset", () => {
  it("Story 결과는 이전 Feed 프리셋이 남아 있어도 1080x1920으로 시작한다", () => {
    const presetId = resolveInitialOutputPresetId({ platform: "Instagram Story" }, "instagram-feed-vertical");
    const preset = getDesignOutputPreset(presetId);
    assert.equal(presetId, "instagram-story");
    assert.equal(preset.width, 1080);
    assert.equal(preset.height, 1920);
  });

  it("Feed 결과 기본값은 1080x1350이다", () => {
    const presetId = resolveInitialOutputPresetId({ platform: "Instagram Feed" });
    const preset = getDesignOutputPreset(presetId);
    assert.equal(preset.width, 1080);
    assert.equal(preset.height, 1350);
  });

  it("같은 플랫폼 안에서는 사용자가 마지막에 쓰던 크기를 이어받는다", () => {
    const presetId = resolveInitialOutputPresetId({ platform: "Instagram Feed" }, "instagram-feed-square");
    assert.equal(presetId, "instagram-feed-square");
  });

  it("알 수 없는 저장 프리셋은 결과 플랫폼 기본값으로 대체된다", () => {
    const presetId = resolveInitialOutputPresetId({ platform: "Instagram Story" }, "legacy-preset-id");
    assert.equal(presetId, "instagram-story");
  });
});
