# PostKit MVP RC-0.2 Feature Manifest

Snapshot date: 2026-07-02

This manifest records the source implementation boundary for `PostKit MVP RC-0.2`. RC-0.2 is a static-code snapshot. `npm install`, typecheck, build, dev server, and browser QA have not been completed.

## Status Labels

- 구현 완료, 실행 검증 필요: source exists and intended UI/logic is implemented, but npm/browser validation is still required.
- mock으로 구현: local/mock behavior exists, no real external service.
- 구조만 준비: interfaces, types, or placeholder layers exist for future integration.
- 실제 연동 미구현: deliberately not connected in this snapshot.
- 출시 전 추가 검토 필요: legal/security/server/payment/platform review is required before production.

## Product Areas

| Area | Status | Notes |
| --- | --- | --- |
| Landing | 구현 완료, 실행 검증 필요 | App explanation, CTA links, preview, and pricing summary are present. |
| Dashboard | 구현 완료, 실행 검증 필요 | Plan, credits, recent content, personalization, export, and calendar shortcuts. |
| Create | 구현 완료, 실행 검증 필요 | Upload package form, platform/purpose/style choices, rights confirmation, 30-credit generation flow. |
| Results | 구현 완료, 실행 검증 필요 | Captions, hashtags, CTA, hooks, thumbnail text, disclosure, feedback, edit, history/export/studio/video-studio actions. |
| Studio | 구현 완료, 실행 검증 필요 | Canvas-based PNG design generation with templates and export connection. |
| Video Studio | 구현 완료, 실행 검증 필요 | `/video-studio` upload-photo-based Canvas/MediaRecorder vertical WebM generation for Reels, Story, TikTok, and Shorts. PNG/TXT fallback when unsupported. |
| Export | 구현 완료, 실행 검증 필요 | Download, copy, Web Share/fallback, export history, and session video export handoff. No SNS auto-posting. |
| History | 구현 완료, 실행 검증 필요 | Generated package history, copy, rerun, export, studio, and video-studio links. |
| Pricing | mock으로 구현 | Plan changes and extra credit purchases are mock only; no payment API. |
| Settings | 구현 완료, 실행 검증 필요 | Brand/profile fields and personalization management. |
| Calendar | mock으로 구현 | Local content schedules, ideas, status, campaign links, and Video Studio entry hints. |
| Campaigns | mock으로 구현 | Local campaign and deliverable management, including short-form video handoff. |
| Account | mock으로 구현 | Guest/test accounts, workspaces, export/import, sync queue; no real auth. |
| Privacy | mock으로 구현 | Consent, retention, audit log, deletion UI, infringement report mock storage. |
| Diagnostics | 구현 완료, 실행 검증 필요 | Browser checks, storage checks, video capability checks, reports, QA checklist, repair proposals. |
| Demo | 구현 완료, 실행 검증 필요 | Safe sample data generation and guided flow; demo data is marked with `demo: true` or `source: "demo"`. |

## Cross-Cutting Features

| Feature | Status | Notes |
| --- | --- | --- |
| 개인 맞춤 학습 v1 | mock으로 구현 | Local learning events and weighted scores. Disabled learning should prevent new learning actions. |
| 온보딩 | 구현 완료, 실행 검증 필요 | First-run local onboarding for account purpose, content preferences, and default style. |
| 크레딧 원장 v1 | mock으로 구현 | Subscription and purchased credit balances, ledger entries, monthly grant mock, rollover mock, refund logic. |
| 디자인 생성 v1 | 구현 완료, 실행 검증 필요 | Canvas API renderer. No external AI image generation. |
| 짧은 영상 제작 v1 | 구현 완료, 실행 검증 필요 | Browser Canvas + MediaRecorder WebM from uploaded photos and generated short copy. No AI video API, no MP4 encoding package, no SNS upload API. |
| 다운로드/SNS 내보내기 v1 | mock으로 구현 | Browser download, clipboard, Web Share, platform open fallback. No SNS API. |
| AI 서비스 계층 v1 | 구조만 준비 | MockProvider is active. Internal routes call mock only. No external provider. |
| 프롬프트 엔진 v1 | 구조만 준비 | Structured prompt request builder with data minimization. |
| 저장소 계층 v1 | 구조만 준비 | LocalRepository active. CloudRepository is a no-network placeholder. |
| 데이터 마이그레이션 | 구조만 준비 | Local ownership and version migration helpers exist. Server migration not connected. |
| 진단/데모/QA 도구 v1 | 구현 완료, 실행 검증 필요 | Useful for first runtime pass after Node/npm are available. |

## RC-0.2 Additions Since RC-0.1

- Added route: `/video-studio`.
- Added browser WebM generation structure using Canvas, canvas.captureStream, and MediaRecorder.
- Added video capability diagnostics for MediaRecorder, canvas.captureStream, and WebM mimeType support.
- Added Video Studio handoff points in Export, History, Calendar, Campaigns, Demo, and Diagnostics.
- Added video project settings storage keys: `postkit-video-projects`, `postkit-video-preferences`.
- Documented the no-long-term-storage policy for video Blob, large base64 video, Object URL, and original uploaded media files.

## Actual Integrations Not Implemented

- Real AI text/image/video provider.
- Real payment gateway, card flow, receipt verification, subscription billing.
- Real authentication, OAuth, email verification, password flow, session backend.
- Real cloud database, object storage, multi-device sync.
- Real SNS login, OAuth, media upload, auto-posting, scheduled posting.
- Real push notification service.
- Real legal compliance automation.

## Release-Blocking Review Areas

- `npm.cmd install`.
- `npm.cmd run typecheck`.
- `npm.cmd run build`.
- `npm.cmd run dev`.
- Browser QA for all listed routes.
- Browser QA for Video Studio WebM generation, MediaRecorder fallback, Blob URL cleanup, and Export/History/Calendar/Campaign links.
- Credit debit/refund edge cases under rapid clicking.
- localStorage import/export with malformed and large JSON files.
- Canvas PNG output across desktop and mobile browsers.
- Web Share fallback on unsupported desktop browsers.
- Privacy deletion and audit log behavior.
- Legal review for privacy policy, terms, copyright/portrait rights, and ad/sponsorship disclosure wording.
- Server-side security design before any production authentication, payment, AI, cloud storage, or SNS posting.

## Snapshot Boundary

This manifest does not claim runtime success. The current snapshot remains mock/localStorage-first and does not contain production external integrations.

`npm install` is not completed. Typecheck/build/dev validation is not completed. The current validation failed because `node_modules` is absent. `/video-studio` is implemented, but real browser WebM QA is still required. The next step on a new or executable machine starts with `npm.cmd install`.
