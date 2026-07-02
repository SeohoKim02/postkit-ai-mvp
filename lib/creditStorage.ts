"use client";

import {
  applyDueMonthlyGrant,
  changePlan,
  createInitialCreditAccount,
  debitCredits,
  normalizeCreditAccount,
  purchaseCredits,
  refundGenerationDebit,
  safeCredits,
  totalCredits
} from "@/lib/creditLedger";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { CREDIT_ACCOUNT_VERSION, getCreditPack, getPlanByName } from "@/lib/subscription";
import type {
  CreditAccount,
  CreditDebitResult,
  CreditLedgerEntry,
  LegacyAccountState
} from "@/types";

const creditAccountKey = STORAGE_KEYS.creditAccount;
const creditLedgerKey = STORAGE_KEYS.creditLedger;
const legacyAccountKey = STORAGE_KEYS.account;

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

function readLegacyAccount() {
  return readJson<Partial<LegacyAccountState> | null>(legacyAccountKey, null);
}

function migrateCreditAccount(raw: unknown): CreditAccount | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const value = raw as Partial<CreditAccount>;
  const plan = getPlanByName(String(value.currentPlan || "Starter"));
  const subscriptionCreditBalance = safeCredits(value.subscriptionCreditBalance);
  const purchasedCreditBalance = safeCredits(value.purchasedCreditBalance);
  const now = new Date().toISOString();

  return normalizeCreditAccount({
    version: CREDIT_ACCOUNT_VERSION,
    currentPlan: plan.name,
    subscriptionStatus: value.subscriptionStatus ?? (plan.name === "Free" ? "free" : "active"),
    billingCycleStartedAt: typeof value.billingCycleStartedAt === "string" ? value.billingCycleStartedAt : now,
    nextCreditGrantAt: typeof value.nextCreditGrantAt === "string" ? value.nextCreditGrantAt : now,
    subscriptionCreditBalance,
    purchasedCreditBalance,
    totalCreditBalance: subscriptionCreditBalance + purchasedCreditBalance,
    lifetimeGrantedCredits: safeCredits(value.lifetimeGrantedCredits),
    lifetimePurchasedCredits: safeCredits(value.lifetimePurchasedCredits),
    lifetimeUsedCredits: safeCredits(value.lifetimeUsedCredits),
    lifetimeRefundedCredits: safeCredits(value.lifetimeRefundedCredits),
    scheduledPlanChange: value.scheduledPlanChange,
    lastUpdatedAt: typeof value.lastUpdatedAt === "string" ? value.lastUpdatedAt : now
  });
}

function createMigratedAccount() {
  const legacy = readLegacyAccount();
  const legacyPlan = typeof legacy?.planName === "string" ? legacy.planName : "Starter";
  const plan = getPlanByName(legacyPlan);
  const legacyCredits = typeof legacy?.credits === "number" ? safeCredits(legacy.credits) : plan.credits;
  return createInitialCreditAccount(plan.name, legacyCredits);
}

export function getCreditLedger() {
  return readArray<CreditLedgerEntry>(creditLedgerKey).filter((entry) => entry && typeof entry === "object" && typeof entry.id === "string");
}

export function saveCreditLedger(entries: CreditLedgerEntry[]) {
  const unique = new Map(entries.map((entry) => [entry.id, entry]));
  writeJson(creditLedgerKey, Array.from(unique.values()).slice(0, 300));
}

export function appendCreditLedger(entries: CreditLedgerEntry | CreditLedgerEntry[] | undefined) {
  if (!entries) {
    return;
  }

  const nextEntries = Array.isArray(entries) ? entries : [entries];
  saveCreditLedger([...nextEntries, ...getCreditLedger()]);
}

export function saveCreditAccount(account: CreditAccount) {
  const normalized = normalizeCreditAccount(account);
  writeJson(creditAccountKey, normalized);

  const legacy = readLegacyAccount();
  writeJson(legacyAccountKey, {
    planName: normalized.currentPlan,
    credits: normalized.totalCreditBalance,
    monthlyGenerations: safeCredits(legacy?.monthlyGenerations)
  });
}

export function getCreditAccount(options: { applyMonthlyGrant?: boolean } = {}) {
  const applyMonthlyGrant = options.applyMonthlyGrant ?? true;
  const raw = readJson<unknown>(creditAccountKey, null);
  let account = migrateCreditAccount(raw);

  if (!account) {
    const migrated = createMigratedAccount();
    account = migrated.account;
    saveCreditAccount(account);

    if (getCreditLedger().length === 0) {
      appendCreditLedger(migrated.ledgerEntry);
    }
  }

  if (applyMonthlyGrant) {
    const grant = applyDueMonthlyGrant(account);
    if (grant.ledgerEntries.length > 0) {
      saveCreditAccount(grant.account);
      appendCreditLedger(grant.ledgerEntries);
      return grant.account;
    }
  }

  const normalized = normalizeCreditAccount(account);
  if (normalized.totalCreditBalance !== account.totalCreditBalance) {
    saveCreditAccount(normalized);
  }
  return normalized;
}

export function getCreditSummary() {
  const account = getCreditAccount();
  return {
    account,
    totalCreditBalance: totalCredits(account),
    subscriptionCreditBalance: account.subscriptionCreditBalance,
    purchasedCreditBalance: account.purchasedCreditBalance
  };
}

export function canSpendCredits(amount: number) {
  return getCreditAccount().totalCreditBalance >= safeCredits(amount);
}

export function spendCreditsForGeneration(amount: number, relatedContentId: string): CreditDebitResult {
  const result = debitCredits(getCreditAccount(), amount, {
    relatedContentId,
    description: "업로드 패키지 생성 크레딧 차감"
  });

  if (result.ok) {
    saveCreditAccount(result.account);
    appendCreditLedger(result.ledgerEntry);
  }

  return result;
}

export function refundGenerationCredits(debitLedgerId: string) {
  const ledger = getCreditLedger();
  const debitEntry = ledger.find((entry) => entry.id === debitLedgerId && entry.type === "generation_debit");
  const alreadyRefunded = ledger.some((entry) => entry.type === "generation_refund" && entry.metadata?.debitLedgerId === debitLedgerId);

  if (!debitEntry || alreadyRefunded) {
    return {
      account: getCreditAccount(),
      ledgerEntry: undefined,
      refunded: false
    };
  }

  const result = refundGenerationDebit(getCreditAccount(), debitEntry);
  saveCreditAccount(result.account);
  appendCreditLedger(result.ledgerEntry);

  return {
    ...result,
    refunded: true
  };
}

export function mockPurchaseCredits(credits: number) {
  const pack = getCreditPack(credits);
  if (!pack) {
    return {
      account: getCreditAccount(),
      ledgerEntry: undefined,
      message: "크레딧 상품을 찾을 수 없습니다."
    };
  }

  const result = purchaseCredits(getCreditAccount(), pack.credits, pack.price);
  saveCreditAccount(result.account);
  appendCreditLedger(result.ledgerEntry);

  return {
    ...result,
    message: `${pack.credits.toLocaleString()} 크레딧 mock 구매가 완료됐어요. 실제 결제는 발생하지 않았습니다.`
  };
}

export function mockChangePlan(planName: string) {
  const result = changePlan(getCreditAccount(), planName);
  saveCreditAccount(result.account);
  appendCreditLedger(result.ledgerEntry);
  return result;
}

export function getCreditStorageKeys() {
  return {
    creditAccountKey,
    creditLedgerKey,
    legacyAccountKey
  };
}
