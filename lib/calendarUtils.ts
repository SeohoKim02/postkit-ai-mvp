import type {
  Campaign,
  CalendarViewMode,
  ContentIdea,
  ContentSchedule,
  ContentScheduleStatus,
  CreateFormInput,
  GeneratedPackage,
  Platform,
  Purpose,
  RepeatOption,
  ScheduleChecklistItem
} from "@/types";

export const calendarStatuses: ContentScheduleStatus[] = [
  "아이디어",
  "작성 중",
  "검토 필요",
  "게시 준비 완료",
  "게시 예정",
  "게시 완료",
  "보류",
  "기한 초과"
];

export const calendarViewModes: CalendarViewMode[] = ["month", "week", "list"];

export const repeatOptions: { label: string; value: RepeatOption }[] = [
  { label: "반복 없음", value: "none" },
  { label: "매주", value: "weekly" },
  { label: "2주마다", value: "biweekly" },
  { label: "매월", value: "monthly" }
];

export function createCalendarId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function safeDate(value: string | undefined, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function toDateInputValue(value: string | undefined) {
  return safeDate(value).toISOString().slice(0, 10);
}

export function toTimeInputValue(value: string | undefined) {
  const date = safeDate(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function combineDateAndTime(dateValue: string, timeValue: string) {
  const safeDateValue = dateValue || new Date().toISOString().slice(0, 10);
  const safeTimeValue = timeValue || "09:00";
  const date = new Date(`${safeDateValue}T${safeTimeValue}:00`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function isScheduleOverdue(schedule: ContentSchedule, now = new Date()) {
  if (schedule.status === "게시 완료" || schedule.status === "보류") {
    return false;
  }

  return safeDate(schedule.scheduledAt).getTime() < now.getTime();
}

export function getScheduleDisplayStatus(schedule: ContentSchedule, now = new Date()): ContentScheduleStatus {
  return isScheduleOverdue(schedule, now) ? "기한 초과" : schedule.status;
}

export function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(safeDate(value));
}

export function getDayLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(safeDate(value));
}

export function splitList(value: string | string[] | undefined) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(/[,#\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeHashtags(items: string[]) {
  return Array.from(new Set(items.map((item) => `#${item.replace(/^#/, "").replace(/\s+/g, "")}`).filter((item) => item.length > 1)));
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function createRepeatedSchedules(base: ContentSchedule, count: number) {
  const limitedCount = Math.min(Math.max(1, count), 12);
  if (base.repeatOption === "none" || limitedCount === 1) {
    return [base];
  }

  const groupId = base.repeatGroupId ?? createCalendarId("repeat");
  const start = safeDate(base.scheduledAt);

  return Array.from({ length: limitedCount }, (_, index) => {
    const nextDate =
      base.repeatOption === "monthly"
        ? addMonths(start, index)
        : addDays(start, index * (base.repeatOption === "biweekly" ? 14 : 7));

    return {
      ...base,
      id: index === 0 ? base.id : createCalendarId("schedule"),
      title: index === 0 ? base.title : `${base.title} ${index + 1}`,
      scheduledAt: nextDate.toISOString(),
      repeatGroupId: groupId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}

export function makeSchedulePrefill(schedule: ContentSchedule): CreateFormInput {
  return {
    platform: schedule.platform,
    purpose: schedule.purpose,
    style: schedule.isSponsored ? "자연스러운 후기형" : "친구한테 말하듯",
    productName: schedule.productName || schedule.title,
    requiredKeywords: [...schedule.requiredKeywords, ...schedule.requiredHashtags, schedule.discountCode ?? "", schedule.linkGuide ?? ""]
      .filter(Boolean)
      .join(", "),
    bannedKeywords: schedule.bannedKeywords.join(", "),
    sponsorDisclosure: schedule.isSponsored ? "ad" : "none",
    requiredHashtags: schedule.requiredHashtags.join(" "),
    disclosureStyle: schedule.disclosureStyle,
    discountCode: schedule.discountCode,
    linkGuide: schedule.linkGuide,
    brandName: schedule.brandName,
    campaignId: schedule.campaignId,
    campaignName: schedule.campaignName,
    scheduleId: schedule.id
  };
}

export function makeIdeaPrefill(idea: ContentIdea): CreateFormInput {
  return {
    platform: idea.platform,
    purpose: idea.purpose,
    style: "친구한테 말하듯",
    productName: idea.title,
    requiredKeywords: [...splitList(idea.tags), idea.memo].filter(Boolean).join(", "),
    bannedKeywords: "",
    sponsorDisclosure: "none"
  };
}

export function buildScheduleChecklist(schedule: ContentSchedule, content?: GeneratedPackage | null): ScheduleChecklistItem[] {
  const text = content
    ? [content.selectedCaption ?? content.captions[0], content.hashtags.join(" "), content.disclosure, content.thumbnails.join(" ")].join(" ").toLowerCase()
    : "";
  const hasContent = Boolean(content);
  const hasDisclosure = !schedule.isSponsored || Boolean(content?.disclosure?.trim()) || Boolean(schedule.disclosureStyle.trim());
  const missingRequired = schedule.requiredKeywords.filter((keyword) => !text.includes(keyword.toLowerCase()));
  const includedBanned = schedule.bannedKeywords.filter((keyword) => text.includes(keyword.toLowerCase()));
  const hasDiscount = !schedule.discountCode || text.includes(schedule.discountCode.toLowerCase());
  const hasLinkGuide = !schedule.linkGuide || text.includes(schedule.linkGuide.toLowerCase()) || /링크|프로필|댓글|DM|디엠/.test(text);

  return [
    { id: "media", label: "이미지 또는 영상 준비", status: hasContent && content?.input.uploadedFileName ? "ok" : "warning" },
    { id: "caption", label: "캡션 선택", status: hasContent && Boolean(content?.selectedCaption ?? content?.captions[0]) ? "ok" : "warning" },
    { id: "hashtags", label: "해시태그 준비", status: hasContent && (content?.hashtags.length ?? 0) > 0 ? "ok" : "warning" },
    { id: "thumbnail", label: "썸네일 준비", status: hasContent && (content?.thumbnails.length ?? 0) > 0 ? "ok" : "warning" },
    { id: "disclosure", label: "광고 표시 문구 포함", status: schedule.isSponsored ? (hasDisclosure ? "ok" : "warning") : "hidden" },
    { id: "required", label: "필수 키워드 포함", status: missingRequired.length === 0 ? "ok" : "warning", detail: missingRequired.join(", ") },
    { id: "banned", label: "금지 키워드 미포함", status: includedBanned.length === 0 ? "ok" : "warning", detail: includedBanned.join(", ") },
    { id: "discount", label: "할인코드 확인", status: schedule.isSponsored ? (hasDiscount ? "ok" : "warning") : "hidden" },
    { id: "link", label: "링크 안내 확인", status: schedule.isSponsored ? (hasLinkGuide ? "ok" : "warning") : "hidden" },
    { id: "advertiser", label: "광고주 요청사항 확인", status: schedule.isSponsored ? "warning" : "hidden", detail: "게시 전 직접 확인하세요." }
  ];
}

export function getScheduleLearningNote(schedules: ContentSchedule[]) {
  if (schedules.length === 0) {
    return "아직 예약 패턴이 충분하지 않아요.";
  }

  const counts = schedules.reduce<Record<string, number>>((acc, schedule) => {
    const date = safeDate(schedule.scheduledAt);
    const key = `${getDayLabel(schedule.scheduledAt)} ${date.getHours() < 12 ? "오전" : date.getHours() < 18 ? "오후" : "저녁"} · ${schedule.platform}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return top ? `최근 ${top} 예약이 많아요.` : "예약 패턴을 학습 중이에요.";
}

export function getDashboardTodoSummary(schedules: ContentSchedule[], campaigns: Campaign[]) {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const todaySchedules = schedules.filter((schedule) => safeDate(schedule.scheduledAt).toISOString().slice(0, 10) === todayKey);
  const overdueSchedules = schedules.filter((schedule) => isScheduleOverdue(schedule, now));
  const reviewSchedules = schedules.filter((schedule) => schedule.status === "검토 필요");
  const draftSchedules = schedules.filter((schedule) => schedule.status === "작성 중");
  const exportReadySchedules = schedules.filter((schedule) => schedule.linkedContentId && schedule.linkedExportIds.length === 0);
  const deadlineSoonCampaigns = campaigns.filter((campaign) => {
    const diff = safeDate(campaign.contentDeadline).getTime() - now.getTime();
    return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 3 && campaign.campaignStatus !== "완료" && campaign.campaignStatus !== "취소";
  });

  return {
    todaySchedules,
    overdueSchedules,
    reviewSchedules,
    draftSchedules,
    exportReadySchedules,
    deadlineSoonCampaigns
  };
}

export function purposeFromCampaignType(campaignType: string): Purpose {
  if (campaignType.includes("광고") || campaignType.includes("제휴") || campaignType.includes("제공")) return "Sponsored Post";
  if (campaignType.includes("할인") || campaignType.includes("공동구매")) return "Discount Event";
  if (campaignType.includes("자체")) return "Product Promotion";
  return "Product Promotion";
}

export function platformFromDeliverable(label: string): Platform {
  if (label.includes("스토리")) return "Instagram Story";
  if (label.includes("릴스")) return "Reels Thumbnail";
  if (label.includes("TikTok")) return "TikTok";
  if (label.includes("Shorts")) return "YouTube Shorts";
  return "Instagram Feed";
}
