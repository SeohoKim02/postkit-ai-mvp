"use client";

import { linkCampaignContent } from "@/lib/campaignStorage";
import { linkScheduleContent } from "@/lib/calendarStorage";
import { getSelectedCaption } from "@/lib/exportUtils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { defaultBrandProfile, getBrandProfile } from "@/lib/storage";
import { getVideoPresetByPlatform, mapVideoPlatformToPostKitPlatform, recommendVideoPlatform } from "@/lib/video/videoPresets";
import { getVideoTemplate, recommendVideoTemplate } from "@/lib/video/videoTemplates";
import { clampVideoDuration, createVideoId } from "@/lib/video/videoUtils";
import type {
  BrandProfile,
  BrandStyleSnapshot,
  GeneratedPackage,
  VideoImageItem,
  VideoProject,
  VideoRenderSettings,
  VideoTextSettings
} from "@/types";

export type VideoPreferences = {
  version: number;
  lastTemplateId?: string;
  lastPlatform?: VideoProject["platform"];
  lastDurationSeconds?: 5 | 8 | 10 | 15;
  lastTransitionType?: VideoProject["transitionType"];
  lastTextPosition?: VideoProject["textPosition"];
  overlayOpacity?: number;
  lastUpdatedAt: string;
};

const videoProjectsKey = STORAGE_KEYS.videoProjects;
const videoPreferencesKey = STORAGE_KEYS.videoPreferences;

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

function snapshotBrand(brand: BrandProfile): BrandStyleSnapshot {
  return {
    brandName: brand.accountName,
    mood: brand.feedMood,
    voice: brand.voice,
    primaryColor: brand.primaryColor || "#ff6b4a",
    secondaryColor: brand.secondaryColor || "#edf9f6",
    disclosureStyle: brand.defaultDisclosure
  };
}

function shortText(value: string | undefined, fallback: string) {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > 58 ? `${cleaned.slice(0, 56).trim()}...` : cleaned;
}

// "광고/협찬 표시 없음"은 상태 안내 문구라 영상 산출물에 새기지 않는다.
// brand.defaultDisclosure는 표시 방식 지침문이라 게시용 문구로 쓰지 않는다.
function displayDisclosure(value: string) {
  const cleaned = (value ?? "").trim();
  return cleaned && cleaned !== "광고/협찬 표시 없음" ? cleaned : "";
}

function makeVideoText(result: GeneratedPackage, brand: BrandProfile): VideoTextSettings {
  return {
    title: shortText(result.thumbnails[0] ?? result.title, result.input.productName || result.title),
    hook: shortText(result.hooks[0] ?? getSelectedCaption(result), result.input.productName || result.title),
    productName: result.input.productName || result.title,
    cta: result.ctas[0] ?? "저장하고 다시 보기",
    brandName: result.brandName ?? result.input.brandName ?? brand.accountName,
    disclosure: displayDisclosure(result.disclosure),
    discountCode: result.input.discountCode ?? ""
  };
}

function normalizeImageItems(value: unknown): VideoImageItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<VideoImageItem> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      assetId: typeof item.assetId === "string" ? item.assetId : "",
      name: typeof item.name === "string" ? item.name : "uploaded-image",
      type: typeof item.type === "string" ? item.type : "image/*",
      size: typeof item.size === "number" ? item.size : 0
    }))
    .filter((item) => item.assetId);
}

function normalizeProject(value: unknown): VideoProject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<VideoProject>;
  const template = getVideoTemplate(raw.templateId);
  const platform = raw.platform ?? "Instagram Reels";
  const preset = getVideoPresetByPlatform(platform);
  const brandSnapshot = raw.brandStyleSnapshot ?? snapshotBrand(getBrandProfile() ?? defaultBrandProfile);
  const now = new Date().toISOString();

  return {
    id: typeof raw.id === "string" ? raw.id : createVideoId(),
    version: 1,
    contentId: typeof raw.contentId === "string" ? raw.contentId : "",
    templateId: template.id,
    platform,
    width: preset.width,
    height: preset.height,
    durationSeconds: clampVideoDuration(typeof raw.durationSeconds === "number" ? raw.durationSeconds : template.durationSeconds),
    frameRate: typeof raw.frameRate === "number" ? raw.frameRate : template.frameRate,
    transitionType: raw.transitionType ?? template.transitionType,
    textPosition: raw.textPosition ?? template.textPosition,
    overlayStyle: raw.overlayStyle ?? template.overlayStyle,
    imageMotion: raw.imageMotion ?? template.imageMotion,
    overlayOpacity: typeof raw.overlayOpacity === "number" ? Math.min(0.75, Math.max(0, raw.overlayOpacity)) : 0.38,
    titleMaxLines: typeof raw.titleMaxLines === "number" ? raw.titleMaxLines : template.titleMaxLines,
    showTitle: raw.showTitle ?? true,
    showCTA: raw.showCTA ?? template.showCTA,
    showBrandName: raw.showBrandName ?? template.showBrandName,
    showDisclosure: raw.showDisclosure ?? template.showDisclosure,
    text: {
      title: typeof raw.text?.title === "string" ? raw.text.title : "",
      hook: typeof raw.text?.hook === "string" ? raw.text.hook : "",
      productName: typeof raw.text?.productName === "string" ? raw.text.productName : "",
      cta: typeof raw.text?.cta === "string" ? raw.text.cta : "",
      brandName: typeof raw.text?.brandName === "string" ? raw.text.brandName : "",
      disclosure: typeof raw.text?.disclosure === "string" ? raw.text.disclosure : "",
      discountCode: typeof raw.text?.discountCode === "string" ? raw.text.discountCode : ""
    },
    imageItems: normalizeImageItems(raw.imageItems),
    brandStyleSnapshot: brandSnapshot,
    outputFormat: "webm",
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
    downloaded: Boolean(raw.downloaded),
    exported: Boolean(raw.exported),
    campaignId: typeof raw.campaignId === "string" ? raw.campaignId : undefined,
    scheduleId: typeof raw.scheduleId === "string" ? raw.scheduleId : undefined,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : now
  };
}

export function createDefaultVideoProject(
  result: GeneratedPackage,
  brand: BrandProfile,
  preferences?: VideoPreferences | null
): VideoProject {
  const template = getVideoTemplate(preferences?.lastTemplateId ?? recommendVideoTemplate(result.purpose, result.style).id);
  const platform = preferences?.lastPlatform ?? recommendVideoPlatform(result.platform);
  const preset = getVideoPresetByPlatform(platform);
  const now = new Date().toISOString();

  return {
    id: createVideoId(),
    version: 1,
    contentId: result.id,
    templateId: template.id,
    platform,
    width: preset.width,
    height: preset.height,
    durationSeconds: preferences?.lastDurationSeconds ?? template.durationSeconds,
    frameRate: template.frameRate,
    transitionType: preferences?.lastTransitionType ?? template.transitionType,
    textPosition: preferences?.lastTextPosition ?? template.textPosition,
    overlayStyle: template.overlayStyle,
    imageMotion: template.imageMotion,
    overlayOpacity: preferences?.overlayOpacity ?? 0.38,
    titleMaxLines: template.titleMaxLines,
    showTitle: true,
    showCTA: template.showCTA,
    showBrandName: template.showBrandName,
    showDisclosure: template.showDisclosure,
    text: makeVideoText(result, brand),
    imageItems: [],
    brandStyleSnapshot: snapshotBrand(brand),
    outputFormat: "webm",
    generatedAt: undefined,
    downloaded: false,
    exported: false,
    campaignId: result.campaignId,
    scheduleId: result.scheduleId,
    lastUpdatedAt: now
  };
}

export function getVideoProjects() {
  return readArray<VideoProject>(videoProjectsKey)
    .map(normalizeProject)
    .filter(Boolean) as VideoProject[];
}

export function saveVideoProjects(projects: VideoProject[]) {
  const unique = new Map(projects.map((project) => [project.id, { ...project, version: 1 }]));
  writeJson(videoProjectsKey, Array.from(unique.values()).slice(0, 200));
}

export function upsertVideoProject(project: VideoProject) {
  const preset = getVideoPresetByPlatform(project.platform);
  const nextProject: VideoProject = {
    ...project,
    version: 1,
    width: preset.width,
    height: preset.height,
    durationSeconds: clampVideoDuration(project.durationSeconds),
    outputFormat: "webm",
    lastUpdatedAt: new Date().toISOString()
  };
  const projects = getVideoProjects();
  const exists = projects.some((item) => item.id === nextProject.id);
  saveVideoProjects(exists ? projects.map((item) => (item.id === nextProject.id ? nextProject : item)) : [nextProject, ...projects]);
  linkScheduleContent(nextProject.scheduleId, nextProject.contentId);
  linkCampaignContent(nextProject.campaignId, nextProject.contentId, mapVideoPlatformToPostKitPlatform(nextProject.platform));
  return nextProject;
}

export function getVideoProjectsForContent(contentId: string) {
  return getVideoProjects().filter((project) => project.contentId === contentId);
}

export function getLatestVideoProjectForContent(contentId: string) {
  return getVideoProjectsForContent(contentId).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0];
}

export function duplicateVideoProject(project: VideoProject) {
  return upsertVideoProject({
    ...project,
    id: createVideoId(),
    generatedAt: undefined,
    downloaded: false,
    exported: false,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function markVideoProjectDownloaded(projectId: string) {
  const project = getVideoProjects().find((item) => item.id === projectId);
  if (!project) return null;
  return upsertVideoProject({ ...project, downloaded: true, generatedAt: project.generatedAt ?? new Date().toISOString() });
}

export function markVideoProjectExported(projectId: string) {
  const project = getVideoProjects().find((item) => item.id === projectId);
  if (!project) return null;
  return upsertVideoProject({ ...project, exported: true, generatedAt: project.generatedAt ?? new Date().toISOString() });
}

export function getVideoPreferences(): VideoPreferences {
  const fallback: VideoPreferences = {
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  };
  const raw = readJson<Partial<VideoPreferences>>(videoPreferencesKey, fallback);
  return {
    ...fallback,
    ...raw,
    version: 1,
    lastDurationSeconds: raw.lastDurationSeconds ? clampVideoDuration(raw.lastDurationSeconds) : fallback.lastDurationSeconds,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : fallback.lastUpdatedAt
  };
}

export function saveVideoPreferences(preferences: VideoPreferences) {
  writeJson(videoPreferencesKey, {
    ...preferences,
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function projectToRenderSettings(project: VideoProject): VideoRenderSettings {
  return {
    platform: project.platform,
    width: project.width,
    height: project.height,
    durationSeconds: project.durationSeconds,
    frameRate: project.frameRate,
    transitionType: project.transitionType,
    textPosition: project.textPosition,
    overlayStyle: project.overlayStyle,
    imageMotion: project.imageMotion,
    overlayOpacity: project.overlayOpacity,
    titleMaxLines: project.titleMaxLines,
    showTitle: project.showTitle,
    showCTA: project.showCTA,
    showBrandName: project.showBrandName,
    showDisclosure: project.showDisclosure,
    primaryColor: project.brandStyleSnapshot.primaryColor,
    secondaryColor: project.brandStyleSnapshot.secondaryColor,
    brandStyleSnapshot: project.brandStyleSnapshot,
    text: project.text
  };
}

export function mergeVideoProjectIntoResult(result: GeneratedPackage, project: VideoProject) {
  return {
    ...result,
    videoProjects: [project, ...(result.videoProjects ?? []).filter((item) => item.id !== project.id)].slice(0, 20)
  };
}

export function getVideoStorageKeys() {
  return {
    videoProjectsKey,
    videoPreferencesKey
  };
}
