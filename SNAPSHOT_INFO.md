# PostKit MVP RC-0.3 Snapshot Info

스냅샷 이름: `PostKit MVP RC-0.3`

스냅샷 정리일: 2026-07-03

스냅샷 성격: Vercel/GitHub 배포 준비 상태

RC-0.3은 새 기능 추가가 아니라 RC-0.2 이후 반응형 레이아웃 QA, PWA/모바일 접속 안내, 배포 준비 문서, 기본 무시 파일 구성을 정리한 상태입니다.

## RC-0.2 대비 변경점

- 주요 페이지 반응형 레이아웃 QA와 보정을 반영했습니다.
- `/dashboard`, `/history`, `/results`, `/studio`, `/video-studio`, `/export`의 버튼/카드 overflow 점검 결과를 문서화했습니다.
- `app/manifest.ts` 기반 PWA 기본 구조를 배포 준비 항목으로 기록했습니다.
- README/RUNBOOK/SNAPSHOT 문서에 로컬 네트워크 모바일 접속보다 Vercel URL/PWA 설치를 권장한다고 정리했습니다.
- GitHub/Vercel 배포 전 체크 순서를 문서화했습니다.
- `.gitignore`에 `build`, `coverage` 제외 항목을 보강했습니다.
- `.env.example`은 실제 값 없이 환경변수 이름만 남기는 기준으로 정리했습니다.

## 배포 준비 파일 상태

- `package.json`: `dev`, `build`, `start`, `typecheck` 스크립트 존재
- `package-lock.json`: 존재
- `app/manifest.ts`: Next.js App Router manifest 존재
- `.gitignore`: `node_modules`, `.next`, `.env.local`, `dist`, `build`, `coverage` 제외
- `.env.example`: 실제 API 키/토큰/비밀번호 없이 이름만 포함

## 실행 검증 여부

- `npm.cmd run typecheck`: 통과
- `npm.cmd run build`: 통과
- dev server와 배포 URL 기준 최종 브라우저 육안 QA는 별도 확인이 필요합니다.
- `/video-studio` 실제 모바일 브라우저 WebM 생성 QA는 계속 필요합니다.

## 외부 연동 여부

- 외부 API 연결 여부: 없음
- 실제 AI API 연결 여부: 없음
- 실제 영상 생성 API 연결 여부: 없음
- 실제 결제 API 연결 여부: 없음
- 실제 SNS 자동 게시 API 연결 여부: 없음
- 실제 로그인/OAuth 연결 여부: 없음
- 실제 클라우드 DB 또는 object storage 연결 여부: 없음

## 패키지와 시크릿

- 외부 패키지 추가 여부: 없음
- API 키/시크릿 포함 여부: 없음
- API 키/토큰/비밀번호 추가 여부: 없음
- `.env.local` 포함 여부: 없음
- 실제 `.env` 포함 여부: 없음

## 모바일/PWA 기준

- 로컬 네트워크 모바일 접속은 Wi-Fi 격리, 방화벽, 공유기 보안 설정에 따라 막힐 수 있습니다.
- 실제 사용자용 모바일 접속은 Vercel 같은 배포 URL을 기준으로 확인합니다.
- PWA 홈 화면 추가도 배포 URL 기준으로 확인합니다.
- PWA 아이콘은 아직 추가하지 않았습니다. 배포 전 후보 파일은 `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-icon-512.png`입니다.

## 알려진 제한사항

- 현재 저장 구조는 localStorage 기반이므로 PC와 휴대폰 데이터가 자동 동기화되지 않습니다.
- 모든 AI, 결제, 인증, SNS 게시, 클라우드 저장은 mock 또는 placeholder 상태입니다.
- 개인정보 처리방침, 이용약관, 광고·협찬 표시 문구는 실제 출시 전 법률 검토가 필요합니다.
- Vercel 배포 후 주요 페이지의 실제 브라우저 육안 QA가 필요합니다.

## 다음 실행 명령

Windows PowerShell 기준입니다. 실행 정책 문제를 피하기 위해 로컬에서는 `npm` 대신 `npm.cmd`를 우선 사용합니다.

```powershell
cd C:\Projects\PostKit
node -v
npm.cmd -v
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Vercel에서는 GitHub 저장소를 import하면 `package-lock.json` 기준 설치 후 Next.js build가 실행됩니다. 실제 API 키가 필요한 단계 전까지 Vercel 환경변수에 시크릿을 추가하지 않습니다.
