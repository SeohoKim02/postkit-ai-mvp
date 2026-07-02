"use client";

import { localRepository } from "@/lib/data/localRepository";
import { getRepositoryStatus, getStoragePreferences } from "@/lib/data/repositoryRegistry";
import { runOwnershipMigration } from "@/lib/data/migrations";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type {
  AccountDataExport,
  AccountMode,
  AccountType,
  StoragePreferences,
  SyncQueueAction,
  SyncQueueItem,
  UserAccount,
  UserProfile,
  UserSession,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceType
} from "@/types";

export type AccountImportValidationResult =
  | { ok: true; message: string; payload: AccountDataExport }
  | { ok: false; message: string; payload?: undefined };

export const guestUserId = "guest-local-user";
export const guestWorkspaceId = "workspace-local-personal";

const accountTypeToWorkspaceType: Partial<Record<AccountType, WorkspaceType>> = {
  "개인 계정": "personal",
  인플루언서: "creator",
  "광고/제휴 계정": "creator",
  "쇼핑몰/브랜드": "brand",
  소상공인: "business",
  "마케팅 대행사": "agency"
};

const workspaceRolePermissions: Record<WorkspaceRole, string[]> = {
  owner: ["all_data", "plan_manage", "member_manage", "content_manage", "download"],
  admin: ["content_manage", "member_manage_limited", "download"],
  editor: ["content_create", "content_edit", "export", "download"],
  viewer: ["view", "download"]
};

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAccountMode(userId: string): AccountMode {
  return userId === guestUserId ? "guest" : "test";
}

function getDefaultAccount(): UserAccount {
  const createdAt = now();

  return {
    id: guestUserId,
    displayName: "PostKit Guest",
    accountType: "개인 계정",
    status: "guest",
    createdAt,
    updatedAt: createdAt,
    version: 1
  };
}

function makeProfile(account: UserAccount, workspaceId: string): UserProfile {
  return {
    id: `profile-${account.id}`,
    userId: account.id,
    displayName: account.displayName,
    accountType: account.accountType,
    preferredWorkspaceId: workspaceId,
    onboardingAccountType: account.accountType,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    version: 1
  };
}

function getDefaultWorkspace(account = getDefaultAccount()): Workspace {
  const createdAt = now();

  return {
    id: guestWorkspaceId,
    name: "내 PostKit 워크스페이스",
    type: "personal",
    ownerUserId: account.id,
    currentPlan: "Starter",
    brandProfileId: STORAGE_KEYS.brandProfile,
    memberIds: [`member-${account.id}`],
    createdAt,
    updatedAt: createdAt,
    version: 1
  };
}

function makeOwnerMember(account: UserAccount, workspace: Workspace): WorkspaceMember {
  return {
    id: `member-${account.id}`,
    workspaceId: workspace.id,
    userId: account.id,
    displayName: account.displayName,
    role: "owner",
    status: "active",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    version: 1
  };
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function getUserAccounts() {
  return normalizeArray<UserAccount>(localRepository.get(STORAGE_KEYS.userAccounts, [])).filter((account) => account.id);
}

export function saveUserAccounts(accounts: UserAccount[]) {
  return localRepository.set(STORAGE_KEYS.userAccounts, accounts.map((account) => ({ ...account, version: 1 })));
}

export function getUserProfiles() {
  return normalizeArray<UserProfile>(localRepository.get(STORAGE_KEYS.userProfiles, []));
}

export function saveUserProfiles(profiles: UserProfile[]) {
  return localRepository.set(STORAGE_KEYS.userProfiles, profiles.map((profile) => ({ ...profile, version: 1 })));
}

export function getWorkspaces() {
  return normalizeArray<Workspace>(localRepository.get(STORAGE_KEYS.workspaces, []));
}

export function saveWorkspaces(workspaces: Workspace[]) {
  return localRepository.set(STORAGE_KEYS.workspaces, workspaces.map((workspace) => ({ ...workspace, version: 1 })));
}

export function getWorkspaceMembers() {
  return normalizeArray<WorkspaceMember>(localRepository.get(STORAGE_KEYS.workspaceMembers, []));
}

export function saveWorkspaceMembers(members: WorkspaceMember[]) {
  return localRepository.set(STORAGE_KEYS.workspaceMembers, members.map((member) => ({ ...member, version: 1 })));
}

export function getUserSession(): UserSession {
  const fallback: UserSession = {
    version: 1,
    mode: "guest",
    userId: guestUserId,
    workspaceId: guestWorkspaceId,
    signedInMockAt: now(),
    lastActiveAt: now()
  };
  const session = localRepository.get<Partial<UserSession>>(STORAGE_KEYS.userSession, fallback);

  return {
    ...fallback,
    ...session,
    mode: session.mode === "test" ? "test" : "guest",
    userId: typeof session.userId === "string" ? session.userId : fallback.userId,
    workspaceId: typeof session.workspaceId === "string" ? session.workspaceId : fallback.workspaceId,
    version: 1,
    lastActiveAt: now()
  };
}

export function saveUserSession(session: UserSession) {
  return localRepository.set(STORAGE_KEYS.userSession, {
    ...session,
    version: 1,
    lastActiveAt: now()
  });
}

export function getCurrentAccount() {
  const session = getUserSession();
  return getUserAccounts().find((account) => account.id === session.userId) ?? getDefaultAccount();
}

export function getCurrentWorkspace() {
  const session = getUserSession();
  return getWorkspaces().find((workspace) => workspace.id === session.workspaceId) ?? getDefaultWorkspace(getCurrentAccount());
}

export function initializeAccountStorage() {
  const accounts = getUserAccounts();
  const guestAccount = accounts.find((account) => account.id === guestUserId) ?? getDefaultAccount();
  const nextAccounts = accounts.some((account) => account.id === guestUserId) ? accounts : [guestAccount, ...accounts];

  const workspaces = getWorkspaces();
  const guestWorkspace = workspaces.find((workspace) => workspace.id === guestWorkspaceId) ?? getDefaultWorkspace(guestAccount);
  const nextWorkspaces = workspaces.some((workspace) => workspace.id === guestWorkspaceId) ? workspaces : [guestWorkspace, ...workspaces];

  const members = getWorkspaceMembers();
  const ownerMember = members.find((member) => member.id === `member-${guestAccount.id}`) ?? makeOwnerMember(guestAccount, guestWorkspace);
  const nextMembers = members.some((member) => member.id === ownerMember.id) ? members : [ownerMember, ...members];

  saveUserAccounts(nextAccounts);
  saveUserProfiles(getUserProfiles().some((profile) => profile.userId === guestAccount.id) ? getUserProfiles() : [makeProfile(guestAccount, guestWorkspace.id), ...getUserProfiles()]);
  saveWorkspaces(nextWorkspaces);
  saveWorkspaceMembers(nextMembers);

  const session = getUserSession();
  const validWorkspace = nextWorkspaces.find((workspace) => workspace.id === session.workspaceId) ?? guestWorkspace;
  const validAccount = nextAccounts.find((account) => account.id === session.userId) ?? guestAccount;
  const nextSession = {
    ...session,
    mode: getAccountMode(validAccount.id),
    userId: validAccount.id,
    workspaceId: validWorkspace.id
  };
  saveUserSession(nextSession);
  runOwnershipMigration(nextSession.userId, nextSession.workspaceId);

  return {
    account: validAccount,
    workspace: validWorkspace,
    session: nextSession,
    storage: getRepositoryStatus()
  };
}

export function createTestAccount(input: { displayName?: string; accountType?: AccountType } = {}) {
  const createdAt = now();
  const account: UserAccount = {
    id: createId("test-user"),
    email: "mock-user@example.invalid",
    displayName: input.displayName?.trim() || "PostKit Test User",
    accountType: input.accountType ?? "인플루언서",
    status: "active",
    createdAt,
    updatedAt: createdAt,
    version: 1
  };
  const workspace: Workspace = {
    id: createId("workspace"),
    name: `${account.displayName} 워크스페이스`,
    type: accountTypeToWorkspaceType[account.accountType] ?? "creator",
    ownerUserId: account.id,
    currentPlan: "Starter",
    brandProfileId: STORAGE_KEYS.brandProfile,
    memberIds: [`member-${account.id}`],
    createdAt,
    updatedAt: createdAt,
    version: 1
  };
  const member = makeOwnerMember(account, workspace);

  saveUserAccounts([account, ...getUserAccounts()]);
  saveUserProfiles([makeProfile(account, workspace.id), ...getUserProfiles()]);
  saveWorkspaces([workspace, ...getWorkspaces()]);
  saveWorkspaceMembers([member, ...getWorkspaceMembers()]);
  saveUserSession({
    version: 1,
    mode: "test",
    userId: account.id,
    workspaceId: workspace.id,
    signedInMockAt: createdAt,
    lastActiveAt: createdAt
  });
  runOwnershipMigration(account.id, workspace.id);
  enqueueSyncItem("user-account", account.id, "create", workspace.id, account.id);

  return { account, workspace };
}

export function switchAccount(userId: string) {
  const account = getUserAccounts().find((item) => item.id === userId) ?? getDefaultAccount();
  const workspace = getWorkspaces().find((item) => item.ownerUserId === account.id) ?? getDefaultWorkspace(account);

  saveUserSession({
    version: 1,
    mode: getAccountMode(account.id),
    userId: account.id,
    workspaceId: workspace.id,
    signedInMockAt: now(),
    lastActiveAt: now()
  });
  runOwnershipMigration(account.id, workspace.id);
  return { account, workspace };
}

export function logoutToGuest() {
  return switchAccount(guestUserId);
}

export function createWorkspace(input: { name: string; type: WorkspaceType }) {
  const account = getCurrentAccount();
  const createdAt = now();
  const workspace: Workspace = {
    id: createId("workspace"),
    name: input.name.trim() || "새 워크스페이스",
    type: input.type,
    ownerUserId: account.id,
    currentPlan: "Starter",
    brandProfileId: STORAGE_KEYS.brandProfile,
    memberIds: [`member-${account.id}`],
    createdAt,
    updatedAt: createdAt,
    version: 1
  };
  const member = makeOwnerMember(account, workspace);

  saveWorkspaces([workspace, ...getWorkspaces()]);
  saveWorkspaceMembers([member, ...getWorkspaceMembers()]);
  saveUserSession({ ...getUserSession(), workspaceId: workspace.id, mode: getAccountMode(account.id) });
  enqueueSyncItem("workspace", workspace.id, "create", workspace.id, account.id);
  return workspace;
}

export function updateWorkspaceName(workspaceId: string, name: string) {
  const workspaces = getWorkspaces();
  const nextWorkspaces = workspaces.map((workspace) =>
    workspace.id === workspaceId
      ? {
          ...workspace,
          name: name.trim() || workspace.name,
          updatedAt: now()
        }
      : workspace
  );
  saveWorkspaces(nextWorkspaces);
  enqueueSyncItem("workspace", workspaceId, "update", workspaceId, getCurrentAccount().id);
  return nextWorkspaces.find((workspace) => workspace.id === workspaceId);
}

export function addMockWorkspaceMember(input: { workspaceId: string; displayName: string; role: WorkspaceRole }) {
  const createdAt = now();
  const member: WorkspaceMember = {
    id: createId("member"),
    workspaceId: input.workspaceId,
    userId: createId("mock-member-user"),
    displayName: input.displayName.trim() || "Mock Member",
    role: input.role,
    status: "active",
    createdAt,
    updatedAt: createdAt,
    version: 1
  };
  const workspaces = getWorkspaces().map((workspace) =>
    workspace.id === input.workspaceId
      ? { ...workspace, memberIds: Array.from(new Set([...workspace.memberIds, member.id])), updatedAt: now() }
      : workspace
  );

  saveWorkspaceMembers([member, ...getWorkspaceMembers()]);
  saveWorkspaces(workspaces);
  enqueueSyncItem("workspace-member", member.id, "create", input.workspaceId, getCurrentAccount().id);
  return member;
}

export function updateWorkspaceMemberRole(memberId: string, role: WorkspaceRole) {
  const members = getWorkspaceMembers().map((member) =>
    member.id === memberId ? { ...member, role, updatedAt: now() } : member
  );
  saveWorkspaceMembers(members);
  const member = members.find((item) => item.id === memberId);
  enqueueSyncItem("workspace-member", memberId, "update", member?.workspaceId, getCurrentAccount().id);
  return member;
}

export function removeWorkspaceMember(memberId: string) {
  const member = getWorkspaceMembers().find((item) => item.id === memberId);
  saveWorkspaceMembers(getWorkspaceMembers().map((item) => (item.id === memberId ? { ...item, status: "removed", updatedAt: now() } : item)));
  enqueueSyncItem("workspace-member", memberId, "delete", member?.workspaceId, getCurrentAccount().id);
}

export function getWorkspacePermissions(role: WorkspaceRole) {
  return workspaceRolePermissions[role];
}

export function canUseWorkspaceAction(role: WorkspaceRole, action: string) {
  const permissions = getWorkspacePermissions(role);
  return permissions.includes("all_data") || permissions.includes(action);
}

export function getSyncQueue() {
  return localRepository.getAll<SyncQueueItem>(STORAGE_KEYS.syncQueue);
}

export function saveSyncQueue(queue: SyncQueueItem[]) {
  return localRepository.set(STORAGE_KEYS.syncQueue, queue.slice(0, 500));
}

export function enqueueSyncItem(entityType: string, entityId: string, action: SyncQueueAction, workspaceId?: string, userId?: string) {
  const item: SyncQueueItem = {
    id: createId("sync"),
    entityType,
    entityId,
    action,
    workspaceId,
    userId,
    localUpdatedAt: now(),
    retryCount: 0,
    status: "pending",
    version: 1
  };
  saveSyncQueue([item, ...getSyncQueue()]);
  return item;
}

function containsSecretLikeString(value: unknown): boolean {
  if (typeof value === "string") {
    return /(sk-[A-Za-z0-9]{12,}|AKIA[0-9A-Z]{12,}|BEGIN PRIVATE KEY|api[_-]?key|auth[_-]?token|session[_-]?secret)/i.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(containsSecretLikeString);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => /password|token|secret|apiKey|payment/i.test(key) || containsSecretLikeString(nested));
  }

  return false;
}

export function exportAccountData() {
  const session = getUserSession();
  const exported = localRepository.exportData();
  return {
    ...exported,
    userId: session.userId,
    workspaceId: session.workspaceId
  };
}

export function validateAccountImportPayload(value: unknown): AccountImportValidationResult {
  const serializedLength = JSON.stringify(value ?? "").length;
  if (serializedLength > 2_000_000) {
    return { ok: false, message: "가져올 파일이 너무 큽니다. 2MB 이하의 JSON만 지원합니다." };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: "PostKit 내보내기 JSON 형식이 아닙니다." };
  }

  const payload = value as Partial<AccountDataExport>;
  if (payload.schemaVersion !== 1 || payload.source !== "postkit-local" || !payload.data || typeof payload.data !== "object") {
    return { ok: false, message: "지원하지 않는 schemaVersion 또는 데이터 형식입니다." };
  }

  if (containsSecretLikeString(payload.data)) {
    return { ok: false, message: "API 키, 토큰, 비밀번호처럼 보이는 값이 포함되어 가져오기를 중단했어요." };
  }

  return { ok: true, message: "가져올 수 있는 PostKit 데이터입니다.", payload: payload as AccountDataExport };
}

export function importAccountData(payload: AccountDataExport, mode: "merge" | "replace") {
  const result = localRepository.importData(payload, mode);
  if (result.ok) {
    initializeAccountStorage();
  }
  return result;
}

export function deleteAllAccountData() {
  if (typeof window === "undefined") {
    return { ok: false, message: "브라우저에서만 삭제할 수 있어요." };
  }

  const postkitKeys = Object.keys(window.localStorage).filter((key) => key.startsWith("postkit-"));
  postkitKeys.forEach((key) => window.localStorage.removeItem(key));
  const initialized = initializeAccountStorage();

  return {
    ok: true,
    message: "이 브라우저의 PostKit mock 계정 데이터를 삭제하고 게스트 상태로 초기화했어요.",
    initialized
  };
}

export function getStorageSummary() {
  const session = getUserSession();
  const account = getCurrentAccount();
  const workspace = getCurrentWorkspace();
  const syncQueue = getSyncQueue();
  const preferences: StoragePreferences = getStoragePreferences();

  return {
    session,
    account,
    workspace,
    storage: getRepositoryStatus(),
    preferences,
    syncQueue,
    pendingSyncCount: syncQueue.filter((item) => item.status === "pending").length,
    failedSyncCount: syncQueue.filter((item) => item.status === "failed" || item.status === "conflict").length
  };
}
