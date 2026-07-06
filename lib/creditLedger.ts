import {
  addMonths,
  createBillingDates,
  getPlanByName,
  getRolloverCap,
  MONTHLY_GRANT_SAFETY_LIMIT
} from "@/lib/subscription";
import type {
  CreditAccount,
  CreditDebitResult,
  CreditLedgerEntry,
  CreditLedgerType
} from "@/types";

function nowIso() {
  return new Date().toISOString();
}

export function createLedgerId(type: CreditLedgerType) {
  return `ledger-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function safeCredits(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return Math.floor(numberValue);
}

export function totalCredits(account: Pick<CreditAccount, "subscriptionCreditBalance" | "purchasedCreditBalance">) {
  return safeCredits(account.subscriptionCreditBalance) + safeCredits(account.purchasedCreditBalance);
}

export function normalizeCreditAccount(account: CreditAccount): CreditAccount {
  const subscriptionCreditBalance = safeCredits(account.subscriptionCreditBalance);
  const purchasedCreditBalance = safeCredits(account.purchasedCreditBalance);

  return {
    ...account,
    subscriptionCreditBalance,
    purchasedCreditBalance,
    totalCreditBalance: subscriptionCreditBalance + purchasedCreditBalance,
    lifetimeGrantedCredits: safeCredits(account.lifetimeGrantedCredits),
    lifetimePurchasedCredits: safeCredits(account.lifetimePurchasedCredits),
    lifetimeUsedCredits: safeCredits(account.lifetimeUsedCredits),
    lifetimeRefundedCredits: safeCredits(account.lifetimeRefundedCredits)
  };
}

export function makeLedgerEntry(
  account: CreditAccount,
  type: CreditLedgerType,
  amount: number,
  description: string,
  options: {
    relatedContentId?: string;
    relatedPlan?: string;
    metadata?: CreditLedgerEntry["metadata"];
  } = {}
): CreditLedgerEntry {
  const normalized = normalizeCreditAccount(account);

  return {
    id: createLedgerId(type),
    type,
    amount,
    balanceAfter: normalized.totalCreditBalance,
    subscriptionBalanceAfter: normalized.subscriptionCreditBalance,
    purchasedBalanceAfter: normalized.purchasedCreditBalance,
    description,
    relatedContentId: options.relatedContentId,
    relatedPlan: options.relatedPlan,
    createdAt: nowIso(),
    metadata: options.metadata
  };
}

export function createInitialCreditAccount(planName = "Free", existingCredits?: number) {
  const plan = getPlanByName(planName);
  const dates = createBillingDates();
  const startingCredits = safeCredits(existingCredits ?? plan.credits);
  const account = normalizeCreditAccount({
    version: 1,
    currentPlan: plan.name,
    subscriptionStatus: plan.name === "Free" ? "free" : "active",
    billingCycleStartedAt: dates.billingCycleStartedAt,
    nextCreditGrantAt: dates.nextCreditGrantAt,
    subscriptionCreditBalance: startingCredits,
    purchasedCreditBalance: 0,
    totalCreditBalance: startingCredits,
    lifetimeGrantedCredits: startingCredits,
    lifetimePurchasedCredits: 0,
    lifetimeUsedCredits: 0,
    lifetimeRefundedCredits: 0,
    lastUpdatedAt: nowIso()
  });

  return {
    account,
    ledgerEntry: makeLedgerEntry(account, "initial_grant", startingCredits, `${plan.name} 초기 크레딧 지급`, {
      relatedPlan: plan.name
    })
  };
}

export function debitCredits(
  account: CreditAccount,
  amount: number,
  options: { relatedContentId?: string; description?: string } = {}
): CreditDebitResult {
  const safeAmount = safeCredits(amount);
  const current = normalizeCreditAccount(account);

  if (safeAmount <= 0) {
    return {
      ok: false,
      account: current,
      subscriptionCreditsUsed: 0,
      purchasedCreditsUsed: 0,
      error: "차감할 크레딧이 올바르지 않습니다."
    };
  }

  if (current.totalCreditBalance < safeAmount) {
    return {
      ok: false,
      account: current,
      subscriptionCreditsUsed: 0,
      purchasedCreditsUsed: 0,
      error: "크레딧이 부족해요."
    };
  }

  const subscriptionCreditsUsed = Math.min(current.subscriptionCreditBalance, safeAmount);
  const purchasedCreditsUsed = safeAmount - subscriptionCreditsUsed;
  const nextAccount = normalizeCreditAccount({
    ...current,
    subscriptionCreditBalance: current.subscriptionCreditBalance - subscriptionCreditsUsed,
    purchasedCreditBalance: current.purchasedCreditBalance - purchasedCreditsUsed,
    lifetimeUsedCredits: current.lifetimeUsedCredits + safeAmount,
    lastUpdatedAt: nowIso()
  });

  return {
    ok: true,
    account: nextAccount,
    ledgerEntry: makeLedgerEntry(nextAccount, "generation_debit", -safeAmount, options.description ?? "업로드 패키지 생성 크레딧 차감", {
      relatedContentId: options.relatedContentId,
      metadata: {
        subscriptionCreditsUsed,
        purchasedCreditsUsed
      }
    }),
    subscriptionCreditsUsed,
    purchasedCreditsUsed
  };
}

export function refundGenerationDebit(
  account: CreditAccount,
  debitEntry: CreditLedgerEntry,
  options: { description?: string } = {}
) {
  const subscriptionCreditsUsed = safeCredits(debitEntry.metadata?.subscriptionCreditsUsed);
  const purchasedCreditsUsed = safeCredits(debitEntry.metadata?.purchasedCreditsUsed);
  const refundAmount = subscriptionCreditsUsed + purchasedCreditsUsed;
  const current = normalizeCreditAccount(account);
  const nextAccount = normalizeCreditAccount({
    ...current,
    subscriptionCreditBalance: current.subscriptionCreditBalance + subscriptionCreditsUsed,
    purchasedCreditBalance: current.purchasedCreditBalance + purchasedCreditsUsed,
    lifetimeRefundedCredits: current.lifetimeRefundedCredits + refundAmount,
    lifetimeUsedCredits: Math.max(0, current.lifetimeUsedCredits - refundAmount),
    lastUpdatedAt: nowIso()
  });

  return {
    account: nextAccount,
    ledgerEntry: makeLedgerEntry(nextAccount, "generation_refund", refundAmount, options.description ?? "생성 실패로 크레딧 환불", {
      relatedContentId: debitEntry.relatedContentId,
      relatedPlan: debitEntry.relatedPlan,
      metadata: {
        debitLedgerId: debitEntry.id,
        subscriptionCreditsRefunded: subscriptionCreditsUsed,
        purchasedCreditsRefunded: purchasedCreditsUsed
      }
    })
  };
}

export function applyDueMonthlyGrant(account: CreditAccount, now = new Date()) {
  let current = normalizeCreditAccount(account);
  const entries: CreditLedgerEntry[] = [];
  let grantsApplied = 0;

  // Mock-only safety: real production must validate grants on a server.
  while (new Date(current.nextCreditGrantAt).getTime() <= now.getTime() && grantsApplied < MONTHLY_GRANT_SAFETY_LIMIT) {
    if (current.scheduledPlanChange && new Date(current.scheduledPlanChange.effectiveAt).getTime() <= now.getTime()) {
      current = normalizeCreditAccount({
        ...current,
        currentPlan: current.scheduledPlanChange.planName,
        subscriptionStatus: current.scheduledPlanChange.planName === "Free" ? "free" : "active",
        scheduledPlanChange: undefined
      });
    }

    const plan = getPlanByName(current.currentPlan);
    const rolloverCap = getRolloverCap(plan.name);
    const rolloverAmount = Math.min(current.subscriptionCreditBalance, rolloverCap);
    const expiredAmount = Math.max(0, current.subscriptionCreditBalance - rolloverAmount);

    if (expiredAmount > 0) {
      current = normalizeCreditAccount({
        ...current,
        subscriptionCreditBalance: rolloverAmount,
        lastUpdatedAt: nowIso()
      });
      entries.push(
        makeLedgerEntry(current, "credit_expiration", -expiredAmount, "월 지급 전 초과 구독 크레딧 만료", {
          relatedPlan: plan.name,
          metadata: { rolloverCap }
        })
      );
    }

    if (rolloverAmount > 0) {
      entries.push(
        makeLedgerEntry(current, "rollover", 0, `${rolloverAmount.toLocaleString()} 구독 크레딧 이월`, {
          relatedPlan: plan.name,
          metadata: { rolloverAmount, rolloverCap }
        })
      );
    }

    current = normalizeCreditAccount({
      ...current,
      billingCycleStartedAt: now.toISOString(),
      nextCreditGrantAt: addMonths(now, 1).toISOString(),
      subscriptionCreditBalance: current.subscriptionCreditBalance + plan.credits,
      lifetimeGrantedCredits: current.lifetimeGrantedCredits + plan.credits,
      lastUpdatedAt: nowIso()
    });
    entries.push(
      makeLedgerEntry(current, "subscription_grant", plan.credits, `${plan.name} 월 크레딧 지급`, {
        relatedPlan: plan.name
      })
    );
    grantsApplied += 1;
  }

  return {
    account: current,
    ledgerEntries: entries
  };
}
