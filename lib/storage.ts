"use client";

import { getDefaultAccount } from "@/lib/credits";
import { getCreditAccount, saveCreditAccount } from "@/lib/creditStorage";
import {
  createDefaultPersonalizationProfile,
  migratePersonalizationProfile
} from "@/lib/personalization";
import { isPersonalizationLearningAllowed } from "@/lib/privacyStorage";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { BrandProfile, GeneratedPackage, HistoryItem, LegacyAccountState, PersonalizationProfile } from "@/types";

const accountKey = STORAGE_KEYS.account;
const brandKey = STORAGE_KEYS.brandProfile;
const historyKey = STORAGE_KEYS.history;
const currentResultKey = STORAGE_KEYS.currentResult;
const prefillKey = STORAGE_KEYS.createPrefill;
const personalizationKey = STORAGE_KEYS.personalizationProfile;

export const defaultBrandProfile: BrandProfile = {
  accountName: "PostKit Studio",
  category: "라이프스타일 / 커머스",
  voice: "친근함",
  feedMood: "밝고 정돈된 피드",
  primaryColor: "#ff6b4a",
  secondaryColor: "#edf9f6",
  favoriteHashtags: "#데일리 #추천템 #소통",
  requiredPhrases: "저장해두고 보기",
  bannedPhrases: "과장된 1위 표현",
  defaultDisclosure: "#광고 또는 #협찬을 첫 문장에 표시",
  preferredPlatform: "Instagram Feed"
};

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

export function getAccount() {
  const legacy = readJson<LegacyAccountState>(accountKey, getDefaultAccount());
  const creditAccount = getCreditAccount();

  return {
    planName: creditAccount.currentPlan,
    credits: creditAccount.totalCreditBalance,
    monthlyGenerations: legacy.monthlyGenerations
  };
}

export function saveAccount(account: LegacyAccountState) {
  writeJson(accountKey, account);
  const currentCreditAccount = getCreditAccount({ applyMonthlyGrant: false });
  saveCreditAccount({
    ...currentCreditAccount,
    currentPlan: account.planName,
    subscriptionCreditBalance: Math.max(0, account.credits),
    purchasedCreditBalance: 0,
    totalCreditBalance: Math.max(0, account.credits),
    lastUpdatedAt: new Date().toISOString()
  });
}

export function getBrandProfile() {
  return readJson<BrandProfile>(brandKey, defaultBrandProfile);
}

export function saveBrandProfile(profile: BrandProfile) {
  writeJson(brandKey, profile);

  const personalization = getPersonalizationProfile();
  savePersonalizationProfile({
    ...personalization,
    preferredPlatforms: personalization.preferredPlatforms.length > 0 ? personalization.preferredPlatforms : [profile.preferredPlatform],
    preferredTone: personalization.preferredTone || profile.voice,
    frequentlyUsedHashtags:
      personalization.frequentlyUsedHashtags.length > 0
        ? personalization.frequentlyUsedHashtags
        : profile.favoriteHashtags
            .split(/[,#\n]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => `#${item.replace(/^#/, "").replace(/\s+/g, "")}`),
    requiredPhrases: personalization.requiredPhrases.length > 0 ? personalization.requiredPhrases : profile.requiredPhrases.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean),
    bannedPhrases: personalization.bannedPhrases.length > 0 ? personalization.bannedPhrases : profile.bannedPhrases.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean),
    sponsoredDisclosureStyle: personalization.sponsoredDisclosureStyle || profile.defaultDisclosure,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function getHistory() {
  return readArray<HistoryItem>(historyKey).filter((item) => item && typeof item === "object" && Boolean(item.package));
}

export function saveHistory(history: HistoryItem[]) {
  writeJson(historyKey, history);
}

export function addToHistory(result: GeneratedPackage) {
  const history = getHistory();
  const nextHistory = [{ id: result.id, createdAt: result.createdAt, package: result }, ...history].slice(0, 30);
  saveHistory(nextHistory);
}

export function updateHistoryResult(result: GeneratedPackage) {
  const history = getHistory();
  const exists = history.some((item) => item.id === result.id);
  if (exists) {
    saveHistory(history.map((item) => (item.id === result.id ? { ...item, package: result } : item)));
  }
}

export function getCurrentResult() {
  const value = readJson<unknown>(currentResultKey, null);
  return value && typeof value === "object" && !Array.isArray(value) && "id" in value ? (value as GeneratedPackage) : null;
}

export function saveCurrentResult(result: GeneratedPackage) {
  writeJson(currentResultKey, result);
}

export function updateCurrentResult(updater: (result: GeneratedPackage) => GeneratedPackage) {
  const current = getCurrentResult();
  if (!current) {
    return null;
  }

  const nextResult = updater(current);
  saveCurrentResult(nextResult);
  updateHistoryResult(nextResult);
  return nextResult;
}

export function getPrefill() {
  const value = readJson<unknown>(prefillKey, null);
  return value && typeof value === "object" && !Array.isArray(value) && "platform" in value ? (value as GeneratedPackage["input"]) : null;
}

export function savePrefill(input: GeneratedPackage["input"]) {
  writeJson(prefillKey, input);
}

export function clearPrefill() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(prefillKey);
  }
}

export function getPersonalizationProfile() {
  const brand = readJson<BrandProfile>(brandKey, defaultBrandProfile);
  const fallback = createDefaultPersonalizationProfile(brand);
  const raw = readJson<unknown>(personalizationKey, fallback);
  return migratePersonalizationProfile(raw, brand);
}

export function savePersonalizationProfile(profile: PersonalizationProfile) {
  writeJson(personalizationKey, {
    ...profile,
    lastUpdatedAt: new Date().toISOString()
  });
}

export function updatePersonalizationProfile(updater: (profile: PersonalizationProfile) => PersonalizationProfile) {
  if (!isPersonalizationLearningAllowed()) {
    return getPersonalizationProfile();
  }

  const nextProfile = updater(getPersonalizationProfile());
  savePersonalizationProfile(nextProfile);
  return nextProfile;
}

export function resetPersonalizationProfile() {
  const nextProfile = createDefaultPersonalizationProfile(getBrandProfile());
  savePersonalizationProfile(nextProfile);
  return nextProfile;
}

export function importPersonalizationProfile(value: unknown) {
  const nextProfile = migratePersonalizationProfile(value, getBrandProfile());
  savePersonalizationProfile(nextProfile);
  return nextProfile;
}

export function getPersonalizationStorageKey() {
  return personalizationKey;
}
