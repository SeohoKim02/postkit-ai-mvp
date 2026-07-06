# PostKit Pre-AI QA Report

## 최종 재검증 업데이트 - 2026-07-07

### 최종 판정
- 판정: 출시 불가
- 이유: `lint`, `typecheck`, `build`, 주요 라우트, `/settings` hydration, `/campaign` redirect, MockProvider 회귀, TXT/JSON/PNG 및 영상 fallback 산출물은 재검증 기준으로 통과했다. 다만 출시 조건에 포함된 무료 플랜 워터마크 실제 다운로드 PNG/WebM 검증을 허용된 자동화 경로에서 완료하지 못했고, 실제 WebM 생성/재생도 PASS로 판정할 수 없어 출시 차단 항목으로 남긴다.
- Critical: 0
- High: 1
- Medium: 1
- 핵심 기능 FAIL: 0
- PASS / FAIL / PARTIAL / NOT TESTED: 16 / 0 / 1 / 1

### 명령 검증
| 항목 | 결과 | 근거 |
| --- | --- | --- |
| Lint | PASS | `npm.cmd run lint` 종료 코드 0. ESLint error 0, 기존 warning 12개 |
| Typecheck | PASS | `npm.cmd run typecheck` 단독 재실행 종료 코드 0 |
| Build | PASS | `npm.cmd run build` 종료 코드 0, Next 15.5.19 production build 성공, 26개 static page |
| Dev route smoke | PASS | dev 서버 재시작 후 `/`, `/dashboard`, `/create`, `/results`, `/studio`, `/video-studio`, `/export`, `/history`, `/calendar`, `/campaign`, `/campaigns`, `/account`, `/settings`, `/privacy`, `/privacy-policy`, `/terms`, `/diagnostics`, `/api/ai/health` 모두 HTTP 200 |
| AI health | PASS | `/api/ai/health`: `provider: mock`, `selectedProvider: mock`, `openaiConfigured: false`, `externalApiConnected: false`, `fallbackAvailable: true` |

참고: build 실행 중 dev 서버의 `.next/server` chunk가 일시적으로 섞여 `/`가 500을 반환한 로그가 있었으나, dev 서버 재시작 후 전체 라우트가 200으로 재검증됐다. build/typecheck/lint 결과에는 영향 없음.

### 이슈별 상태
| 이슈 | 상태 | 재검증 결과 |
| --- | --- | --- |
| Lint 스크립트가 출시 QA 명령으로 완료되지 않음 | RESOLVED | `package.json` lint 스크립트와 `eslint.config.mjs` 기준으로 `npm.cmd run lint` 종료 코드 0. warning 12개만 남음 |
| `/settings` React hydration mismatch | RESOLVED | `AppShell`의 온보딩 모달 mount 이후 렌더링 처리 반영. 이전 브라우저 재검증에서 console error 0, 이번 라우트 스모크 200 |
| `/campaign` 라우트 404 | RESOLVED | `app/campaign/page.tsx`가 `/campaigns`로 redirect. 라우트 스모크에서 `/campaign` 최종 200 |
| MockProvider 회귀 | RESOLVED | A/B/C 샘플 생성 모두 provider `mock`, 외부 API 연결 없음. A: Instagram Feed caption 5/hash 8/CTA 3, B: Reels caption 3/hook 5/thumbnail 5, C: Story caption 5/CTA 3 |
| PNG 산출물 | RESOLVED | Creator Plus 상태 Studio PNG `postkit_instagram_feed_20260706_esign1.png` 생성 및 직접 열람 확인 |
| TXT/JSON 산출물 | RESOLVED | Export 산출물 `caption`, `upload_text`, `hashtags`, `cta`, `disclosure`, `thumbnail` TXT와 `metadata` JSON 다운로드 확인 |
| 영상 fallback PNG/TXT 산출물 | RESOLVED | `postkit_reels_20260706_ntent1_frame_01.png`, `postkit_reels_20260706_ntent1.txt` 다운로드 및 fallback 프레임 직접 열람 확인 |
| Creator Plus 워터마크 제거 | RESOLVED | Studio PNG와 Video Studio fallback PNG에서 `Made with PostKit` 미표시 직접 확인. 사용자 브랜드 텍스트/광고 표시와 충돌 없음 |
| 무료 플랜 워터마크 실제 표시 | OPEN | 앱 UI의 플랜 다운그레이드는 즉시 Free가 아니라 다음 지급일부터 예약된다. 자동화 보안 정책상 주소창 스크립트/localStorage 직접 조작은 차단됐고, 파일 선택창 import 경로도 완료되지 않아 Free 상태 실제 PNG/WebM 다운로드 확인은 미완료. 코드 정책상 `Free/free`는 watermark enabled이나 실제 산출물 PASS로 판정하지 않음 |
| WebM 실제 생성/재생 | PARTIAL | 현재 브라우저에서 실제 WebM 생성은 파일 업로드/세션 이미지 제약으로 끝까지 검증하지 못함. fallback PNG/TXT는 PASS, WebM은 PASS 처리하지 않음 |
| qa-artifacts Git 포함 여부 | RESOLVED | `git ls-files qa-artifacts` 결과 없음, `git status --short --ignored qa-artifacts`는 `!! qa-artifacts/` |
| 보안 검사 | RESOLVED | 실제 API 키/토큰/비밀번호 값은 발견되지 않음. 검색 결과는 secret detector 정규식 정의만 해당. `app`, `components`, `lib`, `types` 범위에서 `console.log`, `console.error`, `console.warn`, `debugger` 없음 |

### 워터마크 검증 기록
- 사용자 데이터 백업: 앱 계정 내보내기 버튼으로 `C:\Users\user\Downloads\postkit_account_export_1783367516301.json` 생성 확인.
- 임시 Free 상태: QA import JSON은 `qa-artifacts/postkit_free_watermark_state.json`에 준비했지만, 파일 선택창/가져오기 자동화가 완료되지 않아 실제 브라우저 상태에 적용하지 않음.
- 사용자 데이터와 플랜 복원: Free import가 완료되지 않았으므로 기존 브라우저 플랜/데이터 변경 없음. 백업 파일은 보존됨.
- Creator Plus 상태: 기존 데모/유료 상태 산출물에서 `Made with PostKit` 미표시 직접 확인.
- 원본 파일: 원본 업로드 파일을 수정하는 흐름은 수행하지 않았고, 검증 대상은 다운로드된 PNG/TXT/JSON/fallback 산출물로 한정.

### 실제 OpenAI API 호출 여부
- 실제 OpenAI API 호출 없음.
- Health API는 `mock` provider와 `externalApiConnected: false`를 반환.
- `.env.local`, 실제 API 키, 토큰, 결제 정보 추가 없음.

---

아래 내용은 최초 Pre-AI QA 기록이다. 기존 문제와 재현 내용을 보존하기 위해 삭제하지 않고 유지한다.

## 종합 결과
- 판정: 출시 불가
- 이유: `typecheck`와 `build`는 통과했지만, 출시 전 QA 기준에서 High 이슈가 남아 있습니다. `npm.cmd run lint`가 대화형 ESLint 초기 설정 프롬프트로 완료되지 않았고, `/settings`에서 React hydration mismatch 콘솔 오류가 재현됐으며, 현재 Production mock 기준 핵심 캡션 품질이 실제 SNS 업로드 문구로 쓰기 어려운 수준입니다. 또한 실제 UI 업로드를 포함한 Create -> Results -> Studio/Video/Export 산출물 흐름은 브라우저 도구의 파일 업로드 제한 때문에 끝까지 검증하지 못했습니다.

## 검증 환경
- OS: Microsoft Windows 11 Home 10.0.26200
- Node 버전: v24.18.0
- npm 버전: 11.16.0
- 브라우저 또는 자동화 도구: Codex in-app browser, HTTP 요청, PowerShell, Node fetch
- 검증 날짜: 2026-07-06
- Git 브랜치: `openai-preview`
- Git commit: `9d03794ddfdd144c1f1fcc0aa203d7aac2ee6471`
- dev server: `npm.cmd run dev`, `http://localhost:3000`
- QA 산출물 폴더: `qa-artifacts/`

## 항목별 결과
| 항목 | 결과 | 근거 |
| --- | --- | --- |
| TypeScript 검사 | PASS | `npm.cmd run typecheck` -> `tsc --noEmit` 종료 코드 0 |
| Production build | PASS | `npm.cmd run build` -> Next build 성공, 25개 static page 생성 |
| Lint 스크립트 | FAIL | `npm.cmd run lint` 실행 시 `next lint`가 ESLint 설정 선택 프롬프트를 띄우고 완료되지 않음 |
| 기본 라우트 접근 | PARTIAL | 요청 라우트 중 `/campaign`은 404, 실제 구현 라우트 `/campaigns`는 200 |
| dev server 시작 | PASS | `http://localhost:3000` Ready |
| Health API mock 상태 | PASS | `selectedProvider: "mock"`, `openaiConfigured: false`, `fallbackAvailable: true`, `externalApiConnected: false` |
| `AI_PROVIDER=openai` + API key 없음 | PASS | 서버 정상 시작, Health API가 mock fallback 선택 |
| Create UI 초기 상태 | PARTIAL | 플랫폼 선택 전 하위 입력 영역이 흐림/비활성 스타일임을 코드/브라우저로 확인. 파일 업로드 자동화 미지원으로 실제 UI 생성 완료는 미검증 |
| A/B/C mock 생성 API | PARTIAL | `/api/ai/generate-text` POST 성공, provider mock. 문구 품질은 Fail 수준 포함 |
| Results/복사/저장/History 흐름 | NOT TESTED | UI 업로드를 포함한 생성 완료 상태를 만들지 못해 실제 버튼 흐름 미검증 |
| Studio PNG 산출물 | NOT TESTED | 실제 생성 결과와 업로드 이미지가 있는 Studio 상태 미검증 |
| Video Studio WebM/fallback | NOT TESTED | 실제 영상 생성/다운로드/프레임 검증 미수행 |
| Export 파일 다운로드 | PARTIAL | API 생성 JSON/TXT 파일은 생성/parse 확인. Export UI 다운로드는 미검증 |
| 반응형 빈 상태 | PARTIAL | 390x844, 412x915, 1440x900, 1920x1080에서 주요 빈 상태 페이지 overflow 없음. 실제 결과 카드가 채워진 상태는 미검증 |
| 개인정보/보안 정적 검사 | PASS | 실제 `.env` 없음, `.env.example`만 추적. OpenAI SDK import는 `lib/ai/openaiProvider.ts`에 한정 |

요약 개수:
- PASS: 5
- FAIL: 1
- PARTIAL: 6
- NOT TESTED: 3

## 발견된 문제

### 1. Lint 스크립트가 출시 QA 명령으로 완료되지 않음
- 심각도: High
- 발생 페이지: 해당 없음, 개발 명령
- 재현 순서:
  1. `npm.cmd run lint` 실행
  2. Next.js `next lint`가 ESLint 설정 선택 프롬프트 표시
- 실제 결과: 명령이 비대화형 QA에서 완료되지 않음
- 기대 결과: lint 스크립트가 종료 코드 0 또는 명확한 lint 오류로 완료
- 관련 파일 추정: `package.json`, ESLint 설정 파일 부재
- 출시 차단 여부: 예

### 2. `/settings`에서 React hydration mismatch 콘솔 오류 재현
- 심각도: High
- 발생 페이지: `/settings`
- 재현 순서:
  1. dev server 실행
  2. 새 브라우저 탭에서 `http://localhost:3000/settings` 접근
  3. 콘솔 error 로그 확인
- 실제 결과: `Hydration failed because the server rendered text didn't match the client...`
- 기대 결과: 콘솔 error 없이 hydration 완료
- 관련 파일 추정: `app/settings/page.tsx`, `components/AppShell.tsx`, localStorage 기반 초기 렌더링 상태
- 출시 차단 여부: 예

### 3. MockProvider Instagram Feed 캡션 품질 미달
- 심각도: High
- 발생 페이지: `/api/ai/generate-text`, 결과 화면 예상 본문
- 재현 순서:
  1. 플랫폼 `Instagram Feed`
  2. 제품/주제 `흑백요리사 캐비어`
  3. 장점 `선물용, 와인 안주, 고급스러운 식탁`
  4. mock 생성 API 호출
- 실제 결과: “선물용이나 선물용 기준”, “기준을 보는 분”, “쓰임이 분명한 쪽”, “기준도 놓치지 않습니다”, “받는 사람도 바로 쓰기 좋습니다” 등 부자연스러운 표현 발생
- 기대 결과: 제품 소개, 활용법, 선물 대상, 후기, 구매 유도 역할이 자연스럽고 서로 다르게 분리된 SNS 본문
- 관련 파일 추정: `lib/mockAi.ts`
- 출시 차단 여부: 예

### 4. 요청 체크리스트의 `/campaign` 라우트가 404
- 심각도: Medium
- 발생 페이지: `/campaign`
- 재현 순서: `http://localhost:3000/campaign` 접근
- 실제 결과: 404
- 기대 결과: 요청 체크리스트 기준 페이지 접근 가능 또는 문서/체크리스트가 `/campaigns`로 통일
- 관련 파일 추정: `app/campaigns/page.tsx`, 문서/QA 체크리스트
- 출시 차단 여부: 아니오. 앱 내 실제 메뉴는 `/campaigns`로 연결됨

### 5. 실제 UI 파일 업로드 기반 핵심 흐름 미검증
- 심각도: Medium
- 발생 페이지: `/create`, `/results`, `/studio`, `/video-studio`, `/export`
- 재현 순서: 브라우저 자동화로 `/create` 파일 input에 테스트 PNG 주입 시도
- 실제 결과: 현재 사용 가능한 브라우저 도구에 `setInputFiles` 등 파일 업로드 주입 API가 없어 실제 UI 생성 완료까지 검증하지 못함
- 기대 결과: 실제 브라우저에서 파일 업로드 후 Create -> Results -> Studio/Video/Export까지 통과 확인
- 관련 파일 추정: 해당 없음, QA 환경 제한
- 출시 차단 여부: 조건부. 수동 브라우저 QA 필요

## 산출물 검증
| 산출물 | 결과 | 근거 |
| --- | --- | --- |
| PNG | NOT TESTED | Studio 다운로드 PNG를 실제 생성/열람하지 못함 |
| WebM | NOT TESTED | Video Studio WebM 생성/재생 미검증 |
| TXT | PARTIAL | `qa-artifacts/generated-A/B/C-captions.txt` 생성, 0바이트 아님, UTF-8 한글 정상 |
| JSON | PASS | `qa-artifacts/generated-A/B/C.json` parse 성공, provider mock, 플랫폼 값 요청과 일치 |
| 워터마크 | NOT TESTED | 실제 PNG/WebM/fallback 프레임 파일을 열어 확인하지 못함 |
| 파일 크기 | PARTIAL | `generated-A.json` 7437 bytes, `generated-A-captions.txt` 1423 bytes, `generated-B.json` 6278 bytes, `generated-B-captions.txt` 348 bytes, `generated-C.json` 5162 bytes, `generated-C-captions.txt` 481 bytes |

생성된 QA 파일:
- `qa-artifacts/test-input.png`
- `qa-artifacts/generated-A.json`
- `qa-artifacts/generated-A-captions.txt`
- `qa-artifacts/generated-B.json`
- `qa-artifacts/generated-B-captions.txt`
- `qa-artifacts/generated-C.json`
- `qa-artifacts/generated-C-captions.txt`

## 문구 품질 평가

### 테스트 A: Instagram Feed / 흑백요리사 캐비어
실제 생성 캡션:

1.
```text
흑백요리사 캐비어, 특별한 날에 꺼내기 좋은 제품입니다.
차갑게 준비한 와인, 담백한 크래커, 간단한 치즈와 함께 내기 좋습니다.
선물용이나 선물용 기준으로 고르는 분이라면 한 번 살펴보세요.
```

2.
```text
선물용으로 고민하는 분들이라면 흑백요리사 캐비어도 비교해볼 만합니다.
와인 안주까지 같이 볼 수 있어 실제로 쓰는 장면이 더 분명합니다.
구매 전 옵션과 가격을 한 번 확인해 보세요.
```

3.
```text
식탁에 특별한 메뉴를 올리고 싶을 때, 흑백요리사 캐비어 하나로 준비가 덜 복잡해졌어요.
선물용, 와인 안주 기준을 보는 분이라면 사진보다 실제 사용 장면에서 더 이해하기 쉽습니다.
비슷한 제품과 비교 중이라면 이 글을 저장해두세요.
```

4.
```text
흑백요리사 캐비어, 선물용으로도 무겁지 않게 준비할 수 있습니다.
선물용만 보지 않고 와인 안주까지 챙긴 쪽이라 받는 사람도 바로 쓰기 좋습니다.
구매 전 궁금한 부분은 문의하거나 댓글로 남겨주세요.
```

5.
```text
흑백요리사 캐비어, 화려하게 말하지 않아도 쓰임이 분명한 쪽입니다.
식탁에 특별한 메뉴를 올리고 싶을 때에 어울리고 선물용, 와인 안주 기준도 놓치지 않습니다.
필요한 옵션이 있다면 게시물에서 먼저 확인해 주세요.
```

평가:
| 캡션 | 역할 일치 | 한국어 자연스러움 | 입력 반영도 | 차별성 | 실제 SNS 사용 가능성 | 과장·허위 가능성 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 제품 소개 PARTIAL | 2/5 | 4/5 | 2/5 | 2/5 | 4/5 |
| 2 | 구매 유도 PARTIAL | 2/5 | 4/5 | 2/5 | 2/5 | 4/5 |
| 3 | 후기/경험 FAIL | 2/5 | 4/5 | 2/5 | 2/5 | 4/5 |
| 4 | 선물 중심 PARTIAL | 2/5 | 4/5 | 2/5 | 2/5 | 4/5 |
| 5 | 브랜드형 FAIL | 1/5 | 4/5 | 1/5 | 1/5 | 4/5 |

판정: FAIL. 입력 반영은 되지만 동일 장점 반복이 심하고, 이전에 금지 대상으로 지적된 어색한 표현이 다시 발생했습니다.

### 테스트 B: Instagram Reels / 여름용 린넨 셔츠
실제 생성 캡션:
```text
여름용 린넨 셔츠 실제로 쓰는 장면만 짧게 보여드려요.
시원함, 가벼움 기준이 궁금했다면 영상에서 바로 확인할 수 있습니다.
여름용 린넨 셔츠 궁금한 부분은 댓글로 남겨주세요.

---

여름용 린넨 셔츠 시원함 기준이 먼저 보입니다.
다시 보려면 저장해두세요.
```

평가:
- 한국어 자연스러움: 2/5
- 입력 반영도: 3/5
- 캡션 간 차별성: 2/5
- 실제 SNS 사용 가능성: 2/5
- 과장·허위 가능성: 4/5
- 판정: PARTIAL. 플랫폼은 섞이지 않았지만 “기준이 궁금했다면”, “기준이 먼저 보입니다”가 어색하고 Reels 훅/자막/CTA 분리가 충분히 보이지 않습니다.

### 테스트 C: Instagram Story / 카페 딸기라떼
실제 생성 캡션:
```text
카페 딸기라떼 오늘 확인 가능합니다.
시즌 한정 찾던 분들은 지금 보기.

---

카페 딸기라떼 링크 열어두었어요.
신선한 딸기까지 같이 확인하세요.

---

카페 딸기라떼 시즌 한정 궁금한 점은
DM으로 바로 남겨주세요.

---

카페 딸기라떼 신선한 딸기 마음에 드나요?
스티커로 골라주세요.

---

카페 딸기라떼 시즌 한정 다시 볼 분들은
스토리에서 바로 저장하세요.
```

평가:
- 한국어 자연스러움: 3/5
- 입력 반영도: 4/5
- 캡션 간 차별성: 3/5
- 실제 SNS 사용 가능성: 3/5
- 과장·허위 가능성: 3/5
- 판정: PARTIAL. Story 길이는 맞지만 “링크 열어두었어요”, “스토리에서 바로 저장하세요”는 실제 설정 여부를 보장하지 못해 위험합니다.

## 출시 전 필수 수정
Critical/High 문제:
1. `npm.cmd run lint`가 비대화형으로 완료되도록 lint 스크립트/설정 정리
2. `/settings` hydration mismatch 원인 제거
3. `lib/mockAi.ts` 문구 생성 품질 재개선: Feed 5개 역할 분리, 반복/어색한 조사/“기준”류 문장 제거, Reels/Story 플랫폼별 산출물 형식 강화

## 미검증 항목
- 실제 Create UI에서 파일 업로드 후 생성 버튼 중복 클릭 방지, 로딩 상태, Results 이동
- Results에서 캡션 선택, 개별 복사, 전체 복사, UI 라벨 미포함 복사
- 내 스타일로 저장, 좋아요/별로예요, 다시 생성, History 저장/새로고침 유지/다시 열기
- 크레딧 1회 차감, 중복 클릭 중복 차감 방지, 실패 환불
- Studio에서 실제 PNG 다운로드, 크기/열림/워터마크/원본 파일 미수정 확인
- Video Studio에서 WebM 생성, 재생 시간, 프레임별 워터마크, fallback PNG 워터마크 확인
- Export UI에서 PNG/TXT/JSON/Web Share 다운로드 흐름
- 실제 결과가 채워진 Results/History/Studio/Video/Export 반응형 화면
- 브라우저 다운로드 파일을 실제 이미지/영상 뷰어로 여는 육안 QA

## 보안 확인 요약
- 실제 `.env`, `.env.local`, `.env.production`, `.env.development` 파일은 발견되지 않음
- Git 추적 환경 파일은 `.env.example`만 확인됨
- `.env.example`은 이름만 있고 실제 값은 비어 있음
- `NEXT_PUBLIC_OPENAI_API_KEY` 패턴 발견 없음
- OpenAI SDK 사용은 `lib/ai/openaiProvider.ts`에 한정됨
- `as any`, `@ts-ignore`, `debugger`, `console.log`는 `app`, `components`, `lib`, `types` 범위에서 발견되지 않음
- 시크릿 유사 패턴 검색 결과는 문서의 환경변수 이름, `.env.example`의 빈 키 이름, 보안 차단 정규식 코드에 한정됨

## 비고
- 실제 OpenAI API는 호출하지 않았습니다.
- `AI_PROVIDER=openai`으로 서버를 재시작했지만 `OPENAI_API_KEY`가 없는 상태라 Health API는 mock fallback을 선택했습니다.
- `qa-artifacts/`는 QA 산출물 폴더이며 Git에 커밋하지 않는 것을 권장합니다.
