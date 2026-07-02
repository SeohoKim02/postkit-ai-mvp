"use client";

import { CalendarDays, Download, PackageCheck, Share2, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreditMeter } from "@/components/CreditMeter";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { getContentSchedules } from "@/lib/calendarStorage";
import { getDashboardTodoSummary } from "@/lib/calendarUtils";
import { getCampaigns } from "@/lib/campaignStorage";
import { PACKAGE_CREDIT_COST } from "@/lib/credits";
import { getCreditAccount } from "@/lib/creditStorage";
import { getExportHistory } from "@/lib/exportStorage";
import { syncNotifications } from "@/lib/notificationStorage";
import {
  captionLengthLabel,
  getLearningActionCount,
  getPersonalizationLevel,
  getTopCaptionLength,
  getTopPlatform,
  getTopPurpose,
  getTopStyle
} from "@/lib/personalization";
import { getHistory, getPersonalizationProfile, saveCurrentResult, savePrefill } from "@/lib/storage";
import type { Campaign, ContentSchedule, CreateFormInput, CreditAccount, ExportHistoryEntry, HistoryItem, PersonalizationProfile, PostKitNotification } from "@/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();
  const [creditAccount, setCreditAccount] = useState<CreditAccount>(() => getCreditAccount({ applyMonthlyGrant: false }));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [notifications, setNotifications] = useState<PostKitNotification[]>([]);
  const [personalization, setPersonalization] = useState<PersonalizationProfile | null>(null);

  useEffect(() => {
    const nextSchedules = getContentSchedules();
    const nextCampaigns = getCampaigns();
    setCreditAccount(getCreditAccount());
    setHistory(getHistory());
    setExportHistory(getExportHistory());
    setSchedules(nextSchedules);
    setCampaigns(nextCampaigns);
    setNotifications(syncNotifications(nextSchedules, nextCampaigns));
    setPersonalization(getPersonalizationProfile());
  }, []);

  const recent = history.slice(0, 3);
  const possiblePackages = Math.floor(creditAccount.totalCreditBalance / PACKAGE_CREDIT_COST);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyGenerations = history.filter((item) => {
    const createdAt = new Date(item.createdAt);
    return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
  }).length;
  const monthlyExports = exportHistory.filter((entry) => {
    const exportedAt = new Date(entry.exportedAt);
    return exportedAt.getMonth() === currentMonth && exportedAt.getFullYear() === currentYear;
  });
  const monthlyDownloads = monthlyExports.filter((entry) => entry.exportType === "single_download" || entry.exportType === "full_download").length;
  const monthlyShares = monthlyExports.filter((entry) => entry.exportType === "web_share").length;
  const mostExportedPlatform =
    Object.entries(
      monthlyExports.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.platform] = (counts[entry.platform] ?? 0) + 1;
        return counts;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "아직 없음";
  const recentExports = exportHistory.slice(0, 3);
  const todoSummary = getDashboardTodoSummary(schedules, campaigns);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  function handleOpen(item: HistoryItem) {
    saveCurrentResult(item.package);
    router.push("/results");
  }

  function handleOpenExport(entry: ExportHistoryEntry) {
    const item = history.find((historyItem) => historyItem.id === entry.contentId);
    if (item) {
      saveCurrentResult(item.package);
    }
    router.push("/export");
  }

  function handleCreateWithStyle() {
    if (!personalization) return;
    const prefill: CreateFormInput = {
      platform: getTopPlatform(personalization),
      purpose: getTopPurpose(personalization),
      style: getTopStyle(personalization),
      productName: "",
      requiredKeywords: personalization.requiredPhrases.join(", "),
      bannedKeywords: personalization.bannedPhrases.join(", "),
      sponsorDisclosure: personalization.accountType === "광고/제휴 계정" ? "ad" : "none"
    };
    savePrefill(prefill);
    router.push("/create");
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <LinkButton className="w-full sm:w-auto" href="/create">
            <Zap size={17} aria-hidden="true" />
            새 게시물 만들기
          </LinkButton>
        }
        description="플랜, 크레딧, 최근 생성 기록을 한 화면에서 확인하세요."
        eyebrow="Dashboard"
        title="오늘 만들 업로드 패키지"
      />

      <div className="mt-5 min-w-0 rounded-lg border border-coral/20 bg-blush p-4 shadow-soft">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-coral">빠른 시작</p>
            <p className="mt-1 text-sm leading-6 text-muted">사진을 넣고 목적과 스타일만 고르면 바로 생성할 수 있습니다.</p>
          </div>
        </div>
      </div>

      <section className="mt-6 min-w-0 rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-keep text-lg font-black">오늘 할 일</h2>
            <p className="mt-1 break-keep text-sm leading-6 text-muted">게시 예정, 마감 임박, 검토 대기, 내보내기 준비가 필요한 항목을 모았습니다.</p>
          </div>
          <Badge tone={unreadNotifications > 0 ? "coral" : "mint"}>{unreadNotifications}개 알림</Badge>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="min-w-0 rounded-lg bg-wash p-3"><p className="break-keep text-xs font-black text-muted">오늘 게시 예정</p><p className="mt-1 text-xl font-black">{todoSummary.todaySchedules.length}</p></div>
          <div className="min-w-0 rounded-lg bg-wash p-3"><p className="break-keep text-xs font-black text-muted">마감 임박 캠페인</p><p className="mt-1 text-xl font-black">{todoSummary.deadlineSoonCampaigns.length}</p></div>
          <div className="min-w-0 rounded-lg bg-wash p-3"><p className="break-keep text-xs font-black text-muted">작성 중</p><p className="mt-1 text-xl font-black">{todoSummary.draftSchedules.length}</p></div>
          <div className="min-w-0 rounded-lg bg-wash p-3"><p className="break-keep text-xs font-black text-muted">검토 필요</p><p className="mt-1 text-xl font-black">{todoSummary.reviewSchedules.length}</p></div>
          <div className="min-w-0 rounded-lg bg-wash p-3"><p className="break-keep text-xs font-black text-muted">내보내기 준비</p><p className="mt-1 text-xl font-black">{todoSummary.exportReadySchedules.length}</p></div>
          <div className="min-w-0 rounded-lg bg-wash p-3"><p className="break-keep text-xs font-black text-muted">기한 초과</p><p className="mt-1 text-xl font-black">{todoSummary.overdueSchedules.length}</p></div>
        </div>
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap sm:[&>*]:w-auto [&>*]:w-full">
          <LinkButton href="/create" variant="soft">오늘 게시물 만들기</LinkButton>
          <LinkButton href="/calendar" variant="secondary">일정 확인</LinkButton>
          <LinkButton href="/campaigns" variant="secondary">캠페인 확인</LinkButton>
          <LinkButton href="/export" variant="secondary">최근 콘텐츠 내보내기</LinkButton>
        </div>
      </section>

      <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <CreditMeter account={creditAccount} />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            helper="mock localStorage 기준으로 집계됩니다."
            icon={PackageCheck}
            title="이번 달 생성 횟수"
            value={`${monthlyGenerations}회`}
          />
          <StatCard
            helper="최근 생성 결과는 히스토리에서 다시 볼 수 있습니다."
            icon={TrendingUp}
            title="최근 콘텐츠"
            value={`${history.length}개`}
          />
          <StatCard
            helper={`구독 ${creditAccount.subscriptionCreditBalance.toLocaleString()} · 구매 ${creditAccount.purchasedCreditBalance.toLocaleString()}`}
            icon={Zap}
            title="생성 가능 패키지"
            value={`${possiblePackages}개`}
          />
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm leading-6 text-muted">
          업로드 패키지는 {PACKAGE_CREDIT_COST} 크레딧입니다. 구독 크레딧을 먼저 사용하고 부족한 만큼 구매 크레딧을 사용합니다.
        </p>
        <LinkButton className="w-full sm:w-auto" href="/pricing" variant="secondary">
          크레딧 관리
        </LinkButton>
      </div>

      <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="soft-card p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">최근 생성 콘텐츠</h2>
              <p className="mt-1 text-sm text-muted">바로 복사하거나 같은 입력으로 다시 만들 수 있어요.</p>
            </div>
            <LinkButton href="/history" variant="secondary">
              전체 보기
            </LinkButton>
          </div>
          <div className="mt-5 space-y-3">
            {recent.length > 0 ? (
              recent.map((item) => (
                <article className="rounded-lg border border-line bg-wash p-4" key={item.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold">{item.package.title}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="sky">{item.package.platform}</Badge>
                        <Badge tone="mint">{item.package.purpose}</Badge>
                        <Badge tone="lemon">{item.package.usedCredits} 크레딧</Badge>
                        <Badge>{formatDate(item.createdAt)}</Badge>
                      </div>
                    </div>
                    <Button className="w-full sm:w-auto" onClick={() => handleOpen(item)} type="button" variant="secondary">
                      열기
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-wash p-6 text-center">
                <Sparkles className="mx-auto text-coral" size={28} aria-hidden="true" />
                <p className="mt-3 font-bold">아직 생성한 콘텐츠가 없습니다.</p>
                <p className="mt-1 text-sm text-muted">사진을 넣고 첫 업로드 패키지를 만들어보세요.</p>
              </div>
            )}
          </div>
        </section>

        <div className="min-w-0 space-y-4">
        {personalization ? (
          <section className="rounded-lg border border-mint/30 bg-aqua p-5 shadow-soft">
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles size={18} aria-hidden="true" />
              <p className="text-sm font-bold">내 스타일 학습</p>
            </div>
            <h2 className="mt-4 text-2xl font-black">{getTopStyle(personalization)}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="mint">{getPersonalizationLevel(personalization)}</Badge>
              <Badge>{captionLengthLabel(getTopCaptionLength(personalization))}</Badge>
              <Badge tone="sky">{getLearningActionCount(personalization)}개 행동</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              최근 학습된 플랫폼은 {getTopPlatform(personalization)}이고, 이 스타일을 기본값으로 새 게시물을 만들 수 있습니다.
            </p>
            <Button className="mt-5 w-full" onClick={handleCreateWithStyle} type="button" variant="secondary">
              내 스타일 입력값 적용
            </Button>
          </section>
        ) : null}

        <section className="rounded-lg border border-coral/20 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-coral">
            <CalendarDays size={18} aria-hidden="true" />
            <p className="text-sm font-bold">오늘 추천 게시물</p>
          </div>
          <h2 className="mt-5 text-2xl font-black">후기형 릴스 썸네일 + 저장 유도 캡션</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            이번 주는 짧은 리뷰형 문구가 반응을 만들기 좋습니다. 첫 2초 후킹 문구와 썸네일 문구를 같이
            생성해보세요.
          </p>
          <LinkButton className="mt-6" href="/create" variant="soft">
            추천대로 만들기
          </LinkButton>
        </section>

        <section className="rounded-lg border border-sky/20 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sky">
            <Share2 size={18} aria-hidden="true" />
            <p className="text-sm font-bold">내보내기 요약</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-lg bg-wash p-3">
              <p className="text-xs font-black text-muted">이번 달 다운로드</p>
              <p className="mt-1 text-xl font-black">{monthlyDownloads}회</p>
            </div>
            <div className="rounded-lg bg-wash p-3">
              <p className="text-xs font-black text-muted">SNS 공유 준비</p>
              <p className="mt-1 text-xl font-black">{monthlyShares}회</p>
            </div>
            <div className="rounded-lg bg-wash p-3">
              <p className="text-xs font-black text-muted">자주 내보낸 플랫폼</p>
              <p className="mt-1 truncate text-sm font-black">{mostExportedPlatform}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {recentExports.length > 0 ? (
              recentExports.map((entry) => (
                <button
                  className="w-full rounded-lg border border-line bg-wash p-3 text-left transition hover:border-sky/50 hover:bg-sky/5"
                  key={entry.exportId}
                  onClick={() => handleOpenExport(entry)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black">{entry.platform}</span>
                    <Badge tone={entry.status === "failed" ? "lemon" : "sky"}>{entry.exportType}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatDate(entry.exportedAt)} · 크레딧 추가 차감 없음</p>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-wash p-4 text-sm leading-6 text-muted">
                아직 내보낸 콘텐츠가 없어요. 결과 화면에서 다운로드 또는 SNS 공유 준비를 시작할 수 있습니다.
              </div>
            )}
          </div>
          <LinkButton className="mt-4 w-full" href="/export" variant="secondary">
            <Download size={17} aria-hidden="true" />
            최근 콘텐츠 다시 내보내기
          </LinkButton>
        </section>
        </div>
      </div>
    </AppShell>
  );
}
