"use client";

import {
  getCurrentWorkspace,
  getSyncQueue,
  getUserAccounts,
  getUserSession,
  getWorkspaceMembers,
  getWorkspaces
} from "@/lib/accountStorage";
import type { DiagnosticCheck, WorkspaceRole } from "@/types";

const validRoles: WorkspaceRole[] = ["owner", "admin", "editor", "viewer"];

function check(input: Omit<DiagnosticCheck, "category">): DiagnosticCheck {
  return { category: "계정·워크스페이스 상태", ...input };
}

export function getAccountDiagnostics(): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];
  const session = getUserSession();
  const accounts = getUserAccounts();
  const workspaces = getWorkspaces();
  const members = getWorkspaceMembers();
  const currentWorkspace = getCurrentWorkspace();

  checks.push(check({
    id: "account-session",
    label: "현재 세션",
    status: session.userId && session.workspaceId ? "정상" : "오류",
    code: session.userId && session.workspaceId ? "SESSION_PRESENT" : "SESSION_MISSING",
    message: session.userId && session.workspaceId ? `${session.mode === "guest" ? "게스트" : "테스트"} 세션이 있습니다.` : "현재 세션 정보를 찾지 못했습니다."
  }));

  checks.push(check({
    id: "account-auth-status",
    label: "실제 인증 연결",
    status: "미구현",
    code: "AUTH_NOT_CONNECTED",
    message: "현재는 실제 회원가입, OAuth, 이메일 인증이 연결되지 않은 mock 상태입니다."
  }));

  const currentAccountExists = accounts.some((account) => account.id === session.userId);
  checks.push(check({
    id: "account-current-user",
    label: "현재 userId",
    status: currentAccountExists ? "정상" : "확인 필요",
    code: currentAccountExists ? "CURRENT_USER_EXISTS" : "CURRENT_USER_REFERENCE_MISSING",
    message: currentAccountExists ? "현재 userId가 계정 목록에 있습니다." : "현재 userId가 계정 목록에 없습니다. 게스트 초기화가 필요할 수 있습니다."
  }));

  const currentWorkspaceExists = workspaces.some((workspace) => workspace.id === session.workspaceId);
  checks.push(check({
    id: "account-current-workspace",
    label: "현재 workspace",
    status: currentWorkspaceExists ? "정상" : "확인 필요",
    code: currentWorkspaceExists ? "CURRENT_WORKSPACE_EXISTS" : "CURRENT_WORKSPACE_REFERENCE_MISSING",
    message: currentWorkspaceExists ? "현재 workspaceId가 워크스페이스 목록에 있습니다." : "현재 workspaceId가 워크스페이스 목록에 없습니다."
  }));

  const memberIds = new Set<string>();
  let duplicatedMembers = 0;
  members.forEach((member) => {
    if (memberIds.has(member.id)) duplicatedMembers += 1;
    memberIds.add(member.id);
  });
  checks.push(check({
    id: "account-member-duplicates",
    label: "워크스페이스 멤버 중복",
    status: duplicatedMembers === 0 ? "정상" : "확인 필요",
    code: duplicatedMembers === 0 ? "WORKSPACE_MEMBER_UNIQUE" : "WORKSPACE_MEMBER_DUPLICATED",
    message: duplicatedMembers === 0 ? "멤버 ID 중복이 없습니다." : `중복 멤버 ID ${duplicatedMembers}개를 발견했습니다.`
  }));

  const ownerless = workspaces.filter((workspace) => !members.some((member) => member.workspaceId === workspace.id && member.role === "owner" && member.status !== "removed"));
  if (ownerless.length > 0) {
    checks.push(check({
      id: "account-ownerless-workspace",
      label: "owner 없는 workspace",
      status: "오류",
      code: "WORKSPACE_OWNER_MISSING",
      message: `owner가 없는 워크스페이스 ${ownerless.length}개를 발견했습니다.`
    }));
  }

  const accountIds = new Set(accounts.map((account) => account.id));
  const missingMemberUsers = members.filter((member) => member.status !== "removed" && !accountIds.has(member.userId) && !member.userId.startsWith("mock-member-user"));
  if (missingMemberUsers.length > 0) {
    checks.push(check({
      id: "account-member-user-missing",
      label: "멤버 userId",
      status: "확인 필요",
      code: "WORKSPACE_MEMBER_USER_MISSING",
      message: `존재하지 않는 userId를 가진 멤버 ${missingMemberUsers.length}개를 발견했습니다.`
    }));
  }

  const invalidRoles = members.filter((member) => !validRoles.includes(member.role));
  if (invalidRoles.length > 0) {
    checks.push(check({
      id: "account-member-role-invalid",
      label: "멤버 역할",
      status: "오류",
      code: "WORKSPACE_ROLE_INVALID",
      message: `잘못된 role을 가진 멤버 ${invalidRoles.length}개를 발견했습니다.`
    }));
  }

  const failedSync = getSyncQueue().filter((item) => item.status === "failed" || item.status === "conflict" || item.retryCount > 5);
  checks.push(check({
    id: "account-sync-queue",
    label: "SyncQueue",
    status: failedSync.length === 0 ? "정상" : "확인 필요",
    code: failedSync.length === 0 ? "SYNC_QUEUE_STABLE" : "SYNC_QUEUE_ATTENTION",
    message: failedSync.length === 0 ? "무한 실패로 보이는 동기화 항목이 없습니다." : `확인이 필요한 SyncQueue 항목 ${failedSync.length}개가 있습니다.`
  }));

  checks.push(check({
    id: "account-current-workspace-summary",
    label: "현재 워크스페이스 요약",
    status: "정상",
    code: "CURRENT_WORKSPACE_SUMMARY",
    message: `${currentWorkspace.name} · ${currentWorkspace.type} · ${currentWorkspace.currentPlan}`,
    metadata: { workspaceId: currentWorkspace.id }
  }));

  return checks;
}
