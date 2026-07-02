import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { DiagnosticCategory, DiagnosticStatus, QaChecklistItem } from "@/types";

export const diagnosticsVersion = 1;
export const diagnosticsAppVersion = "postkit-mvp-diagnostics-v1";

export const diagnosticStatuses: DiagnosticStatus[] = ["정상", "확인 필요", "오류", "미지원", "미구현", "실행 전"];

export const diagnosticCategories: DiagnosticCategory[] = [
  "앱 환경",
  "브라우저 지원 기능",
  "라우트 상태",
  "저장 데이터 상태",
  "크레딧 상태",
  "계정·워크스페이스 상태",
  "개인화 상태",
  "AI 서비스 상태",
  "Studio·Canvas 상태",
  "Video Studio 상태",
  "내보내기·공유 상태",
  "개인정보 설정 상태",
  "전체 사용자 흐름 체크리스트"
];

export const managedRoutes = [
  { path: "/", label: "Landing" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/create", label: "Create" },
  { path: "/results", label: "Results" },
  { path: "/history", label: "History" },
  { path: "/pricing", label: "Pricing" },
  { path: "/settings", label: "Settings" },
  { path: "/export", label: "Export Center" },
  { path: "/studio", label: "Studio" },
  { path: "/video-studio", label: "Video Studio" },
  { path: "/calendar", label: "Calendar" },
  { path: "/campaigns", label: "Campaigns" },
  { path: "/privacy", label: "Privacy Center" },
  { path: "/privacy-policy", label: "Privacy Policy Draft" },
  { path: "/terms", label: "Terms Draft" },
  { path: "/account", label: "Account" },
  { path: "/diagnostics", label: "Diagnostics" },
  { path: "/demo", label: "Demo Flow" }
] as const;

export const expectedStorageShapes: Record<string, "array" | "object" | "any"> = {
  [STORAGE_KEYS.account]: "object",
  [STORAGE_KEYS.brandProfile]: "object",
  [STORAGE_KEYS.history]: "array",
  [STORAGE_KEYS.currentResult]: "object",
  [STORAGE_KEYS.createPrefill]: "object",
  [STORAGE_KEYS.personalizationProfile]: "object",
  [STORAGE_KEYS.creditAccount]: "object",
  [STORAGE_KEYS.creditLedger]: "array",
  [STORAGE_KEYS.exportHistory]: "array",
  [STORAGE_KEYS.exportPreferences]: "object",
  [STORAGE_KEYS.contentSchedules]: "array",
  [STORAGE_KEYS.campaigns]: "array",
  [STORAGE_KEYS.contentIdeas]: "array",
  [STORAGE_KEYS.notifications]: "array",
  [STORAGE_KEYS.calendarPreferences]: "object",
  [STORAGE_KEYS.privacyPreferences]: "object",
  [STORAGE_KEYS.consentRecords]: "array",
  [STORAGE_KEYS.privacyAuditLog]: "array",
  [STORAGE_KEYS.infringementReports]: "array",
  [STORAGE_KEYS.retentionSettings]: "object",
  [STORAGE_KEYS.designProjects]: "array",
  [STORAGE_KEYS.designPreferences]: "object",
  [STORAGE_KEYS.videoProjects]: "array",
  [STORAGE_KEYS.videoPreferences]: "object",
  [STORAGE_KEYS.aiRequestHistory]: "array",
  [STORAGE_KEYS.aiPreferences]: "object",
  [STORAGE_KEYS.userSession]: "object",
  [STORAGE_KEYS.userAccounts]: "array",
  [STORAGE_KEYS.userProfiles]: "array",
  [STORAGE_KEYS.workspaces]: "array",
  [STORAGE_KEYS.workspaceMembers]: "array",
  [STORAGE_KEYS.storagePreferences]: "object",
  [STORAGE_KEYS.syncQueue]: "array",
  [STORAGE_KEYS.dataMigrationState]: "object",
  [STORAGE_KEYS.diagnosticHistory]: "array",
  [STORAGE_KEYS.qaChecklist]: "array",
  [STORAGE_KEYS.demoManifest]: "object"
};

export const defaultQaChecklist: QaChecklistItem[] = [
  { id: "landing-start", category: "기본 흐름", label: "Landing에서 시작 버튼 이동", checked: false },
  { id: "dashboard-view", category: "기본 흐름", label: "Dashboard 표시", checked: false },
  { id: "onboarding-complete", category: "기본 흐름", label: "온보딩 완료", checked: false },
  { id: "create-input", category: "생성", label: "Create 입력", checked: false },
  { id: "rights-confirm", category: "생성", label: "권리 확인", checked: false },
  { id: "credit-debit", category: "생성", label: "크레딧 차감", checked: false },
  { id: "results-created", category: "결과", label: "Results 생성", checked: false },
  { id: "caption-select", category: "결과", label: "캡션 선택", checked: false },
  { id: "copy-action", category: "결과", label: "복사", checked: false },
  { id: "feedback-action", category: "개인화", label: "좋아요·별로예요", checked: false },
  { id: "edit-save", category: "개인화", label: "수정 저장", checked: false },
  { id: "personalization-applied", category: "개인화", label: "개인화 반영", checked: false },
  { id: "studio-open", category: "Studio", label: "Studio 열기", checked: false },
  { id: "template-change", category: "Studio", label: "템플릿 변경", checked: false },
  { id: "png-generate", category: "Studio", label: "PNG 생성", checked: false },
  { id: "video-studio-open", category: "Video Studio", label: "Video Studio 열기", checked: false },
  { id: "video-preview", category: "Video Studio", label: "영상 미리보기", checked: false },
  { id: "webm-generate", category: "Video Studio", label: "WebM 생성 또는 fallback 확인", checked: false },
  { id: "download-test", category: "내보내기", label: "다운로드", checked: false },
  { id: "share-fallback", category: "내보내기", label: "SNS 공유 fallback", checked: false },
  { id: "export-history", category: "내보내기", label: "Export 기록", checked: false },
  { id: "history-check", category: "기록", label: "History 확인", checked: false },
  { id: "calendar-link", category: "캘린더", label: "Calendar 연결", checked: false },
  { id: "campaign-link", category: "캠페인", label: "Campaign 연결", checked: false },
  { id: "pricing-plan", category: "크레딧", label: "Pricing mock 플랜 변경", checked: false },
  { id: "credit-purchase", category: "크레딧", label: "mock 크레딧 구매", checked: false },
  { id: "account-export", category: "계정", label: "Account 데이터 내보내기", checked: false },
  { id: "privacy-delete", category: "개인정보", label: "Privacy 데이터 삭제", checked: false },
  { id: "guest-reset", category: "계정", label: "게스트 초기화", checked: false }
];
