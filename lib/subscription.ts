import { creditPacks, subscriptionPlans } from "@/lib/plans";
import type { CreditPack, SubscriptionPlan } from "@/types";

export const CREDIT_ACCOUNT_VERSION = 1;
export const CREDIT_LEDGER_VERSION = 1;
export const MONTHLY_GRANT_SAFETY_LIMIT = 1;
export const UPLOAD_PACKAGE_CREDIT_COST = 30;

export const rolloverPolicy: Record<string, number> = {
  Free: 0,
  Starter: 0,
  Creator: 50,
  "Creator Plus": 100,
  Business: 300,
  Agency: 1000
};

export function getPlanByName(planName: string): SubscriptionPlan {
  return subscriptionPlans.find((plan) => plan.name === planName) ?? subscriptionPlans[1] ?? subscriptionPlans[0];
}

export function getCreditPack(credits: number): CreditPack | undefined {
  return creditPacks.find((pack) => pack.credits === credits);
}

export function getPlanRank(planName: string) {
  return subscriptionPlans.findIndex((plan) => plan.name === planName);
}

export function isUpgrade(currentPlan: string, nextPlan: string) {
  return getPlanRank(nextPlan) > getPlanRank(currentPlan);
}

export function isDowngrade(currentPlan: string, nextPlan: string) {
  return getPlanRank(nextPlan) < getPlanRank(currentPlan);
}

export function addMonths(value: string | Date, months: number) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function createBillingDates(now = new Date()) {
  return {
    billingCycleStartedAt: now.toISOString(),
    nextCreditGrantAt: addMonths(now, 1).toISOString()
  };
}

export function daysUntil(dateIso: string, now = new Date()) {
  const target = new Date(dateIso).getTime();
  const current = now.getTime();
  return Math.max(0, Math.ceil((target - current) / (1000 * 60 * 60 * 24)));
}

export function getRolloverCap(planName: string) {
  return rolloverPolicy[planName] ?? 0;
}
