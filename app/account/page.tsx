"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserRound
} from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  deleteAllAccountData,
  exportAccountData,
  validateAccountImportPayload,
  importAccountData
} from "@/lib/accountStorage";
import { getCreditAccount } from "@/lib/creditStorage";
import { downloadJsonFile } from "@/lib/downloadUtils";
import { getLearningActionCount, getPersonalizationLevel } from "@/lib/personalization";
import { getPrivacyPreferences } from "@/lib/privacyStorage";
import { getPersonalizationProfile } from "@/lib/storage";
import type { AccountDataExport, CreditAccount, PersonalizationProfile, PrivacyPreferences } from "@/types";

export default function AccountPage() {
  const [creditAccount, setCreditAccount] = useState<CreditAccount | null>(null);
  const [personalization, setPersonalization] = useState<PersonalizationProfile | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyPreferences | null>(null);
  const [message, setMessage] = useState("");
  const [importPayload, setImportPayload] = useState<AccountDataExport | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh(nextMessage = "") {
    setCreditAccount(getCreditAccount({ applyMonthlyGrant: false }));
    setPersonalization(getPersonalizationProfile());
    setPrivacy(getPrivacyPreferences());
    if (nextMessage) {
      setMessage(nextMessage);
      window.setTimeout(() => setMessage(""), 2400);
    }
  }

  function handleExport() {
    downloadJsonFile(`postkit_account_export_${Date.now()}.json`, exportAccountData());
    setMessage("데이터를 JSON 파일로 내보냈어요. 원본 이미지, 토큰, 비밀번호는 포함되지 않습니다.");
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const validation = validateAccountImportPayload(parsed);
      if (!validation.ok || !validation.payload) {
        setImportPayload(null);
        setImportMessage(validation.message);
        return;
      }

      setImportPayload(validation.payload);
      setImportMessage(validation.message);
    } catch {
      setImportPayload(null);
      setImportMessage("JSON 파일을 읽지 못했어요.");
    }
  }

  function handleImport(mode: "merge" | "replace") {
    if (!importPayload) return;

    if (mode === "replace") {
      downloadJsonFile(`postkit_backup_before_import_${Date.now()}.json`, exportAccountData());
    }

    const result = importAccountData(importPayload, mode);
    setImportMessage(result.ok ? `${mode === "merge" ? "병합" : "교체"} 가져오기를 완료했어요.` : result.error ?? "가져오기에 실패했어요.");
    setImportPayload(null);
    refresh();
  }

  function handleDeleteAll() {
    if (deleteText !== "삭제") {
      setMessage("삭제를 진행하려면 확인 문구에 '삭제'를 입력해 주세요.");
      return;
    }

    deleteAllAccountData();
    setDeleteConfirmOpen(false);
    setDeleteText("");
    refresh("이 브라우저에 저장된 PostKit 데이터를 모두 삭제했어요.");
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Button onClick={handleExport} type="button" variant="secondary">
            <Download size={17} aria-hidden="true" />
            데이터 내보내기
          </Button>
        }
        description="PostKit은 무료 공개 베타 서비스입니다. 회원가입 없이 사용할 수 있고, 모든 데이터는 이 브라우저에만 저장됩니다."
        eyebrow="Account"
        title="내 데이터 관리"
      />

      {message ? (
        <div className="mt-5 flex min-w-0 items-start gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span className="min-w-0 break-keep">{message}</span>
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <UserRound size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="break-keep text-xl font-black">무료 공개 베타 사용자</h2>
              <p className="mt-1 text-sm leading-6 text-muted">로그인 없이 바로 사용하는 베타 버전입니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="lemon">이 브라우저에만 저장</Badge>
                <Badge tone="sky">회원가입 없음</Badge>
                <Badge tone="coral">비밀번호 저장 없음</Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-lemon/30 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
            생성 결과, 히스토리, 설정은 이 브라우저의 저장 공간(localStorage)에만 보관됩니다. 브라우저 데이터를 삭제하면
            복구할 수 없고, PC와 모바일 사이에 자동 동기화되지 않습니다. 중요한 결과는 아래에서 JSON으로 내보내 보관하세요.
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky/10 text-sky">
              <Database size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">저장 위치와 동기화</h2>
              <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-2">
                <span className="rounded-lg bg-wash px-3 py-2">저장 위치: 이 브라우저</span>
                <span className="rounded-lg bg-wash px-3 py-2">서버 저장: 없음</span>
                <span className="rounded-lg bg-wash px-3 py-2">기기 간 동기화: 없음</span>
                <span className="rounded-lg bg-wash px-3 py-2">클라우드 백업: 준비 중</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                실제 계정과 클라우드 저장은 정식 출시 단계에서 제공할 예정입니다.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-black">현재 플랜</h2>
          <p className="mt-2 text-3xl font-black text-coral">무료 공개 베타</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {creditAccount
              ? `체험 크레딧 ${creditAccount.totalCreditBalance.toLocaleString()} 남음`
              : "체험 크레딧을 불러오는 중입니다."}
          </p>
          <Badge className="mt-4" tone="lemon">결제 없음 · 유료 플랜 준비 중</Badge>
        </Card>

        <Card>
          <h2 className="text-lg font-black">내 스타일 학습</h2>
          <p className="mt-2 text-3xl font-black text-coral">
            {personalization ? getPersonalizationLevel(personalization) : "—"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {personalization
              ? `최근 학습 행동 ${getLearningActionCount(personalization).toLocaleString()}개가 이 브라우저 안에 저장되어 있습니다.`
              : "학습 상태를 불러오는 중입니다."}
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-black">개인정보 설정</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {privacy ? (
              <>
                <Badge tone={privacy.personalizationLearningAllowed ? "mint" : "lemon"}>
                  내 스타일 학습 {privacy.personalizationLearningAllowed ? "허용" : "꺼짐"}
                </Badge>
                <Badge tone={privacy.contentAutoSaveAllowed ? "mint" : "lemon"}>
                  자동 저장 {privacy.contentAutoSaveAllowed ? "허용" : "꺼짐"}
                </Badge>
              </>
            ) : (
              <Badge tone="sky">설정 불러오는 중</Badge>
            )}
            <Badge tone="coral">전체 AI 학습에 사용 안 함</Badge>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <Smartphone size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="break-keep text-lg font-black">모바일에서 앱처럼 사용하기</h2>
            <p className="mt-2 break-keep text-sm leading-6 text-muted">
              모바일 브라우저 메뉴에서 홈 화면에 추가하면 PostKit을 앱처럼 열 수 있습니다. 다만 기기마다 데이터가 따로
              저장되므로, PC에서 만든 결과는 모바일에 나타나지 않습니다.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="text-lg font-black">데이터 내보내기와 가져오기</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          비밀번호, 인증 토큰, API 키, 결제 정보, 원본 이미지 파일은 내보내기 대상이 아닙니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={handleExport} type="button" variant="secondary">
            <Download size={16} aria-hidden="true" />
            JSON 내보내기
          </Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold hover:border-coral/50 hover:bg-blush/50">
            <Upload size={16} aria-hidden="true" />
            JSON 가져오기
            <input accept="application/json,.json" className="sr-only" onChange={handleImportFile} type="file" />
          </label>
        </div>

        {importMessage ? (
          <div className="mt-4 rounded-lg border border-line bg-wash p-3 text-sm font-bold text-muted">{importMessage}</div>
        ) : null}

        {importPayload ? (
          <div className="mt-4 rounded-lg border border-lemon/30 bg-yellow-50 p-4">
            <p className="text-sm font-black text-yellow-800">가져오기 방식 선택</p>
            <p className="mt-1 text-sm leading-6 text-yellow-800">
              교체 가져오기는 먼저 현재 데이터를 백업 JSON으로 다운로드한 뒤 진행합니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => handleImport("merge")} type="button" variant="secondary">기존 데이터와 병합</Button>
              <Button onClick={() => handleImport("replace")} type="button" variant="danger">백업 후 교체</Button>
              <Button onClick={() => setImportPayload(null)} type="button" variant="ghost">취소</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black">데이터 보호 원칙</h2>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-muted">
              <li>- 비밀번호, 인증 토큰, API 키, 결제 정보는 저장하지 않습니다.</li>
              <li>- 업로드한 사진과 영상 원본은 서버로 전송하지 않고, 브라우저를 닫으면 사라집니다.</li>
              <li>- 생성 결과와 설정은 언제든지 아래에서 전부 삭제할 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="mt-5 border-red-100 bg-red-50/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-red-600">
              <AlertTriangle size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-red-700">전체 데이터 삭제</h2>
              <p className="mt-2 text-sm leading-6 text-red-700">
                이 브라우저에 저장된 PostKit 데이터(생성 결과, 히스토리, 설정, 체험 크레딧 기록)를 모두 삭제합니다.
              </p>
            </div>
          </div>
          <Button onClick={() => setDeleteConfirmOpen(true)} type="button" variant="danger">
            <Trash2 size={16} aria-hidden="true" />
            전체 삭제
          </Button>
        </div>

        {deleteConfirmOpen ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-white p-4">
            <p className="font-black text-red-700">삭제 전 데이터를 내보낸 뒤 진행하는 것을 권장합니다.</p>
            <p className="mt-2 text-sm leading-6 text-red-700">
              확인 문구에 <span className="font-black">삭제</span>를 입력하면 모든 데이터를 지우고 초기 상태로 돌아갑니다.
            </p>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                aria-label="삭제 확인 문구"
                className="field"
                onChange={(event) => setDeleteText(event.target.value)}
                placeholder="삭제"
                value={deleteText}
              />
              <Button onClick={handleExport} type="button" variant="secondary">먼저 내보내기</Button>
              <Button disabled={deleteText !== "삭제"} onClick={handleDeleteAll} type="button" variant="danger">삭제 확인</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </AppShell>
  );
}
