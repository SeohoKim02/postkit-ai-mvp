# PostKit 무료 공개 베타 완성 보고서 (FABLE_RELEASE_COMPLETION)

`FABLE_RELEASE_AUDIT.md`(2026-07-07 독립 검수)가 지적한 무료 공개 베타 출시 조건을 수정한 결과 보고서다.
작업 브랜치: `fable-release-audit` (main 병합 안 함). 선행 커밋 `d99ee01`(part 1)과 이번 커밋(part 2)을 합친 상태 기준이다.

## 제약 준수

- 실제 OpenAI API 호출 없음. API 키 생성·입력 없음. `.env` 파일 생성 없음.
- `AI_PROVIDER=mock` 기본값에서 전 기능 동작. OpenAIProvider 구조는 그대로 유지(연결만 남음).
- 외부 패키지 추가 없음(테스트는 node:test 내장 러너 사용).

## 검수 지적사항 처리 결과

### Critical

| 항목 | 처리 | 내용 |
|---|---|---|
| C-01 인증·서버 DB·결제 미구현 | **범위 외 (구조적)** | 무료 베타 차단 사유 아님. 유료 전환 전 선결 조건으로 문서에 유지 |
| C-02 정책의 클라이언트 실행 | **완화** | 워터마크 베타 전원 적용(플랜 무관), mock 결제·업그레이드 UI 전면 제거로 "우회해서 얻을 유료 가치" 자체를 없앰. 서버 강제는 유료 전환 시 선결 조건으로 유지 |

### High — 전부 해결

| 항목 | 처리 | 내용 |
|---|---|---|
| H-01 기본 플랜 Starter → 워터마크 미적용 | **해결 (part 1)** | 기본·마이그레이션 플랜 Free 강제(`lib/plans.ts`, `creditLedger.ts`, `creditStorage.ts`), `canRemoveWatermark` 베타 기간 항상 false. 자동 테스트로 검증(저장된 유료 플랜 값도 Free로 정규화됨 확인) |
| H-02 AI API rate limit 부재 | **해결** | `lib/server/rateLimit.ts` 신규: IP 기준 분당(기본 10)·일일(기본 200) 한도, `AI_RATE_LIMIT_PER_MINUTE/DAY` 환경변수로 조정. generate-text·recommend-design 라우트 적용, 429 + `Retry-After` + 한국어 안내. **실측: 분당 한도 소진 후 429 확인.** 한계: in-memory라 다중 인스턴스 배포 시 인스턴스별 계산(코드 주석·README에 명시, 상용 전 Redis 이관 필요) |
| H-03 Export placeholder PNG | **해결** | `createMockPreviewBlob`/`downloadMockPreview` 삭제, `mock_preview` 소스 타입 제거. Studio 디자인이 없으면 `createDefaultDesignProject`로 기본 템플릿을 만들어 프리셋 원본 크기(1080×1350 등)로 `renderDesignToBlob` 실렌더. UI에 "기본 템플릿 디자인 PNG 사용 중" 표시 |

### Medium

| 항목 | 처리 | 내용 |
|---|---|---|
| M-01 hydration 불일치 위험 | **해결** | create·dashboard의 `useState` 초기값 localStorage 접근 제거(`CreditAccount \| null` + mount 로드, privacyPreferences는 SSR-안전 기본값). CreditMeter nullable 대응 |
| M-02 사용자 노출 "mock"·영어 enum | **해결** | results/privacy/settings/demo/약관/처리방침의 mock 문구 전면 정리, provider displayName·health 메시지 한글화, `purposeLabels` 한글 맵 신설 후 create/results/export/calendar/studio/video-studio/생성 summary 적용(실측: summary "제품 홍보 업로드 패키지") |
| M-03 /diagnostics 노출 | **해결** | 페이지·내비 모두 `NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true` 게이트. 미설정 빌드에서 비활성화 안내만 표시(실측 확인) |
| M-04 가격표·실차감 불일치 | **해결 (part 1)** | `creditCosts`를 실제 차감 항목만으로 재작성(패키지 30, 나머지 0·베타 무료) |
| M-05 업로드 원본·WebM 세션 메모리 | **유지 (의도)** | 개인정보 최소화 설계. Export/Studio에 재생성 안내 문구 존재. 공개 베타 허용 범위로 판단 |
| M-06 저장소 위생 | **해결** | 소스 zip 2개·`tsconfig.tsbuildinfo` git 추적 해제 + `.gitignore` 등록 |
| M-07 PWA manifest icons | **해결** | `app/icon.svg` 신규(파비콘 겸용), manifest `icons`(any/maskable) 연결. 실측: manifest 응답에 icons 포함 |

### Low — 전부 해결

| 항목 | 처리 | 내용 |
|---|---|---|
| L-01 ESLint 경고 12건 | **해결** | 경고 0건. objectURL 관련 exhaustive-deps는 의존성 정정(blob 포함, 파생 키 제거), unused args 제거, lucide `Image` 아이콘 alt 오탐은 `ImageIcon` 리네임, blob 미리보기 `<img>`는 사유 주석과 함께 예외 처리 |
| L-02 더보기 메뉴 /settings 중복 | **해결** | "브랜드 설정" 단일 항목으로 통합, "크레딧"→"플랜" |
| L-03 전체 복사에 체크리스트 혼입 | **해결** | results `composePackage`에서 체크리스트 섹션 제외(체크리스트는 화면·개별 복사로만 제공) |
| L-04 OPENAI_MODEL 미설정 시 조용한 mock 폴백 | **해결** | 기본 모델 `gpt-4o-mini` 지정 — 키만 설정해도 openai provider 선택 가능. `.env.example`·README에 명시 |
| L-05 영상 업로드 무검증 | **해결** | MP4/WebM/MOV 형식 + 100MB 제한 검증, `accept` 속성 축소, 한국어 오류 안내 |

### 추가 수정 (검수 이후 발견 항목 포함)

- mock 생성 disclosure에 브랜드 "표시 지침문"(`#광고 또는 #협찬을 첫 문장에 표시`)이 게시용 문구에 이어 붙던 문제 제거(`lib/mockAi.ts` disclosureText). 실측: `#광고 | 브랜드와 함께 만든 콘텐츠입니다.`만 출력.
- create 마운트 시 `reconcileStaleAiRequests` → `refundGenerationCreditsByRequestId` 연결: 새로고침으로 완료 콜백이 끊긴 생성 요청의 차감 크레딧 자동 환불(part 1에서 함수만 추가돼 있던 것을 실제 연결).
- 크레딧 문구 전면 "체험 크레딧"화(create/dashboard/CreditMeter), "추가 크레딧 구매" 버튼 제거 → "플랜 안내 보기".
- 사용하지 않는 `downloadAllAvailableAssets` 데드 코드 제거.

## 자동 테스트 (신규, 이전 0건 → 23건)

`npm test` = `node --import ./tests/register.mjs --test "tests/**/*.test.ts"` (node:test 내장 러너, 외부 패키지 없음, `@/` alias 로더 훅 포함)

| 파일 | 검증 내용 |
|---|---|
| tests/creditStorage.test.ts | Free 300 초기화, 유료 플랜 저장값의 Free 정규화, 차감→환불 복구, **중복 환불 차단**, requestId 환불, 잔액 초과 차감 거부 |
| tests/watermarkPolicy.test.ts | Free·유료 상태·무인자 호출 전부 워터마크 적용(베타 정책) |
| tests/exportUtils.test.ts | 파일명 규칙 `postkit_{platform}_{type}_{date}_{id}.ext`, 이미지 자산 design_canvas 소스·placeholder 부재, 텍스트 원문 무혼입, 메타데이터 outputSize |
| tests/validation.test.ts | 입력 검증 통과/거부, idempotency 키 결정성 |
| tests/rateLimit.test.ts | 분당/일일 한도, IP·라우트별 독립 버킷, 한국어 안내 |

결과: **23/23 통과.**

## 회귀 검증 결과 (전부 실측)

| 항목 | 결과 |
|---|---|
| `npm run lint` | 오류 0, **경고 0** (검수 시점 12 → 0) |
| `npm run typecheck` | 오류 0 |
| `npm run build` | 통과 — 정적 26페이지 + `/icon.svg` + 동적 API 3개, First Load JS 공유 102kB |
| `npm test` | 23/23 통과 |
| 프로덕션 서버(`next start`) 라우트 20개 | 전부 200 (`/`~`/demo`, manifest, icon.svg) |
| `/api/ai/health` | `selectedProvider: mock`, `openaiConfigured: false`, 한글 메시지, 비밀값 없음 |
| `/api/ai/generate-text` 실호출 | 200, 한글 정상, summary 한글 라벨, disclosure 지침문 혼입 없음, `#광고` 표시 정상 |
| `/api/ai/recommend-design` 실호출 | 200, 템플릿 추천 정상 |
| 잘못된 요청 | JSON 아님 400, requestId 누락 400 (스택 트레이스 없음) |
| rate limit | 분당 한도 소진 후 **429 + `Retry-After` + 한국어 응답** 실측 |
| `/diagnostics` (게이트 미설정 빌드) | "진단센터를 사용할 수 없어요" 비활성화 화면 실측 |
| TXT/JSON 실물 산출물 | `exportUtils`로 7개 파일 생성(`qa-artifacts/fable-completion/`) — UTF-8 한글 정상, 0바이트 없음, 파일명 규칙 준수 |
| 페이지 렌더링 스크린샷 | 헤드리스 Edge로 dashboard/create/export/pricing/results/account 6장 캡처(`qa-artifacts/fable-completion/screenshots/`) — 빈 화면·크래시 없음, 온보딩 모달 정상, pricing에 "준비 중"·"예정" 표시와 결제 UI 부재 확인 |

## 미검증 항목 (정직한 한계)

- **Canvas PNG·WebM 실물 다운로드 파일**: PARTIAL. 렌더 경로 코드·타입·테스트는 검증했고 페이지 렌더링 스크린샷까지 확보했지만, 실제 버튼 클릭으로 생성되는 PNG/WebM 파일의 열람·재생 검증은 브라우저 자동화 도구 부재로 이번에도 수행하지 못했다. **수동 브라우저 QA 1회가 남은 유일한 출시 조건이다** (Studio PNG 1장 + Export 기본 템플릿 PNG 1장 + Video WebM 1개 + 워터마크 육안 확인).
- 모바일 뷰포트 실측, PWA 설치 동작, Vercel 실배포: 미수행 (코드 수준 대비는 검수 문서 판단 유지).
- rate limit은 단일 인스턴스 기준. serverless 다중 인스턴스 배포 시 공유 저장소 이관 전까지 한도가 느슨해질 수 있음(비용 통제는 mock 단계라 무해).

## 수정 파일 (44개 변경: +851 / -321)

- **신규**: `lib/server/rateLimit.ts`, `app/icon.svg`, `tests/`(register.mjs, helpers.ts, 테스트 5개, package.json)
- **API**: `app/api/ai/generate-text/route.ts`, `app/api/ai/recommend-design/route.ts`
- **페이지**: create, dashboard, export, results, calendar, studio, video-studio, demo, diagnostics, privacy, privacy-policy, settings, terms
- **컴포넌트**: AppShell(내비 정리·진단 게이트), CreditMeter(nullable·체험 크레딧)
- **lib**: constants(purposeLabels), mockProvider, openaiProvider(기본 모델), mockAi(disclosure), exportUtils, downloadUtils, cloudRepository
- **기타**: types/index.ts(mock_preview 제거), manifest.ts(icons), package.json(test), tsconfig.json, .env.example, .gitignore, README.md, zip·tsbuildinfo 추적 해제

## 갱신 점수 (검수 기준 대비)

| 영역 | 검수 시 | 현재 | 근거 |
|---|---|---|---|
| 기능 안정성 | 78 | **85** | hydration 위험 제거, 미완료 요청 자동 환불 연결, 자동 테스트 23건, lint 경고 0. 감점 유지: 브라우저 인터랙션 실측 부재 |
| 산출물 품질 | 60 | **72** | placeholder 제거·프리셋 원치수 실렌더, 지침문 혼입 제거, TXT/JSON 실물 재검증. 감점 유지: PNG/WebM 실물 미검증 |
| 보안 | 62 | **70** | rate limit 실측, 내부 도구 게이트, mock 결제 표면 제거. 감점 유지: 정책 클라이언트 실행(무료 베타에선 실해 없음) |
| 운영 준비도 | 35 | **45** | 테스트 도입, 저장소 위생, 문서 정합화. 감점 유지: 로그인·DB·모니터링 부재 |
| 모바일 사용성 | 65 | **65** | 코드 변화 없음, 실측 미완 유지 |
| **전체 출시 준비도** | **58** | **72** | **무료 공개 베타: PNG/WebM 수동 QA 1회만 남음.** 유료 상용: 여전히 불가(구조적) |

## 남은 출시 전 작업

1. (필수) 수동 브라우저 QA 1회: Studio PNG·Export 기본 템플릿 PNG·Video WebM 실물 생성/열람/워터마크 확인 — 자동화 도구 없이 사람이 5~10분이면 가능.
2. (권장) 개인정보 처리방침의 사업자 정보 TODO 확정, 배포 환경에서 `AI_RATE_LIMIT_*` 값 검토.
3. (OpenAI 연결 시) 서버측 크레딧 검증 설계(H-02 후속), fallback 성공 시 차감 유지 정책 재검토.

---

*작성: Claude (Fable 5) — 2026-07-07. 실제 OpenAI API 무호출, API 키 무생성, fable-release-audit 브랜치에서만 작업.*
