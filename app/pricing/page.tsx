"use client";

import { CheckCircle2, CreditCard, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getCreditAccount,
  getCreditLedger,
  mockChangePlan,
  mockPurchaseCredits
} from "@/lib/creditStorage";
import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import { creditCosts, creditPacks, subscriptionPlans } from "@/lib/plans";
import { daysUntil, getPlanByName } from "@/lib/subscription";
import type { CreditAccount, CreditLedgerEntry, CreditLedgerType, CreditPack, SubscriptionPlan } from "@/types";

type LedgerFilter = "all" | "grant" | "purchase" | "usage" | "refund" | "expiration" | "plan";

function perCredit(priceWon: number, credits: number) {
  if (priceWon === 0) {
    return "무료";
  }

  return `약 ${Math.round(priceWon / credits).toLocaleString()}원/크레딧`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isFilterMatch(entry: CreditLedgerEntry, filter: LedgerFilter) {
  if (filter === "all") {
    return true;
  }

  const map: Record<Exclude<LedgerFilter, "all">, CreditLedgerType[]> = {
    grant: ["initial_grant", "subscription_grant", "rollover"],
    purchase: ["credit_purchase"],
    usage: ["generation_debit"],
    refund: ["generation_refund"],
    expiration: ["credit_expiration"],
    plan: ["plan_upgrade", "plan_downgrade"]
  };

  return map[filter].includes(entry.type);
}

export default function PricingPage() {
  const [account, setAccount] = useState<CreditAccount>(() => getCreditAccount({ applyMonthlyGrant: false }));
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<LedgerFilter>("all");

  function refresh() {
    setAccount(getCreditAccount());
    setLedger(getCreditLedger());
  }

  useEffect(() => {
    refresh();
  }, []);

  const packageCount = Math.floor(account.totalCreditBalance / PACKAGE_CREDIT_COST);
  const monthlyUsed = ledger
    .filter((entry) => entry.type === "generation_debit" && new Date(entry.createdAt).getTime() >= new Date(account.billingCycleStartedAt).getTime())
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const filteredLedger = useMemo(() => ledger.filter((entry) => isFilterMatch(entry, filter)).slice(0, 20), [ledger, filter]);

  function handlePlanConfirm() {
    if (!selectedPlan) return;
    const result = mockChangePlan(selectedPlan.name);
    setMessage(result.message);
    setSelectedPlan(null);
    refresh();
  }

  function handlePackConfirm() {
    if (!selectedPack) return;
    const result = mockPurchaseCredits(selectedPack.credits);
    setMessage(result.message);
    setSelectedPack(null);
    refresh();
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-muted shadow-soft">
            현재 {account.currentPlan} · {account.totalCreditBalance.toLocaleString()} 크레딧
          </div>
        }
        description="실제 결제 없이 mock 상태로 플랜과 추가 크레딧을 적용합니다."
        eyebrow="Credits & Pricing"
        title="크레딧과 구독 플랜"
      />

      <div className="mt-5 rounded-lg border border-mint/30 bg-aqua p-4 text-sm leading-6 text-emerald-800">
        현재는 테스트용 mock 구매이며 실제 결제되지 않습니다. 구독 크레딧은 먼저 사용되고, 부족한 만큼 구매 크레딧이 사용됩니다.
      </div>

      {message ? (
        <div className="mt-5 rounded-lg border border-coral/20 bg-blush p-3 text-sm font-bold text-coral">
          {message}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-bold text-muted">현재 플랜</p>
          <h2 className="mt-2 text-2xl font-black">{account.currentPlan}</h2>
          <p className="mt-2 text-sm text-muted">다음 월 크레딧 지급일: {formatDate(account.nextCreditGrantAt)} · D-{daysUntil(account.nextCreditGrantAt)}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted">크레딧 잔액</p>
          <h2 className="mt-2 text-2xl font-black">{account.totalCreditBalance.toLocaleString()}</h2>
          <p className="mt-2 text-sm text-muted">
            구독 {account.subscriptionCreditBalance.toLocaleString()} · 구매 {account.purchasedCreditBalance.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted">생성 가능 패키지</p>
          <h2 className="mt-2 text-2xl font-black">{packageCount}개</h2>
          <p className="mt-2 text-sm text-muted">이번 달 사용량 기준: {monthlyUsed.toLocaleString()} 크레딧</p>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {subscriptionPlans.map((plan) => {
          const selected = account.currentPlan === plan.name;
          const scheduled = account.scheduledPlanChange?.planName === plan.name;

          return (
            <article
              className={`rounded-lg border bg-white p-5 shadow-soft ${
                plan.highlighted ? "border-coral bg-blush/30" : "border-line"
              }`}
              key={plan.name}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-coral">{plan.name}</p>
                  <h2 className="mt-2 text-2xl font-black">{plan.price}</h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {plan.highlighted ? <Badge tone="coral">가장 인기</Badge> : null}
                  {selected ? <CheckCircle2 className="text-mint" size={22} aria-hidden="true" /> : null}
                  {scheduled ? <Badge tone="lemon">예약됨</Badge> : null}
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-wash px-3 py-2">
                  <span className="text-muted">월 크레딧</span>
                  <strong>{plan.credits.toLocaleString()}</strong>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-wash px-3 py-2">
                  <span className="text-muted">단가</span>
                  <strong>{perCredit(plan.priceWon, plan.credits)}</strong>
                </div>
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-muted">{plan.description}</p>
              <p className="mt-2 text-sm font-bold text-ink">{plan.recommendedFor}</p>
              <Button
                className="mt-5 w-full"
                disabled={selected}
                onClick={() => setSelectedPlan(plan)}
                type="button"
                variant={selected ? "secondary" : "primary"}
              >
                <CreditCard size={17} aria-hidden="true" />
                {selected ? "현재 이용 중" : "플랜 변경 mock"}
              </Button>
            </article>
          );
        })}
      </section>

      <Card className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">추가 크레딧</h2>
            <p className="mt-1 text-sm text-muted">테스트용 mock 구매이며 실제 결제되지 않습니다.</p>
          </div>
          <Badge tone="mint">구매 크레딧은 월 초기화로 삭제되지 않음</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {creditPacks.map((pack) => (
            <article className="rounded-lg border border-line bg-wash p-4" key={pack.credits}>
              <p className="text-lg font-black">{pack.credits.toLocaleString()} 크레딧</p>
              <p className="mt-1 text-sm text-muted">{pack.price}</p>
              <p className="mt-2 text-xs font-bold text-muted">{perCredit(pack.priceWon, pack.credits)}</p>
              <Button className="mt-4 w-full" onClick={() => setSelectedPack(pack)} type="button" variant="secondary">
                <Plus size={16} aria-hidden="true" />
                mock 구매
              </Button>
            </article>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">최근 크레딧 원장</h2>
            <p className="mt-1 text-sm text-muted">모든 지급, 구매, 사용, 환불, 만료, 플랜 변경이 기록됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "전체"],
              ["grant", "지급"],
              ["purchase", "구매"],
              ["usage", "사용"],
              ["refund", "환불"],
              ["expiration", "만료"],
              ["plan", "플랜 변경"]
            ].map(([value, label]) => (
              <Button
                className="min-h-9 px-3 py-1.5"
                key={value}
                onClick={() => setFilter(value as LedgerFilter)}
                type="button"
                variant={filter === value ? "primary" : "secondary"}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {filteredLedger.length > 0 ? (
            filteredLedger.map((entry) => (
              <article className="rounded-lg border border-line bg-wash p-4" key={entry.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={entry.amount >= 0 ? "mint" : "coral"}>{entry.amount >= 0 ? "+" : ""}{entry.amount.toLocaleString()}</Badge>
                      <Badge>{entry.type}</Badge>
                      {entry.relatedPlan ? <Badge tone="sky">{entry.relatedPlan}</Badge> : null}
                    </div>
                    <p className="mt-2 font-bold">{entry.description}</p>
                    <p className="mt-1 text-sm text-muted">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-sm font-bold text-muted sm:text-right">
                    <p>사용 후 총 {entry.balanceAfter.toLocaleString()}</p>
                    <p>구독 {entry.subscriptionBalanceAfter.toLocaleString()} · 구매 {entry.purchasedBalanceAfter.toLocaleString()}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center text-sm text-muted">
              표시할 원장 내역이 없습니다.
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-xl font-black">생성 기능별 크레딧</h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {creditCosts.map((cost) => (
            <div className="flex items-center justify-between rounded-lg bg-wash px-3 py-2 text-sm" key={cost.label}>
              <span className="font-semibold">{cost.label}</span>
              <strong>{cost.credits}</strong>
            </div>
          ))}
        </div>
      </Card>

      {selectedPlan ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/25 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-coral">플랜 변경 확인</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPlan.name}</h2>
              </div>
              <button className="rounded-lg p-2 text-muted hover:bg-wash" onClick={() => setSelectedPlan(null)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              현재 결제 연동 없이 mock으로 처리됩니다. 업그레이드는 즉시 적용하고 차액 크레딧을 지급하며, 다운그레이드는 다음 지급일부터 예약됩니다.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setSelectedPlan(null)} type="button" variant="secondary">취소</Button>
              <Button onClick={handlePlanConfirm} type="button">mock 변경 확인</Button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPack ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/25 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-coral">추가 크레딧 mock 구매</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPack.credits.toLocaleString()} 크레딧</h2>
              </div>
              <button className="rounded-lg p-2 text-muted hover:bg-wash" onClick={() => setSelectedPack(null)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              가격은 {selectedPack.price}이지만 현재는 테스트용 mock 구매이며 실제 결제되지 않습니다.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setSelectedPack(null)} type="button" variant="secondary">취소</Button>
              <Button onClick={handlePackConfirm} type="button">mock 구매 확인</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
