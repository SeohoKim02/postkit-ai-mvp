"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Database,
  Download,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  addMockWorkspaceMember,
  createTestAccount,
  createWorkspace,
  deleteAllAccountData,
  exportAccountData,
  getCurrentAccount,
  getCurrentWorkspace,
  getStorageSummary,
  getUserAccounts,
  getWorkspaceMembers,
  getWorkspaces,
  importAccountData,
  initializeAccountStorage,
  logoutToGuest,
  removeWorkspaceMember,
  switchAccount,
  updateWorkspaceMemberRole,
  updateWorkspaceName,
  validateAccountImportPayload
} from "@/lib/accountStorage";
import { getCreditAccount } from "@/lib/creditStorage";
import { downloadJsonFile } from "@/lib/downloadUtils";
import { getLearningActionCount, getPersonalizationLevel } from "@/lib/personalization";
import { getPrivacyPreferences } from "@/lib/privacyStorage";
import { getPersonalizationProfile } from "@/lib/storage";
import type { AccountDataExport, AccountType, UserAccount, Workspace, WorkspaceMember, WorkspaceRole, WorkspaceType } from "@/types";

const accountTypes: AccountType[] = ["개인 계정", "인플루언서", "광고/제휴 계정", "쇼핑몰/브랜드", "소상공인", "마케팅 대행사"];
const workspaceTypes: Array<{ value: WorkspaceType; label: string }> = [
  { value: "personal", label: "개인" },
  { value: "creator", label: "크리에이터" },
  { value: "brand", label: "브랜드" },
  { value: "business", label: "비즈니스" },
  { value: "agency", label: "대행사" }
];
const roleOptions: WorkspaceRole[] = ["owner", "admin", "editor", "viewer"];

function formatDate(value: string | undefined) {
  if (!value) return "기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function roleDescription(role: WorkspaceRole) {
  if (role === "owner") return "모든 데이터, 플랜, 멤버 관리";
  if (role === "admin") return "콘텐츠와 캠페인 관리, 일부 멤버 관리";
  if (role === "editor") return "콘텐츠 생성·수정·내보내기";
  return "보기와 다운로드만 가능";
}

export default function AccountPage() {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [message, setMessage] = useState("");
  const [testName, setTestName] = useState("PostKit Test User");
  const [testType, setTestType] = useState<AccountType>("인플루언서");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("business");
  const [memberName, setMemberName] = useState("Mock Editor");
  const [memberRole, setMemberRole] = useState<WorkspaceRole>("editor");
  const [importPayload, setImportPayload] = useState<AccountDataExport | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const summary = useMemo(() => getStorageSummary(), [accounts, workspaces, members, message]);
  const currentAccount = summary.account;
  const currentWorkspace = summary.workspace;
  const creditAccount = getCreditAccount({ applyMonthlyGrant: false });
  const personalization = getPersonalizationProfile();
  const privacy = getPrivacyPreferences();
  const workspaceMembers = members.filter((member) => member.workspaceId === currentWorkspace.id && member.status !== "removed");
  const businessWorkspaceVisible = ["Business", "Agency"].includes(creditAccount.currentPlan) || ["business", "agency"].includes(currentWorkspace.type);

  useEffect(() => {
    refresh();
  }, []);

  function refresh(nextMessage = "") {
    initializeAccountStorage();
    setAccounts(getUserAccounts());
    setWorkspaces(getWorkspaces());
    setMembers(getWorkspaceMembers());
    setWorkspaceName(getCurrentWorkspace().name);
    if (nextMessage) {
      setMessage(nextMessage);
      window.setTimeout(() => setMessage(""), 2200);
    }
  }

  function handleCreateTestAccount() {
    createTestAccount({ displayName: testName, accountType: testType });
    refresh("브라우저 내부 mock 테스트 계정을 만들고 전환했어요. 실제 회원가입은 아닙니다.");
  }

  function handleSwitchAccount(userId: string) {
    switchAccount(userId);
    refresh("테스트 계정을 전환했어요. 실제 서버 세션은 생성하지 않았습니다.");
  }

  function handleLogout() {
    logoutToGuest();
    refresh("게스트 모드로 전환했어요.");
  }

  function handleExport() {
    downloadJsonFile(`postkit_account_export_${Date.now()}.json`, exportAccountData());
    setMessage("계정 데이터를 JSON으로 내보냈어요. 원본 이미지 Blob, 토큰, 비밀번호는 포함하지 않습니다.");
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

  function handleWorkspaceSave() {
    updateWorkspaceName(currentWorkspace.id, workspaceName);
    refresh("워크스페이스 이름을 저장했어요.");
  }

  function handleCreateWorkspace() {
    createWorkspace({ name: workspaceName || "새 비즈니스 워크스페이스", type: workspaceType });
    refresh("mock 워크스페이스를 만들었어요. 실제 팀 동기화는 아직 연결하지 않았습니다.");
  }

  function handleAddMember() {
    addMockWorkspaceMember({ workspaceId: currentWorkspace.id, displayName: memberName, role: memberRole });
    refresh("mock 멤버를 추가했어요. 실제 이메일 초대는 보내지 않았습니다.");
  }

  function handleDeleteAll() {
    if (deleteText !== "삭제") {
      setMessage("삭제를 진행하려면 확인 문구에 '삭제'를 입력해 주세요.");
      return;
    }

    deleteAllAccountData();
    setDeleteConfirmOpen(false);
    setDeleteText("");
    refresh("전체 mock 계정 데이터를 삭제하고 게스트 모드로 초기화했어요.");
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Button onClick={handleExport} type="button" variant="secondary">
            <Download size={17} aria-hidden="true" />
            계정 데이터 내보내기
          </Button>
        }
        description="현재는 테스트 계정 모드입니다. 실제 로그인과 클라우드 저장은 배포 단계에서 연결됩니다. 지금은 브라우저 localStorage 데이터를 향후 백엔드 계정 구조로 옮기기 위한 mock 계정 준비 화면입니다."
        eyebrow="Account"
        title="계정과 데이터 저장"
      />

      {message ? (
        <div className="mt-5 flex min-w-0 items-start gap-2 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span className="min-w-0 break-keep">{message}</span>
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
                <UserRound size={24} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="break-keep text-xl font-black">{currentAccount.displayName}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {summary.session.mode === "guest" ? "게스트 모드" : "브라우저 내부 테스트 계정"} · {currentAccount.accountType}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={summary.session.mode === "guest" ? "lemon" : "mint"}>
                    {summary.session.mode === "guest" ? "이 브라우저에만 저장" : "mock 테스트 계정"}
                  </Badge>
                  <Badge tone="sky">실제 인증 없음</Badge>
                  <Badge tone="coral">비밀번호 저장 없음</Badge>
                </div>
              </div>
            </div>
            <Button className="w-full sm:w-auto" onClick={handleLogout} type="button" variant="secondary">
              <LogOut size={16} aria-hidden="true" />
              게스트로 전환
            </Button>
          </div>

          <div className="mt-5 rounded-lg border border-lemon/30 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
            현재 데이터는 이 브라우저 localStorage에만 저장됩니다. 브라우저 데이터를 삭제하면 복구할 수 없고, 실제 계정 연결 후 여러 기기 동기화가 가능해질 예정입니다.
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky/10 text-sky">
              <Database size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="break-keep text-lg font-black">저장 위치와 동기화 상태</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{summary.storage.active.message}</p>
              <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-2">
                <span className="rounded-lg bg-wash px-3 py-2">마지막 활동: {formatDate(summary.session.lastActiveAt)}</span>
                <span className="rounded-lg bg-wash px-3 py-2">동기화 대기: {summary.pendingSyncCount}개</span>
                <span className="rounded-lg bg-wash px-3 py-2">동기화 상태: {summary.preferences.syncEnabled ? "mock 대기" : "비활성"}</span>
                <span className="rounded-lg bg-wash px-3 py-2">Cloud: 연결 안 됨</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-black">현재 플랜</h2>
          <p className="mt-2 text-3xl font-black text-coral">{creditAccount.currentPlan}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            총 {creditAccount.totalCreditBalance.toLocaleString()} 크레딧 · 구독 {creditAccount.subscriptionCreditBalance.toLocaleString()} · 구매 {creditAccount.purchasedCreditBalance.toLocaleString()}
          </p>
          <Badge className="mt-4" tone="lemon">실제 결제 연결 없음</Badge>
        </Card>

        <Card>
          <h2 className="text-lg font-black">개인화 상태</h2>
          <p className="mt-2 text-3xl font-black text-coral">{getPersonalizationLevel(personalization)}</p>
          <p className="mt-2 text-sm leading-6 text-muted">최근 학습 행동 {getLearningActionCount(personalization).toLocaleString()}개가 이 브라우저 안에 저장되어 있습니다.</p>
        </Card>

        <Card>
          <h2 className="text-lg font-black">개인정보 설정</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={privacy.personalizationLearningAllowed ? "mint" : "lemon"}>내 스타일 학습 {privacy.personalizationLearningAllowed ? "허용" : "꺼짐"}</Badge>
            <Badge tone={privacy.contentAutoSaveAllowed ? "mint" : "lemon"}>자동 저장 {privacy.contentAutoSaveAllowed ? "허용" : "꺼짐"}</Badge>
            <Badge tone="coral">전체 AI 학습 비동의</Badge>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-keep text-lg font-black">실행 환경 점검</h2>
            <p className="mt-1 text-sm leading-6 text-muted">브라우저 기능, localStorage 무결성, 크레딧 원장, 데모 데이터 상태를 진단센터에서 확인할 수 있습니다.</p>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:[&>*]:w-auto [&>*]:w-full">
            <LinkButton href="/diagnostics" variant="secondary">진단센터 열기</LinkButton>
            <LinkButton href="/demo" variant="soft">데모 흐름 보기</LinkButton>
          </div>
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <Smartphone size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="break-keep text-lg font-black">모바일 앱처럼 사용하기</h2>
            <p className="mt-2 break-keep text-sm leading-6 text-muted">
              배포 URL로 접속한 뒤 모바일 브라우저 메뉴에서 홈 화면에 추가하면 PostKit을 앱처럼 열 수 있습니다. 실제 설치 강제 팝업은 제공하지 않습니다.
            </p>
          </div>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-wash p-3">
            <p className="text-sm font-black">접속</p>
            <p className="mt-1 text-sm leading-6 text-muted">Vercel, Netlify, Cloudflare Pages 같은 배포 URL을 Chrome, Edge, Samsung Internet, Safari에서 엽니다.</p>
          </div>
          <div className="rounded-lg bg-wash p-3">
            <p className="text-sm font-black">홈 화면 추가</p>
            <p className="mt-1 text-sm leading-6 text-muted">브라우저 공유 또는 메뉴에서 홈 화면에 추가를 선택합니다. 현재 단계에서는 브라우저 기본 설치 흐름을 사용합니다.</p>
          </div>
          <div className="rounded-lg bg-wash p-3">
            <p className="text-sm font-black">데이터 범위</p>
            <p className="mt-1 text-sm leading-6 text-muted">현재는 테스트 계정과 localStorage 기반이라 PC와 휴대폰 데이터가 자동 동기화되지 않고 기기별로 분리될 수 있습니다.</p>
          </div>
          <div className="rounded-lg bg-wash p-3">
            <p className="text-sm font-black">향후 연결</p>
            <p className="mt-1 text-sm leading-6 text-muted">실제 로그인, DB, 클라우드 저장은 배포 이후 별도 단계에서 연결할 예정입니다.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="sky">PWA manifest 준비</Badge>
          <Badge tone="lemon">기기별 localStorage</Badge>
          <Badge tone="mint">설치 팝업 없음</Badge>
          <Badge tone="coral">실제 로그인 미연결</Badge>
        </div>
      </Card>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <h2 className="break-keep text-lg font-black">로그인 준비용 mock 계정</h2>
          <p className="mt-1 break-keep text-sm leading-6 text-muted">실제 회원가입, 로그인, 이메일 인증이 아니라 이 브라우저 안에서만 쓰는 테스트 계정을 만듭니다.</p>
          <div className="mt-5 grid gap-3">
            <label>
              <span className="field-label">표시 이름</span>
              <input className="field" onChange={(event) => setTestName(event.target.value)} value={testName} />
            </label>
            <label>
              <span className="field-label">계정 유형</span>
              <select className="field" onChange={(event) => setTestType(event.target.value as AccountType)} value={testType}>
                {accountTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <Button onClick={handleCreateTestAccount} type="button">
              <UserPlus size={17} aria-hidden="true" />
              테스트 계정 만들기
            </Button>
          </div>

          <div className="mt-5 min-w-0 space-y-2">
            {accounts.map((account) => (
              <button
                className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm font-bold transition ${
                  account.id === currentAccount.id ? "border-coral bg-blush text-coral" : "border-line bg-white hover:border-coral/40"
                }`}
                key={account.id}
                onClick={() => handleSwitchAccount(account.id)}
                type="button"
              >
                <span className="min-w-0 break-keep">{account.displayName}</span>
                <span className="text-xs text-muted">{account.id === "guest-local-user" ? "guest" : "test"}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-black">데이터 내보내기와 가져오기</h2>
          <p className="mt-1 text-sm leading-6 text-muted">비밀번호, 인증 토큰, API 키, 결제 카드 정보, 원본 이미지 Blob은 내보내기 대상이 아닙니다.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={handleExport} type="button" variant="secondary">
              <Download size={16} aria-hidden="true" />
              JSON 내보내기
            </Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold hover:border-coral/50 hover:bg-blush/50">
              <Upload size={16} aria-hidden="true" />
              JSON 선택
              <input accept="application/json,.json" className="sr-only" onChange={handleImportFile} type="file" />
            </label>
          </div>

          {importMessage ? (
            <div className="mt-4 rounded-lg border border-line bg-wash p-3 text-sm font-bold text-muted">{importMessage}</div>
          ) : null}

          {importPayload ? (
            <div className="mt-4 rounded-lg border border-lemon/30 bg-yellow-50 p-4">
              <p className="text-sm font-black text-yellow-800">가져오기 방식 선택</p>
              <p className="mt-1 text-sm leading-6 text-yellow-800">교체 가져오기는 먼저 현재 데이터를 백업 JSON으로 다운로드한 뒤 진행합니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => handleImport("merge")} type="button" variant="secondary">기존 데이터와 병합</Button>
                <Button onClick={() => handleImport("replace")} type="button" variant="danger">백업 후 교체</Button>
                <Button onClick={() => setImportPayload(null)} type="button" variant="ghost">취소</Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">워크스페이스</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Business와 Agency 전환을 대비한 mock 구조입니다. 실제 팀 초대 이메일은 보내지 않습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={businessWorkspaceVisible ? "mint" : "lemon"}>{businessWorkspaceVisible ? "팀 UI 표시" : "개인/크리에이터 모드"}</Badge>
            <Badge tone="sky">{currentWorkspace.type}</Badge>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <label>
              <span className="field-label">워크스페이스 이름</span>
              <input className="field" onChange={(event) => setWorkspaceName(event.target.value)} value={workspaceName} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleWorkspaceSave} type="button" variant="secondary">
                <RefreshCw size={16} aria-hidden="true" />
                이름 저장
              </Button>
              <select className="field w-full min-[430px]:max-w-[220px]" onChange={(event) => setWorkspaceType(event.target.value as WorkspaceType)} value={workspaceType}>
                {workspaceTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <Button onClick={handleCreateWorkspace} type="button" variant="soft">워크스페이스 생성</Button>
            </div>

            <div className="rounded-lg border border-line bg-wash p-3 text-sm leading-6 text-muted">
              워크스페이스 {workspaces.length}개 · 현재 {currentWorkspace.name}
            </div>
          </div>

          <div>
            <h3 className="font-black">mock 멤버와 역할</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
              <input className="field" onChange={(event) => setMemberName(event.target.value)} value={memberName} />
              <select className="field" onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)} value={memberRole}>
                {roleOptions.filter((role) => role !== "owner").map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <Button onClick={handleAddMember} type="button" variant="secondary">
                <Users size={16} aria-hidden="true" />
                추가
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {workspaceMembers.map((member) => (
                <div className="rounded-lg border border-line bg-white p-3" key={member.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black">{member.displayName}</p>
                      <p className="mt-1 text-xs font-bold text-muted">{roleDescription(member.role)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="field min-h-10 max-w-[140px] py-1"
                        disabled={member.role === "owner"}
                        onChange={(event) => {
                          updateWorkspaceMemberRole(member.id, event.target.value as WorkspaceRole);
                          refresh("멤버 역할을 변경했어요.");
                        }}
                        value={member.role}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      {member.role !== "owner" ? (
                        <Button
                          className="min-h-10 px-3 py-1"
                          onClick={() => {
                            removeWorkspaceMember(member.id);
                            refresh("mock 멤버를 제거했어요.");
                          }}
                          type="button"
                          variant="danger"
                        >
                          제거
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky/10 text-sky">
              <CloudOff size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">클라우드 동기화 준비 상태</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                SyncQueue는 localStorage에 기록되지만 실제 서버 요청은 보내지 않습니다. 충돌은 향후 로컬 버전 또는 클라우드 버전을 사용자가 고르는 방식으로 준비합니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="lemon">실제 클라우드 미연결</Badge>
                <Badge tone="sky">대기 {summary.pendingSyncCount}개</Badge>
                <Badge tone={summary.failedSyncCount ? "coral" : "mint"}>충돌/실패 {summary.failedSyncCount}개</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">보안 원칙</h2>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-muted">
                <li>- 비밀번호, 인증 토큰, API 키, 결제 정보는 저장하지 않습니다.</li>
                <li>- mock userId와 workspaceId는 실제 서버 권한으로 신뢰하면 안 됩니다.</li>
                <li>- 실제 운영에서는 서버 세션, 권한 검증, 감사 로그, 삭제 검증이 필요합니다.</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 border-red-100 bg-red-50/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-red-600">
              <AlertTriangle size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-red-700">전체 계정 데이터 삭제</h2>
              <p className="mt-2 text-sm leading-6 text-red-700">
                이 브라우저의 PostKit mock 데이터를 삭제합니다. 실제 서비스에서는 서버 데이터 삭제와 백업 삭제 검증이 별도로 필요합니다.
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
            <p className="mt-2 text-sm leading-6 text-red-700">확인 문구에 <span className="font-black">삭제</span>를 입력하면 전체 mock 데이터를 지우고 게스트 상태로 초기화합니다.</p>
              <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input className="field" onChange={(event) => setDeleteText(event.target.value)} placeholder="삭제" value={deleteText} />
              <Button onClick={handleExport} type="button" variant="secondary">먼저 내보내기</Button>
              <Button disabled={deleteText !== "삭제"} onClick={handleDeleteAll} type="button" variant="danger">삭제 확인</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </AppShell>
  );
}
