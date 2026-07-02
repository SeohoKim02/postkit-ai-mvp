# PostKit

사진이나 영상 자료를 업로드한 뒤, SNS 업로드 직전에 필요한 캡션, 해시태그, CTA, 광고/협찬 표시 문구, 썸네일 문구를 한 번에 생성하는 Next.js MVP입니다.

PostKit은 CapCut처럼 영상 편집을 하거나 Canva처럼 디자인을 직접 만드는 앱이 아니라, 업로드 직전의 SNS 문구 패키지를 빠르게 준비하는 도구입니다.

## RC-0.3 배포 준비 상태

현재 소스는 `PostKit MVP RC-0.3` 배포 준비 상태입니다. RC-0.2 기능을 유지한 채 반응형 레이아웃 QA와 Vercel/GitHub 배포 문서 정리를 반영했습니다.

이번 정리는 새 기능 추가가 아니라 배포 준비 점검입니다. 기존 기능, 가격 정책, 크레딧 정책, 개인정보 정책, 계정/mock/AI/SNS/영상 정책은 변경하지 않았고 실제 로그인/OAuth/DB/클라우드/결제/SNS API/AI API/API 키/환경변수/외부 패키지를 추가하지 않았습니다.

검증 상태:

- `package.json`에는 `dev`, `build`, `start`, `typecheck` 스크립트가 있습니다.
- `package-lock.json`이 존재합니다.
- `npm.cmd run typecheck`와 `npm.cmd run build`는 현재 환경에서 통과했습니다.
- 실제 배포 전에는 배포 환경에서 다시 `npm.cmd run typecheck`, `npm.cmd run build`를 확인하고 주요 페이지 브라우저 QA를 진행합니다.

## 현재 상태

- MVP UI와 주요 페이지 구현 완료
- 개인 맞춤형 학습 기능 v1 구현 완료
- 첫 방문 3단계 온보딩 구현 완료
- 구독 및 크레딧 관리 시스템 v1 구현 완료
- SNS 내보내기 센터와 다운로드 기능 v1 구현 완료
- 브라우저 Canvas 기반 Studio 디자인 생성기 v1 구현 완료
- 릴스·쇼츠용 브라우저 Canvas/MediaRecorder 기반 Video Studio v1 구현 완료
- AI 서비스 계층 및 프롬프트 엔진 v1 구현 완료
- 계정 및 데이터 저장 계층 v1 구현 완료
- 콘텐츠 캘린더와 광고·제휴 캠페인 관리 v1 구현 완료
- 개인정보 보호센터와 저작권 안전장치 v1 구현 완료
- 실행 전 통합 안정화 및 정적 무결성 검토 반영
- mock AI 생성 함수 구현 완료
- localStorage 기반 설정/결과/히스토리/개인화/크레딧 원장/내보내기/캘린더/캠페인/개인정보/계정/워크스페이스 저장 구현 완료
- 실제 회원가입, 로그인, 클라우드 저장, AI API, 결제, SNS 업로드 API 연동 없음
- API 키나 시크릿 하드코딩 없음
- `typecheck`와 `build` 검증 통과

상세 체크포인트는 [PROJECT_STATUS.md](./PROJECT_STATUS.md)를 확인하세요.
통합 검토 결과는 [INTEGRATION_AUDIT.md](./INTEGRATION_AUDIT.md)를 확인하세요.
실제 AI 공급자 연결 기준은 [AI_INTEGRATION_GUIDE.md](./AI_INTEGRATION_GUIDE.md)를 확인하세요.
실제 인증과 클라우드 저장 전환 기준은 [BACKEND_INTEGRATION_GUIDE.md](./BACKEND_INTEGRATION_GUIDE.md)를 확인하세요.

## 실행 방법

Windows PowerShell에서는 실행 정책 문제를 피하기 위해 `npm` 대신 `npm.cmd`를 우선 사용합니다.

```powershell
cd C:\Projects\PostKit
node -v
npm.cmd -v
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

현재 RC-0.3 배포 준비 기준에서는 `npm.cmd run typecheck`와 `npm.cmd run build`가 통과했습니다. 새 컴퓨터나 새 체크아웃에서는 `npm.cmd install` 후 같은 검증 명령을 다시 실행하세요.

### 모바일 접속 테스트

PC에서 개발 서버를 실행한 뒤 같은 Wi-Fi에 연결된 휴대폰 브라우저에서 PC의 IPv4 주소로 접속합니다. `localhost`는 접속한 기기 자기 자신을 의미합니다. PC에서 `localhost:3000`은 PC 자신이지만, 휴대폰에서 `localhost:3000`을 열면 휴대폰 자신을 가리키므로 PC에서 실행 중인 PostKit 개발 서버에 접속되지 않습니다.

```powershell
npm.cmd run dev
```

휴대폰 접속이 필요하면 개발 서버를 모든 네트워크 인터페이스에 바인딩합니다.

```powershell
npm.cmd run dev -- -H 0.0.0.0
```

PC의 IPv4 주소를 확인합니다.

```powershell
ipconfig | findstr /i "IPv4"
```

휴대폰에서는 아래 형식으로 접속합니다.

```text
http://PC의IPv4주소:3000
```

접속이 안 되면 PC와 휴대폰이 같은 Wi-Fi에 있는지, Windows 방화벽에서 TCP 3000 접속이 허용되어 있는지, 현재 네트워크가 개인 네트워크인지 확인합니다. 실제 외부 접속용 서비스는 Vercel 같은 배포 환경을 연결한 뒤 사용할 수 있습니다.

휴대폰에서 접속된 뒤에는 `/diagnostics`에서 브라우저 기능, localStorage, MediaRecorder/canvas.captureStream 지원 상태를 먼저 확인합니다.

로컬 네트워크 모바일 접속은 Wi-Fi 격리, 회사/공유기 보안 설정, Windows 방화벽, 백신 방화벽, 공용 네트워크 설정에 따라 막힐 수 있습니다. 실제로 편하게 모바일에서 쓰는 흐름은 Vercel 같은 배포 URL 또는 PWA 홈 화면 추가를 기준으로 확인합니다.

### 배포 URL과 PWA 설치 준비

실제 사용자용 모바일 접속은 개발 PC의 IP 주소가 아니라 Vercel, Netlify, Cloudflare Pages 같은 배포 URL을 사용합니다. PWA 홈 화면 추가도 배포 URL 기준으로 확인합니다. 배포 URL로 접속한 뒤 Chrome, Edge, Samsung Internet, Safari의 브라우저 메뉴에서 홈 화면에 추가를 선택하면 앱처럼 열 수 있습니다.

PostKit은 App Router `app/manifest.ts`로 기본 PWA manifest를 제공합니다. 현재 설정은 앱 이름 `PostKit`, 설명 `SNS 업로드 패키지`, 시작 경로 `/`, `standalone` 표시 모드, PostKit 메인 컬러 계열 theme color, 밝은 background color입니다.

현재 저장 구조는 localStorage 기반이므로 PC와 휴대폰 데이터는 자동 동기화되지 않습니다. 실제 로그인, DB, 클라우드 저장, 결제, AI API 연결 전까지는 mock/localStorage 서비스입니다.

PWA 아이콘 TODO:

- 현재 프로젝트에는 `public` 아이콘 파일이 없어 manifest의 `icons` 항목을 일부러 생략했습니다.
- 배포 전 `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-icon-512.png`를 추가한 뒤 manifest의 `icons` 배열을 연결해야 합니다.

배포 전 필수 확인:

- `npm.cmd run typecheck`
- `npm.cmd run build`
- 개인정보 처리방침의 사업자명, 주소, 연락처, 개인정보 보호책임자 TODO 확인
- API 키는 클라이언트 코드에 넣지 않고 서버 API route와 서버 환경변수로만 처리

### Vercel 배포 요약

1. GitHub 저장소에 소스를 push합니다.
2. Vercel에서 해당 저장소를 import합니다.
3. Framework preset은 Next.js를 사용합니다.
4. Vercel은 `package-lock.json` 기준으로 의존성을 설치하고 `npm run build`를 실행합니다.
5. 실제 API 키가 필요한 단계가 오기 전까지 Vercel 환경변수에는 시크릿을 추가하지 않습니다.
6. 배포 URL에서 `/diagnostics`, `/create`, `/results`, `/studio`, `/video-studio`, `/export`, `/history`를 확인합니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- React state + localStorage
- App Router 내부 API Route 기반 mock AI service layer
- LocalRepository 기반 mock account/data storage layer
- mock 데이터 기반 MVP

## 주요 페이지

- `/`: Landing Page
- `/dashboard`: Dashboard
- `/create`: Create Page
- `/results`: Results Page
- `/export`: SNS Export Center
- `/studio`: Canvas Design Studio
- `/video-studio`: Reels/Shorts Video Studio
- `/calendar`: Content Calendar
- `/campaigns`: Campaign Management
- `/settings`: Brand/Profile Settings Page
- `/account`: Account & Data Storage Page
- `/pricing`: Credits & Pricing Page + Credit Ledger
- `/history`: History Page
- `/privacy`: Privacy Center
- `/privacy-policy`: 개인정보 처리방침 초안
- `/terms`: 이용약관 초안

모바일 하단 내비게이션은 홈, 만들기, 결과, Studio, 내보내기, 더보기로 정리되어 있습니다. 더보기에서 Video, 히스토리, 캘린더, 캠페인, 크레딧, 계정, 진단, 브랜드, 개인정보, 설정에 접근합니다.

## Video Studio v1

- 현재 기능은 실제 AI 영상 생성이 아니라 업로드 사진 기반 브라우저 영상 합성입니다.
- 사진 여러 장, 생성된 짧은 문구, 브랜드 색상/브랜드명, 광고·협찬 표시 문구를 Canvas에 합성합니다.
- 기본 출력은 Instagram Reels, Instagram Story, TikTok, YouTube Shorts용 세로 9:16 1080×1920입니다.
- 지원 길이는 5초, 8초, 10초, 15초이며 v1에서는 15초를 초과하지 않습니다.
- 기본 영상 파일은 MediaRecorder 기반 WebM입니다. MP4 변환은 향후 서버 영상 처리 기능에서 지원할 예정입니다.
- MediaRecorder 또는 canvas.captureStream 미지원 브라우저에서는 WebM 대신 PNG 프레임 세트와 문구 TXT 패키지 다운로드를 제공합니다.
- 영상 편집, WebM 다운로드, Export Center 연결, SNS 공유 준비에는 추가 크레딧을 차감하지 않습니다.
- 생성된 영상 Blob과 원본 이미지 파일은 localStorage에 장기 저장하지 않습니다. 저장되는 값은 프로젝트 설정과 세션 이미지 ID/파일명 중심입니다.
- 실제 SNS 자동 게시 API, 외부 영상 생성 API, 외부 네트워크 업로드는 연결하지 않았습니다.

## AI 서비스 계층 v1

현재 생성 흐름은 외부 AI API를 호출하지 않고 MockProvider를 사용합니다. 다만 Create와 Results는 더 이상 `mockAi`를 직접 호출하지 않고 내부 API 라우트와 AI 클라이언트 계층을 거칩니다.

구성:

- `lib/ai/types.ts`: AI 작업, 공급자, 구조화 결과, 오류 타입
- `lib/ai/promptBuilder.ts`: 브랜드, 개인화, 캠페인, 목적, 플랫폼 기반 안전 프롬프트 컨텍스트 구성
- `lib/ai/validation.ts`: 외부 패키지 없는 입력/출력 검증, requestId/idempotencyKey 생성
- `lib/ai/mockProvider.ts`: 기존 mock AI 결과를 공급자 인터페이스 뒤에서 실행
- `lib/ai/providerRegistry.ts`: 현재는 MockProvider만 등록, 향후 실제 공급자 추가 위치
- `lib/ai/client.ts`: 브라우저에서 `/api/ai/*`만 호출하는 클라이언트 래퍼
- `lib/ai/requestStorage.ts`: 민감 원문 없는 AI 요청 기록 저장

API 라우트:

- `POST /api/ai/generate-text`
- `POST /api/ai/recommend-design`
- `GET /api/ai/health`

생성 결과는 `captions`, `hashtags`, `ctas`, `hooks`, `thumbnailTexts`, `disclosureText`, `summary`, `recommendedTemplateId`, `warnings`, `modelMetadata`로 정규화됩니다. 원본 사진/영상, 전체 History, 개인정보 원문은 프롬프트에 넣지 않습니다.

`.env.example`에는 실제 값 없이 아래 이름만 준비했습니다.

- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_TEXT_MODEL`
- `AI_IMAGE_MODEL`
- `AI_REQUEST_TIMEOUT_MS`

실제 API 키는 서버 환경변수에만 저장해야 하며 클라이언트 코드, localStorage, 브라우저 번들에 넣지 않습니다.

## 계정 및 데이터 저장 계층 v1

현재 PostKit은 실제 회원가입, 로그인, OAuth, 이메일 인증, 클라우드 DB, 여러 기기 동기화를 연결하지 않았습니다. 대신 기존 localStorage 앱을 유지하면서 향후 백엔드 전환을 쉽게 하기 위한 계정/워크스페이스/저장소 계층을 추가했습니다.

구성:

- `app/account/page.tsx`: 게스트 모드, 테스트 계정, 워크스페이스, 데이터 내보내기/가져오기/삭제 UI
- `lib/accountStorage.ts`: mock 계정, 세션, 워크스페이스, 멤버, SyncQueue, 데이터 export/import
- `lib/data/types.ts`: 공통 repository 인터페이스
- `lib/data/localRepository.ts`: 현재 실제 작동하는 localStorage repository
- `lib/data/cloudRepository.ts`: 네트워크 호출 없는 미구현 cloud adapter
- `lib/data/repositoryRegistry.ts`: active repository와 저장소 선호 설정
- `lib/data/migrations.ts`: 기존 데이터에 선택적 `userId`, `workspaceId`, `ownership` 연결

게스트 모드는 모든 기존 기능을 제한 없이 테스트할 수 있습니다. 화면에는 현재 데이터가 이 브라우저에만 저장되며 브라우저 데이터를 삭제하면 복구할 수 없다는 안내를 표시합니다.

워크스페이스 역할:

- `owner`: 모든 데이터, 플랜, 멤버 관리
- `admin`: 콘텐츠와 캠페인 관리, 일부 멤버 관리
- `editor`: 콘텐츠 생성·수정·내보내기
- `viewer`: 보기와 다운로드

현재 SyncQueue는 localStorage에만 기록되고 실제 서버 요청을 보내지 않습니다.

`.env.example`에는 실제 값 없이 아래 이름도 준비했습니다.

- `AUTH_PROVIDER`
- `DATABASE_URL`
- `STORAGE_PROVIDER`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

비밀번호, 인증 토큰, API 키, 결제 정보는 localStorage에 저장하지 않습니다.

## 구독 플랜

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

가격과 크레딧 데이터는 `lib/plans.ts`에서 한 번만 관리합니다.

## 크레딧 정책 v1

- 업로드 패키지 1개 생성 비용은 30 크레딧입니다.
- 구독 크레딧을 먼저 사용하고 부족한 만큼 구매 크레딧을 사용합니다.
- 잔액이 부족하면 생성하지 않고 차감도 하지 않습니다.
- mock 생성 시작 전에 차감하고, 생성 오류가 발생하면 전액 환불 원장을 기록합니다.
- 월 크레딧 지급은 서버 스케줄러 없이 앱 시작 시 날짜를 비교하는 mock 로직입니다.
- 실제 운영에서는 서버에서 결제 상태, 지급 주기, 차감, 환불을 검증해야 합니다.

이월 정책:

- Free: 이월 없음
- Starter: 이월 없음
- Creator: 최대 50 크레딧
- Creator Plus: 최대 100 크레딧
- Business: 최대 300 크레딧
- Agency: 최대 1,000 크레딧

구매 크레딧은 구독 크레딧과 분리되며 월 초기화로 삭제하지 않습니다.

## SNS 내보내기와 다운로드 v1

PostKit의 내보내기는 실제 SNS 자동 게시가 아니라, 이미 생성한 업로드 패키지를 파일과 문구로 준비해 사용자가 직접 SNS 앱이나 웹페이지에 붙여넣는 흐름입니다.

다운로드 가능 항목:

- Studio에서 만든 실제 Canvas PNG. Studio 디자인이 없거나 렌더링에 실패하면 기존 mock 미리보기 PNG fallback 사용
- 생성된 캡션 TXT
- 해시태그 TXT
- CTA 문구 TXT
- 광고/협찬 표시 문구 TXT
- 썸네일 문구 TXT
- 전체 업로드 문구 TXT
- 콘텐츠 메타데이터 JSON

현재 MVP는 업로드 원본 File 객체를 서버나 localStorage에 저장하지 않으므로, 원본 사진/영상은 세션 밖에서 다시 다운로드할 수 있는 빈 파일로 만들지 않습니다. 실제 원본 보관은 향후 Supabase Storage 같은 저장소를 붙일 때 확장합니다.

공유 흐름:

- Web Share API가 지원되면 브라우저/운영체제 공유창을 열고 사용자가 SNS 앱을 직접 선택합니다.
- 지원하지 않거나 공유가 실패하면 fallback으로 미디어 다운로드, 전체 업로드 문구 복사, 플랫폼 웹페이지 열기를 안내합니다.
- Instagram, TikTok, YouTube 등 실제 계정 로그인, OAuth, 자동 게시 API는 아직 연결하지 않았습니다.
- 다운로드, 복사, 공유창 열기, 플랫폼 열기, 내보내기 재시도에는 크레딧을 추가 차감하지 않습니다.

플랫폼 프리셋은 `lib/exportPresets.ts`에서 관리합니다.

- Instagram Feed: 1080×1350
- Instagram Story/Reels, TikTok, YouTube Shorts: 1080×1920
- Facebook: 1080×1080
- X: 1600×900

## Studio 디자인 생성기 v1

Studio는 실제 AI 이미지 생성 API 없이, 사용자가 업로드한 이미지와 생성 문구를 브라우저 Canvas API로 합성해 SNS용 PNG를 만드는 편집 화면입니다. CapCut/Canva처럼 복잡한 자유 디자인 도구가 아니라, 템플릿과 슬라이더 중심의 간단한 게시물 이미지 생성기입니다.

새 페이지:

- `/studio`

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

Studio 처리 방식:

- 업로드 이미지는 PNG, JPEG, WebP일 때 현재 브라우저 세션의 Object URL로만 연결합니다.
- 업로드 원본 이미지 Blob이나 생성 PNG Blob은 localStorage에 저장하지 않습니다.
- History에는 템플릿, 출력 크기, 문구, 텍스트 위치, 색상, 이미지 위치 같은 디자인 설정값만 저장합니다.
- 새로고침 등으로 세션 이미지가 사라지면 기존 mock/fallback 배경으로 안전하게 렌더링합니다.
- 다운로드와 Web Share 파일 공유 시 Canvas를 PNG Blob으로 변환합니다.
- Blob URL은 다운로드 후 해제합니다.

Export 연결:

- Export Center는 저장된 Studio 디자인이 있으면 mock PNG보다 실제 Canvas PNG를 우선 사용합니다.
- Web Share API 파일 공유도 Studio PNG를 우선 사용합니다.
- Results, History, Calendar, Campaigns에서 Studio로 이동할 수 있습니다.
- History에서 디자인 다시 열기, 복제, PNG 다운로드를 제공합니다.

크레딧 정책:

- 기존 콘텐츠 결과로 디자인을 만들고 수정하는 작업은 업로드 패키지 30 크레딧에 포함된 것으로 봅니다.
- 템플릿, 색상, 위치, 크기 변경은 추가 차감하지 않습니다.
- 동일 디자인 다운로드와 SNS 내보내기는 추가 차감하지 않습니다.
- 완전히 새로운 콘텐츠 생성 또는 다시 생성만 기존 정책에 따라 차감합니다.

## 콘텐츠 캘린더와 캠페인 관리 v1

캘린더와 캠페인 기능은 실제 SNS 예약 게시, OAuth, 외부 캘린더 API, 푸시 알림 없이 localStorage 기반 mock 기능으로 동작합니다.

캘린더 기능:

- 월간 보기, 주간 보기, 예정 목록 보기
- 플랫폼, 상태, 캠페인, 브랜드, 광고·협찬 여부, 기한 초과 필터
- 일정 등록, 수정, 복제, 삭제
- 반복 일정: 없음, 매주, 2주마다, 매월
- 반복 일정은 한 번에 최대 12개까지만 생성
- 일정에서 생성 콘텐츠, 내보내기 기록, 캠페인 연결
- 게시 완료 기록: 실제 게시 일시, URL, 실제 사용 캡션, 메모
- 콘텐츠 아이디어 보관함과 일정 전환

캠페인 기능:

- 광고주, 브랜드, 제품, 캠페인 유형, 게시 기간, 콘텐츠 마감일 관리
- 필수 결과물과 진행 상태 관리
- 필수/금지 키워드, 필수 해시태그, 광고 표시 방식, 할인코드, 링크 관리
- 캠페인에서 Create 페이지로 사전 입력
- 캠페인에서 일정 추가, 기존 생성 콘텐츠 연결, SNS 내보내기 이동
- 캠페인 복제와 상태 변경

알림 센터 v1:

- 앱 내부에서 게시 예정 24시간 전, 1시간 전, 캠페인 마감 임박, 필수 결과물 미완료, 광고 표시 누락, 기한 초과, 검토 대기 알림을 계산합니다.
- 실제 푸시 알림이나 이메일 알림은 구현하지 않았습니다.

크레딧 정책:

- 일정 등록/수정/삭제, 캠페인 등록/수정/삭제, 아이디어 등록, 체크리스트 사용, 게시 완료 기록에는 크레딧을 차감하지 않습니다.
- 다운로드와 SNS 내보내기도 추가 차감하지 않습니다.
- 새 콘텐츠 생성과 콘텐츠 다시 생성만 기존 업로드 패키지 정책에 따라 30 크레딧을 차감합니다.

## 개인정보 보호와 저작권 안전장치 v1

개인정보 보호센터는 실제 법률 준수를 완전히 보장하는 기능이 아니라, 출시 전 필요한 개인정보 보호와 콘텐츠 권리 보호 기반을 mock/localStorage 수준으로 마련한 화면입니다.

현재 정책:

- 사용자의 사진·영상·문구를 서비스 전체 AI 모델 학습에 사용하지 않습니다.
- 개인 맞춤 학습은 해당 사용자 계정과 브라우저 localStorage 안에서만 사용합니다.
- 전체 모델 개선 동의는 아직 제공하지 않으며 기본값은 비동의입니다.
- 업로드 파일은 외부 서버로 전송하지 않습니다.
- 비밀번호, SNS 로그인 정보, API 키, 시크릿은 localStorage에 저장하지 않습니다.
- 개인정보 감사 기록에는 실제 사진, 캡션, 개인정보 원문을 저장하지 않고 이벤트 종류와 시각만 저장합니다.

보호센터 기능:

- 수집 데이터, 사용 목적, 저장 위치, 보관 기간, 외부 전송 여부, 개인 맞춤화 사용 여부 표시
- 개인 맞춤 학습, 콘텐츠 자동 저장, 원본 파일 저장, 분석 데이터, 마케팅 알림 설정
- 원본 파일 보관 기간: 저장 안 함, 7일, 30일, 90일, 사용자가 삭제할 때까지
- 데이터 내보내기 JSON 다운로드
- 업로드 파일 참조, 생성 결과, History, 개인 맞춤 학습, 내보내기 기록, 캠페인/일정, 전체 계정 데이터 삭제 mock
- 업로드 전 권리 확인 체크리스트와 민감정보 업로드 주의 안내
- 경제적 이해관계 유형 선택과 광고 표시 문구 누락 경고
- 권리 침해 신고 및 삭제 요청 mock UI
- 개인정보 처리방침 초안과 이용약관 초안

업로드 권리 확인 항목:

- 직접 제작했거나 사용할 권한이 있는 자료인지 확인
- 사진·영상 속 인물에게 필요한 동의를 받았는지 확인
- 저작권, 초상권, 상표권 침해가 없는지 확인
- 불법적이거나 권리를 침해하는 콘텐츠가 아닌지 확인

민감정보 안내 항목:

- 주민등록번호
- 계좌번호
- 신분증
- 건강·의료 정보
- 상세 주소
- 타인의 연락처
- 미성년자 개인정보

광고·협찬 안전장치:

- 관계 유형: 제품 제공, 원고료, 제휴 링크, 할인코드, 공동구매, 자체 제품
- 경제적 이해관계가 있는데 광고/협찬 표시가 비어 있으면 경고를 표시합니다.
- 이 기능은 법률 준수를 완전히 보장하지 않으며, 최종 게시 전 사용자가 관련 기준과 광고주 요청사항을 직접 확인해야 합니다.

실제 운영 전 필요 작업:

- 개인정보 처리방침과 이용약관 법률 검토
- 사업자명, 주소, 연락처, 개인정보 보호책임자 정보 확정
- 서버 저장소 접근 제어, 암호화, 삭제 검증, 감사 로그 설계
- 외부 AI, 클라우드, 결제, 이메일 사용 시 처리 위탁 및 국외 이전 검토
- 권리 침해 신고 접수, 검토, 임시조치, 이의제기 절차 설계
- 미성년자 정책과 법정대리인 동의 절차 검토

## localStorage 키

키 이름은 기존 데이터를 보존하기 위해 변경하지 않았고, 코드에서는 `lib/storageKeys.ts`의 `STORAGE_KEYS`에서 중앙 관리합니다.

- `postkit-account`: 기존 mock 계정 호환 데이터
- `postkit-credit-account`: 구독/구매 크레딧 계정
- `postkit-credit-ledger`: 크레딧 원장
- `postkit-brand-profile`: 브랜드/프로필 설정
- `postkit-history`: 생성 히스토리
- `postkit-current-result`: 현재 결과
- `postkit-create-prefill`: 다시 생성용 입력값
- `postkit-personalization-profile`: 개인 맞춤형 학습 v1 데이터
- `postkit-export-history`: 내보내기/다운로드/복사/공유 준비 기록
- `postkit-export-preferences`: 마지막 선택 내보내기 프리셋과 선호 플랫폼
- `postkit-content-schedules`: 콘텐츠 캘린더 일정
- `postkit-campaigns`: 광고·제휴 캠페인
- `postkit-content-ideas`: 콘텐츠 아이디어 보관함
- `postkit-notifications`: 앱 내부 알림
- `postkit-calendar-preferences`: 캘린더 보기와 필터 설정
- `postkit-privacy-preferences`: 개인정보 설정
- `postkit-consent-records`: 동의 기록
- `postkit-privacy-audit-log`: 개인정보 감사 기록
- `postkit-infringement-reports`: 권리 침해 신고 기록
- `postkit-retention-settings`: 데이터 보관 기간 설정
- `postkit-design-projects`: Studio 디자인 설정값
- `postkit-design-preferences`: 마지막 템플릿, 출력 크기, 색상 선호
- `postkit-video-projects`: Video Studio 영상 프로젝트 설정값
- `postkit-video-preferences`: 마지막 영상 템플릿, 플랫폼, 길이, 전환 선호
- `postkit-ai-request-history`: 원문 없는 AI 요청 상태, 공급자, 크레딧 비용, 성공/실패 기록
- `postkit-ai-preferences`: mock 공급자와 안전 재시도 설정
- `postkit-user-session`: 현재 게스트/테스트 계정 세션
- `postkit-user-accounts`: 브라우저 내부 mock 사용자 계정 목록
- `postkit-user-profiles`: 사용자 프로필과 온보딩 계정 유형 연결
- `postkit-workspaces`: 개인/브랜드/비즈니스/대행사 워크스페이스
- `postkit-workspace-members`: mock 멤버와 역할
- `postkit-storage-preferences`: LocalRepository/CloudRepository 준비 상태와 선호
- `postkit-sync-queue`: 향후 클라우드 동기화를 위한 mock 대기열
- `postkit-data-migration-state`: 기존 데이터 소유권 연결 마이그레이션 상태

## 구현된 MVP 기능

- 사진/영상 자료 선택 및 브라우저 미리보기
- 첫 방문 3단계 온보딩
- 개인화 프로필을 반영한 mock AI 업로드 패키지 생성
- AI 서비스 계층을 통한 입력 검증, requestId/idempotencyKey, mock 공급자 호출, 구조화 결과 저장
- 게스트 모드, 테스트 계정, 워크스페이스, mock 멤버 역할, 데이터 export/import/delete 계층
- 생성 전 크레딧 확인, 안전 차감, 실패 시 mock 환불
- 구독/구매 크레딧 분리 관리
- 월 크레딧 지급 mock 로직과 이월/만료 원장
- 플랜 업그레이드 즉시 적용 및 차액 지급 mock
- 플랜 다운그레이드 다음 지급일부터 예약 mock
- 추가 크레딧 mock 구매와 원장 기록
- 크레딧 원장 필터: 전체, 지급, 구매, 사용, 환불, 만료, 플랜 변경
- 결과별 복사, 전체 복사, 캡션 선택, 직접 수정, SNS 공유 준비 UI
- 결과 좋아요/별로예요, 내 스타일로 저장, 다시 생성 기록
- Settings의 개인화 데이터 내보내기/불러오기/초기화/온보딩 다시 진행
- Dashboard 개인화 요약 카드와 크레딧 관리 카드
- History의 실제 차감 크레딧, 원장 ID, 구독/구매 사용량 표시
- Export Center에서 플랫폼별 미리보기, 개별/전체 다운로드, 문구 복사, Web Share API 기반 공유 준비
- Studio에서 업로드 이미지와 생성 문구를 Canvas PNG로 합성, 미리보기, 수정, 다운로드, Export 연결
- 내보내기 기록 저장과 Dashboard/History 내보내기 상태 표시
- 내보내기 행동을 개인화 플랫폼 선호도에 가볍게 반영
- 콘텐츠 캘린더 일정/반복 일정/아이디어 보관함
- 광고·제휴 캠페인과 필수 결과물 진행률
- Dashboard 오늘 할 일과 앱 내부 알림 수 표시
- 캠페인/일정에서 Create, History, Export 연결
- Privacy Center의 개인정보 설정, 삭제, 내보내기, 감사 기록, 권리 침해 신고
- Create Page의 업로드 권리 확인, 민감정보 안내, 광고·협찬 누락 경고
- 개인정보 처리방침 초안과 이용약관 초안
- Account Page의 저장 위치, 동기화 준비 상태, 전체 계정 데이터 삭제 안내

## 코드 구조

```text
app/                 App Router 페이지
components/          재사용 UI 컴포넌트
components/ui/       버튼, 카드, 배지 같은 기본 UI
lib/ai/              AI 공급자 인터페이스, mock provider, prompt builder, API client
lib/data/            LocalRepository, CloudRepository stub, migration, repository registry
lib/                 개인화 학습, 크레딧 원장, 플랜, localStorage 유틸
types/               공통 타입 정의
```

## 확장 포인트

- `lib/ai/providerRegistry.ts`: 실제 AI 공급자 등록
- `lib/ai/mockProvider.ts`: 현재 mock 공급자, 향후 실제 공급자 구현의 기준
- `lib/mockAi.ts`: MockProvider 내부에서만 사용하는 기존 mock 결과 생성 함수
- `lib/accountStorage.ts`: mock 계정, 세션, 워크스페이스, 멤버, SyncQueue, 데이터 export/import/delete
- `lib/data/localRepository.ts`: 현재 localStorage adapter
- `lib/data/cloudRepository.ts`: 실제 네트워크 호출 없는 cloud adapter stub
- `lib/data/migrations.ts`: 기존 데이터에 선택적 userId/workspaceId/ownership 연결
- `lib/personalization.ts`: 개인화 프로필/요약 계산 계층
- `lib/learning.ts`: 행동 기록과 선호도 점수 계산 계층
- `lib/creditStorage.ts`: Supabase/서버 저장소 어댑터로 교체
- `lib/creditLedger.ts`: 서버 트랜잭션 기반 원장 로직으로 교체
- `lib/subscription.ts`: 실제 구독 상품/이월 정책 관리 계층
- `lib/exportPresets.ts`: 플랫폼별 출력 크기와 공유 프리셋
- `lib/designTemplates.ts`: Studio 출력 크기와 디자인 템플릿
- `lib/canvasRenderer.ts`: 브라우저 Canvas 기반 PNG 렌더링
- `lib/designStorage.ts`: 디자인 설정값 localStorage 저장
- `lib/sessionImageStore.ts`: 현재 브라우저 세션의 업로드 이미지 Object URL 관리
- `lib/imageUtils.ts`: 이미지 로드, 색상, 숫자 유틸
- `lib/downloadUtils.ts`: 브라우저 다운로드와 mock PNG 생성 계층
- `lib/shareUtils.ts`: Web Share API와 fallback 계층
- `lib/exportStorage.ts`: 내보내기 기록 저장소 계층
- `lib/calendarStorage.ts`: 일정, 아이디어, 캘린더 설정 저장소
- `lib/calendarUtils.ts`: 날짜, 반복 일정, 체크리스트, 오늘 할 일 계산
- `lib/campaignStorage.ts`: 캠페인 저장소와 콘텐츠/일정 연결
- `lib/campaignUtils.ts`: 캠페인 유형, 필수 결과물, 진행률, Create prefill
- `lib/notificationStorage.ts`: 앱 내부 알림 생성과 저장
- `lib/privacyStorage.ts`: 개인정보 설정, 보관 기간, 삭제, 감사 기록, 권리 침해 신고 저장
- `lib/privacyContent.ts`: 보호센터 안내 문구, 권리 확인, 민감정보, 보관 옵션 상수
- `lib/storageKeys.ts`: localStorage 키와 앱 내부 이벤트 이름 중앙 관리
- `lib/storage.ts`: Supabase 테이블/인증 기반 저장소로 교체
- `app/export/page.tsx`: 실제 SNS 공유/업로드 API 연동 전 준비 화면

API 키나 시크릿은 코드에 하드코딩하지 않았습니다. 실제 연동 시 `.env.local`에 환경 변수를 두고 서버 컴포넌트 또는 Route Handler에서만 사용하세요.

실제 SNS 자동 게시나 예약 게시를 붙이기 전에는 서버에서 OAuth 토큰 보관, 사용자 권한, 미디어 업로드 제한, 예약 작업 큐, 게시 결과 재시도, 감사 로그, 광고/협찬 고지 기준 확인을 별도로 검증해야 합니다.

실제 캘린더/알림을 붙이기 전에는 서버 시간 기준 스케줄러, 사용자별 타임존, 외부 캘린더 OAuth, 푸시 토큰 저장, 알림 중복 방지, 삭제/수정 동기화 정책을 설계해야 합니다.

## 통합 안정화 메모

- 필수 라우트 파일 존재를 정적 확인했습니다.
- Link와 `router.push` 이동 경로가 현재 존재하는 라우트를 향하는지 확인했습니다.
- 모바일 하단 내비게이션을 5개 항목과 더보기 메뉴로 정리했습니다.
- `localStorage` 키를 `lib/storageKeys.ts`에서 중앙 관리하도록 정리했습니다.
- History, 현재 결과, prefill, 크레딧 원장에 배열/객체가 아닌 손상 데이터가 들어와도 기본값으로 복구되도록 보강했습니다.
- Web Share API 취소는 실패 fallback으로 처리하지 않고 취소 안내만 표시하도록 수정했습니다.
- 공통 `Button` 기본 타입을 `button`으로 지정했습니다.
- 외부 패키지, 실제 API, 결제, OAuth, 시크릿은 추가하지 않았습니다.

## 데모 모드와 진단센터 v1

- `/diagnostics`: 브라우저 기능, 라우트 목록, localStorage 키, 크레딧 원장, 계정·워크스페이스, 개인화, AI mock, Studio·Canvas, Export, 개인정보 상태를 점검합니다.
- `/demo`: 샘플 데이터로 계정, 캠페인, Create, Results, Studio, Export, History, Calendar 흐름을 빠르게 확인합니다.
- 데모 데이터는 `demo: true` 또는 `source: "demo"` 표시를 남기며, “데모 데이터만 삭제”는 이 표시가 있는 항목만 대상으로 합니다.
- 진단센터 진입 시에는 가벼운 검사를 실행하고, 전체 localStorage 참조 검사는 사용자가 “전체 진단 실행”을 누를 때만 실행합니다.
- 진단 보고서에는 브라우저 기능 지원, 라우트 상태, storage key 상태, 오류/경고 수, mock provider 상태, 현재 계정 모드, 미해결 체크만 포함합니다.
- 진단 보고서에는 실제 캡션 원문, 이미지, 이메일, API 키, 토큰, 결제정보, 전체 localStorage 원문을 포함하지 않습니다.
- 복구 도구는 자동 실행되지 않으며, 사용자가 버튼을 누르면 먼저 백업 JSON을 내려받고 기본값 복구 또는 연결 끊긴 참조 정리를 진행합니다.
- 데모 흐름에서 제공하는 샘플 prefill과 샘플 결과 확인은 실제 사용자 크레딧을 차감하지 않습니다. Create에서 실제 생성 버튼을 누르는 경우에는 기존 30크레딧 정책이 적용됩니다.

추가 localStorage 키:

- `postkit-diagnostic-history`: 최근 진단 결과 요약
- `postkit-qa-checklist`: 수동 QA 체크리스트 상태
- `postkit-demo-manifest`: 데모 데이터 생성 manifest

환경변수 예시:

- `NEXT_PUBLIC_ENABLE_DIAGNOSTICS`: 실제 서비스에서 진단센터 노출 정책을 제어하기 위한 후보 이름입니다. 현재 MVP에서는 값이 없어도 접근 가능합니다.

자세한 QA 순서는 [QA_GUIDE.md](./QA_GUIDE.md)를 확인하세요.

## Source Snapshot: PostKit MVP RC-0.3

Snapshot date: 2026-07-03

현재 소스는 `PostKit MVP RC-0.3` 배포 준비 상태로 정리되었습니다. 이 스냅샷은 새로운 기능 추가가 아니라 현재 구현 상태의 GitHub/Vercel 배포 인계를 위한 기준점입니다.

스냅샷 문서:

- [FILE_MANIFEST.md](./FILE_MANIFEST.md): 주요 폴더, 페이지, 컴포넌트, lib, 타입, 설정, 문서, 실제 API 연결 지점
- [FEATURE_MANIFEST.md](./FEATURE_MANIFEST.md): 기능별 상태, mock/구조 준비/미구현/출시 전 검토 항목
- [RUNBOOK.md](./RUNBOOK.md): 새 컴퓨터에서 Node/npm 설치 후 실행, 진단, 데모, QA 순서
- [SNAPSHOT_INFO.md](./SNAPSHOT_INFO.md): 스냅샷 이름, 생성 시각, 실행 검증 여부, 외부 연동 여부, 제한사항

중요:

- `npm.cmd run typecheck`와 `npm.cmd run build`는 현재 환경에서 통과했습니다.
- `/video-studio`는 구현되어 있지만 배포 URL 기준 실제 모바일 브라우저 WebM 생성 QA는 계속 필요합니다.
- 프로젝트 소스 ZIP에는 브라우저 localStorage 데이터, 사용자 이미지/영상, 실제 `.env` 파일, API 키, 토큰, 비밀번호, 결제정보가 포함되지 않아야 합니다.
- 테스트 데이터가 필요하면 `/demo` 또는 `/diagnostics`의 데모 데이터 기능을 사용하세요.
