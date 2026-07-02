"use client";

import { isScheduleOverdue, safeDate } from "@/lib/calendarUtils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { Campaign, ContentSchedule, NotificationType, PostKitNotification } from "@/types";

export const notificationsKey = STORAGE_KEYS.notifications;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function notificationId(type: NotificationType, relatedId: string) {
  return `notice-${type}-${relatedId}`.replace(/\s+/g, "-");
}

function makeNotification(value: {
  type: NotificationType;
  title: string;
  message: string;
  relatedScheduleId?: string;
  relatedCampaignId?: string;
  read?: boolean;
}) {
  return {
    id: notificationId(value.type, value.relatedScheduleId ?? value.relatedCampaignId ?? value.title),
    version: 1,
    type: value.type,
    title: value.title,
    message: value.message,
    relatedScheduleId: value.relatedScheduleId,
    relatedCampaignId: value.relatedCampaignId,
    read: value.read ?? false,
    createdAt: new Date().toISOString()
  } satisfies PostKitNotification;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateNotification(value: unknown): PostKitNotification | null {
  if (!isObject(value)) return null;
  return {
    id: typeof value.id === "string" ? value.id : notificationId((value.type as NotificationType) || "검토 대기", String(value.relatedScheduleId ?? value.relatedCampaignId ?? "unknown")),
    version: 1,
    type: (value.type as NotificationType) || "검토 대기",
    title: typeof value.title === "string" ? value.title : "알림",
    message: typeof value.message === "string" ? value.message : "",
    relatedScheduleId: typeof value.relatedScheduleId === "string" ? value.relatedScheduleId : undefined,
    relatedCampaignId: typeof value.relatedCampaignId === "string" ? value.relatedCampaignId : undefined,
    read: Boolean(value.read),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString()
  };
}

export function getNotifications() {
  const raw = readJson<unknown[]>(notificationsKey, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateNotification).filter(Boolean) as PostKitNotification[];
}

export function saveNotifications(notifications: PostKitNotification[]) {
  const unique = new Map(notifications.map((notification) => [notification.id, { ...notification, version: 1 }]));
  writeJson(notificationsKey, Array.from(unique.values()).slice(0, 200));
}

export function buildNotifications(schedules: ContentSchedule[], campaigns: Campaign[]) {
  const now = new Date();
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;
  const existingRead = new Map(getNotifications().map((notification) => [notification.id, notification.read]));
  const next: PostKitNotification[] = [];

  schedules.forEach((schedule) => {
    const scheduledAt = safeDate(schedule.scheduledAt);
    const diff = scheduledAt.getTime() - now.getTime();

    if (diff > 0 && diff <= oneDay) {
      next.push(
        makeNotification({
          type: "게시 예정 24시간 전",
          title: "게시 예정이 가까워졌어요",
          message: `${schedule.title} 게시 예정 시간이 24시간 안으로 들어왔어요.`,
          relatedScheduleId: schedule.id
        })
      );
    }

    if (diff > 0 && diff <= oneHour) {
      next.push(
        makeNotification({
          type: "게시 예정 1시간 전",
          title: "곧 게시할 시간이에요",
          message: `${schedule.title} 게시 예정 시간이 1시간 안으로 들어왔어요.`,
          relatedScheduleId: schedule.id
        })
      );
    }

    if (isScheduleOverdue(schedule)) {
      next.push(
        makeNotification({
          type: "기한 초과",
          title: "기한이 지난 일정이 있어요",
          message: `${schedule.title} 게시 예정 시간이 지났습니다.`,
          relatedScheduleId: schedule.id
        })
      );
    }

    if (schedule.status === "검토 필요") {
      next.push(
        makeNotification({
          type: "검토 대기",
          title: "검토가 필요한 콘텐츠",
          message: `${schedule.title} 일정이 검토 필요 상태입니다.`,
          relatedScheduleId: schedule.id
        })
      );
    }

    if (schedule.isSponsored && !schedule.disclosureStyle.trim()) {
      next.push(
        makeNotification({
          type: "광고 표시 문구 누락",
          title: "광고 표시 문구를 확인해 주세요",
          message: `${schedule.title} 일정에 광고 표시 방식이 비어 있어요.`,
          relatedScheduleId: schedule.id
        })
      );
    }
  });

  campaigns.forEach((campaign) => {
    const deadline = safeDate(campaign.contentDeadline);
    const diff = deadline.getTime() - now.getTime();
    const incomplete = campaign.requiredDeliverables.filter((deliverable) => deliverable.status !== "승인 완료" && deliverable.status !== "게시 완료");

    if (diff > 0 && diff <= oneDay * 3 && campaign.campaignStatus !== "완료" && campaign.campaignStatus !== "취소") {
      next.push(
        makeNotification({
          type: "캠페인 마감 임박",
          title: "캠페인 마감이 가까워요",
          message: `${campaign.campaignName} 콘텐츠 마감일이 3일 안으로 들어왔어요.`,
          relatedCampaignId: campaign.id
        })
      );
    }

    if (incomplete.length > 0 && campaign.campaignStatus !== "완료" && campaign.campaignStatus !== "취소") {
      next.push(
        makeNotification({
          type: "필수 결과물 미완료",
          title: "필수 결과물이 남아 있어요",
          message: `${campaign.campaignName} 캠페인에 미완료 결과물 ${incomplete.length}개가 있습니다.`,
          relatedCampaignId: campaign.id
        })
      );
    }
  });

  return next.map((notification) => ({
    ...notification,
    read: existingRead.get(notification.id) ?? notification.read
  }));
}

export function syncNotifications(schedules: ContentSchedule[], campaigns: Campaign[]) {
  const generated = buildNotifications(schedules, campaigns);
  const archived = getNotifications().filter((notification) => notification.read && !generated.some((item) => item.id === notification.id));
  const next = [...generated, ...archived].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  saveNotifications(next);
  return next;
}

export function markNotificationRead(id: string) {
  const next = getNotifications().map((notification) => (notification.id === id ? { ...notification, read: true } : notification));
  saveNotifications(next);
  return next;
}

export function getNotificationStorageKeys() {
  return {
    notificationsKey
  };
}
