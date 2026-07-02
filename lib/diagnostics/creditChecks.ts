"use client";

import { getCreditAccount, getCreditLedger } from "@/lib/creditStorage";
import { subscriptionPlans } from "@/lib/plans";
import { UPLOAD_PACKAGE_CREDIT_COST } from "@/lib/subscription";
import { getHistory } from "@/lib/storage";
import type { CreditLedgerEntry, DiagnosticCheck } from "@/types";

function check(input: Omit<DiagnosticCheck, "category">): DiagnosticCheck {
  return { category: "크레딧 상태", ...input };
}

function validDate(value: string | undefined) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

export function getCreditDiagnostics(): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];
  const account = getCreditAccount({ applyMonthlyGrant: false });
  const ledger = getCreditLedger();
  const historyContentIds = new Set(getHistory().map((item) => item.package.id));
  const plan = subscriptionPlans.find((item) => item.name === account.currentPlan);
  const totalFromParts = account.subscriptionCreditBalance + account.purchasedCreditBalance;

  checks.push(check({
    id: "credit-total",
    label: "총 크레딧 계산",
    status: account.totalCreditBalance === totalFromParts ? "정상" : "오류",
    code: account.totalCreditBalance === totalFromParts ? "CREDIT_TOTAL_OK" : "CREDIT_TOTAL_MISMATCH",
    message: account.totalCreditBalance === totalFromParts
      ? "총 잔액이 구독 크레딧과 구매 크레딧 합계와 일치합니다."
      : "표시된 총 크레딧과 실제 잔액 계산이 일치하지 않아요.",
    fix: account.totalCreditBalance === totalFromParts ? undefined : "백업 후 테스트 크레딧 재계산 결과를 확인하세요."
  }));

  [
    ["subscriptionCreditBalance", account.subscriptionCreditBalance],
    ["purchasedCreditBalance", account.purchasedCreditBalance],
    ["lifetimeUsedCredits", account.lifetimeUsedCredits],
    ["lifetimeGrantedCredits", account.lifetimeGrantedCredits],
    ["lifetimePurchasedCredits", account.lifetimePurchasedCredits],
    ["lifetimeRefundedCredits", account.lifetimeRefundedCredits]
  ].forEach(([name, value]) => {
    const numberValue = Number(value);
    checks.push(check({
      id: `credit-number-${name}`,
      label: String(name),
      status: Number.isFinite(numberValue) && numberValue >= 0 ? "정상" : "오류",
      code: Number.isFinite(numberValue) && numberValue >= 0 ? "CREDIT_NUMBER_OK" : "CREDIT_NUMBER_INVALID",
      message: Number.isFinite(numberValue) && numberValue >= 0 ? "음수나 NaN이 아닙니다." : "음수, NaN 또는 Infinity 값입니다."
    }));
  });

  checks.push(check({
    id: "credit-plan",
    label: "현재 플랜 설정",
    status: plan ? "정상" : "오류",
    code: plan ? "CREDIT_PLAN_VALID" : "CREDIT_PLAN_INVALID",
    message: plan ? `${plan.name} 플랜 설정을 찾았습니다. 월 ${plan.credits.toLocaleString()} 크레딧입니다.` : "현재 플랜이 가격 설정에 없습니다."
  }));

  checks.push(check({
    id: "credit-next-grant-date",
    label: "다음 지급일",
    status: validDate(account.nextCreditGrantAt) ? "정상" : "오류",
    code: validDate(account.nextCreditGrantAt) ? "NEXT_GRANT_DATE_VALID" : "NEXT_GRANT_DATE_INVALID",
    message: validDate(account.nextCreditGrantAt) ? "다음 월 크레딧 지급일 날짜가 유효합니다." : "다음 지급일 날짜가 올바르지 않습니다."
  }));

  if (account.scheduledPlanChange) {
    const scheduledPlan = subscriptionPlans.find((item) => item.name === account.scheduledPlanChange?.planName);
    checks.push(check({
      id: "credit-scheduled-plan",
      label: "예약된 플랜 변경",
      status: scheduledPlan && validDate(account.scheduledPlanChange.effectiveAt) ? "정상" : "오류",
      code: scheduledPlan ? "SCHEDULED_PLAN_VALID" : "SCHEDULED_PLAN_INVALID",
      message: scheduledPlan ? "예약된 플랜 변경 값이 유효합니다." : "예약된 다운그레이드 플랜이 가격 설정에 없습니다."
    }));
  }

  const debitsByRequest = new Map<string, CreditLedgerEntry[]>();
  ledger.filter((entry) => entry.type === "generation_debit").forEach((entry) => {
    const key = String(entry.metadata?.requestId ?? entry.relatedContentId ?? entry.id);
    debitsByRequest.set(key, [...(debitsByRequest.get(key) ?? []), entry]);
  });
  const duplicateDebits = Array.from(debitsByRequest.values()).filter((entries) => entries.length > 1).flat();
  if (duplicateDebits.length > 0) {
    checks.push(check({
      id: "credit-duplicate-debit",
      label: "중복 생성 차감",
      status: "오류",
      code: "DUPLICATE_GENERATION_DEBIT",
      message: `같은 요청 또는 콘텐츠에 중복 차감으로 보이는 원장 ${duplicateDebits.length}개를 발견했습니다.`,
      fix: "원장을 백업한 뒤 중복 요청 ID와 환불 상태를 확인하세요."
    }));
  }

  const refundsByDebit = new Map<string, number>();
  ledger.filter((entry) => entry.type === "generation_refund").forEach((entry) => {
    const debitLedgerId = String(entry.metadata?.debitLedgerId ?? "");
    if (debitLedgerId) refundsByDebit.set(debitLedgerId, (refundsByDebit.get(debitLedgerId) ?? 0) + 1);
  });
  const doubleRefunds = Array.from(refundsByDebit.values()).filter((count) => count > 1).length;
  if (doubleRefunds > 0) {
    checks.push(check({
      id: "credit-double-refund",
      label: "중복 환불",
      status: "오류",
      code: "DUPLICATE_GENERATION_REFUND",
      message: `같은 차감 원장에 2회 이상 환불된 항목 ${doubleRefunds}개를 발견했습니다.`
    }));
  }

  const missingContentLedgers = ledger.filter((entry) => entry.relatedContentId && !historyContentIds.has(entry.relatedContentId));
  if (missingContentLedgers.length > 0) {
    checks.push(check({
      id: "credit-missing-content",
      label: "원장 콘텐츠 연결",
      status: "확인 필요",
      code: "LEDGER_CONTENT_REFERENCE_MISSING",
      message: `존재하지 않는 콘텐츠 ID와 연결된 원장 ${missingContentLedgers.length}개를 발견했습니다.`
    }));
  }

  const possiblePackages = Math.floor(account.totalCreditBalance / UPLOAD_PACKAGE_CREDIT_COST);
  checks.push(check({
    id: "credit-package-capacity",
    label: "생성 가능 패키지 수",
    status: account.totalCreditBalance >= UPLOAD_PACKAGE_CREDIT_COST ? "정상" : "확인 필요",
    code: "UPLOAD_PACKAGE_CAPACITY",
    message: `현재 잔액으로 업로드 패키지 ${possiblePackages.toLocaleString()}개를 생성할 수 있습니다.`
  }));

  return checks;
}

export function getCreditRecalculationPreview() {
  const account = getCreditAccount({ applyMonthlyGrant: false });
  return {
    currentTotal: account.totalCreditBalance,
    recalculatedTotal: Math.max(0, account.subscriptionCreditBalance) + Math.max(0, account.purchasedCreditBalance),
    subscriptionCreditBalance: Math.max(0, account.subscriptionCreditBalance),
    purchasedCreditBalance: Math.max(0, account.purchasedCreditBalance),
    wouldChange: account.totalCreditBalance !== account.subscriptionCreditBalance + account.purchasedCreditBalance
  };
}
