import { ArrowRight, CheckCircle2, Sparkles, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PackagePreview } from "@/components/PackagePreview";
import { subscriptionPlans } from "@/lib/plans";

const valueItems = [
  "피드, 스토리, 릴스 썸네일 문구를 한 번에 준비",
  "캡션 5개, 해시태그 20개, CTA와 후킹 문구 생성",
  "광고/협찬 표시 문구와 업로드 전 체크리스트 포함"
];

export default function LandingPage() {
  const summaryPlans = subscriptionPlans.filter((plan) => ["Free", "Creator Plus", "Business"].includes(plan.name));

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-wash text-ink">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral text-white shadow-lift">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-black leading-tight">PostKit</p>
            <p className="text-xs text-muted">SNS 업로드 패키지</p>
          </div>
        </div>
        <LinkButton className="px-3 sm:px-4" href="/dashboard" variant="secondary">
          대시보드
          <ArrowRight size={16} aria-hidden="true" />
        </LinkButton>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-muted shadow-soft">
            <UploadCloud size={16} aria-hidden="true" />
            <span className="min-w-0 break-keep">사진 업로드 → 목적 선택 → 생성</span>
          </div>
          <h1 className="max-w-3xl break-keep text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            사진만 넣으면 SNS 업로드 패키지 완성
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            피드, 스토리, 릴스 썸네일, 캡션, 해시태그까지 한 번에 생성하세요.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <LinkButton className="w-full sm:w-auto" href="/create">
              무료로 시작하기
              <ArrowRight size={17} aria-hidden="true" />
            </LinkButton>
            <LinkButton className="w-full sm:w-auto" href="/results" variant="secondary">
              샘플 생성 보기
            </LinkButton>
          </div>
          <div className="mt-8 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {valueItems.map((item) => (
              <div className="flex min-w-0 items-start gap-2 rounded-lg border border-line bg-white p-3 text-sm text-muted" key={item}>
                <CheckCircle2 className="mt-0.5 shrink-0 text-mint" size={17} aria-hidden="true" />
                <span className="min-w-0 break-keep">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:pt-6">
          <PackagePreview />
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="section-title">가격 요약</h2>
              <p className="mt-2 text-sm text-muted">업로드 패키지 1개는 30 크레딧을 사용합니다.</p>
            </div>
            <LinkButton href="/pricing" variant="soft">
              전체 플랜 보기
            </LinkButton>
          </div>
          <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-3">
            {summaryPlans.map((plan) => (
              <article className="min-w-0 rounded-lg border border-line bg-wash p-5" key={plan.name}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-coral">{plan.name}</p>
                  {plan.name === "Creator Plus" ? <Badge tone="coral">가장 인기</Badge> : null}
                </div>
                <h3 className="mt-2 text-2xl font-black">{plan.price}</h3>
                <p className="mt-2 text-sm text-muted">{plan.credits.toLocaleString()} 크레딧</p>
                <p className="mt-4 text-sm leading-6 text-muted">{plan.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
