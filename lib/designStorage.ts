"use client";

import { designTemplates, getDesignOutputPreset, getDesignTemplate, recommendDesignTemplate } from "@/lib/designTemplates";
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

function shortText(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fallback;
  }

  if (cleaned.length <= 54) {
    return cleaned;
  }

  return `${cleaned.slice(0, 52).trim()}...`;
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

function makeText(result: GeneratedPackage, brand: BrandProfile): CanvasTextElement {
  return {
    title: result.thumbnails[0] ?? shortText(getSelectedCaption(result), result.input.productName || result.title),
    subtitle: shortText(result.hooks[0] ?? getSelectedCaption(result), result.input.productName || result.title),
    cta: result.ctas[0] ?? "저장하고 다시 보기",
    brandName: result.brandName ?? result.input.brandName ?? brand.accountName,
    disclosure: displayDisclosure(result.disclosure),
    footer: result.input.discountCode ? `할인코드 ${result.input.discountCode}` : result.input.brandName || result.brandName || brand.accountName
  };
}

function defaultImageSettings(): CanvasImageSettings {
  return {
    fit: "cover",
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    brightness: 96,
    overlayOpacity: 0.38
  };
}

function defaultOutputForResult(result: GeneratedPackage) {
  if (result.platform === "Instagram Story") return "instagram-story";
  if (result.platform === "Instagram Reels" || result.platform === "Reels Thumbnail") return "instagram-reels-thumbnail";
  if (result.platform === "TikTok") return "tiktok";
  if (result.platform === "YouTube Shorts") return "youtube-shorts";
  if (result.platform === "Facebook") return "facebook-square";
  if (result.platform === "X") return "x-horizontal";
  return "instagram-feed-vertical";
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
    fontScale: typeof raw.fontScale === "number" ? raw.fontScale : template.fontScale,
    primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : "#ff6b4a",
    secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : "#edf9f6",
    showTitle: raw.showTitle ?? true,
    showBrandName: raw.showBrandName ?? template.showBrandName,
    showCta: raw.showCta ?? true,
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
    fontScale: template.fontScale,
    primaryColor: brandSnapshot.primaryColor,
    secondaryColor: brandSnapshot.secondaryColor,
    showTitle: true,
    showBrandName: template.showBrandName,
    showCta: true,
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
