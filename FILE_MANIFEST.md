# PostKit MVP RC-0.2 File Manifest

Snapshot date: 2026-07-02

This manifest describes the source tree for `PostKit MVP RC-0.2`. RC-0.2 is a static-code snapshot. It excludes generated folders, caches, logs, browser data, localStorage data, user media, real environment files, and duplicate ZIP files.

## Snapshot Status

- `npm install` is not completed.
- Typecheck/build/dev validation is not completed.
- Current validation failed because `node_modules` is absent.
- `/video-studio` is implemented, but real browser WebM generation QA is still required.
- The next step on a new or executable machine starts with `npm.cmd install`.

## Source Tree Summary

Current source/document/config file count, excluding generated folders and ZIP files: 116.

- `app/`: 23 files, including 18 page files and 3 API route files.
- `components/`: 14 files.
- `lib/`: 60 files.
- `types/`: 1 file.
- root Markdown documents: 10 files.
- root config/package/env/ignore files: 8 files.

## Included Top-Level Folders

- `app`
- `components`
- `lib`
- `types`

## App Pages

- `app/page.tsx`: Landing page.
- `app/dashboard/page.tsx`: dashboard summary, credits, personalization, recent content, export and calendar shortcuts.
- `app/create/page.tsx`: upload-package creation form, rights confirmation, credit debit flow, AI service client entry.
- `app/results/page.tsx`: generated package display, copy/edit/feedback/personalization/history/export/studio/video-studio actions.
- `app/studio/page.tsx`: browser Canvas based design studio and PNG generation workflow.
- `app/video-studio/page.tsx`: browser Canvas/MediaRecorder Reels/Shorts video studio v1.
- `app/export/page.tsx`: download, copy, Web Share fallback, platform export center, and session video export handoff.
- `app/history/page.tsx`: generated content history and rerun/export/studio/video-studio actions.
- `app/pricing/page.tsx`: mock subscription plans, credit packs, plan change and purchase flows.
- `app/settings/page.tsx`: brand/profile settings and personalization management.
- `app/calendar/page.tsx`: content calendar, schedule, idea, campaign-linked planning, and short-form video entry hints.
- `app/campaigns/page.tsx`: campaign management, deliverables, and campaign-to-create/video-studio connections.
- `app/account/page.tsx`: guest/test account, workspace, data export/import, mock storage state.
- `app/privacy/page.tsx`: privacy center, retention, consent, deletion, and rights reporting UI.
- `app/privacy-policy/page.tsx`: privacy policy draft UI with TODO business details.
- `app/terms/page.tsx`: terms draft UI with legal review notes.
- `app/diagnostics/page.tsx`: diagnostics center, demo data controls, QA checklist, reports, repair proposals.
- `app/demo/page.tsx`: sample-data guided demo flow.

## API Routes

- `app/api/ai/generate-text/route.ts`: internal mock AI text generation route.
- `app/api/ai/recommend-design/route.ts`: internal mock design recommendation route.
- `app/api/ai/health/route.ts`: mock AI health route.

Current API routes do not call external AI providers and do not require API keys.

## Components

- `components/AppShell.tsx`
- `components/OnboardingModal.tsx`
- `components/PageHeader.tsx`
- `components/StatCard.tsx`
- `components/ChoiceCard.tsx`
- `components/CopyButton.tsx`
- `components/CreditMeter.tsx`
- `components/PackagePreview.tsx`
- `components/ResultSection.tsx`
- `components/FeedbackActions.tsx`
- `components/ExportPlatformCard.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`

## Lib Areas

Core storage and configuration:

- `lib/storageKeys.ts`
- `lib/storage.ts`
- `lib/constants.ts`
- `lib/plans.ts`
- `lib/credits.ts`
- `lib/subscription.ts`
- `lib/creditStorage.ts`
- `lib/creditLedger.ts`

AI service layer:

- `lib/ai/types.ts`
- `lib/ai/provider.ts`
- `lib/ai/mockProvider.ts`
- `lib/ai/providerRegistry.ts`
- `lib/ai/promptBuilder.ts`
- `lib/ai/client.ts`
- `lib/ai/validation.ts`
- `lib/ai/requestStorage.ts`

Design Studio and export:

- `lib/designTemplates.ts`
- `lib/canvasRenderer.ts`
- `lib/imageUtils.ts`
- `lib/sessionImageStore.ts`
- `lib/designStorage.ts`
- `lib/exportPresets.ts`
- `lib/exportUtils.ts`
- `lib/exportStorage.ts`
- `lib/downloadUtils.ts`
- `lib/shareUtils.ts`

Video Studio v1:

- `lib/video/videoPresets.ts`
- `lib/video/videoTemplates.ts`
- `lib/video/videoRenderer.ts`
- `lib/video/videoStorage.ts`
- `lib/video/videoSessionStore.ts`
- `lib/video/videoUtils.ts`

Calendar, campaign, notifications, privacy, account, repository, diagnostics, and demo:

- `lib/calendarStorage.ts`
- `lib/calendarUtils.ts`
- `lib/campaignStorage.ts`
- `lib/campaignUtils.ts`
- `lib/notificationStorage.ts`
- `lib/privacyStorage.ts`
- `lib/privacyContent.ts`
- `lib/accountStorage.ts`
- `lib/data/types.ts`
- `lib/data/localRepository.ts`
- `lib/data/cloudRepository.ts`
- `lib/data/repositoryRegistry.ts`
- `lib/data/migrations.ts`
- `lib/diagnostics/types.ts`
- `lib/diagnostics/browserChecks.ts`
- `lib/diagnostics/storageChecks.ts`
- `lib/diagnostics/creditChecks.ts`
- `lib/diagnostics/accountChecks.ts`
- `lib/diagnostics/privacyChecks.ts`
- `lib/diagnostics/studioChecks.ts`
- `lib/diagnostics/exportChecks.ts`
- `lib/diagnostics/videoChecks.ts`
- `lib/diagnostics/report.ts`
- `lib/demo/demoData.ts`
- `lib/demo/demoStorage.ts`
- `lib/mockAi.ts`
- `lib/personalization.ts`
- `lib/learning.ts`

## Types

- `types/index.ts`: shared domain types for platforms, generated packages, history, personalization, credits, export, design, video, calendar, campaigns, privacy, AI, account/workspace, diagnostics, demo, and QA.

## Configuration Files

- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `next-env.d.ts`
- `.env.example`
- `.gitignore`

`package-lock.json` is not present in this source tree and was not generated during RC-0.2 preparation.

## Documentation Files

- `README.md`
- `PROJECT_STATUS.md`
- `INTEGRATION_AUDIT.md`
- `QA_GUIDE.md`
- `AI_INTEGRATION_GUIDE.md`
- `BACKEND_INTEGRATION_GUIDE.md`
- `FILE_MANIFEST.md`
- `FEATURE_MANIFEST.md`
- `RUNBOOK.md`
- `SNAPSHOT_INFO.md`

## Added in RC-0.2

- Added route: `/video-studio`.
- Added major files under `lib/video/*`.
- Added diagnostics file: `lib/diagnostics/videoChecks.ts`.
- Added localStorage keys: `postkit-video-projects`, `postkit-video-preferences`.
- Added export content support for browser-generated WebM and video frame PNG assets.

## Excluded from Source ZIP

- `node_modules`
- `.next`
- `dist`
- `build`
- `coverage`
- `.git`
- `.env.local`
- real `.env`
- API keys, tokens, passwords, secrets
- payment information
- user images
- user videos
- browser localStorage data
- browser profile data
- duplicate ZIP files

## Runtime Verification Boundary

This snapshot is static-review based. `npm install`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run dev`, dev server verification, and browser QA have not been completed in this environment.
