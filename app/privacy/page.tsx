"use client";

import { AlertTriangle, Download, FileText, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { downloadJsonFile } from "@/lib/downloadUtils";
import { privacyDataInventory, privacyStorageKeys, retentionOptions } from "@/lib/privacyContent";
import { APP_EVENT_KEYS } from "@/lib/storageKeys";
import {
  addInfringementReport,
  cleanupExpiredMockUploads,
  collectPostKitDataForExport,
  deleteDataScope,
  getInfringementReports,
  getPrivacyAuditLog,
  getPrivacyPreferences,
  getRetentionCleanupCandidates,
  getRetentionSettings,
  savePrivacyPreferences,
  saveRetentionSettings,
  type DeleteDataScope
} from "@/lib/privacyStorage";
import type { InfringementReport, PrivacyAuditLogEntry, PrivacyPreferences, RetentionCleanupCandidate, RetentionSettings } from "@/types";

const deleteActions: Array<{ scope: DeleteDataScope; title: string; description: string; danger?: boolean }> = [
  { scope: "uploads", title: "업로드 파일 삭제", description: "히스토리에 남은 업로드 파일명과 미리보기 참조를 정리합니다." },
  { scope: "generated", title: "생성 결과 삭제", description: "현재 결과와 생성 히스토리를 삭제합니다." },
  { scope: "history", title: "History 삭제", description: "저장된 생성 기록을 삭제합니다." },
  { scope: "personalization", title: "개인 맞춤 학습 데이터 삭제", description: "선택, 복사, 수정 기반 학습 프로필을 삭제합니다." },
  { scope: "exports", title: "내보내기 기록 삭제", description: "다운로드와 SNS 공유 준비 기록을 삭제합니다." },
  { scope: "planning", title: "캠페인과 일정 삭제", description: "캘린더, 캠페인, 아이디어, 앱 내부 알림을 삭제합니다." },
  { scope: "all", title: "전체 계정 데이터 삭제", description: "이 브라우저에 저장된 PostKit 데이터를 모두 삭제합니다. 감사 기록에는 삭제 이벤트만 남깁니다.", danger: true }
];

const privacyToggles: Array<{
  key: keyof Pick<
    PrivacyPreferences,
    | "personalizationLearningAllowed"
    | "contentAutoSaveAllowed"
    | "originalFileStorageAllowed"
    | "analyticsAllowed"
    | "marketingNotificationsAllowed"
  >;
  title: string;
  description: string;
}> = [
  {
    key: "personalizationLearningAllowed",
    title: "개인 맞춤 학습 허용",
    description: "선택, 복사, 수정 행동을 이 브라우저 안의 내 스타일 학습에만 반영합니다."
  },
  {
    key: "contentAutoSaveAllowed",
    title: "콘텐츠 자동 저장",
    description: "생성 결과를 History에 저장해 다시 보기와 내보내기에 사용할 수 있게 합니다."
  },
  {
    key: "originalFileStorageAllowed",
    title: "원본 파일 저장 허용",
    description: "무료 공개 베타 단계에서는 원본 파일을 서버로 보내지 않으며, 기본값은 저장하지 않음입니다."
  },
  {
    key: "analyticsAllowed",
    title: "분석 데이터 허용",
    description: "제품 개선용 집계 분석을 위한 자리만 마련했습니다. 현재 외부 전송은 하지 않습니다."
  },
  {
    key: "marketingNotificationsAllowed",
    title: "마케팅 알림 허용",
    description: "프로모션 안내 수신 여부입니다. 현재 실제 발송 기능은 없습니다."
  }
];

function ToggleRow({
  checked,
  description,
  onChange,
  title
}: {
  checked: boolean;
  description: string;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-start justify-between gap-4 rounded-lg border border-line bg-white p-4">
      <span>
        <span className="block text-sm font-black text-ink">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
      </span>
      <input
        checked={checked}
        className="mt-1 h-5 w-5 shrink-0 accent-coral"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default function PrivacyPage() {
  const [preferences, setPreferences] = useState<PrivacyPreferences>(() => getPrivacyPreferences());
  const [retention, setRetention] = useState<RetentionSettings>(() => getRetentionSettings());
  const [auditLog, setAuditLog] = useState<PrivacyAuditLogEntry[]>([]);
  const [reports, setReports] = useState<InfringementReport[]>([]);
  const [cleanupCandidates, setCleanupCandidates] = useState<RetentionCleanupCandidate[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DeleteDataScope | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reportForm, setReportForm] = useState({
    reportType: "저작권" as InfringementReport["reportType"],
    targetContentId: "",
    targetUrl: "",
    reason: "",
    requestedAction: "삭제 요청"
  });

  const pendingDeleteAction = useMemo(
    () => deleteActions.find((action) => action.scope === pendingDelete),
    [pendingDelete]
  );

  useEffect(() => {
    refreshPrivacyState();

    function handlePrivacyUpdated() {
      refreshPrivacyState();
    }

    window.addEventListener(APP_EVENT_KEYS.privacyUpdated, handlePrivacyUpdated);
    return () => window.removeEventListener(APP_EVENT_KEYS.privacyUpdated, handlePrivacyUpdated);
  }, []);

  function refreshPrivacyState() {
    setPreferences(getPrivacyPreferences());
    setRetention(getRetentionSettings());
    setAuditLog(getPrivacyAuditLog());
    setReports(getInfringementReports());
    setCleanupCandidates(getRetentionCleanupCandidates());
  }

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function updatePreference<K extends keyof PrivacyPreferences>(key: K, value: PrivacyPreferences[K]) {
    const next = savePrivacyPreferences({
      ...preferences,
      [key]: value,
      updatedAt: new Date().toISOString()
    });
    setPreferences(next);
    setAuditLog(getPrivacyAuditLog());
    flash("개인정보 설정을 저장했어요.");
  }

  function updateRetention(value: RetentionSettings["originalFileRetention"]) {
    const next = saveRetentionSettings({
      ...retention,
      originalFileRetention: value,
      updatedAt: new Date().toISOString()
    });
    setRetention(next);
    setCleanupCandidates(getRetentionCleanupCandidates());
    setAuditLog(getPrivacyAuditLog());
    flash("보관 기간 설정을 저장했어요.");
  }

  function handleExportData() {
    const exportData = collectPostKitDataForExport();
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const result = downloadJsonFile(`postkit_privacy_export_${stamp}.json`, exportData);
    setAuditLog(getPrivacyAuditLog());
    flash(result.ok ? "내 데이터를 JSON 파일로 내보냈어요." : result.error ?? "내보내기에 실패했어요.");
  }

  function handleCleanup() {
    const result = cleanupExpiredMockUploads();
    refreshPrivacyState();
    flash(result.deletedCount > 0 ? `${result.deletedCount}개 항목의 업로드 파일 참조를 정리했어요.` : "정리할 만료 대상이 없어요.");
  }

  function handleDeleteConfirmed() {
    if (!pendingDelete) {
      return;
    }

    const result = deleteDataScope(pendingDelete);
    setPendingDelete(null);
    refreshPrivacyState();
    flash(result.message);
  }

  function handleSubmitReport() {
    if (!reportForm.reason.trim()) {
      flash("신고 사유를 입력해 주세요.");
      return;
    }

    addInfringementReport(reportForm);
    setReportForm({
      reportType: "저작권",
      targetContentId: "",
      targetUrl: "",
      reason: "",
      requestedAction: "삭제 요청"
    });
    refreshPrivacyState();
    flash("권리 침해 신고를 이 브라우저에 기록해 접수했어요.");
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/privacy-policy" variant="secondary">
              처리방침 초안
            </LinkButton>
            <LinkButton href="/terms" variant="secondary">
              이용약관 초안
            </LinkButton>
          </div>
        }
        description="개인정보 보호와 콘텐츠 권리 보호 흐름을 이 브라우저(localStorage) 안에서 관리합니다."
        eyebrow="Privacy & Rights"
        title="개인정보 보호센터"
      />

      {feedback ? (
        <div className="mt-5 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          {feedback}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">전체 AI 학습 사용 금지 기본 정책</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                사용자의 업로드 자료와 생성 결과는 기본적으로 서비스 전체 AI 모델 학습에 사용하지 않습니다. 개인 맞춤 학습은 이 사용자 계정과 브라우저 저장소 안에서만 사용하며,
                향후 전체 모델 개선 동의를 추가하더라도 별도 선택 동의로 분리해야 합니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="mint">개인 맞춤: {preferences.personalizationLearningAllowed ? "허용" : "꺼짐"}</Badge>
                <Badge tone="coral">전체 모델 학습: 비동의 기본값</Badge>
                <Badge tone="sky">외부 전송 없음</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky/10 text-sky">
              <LockKeyhole size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">현재 데이터 보관 구조</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                비밀번호, SNS 로그인, API 키를 요구하거나 저장하지 않습니다. 업로드 파일은 서버로 전송하지 않고, 브라우저 미리보기 URL은 화면을 벗어나면 해제합니다.
                실제 서비스 전환 시 서버 접근 제어, 암호화, 삭제 검증, 위탁·국외이전 검토가 필요합니다.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black">수집 데이터와 사용 목적</h2>
            <p className="mt-1 text-sm leading-6 text-muted">현재 MVP는 브라우저 localStorage와 메모리 기반으로만 동작합니다.</p>
          </div>
          <Badge tone="lemon">법률 검토 전 초안</Badge>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {privacyDataInventory.map((item) => (
            <div className="rounded-lg border border-line bg-white p-4" key={item.name}>
              <h3 className="font-black">{item.name}</h3>
              <dl className="mt-3 space-y-2 text-sm leading-6">
                <div>
                  <dt className="font-bold text-muted">사용 목적</dt>
                  <dd>{item.purpose}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted">저장 위치</dt>
                  <dd>{item.storage}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted">보관 기간</dt>
                  <dd>{item.retention}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted">외부 전송 여부</dt>
                  <dd>{item.externalTransfer}</dd>
                </div>
                <div>
                  <dt className="font-bold text-muted">개인 맞춤화 사용</dt>
                  <dd>{item.personalizationUse}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h2 className="text-lg font-black">개인정보 설정</h2>
          <p className="mt-1 text-sm leading-6 text-muted">최소 수집 원칙을 기준으로, 실제 외부 전송 기능은 아직 연결하지 않았습니다.</p>

          <div className="mt-5 space-y-3">
            {privacyToggles.map((toggle) => (
              <ToggleRow
                checked={Boolean(preferences[toggle.key])}
                description={toggle.description}
                key={toggle.key}
                onChange={(value) => updatePreference(toggle.key, value)}
                title={toggle.title}
              />
            ))}

            <div className="rounded-lg border border-line bg-wash p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black">전체 모델 개선 학습 동의</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    현재는 사용하지 않으며 기본값은 비동의입니다. 향후 도입 시 개인 맞춤 학습과 별개의 선택 동의로 분리해야 합니다.
                  </p>
                </div>
                <input checked={false} className="mt-1 h-5 w-5 shrink-0 accent-coral" disabled type="checkbox" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">데이터 보관 기간</h2>
          <p className="mt-1 text-sm leading-6 text-muted">베타 단계에서는 만료 대상 표시와 업로드 파일 참조 정리만 제공합니다.</p>

          <label className="mt-5 block">
            <span className="field-label">원본 파일 보관 기간</span>
            <select
              className="field"
              onChange={(event) => updateRetention(event.target.value as RetentionSettings["originalFileRetention"])}
              value={retention.originalFileRetention}
            >
              {retentionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 rounded-lg border border-line bg-white p-4">
            <p className="text-sm font-black">정리 대상</p>
            {cleanupCandidates.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                {cleanupCandidates.slice(0, 5).map((candidate) => (
                  <li key={candidate.id}>
                    <span className="font-bold text-ink">{candidate.label}</span> · {candidate.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">현재 표시할 만료 대상이 없어요.</p>
            )}
            <Button className="mt-4 w-full sm:w-auto" onClick={handleCleanup} type="button" variant="secondary">
              <RefreshCw size={16} aria-hidden="true" />
              만료 대상 정리
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black">데이터 내보내기와 삭제</h2>
            <p className="mt-1 text-sm leading-6 text-muted">삭제 전 확인 절차를 거치며, 이 브라우저의 localStorage에 저장된 데이터를 기준으로 처리합니다.</p>
          </div>
          <Button onClick={handleExportData} type="button" variant="secondary">
            <Download size={16} aria-hidden="true" />
            내 데이터 내보내기
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {deleteActions.map((action) => (
            <div className="rounded-lg border border-line bg-white p-4" key={action.scope}>
              <h3 className="font-black">{action.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{action.description}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => setPendingDelete(action.scope)}
                type="button"
                variant={action.danger ? "danger" : "secondary"}
              >
                <Trash2 size={16} aria-hidden="true" />
                삭제
              </Button>
            </div>
          ))}
        </div>

        {pendingDeleteAction ? (
          <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="font-black text-red-700">{pendingDeleteAction.title}을(를) 진행할까요?</p>
            <p className="mt-2 text-sm leading-6 text-red-700">{pendingDeleteAction.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setPendingDelete(null)} type="button" variant="secondary">
                취소
              </Button>
              <Button onClick={handleDeleteConfirmed} type="button" variant="danger">
                삭제 확인
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-lemon/20 text-yellow-700">
              <AlertTriangle size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">저작권 및 권리 안내</h2>
              <div className="mt-2 space-y-2 text-sm leading-6 text-muted">
                <p>AI 생성 결과의 독점적 저작권이나 상업적 이용 가능성이 항상 보장되는 것은 아닙니다.</p>
                <p>사용자는 업로드 원본에 대한 권리를 계속 보유하며, PostKit에는 서비스 제공에 필요한 제한적 처리 권한만 부여되는 것으로 안내합니다.</p>
                <p>최종 게시 전 광고주 요구사항, 플랫폼 정책, 관련 기준은 사용자가 직접 확인해야 합니다.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">권리 침해 신고 및 삭제 요청</h2>
          <p className="mt-1 text-sm leading-6 text-muted">현재는 신고 상태를 이 브라우저(localStorage)에 저장합니다.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">신고 유형</span>
              <select
                className="field"
                onChange={(event) => setReportForm((current) => ({ ...current, reportType: event.target.value as InfringementReport["reportType"] }))}
                value={reportForm.reportType}
              >
                {["저작권", "초상권", "상표권", "기타"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="field-label">요청 조치</span>
              <input
                className="field"
                onChange={(event) => setReportForm((current) => ({ ...current, requestedAction: event.target.value }))}
                value={reportForm.requestedAction}
              />
            </label>

            <label>
              <span className="field-label">콘텐츠 ID</span>
              <input
                className="field"
                onChange={(event) => setReportForm((current) => ({ ...current, targetContentId: event.target.value }))}
                placeholder="선택 입력"
                value={reportForm.targetContentId}
              />
            </label>

            <label>
              <span className="field-label">관련 URL</span>
              <input
                className="field"
                onChange={(event) => setReportForm((current) => ({ ...current, targetUrl: event.target.value }))}
                placeholder="선택 입력"
                value={reportForm.targetUrl}
              />
            </label>

            <label className="sm:col-span-2">
              <span className="field-label">신고 사유</span>
              <textarea
                className="field min-h-28 resize-none"
                onChange={(event) => setReportForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="권리 침해로 판단한 이유를 입력하세요. 민감한 개인정보 원문은 넣지 않는 것을 권장합니다."
                value={reportForm.reason}
              />
            </label>
          </div>

          <Button className="mt-4 w-full sm:w-auto" onClick={handleSubmitReport} type="button">
            <FileText size={16} aria-hidden="true" />
            신고 접수
          </Button>

          <div className="mt-5 space-y-2">
            {reports.length > 0 ? (
              reports.slice(0, 4).map((report) => (
                <div className="rounded-lg border border-line bg-wash p-3 text-sm" key={report.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black">{report.reportType}</span>
                    <Badge tone="lemon">{report.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted">{formatDate(report.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-line bg-wash p-3 text-sm text-muted">아직 접수된 신고가 없습니다.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-lg font-black">미성년자 및 민감정보 안내</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted">
            <p>서비스 기본 이용 연령은 만 14세 이상으로 안내합니다. 만 14세 미만 사용자는 법정대리인 동의 절차가 필요하며, 실제 연령 인증 절차는 아직 제공하지 않습니다.</p>
            <p>주민등록번호, 계좌번호, 신분증, 건강·의료 정보, 상세 주소, 타인의 연락처, 미성년자 개인정보는 업로드하지 않도록 안내합니다.</p>
            <p>현재 자동 탐지 기능은 제공하지 않으며, 민감정보 방지 문구는 사용자가 업로드 전 확인하는 안내 수준입니다.</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">개인정보 감사 기록</h2>
          <p className="mt-1 text-sm leading-6 text-muted">감사 기록에는 실제 사진, 캡션, 개인정보 원문을 저장하지 않고 이벤트 종류와 시각만 남깁니다.</p>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {auditLog.length > 0 ? (
              auditLog.slice(0, 12).map((entry) => (
                <div className="rounded-lg border border-line bg-white p-3 text-sm" key={entry.id}>
                  <p className="font-black">{entry.eventType}</p>
                  <p className="mt-1 text-muted">{formatDate(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-line bg-white p-3 text-sm text-muted">아직 개인정보 처리 이벤트가 없습니다.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-lg font-black">localStorage 키</h2>
        <p className="mt-1 text-sm leading-6 text-muted">손상된 JSON은 기본값으로 복구하거나 해당 키를 제거해 앱이 멈추지 않게 처리합니다.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {privacyStorageKeys.map((key) => (
            <Badge key={key} tone="sky">
              {key}
            </Badge>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
