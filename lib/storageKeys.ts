export const STORAGE_KEYS = {
  account: "postkit-account",
  brandProfile: "postkit-brand-profile",
  history: "postkit-history",
  currentResult: "postkit-current-result",
  createPrefill: "postkit-create-prefill",
  personalizationProfile: "postkit-personalization-profile",
  creditAccount: "postkit-credit-account",
  creditLedger: "postkit-credit-ledger",
  exportHistory: "postkit-export-history",
  exportPreferences: "postkit-export-preferences",
  contentSchedules: "postkit-content-schedules",
  campaigns: "postkit-campaigns",
  contentIdeas: "postkit-content-ideas",
  notifications: "postkit-notifications",
  calendarPreferences: "postkit-calendar-preferences",
  privacyPreferences: "postkit-privacy-preferences",
  consentRecords: "postkit-consent-records",
  privacyAuditLog: "postkit-privacy-audit-log",
  infringementReports: "postkit-infringement-reports",
  retentionSettings: "postkit-retention-settings",
  designProjects: "postkit-design-projects",
  designPreferences: "postkit-design-preferences",
  videoProjects: "postkit-video-projects",
  videoPreferences: "postkit-video-preferences",
  aiRequestHistory: "postkit-ai-request-history",
  aiPreferences: "postkit-ai-preferences",
  userSession: "postkit-user-session",
  userAccounts: "postkit-user-accounts",
  userProfiles: "postkit-user-profiles",
  workspaces: "postkit-workspaces",
  workspaceMembers: "postkit-workspace-members",
  storagePreferences: "postkit-storage-preferences",
  syncQueue: "postkit-sync-queue",
  dataMigrationState: "postkit-data-migration-state",
  diagnosticHistory: "postkit-diagnostic-history",
  qaChecklist: "postkit-qa-checklist",
  demoManifest: "postkit-demo-manifest"
} as const;

export const ALL_POSTKIT_STORAGE_KEYS = Object.values(STORAGE_KEYS);

export const PRIVACY_STORAGE_KEYS = [
  STORAGE_KEYS.privacyPreferences,
  STORAGE_KEYS.consentRecords,
  STORAGE_KEYS.privacyAuditLog,
  STORAGE_KEYS.infringementReports,
  STORAGE_KEYS.retentionSettings
] as const;

export const APP_EVENT_KEYS = {
  openOnboarding: "postkit-open-onboarding",
  personalizationUpdated: "postkit-personalization-updated",
  privacyUpdated: "postkit-privacy-updated"
} as const;
