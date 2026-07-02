# PostKit QA Guide

이 문서는 PostKit을 실제 실행 가능한 환경에서 빠르게 확인하기 위한 QA 순서입니다. 현재 프로젝트는 실제 AI API, 결제, 인증, SNS 자동 게시, 클라우드 저장을 연결하지 않은 mock/localStorage 기반입니다.

## RC-0.2 QA 전제

`PostKit MVP RC-0.2`는 정적 코드 기준 스냅샷입니다.

- `npm install`은 아직 완료되지 않았습니다.
- `typecheck`, `build`, `dev server` 실행 검증은 아직 완료되지 않았습니다.
- 현재 환경에는 `node_modules`가 없어 실행 검증이 실패했습니다.
- `/video-studio`는 구현됐지만 실제 브라우저 WebM 생성 QA는 아직 필요합니다.
- 다음 단계는 새 컴퓨터 또는 실행 가능한 환경에서 `npm.cmd install`부터 시작하는 것입니다.

## 1. 실행 준비

1. Node.js와 npm이 PATH에 잡혀 있는지 확인합니다.
2. 의존성을 설치합니다.

```powershell
npm.cmd install
```

3. 타입과 빌드를 확인합니다.

```powershell
npm.cmd run typecheck
npm.cmd run build
```

4. 개발 서버를 실행합니다.

```powershell
npm.cmd run dev
```

5. 브라우저에서 `http://localhost:3000`을 엽니다.

Windows PowerShell에서는 실행 정책 문제를 피하기 위해 `npm` 대신 `npm.cmd`를 우선 사용합니다.

## 1-1. RC-0.2 브라우저 QA 순서

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

## 2. 데모 데이터 생성

1. `/diagnostics`로 이동합니다.
2. 기존 데이터가 있다면 먼저 Account 데이터 내보내기 또는 진단센터 백업을 내려받습니다.
3. `데모 추가`를 눌러 기존 데이터를 유지한 상태로 샘플 데이터를 추가합니다.
4. 전체 교체가 필요하면 `백업 후 교체`를 누릅니다. 이 경우 먼저 백업 JSON이 다운로드됩니다.
5. 데모 데이터는 `demo: true` 또는 `source: "demo"` 표시가 있는 항목으로 저장됩니다.
6. 삭제 테스트는 `데모만 삭제`를 사용합니다. 실제 사용자 데이터가 함께 삭제되지 않는지 확인합니다.

## 3. 전체 진단 실행

1. `/diagnostics` 진입 시 가벼운 진단이 자동 실행되는지 확인합니다.
2. `전체 진단 실행`을 눌러 localStorage 참조와 무결성 검사를 수행합니다.
3. 다음 상태가 텍스트와 배지로 표시되는지 확인합니다.
   - 정상
   - 확인 필요
   - 오류
   - 미지원
   - 미구현
   - 실행 전
4. 카메라, 마이크, 알림 권한 프롬프트가 자동으로 뜨지 않는지 확인합니다.
5. 진단 보고서를 JSON과 TXT로 다운로드합니다.
6. 보고서에 캡션 원문, 이미지, 이메일, API 키, 토큰, 결제정보, 전체 localStorage 원문이 포함되지 않는지 확인합니다.

## 4. 필수 사용자 흐름

1. Landing에서 시작 버튼 이동
2. Dashboard 표시
3. 온보딩 완료
4. Create 입력
5. 업로드 권리 확인
6. 크레딧 차감
7. Results 생성
8. 캡션 선택
9. 복사
10. 좋아요·별로예요
11. 수정 저장
12. 개인화 반영
13. Studio 열기
14. 템플릿 변경
15. PNG 생성
16. Video Studio 열기
17. 사진 여러 장 선택
18. 영상 미리보기 재생/일시정지
19. WebM 생성 또는 PNG/TXT fallback 확인
20. 다운로드
21. SNS 공유 fallback
22. Export 기록
23. History 확인
24. Calendar 연결
25. Campaign 연결
26. Pricing mock 플랜 변경
27. mock 크레딧 구매
28. Account 데이터 내보내기
29. Privacy 데이터 삭제
30. 게스트 초기화

## 5. Video Studio v1 QA

1. Results 또는 History에서 `영상 만들기`/`영상 다시 열기`를 눌러 `/video-studio`로 이동합니다.
2. Instagram Reels, Instagram Story, TikTok, YouTube Shorts 프리셋이 모두 1080×1920, 9:16으로 표시되는지 확인합니다.
3. 사진 여러 장을 업로드하고, 파일명과 세션 연결 상태가 보이는지 확인합니다.
4. 5초, 8초, 10초, 15초만 선택 가능하고 15초 초과 입력 경로가 없는지 확인합니다.
5. 전환 효과 없음, 페이드, 슬라이드 업, 슬라이드 좌우, 천천히 확대, 줌 인/아웃을 바꾸며 미리보기를 확인합니다.
6. 제목, 후킹 문구, 제품명, CTA, 브랜드명, 광고·협찬 문구, 할인코드가 Canvas 밖으로 나가지 않는지 확인합니다.
7. 재생, 일시정지, 처음으로 버튼이 동작하고 unmount 후 미리보기 루프가 멈추는지 확인합니다.
8. 지원 브라우저에서는 WebM 생성 후 미리보기 video, 다운로드, Web Share 또는 fallback이 동작하는지 확인합니다.
9. 미지원 브라우저에서는 앱 오류 대신 PNG 프레임 세트와 문구 TXT 다운로드가 안내되는지 확인합니다.
10. Export Center에서 세션 WebM Blob이 있으면 영상 미리보기/다운로드/공유가 보이고, Blob이 없으면 Video Studio 재생성 안내가 보이는지 확인합니다.
11. History에서 Video Studio 배지, 영상 다시 열기, 영상 복제, 영상 WebM, 영상 내보내기 버튼을 확인합니다.
12. Calendar와 Campaign에서 Reels/TikTok/Shorts/Story 계열 항목에 Video Studio 진입이 보이는지 확인합니다.
13. localStorage에 영상 Blob, base64 영상, Object URL, 원본 이미지 전체가 저장되지 않는지 확인합니다.
14. 영상 편집, 다운로드, Export 연결, SNS 공유 준비 후 크레딧 잔액이 변하지 않는지 확인합니다.

체크 상태는 `/diagnostics`의 QA 체크리스트에 저장됩니다.

## 6. 크레딧 테스트

1. `/pricing`에서 현재 플랜과 잔액을 확인합니다.
2. mock 플랜 변경 모달을 확인합니다.
3. mock 추가 크레딧 구매를 실행합니다.
4. `/create`에서 업로드 패키지 생성 시 30 크레딧 차감이 표시되는지 확인합니다.
5. 잔액이 부족한 상태에서는 생성이 시작되지 않는지 확인합니다.
6. 실패 mock 흐름이 발생하면 동일 debit에 환불이 1회만 연결되는지 확인합니다.
7. `/diagnostics`에서 크레딧 총액, 원장, 중복 debit/refund 경고를 확인합니다.

## 7. Studio 테스트

1. `/results`에서 Studio로 이동합니다.
2. 플랫폼, 출력 크기, 템플릿을 바꿉니다.
3. 텍스트 위치, 글자 크기, 오버레이, 브랜드 색상을 조정합니다.
4. PNG 생성과 다운로드가 동작하는지 확인합니다.
5. 새로고침 뒤 원본 이미지가 없을 경우 fallback이 안전하게 표시되는지 확인합니다.
6. `/diagnostics`에서 Canvas, toBlob, templateId, outputPresetId, width/height, zoom, position 경고가 없는지 확인합니다.

## 8. 다운로드와 Web Share fallback

1. `/export`에서 개별 TXT/JSON/PNG 다운로드를 확인합니다.
2. 전체 다운로드가 순차 다운로드 방식으로 동작하는지 확인합니다.
3. 모바일 브라우저에서 Web Share가 지원되면 공유창이 열리는지 확인합니다.
4. Web Share가 미지원이면 다운로드, 전체 문구 복사, 플랫폼 열기 fallback이 표시되는지 확인합니다.
5. 다운로드와 공유에는 크레딧이 차감되지 않는지 확인합니다.

## 9. 개인정보 삭제 테스트

1. `/privacy`에서 개인정보 설정을 저장합니다.
2. 데이터 내보내기를 실행합니다.
3. 업로드 파일, 생성 결과, History, 개인화, 내보내기 기록, 캠페인/일정 삭제 흐름을 확인합니다.
4. 전체 계정 데이터 삭제 전 확인 절차와 백업 안내가 표시되는지 확인합니다.
5. 감사 로그에는 원문 캡션이나 이미지 데이터가 저장되지 않는지 확인합니다.

## 10. Account export/import 테스트

1. `/account`에서 JSON 내보내기를 실행합니다.
2. 내보낸 JSON에 비밀번호, 인증 토큰, API 키, 결제 카드 정보, 이미지 Blob이 없는지 확인합니다.
3. JSON 가져오기에서 병합과 백업 후 교체를 각각 확인합니다.
4. 잘못된 JSON, 큰 JSON, secret-like 문자열이 들어간 JSON이 차단되는지 확인합니다.
5. mock 계정 전환, 게스트 전환, 워크스페이스 멤버 역할 변경이 브라우저 내부에서만 동작하는지 확인합니다.

## 11. 모바일/반응형 브라우저 QA 체크리스트

아래 항목은 실제 브라우저에서 768px, 430px, 390px 폭을 각각 확인합니다. 이 문서는 RC-0.3 UI 안정화 체크리스트이며, 문서 정리만으로 브라우저 QA 완료를 주장하지 않습니다.

모바일 실기기 접속 시 `localhost`는 접속한 기기 자기 자신을 의미합니다. PC의 `localhost:3000`은 PC 자신이지만, 휴대폰의 `localhost:3000`은 휴대폰 자신이라 사용할 수 없습니다. PC와 휴대폰을 같은 Wi-Fi에 연결한 뒤, 필요하면 PC에서 `npm.cmd run dev -- -H 0.0.0.0`으로 개발 서버를 실행합니다. PC IPv4는 `ipconfig | findstr /i "IPv4"`로 확인하고, 휴대폰에서는 `http://PC의IPv4주소:3000` 형식으로 접속합니다. 접속이 안 되면 Windows 방화벽에서 TCP 3000 허용이 필요한지 확인합니다. 접속 후에는 `/diagnostics`에서 브라우저 기능, localStorage, MediaRecorder/canvas.captureStream 지원 상태를 먼저 확인합니다.

로컬 네트워크 모바일 접속은 Wi-Fi 격리, 회사/공유기 보안 설정, Windows 방화벽, 백신 방화벽, 공용 네트워크 설정에 따라 막힐 수 있습니다. 실제로 편하게 모바일에서 쓰는 흐름은 Vercel 같은 배포 URL 또는 PWA 홈 화면 추가를 기준으로 확인합니다.

1. `/dashboard`에서 상단 CTA와 빠른 시작 카드에 같은 의미의 생성 버튼이 중복으로 보이지 않는지 확인합니다.
2. `/history` 넓은 화면과 좁은 화면에서 카드 본문, 메타 정보, 크레딧 정보, 버튼 영역이 깨지지 않는지 확인합니다.
3. `/results` 제목이 한 글자씩 세로로 쪼개지지 않고 자연스럽게 줄바꿈되는지 확인합니다.
4. `/results` 날짜, 플랫폼, 목적, 크레딧 메타 카드와 상단 액션 버튼이 화면 밖으로 밀리지 않는지 확인합니다.
5. `/studio` 캔버스 미리보기와 버튼 영역이 모바일 네비게이션과 겹치지 않는지 확인합니다.
6. `/video-studio` 세로 9:16 미리보기와 생성/다운로드/Export 버튼이 390px 폭에서 깨지지 않는지 확인합니다.
7. `/export` 플랫폼 카드, 다운로드 버튼, 공유/복사 버튼이 줄바꿈되며 화면 밖으로 나가지 않는지 확인합니다.
8. `/account` 테스트 계정 안내가 실제 로그인으로 오해되지 않고 localStorage 기반 제한을 명확히 안내하는지 확인합니다.
9. `/diagnostics` 상태 카드와 보고서/초기화 버튼이 정상 표시되는지 확인합니다.
10. 하단 모바일 네비게이션의 홈, 만들기, 결과, Studio, 내보내기, 더보기 버튼이 safe-area와 겹치지 않고 터치 영역이 충분한지 확인합니다.
11. 데스크톱 작은 창에서 사이드바가 있어도 메인 콘텐츠에 가로 스크롤이 생기지 않는지 확인합니다.
12. `/create` 입력폼, 선택 카드, 업로드 영역, 생성 버튼이 390px 폭에서도 화면 안에 들어오는지 확인합니다.
13. `/remote-control` 라우트는 현재 소스에 없으므로 새 화면이 생기지 않았는지 확인합니다.
14. API 키, 토큰, 환경변수, 실제 인증/결제/SNS/클라우드 연결 안내가 새로 생기지 않았는지 확인합니다.

## 12. PWA/배포 모바일 QA 체크리스트

1. 배포 전 `npm.cmd run typecheck`와 `npm.cmd run build`가 통과하는지 확인합니다.
2. 실제 사용자용 모바일 접속은 Vercel, Netlify, Cloudflare Pages 같은 배포 URL로 확인합니다.
3. 모바일 브라우저에서 홈 화면에 추가 흐름이 보이는지 확인합니다.
4. `app/manifest.ts`가 앱 이름 `PostKit`, 설명 `SNS 업로드 패키지`, 시작 경로 `/`, `standalone` 표시 모드, theme/background color를 제공하는지 확인합니다.
5. 현재 `public` 아이콘 파일이 없으므로 배포 전 `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-icon-512.png`를 추가하고 manifest `icons` 배열을 연결해야 한다는 TODO를 확인합니다.
6. localStorage 기반이라 PC와 휴대폰 데이터가 자동 동기화되지 않는다는 안내가 `/account`와 문서에 보이는지 확인합니다.
7. 실제 로그인, DB, 클라우드 저장, 결제, AI API 연결 전까지 mock 서비스라는 제한이 문서에 남아 있는지 확인합니다.
8. 개인정보 처리방침의 사업자명, 주소, 연락처, 개인정보 보호책임자 TODO가 실제 배포 전 확정 대상인지 확인합니다.
9. API 키가 클라이언트 코드에 없고, 향후 서버 API route와 서버 환경변수로만 처리한다는 안내가 있는지 확인합니다.
10. 390px 폭에서 `/dashboard`, `/create`, `/results`, `/studio`, `/video-studio`, `/export`, `/history`, `/account`, `/diagnostics`의 제목, 카드, 버튼이 화면 밖으로 나가지 않는지 확인합니다.
11. `/history` 넓은 화면에서 본문이 좁은 열로 밀리지 않고, 버튼 묶음이 줄바꿈되는지 확인합니다.
12. `/dashboard`에서 상단 primary CTA와 빠른 시작 카드 버튼이 중복 primary CTA처럼 보이지 않는지 확인합니다.

## 13. 오류 기록 방법

오류를 발견하면 아래 항목을 기록합니다.

- 페이지 경로
- 재현 순서
- 기대 결과
- 실제 결과
- 브라우저와 OS
- 진단 보고서 JSON
- localStorage 백업 JSON 필요 여부

민감한 캡션 원문, 이미지, 이메일, API 키, 토큰, 결제정보는 이슈 본문에 붙이지 않습니다.

## 14. 실제 출시 전 필수 QA

- 서버 기반 인증과 권한 검증
- 서버 기반 크레딧 원장 트랜잭션
- 실제 결제 웹훅 재처리와 중복 지급 방지
- 실제 AI provider rate limit과 비용 모니터링
- 이미지/영상 저장소 보안
- 개인정보 처리방침과 이용약관 법률 검토
- 광고·협찬 표시 안내 법률 검토
- SNS OAuth 토큰 암호화와 게시 실패 재시도
- 관리자 신고/차단/삭제 처리 도구

## 15. RC-0.2 Snapshot Handoff

The current source snapshot is `PostKit MVP RC-0.2`, dated 2026-07-02.

Before QA on a new machine:

1. Read [SNAPSHOT_INFO.md](./SNAPSHOT_INFO.md).
2. Read [RUNBOOK.md](./RUNBOOK.md).
3. Confirm Node.js and npm are available.
4. Run `npm.cmd install`.
5. Run `npm.cmd run typecheck`.
6. Run `npm.cmd run build`.
7. Run `npm.cmd run dev`.
8. Open `/diagnostics`.
9. Create demo data only if needed.
10. Run full diagnostics and record the report.

Do not mark this snapshot as runtime-verified until those commands and the browser QA pass.
