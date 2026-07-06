"use client";

import {
  applyDueMonthlyGrant,
  createInitialCreditAccount,
  debitCredits,
  normalizeCreditAccount,
  refundGenerationDebit,
  safeCredits,
  totalCredits
} from "@/lib/creditLedger";
import { FREE_BETA_PLAN_NAME } from "@/lib/plans";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { CREDIT_ACCOUNT_VERSION, getPlanByName } from "@/lib/subscription";
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

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간 부족 등으로 기록에 실패해도 앱 흐름은 중단하지 않는다.
  }
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
  // 무료 공개 베타에서는 결제가 없으므로 어떤 저장값이든 Free 베타 플랜으로 정규화한다.
  // 유료 플랜은 서버 결제 검증이 연결된 뒤에만 복원한다.
  const plan = getPlanByName(FREE_BETA_PLAN_NAME);
  const subscriptionCreditBalance = safeCredits(value.subscriptionCreditBalance);
  const purchasedCreditBalance = safeCredits(value.purchasedCreditBalance);
  const now = new Date().toISOString();

  return normalizeCreditAccount({
    version: CREDIT_ACCOUNT_VERSION,
    currentPlan: plan.name,
    subscriptionStatus: "free",
    billingCycleStartedAt: typeof value.billingCycleStartedAt === "string" ? value.billingCycleStartedAt : now,
    nextCreditGrantAt: typeof value.nextCreditGrantAt === "string" ? value.nextCreditGrantAt : now,
    subscriptionCreditBalance,
    purchasedCreditBalance,
    totalCreditBalance: subscriptionCreditBalance + purchasedCreditBalance,
    lifetimeGrantedCredits: safeCredits(value.lifetimeGrantedCredits),
    lifetimePurchasedCredits: safeCredits(value.lifetimePurchasedCredits),
    lifetimeUsedCredits: safeCredits(value.lifetimeUsedCredits),
    lifetimeRefundedCredits: safeCredits(value.lifetimeRefundedCredits),
    lastUpdatedAt: typeof value.lastUpdatedAt === "string" ? value.lastUpdatedAt : now
  });
}

function createMigratedAccount() {
  const legacy = readLegacyAccount();
  const plan = getPlanByName(FREE_BETA_PLAN_NAME);
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

/**
 * 새로고침 등으로 완료 처리가 끊긴 생성 요청의 차감분을 환불한다.
 * 성공적으로 끝난 요청(관련 환불이 이미 있거나 결과가 저장된 경우)은 refundGenerationCredits의
 * 중복 환불 가드가 그대로 막아준다.
 */
export function refundGenerationCreditsByRequestId(requestId: string) {
  const debitEntry = getCreditLedger().find(
    (entry) => entry.type === "generation_debit" && entry.relatedContentId === requestId
  );

  if (!debitEntry) {
    return {
      account: getCreditAccount({ applyMonthlyGrant: false }),
      ledgerEntry: undefined,
      refunded: false
    };
  }

  return refundGenerationCredits(debitEntry.id);
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

export function getCreditStorageKeys() {
  return {
    creditAccountKey,
    creditLedgerKey,
    legacyAccountKey
  };
}
