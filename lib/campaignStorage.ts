"use client";

import {
  campaignToCreatePrefill,
  createDefaultCampaign,
  markDeliverableGenerated,
  normalizeCampaignDates,
  parseCampaignList
} from "@/lib/campaignUtils";
import { createCalendarId } from "@/lib/calendarUtils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { Campaign, CampaignStatus, CampaignType, CreateFormInput, DeliverableStatus, Platform } from "@/types";

export const campaignsKey = STORAGE_KEYS.campaigns;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function toIso(value: string, fallback: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function migrateCampaign(value: unknown): Campaign | null {
  if (!isObject(value)) return null;
  const fallback = createDefaultCampaign();
  const maybeDeliverables = Array.isArray(value.requiredDeliverables) ? value.requiredDeliverables : [];

  return normalizeCampaignDates({
    ...fallback,
    ...value,
    id: typeof value.id === "string" ? value.id : createCalendarId("campaign"),
    version: 1,
    campaignName: typeof value.campaignName === "string" ? value.campaignName : fallback.campaignName,
    advertiserName: typeof value.advertiserName === "string" ? value.advertiserName : "",
    brandName: typeof value.brandName === "string" ? value.brandName : "",
    productName: typeof value.productName === "string" ? value.productName : "",
    campaignType: (value.campaignType as CampaignType) || fallback.campaignType,
    description: typeof value.description === "string" ? value.description : "",
    requiredDeliverables:
      maybeDeliverables.length > 0
        ? maybeDeliverables
            .filter(isObject)
            .map((item) => ({
              id: typeof item.id === "string" ? item.id : createCalendarId("deliverable"),
              type: String(item.type || "캡션") as Campaign["requiredDeliverables"][number]["type"],
              status: String(item.status || "미시작") as DeliverableStatus
            }))
        : fallback.requiredDeliverables,
    targetPlatforms: safeStringArray(value.targetPlatforms) as Platform[],
    requiredKeywords: safeStringArray(value.requiredKeywords),
    bannedKeywords: safeStringArray(value.bannedKeywords),
    requiredHashtags: safeStringArray(value.requiredHashtags),
    disclosureStyle: typeof value.disclosureStyle === "string" ? value.disclosureStyle : fallback.disclosureStyle,
    discountCode: typeof value.discountCode === "string" ? value.discountCode : "",
    landingUrl: typeof value.landingUrl === "string" ? value.landingUrl : "",
    contactName: typeof value.contactName === "string" ? value.contactName : "",
    contactChannel: typeof value.contactChannel === "string" ? value.contactChannel : "",
    compensationType: typeof value.compensationType === "string" ? value.compensationType : "",
    compensationNote: typeof value.compensationNote === "string" ? value.compensationNote : "",
    campaignStatus: (value.campaignStatus as CampaignStatus) || fallback.campaignStatus,
    relatedContentIds: safeStringArray(value.relatedContentIds),
    relatedScheduleIds: safeStringArray(value.relatedScheduleIds),
    internalMemo: typeof value.internalMemo === "string" ? value.internalMemo : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt
  });
}

export function getCampaigns() {
  const raw = readJson<unknown[]>(campaignsKey, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateCampaign).filter(Boolean) as Campaign[];
}

export function saveCampaigns(campaigns: Campaign[]) {
  const unique = new Map(campaigns.map((campaign) => [campaign.id, { ...campaign, version: 1 }]));
  writeJson(campaignsKey, Array.from(unique.values()).slice(0, 300));
}

export function upsertCampaign(campaign: Campaign) {
  const campaigns = getCampaigns();
  const nextCampaign = normalizeCampaignDates({
    ...campaign,
    campaignName: campaign.campaignName.trim() || campaign.productName || "새 캠페인",
    updatedAt: new Date().toISOString()
  });
  const exists = campaigns.some((item) => item.id === campaign.id);
  saveCampaigns(exists ? campaigns.map((item) => (item.id === campaign.id ? nextCampaign : item)) : [nextCampaign, ...campaigns]);
  return nextCampaign;
}

export function deleteCampaign(id: string) {
  saveCampaigns(getCampaigns().filter((campaign) => campaign.id !== id));
}

export function duplicateCampaign(campaign: Campaign) {
  const now = new Date().toISOString();
  const clone: Campaign = {
    ...campaign,
    id: createCalendarId("campaign"),
    campaignName: `${campaign.campaignName} 복제본`,
    campaignStatus: "제안 검토 중",
    relatedContentIds: [],
    relatedScheduleIds: [],
    requiredDeliverables: campaign.requiredDeliverables.map<Campaign["requiredDeliverables"][number]>((deliverable) => ({
      ...deliverable,
      id: createCalendarId("deliverable"),
      status: "미시작"
    })),
    createdAt: now,
    updatedAt: now
  };
  return upsertCampaign(clone);
}

export function linkCampaignContent(campaignId: string | undefined, contentId: string, platform?: Platform) {
  if (!campaignId) return null;
  const campaign = getCampaigns().find((item) => item.id === campaignId);
  if (!campaign) return null;

  return upsertCampaign({
    ...markDeliverableGenerated(campaign, platform),
    relatedContentIds: Array.from(new Set([contentId, ...campaign.relatedContentIds])),
    campaignStatus: campaign.campaignStatus === "제안 검토 중" || campaign.campaignStatus === "수락" ? "제작 중" : campaign.campaignStatus
  });
}

export function linkCampaignSchedule(campaignId: string | undefined, scheduleId: string) {
  if (!campaignId) return null;
  const campaign = getCampaigns().find((item) => item.id === campaignId);
  if (!campaign) return null;

  return upsertCampaign({
    ...campaign,
    relatedScheduleIds: Array.from(new Set([scheduleId, ...campaign.relatedScheduleIds]))
  });
}

export function updateCampaignStatus(campaignId: string, status: CampaignStatus) {
  const campaign = getCampaigns().find((item) => item.id === campaignId);
  if (!campaign) return null;

  return upsertCampaign({
    ...campaign,
    campaignStatus: status
  });
}

export function updateDeliverableStatus(campaignId: string, deliverableId: string, status: DeliverableStatus) {
  const campaign = getCampaigns().find((item) => item.id === campaignId);
  if (!campaign) return null;

  return upsertCampaign({
    ...campaign,
    requiredDeliverables: campaign.requiredDeliverables.map((deliverable) =>
      deliverable.id === deliverableId ? { ...deliverable, status } : deliverable
    )
  });
}

export function campaignToPrefill(campaign: Campaign): CreateFormInput {
  return campaignToCreatePrefill(campaign);
}

export function createCampaignFromForm(form: {
  id?: string;
  campaignName: string;
  advertiserName: string;
  brandName: string;
  productName: string;
  campaignType: CampaignType;
  description: string;
  startDate: string;
  endDate: string;
  contentDeadline: string;
  publishStartAt: string;
  publishEndAt: string;
  targetPlatforms: Platform[];
  requiredKeywords: string;
  bannedKeywords: string;
  requiredHashtags: string;
  disclosureStyle: string;
  discountCode?: string;
  landingUrl?: string;
  contactName?: string;
  contactChannel?: string;
  compensationType?: string;
  compensationNote?: string;
  campaignStatus: CampaignStatus;
  internalMemo?: string;
  base?: Campaign;
}): Campaign {
  const now = new Date().toISOString();
  const base = form.base ?? createDefaultCampaign();

  return normalizeCampaignDates({
    ...base,
    id: form.id ?? base.id ?? createCalendarId("campaign"),
    campaignName: form.campaignName,
    advertiserName: form.advertiserName,
    brandName: form.brandName,
    productName: form.productName,
    campaignType: form.campaignType,
    description: form.description,
    startDate: toIso(form.startDate, base.startDate),
    endDate: toIso(form.endDate, base.endDate),
    contentDeadline: toIso(form.contentDeadline, base.contentDeadline),
    publishStartAt: toIso(form.publishStartAt, base.publishStartAt),
    publishEndAt: toIso(form.publishEndAt, base.publishEndAt),
    targetPlatforms: form.targetPlatforms,
    requiredKeywords: parseCampaignList(form.requiredKeywords),
    bannedKeywords: parseCampaignList(form.bannedKeywords),
    requiredHashtags: parseCampaignList(form.requiredHashtags).map((item) => `#${item.replace(/^#/, "")}`),
    disclosureStyle: form.disclosureStyle,
    discountCode: form.discountCode,
    landingUrl: form.landingUrl,
    contactName: form.contactName,
    contactChannel: form.contactChannel,
    compensationType: form.compensationType,
    compensationNote: form.compensationNote,
    campaignStatus: form.campaignStatus,
    internalMemo: form.internalMemo,
    createdAt: base.createdAt || now,
    updatedAt: now
  });
}

export function getCampaignStorageKeys() {
  return {
    campaignsKey
  };
}
