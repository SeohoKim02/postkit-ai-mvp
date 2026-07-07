"use client";

import { CalendarDays, CheckCircle2, Copy, Download, Edit3, Palette, Plus, Repeat, Send, Sparkles, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildScheduleChecklist,
  calendarStatuses,
  calendarViewModes,
  createCalendarId,
  formatLocalDateTime,
  getDayLabel,
  getScheduleDisplayStatus,
  getScheduleLearningNote,
  isScheduleOverdue,
  repeatOptions,
  toDateInputValue,
  toTimeInputValue
} from "@/lib/calendarUtils";
import {
  addContentSchedule,
  createDefaultIdea,
  createDefaultSchedule,
  createScheduleFromForm,
  deleteContentIdea,
  deleteContentSchedule,
  deleteFutureSchedules,
  getCalendarPreferences,
  getContentIdeas,
  getContentSchedules,
  ideaToPrefill,
  ideaToSchedule,
  markSchedulePublished,
  saveCalendarPreferences,
  scheduleToPrefill,
  updateContentSchedule,
  upsertContentIdea
} from "@/lib/calendarStorage";
import { linkCampaignSchedule, getCampaigns } from "@/lib/campaignStorage";
import { getPurposeLabel } from "@/lib/constants";
import { getExportHistory } from "@/lib/exportStorage";
import { composeFullUploadText } from "@/lib/exportUtils";
import { getHistory, saveCurrentResult, savePrefill, updatePersonalizationProfile } from "@/lib/storage";
import { isVideoPreferredPlatform } from "@/lib/video/videoPresets";
import type {
  CalendarPreferences,
  CalendarViewMode,
  Campaign,
  ContentIdea,
  ContentSchedule,
  ContentScheduleStatus,
  ExportHistoryEntry,
  HistoryItem,
  Platform,
  Purpose,
  RepeatOption
} from "@/types";

type ScheduleFormState = {
  id?: string;
  title: string;
  platform: Platform;
  purpose: Purpose;
  date: string;
  time: string;
  brandName: string;
  campaignId: string;
  campaignName: string;
  productName: string;
  status: ContentScheduleStatus;
  isSponsored: boolean;
  requiredKeywords: string;
  bannedKeywords: string;
  requiredHashtags: string;
  disclosureStyle: string;
  discountCode: string;
  linkGuide: string;
  internalMemo: string;
  linkedContentId: string;
  linkedExportId: string;
  repeatOption: RepeatOption;
  repeatCount: number;
};

const platforms: Platform[] = ["Instagram Feed", "Instagram Story", "Instagram Reels", "TikTok", "YouTube Shorts", "Facebook", "X"];
const purposes: Purpose[] = ["Personal Post", "Sponsored Post", "Product Promotion", "New Arrival", "Discount Event", "Review Post"];

function scheduleToForm(schedule: ContentSchedule): ScheduleFormState {
  return {
    id: schedule.id,
    title: schedule.title,
    platform: schedule.platform,
    purpose: schedule.purpose,
    date: toDateInputValue(schedule.scheduledAt),
    time: toTimeInputValue(schedule.scheduledAt),
    brandName: schedule.brandName,
    campaignId: schedule.campaignId ?? "",
    campaignName: schedule.campaignName ?? "",
    productName: schedule.productName,
    status: schedule.status,
    isSponsored: schedule.isSponsored,
    requiredKeywords: schedule.requiredKeywords.join(", "),
    bannedKeywords: schedule.bannedKeywords.join(", "),
    requiredHashtags: schedule.requiredHashtags.join(" "),
    disclosureStyle: schedule.disclosureStyle,
    discountCode: schedule.discountCode ?? "",
    linkGuide: schedule.linkGuide ?? "",
    internalMemo: schedule.internalMemo ?? "",
    linkedContentId: schedule.linkedContentId ?? "",
    linkedExportId: schedule.linkedExportIds[0] ?? "",
    repeatOption: schedule.repeatOption,
    repeatCount: 1
  };
}

function emptyForm(): ScheduleFormState {
  return scheduleToForm(createDefaultSchedule());
}

function statusTone(status: ContentScheduleStatus) {
  if (status === "게시 완료") return "mint";
  if (status === "기한 초과") return "coral";
  if (status === "검토 필요") return "lemon";
  if (status === "게시 준비 완료" || status === "게시 예정") return "sky";
  return "neutral";
}

function sameLocalDay(a: string, b: Date) {
  const date = new Date(a);
  return date.getFullYear() === b.getFullYear() && date.getMonth() === b.getMonth() && date.getDate() === b.getDate();
}

function safeInputDate(value: string, fallback: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export default function CalendarPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [exports, setExports] = useState<ExportHistoryEntry[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [preferences, setPreferences] = useState<CalendarPreferences>(() => getCalendarPreferences());
  const [form, setForm] = useState<ScheduleFormState>(() => emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContentSchedule | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState({ publishedAt: "", publishedUrl: "", actualCaption: "", publishMemo: "" });
  const [ideaForm, setIdeaForm] = useState<ContentIdea>(() => createDefaultIdea());
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setSchedules(getContentSchedules());
    setCampaigns(getCampaigns());
    setHistory(getHistory());
    setExports(getExportHistory());
    setIdeas(getContentIdeas());
    setPreferences(getCalendarPreferences());
  }, []);

  const selectedDate = new Date(preferences.selectedDate);
  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const status = getScheduleDisplayStatus(schedule);
      if (preferences.platform && preferences.platform !== "전체" && schedule.platform !== preferences.platform) return false;
      if (preferences.status && preferences.status !== "전체" && status !== preferences.status) return false;
      if (preferences.campaignId && preferences.campaignId !== "전체" && schedule.campaignId !== preferences.campaignId) return false;
      if (preferences.brandName && !schedule.brandName.toLowerCase().includes(preferences.brandName.toLowerCase())) return false;
      if (preferences.sponsoredOnly && !schedule.isSponsored) return false;
      if (preferences.overdueOnly && !isScheduleOverdue(schedule)) return false;
      return true;
    });
  }, [preferences, schedules]);

  const sortedSchedules = [...filteredSchedules].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const learningNote = getScheduleLearningNote(schedules);

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function refresh() {
    setSchedules(getContentSchedules());
    setCampaigns(getCampaigns());
    setHistory(getHistory());
    setExports(getExportHistory());
    setIdeas(getContentIdeas());
  }

  function updatePreferences(next: Partial<CalendarPreferences>) {
    const merged = { ...preferences, ...next, lastUpdatedAt: new Date().toISOString() };
    setPreferences(merged);
    saveCalendarPreferences(merged);
  }

  function updateForm<K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyCampaign(campaignId: string) {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      setForm((current) => ({ ...current, campaignId: "", campaignName: "" }));
      return;
    }

    setForm((current) => ({
      ...current,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      brandName: campaign.brandName,
      productName: campaign.productName,
      purpose: campaign.campaignType === "일반 콘텐츠" ? "Product Promotion" : "Sponsored Post",
      isSponsored: campaign.campaignType !== "일반 콘텐츠" && campaign.campaignType !== "자체 제품 홍보",
      requiredKeywords: campaign.requiredKeywords.join(", "),
      bannedKeywords: campaign.bannedKeywords.join(", "),
      requiredHashtags: campaign.requiredHashtags.join(" "),
      disclosureStyle: campaign.disclosureStyle,
      discountCode: campaign.discountCode ?? "",
      linkGuide: campaign.landingUrl ? "프로필 링크 또는 상세 링크 안내 포함" : current.linkGuide
    }));
  }

  function learnSchedule(schedule: ContentSchedule) {
    updatePersonalizationProfile((profile) => ({
      ...profile,
      preferredPlatforms: [schedule.platform, ...profile.preferredPlatforms.filter((item) => item !== schedule.platform)].slice(0, 5),
      preferredPurposes: [schedule.purpose, ...profile.preferredPurposes.filter((item) => item !== schedule.purpose)].slice(0, 6),
      scores: {
        ...profile.scores,
        platforms: {
          ...profile.scores.platforms,
          [schedule.platform]: Number(profile.scores.platforms[schedule.platform] ?? 0) + 0.5
        },
        purposes: {
          ...profile.scores.purposes,
          [schedule.purpose]: Number(profile.scores.purposes[schedule.purpose] ?? 0) + 0.5
        },
        tones: {
          ...profile.scores.tones,
          [`예약:${getDayLabel(schedule.scheduledAt)}:${new Date(schedule.scheduledAt).getHours()}시`]:
            Number(profile.scores.tones[`예약:${getDayLabel(schedule.scheduledAt)}:${new Date(schedule.scheduledAt).getHours()}시`] ?? 0) + 0.25
        }
      },
      lastUpdatedAt: new Date().toISOString()
    }));
  }

  function saveSchedule() {
    const baseSchedule = createScheduleFromForm({
      ...form,
      campaignId: form.campaignId || undefined,
      campaignName: form.campaignName || undefined,
      linkedContentId: form.linkedContentId || undefined
    });
    const schedule = {
      ...baseSchedule,
      linkedExportIds: form.linkedExportId ? [form.linkedExportId, ...baseSchedule.linkedExportIds] : baseSchedule.linkedExportIds
    };
    const existing = schedules.find((item) => item.id === schedule.id);
    if (existing) {
      updateContentSchedule({
        ...existing,
        ...schedule,
        repeatGroupId: existing.repeatGroupId,
        linkedExportIds: Array.from(new Set([...schedule.linkedExportIds, ...existing.linkedExportIds]))
      });
    } else {
      const created = addContentSchedule(schedule, form.repeatCount);
      created.forEach((item) => {
        if (item.campaignId) linkCampaignSchedule(item.campaignId, item.id);
      });
    }
    learnSchedule(schedule);
    setShowForm(false);
    setForm(emptyForm());
    refresh();
    flash("일정을 저장했어요. 일정 관리에는 크레딧을 사용하지 않습니다.");
  }

  function editSchedule(schedule: ContentSchedule) {
    setForm(scheduleToForm(schedule));
    setShowForm(true);
  }

  function duplicateSchedule(schedule: ContentSchedule) {
    const next = {
      ...schedule,
      id: createCalendarId("schedule"),
      title: `${schedule.title} 복제본`,
      status: "아이디어" as ContentScheduleStatus,
      repeatOption: "none" as RepeatOption,
      repeatGroupId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addContentSchedule(next);
    refresh();
    flash("일정을 복제했어요.");
  }

  function startCreateFromSchedule(schedule: ContentSchedule) {
    savePrefill(scheduleToPrefill(schedule));
    router.push("/create");
  }

  function openResult(schedule: ContentSchedule) {
    const item = history.find((historyItem) => historyItem.id === schedule.linkedContentId);
    if (!item) {
      flash("연결된 생성 콘텐츠가 없어요.");
      return;
    }

    saveCurrentResult({ ...item.package, scheduleId: schedule.id, campaignId: schedule.campaignId, campaignName: schedule.campaignName, brandName: schedule.brandName });
    router.push("/results");
  }

  function openExport(schedule: ContentSchedule) {
    const item = history.find((historyItem) => historyItem.id === schedule.linkedContentId);
    if (!item) {
      flash("내보낼 생성 콘텐츠를 먼저 연결해 주세요.");
      return;
    }

    saveCurrentResult({ ...item.package, scheduleId: schedule.id, campaignId: schedule.campaignId, campaignName: schedule.campaignName, brandName: schedule.brandName });
    router.push("/export");
  }

  function openStudio(schedule: ContentSchedule) {
    const item = history.find((historyItem) => historyItem.id === schedule.linkedContentId);
    if (!item) {
      flash("디자인할 생성 콘텐츠를 먼저 연결해 주세요.");
      return;
    }

    saveCurrentResult({ ...item.package, scheduleId: schedule.id, campaignId: schedule.campaignId, campaignName: schedule.campaignName, brandName: schedule.brandName });
    router.push("/studio");
  }

  function openVideoStudio(schedule: ContentSchedule) {
    const item = history.find((historyItem) => historyItem.id === schedule.linkedContentId);
    if (!item) {
      flash("영상으로 만들 생성 콘텐츠를 먼저 연결해 주세요.");
      return;
    }

    saveCurrentResult({ ...item.package, scheduleId: schedule.id, campaignId: schedule.campaignId, campaignName: schedule.campaignName, brandName: schedule.brandName });
    router.push("/video-studio");
  }

  function completeSchedule(schedule: ContentSchedule) {
    const publishedDate = publishForm.publishedAt ? new Date(publishForm.publishedAt) : new Date();
    markSchedulePublished(schedule.id, {
      publishedAt: Number.isNaN(publishedDate.getTime()) ? new Date().toISOString() : publishedDate.toISOString(),
      publishedUrl: publishForm.publishedUrl,
      actualCaption: publishForm.actualCaption,
      publishedPlatform: schedule.platform,
      publishMemo: publishForm.publishMemo
    });
    setPublishingId(null);
    setPublishForm({ publishedAt: "", publishedUrl: "", actualCaption: "", publishMemo: "" });
    refresh();
    flash("게시 완료로 기록했어요.");
  }

  function saveIdea() {
    if (!ideaForm.title.trim()) {
      flash("아이디어 제목을 입력해 주세요.");
      return;
    }
    upsertContentIdea({ ...ideaForm, tags: Array.isArray(ideaForm.tags) ? ideaForm.tags : [] });
    setIdeaForm(createDefaultIdea());
    refresh();
    flash("아이디어를 저장했어요.");
  }

  function convertIdea(idea: ContentIdea) {
    addContentSchedule(ideaToSchedule(idea));
    upsertContentIdea({ ...idea, convertedToSchedule: true });
    refresh();
    flash("아이디어를 일정으로 전환했어요.");
  }

  function createFromIdea(idea: ContentIdea) {
    savePrefill(ideaToPrefill(idea));
    router.push("/create");
  }

  function ScheduleCard({ schedule }: { schedule: ContentSchedule }) {
    const content = history.find((item) => item.id === schedule.linkedContentId)?.package ?? null;
    const campaign = campaigns.find((item) => item.id === schedule.campaignId);
    const relatedExports = exports.filter((entry) => schedule.linkedExportIds.includes(entry.exportId));
    const status = getScheduleDisplayStatus(schedule);
    const checklist = buildScheduleChecklist(schedule, content);
    const visibleChecklist = checklist.filter((item) => item.status !== "hidden");
    const warningCount = visibleChecklist.filter((item) => item.status === "warning").length;

    return (
      <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(status)}>{status}</Badge>
              <Badge tone="sky">{schedule.platform}</Badge>
              <Badge tone="mint">{schedule.purpose}</Badge>
              {schedule.isSponsored ? <Badge tone="coral">광고·협찬</Badge> : null}
              {schedule.lastExportedAt ? <Badge tone="sky">SNS 공유 준비 완료</Badge> : null}
              {isVideoPreferredPlatform(schedule.platform) ? <Badge tone="lemon">Video Studio 추천</Badge> : null}
              {isScheduleOverdue(schedule) ? <Badge tone="coral">마감 경고</Badge> : null}
            </div>
            <h3 className="mt-3 text-lg font-black">{schedule.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              {formatLocalDateTime(schedule.scheduledAt)} · {campaign ? campaign.campaignName : schedule.campaignId ? "캠페인 없음" : schedule.campaignName || "캠페인 없음"} · {schedule.brandName || "브랜드 없음"}
            </p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{schedule.internalMemo || schedule.productName || "메모가 없습니다."}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => openResult(schedule)} type="button" variant="secondary">
              결과 보기
            </Button>
            <Button onClick={() => openExport(schedule)} type="button" variant="soft">
              <Download size={16} aria-hidden="true" />
              SNS 내보내기
            </Button>
            <Button onClick={() => openStudio(schedule)} type="button" variant="secondary">
              <Palette size={16} aria-hidden="true" />
              디자인
            </Button>
            {isVideoPreferredPlatform(schedule.platform) ? (
              <Button onClick={() => openVideoStudio(schedule)} type="button" variant="secondary">
                <Video size={16} aria-hidden="true" />
                영상
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-wash p-3">
            <p className="text-xs font-black text-muted">연결 콘텐츠</p>
            <p className="mt-1 text-sm font-bold">{content ? content.title : "없음"}</p>
          </div>
          <div className="rounded-lg bg-wash p-3">
            <p className="text-xs font-black text-muted">내보내기 기록</p>
            <p className="mt-1 text-sm font-bold">{relatedExports.length}개</p>
          </div>
          <div className="rounded-lg bg-wash p-3">
            <p className="text-xs font-black text-muted">준비 체크</p>
            <p className="mt-1 text-sm font-bold">{warningCount > 0 ? `주의 ${warningCount}개` : "확인됨"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => startCreateFromSchedule(schedule)} type="button" variant="secondary">
            <Sparkles size={16} aria-hidden="true" />
            콘텐츠 생성
          </Button>
          {content ? <CopyButton label="전체 문구 복사" value={composeFullUploadText(content)} /> : null}
          <Button onClick={() => setPublishingId(schedule.id)} type="button" variant="secondary">
            <CheckCircle2 size={16} aria-hidden="true" />
            게시 완료 처리
          </Button>
          <Button onClick={() => editSchedule(schedule)} type="button" variant="secondary">
            <Edit3 size={16} aria-hidden="true" />
            일정 변경
          </Button>
          <Button onClick={() => duplicateSchedule(schedule)} type="button" variant="secondary">
            <Copy size={16} aria-hidden="true" />
            복제
          </Button>
          <Button onClick={() => setPendingDelete(schedule)} type="button" variant="danger">
            <Trash2 size={16} aria-hidden="true" />
            삭제
          </Button>
        </div>

        {visibleChecklist.length > 0 ? (
          <div className="mt-4 rounded-lg border border-line bg-wash p-3">
            <p className="text-sm font-black">게시 준비 체크리스트</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleChecklist.map((item) => (
                <Badge key={item.id} tone={item.status === "ok" ? "mint" : "lemon"}>
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {publishingId === schedule.id ? (
          <div className="mt-4 rounded-lg border border-mint/40 bg-aqua p-4">
            <p className="text-sm font-black">게시 완료 기록</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input className="field" onChange={(event) => setPublishForm((current) => ({ ...current, publishedAt: event.target.value }))} type="datetime-local" />
              <input className="field" onChange={(event) => setPublishForm((current) => ({ ...current, publishedUrl: event.target.value }))} placeholder="게시 URL 선택 입력" />
              <textarea className="field min-h-24 resize-none sm:col-span-2" onChange={(event) => setPublishForm((current) => ({ ...current, actualCaption: event.target.value }))} placeholder="실제 사용한 캡션" />
              <textarea className="field min-h-24 resize-none sm:col-span-2" onChange={(event) => setPublishForm((current) => ({ ...current, publishMemo: event.target.value }))} placeholder="게시 메모" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => completeSchedule(schedule)} type="button">
                완료 저장
              </Button>
              <Button onClick={() => setPublishingId(null)} type="button" variant="secondary">
                취소
              </Button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  const monthDays = Array.from({ length: 35 }, (_, index) => {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay() + index);
    return start;
  });
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + index);
    return start;
  });

  return (
    <AppShell>
      <PageHeader
        action={
          <>
            <Button onClick={() => { setForm(emptyForm()); setShowForm(true); }} type="button">
              <Plus size={17} aria-hidden="true" />
              새 일정
            </Button>
            <LinkButton href="/campaigns" variant="secondary">
              캠페인 관리
            </LinkButton>
          </>
        }
        description="광고·협찬 일정과 일반 게시물을 한곳에서 계획하고, 생성 콘텐츠와 내보내기를 연결합니다."
        eyebrow="Calendar"
        title="콘텐츠 캘린더"
      />

      {feedback ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={18} aria-hidden="true" />
          {feedback}
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-coral/20 bg-blush p-4">
        <p className="text-sm font-black text-coral">크레딧 정책</p>
        <p className="mt-1 text-sm leading-6 text-muted">일정 등록, 수정, 삭제, 아이디어 전환, 게시 완료 기록에는 크레딧이 차감되지 않습니다. 새 콘텐츠 생성과 다시 생성만 기존 정책을 따릅니다.</p>
        <p className="mt-2 text-xs font-bold text-coral">{learningNote}</p>
      </div>

      <section className="mt-6 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <label>
              <span className="field-label">보기</span>
              <select className="field" onChange={(event) => updatePreferences({ viewMode: event.target.value as CalendarViewMode })} value={preferences.viewMode}>
                {calendarViewModes.map((mode) => (
                  <option key={mode} value={mode}>{mode === "month" ? "월간 보기" : mode === "week" ? "주간 보기" : "예정 목록"}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">기준 날짜</span>
              <input className="field" onChange={(event) => updatePreferences({ selectedDate: safeInputDate(event.target.value, preferences.selectedDate) })} type="date" value={toDateInputValue(preferences.selectedDate)} />
            </label>
            <label>
              <span className="field-label">플랫폼</span>
              <select className="field" onChange={(event) => updatePreferences({ platform: event.target.value as Platform | "전체" })} value={preferences.platform ?? "전체"}>
                <option>전체</option>
                {platforms.map((platform) => <option key={platform}>{platform}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">상태</span>
              <select className="field" onChange={(event) => updatePreferences({ status: event.target.value as ContentScheduleStatus | "전체" })} value={preferences.status ?? "전체"}>
                <option>전체</option>
                {calendarStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">캠페인</span>
              <select className="field" onChange={(event) => updatePreferences({ campaignId: event.target.value })} value={preferences.campaignId ?? "전체"}>
                <option value="전체">전체</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaignName}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">브랜드</span>
              <input className="field" onChange={(event) => updatePreferences({ brandName: event.target.value })} placeholder="브랜드명 검색" value={preferences.brandName ?? ""} />
            </label>
            <label className="flex min-h-11 items-center gap-2 pt-7 text-sm font-bold">
              <input checked={Boolean(preferences.sponsoredOnly)} onChange={(event) => updatePreferences({ sponsoredOnly: event.target.checked })} type="checkbox" />
              광고·협찬만
            </label>
            <label className="flex min-h-11 items-center gap-2 pt-7 text-sm font-bold">
              <input checked={Boolean(preferences.overdueOnly)} onChange={(event) => updatePreferences({ overdueOnly: event.target.checked })} type="checkbox" />
              기한 초과만
            </label>
          </div>
          <Button className="mt-4" onClick={() => updatePreferences({ platform: "전체", status: "전체", campaignId: "전체", brandName: "", sponsoredOnly: false, overdueOnly: false })} type="button" variant="secondary">
            필터 초기화
          </Button>
        </Card>

        <Card>
          <h2 className="text-lg font-black">알림 센터 v1</h2>
          <p className="mt-1 text-sm leading-6 text-muted">실제 푸시 알림 없이 앱 내부에서 게시 임박, 마감 임박, 검토 대기 상태를 계산합니다.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-wash p-3">
              <p className="text-xs font-black text-muted">기한 초과</p>
              <p className="mt-1 text-xl font-black">{schedules.filter((schedule) => isScheduleOverdue(schedule)).length}</p>
            </div>
            <div className="rounded-lg bg-wash p-3">
              <p className="text-xs font-black text-muted">검토 필요</p>
              <p className="mt-1 text-xl font-black">{schedules.filter((schedule) => schedule.status === "검토 필요").length}</p>
            </div>
          </div>
        </Card>
      </section>

      {showForm ? (
        <Card className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">{form.id ? "일정 수정" : "새 일정 만들기"}</h2>
              <p className="mt-1 text-sm text-muted">반복 일정은 한 번에 최대 12개까지만 생성합니다.</p>
            </div>
            <Button onClick={() => setShowForm(false)} type="button" variant="secondary">닫기</Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="sm:col-span-2 xl:col-span-3"><span className="field-label">일정 제목</span><input className="field" onChange={(event) => updateForm("title", event.target.value)} value={form.title} /></label>
            <label><span className="field-label">플랫폼</span><select className="field" onChange={(event) => updateForm("platform", event.target.value as Platform)} value={form.platform}>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
            <label><span className="field-label">게시물 목적</span><select className="field" onChange={(event) => updateForm("purpose", event.target.value as Purpose)} value={form.purpose}>{purposes.map((purpose) => <option key={purpose} value={purpose}>{getPurposeLabel(purpose)}</option>)}</select></label>
            <label><span className="field-label">상태</span><select className="field" onChange={(event) => updateForm("status", event.target.value as ContentScheduleStatus)} value={form.status}>{calendarStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label><span className="field-label">게시 날짜</span><input className="field" onChange={(event) => updateForm("date", event.target.value)} type="date" value={form.date} /></label>
            <label><span className="field-label">게시 시간</span><input className="field" onChange={(event) => updateForm("time", event.target.value)} type="time" value={form.time} /></label>
            <label><span className="field-label">캠페인</span><select className="field" onChange={(event) => applyCampaign(event.target.value)} value={form.campaignId}><option value="">캠페인 없음</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaignName}</option>)}</select></label>
            <label><span className="field-label">브랜드 또는 광고주</span><input className="field" onChange={(event) => updateForm("brandName", event.target.value)} value={form.brandName} /></label>
            <label><span className="field-label">제품명</span><input className="field" onChange={(event) => updateForm("productName", event.target.value)} value={form.productName} /></label>
            <label><span className="field-label">연결 생성 콘텐츠</span><select className="field" onChange={(event) => updateForm("linkedContentId", event.target.value)} value={form.linkedContentId}><option value="">연결 안 함</option>{history.map((item) => <option key={item.id} value={item.id}>{item.package.title}</option>)}</select></label>
            <label><span className="field-label">연결 내보내기 기록</span><select className="field" onChange={(event) => updateForm("linkedExportId", event.target.value)} value={form.linkedExportId}><option value="">연결 안 함</option>{exports.map((entry) => <option key={entry.exportId} value={entry.exportId}>{entry.platform} · {entry.exportType}</option>)}</select></label>
            <label><span className="field-label">반복 옵션</span><select className="field" onChange={(event) => updateForm("repeatOption", event.target.value as RepeatOption)} value={form.repeatOption}>{repeatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span className="field-label">반복 생성 수</span><input className="field" max={12} min={1} onChange={(event) => updateForm("repeatCount", Number(event.target.value))} type="number" value={form.repeatCount} /></label>
            <label className="flex min-h-11 items-center gap-2 pt-7 text-sm font-bold"><input checked={form.isSponsored} onChange={(event) => updateForm("isSponsored", event.target.checked)} type="checkbox" />광고·협찬 일정</label>
            <label><span className="field-label">필수 키워드</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("requiredKeywords", event.target.value)} value={form.requiredKeywords} /></label>
            <label><span className="field-label">금지 키워드</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("bannedKeywords", event.target.value)} value={form.bannedKeywords} /></label>
            <label><span className="field-label">필수 해시태그</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("requiredHashtags", event.target.value)} value={form.requiredHashtags} /></label>
            <label><span className="field-label">광고 표시 방식</span><input className="field" onChange={(event) => updateForm("disclosureStyle", event.target.value)} value={form.disclosureStyle} /></label>
            <label><span className="field-label">할인코드</span><input className="field" onChange={(event) => updateForm("discountCode", event.target.value)} value={form.discountCode} /></label>
            <label><span className="field-label">링크 또는 프로필 안내</span><input className="field" onChange={(event) => updateForm("linkGuide", event.target.value)} value={form.linkGuide} /></label>
            <label className="sm:col-span-2 xl:col-span-3"><span className="field-label">내부 메모</span><textarea className="field min-h-28 resize-none" onChange={(event) => updateForm("internalMemo", event.target.value)} value={form.internalMemo} /></label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={saveSchedule} type="button">저장</Button>
            <Button onClick={() => { savePrefill(scheduleToPrefill(createScheduleFromForm(form))); router.push("/create"); }} type="button" variant="soft">
              콘텐츠 생성 화면으로 이동
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="mt-6">
        {preferences.viewMode === "month" ? (
          <div className="grid gap-2 sm:grid-cols-7">
            {monthDays.map((day) => (
              <div className="min-h-28 rounded-lg border border-line bg-white p-2" key={day.toISOString()}>
                <p className="text-xs font-black text-muted">{day.getMonth() + 1}/{day.getDate()}</p>
                <div className="mt-2 space-y-1">
                  {sortedSchedules.filter((schedule) => sameLocalDay(schedule.scheduledAt, day)).slice(0, 3).map((schedule) => (
                    <button className="block w-full truncate rounded-lg bg-blush px-2 py-1 text-left text-xs font-bold text-coral" key={schedule.id} onClick={() => editSchedule(schedule)} type="button">{schedule.title}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : preferences.viewMode === "week" ? (
          <div className="grid gap-3 lg:grid-cols-7">
            {weekDays.map((day) => (
              <div className="rounded-lg border border-line bg-white p-3" key={day.toISOString()}>
                <p className="font-black">{getDayLabel(day.toISOString())} {day.getDate()}</p>
                <div className="mt-3 space-y-2">
                  {sortedSchedules.filter((schedule) => sameLocalDay(schedule.scheduledAt, day)).map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSchedules.length > 0 ? sortedSchedules.map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />) : (
              <Card>
                <div className="rounded-lg border border-dashed border-line bg-wash p-8 text-center">
                  <CalendarDays className="mx-auto text-coral" size={32} aria-hidden="true" />
                  <p className="mt-3 font-black">표시할 일정이 없습니다.</p>
                  <p className="mt-1 text-sm text-muted">새 일정이나 아이디어를 등록해 보세요.</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </section>

      {pendingDelete ? (
        <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">{pendingDelete.title} 일정을 삭제할까요?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setPendingDelete(null)} type="button" variant="secondary">취소</Button>
            <Button onClick={() => { deleteContentSchedule(pendingDelete.id); setPendingDelete(null); refresh(); }} type="button" variant="danger">이 일정만 삭제</Button>
            {pendingDelete.repeatGroupId ? (
              <Button onClick={() => { deleteFutureSchedules(pendingDelete); setPendingDelete(null); refresh(); }} type="button" variant="danger">이후 일정 삭제</Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-lg font-black">콘텐츠 아이디어 보관함</h2>
          <div className="mt-4 space-y-3">
            <input className="field" onChange={(event) => setIdeaForm((current) => ({ ...current, title: event.target.value }))} placeholder="아이디어 제목" value={ideaForm.title} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="field" onChange={(event) => setIdeaForm((current) => ({ ...current, platform: event.target.value as Platform }))} value={ideaForm.platform}>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select>
              <select className="field" onChange={(event) => setIdeaForm((current) => ({ ...current, purpose: event.target.value as Purpose }))} value={ideaForm.purpose}>{purposes.map((purpose) => <option key={purpose} value={purpose}>{getPurposeLabel(purpose)}</option>)}</select>
            </div>
            <textarea className="field min-h-24 resize-none" onChange={(event) => setIdeaForm((current) => ({ ...current, memo: event.target.value }))} placeholder="메모" value={ideaForm.memo} />
            <input className="field" onChange={(event) => setIdeaForm((current) => ({ ...current, preferredDate: event.target.value }))} type="date" value={ideaForm.preferredDate} />
            <input className="field" onChange={(event) => setIdeaForm((current) => ({ ...current, tags: event.target.value.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean) }))} placeholder="태그: 후기, 신상, 봄" value={ideaForm.tags.join(", ")} />
            <Button onClick={saveIdea} type="button">아이디어 저장</Button>
          </div>
        </Card>

        <div className="space-y-3">
          {ideas.length > 0 ? ideas.map((idea) => (
            <article className="rounded-lg border border-line bg-white p-4 shadow-soft" key={idea.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="sky">{idea.platform}</Badge>
                    <Badge tone="mint">{idea.purpose}</Badge>
                    {idea.convertedToSchedule ? <Badge tone="lemon">일정 전환됨</Badge> : null}
                  </div>
                  <h3 className="mt-3 font-black">{idea.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{idea.memo}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => convertIdea(idea)} type="button" variant="secondary"><Repeat size={16} aria-hidden="true" />일정 전환</Button>
                  <Button onClick={() => createFromIdea(idea)} type="button" variant="soft"><Send size={16} aria-hidden="true" />Create로 보내기</Button>
                  <Button onClick={() => { deleteContentIdea(idea.id); refresh(); }} type="button" variant="danger">삭제</Button>
                </div>
              </div>
            </article>
          )) : (
            <Card>
              <p className="text-sm text-muted">아직 저장된 아이디어가 없습니다.</p>
            </Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}
