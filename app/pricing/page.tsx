"use client";

import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { getCreditAccount, getCreditLedger } from "@/lib/creditStorage";
import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import { creditCosts, subscriptionPlans } from "@/lib/plans";
import { daysUntil } from "@/lib/subscription";
import type { CreditAccount, CreditLedgerEntry, CreditLedgerType } from "@/types";

type LedgerFilter = "all" | "grant" | "usage" | "refund";

const ledgerTypeLabels: Partial<Record<CreditLedgerType, string>> = {
  initial_grant: "지급",
  subscription_grant: "월 지급",
  rollover: "이월",
  generation_debit: "사용",
  generation_refund: "환불",
  credit_expiration: "만료",
  credit_purchase: "지급(이전 기록)",
  plan_upgrade: "플랜(이전 기록)",
  plan_downgrade: "플랜(이전 기록)"
};

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
    usage: ["generation_debit"],
    refund: ["generation_refund"]
  };

  return map[filter].includes(entry.type);
}

export default function PricingPage() {
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [filter, setFilter] = useState<LedgerFilter>("all");

  useEffect(() => {
    setAccount(getCreditAccount());
    setLedger(getCreditLedger());
  }, []);

  const totalBalance = account?.totalCreditBalance ?? 0;
  const packageCount = Math.floor(totalBalance / PACKAGE_CREDIT_COST);
  const filteredLedger = useMemo(
    () => ledger.filter((entry) => isFilterMatch(entry, filter)).slice(0, 20),
    [ledger, filter]
  );

  return (
    <AppShell>
      <PageHeader
        action={
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-muted shadow-soft">
            {account ? `체험 크레딧 ${totalBalance.toLocaleString()}` : "체험 크레딧 확인 중"}
          </div>
        }
        description="지금은 무료 공개 베타 기간이라 결제 없이 모든 기능을 체험 크레딧으로 사용할 수 있습니다. 유료 플랜은 결제 연동 후 제공됩니다."
        eyebrow="Plan"
        title="플랜과 체험 크레딧"
      />

      <div className="mt-5 rounded-lg border border-mint/30 bg-aqua p-4 text-sm leading-6 text-emerald-800">
        무료 공개 베타에서는 실제 결제가 발생하지 않으며, 크레딧은 구매할 수 없는 체험용 생성 횟수입니다.
        모든 이미지·영상 결과물에는 Made with PostKit 워터마크가 표시됩니다.
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-bold text-muted">현재 플랜</p>
          <h2 className="mt-2 text-2xl font-black">무료 공개 베타</h2>
          <p className="mt-2 text-sm text-muted">
            {account
              ? `다음 체험 크레딧 지급일: ${formatDate(account.nextCreditGrantAt)} · D-${daysUntil(account.nextCreditGrantAt)}`
              : "지급 일정을 불러오는 중입니다."}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted">체험 크레딧 잔액</p>
          <h2 className="mt-2 text-2xl font-black">{account ? totalBalance.toLocaleString() : "—"}</h2>
          <p className="mt-2 text-sm text-muted">매달 자동으로 다시 지급되며, 결제 수단 등록이 필요 없습니다.</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted">생성 가능 패키지</p>
          <h2 className="mt-2 text-2xl font-black">{account ? `${packageCount}개` : "—"}</h2>
          <p className="mt-2 text-sm text-muted">업로드 패키지 1개에 {PACKAGE_CREDIT_COST} 크레딧이 사용됩니다.</p>
        </Card>
      </section>

      <Card className="mt-6">
        <h2 className="text-xl font-black">베타에서 사용되는 크레딧</h2>
        <p className="mt-1 text-sm leading-6 text-muted">아래 항목 외에는 크레딧이 차감되지 않습니다.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {creditCosts.map((cost) => (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-wash px-3 py-2 text-sm" key={cost.label}>
              <span className="min-w-0 break-keep font-semibold">{cost.label}</span>
              <strong className="shrink-0">{cost.credits}</strong>
            </div>
          ))}
        </div>
        <LinkButton className="mt-5" href="/create" variant="primary">
          <Sparkles size={17} aria-hidden="true" />
          지금 만들러 가기
        </LinkButton>
      </Card>

      <section className="mt-6">
        <h2 className="text-xl font-black">출시 예정 유료 플랜</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          결제와 계정 연동이 준비되면 아래 플랜을 선택할 수 있습니다. 지금은 신청이나 결제가 불가능합니다.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {subscriptionPlans
            .filter((plan) => plan.availability === "coming_soon")
            .map((plan) => (
              <article
                className={`rounded-lg border bg-white p-5 opacity-90 shadow-soft ${
                  plan.highlighted ? "border-coral/50" : "border-line"
                }`}
                key={plan.name}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-coral">{plan.name}</p>
                    <h3 className="mt-2 text-2xl font-black">{plan.price}</h3>
                  </div>
                  <Badge tone="lemon">준비 중</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-wash px-3 py-2 text-sm">
                  <span className="text-muted">월 크레딧</span>
                  <strong>{plan.credits.toLocaleString()}</strong>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-muted">{plan.description}</p>
                <p className="mt-2 text-sm font-bold text-ink">{plan.recommendedFor}</p>
                <Button className="mt-5 w-full" disabled type="button" variant="secondary">
                  <Clock3 size={17} aria-hidden="true" />
                  출시 준비 중
                </Button>
              </article>
            ))}
        </div>
      </section>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">체험 크레딧 사용 내역</h2>
            <p className="mt-1 text-sm text-muted">지급, 사용, 환불 내역이 이 브라우저에 기록됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "전체"],
                ["grant", "지급"],
                ["usage", "사용"],
                ["refund", "환불"]
              ] as Array<[LedgerFilter, string]>
            ).map(([value, label]) => (
              <Button
                className="min-h-9 px-3 py-1.5"
                key={value}
                onClick={() => setFilter(value)}
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
                      <Badge tone={entry.amount >= 0 ? "mint" : "coral"}>
                        {entry.amount >= 0 ? "+" : ""}
                        {entry.amount.toLocaleString()}
                      </Badge>
                      <Badge>{ledgerTypeLabels[entry.type] ?? "기록"}</Badge>
                    </div>
                    <p className="mt-2 font-bold">{entry.description}</p>
                    <p className="mt-1 text-sm text-muted">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-muted sm:text-right">
                    <CheckCircle2 className="text-mint sm:hidden" size={16} aria-hidden="true" />
                    <p>잔액 {entry.balanceAfter.toLocaleString()}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center text-sm text-muted">
              아직 사용 내역이 없습니다. 첫 업로드 패키지를 만들어 보세요.
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
