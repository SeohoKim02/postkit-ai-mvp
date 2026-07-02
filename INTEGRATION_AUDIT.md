# PostKit Integration Audit

작성일: 2026-06-15

이번 문서는 실제 실행 전 통합 안정화와 정적 무결성 검토 결과입니다. 이번 업데이트에서는 기존 MVP 기능을 유지한 상태에서 계정 및 데이터 저장 계층 v1을 추가하고, 라우트, 내비게이션, localStorage, 브라우저 API, 크레딧, 개인화, 내보내기, 개인정보, AI provider, account/data repository 흐름을 정적 기준으로 점검했습니다.

## 2026-07-02 RC-0.2 스냅샷 감사

이번 정리는 실행 검증이 아니라 `PostKit MVP RC-0.2` 소스 백업과 문서 정리입니다.

- RC-0.2는 정적 코드 기준 스냅샷입니다.
- `npm install`은 아직 완료되지 않았습니다.
- `typecheck`, `build`, `dev server` 실행 검증은 아직 완료되지 않았습니다.
- 프로젝트에 `node_modules`가 없어 현재 실행 검증은 실패했습니다.
- `/video-studio`는 구현됐지만 실제 브라우저 WebM 생성 QA는 아직 필요합니다.
- 다음 단계는 새 컴퓨터 또는 실행 가능한 환경에서 `npm.cmd install`부터 시작하는 것입니다.
- 새 기능, 가격 정책, 크레딧 정책, 개인정보 정책, 실제 AI/API/결제/SNS/클라우드 연결은 추가하거나 변경하지 않았습니다.
- 외부 패키지를 설치하지 않았고 API 키, 토큰, 비밀번호, 시크릿을 추가하지 않았습니다.

## 2026-07-01 추가 감사: Video Studio v1

- `/video-studio` 라우트를 추가하고 AppShell, Results, History, Export Center, Calendar, Campaigns, Diagnostics, Demo와 연결했습니다.
- 영상 생성은 업로드 사진 기반 Canvas 합성 + MediaRecorder WebM 녹화로 제한했습니다.
- 실제 AI 영상 생성 API, SNS 자동 게시 API, 외부 네트워크 업로드, API 키, 토큰, 시크릿, 외부 패키지 추가는 없습니다.
- MediaRecorder/canvas.captureStream/WebM 미지원 시 앱 전체 오류가 아니라 PNG 프레임 세트와 문구 TXT fallback으로 표시합니다.
- 영상 Blob과 Object URL은 세션 메모리 저장소에만 두고 localStorage에는 저장하지 않습니다.
- 영상 설정 localStorage 키는 `postkit-video-projects`, `postkit-video-preferences`이며 예상 shape은 각각 array/object입니다.
- 영상 편집, WebM 다운로드, Export Center 연결, SNS 공유 준비에는 추가 크레딧 차감 로직을 추가하지 않았습니다.
- `npm.cmd run typecheck`는 프로젝트에 `node_modules`가 없어 `tsc` 명령을 찾지 못했고, `npm.cmd run build`도 `next` 명령 부재로 완료하지 못했습니다.

## 검토한 파일

- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/create/page.tsx`
- `app/results/page.tsx`
- `app/api/ai/generate-text/route.ts`
- `app/api/ai/recommend-design/route.ts`
- `app/api/ai/health/route.ts`
- `app/studio/page.tsx`
- `app/video-studio/page.tsx`
- `app/history/page.tsx`
- `app/pricing/page.tsx`
- `app/settings/page.tsx`
- `app/account/page.tsx`
- `app/export/page.tsx`
- `app/privacy/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/terms/page.tsx`
- `components/AppShell.tsx`
- `components/CopyButton.tsx`
- `components/OnboardingModal.tsx`
- `components/ui/Button.tsx`
- `lib/storage.ts`
- `lib/accountStorage.ts`
- `lib/data/types.ts`
- `lib/data/localRepository.ts`
- `lib/data/cloudRepository.ts`
- `lib/data/repositoryRegistry.ts`
- `lib/data/migrations.ts`
- `lib/ai/types.ts`
- `lib/ai/promptBuilder.ts`
- `lib/ai/validation.ts`
- `lib/ai/provider.ts`
- `lib/ai/providerRegistry.ts`
- `lib/ai/mockProvider.ts`
- `lib/ai/client.ts`
- `lib/ai/requestStorage.ts`
- `lib/creditStorage.ts`
- `lib/creditLedger.ts`
- `lib/exportStorage.ts`
- `lib/designTemplates.ts`
- `lib/canvasRenderer.ts`
- `lib/designStorage.ts`
- `lib/sessionImageStore.ts`
- `lib/imageUtils.ts`
- `lib/shareUtils.ts`
- `lib/video/videoPresets.ts`
- `lib/video/videoTemplates.ts`
- `lib/video/videoRenderer.ts`
- `lib/video/videoStorage.ts`
- `lib/video/videoSessionStore.ts`
- `lib/video/videoUtils.ts`
- `lib/diagnostics/videoChecks.ts`
- `lib/privacyStorage.ts`
- `lib/storageKeys.ts`
- `types/index.ts`
- `README.md`
- `PROJECT_STATUS.md`
- `AI_INTEGRATION_GUIDE.md`
- `BACKEND_INTEGRATION_GUIDE.md`
- `.env.example`

## 라우트 검토

확인된 필수 라우트:

- `/`
- `/dashboard`
- `/create`
- `/results`
- `/history`
- `/pricing`
- `/settings`
- `/account`
- `/export`
- `/studio`
- `/video-studio`
- `/privacy`
- `/privacy-policy`
- `/terms`
- `/api/ai/generate-text`
- `/api/ai/recommend-design`
- `/api/ai/health`

추가로 현재 기능 유지에 필요한 라우트:

- `/calendar`
- `/campaigns`

`Link`, `LinkButton`, `router.push` 이동 경로는 현재 존재하는 라우트와 일치하는 것으로 정적 확인했습니다.

## 발견한 문제

- localStorage 키 문자열이 여러 저장소 파일에 반복되어 있었습니다.
- 모바일 하단 내비게이션에 항목이 많아 터치 영역과 시각적 밀도가 불리했습니다.
- `History`, 현재 결과, prefill, 크레딧 원장에서 JSON 파싱은 성공했지만 배열/객체가 아닌 값이 들어온 경우를 더 안전하게 처리할 필요가 있었습니다.
- 공통 `Button`에 기본 `type`이 없어 폼 내부 사용 시 의도치 않은 submit 위험이 있었습니다.
- `CopyButton`에서 Clipboard API가 차단되면 예외가 사용자 피드백 없이 끝날 수 있었습니다.
- Results의 JSON 다운로드가 직접 Blob URL을 만들고 즉시 해제하는 방식이었습니다.
- Web Share API 공유창 취소가 실패 fallback과 동일하게 처리될 수 있었습니다.
- Studio 다운로드/공유 연결부에서 `renderDesignToBlob` 반환값을 Blob으로 직접 취급할 타입 위험이 있었습니다.
- Create와 Results가 mock 생성 함수를 직접 호출하고 있어 향후 실제 AI provider 교체 시 UI 수정 범위가 커질 수 있었습니다.
- AI 요청 중복 실행과 AI 사용 기록이 크레딧 원장 흐름과 분리되어 있지 않았습니다.
- 실제 AI 공급자 연결 시 API 키가 클라이언트 번들에 노출되지 않도록 서버 API 경계를 명확히 둘 필요가 있었습니다.
- 기존 크레딧 호환 타입 이름 `UserAccount`가 향후 실제 사용자 계정 타입과 충돌할 수 있었습니다.
- 기존 데이터에 `userId`, `workspaceId` 소유권 필드가 없어 향후 클라우드 저장소 전환 시 데이터 소유권 매핑이 필요했습니다.
- 계정/워크스페이스/SyncQueue/CloudRepository 구조가 없어 여러 기기 동기화 준비 상태를 표현할 수 없었습니다.

## 수정한 문제

- `lib/storageKeys.ts`를 추가하고 localStorage 키와 앱 내부 이벤트 이름을 중앙 관리하도록 정리했습니다.
- 기존 `postkit-` 키 이름은 변경하지 않아 기존 localStorage 데이터 호환성을 유지했습니다.
- AppShell 모바일 하단 내비게이션을 홈, 만들기, 기록, 내보내기, 더보기로 정리했습니다.
- 더보기 메뉴에 캘린더, 캠페인, 요금제, 설정, 개인정보 보호센터, 개인정보 처리방침, 이용약관을 연결했습니다.
- `getHistory`, `getCurrentResult`, `getPrefill`, `getCreditLedger`가 손상된 자료형을 만나도 안전하게 기본값으로 복구되도록 보강했습니다.
- 공통 `Button` 기본 `type`을 `button`으로 지정했습니다.
- `CopyButton`에서 복사 실패 시 “복사 실패” 피드백을 표시하도록 수정했습니다.
- Results JSON 저장을 `downloadJsonFile` 유틸로 통합했습니다.
- Web Share API `AbortError`는 취소로 처리하고 fallback 다운로드/플랫폼 열기를 실행하지 않도록 수정했습니다.
- Studio Canvas 렌더링 결과를 `{ ok, blob, error }`로 확인한 뒤 다운로드와 Web Share 파일 공유에 사용하도록 수정했습니다.
- Export Center에서 Studio 디자인이 있으면 `design_canvas` 이미지 자산을 우선 사용하고, 없으면 기존 mock PNG fallback을 유지하도록 연결했습니다.
- Create Page에서 이미지 업로드 시 세션 Object URL을 Studio로 전달하고, 영상 업로드는 기존 흐름을 유지하도록 분리했습니다.
- 개인정보 삭제 흐름에서 생성 결과/History 삭제 시 Studio 디자인 설정도 함께 삭제되도록 보강했습니다.
- `lib/ai/*`에 AI 공급자 인터페이스, MockProvider, prompt builder, 검증, provider registry, 클라이언트 래퍼, AI 요청 기록 저장소를 추가했습니다.
- `app/api/ai/*` 내부 API 라우트에서만 provider를 호출하도록 만들고, 클라이언트는 `/api/ai/*`를 통해 생성/추천/health를 요청하도록 분리했습니다.
- Create Page 생성 흐름을 입력 검증, 중복 요청 확인, 잔액 확인, AI 요청 기록, 크레딧 차감, provider 호출, 결과 저장, 실패 시 1회 환불 순서로 정리했습니다.
- Results Page 샘플 생성도 AI 클라이언트를 거치도록 변경하고, API 실패 시 실제 AI 성공처럼 보이지 않는 sample fallback을 표시하도록 했습니다.
- Studio는 생성 결과의 `recommendedTemplateId`가 유효하면 해당 템플릿을 기본 제안으로 사용하고, 없으면 기존 추천 로직으로 fallback합니다.
- `.env.example`에는 실제 값 없이 AI 환경변수 이름만 추가했고 `.env.local`은 만들지 않았습니다.
- 기존 크레딧 호환 타입을 `LegacyAccountState`로 분리하고, 새 `UserAccount`, `UserProfile`, `UserSession`, `Workspace`, `WorkspaceMember`, `SyncQueueItem` 타입을 추가했습니다.
- `lib/data/*` 저장소 인터페이스와 LocalRepository, CloudRepository stub, repository registry, ownership migration을 추가했습니다.
- `/account` 페이지를 추가해 게스트 모드, 브라우저 내부 테스트 계정, 워크스페이스, mock 멤버 역할, export/import/delete를 관리하게 했습니다.
- AppShell 초기화에서 계정/워크스페이스 확인, ownership migration, 월 크레딧 지급, 보관 기간 정리, 알림 동기화를 순서대로 실행하도록 정리했습니다.
- 기존 localStorage 키는 변경하지 않고 새 계정 관련 키만 `lib/storageKeys.ts`에 추가했습니다.
- `.env.example`에 인증/DB/스토리지 전환용 환경변수 이름만 추가했고 실제 값은 넣지 않았습니다.

## 실행하지 못해 확인 불가능한 항목

현재 RC-0.2 정리 환경에는 프로젝트 `node_modules`가 없어 아래 항목은 실행 검증하지 못했습니다.

- `npm.cmd install`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run dev`
- 브라우저 렌더링 확인
- 모바일 반응형 실기기 확인
- Clipboard API 실제 권한 동작
- Web Share API 실제 취소/공유 동작
- Blob 다운로드 실제 파일 생성
- Canvas PNG 실제 생성과 다운로드
- Studio 디자인이 Export Web Share 파일 공유에 실리는지 확인
- `/api/ai/generate-text`, `/api/ai/recommend-design`, `/api/ai/health` 실제 Next.js 라우트 응답
- AI 생성 실패 mock 흐름에서 크레딧 환불과 AI 요청 기록 완료 상태가 정확히 1회만 기록되는지 확인
- `/account` 게스트/테스트 계정 전환, mock 워크스페이스, export/import/delete 실제 브라우저 동작
- ownership migration이 기존 localStorage 데이터를 잃지 않고 optional 필드를 붙이는지 확인

## 실제 실행 시 우선 확인할 페이지

1. `/create`: 권리 확인 미체크 시 생성과 크레딧 차감이 모두 막히는지 확인
2. `/results`: 캡션 선택, 복사, 수정 저장, JSON 다운로드 확인
3. `/api/ai/health`: MockProvider health가 외부 API 미연동 상태로 응답하는지 확인
4. `/account`: 게스트 안내, 테스트 계정, 워크스페이스, mock 멤버, export/import/delete 확인
5. `/pricing`: 월 지급 mock, 플랜 변경, 추가 크레딧 mock 구매, 원장 필터 확인
6. `/export`: 전체 다운로드, 개별 TXT/JSON/PNG 다운로드, Web Share 지원/미지원 fallback 확인
7. `/studio`: 업로드 이미지 합성, 텍스트 줄바꿈, 템플릿/색상/위치 변경, PNG 다운로드, 세트 생성 확인
8. `/privacy`: 개인정보 설정 저장, 데이터 내보내기, 삭제 확인, 신고 접수, 감사 기록 확인
9. `/history`: 다시 생성, 이 스타일로 다시 만들기, 디자인 다시 열기/복제/다운로드, 내보내기 배지 확인
10. `/dashboard`: 크레딧 카드, 개인화 카드, 최근 내보내기, 오늘 할 일 확인
11. 모바일 하단 내비게이션: 홈, 만들기, 기록, 내보내기, 더보기 접근 확인

## 예상 위험 구간

- `npm` 또는 `node` PATH 문제로 로컬 실행이 막힐 수 있습니다.
- Next.js 15와 React 19 조합의 타입/빌드 결과는 실제 `npm.cmd run typecheck`로 확인해야 합니다.
- 브라우저별 Clipboard API, Web Share API, 다중 다운로드 제한 차이가 있습니다.
- Studio Canvas PNG 생성은 이미지 onload 실패, 큰 이미지 렌더링, 한글 줄바꿈, 세션 Object URL 손실 상황을 브라우저에서 확인해야 합니다.
- localStorage 용량 한도에 가까워질 경우 반복 일정, 캠페인, 내보내기 기록 저장이 실패할 수 있습니다.
- 개인정보 전체 삭제 후 앱이 모든 기본값으로 자연스럽게 복구되는지는 브라우저 QA가 필요합니다.
- Studio는 실제 이미지 Blob을 localStorage에 저장하지 않으므로 새로고침 뒤 원본 이미지 기반 재렌더링은 세션 이미지가 없으면 fallback 배경으로 표시됩니다.
- AI API 라우트는 현재 MockProvider만 호출하지만, 실제 provider 추가 시 서버 인증, rate limit, 서버 원장 트랜잭션, 비용 모니터링이 필요합니다.
- AI 요청 기록은 원문을 저장하지 않지만 localStorage 기반이라 운영 환경의 감사 로그로는 부족합니다.
- 계정/워크스페이스 userId는 클라이언트 mock 값이므로 실제 서버 권한으로 신뢰할 수 없습니다.
- CloudRepository는 현재 미구현 응답만 제공하므로 실제 동기화처럼 표현하지 않아야 합니다.
- 데이터 import replace는 브라우저 다운로드 차단 설정에 따라 백업 파일 다운로드가 사용자에게 보이지 않을 수 있습니다.
- `TODO` 사업자 정보는 개인정보 처리방침 초안 요구사항에 따라 의도적으로 유지했습니다.

## 정적 검사 결과

- 충돌 마커 없음
- 디버깅 `console.log` 없음
- 하드코딩된 API 키 또는 시크릿 패턴 없음
- `@/` import 대상 파일 존재 확인: 누락 없음
- 필수 라우트 파일 존재 확인: 누락 없음
- 브라우저 API 사용 파일은 클라이언트 컴포넌트 또는 환경 가드 사용
- Studio Canvas 렌더링, Blob 다운로드, Object URL 사용은 브라우저 전용 모듈에서만 실행되도록 분리
- 다운로드와 SNS 내보내기에는 크레딧 차감 없음
- 실제 AI API, 결제 API, SNS OAuth/API 연결 없음
- 외부 패키지 추가 없음
- `.env.example`에는 실제 시크릿 없이 환경변수 이름만 추가
- 실제 인증, OAuth, 이메일 인증, 외부 DB, 클라우드 저장 네트워크 요청 없음
- `/diagnostics`, `/demo` 라우트 추가 확인
- 진단센터와 데모 모드는 실제 AI, 인증, 결제, SNS API, 클라우드 저장을 호출하지 않음
- 진단 보고서는 원문 캡션, 이미지, 이메일, API 키, 토큰, 결제정보, 전체 localStorage 원문을 포함하지 않도록 구성
- 데모 데이터 삭제는 `demo: true` 또는 `source: "demo"` 표시가 있는 항목만 정리하도록 제한
- 복구 제안은 자동 실행하지 않고, 사용자가 명시 버튼을 누르면 백업 JSON 다운로드 후 실행하도록 구성

## 다음 작업 추천

1. Node/npm PATH 복구
2. `npm.cmd install`
3. `npm.cmd run typecheck`
4. `npm.cmd run build`
5. `npm.cmd run dev`
6. `/api/ai/*` mock 응답과 실패 환불 QA
7. `/account` export/import/delete, 테스트 계정 전환, ownership migration QA
8. `/studio` Canvas 렌더링과 PNG 다운로드 QA
9. 주요 라우트 브라우저 QA
10. 모바일 뷰포트 QA
11. 크레딧 원장과 History 연결 테스트 추가
12. localStorage 손상 데이터 복구 테스트 추가
13. 실제 운영 전 개인정보 처리방침, 이용약관, 광고·협찬 안내 법률 검토
14. 실제 백엔드 전환 전 서버 권한 검증과 credit ledger transaction 설계
15. `/diagnostics` 전체 진단, 보고서 다운로드, 복구 제안, QA 체크리스트 저장 QA
16. `/demo` 샘플 데이터 생성, 데모 데이터만 삭제, 샘플 prefill 이동 QA

## Snapshot Audit: PostKit MVP RC-0.2

Snapshot date: 2026-07-02

The project has been prepared as the static-code source snapshot, `PostKit MVP RC-0.2`.

Snapshot preparation checks:

- No feature behavior, pricing policy, or integration boundary was intentionally changed.
- No real AI, payment, authentication, SNS, or cloud API was connected.
- No external package was installed.
- `.env.local` was not present.
- `node_modules`, `.next`, `dist`, `build`, and `coverage` were not present.
- No user image/video files were found in the source tree.
- `package-lock.json` was not present and was not generated.
- `console.log` and `debugger` were not found in app/component/lib/type source files.
- Conflict markers were not found in app/component/lib/type/config/document files scanned.
- Secret-pattern search did not find real credentials; hits were limited to existing detection regexes or exclusion labels.
- `/video-studio` source is present, but browser WebM QA is still required.

Snapshot documents added:

- `FILE_MANIFEST.md`
- `FEATURE_MANIFEST.md`
- `RUNBOOK.md`
- `SNAPSHOT_INFO.md`

Execution caveat:

This audit remains static. Dependency installation, typecheck, build, dev server, and browser QA still need to be run on a working Node.js environment, starting with `npm.cmd install`.
