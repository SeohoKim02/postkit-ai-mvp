# PostKit Project Status

중간 체크포인트 문서입니다. 이번 업데이트에서는 기존 기능을 삭제하지 않고, 향후 실제 회원가입·로그인·클라우드 저장·여러 기기 동기화를 연결하기 위한 계정 및 데이터 저장 계층 v1을 추가했습니다. 실제 회원가입 API, 외부 인증, 클라우드 DB, 실제 AI 이미지 생성 API, 실제 외부 AI API, 결제 API, 카드 결제창, SNS OAuth, SNS 자동 게시 API, 외부 캘린더 API, 푸시 알림, 실제 법률 검증 자동화는 연동하지 않았습니다.

## 2026-07-02 RC-0.2 스냅샷 정리

현재 프로젝트는 `PostKit MVP RC-0.2` 정적 코드 기준 스냅샷으로 정리되었습니다. 이번 작업은 실행 검증이 아니라 백업과 문서 정리입니다.

- RC-0.1 전체 기능을 유지합니다.
- `/video-studio` 릴스·쇼츠 영상 제작 v1을 포함합니다.
- WebM 기반 브라우저 영상 생성 구조와 MediaRecorder/canvas.captureStream 지원 진단을 포함합니다.
- Video Studio의 Export/History/Calendar/Campaign 연결을 포함합니다.
- 영상 프로젝트 설정은 `postkit-video-projects`, `postkit-video-preferences` localStorage 키에 저장합니다.
- 영상 Blob, 대용량 base64 영상, Object URL, 원본 사용자 이미지/영상은 localStorage에 장기 저장하지 않는 정책입니다.
- `npm install`은 아직 완료되지 않았습니다.
- `typecheck`, `build`, `dev server` 실행 검증은 아직 완료되지 않았습니다.
- 프로젝트에 `node_modules`가 없어 현재 실행 검증은 실패했습니다.
- `/video-studio`는 구현됐지만 실제 브라우저 WebM 생성 QA는 아직 필요합니다.
- 다음 단계는 새 컴퓨터 또는 실행 가능한 환경에서 `npm.cmd install`부터 시작하는 것입니다.
- 이번 RC-0.2 정리에서는 새 기능, 가격 정책, 크레딧 정책, 개인정보 정책, 실제 AI/API/결제/SNS/클라우드 연결을 추가하거나 변경하지 않았습니다.
- 외부 패키지를 설치하지 않았고 API 키, 토큰, 비밀번호, 시크릿을 추가하지 않았습니다.

## 2026-07-01 Video Studio v1 업데이트

- 새 라우트 `/video-studio`를 추가했습니다.
- 업로드 사진 여러 장과 생성된 문구를 이용해 Instagram Reels, Instagram Story, TikTok, YouTube Shorts용 세로 9:16 WebM 영상을 브라우저에서 합성합니다.
- 구현 방식은 Canvas API, canvas.captureStream, MediaRecorder입니다. 실제 AI 영상 생성 API나 SNS 자동 게시 API는 연결하지 않았습니다.
- MediaRecorder 또는 WebM mimeType 미지원 브라우저에서는 PNG 프레임 세트와 문구 TXT 패키지 다운로드로 fallback합니다.
- 기본 출력은 WebM이며 MP4는 향후 서버 영상 처리 기능에서 지원할 예정입니다.
- 영상 편집, WebM 다운로드, Export Center 연결, SNS 공유 준비에는 추가 크레딧을 차감하지 않습니다.
- localStorage에는 `postkit-video-projects`, `postkit-video-preferences` 설정만 저장하고 영상 Blob, 대용량 base64 영상, 임시 Object URL, 원본 이미지 전체는 저장하지 않습니다.
- Export Center, History, Calendar, Campaign, Diagnostics, Demo 흐름에 Video Studio 진입과 상태 기록을 연결했습니다.
- 프로젝트 `node_modules`가 없어 `npm.cmd run typecheck`는 `tsc` 미존재로, `npm.cmd run build`는 `next` 미존재로 완료하지 못했습니다. 실행 검증은 의존성 설치 후 다시 필요합니다.

## 1. 전체 폴더 구조

```text
PostKit/
  .gitignore
  .env.example
  AI_INTEGRATION_GUIDE.md
  BACKEND_INTEGRATION_GUIDE.md
  README.md
  PROJECT_STATUS.md
  package.json
  next.config.mjs
  postcss.config.mjs
  tailwind.config.ts
  tsconfig.json
  next-env.d.ts
  app/
    globals.css
    layout.tsx
    page.tsx
    dashboard/
      page.tsx
    create/
      page.tsx
    results/
      page.tsx
    export/
      page.tsx
    studio/
      page.tsx
    video-studio/
      page.tsx
    calendar/
      page.tsx
    campaigns/
      page.tsx
    privacy/
      page.tsx
    privacy-policy/
      page.tsx
    terms/
      page.tsx
    settings/
      page.tsx
    account/
      page.tsx
    pricing/
      page.tsx
    history/
      page.tsx
    api/
      ai/
        generate-text/
          route.ts
        recommend-design/
          route.ts
        health/
          route.ts
  components/
    AppShell.tsx
    ChoiceCard.tsx
    CopyButton.tsx
    CreditMeter.tsx
    ExportPlatformCard.tsx
    FeedbackActions.tsx
    OnboardingModal.tsx
    PackagePreview.tsx
    PageHeader.tsx
    ResultSection.tsx
    StatCard.tsx
    ui/
      Badge.tsx
      Button.tsx
      Card.tsx
  lib/
    accountStorage.ts
    ai/
      client.ts
      mockProvider.ts
      promptBuilder.ts
      provider.ts
      providerRegistry.ts
      requestStorage.ts
      types.ts
      validation.ts
    data/
      cloudRepository.ts
      localRepository.ts
      migrations.ts
      repositoryRegistry.ts
      types.ts
    constants.ts
    creditLedger.ts
    creditStorage.ts
    credits.ts
    calendarStorage.ts
    calendarUtils.ts
    campaignStorage.ts
    campaignUtils.ts
    downloadUtils.ts
    canvasRenderer.ts
    video/
      videoPresets.ts
      videoTemplates.ts
      videoRenderer.ts
      videoStorage.ts
      videoSessionStore.ts
      videoUtils.ts
    designStorage.ts
    designTemplates.ts
    imageUtils.ts
    sessionImageStore.ts
    exportPresets.ts
    exportStorage.ts
    exportUtils.ts
    learning.ts
    mockAi.ts
    personalization.ts
    plans.ts
    notificationStorage.ts
    privacyContent.ts
    privacyStorage.ts
    storageKeys.ts
    shareUtils.ts
    storage.ts
    subscription.ts
  types/
    index.ts
```

## 2. 구현 완료된 기능 목록

- Landing Page: 핵심 문구, CTA, 샘플 결과 미리보기, 핵심 플랜 요약
- Dashboard: 플랜, 총 잔액, 구독/구매 잔액, 다음 지급일까지 남은 날짜, 생성 가능 패키지 수, 크레딧 관리 버튼
- Dashboard: 최근 내보내기, 이번 달 다운로드 횟수, SNS 공유 준비 횟수, 자주 내보낸 플랫폼 표시
- Dashboard: 오늘 게시 예정, 마감 임박 캠페인, 작성 중, 검토 필요, 내보내기 준비, 기한 초과 요약
- Create Page: 생성 전 총 크레딧/차감 예정/예상 잔액 확인, 부족 안내, 안전 차감, 생성 실패 시 mock 환불
- Results Page: 결과 표시, 복사, 캡션 선택, 직접 수정, 좋아요/별로예요, 내 스타일 저장, 다시 생성, 보관함 저장, SNS 공유 준비, 내보내기 센터 이동
- AI Service Layer: 내부 API 라우트, MockProvider, prompt builder, 입력/출력 검증, requestId/idempotencyKey, AI 요청 기록
- Account/Data Layer: 게스트 모드, 테스트 계정, 워크스페이스, mock 멤버 역할, LocalRepository, CloudRepository stub, SyncQueue, 데이터 export/import/delete
- Export Center: 플랫폼별 미리보기, 개별/전체 다운로드, 문구 복사, Web Share API 공유 준비, fallback 흐름, 내보내기 기록
- Studio Page: 업로드 이미지와 생성 문구를 브라우저 Canvas로 합성해 실제 SNS용 PNG 생성, 미리보기, 수정, 다운로드, Export 연결
- Calendar Page: 월간/주간/목록 보기, 필터, 일정 CRUD, 반복 일정, 게시 완료 기록, 아이디어 보관함
- Campaigns Page: 광고·제휴 캠페인 CRUD, 필수 결과물 진행률, 일정/콘텐츠/내보내기 연결
- Privacy Center: 개인정보 설정, 수집 데이터 안내, 데이터 내보내기, 삭제, 보관 기간, 권리 침해 신고, 감사 기록
- Privacy Policy/Terms: 개인정보 처리방침 초안과 이용약관 초안
- Create Page: 업로드 권리 확인, 민감정보 안내, 경제적 이해관계 유형, 광고 표시 누락 경고
- AppShell: 데스크톱 사이드 내비게이션과 모바일 하단 5개 항목/더보기 메뉴
- Pricing/Credits Page: 플랜 변경 mock, 추가 크레딧 mock 구매, 크레딧 요약, 최근 크레딧 원장 필터
- Settings Page: 브랜드 설정, 개인화 관리, 온보딩 다시 진행
- Account Page: 현재 계정 상태, 저장 위치, 워크스페이스, 개인정보 설정 요약, 데이터 관리, 전체 삭제
- History Page: 실제 차감 크레딧, 차감 원장 ID, 환불 여부, 구독/구매 사용량, 개인화 스타일, 내보내기 상태 배지 표시
- Onboarding: 첫 방문 3단계 온보딩
- 공통 UI: 밝고 부드러운 SaaS 카드/버튼/배지 스타일 유지

## 3. 구독 플랜과 추가 크레딧

구독 플랜:

- Free: 월 0원 / 10 크레딧
- Starter: 월 9,900원 / 120 크레딧
- Creator: 월 14,900원 / 260 크레딧
- Creator Plus: 월 19,900원 / 450 크레딧
- Business: 월 49,000원 / 1,400 크레딧
- Agency: 월 149,000원 / 5,500 크레딧

추가 크레딧:

- 100 크레딧: 8,900원
- 300 크레딧: 24,900원
- 700 크레딧: 54,900원
- 1,500 크레딧: 99,000원
- 5,000 크레딧: 249,000원

데이터 출처는 `lib/plans.ts`입니다.

## 4. 크레딧 데이터 구조

localStorage 키: `postkit-credit-account`

주요 필드:

- `currentPlan`
- `subscriptionStatus`
- `billingCycleStartedAt`
- `nextCreditGrantAt`
- `subscriptionCreditBalance`
- `purchasedCreditBalance`
- `totalCreditBalance`
- `lifetimeGrantedCredits`
- `lifetimePurchasedCredits`
- `lifetimeUsedCredits`
- `lifetimeRefundedCredits`
- `scheduledPlanChange`
- `lastUpdatedAt`
- `version`

`totalCreditBalance`는 저장값만 신뢰하지 않고 `subscriptionCreditBalance + purchasedCreditBalance`로 정규화합니다. 기존 `postkit-account.credits` 값은 최초 진입 시 새 구조로 마이그레이션합니다.

## 5. 크레딧 원장

localStorage 키: `postkit-credit-ledger`

원장 type:

- `initial_grant`
- `subscription_grant`
- `plan_upgrade`
- `plan_downgrade`
- `credit_purchase`
- `generation_debit`
- `generation_refund`
- `manual_adjustment`
- `credit_expiration`
- `rollover`

원장 항목은 `id`, `type`, `amount`, `balanceAfter`, `subscriptionBalanceAfter`, `purchasedBalanceAfter`, `description`, `relatedContentId`, `relatedPlan`, `createdAt`, `metadata`를 저장합니다.

## 6. 크레딧 사용 순서

콘텐츠 생성 시 구독 크레딧을 먼저 사용하고, 부족한 부분만 구매 크레딧에서 차감합니다.

예:

- 구독 크레딧 20
- 구매 크레딧 50
- 30 크레딧 사용
- 결과: 구독 0, 구매 40

잔액이 부족하면 생성 작업을 시작하지 않고 원장도 기록하지 않습니다.

## 7. 월 지급 및 이월 방식

앱 진입 시 `nextCreditGrantAt`이 지났는지 확인해 월 크레딧을 mock 지급합니다. 실제 운영에서는 서버 스케줄러와 결제 상태 검증이 필요합니다.

안전 정책:

- 같은 지급 주기에 중복 지급하지 않도록 `nextCreditGrantAt`을 갱신합니다.
- 여러 달이 지나도 한 번에 무제한 지급하지 않고 안전 제한을 둡니다.
- 지급, 만료, 이월은 원장에 기록합니다.

이월 정책:

- Free: 이월 없음
- Starter: 이월 없음
- Creator: 최대 50 크레딧
- Creator Plus: 최대 100 크레딧
- Business: 최대 300 크레딧
- Agency: 최대 1,000 크레딧

구매 크레딧은 구독 크레딧과 분리되며 월 초기화로 삭제하지 않습니다.

## 8. 플랜 변경 방식

- 현재 플랜 버튼은 비활성화하고 “현재 이용 중”으로 표시합니다.
- 플랜 변경 버튼을 누르면 확인 모달을 표시합니다.
- 업그레이드는 즉시 적용하고 이번 달 월 크레딧 차액을 mock 지급합니다.
- 다운그레이드는 다음 지급일부터 적용되도록 `scheduledPlanChange`에 저장합니다.
- 모든 변경은 `plan_upgrade` 또는 `plan_downgrade` 원장으로 기록합니다.
- 실제 결제는 발생하지 않습니다.

## 9. 추가 구매 mock 방식

- 추가 크레딧 상품을 선택하면 확인 모달을 표시합니다.
- 확인 시 실제 결제 없이 `purchasedCreditBalance`에 추가합니다.
- `credit_purchase` 원장을 기록합니다.
- 화면에 테스트용 mock 구매이며 실제 결제되지 않는다고 표시합니다.

## 10. 개인화 및 AI 서비스 계층 상태

- 개인화 데이터 키: `postkit-personalization-profile`
- 선택, 복사, 좋아요, 별로예요, 수정, 내 스타일 저장 기록을 가중치 점수로 저장합니다.
- 내보내기 행동은 플랫폼 선호도에 가볍게 반영합니다.
  - 다운로드: +1
  - 전체 문구 복사: +2
  - SNS 공유 완료: +3
  - 같은 플랫폼 반복 내보내기: +1
- Create와 Results는 `lib/mockAi.ts`를 직접 호출하지 않고 `lib/ai/client.ts`와 `/api/ai/generate-text`를 거칩니다.
- 현재 등록된 실제 동작 공급자는 `MockProvider`뿐입니다.
- `lib/mockAi.ts`는 MockProvider 내부에서 기존 mock 결과를 생성하는 함수로 유지합니다.
- `lib/ai/promptBuilder.ts`는 플랫폼, 목적, 브랜드 설정, 개인화 요약, 캠페인 정보, 필수/금지 문구, 광고 표시 방식을 구조화된 안전 컨텍스트로 만듭니다.
- 원본 사진/영상, 전체 History, 개인정보 원문은 프롬프트에 넣지 않습니다.
- AI 사용 기록 localStorage 키:
  - `postkit-ai-request-history`
  - `postkit-ai-preferences`
- AI API 라우트:
  - `POST /api/ai/generate-text`
  - `POST /api/ai/recommend-design`
  - `GET /api/ai/health`
- 실제 외부 AI API는 호출하지 않습니다.

## 10-1. 계정 및 데이터 저장 계층 v1

새 페이지: `/account`

현재 상태:

- 게스트 모드가 기본이며 기존 localStorage 사용자는 모든 기능을 제한 없이 계속 사용할 수 있습니다.
- 테스트 계정 만들기, 테스트 계정 전환, mock 로그아웃, 게스트 전환을 제공합니다.
- 실제 회원가입, 이메일 인증, OAuth, 비밀번호 입력, 인증 토큰 저장은 없습니다.
- Account 페이지는 현재 데이터가 이 브라우저에만 저장된다는 점과 클라우드 동기화가 아직 연결되지 않았다는 점을 표시합니다.

계정 타입:

- `UserAccount`
- `UserProfile`
- `UserSession`
- `Workspace`
- `WorkspaceMember`
- `WorkspaceRole`
- `SubscriptionOwner`
- `DataOwnership`
- `SyncStatus`
- `SyncQueueItem`
- `StorageAdapterStatus`

워크스페이스 역할:

- owner: 모든 데이터 관리, 플랜 관리, 멤버 관리, 전체 삭제
- admin: 콘텐츠·캠페인·일정 관리, 일부 멤버 관리, 플랜 변경 불가
- editor: 콘텐츠 생성·수정·내보내기, 플랜과 멤버 관리 불가
- viewer: 보기와 다운로드만 가능

저장소 계층:

- `lib/data/localRepository.ts`: 현재 실제 작동하는 localStorage repository
- `lib/data/cloudRepository.ts`: 실제 네트워크 요청 없이 미구현 응답만 제공하는 cloud adapter stub
- `lib/data/repositoryRegistry.ts`: active repository와 저장소 선호 설정
- `lib/data/migrations.ts`: 기존 데이터에 선택적 `userId`, `workspaceId`, `ownership` 필드를 연결
- `lib/accountStorage.ts`: mock 계정, 세션, 워크스페이스, 멤버, SyncQueue, 데이터 export/import/delete wrapper

마이그레이션:

- AppShell 초기화 시 게스트 계정과 기본 워크스페이스를 확인합니다.
- 기존 데이터가 있으면 `ownership-v1` 마이그레이션으로 선택적 `userId`, `workspaceId`, `ownership`을 붙입니다.
- 마이그레이션 실패 시 백업 export object로 기존 데이터를 복구하고 원본 키를 삭제하지 않습니다.
- 동일 user/workspace에 대한 완료된 마이그레이션은 반복 실행하지 않습니다.

데이터 내보내기/가져오기:

- `schemaVersion`, `exportedAt`, `source`, `excluded`, `data`를 포함한 JSON export를 제공합니다.
- 가져오기 전 schemaVersion, 파일 크기, 구조, 시크릿 패턴을 검증합니다.
- 가져오기 방식은 병합 또는 백업 후 교체입니다.
- 원본 이미지 Blob, 임시 Object URL, 비밀번호, 토큰, API 키, 결제 카드 정보는 저장하거나 내보내지 않습니다.

보안 원칙:

- 비밀번호 필드 없음
- 인증 토큰 localStorage 저장 없음
- API 키 localStorage 저장 없음
- 결제 정보 저장 없음
- mock userId/workspaceId는 실제 서버 권한으로 신뢰할 수 없음
- 실제 운영에서는 서버 세션, row ownership, workspace role, rate limit, 감사 로그 검증이 필요

## 11. SNS 내보내기와 다운로드 v1

새 페이지: `/export`

내보내기 센터에서 표시하는 항목:

- 선택한 생성 콘텐츠
- 플랫폼, 목적, 생성 날짜
- 생성 당시 개인화 스타일
- 업로드 자료명
- 선택 캡션, 전체 캡션, 해시태그, CTA, 광고/협찬 표시 문구, 썸네일 문구
- 플랫폼별 내보내기 상태

다운로드 지원 파일 유형:

- PNG: Studio에서 만든 실제 Canvas 디자인 PNG를 우선 사용. Studio 디자인이 없거나 렌더링할 수 없으면 기존 mock 플랫폼 미리보기 이미지 fallback 사용
- TXT: 캡션, 해시태그, CTA, 광고/협찬 표시 문구, 썸네일 문구, 전체 업로드 문구
- JSON: 콘텐츠 메타데이터

현재 원본 사진/영상 다운로드 상태:

- 업로드 원본 File 객체는 서버나 localStorage에 저장하지 않습니다.
- 원본 파일이 필요한 경우 향후 실제 저장소 연동 후 지원합니다.
- 영상 생성은 mock 상태이며, 실제 영상 파일이 없으면 빈 파일을 만들지 않습니다.

전체 다운로드 방식:

- 외부 ZIP 패키지를 설치하지 않았습니다.
- 다운로드 가능한 파일을 순서대로 개별 다운로드합니다.
- 브라우저 설정에 따라 여러 파일 다운로드 허용이 필요할 수 있다는 안내를 표시합니다.

SNS 공유 흐름:

- `navigator.share`가 있으면 Web Share API로 텍스트와 URL 공유를 시도합니다.
- `navigator.canShare`는 파일 공유 가능 여부 확인 함수로 분리했습니다.
- 공유가 지원되지 않거나 실패하면 fallback으로 mock 이미지 다운로드, 전체 업로드 문구 복사, 플랫폼 웹페이지 열기를 진행합니다.
- 실제 SNS 로그인, OAuth, 자동 게시 API 호출은 없습니다.

플랫폼 프리셋:

- Instagram Feed: 1080×1350
- Instagram Story: 1080×1920
- Instagram Reels: 1080×1920
- TikTok: 1080×1920
- YouTube Shorts: 1080×1920
- Facebook: 1080×1080
- X: 1600×900

관련 파일:

- `lib/exportPresets.ts`: 플랫폼 이름, 콘텐츠 유형, 권장 비율, 출력 크기, 지원 파일 유형, URL
- `lib/exportUtils.ts`: 파일명 생성, 전체 업로드 문구 조합, 체크리스트, 개인화 반영
- `lib/downloadUtils.ts`: Blob 다운로드, TXT/JSON 다운로드, canvas 기반 mock PNG 생성
- `lib/shareUtils.ts`: Web Share API와 플랫폼 열기
- `lib/exportStorage.ts`: 내보내기 기록과 선호 프리셋 localStorage 저장

내보내기 localStorage 키:

- `postkit-export-history`
- `postkit-export-preferences`

## 11-1. Studio 디자인 생성기 v1

새 페이지:

- `/studio`

핵심 기능:

- 플랫폼과 화면 비율 선택
- 업로드 이미지 선택
- PostKit 자체 템플릿 선택
- 제목, 보조 문구, CTA, 브랜드명, 광고 표시 문구 직접 수정
- 텍스트 위치, 정렬, 글자 크기 조정
- 이미지 확대/축소, X/Y 위치, 밝기, 오버레이 강도 조정
- 대표색과 보조색 선택
- 실시간 Canvas 미리보기
- PNG 다운로드
- 피드·스토리·릴스 세트 생성
- TikTok·Shorts 세트 생성
- Export Center 이동

지원 출력 크기:

- Instagram 세로 피드: 1080×1350
- Instagram 정사각 피드: 1080×1080
- Instagram Story: 1080×1920
- Instagram Reels 썸네일: 1080×1920
- TikTok: 1080×1920
- YouTube Shorts: 1080×1920
- YouTube 가로 썸네일: 1280×720
- Facebook 정사각 게시물: 1080×1080
- X 가로 이미지: 1600×900

지원 템플릿:

- 사진 중심
- 아래쪽 제목
- 중앙 문구
- 좌측 정렬 정보형
- 제품 홍보형
- 자연스러운 후기형
- 할인 이벤트형
- 신상품 출시형
- 고급 브랜드형
- 미니멀형

Canvas 렌더링 흐름:

1. 현재 결과(`postkit-current-result`)를 불러옵니다.
2. 저장된 디자인이 있으면 `postkit-design-projects`에서 가장 최근 디자인을 불러옵니다.
3. 저장된 디자인이 없으면 생성 결과의 플랫폼, 목적, 개인화 스타일, 브랜드 설정을 기준으로 기본 디자인을 만듭니다.
4. 현재 브라우저 세션에 업로드 이미지 Object URL이 있으면 배경 이미지로 사용합니다.
5. 세션 이미지가 없거나 손상된 경우 PostKit fallback 배경을 렌더링합니다.
6. 템플릿, 오버레이, 문구, 브랜드명, CTA, 광고 표시 문구를 Canvas에 그립니다.
7. 다운로드 또는 Web Share 파일 공유 시 Canvas를 PNG Blob으로 변환합니다.

저장 방식:

- localStorage에는 디자인 설정값만 저장합니다.
- 실제 이미지 Blob, 생성 PNG Blob, 원본 File 객체는 localStorage에 저장하지 않습니다.
- 업로드 이미지는 현재 브라우저 세션의 Object URL로만 유지합니다.
- 새 파일 선택 또는 명시적 해제 시 Object URL을 해제합니다.

localStorage 키:

- `postkit-design-projects`
- `postkit-design-preferences`

History 연결:

- 디자인 저장 시 현재 결과의 `designs`에 디자인 설정 스냅샷을 연결합니다.
- History에서 디자인 다시 열기, 디자인 복제, 디자인 PNG 다운로드를 제공합니다.
- 디자인 Blob은 저장하지 않고 설정값으로 다시 렌더링합니다.

Export 연결:

- Export Center는 Studio 디자인이 있으면 첫 이미지 자산을 `design_canvas`로 교체합니다.
- 개별 다운로드, 전체 다운로드, Web Share 파일 공유에서 실제 Canvas PNG를 우선 사용합니다.
- 렌더링 실패 시 텍스트/TXT/JSON 다운로드는 계속 동작하도록 분리했습니다.

Campaign/Calendar 연결:

- 일정 카드에서 Studio를 열 수 있습니다.
- 캠페인 상세의 빠른 작업에서 Studio 디자인으로 이동할 수 있습니다.
- Studio 저장 시 기존 캠페인/일정 콘텐츠 연결 로직을 유지합니다.

크레딧 정책:

- Canvas 디자인 편집, 저장, 다운로드, 내보내기는 0 크레딧입니다.
- 최초 업로드 패키지 생성 비용 30 크레딧에 포함된 작업으로 처리합니다.
- 완전히 새로운 콘텐츠 생성 또는 다시 생성만 기존 정책대로 차감합니다.

내보내기 기록 구조:

- `exportId`
- `contentId`
- `platform`
- `exportType`
- `downloadedFiles`
- `copiedFields`
- `shared`
- `openedPlatform`
- `exportedAt`
- `status`
- `errorMessage`

내보내기 type:

- `single_download`
- `full_download`
- `text_copy`
- `web_share`
- `platform_open`
- `export_retry`

크레딧 정책:

- 개별 파일 다운로드: 0 크레딧
- 전체 다운로드: 0 크레딧
- 캡션/해시태그/전체 문구 복사: 0 크레딧
- SNS 공유창 열기: 0 크레딧
- 플랫폼 웹페이지 열기: 0 크레딧
- 새 콘텐츠 생성과 다시 생성만 기존 정책에 따라 30 크레딧을 차감합니다.

## 12. 콘텐츠 캘린더와 캠페인 관리 v1

새 페이지:

- `/calendar`
- `/campaigns`

콘텐츠 일정 데이터 구조: `ContentSchedule`

- `id`, `version`
- `title`, `platform`, `purpose`
- `scheduledAt`
- `brandName`, `campaignId`, `campaignName`, `productName`
- `status`
- `isSponsored`
- `requiredKeywords`, `bannedKeywords`, `requiredHashtags`
- `disclosureStyle`, `discountCode`, `linkGuide`
- `internalMemo`
- `linkedContentId`, `linkedExportIds`, `lastExportedAt`
- `repeatOption`, `repeatGroupId`
- `publishedAt`, `publishedUrl`, `actualCaption`, `publishedPlatform`, `publishMemo`
- `createdAt`, `updatedAt`

일정 상태:

- 아이디어
- 작성 중
- 검토 필요
- 게시 준비 완료
- 게시 예정
- 게시 완료
- 보류
- 기한 초과

게시일이 지났지만 완료되지 않은 일정은 기한 초과로 계산합니다.

반복 일정:

- 반복 없음
- 매주
- 2주마다
- 매월

한 번에 최대 12개까지만 생성합니다. 반복 일정 삭제 시 “이 일정만 삭제”와 “이후 일정 삭제”를 제공합니다.

콘텐츠 아이디어 데이터 구조: `ContentIdea`

- `id`, `version`
- `title`, `category`, `platform`, `purpose`
- `memo`, `preferredDate`, `tags`
- `convertedToSchedule`
- `createdAt`, `updatedAt`

캠페인 데이터 구조: `Campaign`

- `id`, `version`
- `campaignName`, `advertiserName`, `brandName`, `productName`
- `campaignType`, `description`
- `startDate`, `endDate`, `contentDeadline`
- `publishStartAt`, `publishEndAt`
- `targetPlatforms`
- `requiredDeliverables`
- `requiredKeywords`, `bannedKeywords`, `requiredHashtags`
- `disclosureStyle`, `discountCode`, `landingUrl`
- `contactName`, `contactChannel`
- `compensationType`, `compensationNote`
- `campaignStatus`
- `relatedContentIds`, `relatedScheduleIds`
- `internalMemo`
- `createdAt`, `updatedAt`

캠페인 유형:

- 제품 제공
- 원고료 광고
- 공동구매
- 제휴 링크
- 할인코드
- 브랜드 앰배서더
- 자체 제품 홍보
- 일반 콘텐츠

캠페인 상태:

- 제안 검토 중
- 수락
- 제작 중
- 광고주 검토 중
- 수정 요청
- 게시 준비 완료
- 진행 중
- 완료
- 취소

필수 결과물:

- Instagram 피드
- Instagram 스토리
- Instagram 릴스
- TikTok
- YouTube Shorts
- Facebook 게시물
- X 게시물
- 썸네일
- 캡션
- 해시태그
- 광고주 확인용 시안

결과물 상태:

- 미시작
- 생성 완료
- 수정 중
- 승인 대기
- 승인 완료
- 게시 완료

알림 데이터 구조: `PostKitNotification`

- `id`, `version`
- `type`
- `title`, `message`
- `relatedScheduleId`, `relatedCampaignId`
- `read`
- `createdAt`

알림 유형:

- 게시 예정 24시간 전
- 게시 예정 1시간 전
- 캠페인 마감 임박
- 필수 결과물 미완료
- 광고 표시 문구 누락
- 기한 초과
- 검토 대기

알림은 실제 푸시가 아니라 앱 진입 시 localStorage 데이터로 계산하는 내부 알림입니다. 하단/사이드 내비게이션의 캘린더 항목에 읽지 않은 알림 수를 표시합니다.

Create 연결:

- 캠페인 또는 일정에서 Create로 이동하면 플랫폼, 목적, 제품명, 필수/금지 키워드, 해시태그, 광고 표시 방식, 할인코드, 링크 안내, 브랜드명, 캠페인 ID, 일정 ID를 prefill로 전달합니다.
- 콘텐츠 생성 완료 후 `campaignId`, `campaignName`, `scheduleId`, `brandName`을 생성 결과에 저장합니다.
- 생성 완료 후 캠페인에는 콘텐츠 ID를 연결하고, 일정에는 콘텐츠 ID를 연결합니다.
- 캠페인의 관련 결과물은 생성 완료 상태로 갱신합니다.

Export 연결:

- 일정에서 Export로 이동하면 현재 생성 결과에 `scheduleId`를 포함해 저장합니다.
- 내보내기 완료 시 일정의 `lastExportedAt`과 `linkedExportIds`가 갱신됩니다.
- 자동으로 게시 완료 처리하지 않고, 사용자가 직접 “게시 완료 처리”를 눌러야 합니다.

크레딧 정책:

- 일정 등록, 수정, 삭제: 0 크레딧
- 캠페인 등록, 수정, 삭제: 0 크레딧
- 아이디어 등록, 일정 전환: 0 크레딧
- 체크리스트 사용: 0 크레딧
- 게시 완료 기록: 0 크레딧
- 다운로드와 SNS 내보내기: 0 크레딧
- 새 콘텐츠 생성과 다시 생성만 30 크레딧

localStorage 키:

키 이름은 기존 데이터를 보존하기 위해 변경하지 않았고, 코드에서는 `lib/storageKeys.ts`의 `STORAGE_KEYS`에서 중앙 관리합니다.

- `postkit-content-schedules`
- `postkit-campaigns`
- `postkit-content-ideas`
- `postkit-notifications`
- `postkit-calendar-preferences`

관련 파일:

- `app/calendar/page.tsx`
- `app/campaigns/page.tsx`
- `lib/calendarStorage.ts`
- `lib/calendarUtils.ts`
- `lib/campaignStorage.ts`
- `lib/campaignUtils.ts`
- `lib/notificationStorage.ts`

## 13. 개인정보 보호와 저작권 안전장치 v1

새 페이지:

- `/privacy`
- `/privacy-policy`
- `/terms`

개인정보 설정 localStorage 키:

- `postkit-privacy-preferences`
- `postkit-consent-records`
- `postkit-privacy-audit-log`
- `postkit-infringement-reports`
- `postkit-retention-settings`
- `postkit-ai-request-history`
- `postkit-ai-preferences`
- `postkit-user-session`
- `postkit-user-accounts`
- `postkit-user-profiles`
- `postkit-workspaces`
- `postkit-workspace-members`
- `postkit-storage-preferences`
- `postkit-sync-queue`
- `postkit-data-migration-state`

개인정보 설정 구조: `PrivacyPreferences`

- `personalizationLearningAllowed`
- `contentAutoSaveAllowed`
- `originalFileStorageAllowed`
- `analyticsAllowed`
- `marketingNotificationsAllowed`
- `globalAiTrainingAllowed`
- `updatedAt`
- `version`

보관 기간 구조: `RetentionSettings`

- `originalFileRetention`: `none`, `7d`, `30d`, `90d`, `until_deleted`
- `lastCleanupAt`
- `updatedAt`
- `version`

개인정보 감사 기록 이벤트:

- `consent_updated`
- `personalization_enabled`
- `personalization_disabled`
- `data_exported`
- `content_deleted`
- `personalization_deleted`
- `all_data_deleted`
- `retention_changed`
- `rights_confirmation`
- `infringement_reported`

감사 기록에는 실제 사진, 캡션, 개인정보 원문을 저장하지 않고 이벤트 종류와 일시만 저장합니다.

현재 개인정보 흐름:

- 업로드 파일은 서버로 전송하지 않고 브라우저 미리보기 object URL로만 사용합니다.
- 이미지 Object URL은 Studio/Export 연결을 위해 현재 브라우저 세션 저장소에 유지하며, 새 파일 선택·명시적 해제·브라우저 세션 종료 시 정리됩니다. localStorage에는 저장하지 않습니다.
- 생성 결과는 콘텐츠 자동 저장 설정이 켜진 경우에만 History에 자동 저장합니다.
- 개인 맞춤 학습 허용이 꺼져 있으면 선택/복사/수정 행동이 새 학습 점수로 저장되지 않습니다.
- 사용자의 업로드 자료와 생성 결과는 서비스 전체 AI 모델 학습에 사용하지 않습니다.
- 전체 모델 개선 동의는 별도 선택 동의가 필요하며 현재 UI에서는 비동의 기본값으로 고정했습니다.

삭제 방식:

- 업로드 파일 삭제: 히스토리와 현재 결과의 업로드 파일명, 업로드 타입, 임시 미리보기 참조를 정리합니다.
- 생성 결과 삭제: 현재 결과, 생성 히스토리, Studio 디자인 설정, AI 요청 기록을 삭제합니다.
- History 삭제: `postkit-history`, 현재 결과, Studio 디자인 설정, AI 요청 기록을 삭제합니다.
- 개인 맞춤 학습 데이터 삭제: `postkit-personalization-profile`, `postkit-ai-preferences`를 삭제합니다.
- 내보내기 기록 삭제: `postkit-export-history`, `postkit-export-preferences`를 삭제합니다.
- 캠페인과 일정 삭제: 일정, 캠페인, 아이디어, 알림, 캘린더 설정을 삭제합니다.
- 전체 계정 데이터 삭제: `postkit-` 계열 mock 데이터를 삭제하고 `all_data_deleted` 감사 이벤트만 다시 기록합니다.

권리 보호 기능:

- 생성 전 업로드 권리 확인 체크리스트 4개 항목을 모두 확인해야 합니다.
- 민감정보 업로드 주의 항목을 안내하지만 실제 자동 탐지는 구현하지 않았습니다.
- 관계 유형: 제품 제공, 원고료, 제휴 링크, 할인코드, 공동구매, 자체 제품
- 경제적 이해관계가 있는데 광고/협찬 표시가 비어 있으면 경고를 표시합니다.
- 권리 침해 신고 및 삭제 요청은 localStorage mock 상태로 저장합니다.
- AI 생성 결과의 독점적 저작권이나 법률적 안전성이 항상 보장되는 것은 아니라고 안내합니다.

미구현된 실제 보안 기능:

- 서버 저장소 접근 제어
- 전송/저장 암호화
- 서버 감사 로그와 삭제 검증
- 실제 개인정보 열람·정정·삭제·처리정지 접수 절차
- 권리 침해 신고 검토, 임시조치, 이의제기 절차
- 실제 연령 인증과 법정대리인 동의
- 외부 AI·클라우드 사용 시 위탁 및 국외 이전 고지
- 개인정보 처리방침과 이용약관 법률 검토

관련 파일:

- `app/privacy/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/terms/page.tsx`
- `lib/privacyStorage.ts`
- `lib/privacyContent.ts`
- `types/index.ts`
- `app/create/page.tsx`
- `app/settings/page.tsx`

## 14. 통합 안정화 및 정적 무결성 검토

이번 안정화에서 새 대형 기능은 추가하지 않았고, 기존 기능을 유지한 상태로 실행 전 위험 지점을 정리했습니다.

수정한 항목:

- 필수 라우트 존재 확인: `/`, `/dashboard`, `/create`, `/results`, `/history`, `/pricing`, `/settings`, `/export`, `/studio`, `/privacy`, `/privacy-policy`, `/terms`
- `LinkButton`, `Link`, `router.push` 경로가 존재하는 라우트와 일치하는지 정적 확인
- 모바일 하단 내비게이션을 홈, 만들기, 기록, 내보내기, 더보기로 정리
- 더보기 메뉴에 캘린더, 캠페인, 요금제, 설정, 개인정보 보호센터, 개인정보 처리방침, 이용약관 연결
- `lib/storageKeys.ts` 추가로 localStorage 키와 앱 내부 이벤트 이름 중앙 관리
- `postkit-` 키 이름은 변경하지 않아 기존 localStorage 데이터와 호환 유지
- `getHistory`, `getCurrentResult`, `getPrefill`, `getCreditLedger`가 손상된 JSON 또는 잘못된 자료형을 만나도 기본값으로 복구되도록 보강
- 공통 `Button` 기본 `type`을 `button`으로 지정
- `CopyButton`에서 Clipboard API 실패 시 앱이 멈추지 않고 “복사 실패” 피드백을 표시
- Results JSON 다운로드를 공통 다운로드 유틸로 이동해 Blob URL 해제를 안전하게 처리
- Web Share API 취소(`AbortError`)를 실패 fallback으로 처리하지 않고 취소 안내만 표시

정적 확인 결과:

- 충돌 마커 없음
- 디버깅 `console.log` 없음
- 하드코딩된 API 키 또는 시크릿 패턴 없음
- 개인정보 처리방침 초안의 사업자 정보 TODO는 요구사항에 따라 유지
- 브라우저 API를 쓰는 페이지와 유틸은 클라이언트 컴포넌트 또는 `typeof window/document/navigator` 가드 사용

상세 보고서는 `INTEGRATION_AUDIT.md`에 별도로 작성했습니다.

## 15. 실제 실행 전 확인 항목

- Node.js와 npm PATH 확인
- `npm.cmd install`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run dev`
- 전체 라우트 브라우저 QA: `/`, `/dashboard`, `/create`, `/results`, `/export`, `/calendar`, `/campaigns`, `/settings`, `/pricing`, `/history`, `/privacy`, `/privacy-policy`, `/terms`
- Studio 브라우저 QA: 업로드 이미지 합성, 텍스트 줄바꿈, PNG 다운로드, 세트 생성, Export 연결
- 월 지급 mock, 이월/만료 원장, 플랜 변경, 추가 구매, 생성 차감, 실패 환불 QA
- Web Share API 지원/미지원 브라우저 각각의 fallback QA
- mock PNG 다운로드, TXT/JSON 다운로드, 전체 다운로드 다중 파일 허용 안내 QA
- 모바일에서 Pricing 원장 카드와 Create 부족 안내가 잘리지 않는지 확인
- 모바일에서 Export 하단 고정 액션 영역과 긴 캡션 줄바꿈 확인
- 모바일에서 Calendar 월간/주간/목록 보기와 Campaigns 상세 패널이 잘리지 않는지 확인
- 일정 반복 생성, 반복 삭제, 게시 완료 기록, 캠페인 필수 결과물 상태 변경 QA
- 개인정보 설정 저장, 데이터 내보내기, 삭제 확인, 권리 침해 신고, 감사 기록 QA
- 업로드 권리 확인이 없을 때 생성/크레딧 차감이 막히는지 QA
- AI API 라우트 mock 응답, 입력 검증 실패, 중복 요청 방지, 실패 시 1회 환불 QA
- `/account`: 게스트 모드, 테스트 계정 전환, 워크스페이스 멤버 mock 관리, JSON export/import, 전체 삭제 QA
- 기존 localStorage 데이터에 `userId`/`workspaceId`가 없어도 앱이 정상 동작하는지 QA

현재 체크포인트에서는 npm 기반 실행 검증을 하지 않았습니다.

## 16. npm 실행 시 예상되는 오류 가능성 정적 검토

- npm 또는 Node.js PATH 문제: `npm` 명령을 찾을 수 없거나 `node` 실행이 차단될 수 있습니다.
- `node_modules` 미설치: `next`, `react`, `lucide-react`, `clsx` 모듈을 찾을 수 없습니다.
- Next.js 버전 해석: `next`가 `^15.0.0`이라 설치 시 15.x 최신 버전이 들어올 수 있습니다.
- React 19 타입 호환성: Next 15.x와 React 19 조합을 `npm.cmd run typecheck`로 확인해야 합니다.
- Clipboard API 권한: 브라우저 보안 컨텍스트에 따라 복사가 제한될 수 있습니다.
- Web Share API 지원 차이: 데스크톱 브라우저에서는 공유창이나 파일 공유가 제한될 수 있습니다.
- 다중 다운로드 차단: 전체 다운로드 시 브라우저가 여러 파일 다운로드를 막을 수 있습니다.
- canvas 이미지 생성: 매우 오래된 브라우저에서는 mock PNG 생성이 실패할 수 있습니다.
- Studio Canvas PNG 생성: 이미지 onload 실패, 큰 이미지 렌더링, 한글 줄바꿈, 세션 Object URL 손실 상황을 확인해야 합니다.
- 날짜 입력: 브라우저 현지 시간과 ISO 문자열 변환이 의도와 맞는지 QA가 필요합니다.
- localStorage 용량: 반복 일정과 캠페인을 과도하게 만들 경우 브라우저 저장소 한도에 가까워질 수 있습니다.
- localStorage 데이터: 시크릿 모드, 저장소 차단, 잘못된 JSON 데이터에서 기본값 복구가 정상인지 확인해야 합니다.
- 개인정보 삭제: 전체 계정 데이터 삭제 후 앱이 기본값으로 복구되는지 확인해야 합니다.
- 권리 확인: 체크박스 상태가 생성 전에만 쓰이고 감사 기록에 원문 데이터가 남지 않는지 확인해야 합니다.
- AI API 라우트: 서버 라우트가 client-only 저장소를 import하지 않고 MockProvider만 호출하는지 typecheck로 확인해야 합니다.
- Account/Data layer: `UserAccount`와 기존 크레딧 호환 타입 분리, ownership optional 필드, CloudRepository 미구현 응답 타입은 typecheck로 확인해야 합니다.

## 17. 수정된 파일별 역할과 주요 변경 내용

- `app/api/ai/generate-text/route.ts`: mock AI 텍스트 생성 내부 API, 입력 검증, provider 호출, 구조화 응답
- `app/api/ai/recommend-design/route.ts`: mock 디자인 추천 내부 API
- `app/api/ai/health/route.ts`: 현재 AI 공급자 health와 외부 API 미연동 상태 반환
- `app/account/page.tsx`: 게스트/테스트 계정, 워크스페이스, mock 멤버, 데이터 export/import/delete UI
- `lib/accountStorage.ts`: mock 계정·세션·워크스페이스·멤버·SyncQueue·계정 데이터 관리
- `lib/data/types.ts`: 공통 저장소 인터페이스와 결과 타입
- `lib/data/localRepository.ts`: localStorage 기반 repository 구현
- `lib/data/cloudRepository.ts`: 실제 네트워크 요청 없는 CloudRepository stub
- `lib/data/repositoryRegistry.ts`: repository 선택과 storage preferences 관리
- `lib/data/migrations.ts`: 기존 데이터 소유권 연결 마이그레이션
- `lib/ai/types.ts`: AI 작업 유형, 공급자 인터페이스, 구조화 결과, 오류 타입
- `lib/ai/promptBuilder.ts`: 개인정보 원문 없이 브랜드/개인화/캠페인 요약 기반 prompt context 생성
- `lib/ai/validation.ts`: 입력/작업/구조화 결과 검증, requestId와 idempotencyKey 생성
- `lib/ai/provider.ts`: 공급자 호출, unsupported task 처리, 최대 1회 안전 재시도 wrapper
- `lib/ai/providerRegistry.ts`: 현재 MockProvider 등록, 향후 실제 공급자 추가 위치
- `lib/ai/mockProvider.ts`: 기존 `lib/mockAi.ts`를 공급자 인터페이스 뒤에서 실행
- `lib/ai/client.ts`: 브라우저에서 `/api/ai/*`만 호출하는 래퍼
- `lib/ai/requestStorage.ts`: 원문 없는 AI 요청 기록과 AI 선호 설정 localStorage 저장
- `app/calendar/page.tsx`: 콘텐츠 캘린더, 일정 CRUD, 반복 일정, 아이디어 보관함, 게시 완료 기록
- `app/campaigns/page.tsx`: 캠페인 CRUD, 필수 결과물 진행률, 콘텐츠/일정/내보내기 연결
- `app/privacy/page.tsx`: 개인정보 보호센터, 설정, 삭제, 내보내기, 보관 기간, 신고, 감사 기록
- `app/privacy-policy/page.tsx`: 개인정보 처리방침 초안
- `app/terms/page.tsx`: 이용약관 초안
- `app/export/page.tsx`: SNS 내보내기 센터, 다운로드, 복사, Web Share/fallback, 체크리스트, 내보내기 기록
- `app/studio/page.tsx`: Canvas 디자인 생성기, 템플릿/출력 크기/문구/이미지 옵션, PNG 다운로드, Export 연결
- `lib/calendarStorage.ts`: `postkit-content-schedules`, `postkit-content-ideas`, `postkit-calendar-preferences` 저장
- `lib/calendarUtils.ts`: 날짜 처리, 반복 일정 생성, 게시 준비 체크리스트, 오늘 할 일 계산
- `lib/campaignStorage.ts`: `postkit-campaigns` 저장, 캠페인-콘텐츠-일정 연결
- `lib/campaignUtils.ts`: 캠페인 옵션, 필수 결과물, 진행률, Create prefill
- `lib/notificationStorage.ts`: `postkit-notifications` 저장, 앱 내부 알림 생성
- `lib/privacyStorage.ts`: 개인정보 설정, 동의 기록, 감사 로그, 보관 기간, 삭제, 신고 저장
- `lib/privacyContent.ts`: 개인정보 안내, 권리 확인, 민감정보, 관계 유형, 보관 옵션 상수
- `lib/storageKeys.ts`: localStorage 키와 앱 내부 이벤트 이름 중앙 관리, AI/계정/워크스페이스/동기화 키 추가
- `lib/subscription.ts`: 플랜 조회, 이월 정책, 결제 주기 날짜, 지급 안전 제한
- `lib/creditLedger.ts`: 원장 항목 생성, 안전 차감, 환불, 구매, 플랜 변경, 월 지급/이월/만료 순수 로직
- `lib/creditStorage.ts`: `postkit-credit-account`, `postkit-credit-ledger` 저장, 기존 계정 마이그레이션, mock 구매/플랜 변경 wrapper
- `lib/exportPresets.ts`: 플랫폼별 프리셋과 출력 크기 관리
- `lib/designTemplates.ts`: Studio 출력 크기와 자체 템플릿 관리
- `lib/canvasRenderer.ts`: 업로드 이미지/fallback 배경/텍스트/오버레이 Canvas 렌더링
- `lib/designStorage.ts`: `postkit-design-projects`, `postkit-design-preferences` 저장
- `lib/sessionImageStore.ts`: 브라우저 세션의 업로드 이미지 Object URL 관리
- `lib/imageUtils.ts`: 이미지 로드, 색상, 숫자 유틸
- `lib/exportUtils.ts`: 파일명 생성, 내보내기 패키지 조립, 광고/협찬 체크리스트, 개인화 점수 반영
- `lib/downloadUtils.ts`: Blob 다운로드, canvas 기반 mock PNG, TXT/JSON 다운로드
- `lib/shareUtils.ts`: Web Share API 지원 여부, 공유 실행, 플랫폼 열기
- `lib/exportStorage.ts`: `postkit-export-history`, `postkit-export-preferences` 저장
- `lib/credits.ts`: 업로드 패키지 비용 상수 호환
- `lib/storage.ts`: 기존 `postkit-account` 호환 함수가 새 크레딧 계정과 동기화되도록 보강
- `components/CreditMeter.tsx`: 총 잔액, 구독/구매 잔액, 다음 지급 D-day, 생성 가능 패키지 수 표시
- `components/ExportPlatformCard.tsx`: 플랫폼별 내보내기 미리보기와 액션 카드
- `app/create/page.tsx`: 생성 전 입력 검증, 중복 요청 방지, AI 서비스 계층 호출, 선차감, 실패 환불, 원장 ID 저장, 업로드 권리 확인, 민감정보 안내, 광고 표시 누락 경고
- `app/create/page.tsx`: 업로드 이미지 세션 Object URL을 Studio/Export까지 연결하고, 영상 업로드 기존 흐름 유지
- `app/dashboard/page.tsx`: 새 크레딧 요약, 크레딧 관리 버튼, 오늘 할 일, 내보내기 요약 카드 표시
- `app/pricing/page.tsx`: 플랜 변경 모달, 추가 구매 모달, 원장 필터, 크레딧 관리 화면
- `app/history/page.tsx`: 차감 원장 ID, 환불 여부, 구독/구매 사용량, 내보내기 버튼과 상태 배지 표시
- `app/results/page.tsx`: 내보내기 센터 진입 버튼, AI 생성 정보 카드, sample fallback 표시 추가
- `components/AppShell.tsx`: 데스크톱 내비게이션과 모바일 하단 5개 항목/더보기 메뉴 정리, 계정 초기화와 보관 기간 정리 호출
- `components/CopyButton.tsx`: Clipboard API 실패 시 안전 피드백 처리
- `components/ui/Button.tsx`: 기본 버튼 타입을 `button`으로 지정
- `app/settings/page.tsx`: 개인정보 보호센터와 처리방침 초안 진입점 추가
- `types/index.ts`: 크레딧 계정, 원장, 차감 결과, 내보내기, 캘린더, 캠페인, 알림, 개인정보/권리보호, AI 작업/요청, 계정/워크스페이스/저장소 타입 추가
- `.env.example`: 실제 값 없이 AI 공급자 환경변수 이름만 추가
- `AI_INTEGRATION_GUIDE.md`: 실제 AI 공급자 연결 가이드와 보안/개인정보/크레딧 정책 정리
- `BACKEND_INTEGRATION_GUIDE.md`: 실제 인증, 클라우드 저장, DB, 권한 검증 전환 가이드
- `README.md`, `PROJECT_STATUS.md`: 계정 및 데이터 저장 계층 v1 기준 문서 업데이트

## 18. 실행 검증 상태

이번 체크포인트에서는 새로운 패키지를 설치하지 않았습니다. PATH에서 `node`와 `npm` 명령을 찾지 못했고, 프로젝트 `node_modules`도 없어 npm 기반 명령은 실행하지 못했습니다.

아래 항목은 아직 미검증입니다.

- 의존성 설치 성공 여부
- Next.js 개발 서버 실행 여부
- TypeScript 타입 검사 결과
- 프로덕션 빌드 결과
- 실제 브라우저 렌더링
- 모바일 반응형 동작
- 실제 Web Share API 동작
- 실제 파일 다운로드 동작
- 캘린더 일정 CRUD
- 캠페인 CRUD
- 알림 수 계산
- Create/History/Export 연결
- Studio 미리보기, Canvas PNG 생성, History/Export/Calendar/Campaign 연결
- Privacy Center 설정 저장, 삭제, 내보내기, 신고, 감사 기록
- Create Page 업로드 권리 확인에 따른 생성 차단과 크레딧 미차감
- `/diagnostics`: 전체 진단 실행, 보고서 다운로드, 복구 제안, 데모 데이터 생성/삭제, QA 체크리스트 저장
- `/demo`: 샘플 데이터 기반 전체 사용자 흐름 이동

정적 검토와 파일 수준 검사만 수행했습니다.

## 18-1. 데모 모드, 진단센터, 데이터 무결성 점검 v1

새 라우트:

- `/diagnostics`
- `/demo`

진단 카테고리:

- 앱 환경
- 브라우저 지원 기능
- 라우트 상태
- 저장 데이터 상태
- 크레딧 상태
- 계정·워크스페이스 상태
- 개인화 상태
- AI 서비스 상태
- Studio·Canvas 상태
- 내보내기·공유 상태
- 개인정보 설정 상태
- 전체 사용자 흐름 체크리스트

브라우저 기능 검사:

- localStorage, sessionStorage, Clipboard, Web Share, canShare, Canvas, canvas.toBlob, File, Blob, Object URL 생성/해제, FileReader, Web Worker, requestAnimationFrame, MediaRecorder, getUserMedia, IndexedDB, Service Worker, Notification API
- 카메라, 마이크, 알림 권한은 자동 요청하지 않습니다.

데이터 무결성 검사:

- storage key 존재 여부, JSON 파싱, 배열/객체 타입, version 존재 여부, 큰 데이터, 손상 날짜, 중복 ID, 음수/NaN/Infinity, 민감 문자열 패턴, Blob/data URL 장기 저장, 끊긴 content/campaign/schedule/user/workspace 참조
- 크레딧 총액 불일치, 음수 잔액, 중복 generation debit, 중복 refund, 없는 콘텐츠에 연결된 원장, 플랜 설정, 다음 지급일
- 계정 세션, 현재 userId/workspaceId, owner 없는 workspace, 잘못된 role, SyncQueue 실패/충돌
- Studio template/output 참조, width/height, zoom, position 범위
- Export preset, Web Share/Clipboard 지원, 없는 콘텐츠 참조, 반복 실패
- 개인정보 전체 AI 학습 비동의 기본값, 감사 로그 원문 저장 여부, 민감 문자열 패턴

데모 데이터:

- 테스트 계정 1개, 개인 workspace 1개, 브랜드 workspace 1개
- 브랜드 프로필, 개인화 프로필
- 샘플 생성 콘텐츠 3개, History 3개
- 디자인 프로젝트 2개
- 캠페인 2개, 일정 4개, 아이디어 3개
- 내보내기 기록 2개, AI 요청 기록 3개
- 크레딧 계정, 크레딧 원장, 개인정보 설정
- 모든 데모 항목은 `demo: true` 또는 `source: "demo"` 표시를 남깁니다.

데모 데이터 삭제:

- `demo: true` 또는 `source: "demo"` 표시가 있는 항목만 삭제합니다.
- 실제 사용자 데이터는 자동 삭제하지 않습니다.

진단 보고서:

- 포함: 생성 시각, 앱 진단 버전, 브라우저 지원, 라우트 상태, storage key 상태, 오류/경고 수, mock provider 상태, 현재 계정 모드, 미해결 체크
- 제외: 실제 캡션 원문, 이미지, 이메일, API 키, 토큰, 결제정보, 전체 localStorage 원문

추가 localStorage 키:

- `postkit-diagnostic-history`
- `postkit-qa-checklist`
- `postkit-demo-manifest`

새 파일:

- `app/diagnostics/page.tsx`
- `app/demo/page.tsx`
- `lib/diagnostics/types.ts`
- `lib/diagnostics/browserChecks.ts`
- `lib/diagnostics/storageChecks.ts`
- `lib/diagnostics/creditChecks.ts`
- `lib/diagnostics/accountChecks.ts`
- `lib/diagnostics/privacyChecks.ts`
- `lib/diagnostics/studioChecks.ts`
- `lib/diagnostics/exportChecks.ts`
- `lib/diagnostics/report.ts`
- `lib/demo/demoData.ts`
- `lib/demo/demoStorage.ts`
- `QA_GUIDE.md`

수정 파일:

- `types/index.ts`
- `lib/storageKeys.ts`
- `components/AppShell.tsx`
- `app/account/page.tsx`
- `.env.example`
- `README.md`
- `PROJECT_STATUS.md`
- `INTEGRATION_AUDIT.md`

## 19. 다음 개발 단계 추천

1. 로컬 실행 검증: `npm.cmd install`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run dev`
2. 브라우저 QA: 월 지급, 이월/만료, 생성 차감, 실패 환불, mock 구매, 플랜 변경, 다운로드, Web Share/fallback, 캘린더/캠페인 CRUD
3. 단위 테스트 추가: `lib/creditLedger.ts`, `lib/creditStorage.ts`, `lib/subscription.ts`
4. 내보내기 테스트 추가: `lib/exportUtils.ts`, `lib/exportStorage.ts`, `lib/exportPresets.ts`
5. Studio 렌더링 테스트 추가: `lib/canvasRenderer.ts`, `lib/designStorage.ts`, 업로드 이미지 세션 연결
6. 서버 검증 설계: 결제 상태, 월 지급, 차감, 환불, 원장을 서버 트랜잭션으로 이전
7. Supabase 스키마 설계: credit_accounts, credit_ledger, subscriptions, content_history, export_history, content_schedules, campaigns, content_ideas, notifications
8. Storage 설계: 원본 이미지/영상 보관, 썸네일 렌더링 결과 저장
9. 실제 결제 연동 전 웹훅 재처리와 중복 지급 방지 설계
10. 실제 SNS API 연동 전 OAuth, 토큰 암호화, 플랫폼별 미디어 정책, 게시 실패 재시도 설계
11. 실제 예약 게시/알림 전 서버 작업 큐, 타임존, 외부 캘린더 동기화, 푸시 알림 권한 설계
12. 개인정보 처리방침, 이용약관, 광고·협찬 표시 안내, 권리 침해 신고 절차 법률 검토
13. 서버 전환 전 개인정보 삭제 검증, 감사 로그 보존, 위탁/국외이전 고지, 미성년자 동의 정책 설계

## 20. Source Snapshot: PostKit MVP RC-0.2

스냅샷 기준일: 2026-07-02

현재 프로젝트는 정적 코드 기준 소스 스냅샷 `PostKit MVP RC-0.2`로 정리되었습니다. 이번 정리는 실행 검증이 아니라 소스 백업, 파일 목록 정리, 실행 환경 인계 준비입니다.

추가된 스냅샷 문서:

- `FILE_MANIFEST.md`
- `FEATURE_MANIFEST.md`
- `RUNBOOK.md`
- `SNAPSHOT_INFO.md`

스냅샷 기준:

- 기존 기능과 가격 정책은 변경하지 않았습니다.
- 실제 AI, 결제, 인증, SNS, 클라우드 API는 연결하지 않았습니다.
- 외부 패키지를 설치하지 않았습니다.
- API 키, 토큰, 비밀번호, 시크릿을 추가하지 않았습니다.
- 브라우저 localStorage 데이터와 사용자 이미지/영상은 소스 스냅샷 대상이 아닙니다.

실행 검증 상태:

- 이 스냅샷은 정적 코드 검토 기준입니다.
- `npm install`은 아직 완료되지 않았습니다.
- `typecheck`, `build`, `dev server` 실행 검증은 아직 완료되지 않았습니다.
- 현재 환경에는 `node_modules`가 없어 실행 검증이 실패했습니다.
- `/video-studio`는 구현됐지만 실제 브라우저 WebM 생성 QA는 아직 필요합니다.

문서화한 인계 순서:

1. Node.js LTS 설치 확인
2. `npm.cmd install`
3. `npm.cmd run typecheck`
4. `npm.cmd run build`
5. `npm.cmd run dev`
6. `/diagnostics` 진입
7. 데모 데이터 생성
8. 전체 진단 실행
9. `/video-studio` WebM 생성과 fallback QA
10. Create → Results → Studio → Export → History 흐름 QA
