# PostKit Independent Release Audit

독립 검수 보고서. 기존 `QA_REPORT_PRE_AI.md`의 결론을 신뢰하지 않고 실제 코드 검토, 정적 검증 실행, dev 서버 HTTP 검증, API 실호출(mock)로 재검증했다. 코드 수정 없음, 외부 API 호출 없음, 패키지 설치 없음.

> **[후속 조치 완료 — 2026-07-07, 커밋 d99ee01 + f008f5d + 최종 QA 커밋]**
> 이 보고서가 지적한 무료 공개 베타 출시 조건은 `fable-release-audit` 브랜치에서 **전부 해소**됐다.
> 1차 수정 내역은 [FABLE_RELEASE_COMPLETION.md](./FABLE_RELEASE_COMPLETION.md),
> **PNG/WebM/워터마크 실물 검증과 모바일 실측(잔여 조건 5번 포함)은 [FABLE_FINAL_RELEASE_QA.md](./FABLE_FINAL_RELEASE_QA.md)** 참고.
> 요약: H-01~H-03, M-01~M-04·M-06·M-07, L-01~L-05 해결 + 실물 QA에서 발견된 High 1건(보관 정책의 즉시 업로드 참조 제거)
> 등 7건 추가 수정. 자동 테스트 26건, lint 경고 0. 갱신 점수 58 → 82. 아래 본문은 검수 시점 기록 원본이다.
> **판정: 무료 공개 베타 출시 가능 — 실제 OpenAI API 연결만 남음.**

---

## 최종 요약

PostKit은 **코드 품질과 클라이언트 로직 완성도는 MVP 기준으로 높은 편**이다. lint/typecheck/build 전부 통과, `any`·`ts-ignore` 0건, 콘솔 로그 0건, XSS 벡터(`dangerouslySetInnerHTML` 등) 0건, OpenAI SDK는 서버 전용이고 클라이언트 번들에 키 흔적이 없다. 크레딧 차감·환불 로직에는 중복 클릭 락, idempotency 키, 중복 환불 가드가 실제로 구현되어 있다.

그러나 **서비스의 신뢰 경계 전체가 브라우저 안에 있다.** 로그인·서버 DB·결제가 없고 계정·크레딧·플랜·워터마크 정책이 모두 localStorage와 클라이언트 코드에서 실행된다. 또한 신규 사용자의 기본 플랜이 `Starter(active)`여서 **워터마크가 기본적으로 적용되지 않으며**, pricing 페이지의 mock 업그레이드 버튼으로 누구나 모든 플랜을 무료로 얻을 수 있다. Export의 기본 이미지 PNG는 실제 디자인이 아닌 "PostKit Preview / mock image" 자리표시자다.

PNG·WebM 실물 산출물은 이 검수 환경에 브라우저 자동화 도구가 없어 **이번에도 파일로 검증하지 못했다**(이전 QA도 마찬가지였음 — `qa-artifacts/screenshots`는 빈 폴더다). 산출물 실물 검증은 여전히 열려 있는 출시 조건이다.

| 단계 | 판정 |
|---|---|
| 1. 포트폴리오·시연용 | **출시 가능** |
| 2. 소수 대상 비공개 베타 | **조건부 출시 가능** |
| 3. 무료 공개 베타 | **조건부 출시 가능** (조건 미충족 시 출시 불가) |
| 4. 실제 결제를 받는 상용 서비스 | **출시 불가** |

---

## 단계별 출시 판정

### 1. 포트폴리오·시연용 — 출시 가능
- 26개 라우트 전부 200(또는 의도된 307/404), 빌드·타입·린트 통과, 핵심 흐름(생성→결과→내보내기) 코드가 일관되게 연결되어 있다.
- mock 생성 결과도 한국어 품질이 시연 수준으로는 충분하고, 광고/협찬 표시·권리 확인·개인정보 관리 화면 등 차별화 포인트가 실제로 동작한다.
- 조건 없음. 지금 상태로 시연 가능.

### 2. 비공개 베타(소수 사용자) — 조건부 출시 가능
- 가능 근거: 서버 비용·보안 리스크가 사실상 없고(외부 API 미연결), 데이터가 각자 브라우저에만 저장되므로 유출 표면이 작다.
- 조건:
  1. "데이터는 이 브라우저에만 저장되며 브라우저 데이터 삭제 시 복구 불가"를 첫 화면 수준에서 고지 (현재 account 페이지에는 있음).
  2. "크레딧 구매/플랜 업그레이드는 실제 결제가 아님"을 오해 없게 표기 (현재 'mock 구매' 문구로 되어 있으나 일반 사용자는 'mock'을 모름).
  3. 산출물(PNG/WebM) 실물 QA 1회 완료.

### 3. 무료 공개 베타 — 조건부 출시 가능
- 가능 근거: AI가 mock인 동안 비용 폭증·남용 리스크가 없고, 개인정보 수집이 없어 규제 리스크도 낮다.
- 반드시 충족해야 하는 조건 (미충족 시 출시 불가):
  1. **기본 플랜을 Free로 변경하고 워터마크 정책 일관화** (현재 신규 사용자가 Starter로 시작해 워터마크가 안 붙음 — H-01).
  2. **mock 결제·플랜 UI를 숨기거나 '체험판'으로 명확히 재표기** — 공개 서비스에서 "구매"라는 단어가 실제 결제로 오인될 수 있음.
  3. `/diagnostics` 등 내부 도구 숨김 (M-03), 사용자 노출 문구의 "mock" 정리 (M-02).
  4. Export 기본 PNG의 placeholder 문제 해결 또는 해당 항목 숨김 (H-03).
  5. PNG/WebM/워터마크 실물 산출물 QA 완료 (현재 NOT TESTED).
- 유의: PC·모바일 간 동기화가 없으므로 "계정" 개념을 기대한 사용자 이탈이 예상된다. 이는 고지로 완화 가능.
- 실제 OpenAI를 연결한 채 공개 베타를 여는 것은 **rate limit·사용 한도 구현 전에는 불가** (H-02).

### 4. 유료 상용 서비스 — 출시 불가
- 구조적 차단 사유 (기능 버그가 아니라 아키텍처 부재):
  - 인증 없음 → 사용자 식별 불가, 결제 귀속 불가.
  - 서버 DB 없음 → 크레딧 원장이 사용자 브라우저에 있어 위·변조 가능, 기기 간 동기화 불가, 유실 시 복구 불가.
  - 결제 없음 → 전 플랜이 클릭 한 번으로 무료 취득 가능.
  - 워터마크·크레딧·플랜 강제가 전부 클라이언트 코드 → 유료 가치(워터마크 제거, 크레딧)가 localStorage 편집만으로 무력화.
- 서버 인증·DB·결제·서버측 정책 강제·감사 로그가 갖춰지기 전에는 어떤 조건으로도 유료 전환 불가.

---

## 검증 환경

| 항목 | 값 |
|---|---|
| OS | Windows 11 Home 10.0.26200 |
| Node | v24.18.0 |
| npm | 11.16.0 |
| 브라우저 | 사용 불가 (브라우저 자동화 도구 없음 → 시각·인터랙션 항목 NOT TESTED) |
| Git branch | fable-release-audit |
| Git commit | 1d48e9d "Complete pre-AI QA fixes" (working tree clean) |
| 검증 날짜 | 2026-07-07 |
| Next.js | 15.5.19 (package.json `^15.0.0`) / React 19 / TypeScript 5.7 |

---

## 정적 검증 결과

실제 실행한 명령과 종료 코드:

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `npm.cmd run lint` (`eslint .`) | 0 | 오류 0, **경고 12** (unused vars 5, exhaustive-deps 6, img/alt 2) |
| `npm.cmd run typecheck` (`tsc --noEmit`) | 0 | 오류 0 |
| `npm.cmd run build` (`next build`) | 0 | 26개 정적 페이지 + 동적 API 3개, First Load JS 공유 102kB |
| test | 없음 | package.json에 test 스크립트 자체가 없음 — 자동 테스트 0건 |

추가 정적 검사:
- `any` / `as any` / `@ts-ignore` / `@ts-expect-error`: **0건** (app/components/lib/types 전체).
- 하드코딩 비밀값: 없음. `OPENAI_API_KEY`는 `lib/ai/openaiProvider.ts`의 `process.env` 참조뿐.
- `NEXT_PUBLIC_OPENAI*` 패턴: 소스에 없음.
- 프로덕션 빌드 클라이언트 번들(`.next/static`)에서 `OPENAI_API_KEY`·`api.openai.com`·`sk-` 패턴 검색: **0건** — SDK가 클라이언트 번들에 포함되지 않음을 실물로 확인.
- `console.log/error/warn`: 소스에 **0건** — 프롬프트·개인정보가 로그로 남을 경로 없음.
- `dangerouslySetInnerHTML` / `innerHTML` / `eval`: 0건.
- Git 추적 검사: `.env` 미추적(`.env.example`만 추적), `qa-artifacts/` 미추적. 단 **소스 zip 2개(약 600KB)와 `tsconfig.tsbuildinfo`가 추적됨** (M-06).
- ESLint 경고 중 `app/export/page.tsx:172`, `app/video-studio/page.tsx:177` 의 exhaustive-deps는 Blob objectURL 해제 useEffect 의존성 누락으로, 잠재적 stale URL 위험 (L-01).
- hydration 위험(코드 수준): `app/create/page.tsx:154-156` 등에서 `useState(() => getCreditAccount(...))`·`useState(() => getPrivacyPreferences())`로 localStorage를 초기 렌더에서 직접 읽음. 기존 데이터가 있는 사용자는 SSG HTML(기본값 120크레딧)과 클라이언트 초기 상태가 달라 hydration 불일치 가능 (M-01). 실제 발생 여부는 브라우저 미사용으로 NOT TESTED.

---

## 실제 사용자 흐름 결과

### HTTP 라우트 검증 (dev 서버, 실측)

`/`, `/dashboard`, `/create`, `/results`, `/studio`, `/video-studio`, `/export`, `/history`, `/calendar`, `/campaigns`, `/account`, `/settings`, `/privacy`, `/privacy-policy`, `/terms`, `/diagnostics`, `/pricing`, `/demo`, `/api/ai/health`, `/manifest.webmanifest` → **전부 200**.
`/campaign` → **307 → `/campaigns`** (의도된 리다이렉트, 이전 QA의 404는 수정됨). 존재하지 않는 라우트 → 404 정상.

### 생성 API 실호출 (mock, 실측)

- 유효 요청(UTF-8 한글 입력) → HTTP 200, `provider: mock`, `usedFallback: false`, 캡션 4·해시태그 8·CTA 3, 한글 정상, `sponsorDisclosure: "ad"` 입력 시 결과에 `#광고` 표시 문구 포함 확인.
- requestId 누락 → 400 + 한국어 오류 메시지. JSON 아님 → 400. 스택 트레이스·내부 오류 노출 없음.
- `/api/ai/health` → 비밀값 없음(`openaiConfigured: false`만 노출), `externalApiConnected: false`.
- **`AI_PROVIDER=openai` + 키 없음으로 별도 서버 기동 → health가 `selectedProvider: "mock"` 반환. mock fallback 실측 확인.**

### 코드 수준 흐름 검증 (브라우저 미사용 — 코드 확인)

| 항목 | 결과 | 근거 |
|---|---|---|
| 플랫폼 선택 전 하위 입력 비활성 | PASS(코드) | `app/create/page.tsx:539` `pointer-events-none opacity-50` + 단계 게이트 |
| 중복 생성 클릭 방지 | PASS(코드) | `generationLockRef` + 버튼 `disabled={isGenerating}` + `hasActiveAiRequest(idempotencyKey)` 2분 창 |
| 정상 생성 시 크레딧 1회 차감 | PASS(코드) | `spendCreditsForGeneration` 1회 호출, ledger 기록 |
| 전체 실패 시 환불 | PASS(코드) | catch에서 `refundGenerationCredits(debit.ledgerEntry.id)` |
| 환불 중복 실행 방지 | PASS(코드) | `lib/creditStorage.ts:184-195` ledger에서 `debitLedgerId` 기환불 여부 검사 |
| fallback 성공 시 차감 유지 | PASS(코드) | openai 실패→mock fallback 성공 시 `ok:true`로 반환되어 환불 없음 (기존 정책 유지) |
| History 중복 저장 방지 | PASS(코드) | `handleSave`가 id 존재 시 update, 신규 생성은 결과당 1회 |
| 새로고침 후 텍스트 데이터 유지 | PASS(코드) | currentResult/history/ledger 모두 localStorage |
| 새로고침 후 업로드 이미지·WebM 유지 | **한계 확인** | 세션 메모리 Map(`sessionImageStore`, `videoSessionStore`)이라 새로고침 시 소실 → Studio는 fallback 배경으로 대체. Export UI에 "재생성 필요" 안내 있음 |
| 개별 복사에 UI 라벨 미포함 | PASS(코드) | `CopyButton value={selectedCaption}` 등 원문만 전달 |
| 전체 복사 | 주의 | `composePackage`가 `[섹션명]`·체크리스트 포함 — 패키지 문서로는 의도된 형식이나 SNS에 그대로 붙여넣으면 안내문 섞임 (L-03) |
| 좋아요·별로예요·내 스타일 저장 | PASS(코드) | `lib/learning.ts` 경유 personalization 반영, 설정으로 끌 수 있음 |
| 실제 버튼 클릭·화면 렌더링 | **NOT TESTED** | 브라우저 도구 없음 |

---

## 산출물 결과

| 산출물 | 판정 | 근거 |
|---|---|---|
| 생성 텍스트(JSON, API 실측) | **PASS** | 이번 검수에서 직접 생성. UTF-8 한글, JSON parse 정상, UI 라벨 미혼입, 광고 표시 포함 |
| 캡션/해시태그/CTA/전체 문구 TXT | PASS(코드) + 참고 실물 | `exportUtils.buildExportAssets`가 `text/plain;charset=utf-8`로 원문만 담음. 파일명 규칙 `postkit_{platform}_{type}_{date}_{id}.ext` 정상. 이전 QA의 TXT 아티팩트도 한글 정상·0바이트 아님 |
| 메타데이터 JSON | PASS(코드) | `buildExportMetadata`에 비밀값·원본 이미지 없음. (참고: `qa-artifacts/*.json`의 parse 실패는 PowerShell 리다이렉트 BOM 때문 — 앱 출력 결함 아님) |
| 이미지 PNG 1080×1350 / 1080×1080 / 1080×1920 / 1280×720 | **NOT TESTED(실물)** / 코드 PASS | `designTemplates` 출력 프리셋 치수 정확, `renderDesignToBlob`이 프리셋 원본 크기로 캔버스 렌더. 실물 파일 생성·열람은 브라우저 없음으로 미검증 |
| Export 기본 "미리보기 PNG" | **FAIL(설계)** | Studio 디자인이 없으면 `createMockPreviewBlob`이 "PostKit Preview"·"mock image" 문구가 그려진 자리표시자를 다운로드시키고, 최대 1400px로 축소되어 프리셋 해상도와 불일치 (H-03) |
| WebM 영상 | **NOT TESTED** | `renderVideoToWebM`은 captureStream+MediaRecorder 기반으로 구현 완성도 높고 미지원 브라우저 fallback 처리 있음. 실제 생성·재생·길이·프레임 검증은 미수행. 이전 QA도 미검증 (screenshots 폴더 빈 것 확인) |
| fallback PNG 프레임 | NOT TESTED(실물) / 코드 PASS | `renderVideoFrameToBlob` 존재, 워터마크 포함 |
| 워터마크 (무료 플랜) | **OPEN** | 코드상 `Free`/`free` 상태에서 PNG·WebM 프레임·Export placeholder 모두에 "Made with PostKit" 박스가 그려짐(`watermarkPolicy.ts`, 반투명 검정 배경+흰 글자, 우하단, safe margin으로 CTA와 겹침 회피). 그러나 **기본 계정이 Starter(active)라 실사용 기본값에서는 워터마크가 아예 적용되지 않음**(H-01). 실물 출력 미확인 |
| 워터마크 (Creator Plus 제거) | PASS(코드) / 실물 NOT TESTED | `canRemoveWatermark`: `active` && `!Free` → 미출력 |

---

## 보안·개인정보 평가

**양호한 점 (실측·코드 확인):**
- API 키 서버 전용, 클라이언트 번들 검색으로 실물 확인. `.env` 미추적.
- XSS 벡터 없음(React 텍스트 렌더링만, innerHTML 미사용). 사용자 입력은 길이 제한 + 정규화(`validation.ts`).
- 이미지 업로드: PNG/JPEG/WebP만, 15MB 제한, **서버 전송 없음**(메모리 세션 + objectURL, 해제 함수 존재).
- 원본 이미지·영상·base64를 localStorage에 저장하지 않음 — 파일명만 저장하며 만료 정리(`cleanupExpiredMockUploads`)까지 있음.
- 프롬프트·생성 원문을 서버 로그로 남기지 않음(콘솔 로그 0건, OpenAI 호출도 `store: false`).
- Health API 비밀값 미노출, API 오류 응답에 스택 트레이스 없음.
- 데이터 내보내기(JSON)·범위별 삭제·전체 삭제(확인 문구 입력식)·개인 맞춤 학습 끄기 모두 구현됨.
- 이용약관·개인정보처리방침 실제 콘텐츠 존재(저작권·초상권·광고 표시·민감정보 경고 포함), nav에서 접근 가능.

**취약한 점:**
- 정책 강제가 전부 클라이언트: 크레딧·플랜·워터마크는 localStorage 편집 또는 pricing의 mock 업그레이드로 우회 가능 (C-02).
- `/api/ai/*`에 인증·rate limit·IP/일일 한도 없음. mock인 지금은 무해하나 OpenAI 연결 순간 비용·남용 리스크 (H-02).
- 영상 업로드는 형식(`video/*`)·크기 검증 없음 — 미리보기 전용이라 실해는 낮음 (L-05).
- `/diagnostics` 내부 진단센터가 모든 사용자 nav에 노출 (M-03).

**개인정보 관점 결론:** 서버로 개인정보가 나가지 않는 구조라 현 단계 유출 리스크는 낮다. 공개 베타 시 처리방침의 "mock 단계" 문구를 실제 서비스 문구로 갱신해야 한다.

---

## 데이터·계정·결제 평가

현재 구현 상태 (전부 코드로 확인):
- **로그인 없음**: `accountStorage`가 localStorage에 mock 계정/워크스페이스/멤버를 만든다. 세션·권한 검증 없음.
- **서버 DB 없음**: `lib/data/cloudRepository.ts`는 의도적 스텁("실제 네트워크 요청을 보내지 않습니다"). 모든 데이터는 `localRepository`(localStorage).
- **결제 없음**: `mockPurchaseCredits`·`mockChangePlan`이 즉시 잔액을 바꾼다. 실제 결제는 발생하지 않고 그렇게 표기도 되어 있으나 표현이 'mock'이라 일반 사용자에게 불명확.
- **동기화 없음**: PC↔모바일, 브라우저 간 데이터 완전 분리. 브라우저 데이터 삭제 = 전체 유실 (account 페이지에 고지 있음).
- localStorage 손상 대비: 모든 read 경로가 try/catch + 손상 시 키 제거 + 기본값 복구, 마이그레이션(`migrateCreditAccount`) 존재. 월 크레딧 지급은 클라이언트 시계 기반이라 시계 조작으로 부정 지급 가능(주석으로 "real production must validate on server" 명시됨).

**영향 판단:**
- 무료 공개 베타: 허용 가능한 구조. 단 "계정처럼 보이지만 계정이 아님"을 명확히 고지해야 하고, 크레딧 소진·플랜 변경이 아무 실효가 없다는 점(워터마크 기본 미적용 포함)에서 크레딧 시스템 자체가 사실상 장식이다.
- 유료 상용: 이 구조로는 불가. 원장·플랜·워터마크의 서버 이관이 선결 조건.

---

## AI Provider 준비 상태

실제 OpenAI API는 호출하지 않았다. 전 항목 코드 검토 + mock 경로 실측.

| 항목 | 결과 |
|---|---|
| 기본 Provider가 mock | PASS (실측: health `selectedProvider: mock`) |
| `AI_PROVIDER=openai` + 키 없음 → mock fallback | PASS (실측: 별도 포트 기동 후 health 확인) |
| OpenAI SDK 서버 전용 | PASS (import는 `lib/ai/openaiProvider.ts` 한 곳, API route에서만 도달, 번들 검색 0건) |
| `NEXT_PUBLIC_OPENAI_API_KEY` 부재 | PASS |
| Structured Output 스키마 ↔ UI 타입 정합 | PASS (json_schema strict + `normalizeAiStructuredResult`로 재검증·클램프) |
| validation 실패 시 최대 1회 재시도 | PASS (`for attempt < 2`, API 오류 시엔 즉시 break — 무한 재시도 없음) |
| raw Provider 오류 사용자 노출 차단 | PASS (`classifyOpenAiError` → 정해진 한국어 메시지만) |
| timeout | PASS (기본 20s, 3–60s 클램프, `maxRetries: 0`) |
| fallbackUsed 기록 | PASS (`usedFallback`·`retryCount`가 응답·요청 히스토리에 남음) |
| 프롬프트·전체 결과 로그 미저장 | PASS (콘솔 로그 0건, `store: false`, 요청 히스토리엔 메타데이터만) |
| 금칙어·중복·조사 오류 후처리 검증 | 구현됨 (`hasForbiddenPhrase`, `hasDuplicateText`, `hasBrokenParticle`) |

**실제 OpenAI 연결 시 예상 위험 (연결 전 필수 대응):**
1. **rate limit 부재** — 비로그인 사용자가 `/api/ai/generate-text`를 무한 반복 호출 가능. 서버는 idempotency 키를 받기만 하고 중복 차단하지 않는다(클라이언트만 차단). IP·세션 단위 분당/일일 한도 필요.
2. **크레딧이 서버에서 검증되지 않음** — 크레딧 0이어도 API 직접 호출로 생성 가능. 비용 통제가 사실상 없음.
3. 입력 길이는 서버에서 잘 제한됨(제품명 100자, 키워드 700자 등) — 단건 토큰 폭증 위험은 낮음.
4. 콘텐츠 안전성: 금지어 후처리는 있으나 입력 자체의 유해성 필터 없음. OpenAI 정책 필터 의존.
5. 실패 시 크레딧: mock fallback이 성공하면 차감 유지 — 사용자에게 "AI가 아닌 기본 문구에 크레딧이 차감됨"이 될 수 있어 유료화 시 정책 재검토 필요.
6. `OPENAI_MODEL` 미설정 시 조용히 mock — 운영자가 연결 성공으로 착각 가능 (health로 확인은 가능).

---

## 발견된 문제

### Critical

**C-01. 인증·서버 DB·결제 미구현 (구조)**
- 위치: 아키텍처 전반 (`lib/accountStorage.ts`, `lib/data/*`, `lib/creditStorage.ts`)
- 재현: 아무 브라우저에서 접속 → 로그인 없이 전체 기능 사용, 데이터는 해당 브라우저에만 존재
- 실제 결과: 사용자 식별·데이터 보존·과금 귀속 불가
- 기대 결과(상용 기준): 서버 세션, 서버 원장, 실제 결제
- 근본 원인: MVP 설계상 의도된 mock 단계
- 차단 단계: 유료 상용
- 권고: 유료화 전 인증+DB+결제 이관. 문서(`BACKEND_INTEGRATION_GUIDE.md`)에 계획 존재
- 증거: `cloudRepository` 스텁, `mockPurchaseCredits`, account 페이지 고지 문구

**C-02. 크레딧·플랜·워터마크 정책이 전부 클라이언트에서 실행·저장됨**
- 위치: `lib/creditStorage.ts`, `lib/watermarkPolicy.ts:20-26`, `app/pricing`
- 재현: pricing에서 플랜 클릭(즉시 무료 업그레이드) 또는 localStorage `creditAccount` 편집
- 실제 결과: 워터마크 제거·크레딧 무한을 누구나 획득
- 기대 결과: 유료 가치는 서버에서 강제
- 근본 원인: 정책 계층이 브라우저에 있음
- 차단 단계: 유료 상용 (무료 베타에선 실해 없음)
- 권고: 서버 이관 전 유료 전환 금지

### High

**H-01. 신규 사용자 기본 플랜이 Starter(active)라 워터마크가 기본 미적용**
- 위치: `lib/creditLedger.ts:82` (`createInitialCreditAccount(planName = "Starter")`), `lib/watermarkPolicy.ts:20-22`
- 재현: 새 브라우저로 접속 → Studio에서 PNG 생성
- 실제 결과: `subscriptionStatus: "active"` + `currentPlan: "Starter"` → `canRemoveWatermark` true → 워터마크 없음, 크레딧 120 지급
- 기대 결과: 미결제 사용자는 Free 플랜 + 워터마크 표시
- 근본 원인: mock 기본값이 유료 플랜으로 설정됨
- 차단 단계: 무료 공개 베타 (워터마크 정책이 사실상 미작동)
- 권고: 기본 플랜 Free 변경 또는 `canRemoveWatermark`에서 mock 결제 상태 제외

**H-02. AI API 라우트에 인증·rate limit·사용 한도 전무**
- 위치: `app/api/ai/generate-text/route.ts` (및 recommend-design)
- 재현: curl로 무한 반복 POST — 서버측 차단 없음 (이번 검수에서 직접 반복 호출로 확인)
- 실제 결과: 현재는 mock이라 무해. OpenAI 연결 시 비용 폭증·남용 경로
- 기대 결과: IP/세션 단위 제한, 일일 한도, 서버측 idempotency 중복 차단
- 차단 단계: "실제 AI를 켠" 모든 공개 단계
- 권고: OpenAI 연결 전 rate limit 필수 구현

**H-03. Export 기본 이미지 PNG가 자리표시자이며 해상도도 프리셋과 불일치**
- 위치: `lib/downloadUtils.ts:84-142` (`createMockPreviewBlob`), `lib/exportUtils.ts:151-163`
- 재현: Studio 디자인 없이 Export에서 "미리보기 PNG" 다운로드
- 실제 결과: "PostKit Preview" 제목과 "… · mock image" 문구가 그려진 이미지, `scale = min(1, 1400/max(w,h))`로 1080×1920 프리셋이 787×1400으로 축소
- 기대 결과: 실제 업로드에 쓸 수 있는 프리셋 원치수 이미지이거나, 명확히 "샘플"로 구분
- 근본 원인: Studio 미경유 시 대체 경로가 placeholder임 (Studio 디자인이 있으면 `design_canvas`로 원치수 렌더 — 이 경로는 정상)
- 차단 단계: 무료 공개 베타 (산출물 신뢰 훼손)
- 권고: Studio 디자인 없으면 이미지 항목을 '사용 불가'로 표시하거나 자동으로 기본 템플릿 렌더 사용

### Medium

**M-01. hydration 불일치 위험** — `app/create/page.tsx:154-156` 등이 `useState` 초기값에서 localStorage를 동기 접근. 기존 데이터 보유 사용자는 SSG HTML과 초기 상태가 달라 React hydration 오류 가능. 실발생 여부 NOT TESTED. 권고: 마운트 후 `useEffect`에서 로드(다른 페이지들은 이미 그렇게 함).

**M-02. 내부 용어 사용자 노출** — Results "JSON 파일은 mock 저장용", account/pricing "mock 구매/업그레이드", health `MockProvider`, 생성 summary에 영어 enum("Product Promotion 업로드 패키지입니다" — 실측 응답에서 확인). 공개 베타 전 표현 정리 필요.

**M-03. `/diagnostics`가 전체 사용자 nav에 노출** — `NEXT_PUBLIC_ENABLE_DIAGNOSTICS`는 게이트가 아니라 상태 표시일 뿐(`lib/diagnostics/report.ts:69`). 내부 QA 도구·스토리지 키 목록이 일반 사용자에게 보임.

**M-04. 가격표와 실제 과금 불일치** — `lib/plans.ts:63-75`의 creditCosts(이미지 8, 영상 80~120 등)와 실제 차감(패키지 30크레딧만, Studio/Video/Export 무차감) 불일치. 유료 전환 시 오인 소지.

**M-05. 업로드 원본·WebM이 세션 메모리에만 존재** — 새로고침 시 Studio 배경·영상 Blob 소실(안내는 있음). 개인정보 측면 장점이지만 데이터 보존 기대와 어긋남. 공개 베타 고지 필요.

**M-06. 저장소 위생** — `PostKit_MVP_RC-0.2/0.3_source.zip`(각 300KB), `tsconfig.tsbuildinfo`가 Git 추적됨. `.gitignore`에 추가하고 이력에서 제거 권장.

**M-07. PWA manifest에 icons 없음** — `/manifest.webmanifest` 실측: name/theme 등만 있고 `icons` 필드 부재 → 설치 프롬프트·홈 화면 아이콘 불완전.

### Low

**L-01. ESLint 경고 12건** — 특히 `app/export/page.tsx:172`, `app/video-studio/page.tsx:177`의 의존성 누락은 objectURL 해제 타이밍 관련 잠재 결함. 나머지는 unused import 등.

**L-02. 더보기 메뉴에 `/settings` 중복 항목** — `components/AppShell.tsx:65,67` "브랜드"와 "설정"이 같은 경로.

**L-03. '전체 복사'에 체크리스트·섹션 라벨 포함** — 패키지 문서 형식으로는 의도된 동작이나, SNS 본문에 그대로 붙여넣는 사용자는 안내문이 섞임. "업로드용 복사"(share-ready)와의 차이를 UI에서 더 분명히.

**L-04. `OPENAI_MODEL` 미설정 시 조용히 mock 폴백** — 키만 설정한 운영자가 인지하기 어려움. 서버 시작 로그 또는 health 경고 권장.

**L-05. 영상 업로드 무검증** — `app/create/page.tsx:252` `video/*` 전부 허용, 크기 제한 없음. 미리보기 전용이라 실해 낮음.

---

## 출시 전 필수 수정 (무료 공개 베타 기준)

1. H-01 기본 플랜 Free화 + 워터마크 정책 일관화
2. H-03 Export placeholder PNG 제거 또는 실렌더 대체
3. M-02 사용자 노출 "mock"/영어 enum 문구 정리 (특히 결제 오인 방지)
4. M-03 diagnostics nav 숨김 (환경변수 게이트 실제 적용)
5. PNG/WebM/워터마크 실물 산출물 QA 1회 완료 (수동 브라우저로 가능)
6. (실제 AI를 켤 경우에만) H-02 rate limit·서버측 크레딧 검증

## 공개 베타 중 수정 가능

- M-01 hydration 초기화 방식 통일
- M-04 가격표·실차감 정합화
- M-05 세션 소실 UX 고지 강화 (IndexedDB 보존은 선택)
- M-06 저장소 위생, M-07 PWA 아이콘
- L-01~L-05 전반, 자동 테스트 도입(현재 0건)

## 장기 개선

- 인증·서버 DB·결제·서버 정책 강제 (유료 전환의 전제, C-01/C-02)
- 서버측 idempotency·원장 검증, 감사 로그
- 실제 AI 품질 파이프라인(이전 QA가 지적한 mock 문구 반복·어색한 조사 문제는 OpenAI 연결 + 후처리 검증으로 해결 예상)
- 오류 모니터링(Sentry 등) — 현재 프로덕션 관측 수단 0

## 불필요하거나 과도한 기능 (핵심 흐름 대비)

PostKit의 핵심은 "사진 → 업로드 패키지 → 내보내기"다. 다음은 핵심 흐름을 흐리는 후보:
- **캘린더/캠페인/알림/워크스페이스 멤버**: mock 상태의 팀 기능은 공개 베타에서 기대만 만들고 실효가 없음 → 숨김 후보 (Canva식 기능 나열보다 핵심 속도가 강점)
- **diagnostics/demo**: 내부 도구 → 숨김
- **크레딧 팩 구매 UI**: 결제 없는 상태에서는 혼란 유발 → 체험 플랜 전환 UI로 축소 권장
- 죽은 코드: `cloudRepository`(의도된 스텁 — 유지 가능), `lib/credits.ts` 레거시 래퍼(마이그레이션용 — 정리 시점 명시 권장), lint가 지적한 unused import 5건

## 미검증 항목 (NOT TESTED)

- 실제 브라우저 렌더링 전반: 콘솔 오류, hydration 실발생, 빈 화면, 무한 로딩
- 모바일 뷰포트 실측(가로 넘침·글자 깨짐·버튼 잘림·하단 메뉴 가림) — 코드에는 `pb-40`, `min-w-0`, `overflow-x-hidden` 등 대비가 있으나 실측 못함
- PNG/WebM 실물 파일 생성·열람·재생·프레임·길이
- 워터마크 실제 출력물 (Free/Creator Plus 플랜별)
- 복사·좋아요·히스토리 재열기 등 UI 버튼 상호작용
- PWA 설치 동작
- Vercel 실배포 (배포 설정 파일은 없으나 표준 Next 구조라 특이 리스크 없음)
- 자동 테스트: 존재하지 않아 실행 불가

## 최종 점수

| 영역 | 점수 | 비고 |
|---|---|---|
| 기능 안정성 | 78 / 100 | 정적 검증 전부 통과, 크레딧·중복 방지 로직 견고. 감점: 브라우저 실측 부재, hydration 위험, 테스트 0건 |
| 산출물 품질 | 60 / 100 | 텍스트 산출물 실측 양호. 감점: PNG/WebM 실물 미검증, Export placeholder, mock 문구 품질 한계(이전 QA 지적 유효) |
| 보안 | 62 / 100 | 키·XSS·로그 관리 우수. 감점: 정책 전부 클라이언트, API 무제한, 내부 도구 노출 |
| 운영 준비도 | 35 / 100 | 로그인·DB·결제·모니터링·테스트 부재. 문서(README/RUNBOOK)는 잘 갖춰짐 |
| 모바일 사용성 | 65 / 100 | 코드 수준 대응(터치 타깃, 하단 패딩, 줄바꿈 처리)은 성실. 실측 미완으로 상한 제한 |
| **전체 출시 준비도** | **58 / 100** | 포트폴리오 무조건 가능, 비공개/무료 베타 조건부, 유료 불가 |

---

*검수자: Claude (Fable 5) — 독립 검수, 코드 무수정, 외부 AI API 무호출. 2026-07-07.*
