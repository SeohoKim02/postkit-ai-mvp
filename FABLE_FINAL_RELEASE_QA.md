# PostKit 무료 공개 베타 최종 실물 QA 보고서 (FABLE_FINAL_RELEASE_QA)

이전 검수(`FABLE_RELEASE_AUDIT.md`)와 수정 보고(`FABLE_RELEASE_COMPLETION.md`)에서 유일하게 남아 있던
**PNG/WebM 실물 산출물 검증과 모바일 실측**을 실제 브라우저 자동화로 완료하고, 발견 문제를 수정·재검증한 최종 보고서다.

## 검증 환경

| 항목 | 값 |
|---|---|
| OS | Windows 11 Home 10.0.26200 |
| Node | v24.18.0 |
| 브라우저 | Microsoft Edge (headless=new) — **임시 프로필**(`qa-artifacts/fable-final/profile/*`), 사용자 기본 프로필 미접근 |
| 자동화 방식 | Chrome DevTools Protocol 직접 구동 (Node 내장 WebSocket, **외부 패키지 설치 0**) — 실제 마우스 이벤트·키 입력·파일 선택·다운로드 |
| 서버 | `next build` + `next start` (프로덕션 빌드, port 3100) |
| Git branch | fable-release-audit |
| 검증 날짜 | 2026-07-07 |
| 제약 준수 | 실제 OpenAI API 무호출, API 키 무생성, main 병합 없음, `.env` 미생성 |

증거물 위치(전부 gitignore): `qa-artifacts/fable-final/` — screenshots(95+ 페이지 캡처, 모바일 흐름), downloads(PNG/WebM/TXT/JSON 실물), video(프레임 캡처), *-report.json(단계별 로그), scripts(QA 드라이버).

## 1. 화면 스윕 — 5 viewport × 19 라우트 = 95개 조합 전부 PASS

- viewport: 360×800, 390×844, 412×915(모바일) / 1440×900, 1920×1080(데스크톱)
- 라우트: `/`, dashboard, create, results, studio, video-studio, export, history, calendar, campaign(→campaigns 리다이렉트), campaigns, account, settings, privacy, privacy-policy, terms, diagnostics, pricing, demo
- 전 조합에서: 콘솔 error 0, 페이지 예외(hydration 포함) 0, 실패 네트워크 요청 0, HTTP 4xx/5xx 0, **가로 스크롤 0**, 빈 화면 0
- `/diagnostics`는 게이트 비활성 안내 화면 표시(정상), `/api/ai/health` 200·비밀값 없음

## 2. 전체 사용자 흐름 실클릭 (시나리오 A/B/C)

### A. Instagram Feed · 흑백요리사 캐비어 (데스크톱 1440×900, 빈 임시 프로필) — PASS
첫 방문 온보딩(광고/제휴 계정) → 플랫폼 선택 전 하위 비활성 확인 → 플랫폼 선택 → 사진 업로드(미리보기 확인) → 권리 확인 4개 → 목적 "제품 홍보"·톤 "고급 브랜드형" → 입력 → **연속 2회 클릭 생성** → Results → 캡션 선택/개별 복사/전체 복사/좋아요/내 스타일 저장/보관함 → Studio 4개 크기 PNG 다운로드 → Export 개별 8종 + 전체 다운로드 + 콘텐츠 정보 JSON → History 재열기 → 새로고침 유지 → 개인정보 데이터 내보내기 JSON → 삭제 UI 확인 → 손상 localStorage 주입 후 정상 렌더.

- 결과 반영: 제품명·키워드 반영, purpose 한글 라벨, `mock`·`PostKit Preview` 문구 0
- 복사: 개별 복사에 UI 라벨 무혼입, 전체 복사(809자)에 체크리스트 미포함
- History 1건(중복 없음), 새로고침 후 유지

### B. Instagram Reels · 여름용 린넨 셔츠 (모바일 390×844) — PASS
Create→Results→복사→Studio PNG(1080×1920) 다운로드→Video Studio WebM(855KB) 생성·다운로드→Export 전체 저장→History. 가로 스크롤 0, 콘솔 오류 0, 하단 내비의 버튼 가림 없음(전 과정 실클릭 성공으로 검증 + 스크린샷 육안).

### C. Instagram Story · 카페 딸기라떼 (모바일 412×915) — PASS
Create→Results. 제품 반영·한글 라벨·mock 문구 0.

## 3. 크레딧·중복·환불 (실측)

| 항목 | 결과 |
|---|---|
| 생성 1회당 차감 | **PASS** — 300 → 270, `generation_debit` 정확히 1건 (연속 2회 클릭에도) |
| 새로고침 재차감 | PASS — 재방문·새로고침에서 추가 차감 없음 |
| 중복 환불 | PASS — 단위 테스트(같은 debit 2회 환불 시 2회째 거부) + requestId 환불 |
| 미완료 요청 자동 환불 | PASS — reconcile 연결 (2026-07-07 커밋 f008f5d) |
| 이상값 주입 | 잔액 999999 주입은 반영됨(알려진 C-02 한계 — 무료 베타에서 금전 가치 없음), 유료 플랜 문자열은 읽기 시 Free로 정규화 |
| rate limit | PASS — 분당 한도 소진 후 429 + Retry-After + 한국어 응답, 응답에 기술 정보 미노출 (f008f5d 실측 유지) |

## 4. PNG 실물 5종 — 전부 다운로드·열람·픽셀 검증 PASS

실제 버튼 클릭으로 다운로드 후 PNG signature·IHDR 픽셀 파싱 + 전수 육안 열람:

| 파일 | 픽셀 (기대=실측) | 확인 |
|---|---|---|
| postkit_instagram_feed_1080x1350_*.png | 1080×1350 ✓ | 제목·보조문구·CTA·#광고 표시·워터마크, 한글 정상 |
| postkit_instagram_feed_1080x1080_*.png | 1080×1080 ✓ | 〃 |
| postkit_instagram_story_1080x1920_*.png | 1080×1920 ✓ | **업로드 사진 실반영 육안 확인**, 잘림 없음 |
| postkit_youtube_thumbnail_1280x720_*.png | 1280×720 ✓ | 〃 |
| Export 기본 이미지 PNG (design_canvas) | 1080×1350 ✓ | placeholder 아님 — 실제 디자인 렌더 |

- `PostKit Preview`/`mock image` 문구 0, 0바이트 0, 비율 왜곡 0
- 미리보기(스크린샷)와 다운로드 결과 일치 육안 확인

## 5. WebM 실물 — 생성·다운로드·재생·프레임 PASS

| 항목 | 결과 |
|---|---|
| 5초 설정 | 실측 duration **4.95s**, 1080×1920, 614KB |
| 8초 설정 | 실측 duration **7.99s**, 1080×1920, 855KB |
| 다운로드 파일 재생 | 다운로드된 파일을 별도 video 요소에 로드 → `playing: true`, currentTime 진행 확인 |
| 프레임 | 시작/중간/끝 3프레임 × 2본 캡처(`qa-artifacts/fable-final/video/`) — 검은 화면 아님, **업로드 사진 반영**, 자막·CTA 잘림 없음, 전 구간 워터마크 |
| 생성 중 중복 클릭 | 진행 표시("WebM 생성 중") + 완료 후 다운로드 흐름 정상 |
| fallback | 미지원 브라우저 분기는 코드 확인(Edge/Chrome headless 모두 WebM 지원되어 실경로 미진입 — Edge 성공으로 정상 지원 판정) |
| 알려진 한계 | MediaRecorder WebM은 duration 메타데이터가 없어 일부 로컬 플레이어에서 길이 표시가 늦게 뜸(SNS 업로드는 서버 재인코딩으로 무관). 문서화만 진행 |

## 6. 무료 베타 워터마크 + 변조 방지 PASS

- 격리 임시 프로필에서 초기 무료 상태 PNG: "Made with PostKit" 우하단, CTA·본문·광고 표시와 안 겹침 (육안)
- localStorage에 **Creator Plus + active 주입 → 새로고침 → PNG 재생성: 워터마크 유지** (3케이스 바이트 동일 렌더)
- 임의 문자열 플랜("HACKED_PLAN_9999")·이상값에서도 유지
- 단위 테스트: `canRemoveWatermark` 전 케이스 false (26개 테스트 포함)
- Studio PNG·Export PNG·WebM 프레임 모두 표시 확인

## 7. TXT·JSON 실물 PASS

실버튼 다운로드 후 전수 검사: 캡션/해시태그/CTA/광고표시/전체 문구 TXT + 콘텐츠 정보 JSON + 개인정보 내보내기 JSON.
- 0바이트 0(썸네일 문구가 없는 플랫폼은 이번 수정으로 비활성 표시), UTF-8 한글 정상, JSON.parse 성공, 필수 필드 존재
- UI 라벨·내부 용어 무혼입, 파일명 규칙 `postkit_{platform}_{type}_{date}_{id}.ext` 준수
- Web Share: headless 미지원 환경 → fallback(문구 복사+플랫폼 열기) 경로는 코드·기존 검수 판정 유지

## 8. 보안·개인정보 최종 점검 PASS

- 프로덕션 번들(.next/static) 검색: `OPENAI_API_KEY`·`api.openai.com`·`sk-` **0건**
- 소스: `as any`/`@ts-ignore` 0, `console.*` 0, `dangerouslySetInnerHTML` 0
- 업로드 검증: 이미지 PNG/JPEG/WebP·15MB, 영상 MP4/WebM/MOV·100MB
- 손상 localStorage 3종 주입 → 오류 0·자가 복구, 데이터 내보내기/삭제 UI 동작
- git 추적: `.env`·zip·qa-artifacts 없음

## 9. 이번 QA에서 발견·수정한 문제 (전부 수정 후 재검증 완료)

| # | 심각도 | 문제 | 수정 |
|---|---|---|---|
| 1 | **High** | 보관 기간 기본값(저장 안 함)에서 `cleanupExpiredMockUploads`가 **생성 직후 즉시** 업로드 참조(assetId·파일명)를 제거 → 같은 세션에서 Studio/Video가 업로드 사진을 사용 못 함(산출물이 항상 기본 배경) | `lib/privacyStorage.ts` — none 정책에 24시간 작업 보호 유예, 정리 시 **만료 후보만** 대상(전체 무차별 제거 제거). 단위 테스트 3건 추가, 브라우저 재검증으로 사진 반영 확인 |
| 2 | Medium | 광고가 아닐 때 상태 문구 "광고/협찬 표시 없음"이 PNG·WebM 산출물에 그대로 새겨짐 + 영상은 빈 값일 때 브랜드 지침문 대입 | `designStorage`·`videoStorage` displayDisclosure 필터. 재생성 산출물에서 문구 부재 확인 |
| 3 | Medium | Export 텍스트 자산이 내용이 없어도 활성 → **0바이트 TXT 다운로드**(예: 피드의 썸네일 문구) | `exportUtils` — 빈 텍스트 자산은 사유와 함께 비활성 표시. 실측으로 스킵 확인 |
| 4 | Medium | Studio 파일명이 출력 크기를 구분하지 않아 세로/정사각 피드가 **같은 파일명으로 덮어씀** | `makeDesignFileName`에 `{width}x{height}` 포함. 4종 파일명 유니크 실측 |
| 5 | Low | Studio PNG 우하단 footer(브랜드명)가 textAlign 미설정으로 캔버스 밖으로 잘림 | `canvasRenderer` footer 우측 정렬. 재생성 육안 확인 |
| 6 | Low | 개인정보 내보내기 JSON note에 "PostKit mock localStorage export" 내부 문구 | 한국어 안내로 교체 |
| 7 | Low | 데모 시드 원장 설명에 "mock 구매" 잔존 | "데모 크레딧 지급 예시"로 교체 |

QA 인프라 이슈(제품 무관, 기록용): 좌표 클릭 유실 → 수신 검증+폴백 드라이버로 해결, SIGKILL 종료 시 localStorage 미flush → Browser.close 정상 종료로 해결. "5초 설정이 8초로 녹화" 의심은 드라이버 클릭 유실로 판명 — **제품 정상**.

## 10. 정적 검증 (수정 반영 후 최종)

| 명령 | 결과 |
|---|---|
| `npm run lint` | 오류 0 / 경고 0 |
| `npm run typecheck` | 오류 0 |
| `npm test` | **26/26 통과** (privacyStorage 3건 신규) |
| `npm run build` | 통과 (27 페이지) |

## 11. 남은 문제

- **Critical 0 / High 0 / 핵심 기능 Medium 0**
- Low·구조적(무료 베타 비차단, 문서화됨):
  - C-01/C-02: 인증·서버 DB·결제 부재, 정책 클라이언트 실행(크레딧 수치 변조 가능 — 금전 가치 없음). 유료 전환 전 서버 이관 필수
  - WebM duration 메타데이터 부재(MediaRecorder 특성) — SNS 업로드 무관
  - rate limit in-memory — 다중 인스턴스 배포 시 Redis 등 이관 필요
  - Android 실기기·iOS Safari 실측, PWA 설치, Vercel 실배포는 미수행(코드·헤드리스 Edge 기준 이상 없음)

## 12. OpenAI 연결 시 해야 할 정확한 작업

1. 서버 환경변수 설정: `AI_PROVIDER=openai`, `OPENAI_API_KEY` (`OPENAI_MODEL` 생략 시 gpt-4o-mini)
2. Preview 배포에서 `/api/ai/health` → `selectedProvider: "openai"` 확인 후 `/create` 실생성 1회
3. 배포 환경 `AI_RATE_LIMIT_PER_MINUTE/DAY` 값 검토(다중 인스턴스면 공유 저장소 rate limit 이관)
4. 서버측 크레딧 검증 설계(현재 클라이언트 전용 — H-02 후속), fallback 성공 시 차감 유지 정책 재검토
5. 개인정보 처리방침 사업자 정보 TODO 확정

## 13. 최종 판정

| 단계 | 판정 |
|---|---|
| **무료 공개 베타** | **출시 가능** — 실제 OpenAI API 연결만 남음. 출시 전 필수 조건(감사 문서 1~6번) 전부 실물 검증 완료 |
| 유료 상용 | 불가(구조적 — 기존 판정 유지) |

**전체 출시 준비도: 82 / 100** (검수 58 → 1차 수정 72 → 실물 검증·핵심 버그 수정 후 82)
- 기능 안정성 88 (전 흐름 실클릭 PASS, 테스트 26건) · 산출물 품질 85 (PNG 5종·WebM 2본 실물 PASS, 사진 반영 버그 수정) · 보안 72 (변조 방지 실증, 클라이언트 정책 한계 잔존) · 운영 준비도 48 (모니터링·서버 부재) · 모바일 사용성 85 (3개 viewport 실측 + 전체 흐름 2회)

---

*검증: Claude (Fable 5) — 2026-07-07. 임시 브라우저 프로필만 사용, 사용자 기본 프로필 미접근, 외부 패키지 미설치, 실제 OpenAI API 무호출, main 미병합.*
