"use client";

import { CalendarPlus, Copy, ExternalLink, Link as LinkIcon, Palette, Plus, Save, Sparkles, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { addContentSchedule, createDefaultSchedule } from "@/lib/calendarStorage";
import { formatLocalDateTime, purposeFromCampaignType, toDateInputValue } from "@/lib/calendarUtils";
import {
  campaignToPrefill,
  createCampaignFromForm,
  deleteCampaign,
  duplicateCampaign,
  getCampaigns,
  linkCampaignContent,
  linkCampaignSchedule,
  updateCampaignStatus,
  updateDeliverableStatus,
  upsertCampaign
} from "@/lib/campaignStorage";
import {
  campaignStatuses,
  campaignTypes,
  createDefaultCampaign,
  createDeliverable,
  deliverableStatuses,
  deliverableTypes,
  getCampaignProgress
} from "@/lib/campaignUtils";
import { getExportHistory } from "@/lib/exportStorage";
import { getHistory, saveCurrentResult, savePrefill } from "@/lib/storage";
import { isVideoPreferredPlatform } from "@/lib/video/videoPresets";
import type { Campaign, CampaignStatus, CampaignType, DeliverableType, HistoryItem, Platform } from "@/types";

const platforms: Platform[] = ["Instagram Feed", "Instagram Story", "Instagram Reels", "TikTok", "YouTube Shorts", "Facebook", "X"];

function statusTone(status: CampaignStatus) {
  if (status === "완료") return "mint";
  if (status === "취소" || status === "수정 요청") return "coral";
  if (status === "광고주 검토 중" || status === "제안 검토 중") return "lemon";
  return "sky";
}

function safeInputDate(value: string, fallback: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<Campaign>(() => createDefaultCampaign());
  const [showForm, setShowForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [contentToLink, setContentToLink] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const nextCampaigns = getCampaigns();
    setCampaigns(nextCampaigns);
    setHistory(getHistory());
    setSelectedId(nextCampaigns[0]?.id ?? "");
  }, []);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0];
  const exportHistory = getExportHistory();
  const relatedContent = history.filter((item) => selectedCampaign?.relatedContentIds.includes(item.id));
  const relatedExports = exportHistory.filter((entry) => selectedCampaign?.relatedContentIds.includes(entry.contentId));
  const progress = selectedCampaign ? getCampaignProgress(selectedCampaign) : { total: 0, done: 0, generated: 0, percent: 0 };

  const upcomingCampaigns = useMemo(
    () =>
      [...campaigns].sort((a, b) => new Date(a.contentDeadline).getTime() - new Date(b.contentDeadline).getTime()).slice(0, 4),
    [campaigns]
  );

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function refresh(selectId?: string) {
    const nextCampaigns = getCampaigns();
    setCampaigns(nextCampaigns);
    setHistory(getHistory());
    if (selectId) {
      setSelectedId(selectId);
    }
  }

  function updateForm<K extends keyof Campaign>(key: K, value: Campaign[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setForm(createDefaultCampaign());
    setShowForm(true);
  }

  function editCampaign(campaign: Campaign) {
    setForm(campaign);
    setShowForm(true);
  }

  function saveCampaign() {
    const nextCampaign = createCampaignFromForm({
      id: form.id,
      campaignName: form.campaignName,
      advertiserName: form.advertiserName,
      brandName: form.brandName,
      productName: form.productName,
      campaignType: form.campaignType,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      contentDeadline: form.contentDeadline,
      publishStartAt: form.publishStartAt,
      publishEndAt: form.publishEndAt,
      targetPlatforms: form.targetPlatforms,
      requiredKeywords: form.requiredKeywords.join(", "),
      bannedKeywords: form.bannedKeywords.join(", "),
      requiredHashtags: form.requiredHashtags.join(" "),
      disclosureStyle: form.disclosureStyle,
      discountCode: form.discountCode,
      landingUrl: form.landingUrl,
      contactName: form.contactName,
      contactChannel: form.contactChannel,
      compensationType: form.compensationType,
      compensationNote: form.compensationNote,
      campaignStatus: form.campaignStatus,
      internalMemo: form.internalMemo,
      base: form
    });
    const saved = upsertCampaign(nextCampaign);
    setShowForm(false);
    refresh(saved.id);
    flash("캠페인을 저장했어요. 캠페인 관리는 크레딧을 사용하지 않습니다.");
  }

  function togglePlatform(platform: Platform) {
    setForm((current) => ({
      ...current,
      targetPlatforms: current.targetPlatforms.includes(platform)
        ? current.targetPlatforms.filter((item) => item !== platform)
        : [...current.targetPlatforms, platform]
    }));
  }

  function toggleDeliverable(type: DeliverableType) {
    setForm((current) => ({
      ...current,
      requiredDeliverables: current.requiredDeliverables.some((item) => item.type === type)
        ? current.requiredDeliverables.filter((item) => item.type !== type)
        : [...current.requiredDeliverables, createDeliverable(type)]
    }));
  }

  function createPostFromCampaign(campaign: Campaign) {
    savePrefill(campaignToPrefill(campaign));
    router.push("/create");
  }

  function addScheduleFromCampaign(campaign: Campaign) {
    const date = new Date(campaign.publishStartAt);
    const schedule = {
      ...createDefaultSchedule(),
      title: `${campaign.campaignName} 게시 일정`,
      platform: campaign.targetPlatforms[0] ?? "Instagram Feed",
      purpose: purposeFromCampaignType(campaign.campaignType),
      scheduledAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
      brandName: campaign.brandName,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      productName: campaign.productName,
      status: "작성 중" as const,
      isSponsored: campaign.campaignType !== "일반 콘텐츠" && campaign.campaignType !== "자체 제품 홍보",
      requiredKeywords: campaign.requiredKeywords,
      bannedKeywords: campaign.bannedKeywords,
      requiredHashtags: campaign.requiredHashtags,
      disclosureStyle: campaign.disclosureStyle,
      discountCode: campaign.discountCode,
      linkGuide: campaign.landingUrl ? "프로필 링크 또는 상세 링크 안내 포함" : "",
      internalMemo: campaign.internalMemo
    };
    const created = addContentSchedule(schedule)[0];
    linkCampaignSchedule(campaign.id, created.id);
    refresh(campaign.id);
    flash("캠페인 일정 1개를 추가했어요.");
    router.push("/calendar");
  }

  function connectContent(campaign: Campaign) {
    if (!contentToLink) {
      flash("연결할 콘텐츠를 선택해 주세요.");
      return;
    }

    const item = history.find((historyItem) => historyItem.id === contentToLink);
    linkCampaignContent(campaign.id, contentToLink, item?.package.platform);
    setContentToLink("");
    refresh(campaign.id);
    flash("기존 생성 콘텐츠를 캠페인에 연결했어요.");
  }

  function openExport(campaign: Campaign) {
    const item = history.find((historyItem) => campaign.relatedContentIds.includes(historyItem.id));
    if (!item) {
      flash("먼저 생성 콘텐츠를 연결해 주세요.");
      return;
    }

    saveCurrentResult({ ...item.package, campaignId: campaign.id, campaignName: campaign.campaignName, brandName: campaign.brandName });
    router.push("/export");
  }

  function openStudio(campaign: Campaign) {
    const item = history.find((historyItem) => campaign.relatedContentIds.includes(historyItem.id));
    if (!item) {
      flash("디자인할 생성 콘텐츠를 먼저 연결해 주세요.");
      return;
    }

    saveCurrentResult({ ...item.package, campaignId: campaign.id, campaignName: campaign.campaignName, brandName: campaign.brandName });
    router.push("/studio");
  }

  function openVideoStudio(campaign: Campaign) {
    const item = history.find((historyItem) => campaign.relatedContentIds.includes(historyItem.id));
    if (!item) {
      flash("영상으로 만들 생성 콘텐츠를 먼저 연결해 주세요.");
      return;
    }

    saveCurrentResult({ ...item.package, campaignId: campaign.id, campaignName: campaign.campaignName, brandName: campaign.brandName });
    router.push("/video-studio");
  }

  function cloneCampaign(campaign: Campaign) {
    const clone = duplicateCampaign(campaign);
    refresh(clone.id);
    flash("캠페인을 복제했어요.");
  }

  function deleteSelected(id: string) {
    deleteCampaign(id);
    setPendingDeleteId(null);
    refresh();
    flash("캠페인을 삭제했어요. 연결된 일정은 캠페인 없음으로 표시될 수 있습니다.");
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <>
            <Button onClick={startCreate} type="button">
              <Plus size={17} aria-hidden="true" />
              새 캠페인
            </Button>
            <LinkButton href="/calendar" variant="secondary">
              캘린더 보기
            </LinkButton>
          </>
        }
        description="광고·협찬 조건, 필수 결과물, 콘텐츠 마감일과 게시 기간을 localStorage 기반으로 관리합니다."
        eyebrow="Campaigns"
        title="광고·제휴 캠페인 관리"
      />

      {feedback ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          <Sparkles size={18} aria-hidden="true" />
          {feedback}
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-coral/20 bg-blush p-4">
        <p className="text-sm font-black text-coral">크레딧 정책</p>
        <p className="mt-1 text-sm leading-6 text-muted">캠페인 등록, 수정, 삭제, 일정 추가, 상태 변경에는 크레딧이 차감되지 않습니다. 실제 게시 예약이나 외부 API 연동도 아직 없습니다.</p>
      </div>

      {showForm ? (
        <Card className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">{campaigns.some((campaign) => campaign.id === form.id) ? "캠페인 수정" : "새 캠페인"}</h2>
              <p className="mt-1 text-sm text-muted">필수 결과물과 광고 조건을 한 번에 정리합니다.</p>
            </div>
            <Button onClick={() => setShowForm(false)} type="button" variant="secondary">닫기</Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="sm:col-span-2 xl:col-span-3"><span className="field-label">캠페인명</span><input className="field" onChange={(event) => updateForm("campaignName", event.target.value)} value={form.campaignName} /></label>
            <label><span className="field-label">광고주</span><input className="field" onChange={(event) => updateForm("advertiserName", event.target.value)} value={form.advertiserName} /></label>
            <label><span className="field-label">브랜드</span><input className="field" onChange={(event) => updateForm("brandName", event.target.value)} value={form.brandName} /></label>
            <label><span className="field-label">제품명</span><input className="field" onChange={(event) => updateForm("productName", event.target.value)} value={form.productName} /></label>
            <label><span className="field-label">캠페인 유형</span><select className="field" onChange={(event) => updateForm("campaignType", event.target.value as CampaignType)} value={form.campaignType}>{campaignTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label><span className="field-label">상태</span><select className="field" onChange={(event) => updateForm("campaignStatus", event.target.value as CampaignStatus)} value={form.campaignStatus}>{campaignStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label><span className="field-label">시작일</span><input className="field" onChange={(event) => updateForm("startDate", safeInputDate(event.target.value, form.startDate))} type="date" value={toDateInputValue(form.startDate)} /></label>
            <label><span className="field-label">종료일</span><input className="field" onChange={(event) => updateForm("endDate", safeInputDate(event.target.value, form.endDate))} type="date" value={toDateInputValue(form.endDate)} /></label>
            <label><span className="field-label">콘텐츠 마감일</span><input className="field" onChange={(event) => updateForm("contentDeadline", safeInputDate(event.target.value, form.contentDeadline))} type="date" value={toDateInputValue(form.contentDeadline)} /></label>
            <label><span className="field-label">게시 시작</span><input className="field" onChange={(event) => updateForm("publishStartAt", safeInputDate(event.target.value, form.publishStartAt))} type="date" value={toDateInputValue(form.publishStartAt)} /></label>
            <label><span className="field-label">게시 종료</span><input className="field" onChange={(event) => updateForm("publishEndAt", safeInputDate(event.target.value, form.publishEndAt))} type="date" value={toDateInputValue(form.publishEndAt)} /></label>
            <label><span className="field-label">광고 표시 방식</span><input className="field" onChange={(event) => updateForm("disclosureStyle", event.target.value)} value={form.disclosureStyle} /></label>
            <label><span className="field-label">할인코드</span><input className="field" onChange={(event) => updateForm("discountCode", event.target.value)} value={form.discountCode} /></label>
            <label><span className="field-label">랜딩 URL</span><input className="field" onChange={(event) => updateForm("landingUrl", event.target.value)} value={form.landingUrl} /></label>
            <label><span className="field-label">담당자</span><input className="field" onChange={(event) => updateForm("contactName", event.target.value)} value={form.contactName} /></label>
            <label><span className="field-label">연락 채널</span><input className="field" onChange={(event) => updateForm("contactChannel", event.target.value)} value={form.contactChannel} /></label>
            <label><span className="field-label">보상 유형</span><input className="field" onChange={(event) => updateForm("compensationType", event.target.value)} value={form.compensationType} /></label>
            <label className="sm:col-span-2 xl:col-span-3"><span className="field-label">설명</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("description", event.target.value)} value={form.description} /></label>
            <label><span className="field-label">필수 키워드</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("requiredKeywords", event.target.value.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean))} value={form.requiredKeywords.join(", ")} /></label>
            <label><span className="field-label">금지 키워드</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("bannedKeywords", event.target.value.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean))} value={form.bannedKeywords.join(", ")} /></label>
            <label><span className="field-label">필수 해시태그</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("requiredHashtags", event.target.value.split(/[,#\n]/).map((item) => item.trim()).filter(Boolean).map((item) => `#${item.replace(/^#/, "")}`))} value={form.requiredHashtags.join(" ")} /></label>
            <label className="sm:col-span-2 xl:col-span-3"><span className="field-label">내부 메모</span><textarea className="field min-h-24 resize-none" onChange={(event) => updateForm("internalMemo", event.target.value)} value={form.internalMemo} /></label>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-wash p-4">
              <p className="text-sm font-black">대상 플랫폼</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <button className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.targetPlatforms.includes(platform) ? "border-coral bg-blush text-coral" : "border-line bg-white text-muted"}`} key={platform} onClick={() => togglePlatform(platform)} type="button">
                    {platform}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-wash p-4">
              <p className="text-sm font-black">필수 결과물</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {deliverableTypes.map((type) => (
                  <button className={`rounded-lg border px-3 py-2 text-sm font-bold ${form.requiredDeliverables.some((item) => item.type === type) ? "border-coral bg-blush text-coral" : "border-line bg-white text-muted"}`} key={type} onClick={() => toggleDeliverable(type)} type="button">
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={saveCampaign} type="button"><Save size={16} aria-hidden="true" />저장</Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          {campaigns.length > 0 ? campaigns.map((campaign) => {
            const campaignProgress = getCampaignProgress(campaign);
            return (
              <button
                className={`w-full rounded-lg border bg-white p-4 text-left shadow-soft transition ${selectedCampaign?.id === campaign.id ? "border-coral" : "border-line hover:border-coral/50"}`}
                key={campaign.id}
                onClick={() => setSelectedId(campaign.id)}
                type="button"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(campaign.campaignStatus)}>{campaign.campaignStatus}</Badge>
                  <Badge>{campaign.campaignType}</Badge>
                  <Badge tone="sky">{campaign.targetPlatforms[0] ?? "플랫폼 없음"}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-black">{campaign.campaignName}</h2>
                <p className="mt-1 text-sm text-muted">{campaign.brandName || campaign.advertiserName || "브랜드 없음"} · 마감 {formatLocalDateTime(campaign.contentDeadline)}</p>
                <div className="mt-3 h-2 rounded-full bg-wash">
                  <div className="h-2 rounded-full bg-coral" style={{ width: `${campaignProgress.percent}%` }} />
                </div>
                <p className="mt-2 text-xs font-bold text-muted">완료 {campaignProgress.done}/{campaignProgress.total} · 진행 {campaignProgress.generated}/{campaignProgress.total}</p>
              </button>
            );
          }) : (
            <Card>
              <p className="text-sm text-muted">아직 등록된 캠페인이 없습니다.</p>
            </Card>
          )}
        </div>

        {selectedCampaign ? (
          <div className="space-y-5">
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={statusTone(selectedCampaign.campaignStatus)}>{selectedCampaign.campaignStatus}</Badge>
                    <Badge tone="coral">{selectedCampaign.campaignType}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-black">{selectedCampaign.campaignName}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{selectedCampaign.description || "설명이 없습니다."}</p>
                </div>
                <Button onClick={() => editCampaign(selectedCampaign)} type="button" variant="secondary">수정</Button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">게시 기간</p><p className="mt-1 text-sm font-bold">{formatLocalDateTime(selectedCampaign.publishStartAt)} ~ {formatLocalDateTime(selectedCampaign.publishEndAt)}</p></div>
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">콘텐츠 마감</p><p className="mt-1 text-sm font-bold">{formatLocalDateTime(selectedCampaign.contentDeadline)}</p></div>
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">필수 키워드</p><p className="mt-1 text-sm font-bold">{selectedCampaign.requiredKeywords.join(", ") || "없음"}</p></div>
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">금지 키워드</p><p className="mt-1 text-sm font-bold">{selectedCampaign.bannedKeywords.join(", ") || "없음"}</p></div>
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">광고 표시</p><p className="mt-1 text-sm font-bold">{selectedCampaign.disclosureStyle || "없음"}</p></div>
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">할인/링크</p><p className="mt-1 text-sm font-bold">{[selectedCampaign.discountCode, selectedCampaign.landingUrl].filter(Boolean).join(" · ") || "없음"}</p></div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-black">필수 결과물 진행률</h3>
              <div className="mt-3 h-2 rounded-full bg-wash"><div className="h-2 rounded-full bg-coral" style={{ width: `${progress.percent}%` }} /></div>
              <p className="mt-2 text-sm text-muted">완료 {progress.done}/{progress.total}</p>
              <div className="mt-4 space-y-2">
                {selectedCampaign.requiredDeliverables.map((deliverable) => (
                  <div className="flex flex-col gap-2 rounded-lg border border-line bg-wash p-3 sm:flex-row sm:items-center sm:justify-between" key={deliverable.id}>
                    <span className="text-sm font-black">{deliverable.type}</span>
                    <select className="field max-w-xs" onChange={(event) => { updateDeliverableStatus(selectedCampaign.id, deliverable.id, event.target.value as typeof deliverable.status); refresh(selectedCampaign.id); }} value={deliverable.status}>
                      {deliverableStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-black">빠른 작업</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => createPostFromCampaign(selectedCampaign)} type="button"><Sparkles size={16} aria-hidden="true" />이 캠페인으로 게시물 만들기</Button>
                <Button onClick={() => addScheduleFromCampaign(selectedCampaign)} type="button" variant="secondary"><CalendarPlus size={16} aria-hidden="true" />일정 추가</Button>
                <Button onClick={() => openExport(selectedCampaign)} type="button" variant="soft"><ExternalLink size={16} aria-hidden="true" />SNS 내보내기</Button>
                <Button onClick={() => openStudio(selectedCampaign)} type="button" variant="secondary"><Palette size={16} aria-hidden="true" />Studio 디자인</Button>
                {selectedCampaign.targetPlatforms.some((platform) => isVideoPreferredPlatform(platform)) ||
                selectedCampaign.requiredDeliverables.some((deliverable) => ["Instagram 릴스", "TikTok", "YouTube Shorts", "Instagram 스토리"].includes(deliverable.type)) ? (
                  <Button onClick={() => openVideoStudio(selectedCampaign)} type="button" variant="secondary"><Video size={16} aria-hidden="true" />Video Studio</Button>
                ) : null}
                <Button onClick={() => cloneCampaign(selectedCampaign)} type="button" variant="secondary"><Copy size={16} aria-hidden="true" />캠페인 복제</Button>
                <Button onClick={() => setPendingDeleteId(selectedCampaign.id)} type="button" variant="danger"><Trash2 size={16} aria-hidden="true" />삭제</Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <select className="field" onChange={(event) => setContentToLink(event.target.value)} value={contentToLink}>
                  <option value="">기존 콘텐츠 선택</option>
                  {history.map((item) => <option key={item.id} value={item.id}>{item.package.title}</option>)}
                </select>
                <Button onClick={() => connectContent(selectedCampaign)} type="button" variant="secondary"><LinkIcon size={16} aria-hidden="true" />기존 콘텐츠 연결</Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <select className="field" onChange={(event) => { updateCampaignStatus(selectedCampaign.id, event.target.value as CampaignStatus); refresh(selectedCampaign.id); }} value={selectedCampaign.campaignStatus}>
                  {campaignStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <Button onClick={() => refresh(selectedCampaign.id)} type="button" variant="secondary">상태 변경</Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-black">연결된 콘텐츠와 내보내기</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">생성 콘텐츠</p><p className="mt-1 text-xl font-black">{relatedContent.length}개</p></div>
                <div className="rounded-lg bg-wash p-3"><p className="text-xs font-black text-muted">내보내기 기록</p><p className="mt-1 text-xl font-black">{relatedExports.length}개</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {relatedContent.map((item) => (
                  <button className="w-full rounded-lg border border-line bg-wash p-3 text-left hover:border-coral/50" key={item.id} onClick={() => { saveCurrentResult({ ...item.package, campaignId: selectedCampaign.id, campaignName: selectedCampaign.campaignName, brandName: selectedCampaign.brandName }); router.push("/results"); }} type="button">
                    <p className="font-bold">{item.package.title}</p>
                    <p className="mt-1 text-xs text-muted">{item.package.platform} · {item.package.usedCredits} 크레딧 사용</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted">캠페인을 선택하거나 새로 만들어 주세요.</p>
          </Card>
        )}
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-black">마감 임박 캠페인</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {upcomingCampaigns.map((campaign) => (
            <div className="rounded-lg border border-line bg-white p-4 shadow-soft" key={campaign.id}>
              <Badge tone={statusTone(campaign.campaignStatus)}>{campaign.campaignStatus}</Badge>
              <p className="mt-3 font-black">{campaign.campaignName}</p>
              <p className="mt-1 text-sm text-muted">마감 {formatLocalDateTime(campaign.contentDeadline)}</p>
            </div>
          ))}
        </div>
      </section>

      {pendingDeleteId ? (
        <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">캠페인을 삭제할까요? 연결된 일정과 콘텐츠 파일은 삭제하지 않습니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setPendingDeleteId(null)} type="button" variant="secondary">취소</Button>
            <Button onClick={() => deleteSelected(pendingDeleteId)} type="button" variant="danger">삭제 확인</Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
