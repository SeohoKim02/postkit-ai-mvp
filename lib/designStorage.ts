"use client";

import { classifyDesignCategory, prepareCanvasImageText } from "@/lib/canvasRenderer";
import { designOutputPresets, designTemplates, getDesignOutputPreset, getDesignTemplate, recommendDesignTemplate } from "@/lib/designTemplates";
import { getSelectedCaption, sanitizeFilePart } from "@/lib/exportUtils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type {
  BrandProfile,
  BrandStyleSnapshot,
  CanvasImageSettings,
  CanvasTextElement,
  DesignPreferences,
  DesignProject,
  GeneratedPackage,
  PersonalizationProfile
} from "@/types";

const designProjectsKey = STORAGE_KEYS.designProjects;
const designPreferencesKey = STORAGE_KEYS.designPreferences;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readArray<T>(key: string): T[] {
  const value = readJson<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeImageText(value: string) {
  return value
    .replace(/#[^\s#]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, "")
    .trim();
}

function trimText(value: string, maxLength: number) {
  const cleaned = normalizeImageText(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const sentence = cleaned
    .split(/(?<=[.!?。！？]|[요다죠까니다습니다])\s+/u)
    .find((part) => part.length >= 6 && part.length <= maxLength);
  if (sentence) {
    return sentence.trim();
  }

  const words = cleaned.split(" ");
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) break;
    current = next;
  }

  const trimmed = current || Array.from(cleaned).slice(0, maxLength).join("");
  return trimmed.replace(/[,.!?;:，。！？、-]+$/u, "").trim();
}

function shortText(value: string, fallback: string, maxLength = 54) {
  const cleaned = trimText(value, maxLength);
  if (!cleaned) {
    return trimText(fallback, maxLength);
  }

  return cleaned;
}

function keywordParts(value: string) {
  return value
    .split(/[,/·|]/)
    .map((item) => normalizeImageText(item))
    .filter(Boolean);
}

function conciseProductLine(result: GeneratedPackage) {
  const product = normalizeImageText(result.input.productName || result.title);
  const keyword = keywordParts(result.input.requiredKeywords || "")[0];

  if (product && keyword) {
    return `${product}, ${keyword}`;
  }

  return product || result.title;
}

function internalBrandName(value: string) {
  return /^(postkit|postkit studio|sample brand)$/i.test(value.trim());
}

function imageBrandName(result: GeneratedPackage, brand: BrandProfile) {
  const candidates = [result.input.brandName, result.brandName, brand.accountName]
    .map((value) => normalizeImageText(value ?? ""))
    .filter(Boolean);
  return candidates.find((value) => !internalBrandName(value)) ?? "";
}

function snapshotBrand(brand: BrandProfile, primaryColor = "#ff6b4a", secondaryColor = "#edf9f6"): BrandStyleSnapshot {
  const resolvedPrimary = brand.primaryColor || primaryColor;
  const resolvedSecondary = brand.secondaryColor || secondaryColor;

  return {
    brandName: brand.accountName,
    mood: brand.feedMood,
    voice: brand.voice,
    primaryColor: resolvedPrimary,
    secondaryColor: resolvedSecondary,
    disclosureStyle: brand.defaultDisclosure
  };
}

// "광고/협찬 표시 없음"은 상태 안내 문구라 이미지 산출물에 새기지 않는다.
function displayDisclosure(value: string) {
  const cleaned = (value ?? "").trim();
  return cleaned && cleaned !== "광고/협찬 표시 없음" ? cleaned : "";
}

// 긴 캡션에서 이미지 본문으로 쓸 만한 "제한 안에 완결되는 첫 문장"을 찾는다. 없으면 빈 문자열.
// (문장 중간을 잘라 붙이면 어색해지므로, 통째로 들어가는 문장만 쓴다.)
function firstCompleteSentenceWithin(value: string, maxLength: number) {
  const cleaned = normalizeImageText(value);
  const sentence = cleaned.split(/(?<=[.!?。！？])\s+/u)[0]?.trim() ?? "";
  const length = Array.from(sentence).length;
  return length >= 8 && length <= maxLength ? sentence : "";
}

// 제목과 같은 구절로 시작하는 본문은 제품명이 두 번 반복돼 보인다("프리미엄 린넨 셔츠" / "프리미엄 린넨 셔츠, ...").
// 남는 구절이 본문으로 쓸 만큼 길 때만 제목 구절을 떼어낸다.
function stripTitleEcho(subtitle: string, title: string) {
  if (!title || !subtitle.startsWith(title)) return subtitle;
  const rest = subtitle.slice(title.length).replace(/^[\s,·:;–-]+/u, "").trim();
  return Array.from(rest).length >= 8 ? rest : subtitle;
}

// 이미지 기본 카피의 카테고리별 톤:
// 패션은 후킹 문장("여름 출근룩을 가볍게")보다 상품명·컬렉션형 제목("시원한 프리미엄 린넨 셔츠 컬렉션")을,
// 음식·카페와 일반 제품은 기존 훅/썸네일 우선(메뉴 소개형)을 유지한다.
export function pickImageTextSources(input: {
  productName: string;
  productLine: string;
  thumbnail?: string;
  hook?: string;
  caption?: string;
}): { titleSource: string; subtitleSource: string } {
  const thumbnail = normalizeImageText(input.thumbnail ?? "");
  const hook = normalizeImageText(input.hook ?? "");
  const caption = input.caption ?? "";
  const productName = normalizeImageText(input.productName);
  const category = classifyDesignCategory([input.productLine, thumbnail, hook].filter(Boolean).join(" "));

  if (category === "fashion" && productName) {
    // 제품명이 들어간 후보(상품 홍보형)를 우선하고, 없으면 제품명 자체를 제목으로 쓴다.
    const titleSource = [thumbnail, hook].find((candidate) => candidate.includes(productName)) ?? productName;
    // 본문은 활용법을 설명하는 문장형 카피를 우선한다("출근룩부터 휴가까지 활용할 수 있습니다" 방향).
    // 단, 캡션은 38자 안에 통째로 끝나는 첫 문장일 때만 쓰고, 아니면 훅으로 넘어간다.
    const captionSentence = firstCompleteSentenceWithin(caption, 38);
    const subtitleSource = [captionSentence, hook, thumbnail].find((candidate) => candidate && candidate !== titleSource) ?? input.productLine;
    return { titleSource, subtitleSource: stripTitleEcho(normalizeImageText(subtitleSource), titleSource) };
  }

  const titleSource = thumbnail || hook || input.productLine;
  const subtitleSource = thumbnail ? hook || input.productLine : hook ? input.productLine : caption;
  return { titleSource, subtitleSource };
}

function makeText(result: GeneratedPackage, brand: BrandProfile): CanvasTextElement {
  const productLine = conciseProductLine(result);
  const { titleSource, subtitleSource } = pickImageTextSources({
    productName: result.input.productName || result.title,
    productLine,
    thumbnail: result.thumbnails[0],
    hook: result.hooks[0],
    caption: getSelectedCaption(result)
  });

  return {
    // 이미지용 문구 권장 길이: 제목 10~18자, 보조문구 20~38자. 긴 캡션은 게시물 본문에만 남긴다.
    // 렌더러와 같은 축약기(서술어·제품명 보존)를 써서 어절 중간 절단 없이 줄이고, 편집창과 실제 렌더 문구를 일치시킨다.
    title: prepareCanvasImageText(normalizeImageText(titleSource), 18) || prepareCanvasImageText(normalizeImageText(productLine), 18),
    subtitle: prepareCanvasImageText(normalizeImageText(subtitleSource), 38) || prepareCanvasImageText(normalizeImageText(productLine), 38),
    cta: shortText(result.ctas[0] ?? "자세히 보기", "자세히 보기", 18),
    brandName: imageBrandName(result, brand),
    disclosure: shortText(displayDisclosure(result.disclosure), "", 24),
    footer: ""
  };
}

function defaultImageSettings(): CanvasImageSettings {
  return {
    fit: "cover",
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    // 업로드한 사진의 색과 선명도를 그대로 보존하는 것이 기본값이다.
    brightness: 100,
    overlayOpacity: 0.2
  };
}

function defaultOutputForResult(result: Pick<GeneratedPackage, "platform">) {
  if (result.platform === "Instagram Story") return "instagram-story";
  if (result.platform === "Instagram Reels" || result.platform === "Reels Thumbnail") return "instagram-reels-thumbnail";
  if (result.platform === "TikTok") return "tiktok";
  if (result.platform === "YouTube Shorts") return "youtube-shorts";
  if (result.platform === "Facebook") return "facebook-square";
  if (result.platform === "X") return "x-horizontal";
  return "instagram-feed-vertical";
}

// Studio 초기 크기는 이번 생성 결과의 플랫폼이 우선이다. 직전에 쓰던 프리셋(lastOutputPresetId)은
// 같은 플랫폼일 때만 이어받아, Story 결과가 이전 Feed 4:5로 시작하는 문제를 막는다.
export function resolveInitialOutputPresetId(result: Pick<GeneratedPackage, "platform">, lastOutputPresetId?: string) {
  const fallbackId = defaultOutputForResult(result);
  if (!lastOutputPresetId) {
    return fallbackId;
  }

  const preferred = designOutputPresets.find((preset) => preset.id === lastOutputPresetId);
  const platformDefault = getDesignOutputPreset(fallbackId);
  return preferred && preferred.platform === platformDefault.platform ? preferred.id : fallbackId;
}

function normalizeProject(value: unknown): DesignProject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Partial<DesignProject>;
  const output = getDesignOutputPreset(String(raw.outputPresetId || "instagram-feed-vertical"));
  const template = getDesignTemplate(String(raw.templateId || "photo-focus"));
  const now = new Date().toISOString();

  return {
    id: typeof raw.id === "string" ? raw.id : createId("design"),
    version: 1,
    contentId: typeof raw.contentId === "string" ? raw.contentId : "",
    templateId: template.id,
    outputPresetId: output.id,
    platform: output.platform,
    width: output.width,
    height: output.height,
    editedText: {
      title: typeof raw.editedText?.title === "string" ? raw.editedText.title : "",
      subtitle: typeof raw.editedText?.subtitle === "string" ? raw.editedText.subtitle : "",
      cta: typeof raw.editedText?.cta === "string" ? raw.editedText.cta : "",
      brandName: typeof raw.editedText?.brandName === "string" ? raw.editedText.brandName : "",
      disclosure: typeof raw.editedText?.disclosure === "string" ? raw.editedText.disclosure : "",
      footer: typeof raw.editedText?.footer === "string" ? raw.editedText.footer : "브랜드 콘텐츠"
    },
    imageSettings: {
      ...defaultImageSettings(),
      ...(raw.imageSettings ?? {})
    },
    textPosition: raw.textPosition ?? template.textPosition,
    textAlignment: raw.textAlignment ?? template.textAlignment,
    textPlacementMode: raw.textPlacementMode === "manual" ? "manual" : "auto",
    textAnchorX:
      raw.textAnchorX === "left" || raw.textAnchorX === "right"
        ? raw.textAnchorX
        : raw.textPosition === "right" || raw.textAlignment === "right"
          ? "right"
          : "left",
    textSizePreset: raw.textSizePreset === "small" || raw.textSizePreset === "large" ? raw.textSizePreset : "medium",
    watermarkPosition: raw.watermarkPosition === "bottom-left" || raw.watermarkPosition === "bottom-right" ? raw.watermarkPosition : "auto",
    // 카테고리 필드가 없는 기존 저장 데이터는 자동 분류로 시작한다.
    contentCategory:
      raw.contentCategory === "fashion" || raw.contentCategory === "food" || raw.contentCategory === "general"
        ? raw.contentCategory
        : "auto",
    fontScale: typeof raw.fontScale === "number" ? raw.fontScale : template.fontScale,
    primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : "#ff6b4a",
    secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : "#edf9f6",
    showTitle: raw.showTitle ?? true,
    showBrandName: raw.showBrandName ?? template.showBrandName,
    // CTA 기본 숨김 정책 이전에 저장된 디자인(새 설정 필드가 없음)은 저장값과 무관하게 숨김으로 시작한다.
    showCta: raw.textSizePreset === undefined ? false : raw.showCta === true,
    showDisclosure: raw.showDisclosure ?? template.showDisclosure,
    brandStyleSnapshot: raw.brandStyleSnapshot ?? {
      brandName: "",
      mood: "",
      voice: "",
      primaryColor: "#ff6b4a",
      secondaryColor: "#edf9f6",
      disclosureStyle: ""
    },
    uploadedAssetId: typeof raw.uploadedAssetId === "string" ? raw.uploadedAssetId : undefined,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : now,
    downloaded: Boolean(raw.downloaded),
    exported: Boolean(raw.exported),
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : now
  };
}

export function createDefaultDesignProject(
  result: GeneratedPackage,
  brand: BrandProfile,
  personalization?: PersonalizationProfile | null,
  outputPresetId?: string
): DesignProject {
  const recommendation = recommendDesignTemplate(result, personalization);
  const aiTemplateId = result.recommendedDesignTemplateId ?? result.ai?.recommendedTemplateId;
  const template = aiTemplateId && designTemplates.some((item) => item.id === aiTemplateId)
    ? getDesignTemplate(aiTemplateId)
    : recommendation.template;
  const output = getDesignOutputPreset(outputPresetId ?? defaultOutputForResult(result));
  const brandSnapshot = snapshotBrand(brand);
  const now = new Date().toISOString();

  return {
    id: createId("design"),
    version: 1,
    contentId: result.id,
    templateId: template.id,
    outputPresetId: output.id,
    platform: output.platform,
    width: output.width,
    height: output.height,
    editedText: makeText(result, brand),
    imageSettings: defaultImageSettings(),
    textPosition: template.textPosition,
    textAlignment: template.textAlignment,
    textPlacementMode: "auto",
    textAnchorX: "left",
    textSizePreset: "medium",
    watermarkPosition: "auto",
    contentCategory: "auto",
    fontScale: template.fontScale,
    primaryColor: brandSnapshot.primaryColor,
    secondaryColor: brandSnapshot.secondaryColor,
    showTitle: true,
    showBrandName: template.showBrandName,
    // CTA는 이미지에 반드시 필요한 요소가 아니므로 기본 숨김. Results의 텍스트 CTA는 그대로 유지된다.
    showCta: false,
    showDisclosure: template.showDisclosure,
    brandStyleSnapshot: brandSnapshot,
    uploadedAssetId: result.input.uploadedAssetId,
    generatedAt: now,
    downloaded: false,
    exported: false,
    lastUpdatedAt: now
  };
}

export function getDesignProjects() {
  return readArray<DesignProject>(designProjectsKey)
    .map(normalizeProject)
    .filter(Boolean) as DesignProject[];
}

export function saveDesignProjects(projects: DesignProject[]) {
  const unique = new Map(projects.map((project) => [project.id, { ...project, version: 1 }]));
  writeJson(designProjectsKey, Array.from(unique.values()).slice(0, 200));
}

export function upsertDesignProject(project: DesignProject) {
  const now = new Date().toISOString();
  const output = getDesignOutputPreset(project.outputPresetId);
  const nextProject: DesignProject = {
    ...project,
    version: 1,
    platform: output.platform,
    width: output.width,
    height: output.height,
    lastUpdatedAt: now
  };
  const projects = getDesignProjects();
  const exists = projects.some((item) => item.id === nextProject.id);
  saveDesignProjects(exists ? projects.map((item) => (item.id === nextProject.id ? nextProject : item)) : [nextProject, ...projects]);
  return nextProject;
}

export function getDesignProjectsForContent(contentId: string) {
  return getDesignProjects().filter((project) => project.contentId === contentId);
}

export function getLatestDesignForContent(contentId: string) {
  return getDesignProjectsForContent(contentId).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0];
}

export function duplicateDesignProject(project: DesignProject) {
  return upsertDesignProject({
    ...project,
    id: createId("design"),
    downloaded: false,
    exported: false,
    generatedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  });
}

export function markDesignDownloaded(projectId: string) {
  const project = getDesignProjects().find((item) => item.id === projectId);
  if (!project) {
    return null;
  }

  return upsertDesignProject({ ...project, downloaded: true });
}

export function markDesignExported(projectId: string) {
  const project = getDesignProjects().find((item) => item.id === projectId);
  if (!project) {
    return null;
  }

  return upsertDesignProject({ ...project, exported: true });
}

export function getDesignPreferences(): DesignPreferences {
  const fallback: DesignPreferences = {
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  };
  const raw = readJson<Partial<DesignPreferences>>(designPreferencesKey, fallback);

  return {
    ...fallback,
    ...raw,
    version: 1,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : fallback.lastUpdatedAt
  };
}

export function saveDesignPreferences(preferences: DesignPreferences) {
  writeJson(designPreferencesKey, {
    ...preferences,
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function makeDesignFileName(project: DesignProject) {
  const date = new Date(project.generatedAt);
  const stamp = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10).replaceAll("-", "")
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const platform = sanitizeFilePart(project.platform);
  const id = project.id.replace(/[^a-z0-9]/gi, "").slice(-6) || "design";
  // 같은 플랫폼의 세로/정사각 등 출력 크기가 달라도 파일명이 겹치지 않도록 치수를 포함한다.
  return `postkit_${platform}_${project.width}x${project.height}_${stamp}_${id}.png`;
}

export function getDesignStorageKeys() {
  return {
    designProjectsKey,
    designPreferencesKey
  };
}
