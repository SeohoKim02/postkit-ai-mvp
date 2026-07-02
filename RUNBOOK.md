# PostKit MVP RC-0.3 Runbook

스냅샷: `PostKit MVP RC-0.3`

작성일: 2026-07-03

이 문서는 새 컴퓨터 또는 실행 가능한 Windows 환경에서 RC-0.3 배포 준비 상태를 확인하기 위한 절차입니다. RC-0.3은 새 기능 추가가 아니라 GitHub/Vercel 배포 전 파일 구조, 검증 명령, 모바일/PWA 안내를 정리한 상태입니다.

## 1. 현재 상태

- `package.json`에는 `dev`, `build`, `start`, `typecheck` 스크립트가 있습니다.
- `package-lock.json`이 존재합니다.
- 현재 환경에서 `npm.cmd run typecheck`와 `npm.cmd run build`가 통과했습니다.
- `/video-studio`는 구현됐지만 배포 URL 기준 실제 모바일 브라우저 WebM 생성 QA는 계속 필요합니다.
- 실제 AI/API/결제/SNS/클라우드 연결은 없습니다.
- 외부 패키지를 추가하지 않았습니다.
- API 키, 토큰, 비밀번호, 시크릿을 추가하지 않았습니다.

## 2. Windows PowerShell 실행 순서

PowerShell 실행 정책 문제를 피하기 위해 `npm` 대신 `npm.cmd`를 우선 사용합니다.

```powershell
cd C:\Projects\PostKit
node -v
npm.cmd -v
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

`npm.cmd run dev` 실행 후 터미널에 표시되는 로컬 URL을 브라우저에서 엽니다. 일반적으로 `http://localhost:3000`입니다.

## 3. 모바일 접속 테스트

PC에서 `npm.cmd run dev`를 실행한 상태로 같은 Wi-Fi에 연결된 휴대폰 브라우저에서 PC의 IPv4 주소로 접속합니다. `localhost`는 접속한 기기 자기 자신을 의미합니다. PC에서 `localhost:3000`은 PC 자신이지만, 휴대폰에서 `localhost:3000`을 열면 휴대폰 자신을 의미하므로 PC에서 실행 중인 PostKit 개발 서버에 접속되지 않습니다.

필요하면 개발 서버를 모든 네트워크 인터페이스에 바인딩합니다.

```powershell
npm.cmd run dev -- -H 0.0.0.0
```

PC의 IPv4 주소를 확인합니다.

```powershell
ipconfig | findstr /i "IPv4"
```

휴대폰 브라우저에서는 아래 형식으로 접속합니다.

```text
http://PC의IPv4주소:3000
```

접속이 안 되면 Windows 방화벽에서 TCP 3000 허용이 필요한지, 현재 네트워크가 개인 네트워크인지, PC와 휴대폰이 같은 Wi-Fi에 있는지 확인합니다. 실제 외부 접속용 서비스는 Vercel 배포 이후 가능합니다.

휴대폰에서 접속된 뒤에는 `/diagnostics`에서 브라우저 기능, localStorage, MediaRecorder/canvas.captureStream 지원 상태를 먼저 확인합니다.

로컬 네트워크 모바일 접속은 Wi-Fi 격리, 회사/공유기 보안 설정, Windows 방화벽, 백신 방화벽, 공용 네트워크 설정에 따라 막힐 수 있습니다. 실제로 편하게 모바일에서 쓰는 흐름은 Vercel 같은 배포 URL 또는 PWA 홈 화면 추가를 기준으로 확인합니다.

## 4. Vercel/GitHub 배포 전 체크

실제 사용자용 모바일 접속은 개발 PC의 `localhost` 또는 IPv4 주소가 아니라 Vercel, Netlify, Cloudflare Pages 같은 배포 URL을 사용합니다. PWA 홈 화면 추가도 배포 URL 기준으로 확인합니다.

PWA 기본 구조는 `app/manifest.ts`로 준비되어 있습니다. 배포 URL에서 모바일 브라우저로 접속한 뒤 Chrome, Edge, Samsung Internet, Safari의 홈 화면에 추가 흐름을 확인합니다. 현재 단계에서는 설치 강제 팝업이나 실제 로그인 연동을 제공하지 않습니다.

현재 저장 구조는 localStorage 기반이므로 PC와 휴대폰 데이터가 자동 동기화되지 않습니다. 실제 로그인, DB, 클라우드 저장, 결제, AI API 연결 전까지는 mock 서비스입니다.

PWA 아이콘 TODO:

- 현재 프로젝트에는 `public` 아이콘 파일이 없습니다.
- 배포 전 `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-icon-512.png`를 추가하고 manifest `icons` 배열을 연결합니다.

배포 전 필수 명령과 확인:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
```

- GitHub에 push하기 전 `.gitignore`가 `node_modules`, `.next`, `.env.local`, `dist`, `build`, `coverage`를 제외하는지 확인합니다.
- `.env.example`에는 실제 값 없이 환경변수 이름만 둡니다.
- Vercel에서 GitHub 저장소를 import하고 Framework preset은 Next.js로 둡니다.
- Vercel은 `package-lock.json` 기준으로 의존성을 설치하고 `npm run build`를 실행합니다.
- 실제 API 키가 필요한 단계 전까지 Vercel 환경변수에 시크릿을 추가하지 않습니다.
- 개인정보 처리방침의 사업자명, 주소, 연락처, 개인정보 보호책임자 TODO를 확정합니다.
- API 키는 클라이언트 코드에 넣지 않고 서버 API route와 서버 환경변수로만 처리합니다.

## 5. 브라우저 QA 순서

아래 순서로 페이지를 확인합니다.

1. `/diagnostics`
2. `/demo`
3. `/create`
4. `/results`
5. `/studio`
6. `/video-studio`
7. `/export`
8. `/history`
9. `/calendar`
10. `/campaigns`
11. `/account`
12. `/privacy`
13. `/pricing`

## 6. Video Studio QA 중점

- MediaRecorder, canvas.captureStream, WebM mimeType 지원 여부가 `/diagnostics`에서 표시되는지 확인합니다.
- `/video-studio`에서 사진 여러 장 기반 9:16 미리보기와 WebM 생성이 동작하는지 확인합니다.
- WebM 미지원 브라우저에서 PNG 프레임 세트와 문구 TXT fallback이 표시되는지 확인합니다.
- Export Center, History, Calendar, Campaign 연결이 동작하는지 확인합니다.
- localStorage에 영상 Blob, 대용량 base64 영상, Object URL, 원본 사용자 이미지/영상이 장기 저장되지 않는지 확인합니다.

## 7. 금지 사항

- 실제 `.env` 또는 `.env.local`에 API 키, 토큰, 비밀번호, 시크릿을 넣지 않습니다.
- 실제 AI, 결제, 인증, SNS, 클라우드 서비스를 연결하지 않습니다.
- 사용자 이미지, 사용자 영상, 브라우저 프로필, localStorage 덤프를 소스 ZIP이나 저장소에 넣지 않습니다.
- 배포 URL 기준 브라우저 육안 QA가 끝나기 전에는 실제 사용자 운영 완료로 표현하지 않습니다.

## 8. 실패 기록 템플릿

- 실행 환경:
- Node 버전:
- npm 버전:
- 실행 명령:
- 터미널 오류:
- 브라우저 URL:
- 브라우저 콘솔 오류:
- 관련 라우트 또는 파일:
- 재현 순서:
- demo 데이터 사용 여부:
- localStorage 초기화 또는 import 여부:
