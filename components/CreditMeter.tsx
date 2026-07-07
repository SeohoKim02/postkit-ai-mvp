import { CreditCard } from "lucide-react";
import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import { subscriptionPlans } from "@/lib/plans";
import { daysUntil } from "@/lib/subscription";
import type { CreditAccount } from "@/types";

export function CreditMeter({ account }: { account: CreditAccount | null }) {
  if (!account) {
    return (
      <div className="soft-card p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">현재 플랜</p>
        <p className="mt-2 text-sm leading-6 text-muted">체험 크레딧 잔액을 불러오는 중이에요.</p>
      </div>
    );
  }

  const planCredits = subscriptionPlans.find((plan) => plan.name === account.currentPlan)?.credits ?? account.totalCreditBalance;
  const percent = Math.min(100, Math.round((account.subscriptionCreditBalance / Math.max(planCredits, 1)) * 100));
  const possiblePackages = Math.floor(account.totalCreditBalance / PACKAGE_CREDIT_COST);
  const daysLeft = daysUntil(account.nextCreditGrantAt);

  return (
    <div className="soft-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">현재 플랜</p>
          <h2 className="mt-1 text-2xl font-black">{account.currentPlan}</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-lemon/25 text-ink">
          <CreditCard size={19} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5">
        <div className="flex items-end justify-between">
          <span className="text-sm text-muted">체험 크레딧 잔액</span>
          <strong className="text-2xl">{account.totalCreditBalance.toLocaleString()}</strong>
        </div>
        <div className="mt-3 h-3 rounded-lg bg-stone-100">
          <div className="h-3 rounded-lg bg-coral" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
          <span className="rounded-lg bg-wash px-3 py-2">다음 지급 D-{daysLeft}</span>
          <span className="rounded-lg bg-wash px-3 py-2">패키지 {possiblePackages}개 가능</span>
        </div>
        {account.totalCreditBalance < PACKAGE_CREDIT_COST ? (
          <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-sm font-bold text-coral">업로드 패키지 생성에 필요한 체험 크레딧 {PACKAGE_CREDIT_COST}보다 부족해요.</p>
        ) : null}
      </div>
    </div>
  );
}
