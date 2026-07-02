import {
  addMonths,
  createBillingDates,
  getPlanByName,
  getRolloverCap,
  isDowngrade,
  isUpgrade,
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

export function createInitialCreditAccount(planName = "Starter", existingCredits?: number) {
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

export function purchaseCredits(account: CreditAccount, credits: number, price: string) {
  const safeAmount = safeCredits(credits);
  const current = normalizeCreditAccount(account);
  const nextAccount = normalizeCreditAccount({
    ...current,
    purchasedCreditBalance: current.purchasedCreditBalance + safeAmount,
    lifetimePurchasedCredits: current.lifetimePurchasedCredits + safeAmount,
    lastUpdatedAt: nowIso()
  });

  return {
    account: nextAccount,
    ledgerEntry: makeLedgerEntry(nextAccount, "credit_purchase", safeAmount, `${safeAmount.toLocaleString()} 크레딧 mock 구매`, {
      metadata: { price }
    })
  };
}

export function changePlan(account: CreditAccount, nextPlanName: string) {
  const current = normalizeCreditAccount(account);
  const currentPlan = getPlanByName(current.currentPlan);
  const nextPlan = getPlanByName(nextPlanName);

  if (currentPlan.name === nextPlan.name) {
    return {
      account: current,
      ledgerEntry: undefined,
      message: "현재 이용 중인 플랜입니다."
    };
  }

  if (isUpgrade(currentPlan.name, nextPlan.name)) {
    const grantDifference = Math.max(0, nextPlan.credits - currentPlan.credits);
    const nextAccount = normalizeCreditAccount({
      ...current,
      currentPlan: nextPlan.name,
      subscriptionStatus: nextPlan.name === "Free" ? "free" : "active",
      subscriptionCreditBalance: current.subscriptionCreditBalance + grantDifference,
      lifetimeGrantedCredits: current.lifetimeGrantedCredits + grantDifference,
      scheduledPlanChange: undefined,
      lastUpdatedAt: nowIso()
    });

    return {
      account: nextAccount,
      ledgerEntry: makeLedgerEntry(nextAccount, "plan_upgrade", grantDifference, `${nextPlan.name} 플랜으로 mock 업그레이드`, {
        relatedPlan: nextPlan.name,
        metadata: {
          previousPlan: currentPlan.name,
          grantDifference
        }
      }),
      message: `${nextPlan.name} 플랜으로 변경하고 차액 ${grantDifference.toLocaleString()} 크레딧을 지급했어요.`
    };
  }

  if (isDowngrade(currentPlan.name, nextPlan.name)) {
    const nextAccount = normalizeCreditAccount({
      ...current,
      scheduledPlanChange: {
        planName: nextPlan.name,
        effectiveAt: current.nextCreditGrantAt,
        requestedAt: nowIso()
      },
      lastUpdatedAt: nowIso()
    });

    return {
      account: nextAccount,
      ledgerEntry: makeLedgerEntry(nextAccount, "plan_downgrade", 0, `${nextPlan.name} 플랜으로 다음 결제일부터 mock 다운그레이드 예약`, {
        relatedPlan: nextPlan.name,
        metadata: {
          previousPlan: currentPlan.name,
          effectiveAt: current.nextCreditGrantAt
        }
      }),
      message: `${nextPlan.name} 플랜 변경이 다음 지급일부터 적용되도록 예약됐어요.`
    };
  }

  return {
    account: current,
    ledgerEntry: undefined,
    message: "플랜 변경을 처리하지 못했어요."
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
