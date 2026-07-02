import { UPLOAD_PACKAGE_CREDIT_COST } from "@/lib/subscription";
import type { LegacyAccountState, SubscriptionPlan } from "@/types";

export const PACKAGE_CREDIT_COST = UPLOAD_PACKAGE_CREDIT_COST;

export function getDefaultAccount(): LegacyAccountState {
  return {
    planName: "Starter",
    credits: 120,
    monthlyGenerations: 0
  };
}

export function canGeneratePackage(account: LegacyAccountState) {
  return account.credits >= PACKAGE_CREDIT_COST;
}

export function spendPackageCredits(account: LegacyAccountState): LegacyAccountState {
  return {
    ...account,
    credits: Math.max(0, account.credits - PACKAGE_CREDIT_COST),
    monthlyGenerations: account.monthlyGenerations + 1
  };
}

export function applyPlan(account: LegacyAccountState, plan: SubscriptionPlan): LegacyAccountState {
  return {
    ...account,
    planName: plan.name,
    credits: plan.credits
  };
}

export function addCredits(account: LegacyAccountState, credits: number): LegacyAccountState {
  return {
    ...account,
    credits: account.credits + credits
  };
}
