"use client";

import {
  combineDateAndTime,
  createCalendarId,
  createRepeatedSchedules,
  getScheduleDisplayStatus,
  makeIdeaPrefill,
  makeSchedulePrefill,
  normalizeHashtags,
  splitList
} from "@/lib/calendarUtils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type {
  CalendarPreferences,
  ContentIdea,
  ContentSchedule,
  ContentScheduleStatus,
  GeneratedPackage,
  Platform,
  Purpose
} from "@/types";

export const contentSchedulesKey = STORAGE_KEYS.contentSchedules;
export const contentIdeasKey = STORAGE_KEYS.contentIdeas;
export const calendarPreferencesKey = STORAGE_KEYS.calendarPreferences;

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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createDefaultSchedule(): ContentSchedule {
  const now = new Date();
  now.setHours(now.getHours() + 2, 0, 0, 0);

  return {
    id: createCalendarId("schedule"),
    version: 1,
    title: "",
    platform: "Instagram Feed",
    purpose: "Product Promotion",
    scheduledAt: now.toISOString(),
    brandName: "",
    campaignId: undefined,
    campaignName: "",
    productName: "",
    status: "아이디어",
    isSponsored: false,
    requiredKeywords: [],
    bannedKeywords: [],
    requiredHashtags: [],
    disclosureStyle: "#광고 또는 #협찬을 첫 문장에 표시",
    discountCode: "",
    linkGuide: "",
    internalMemo: "",
    linkedContentId: undefined,
    linkedExportIds: [],
    repeatOption: "none",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function migrateSchedule(value: unknown): ContentSchedule | null {
  if (!isObject(value)) return null;
  const fallback = createDefaultSchedule();
  const scheduledAt = typeof value.scheduledAt === "string" && !Number.isNaN(new Date(value.scheduledAt).getTime()) ? value.scheduledAt : fallback.scheduledAt;

  return {
    ...fallback,
    ...value,
    id: typeof value.id === "string" ? value.id : createCalendarId("schedule"),
    version: 1,
    title: typeof value.title === "string" ? value.title : fallback.title,
    platform: (value.platform as Platform) || fallback.platform,
    purpose: (value.purpose as Purpose) || fallback.purpose,
    scheduledAt,
    brandName: typeof value.brandName === "string" ? value.brandName : "",
    campaignId: typeof value.campaignId === "string" ? value.campaignId : undefined,
    campaignName: typeof value.campaignName === "string" ? value.campaignName : "",
    productName: typeof value.productName === "string" ? value.productName : "",
    status: (value.status as ContentScheduleStatus) || fallback.status,
    isSponsored: Boolean(value.isSponsored),
    requiredKeywords: safeStringArray(value.requiredKeywords),
    bannedKeywords: safeStringArray(value.bannedKeywords),
    requiredHashtags: normalizeHashtags(safeStringArray(value.requiredHashtags)),
    disclosureStyle: typeof value.disclosureStyle === "string" ? value.disclosureStyle : fallback.disclosureStyle,
    discountCode: typeof value.discountCode === "string" ? value.discountCode : "",
    linkGuide: typeof value.linkGuide === "string" ? value.linkGuide : "",
    internalMemo: typeof value.internalMemo === "string" ? value.internalMemo : "",
    linkedContentId: typeof value.linkedContentId === "string" ? value.linkedContentId : undefined,
    linkedExportIds: safeStringArray(value.linkedExportIds),
    repeatOption: value.repeatOption === "weekly" || value.repeatOption === "biweekly" || value.repeatOption === "monthly" ? value.repeatOption : "none",
    repeatGroupId: typeof value.repeatGroupId === "string" ? value.repeatGroupId : undefined,
    publishedAt: typeof value.publishedAt === "string" ? value.publishedAt : undefined,
    publishedUrl: typeof value.publishedUrl === "string" ? value.publishedUrl : undefined,
    actualCaption: typeof value.actualCaption === "string" ? value.actualCaption : undefined,
    publishedPlatform: (value.publishedPlatform as Platform) || undefined,
    publishMemo: typeof value.publishMemo === "string" ? value.publishMemo : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt
  };
}

export function getContentSchedules() {
  const raw = readJson<unknown[]>(contentSchedulesKey, []);
  if (!Array.isArray(raw)) return [];

  return raw
    .map(migrateSchedule)
    .filter(Boolean)
    .map((schedule) => {
      const nextStatus = getScheduleDisplayStatus(schedule as ContentSchedule);
      return nextStatus === "기한 초과" && (schedule as ContentSchedule).status !== "게시 완료"
        ? { ...(schedule as ContentSchedule), status: "기한 초과" as ContentScheduleStatus }
        : (schedule as ContentSchedule);
    });
}

export function saveContentSchedules(schedules: ContentSchedule[]) {
  const unique = new Map(schedules.map((schedule) => [schedule.id, { ...schedule, version: 1 }]));
  writeJson(contentSchedulesKey, Array.from(unique.values()).slice(0, 500));
}

export function addContentSchedule(schedule: ContentSchedule, repeatCount = 1) {
  const now = new Date().toISOString();
  const base = {
    ...schedule,
    title: schedule.title.trim() || schedule.productName || "새 게시 일정",
    updatedAt: now,
    createdAt: schedule.createdAt || now
  };
  const repeated = createRepeatedSchedules(base, repeatCount);
  saveContentSchedules([...repeated, ...getContentSchedules()]);
  return repeated;
}

export function updateContentSchedule(schedule: ContentSchedule) {
  const schedules = getContentSchedules();
  const nextSchedule = {
    ...schedule,
    updatedAt: new Date().toISOString()
  };
  const exists = schedules.some((item) => item.id === schedule.id);
  saveContentSchedules(exists ? schedules.map((item) => (item.id === schedule.id ? nextSchedule : item)) : [nextSchedule, ...schedules]);
  return nextSchedule;
}

export function deleteContentSchedule(id: string) {
  saveContentSchedules(getContentSchedules().filter((schedule) => schedule.id !== id));
}

export function deleteFutureSchedules(schedule: ContentSchedule) {
  if (!schedule.repeatGroupId) {
    deleteContentSchedule(schedule.id);
    return;
  }

  const pivot = new Date(schedule.scheduledAt).getTime();
  saveContentSchedules(
    getContentSchedules().filter((item) => item.repeatGroupId !== schedule.repeatGroupId || new Date(item.scheduledAt).getTime() < pivot)
  );
}

export function updateScheduleAfterExport(scheduleId: string | undefined, exportId: string) {
  if (!scheduleId) return null;
  const schedule = getContentSchedules().find((item) => item.id === scheduleId);
  if (!schedule) return null;

  return updateContentSchedule({
    ...schedule,
    linkedExportIds: Array.from(new Set([exportId, ...schedule.linkedExportIds])),
    lastExportedAt: new Date().toISOString()
  });
}

export function linkScheduleContent(scheduleId: string | undefined, contentId: string) {
  if (!scheduleId) return null;
  const schedule = getContentSchedules().find((item) => item.id === scheduleId);
  if (!schedule) return null;

  return updateContentSchedule({
    ...schedule,
    linkedContentId: contentId,
    status: schedule.status === "아이디어" || schedule.status === "작성 중" ? "검토 필요" : schedule.status
  });
}

export function markSchedulePublished(
  scheduleId: string,
  value: {
    publishedAt?: string;
    publishedUrl?: string;
    actualCaption?: string;
    publishedPlatform?: Platform;
    publishMemo?: string;
  }
) {
  const schedule = getContentSchedules().find((item) => item.id === scheduleId);
  if (!schedule) return null;

  return updateContentSchedule({
    ...schedule,
    status: "게시 완료",
    publishedAt: value.publishedAt ?? new Date().toISOString(),
    publishedUrl: value.publishedUrl,
    actualCaption: value.actualCaption,
    publishedPlatform: value.publishedPlatform ?? schedule.platform,
    publishMemo: value.publishMemo
  });
}

export function createScheduleFromForm(form: {
  id?: string;
  title: string;
  platform: Platform;
  purpose: Purpose;
  date: string;
  time: string;
  brandName: string;
  campaignId?: string;
  campaignName?: string;
  productName: string;
  status: ContentScheduleStatus;
  isSponsored: boolean;
  requiredKeywords: string;
  bannedKeywords: string;
  requiredHashtags: string;
  disclosureStyle: string;
  discountCode?: string;
  linkGuide?: string;
  internalMemo?: string;
  linkedContentId?: string;
  repeatOption: ContentSchedule["repeatOption"];
}): ContentSchedule {
  const now = new Date().toISOString();
  return {
    ...createDefaultSchedule(),
    id: form.id ?? createCalendarId("schedule"),
    title: form.title,
    platform: form.platform,
    purpose: form.purpose,
    scheduledAt: combineDateAndTime(form.date, form.time),
    brandName: form.brandName,
    campaignId: form.campaignId,
    campaignName: form.campaignName,
    productName: form.productName,
    status: form.status,
    isSponsored: form.isSponsored,
    requiredKeywords: splitList(form.requiredKeywords),
    bannedKeywords: splitList(form.bannedKeywords),
    requiredHashtags: normalizeHashtags(splitList(form.requiredHashtags)),
    disclosureStyle: form.disclosureStyle,
    discountCode: form.discountCode,
    linkGuide: form.linkGuide,
    internalMemo: form.internalMemo,
    linkedContentId: form.linkedContentId || undefined,
    repeatOption: form.repeatOption,
    createdAt: now,
    updatedAt: now
  };
}

export function scheduleToPrefill(schedule: ContentSchedule) {
  return makeSchedulePrefill(schedule);
}

export function createDefaultIdea(): ContentIdea {
  const now = new Date().toISOString();
  return {
    id: createCalendarId("idea"),
    version: 1,
    title: "",
    category: "콘텐츠 아이디어",
    platform: "Instagram Feed",
    purpose: "Personal Post",
    memo: "",
    preferredDate: "",
    tags: [],
    convertedToSchedule: false,
    createdAt: now,
    updatedAt: now
  };
}

function migrateIdea(value: unknown): ContentIdea | null {
  if (!isObject(value)) return null;
  const fallback = createDefaultIdea();
  return {
    ...fallback,
    ...value,
    id: typeof value.id === "string" ? value.id : createCalendarId("idea"),
    version: 1,
    title: typeof value.title === "string" ? value.title : fallback.title,
    category: typeof value.category === "string" ? value.category : fallback.category,
    platform: (value.platform as Platform) || fallback.platform,
    purpose: (value.purpose as Purpose) || fallback.purpose,
    memo: typeof value.memo === "string" ? value.memo : "",
    preferredDate: typeof value.preferredDate === "string" ? value.preferredDate : "",
    tags: safeStringArray(value.tags),
    convertedToSchedule: Boolean(value.convertedToSchedule),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt
  };
}

export function getContentIdeas() {
  const raw = readJson<unknown[]>(contentIdeasKey, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateIdea).filter(Boolean) as ContentIdea[];
}

export function saveContentIdeas(ideas: ContentIdea[]) {
  const unique = new Map(ideas.map((idea) => [idea.id, { ...idea, version: 1 }]));
  writeJson(contentIdeasKey, Array.from(unique.values()).slice(0, 200));
}

export function upsertContentIdea(idea: ContentIdea) {
  const ideas = getContentIdeas();
  const nextIdea = { ...idea, updatedAt: new Date().toISOString() };
  const exists = ideas.some((item) => item.id === idea.id);
  saveContentIdeas(exists ? ideas.map((item) => (item.id === idea.id ? nextIdea : item)) : [nextIdea, ...ideas]);
  return nextIdea;
}

export function deleteContentIdea(id: string) {
  saveContentIdeas(getContentIdeas().filter((idea) => idea.id !== id));
}

export function ideaToSchedule(idea: ContentIdea) {
  const preferred = idea.preferredDate ? new Date(idea.preferredDate) : new Date();
  if (Number.isNaN(preferred.getTime())) {
    preferred.setTime(Date.now());
  }
  preferred.setHours(19, 0, 0, 0);

  return {
    ...createDefaultSchedule(),
    title: idea.title,
    platform: idea.platform,
    purpose: idea.purpose,
    scheduledAt: preferred.toISOString(),
    productName: idea.title,
    status: "아이디어" as ContentScheduleStatus,
    internalMemo: idea.memo,
    requiredKeywords: idea.tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function ideaToPrefill(idea: ContentIdea) {
  return makeIdeaPrefill(idea);
}

export function getCalendarPreferences(): CalendarPreferences {
  const fallback: CalendarPreferences = {
    version: 1,
    viewMode: "list",
    selectedDate: new Date().toISOString(),
    platform: "전체",
    status: "전체",
    campaignId: "전체",
    brandName: "",
    sponsoredOnly: false,
    overdueOnly: false,
    lastUpdatedAt: new Date().toISOString()
  };
  const raw = readJson<Partial<CalendarPreferences>>(calendarPreferencesKey, fallback);
  return {
    ...fallback,
    ...raw,
    version: 1,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "string" ? raw.lastUpdatedAt : fallback.lastUpdatedAt
  };
}

export function saveCalendarPreferences(preferences: CalendarPreferences) {
  writeJson(calendarPreferencesKey, {
    ...preferences,
    version: 1,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function attachGeneratedContentToPlanning(result: GeneratedPackage) {
  if (result.scheduleId) {
    linkScheduleContent(result.scheduleId, result.id);
  }
}

export function getCalendarStorageKeys() {
  return {
    contentSchedulesKey,
    contentIdeasKey,
    calendarPreferencesKey
  };
}
