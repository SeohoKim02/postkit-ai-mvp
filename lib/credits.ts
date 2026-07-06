import { UPLOAD_PACKAGE_CREDIT_COST, getPlanByName } from "@/lib/subscription";
import type { LegacyAccountState } from "@/types";

export const PACKAGE_CREDIT_COST = UPLOAD_PACKAGE_CREDIT_COST;

export function getDefaultAccount(): LegacyAccountState {
  const freePlan = getPlanByName("Free");

  return {
    planName: freePlan.name,
    credits: freePlan.credits,
    monthlyGenerations: 0
  };
}
