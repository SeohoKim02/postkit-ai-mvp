# PostKit AI Integration Guide

작성일: 2026-06-15

현재 PostKit은 외부 생성형 AI API를 호출하지 않습니다. 기본 공급자는 `MockProvider`이며, 기존 `lib/mockAi.ts` 결과를 서버 API 라우트 뒤에서 호출합니다. 이 문서는 향후 실제 AI 공급자를 서버 측에 안전하게 연결하기 위한 기준입니다.

## 현재 구조

- 공통 타입: `lib/ai/types.ts`
- 프롬프트 빌더: `lib/ai/promptBuilder.ts`
- 입력/출력 검증: `lib/ai/validation.ts`
- 공급자 실행 래퍼: `lib/ai/provider.ts`
- 공급자 등록: `lib/ai/providerRegistry.ts`
- mock 공급자: `lib/ai/mockProvider.ts`
- 클라이언트 호출 래퍼: `lib/ai/client.ts`
- AI 요청 기록: `lib/ai/requestStorage.ts`

API 라우트:

- `POST /api/ai/generate-text`
- `POST /api/ai/recommend-design`
- `GET /api/ai/health`

## 지원 작업 유형

- `caption_generation`
- `hashtag_generation`
- `cta_generation`
- `hook_generation`
- `thumbnail_text_generation`
- `disclosure_generation`
- `content_summary`
- `design_recommendation`
- `future_image_generation`
- `future_video_generation`

현재 `future_image_generation`, `future_video_generation`은 인터페이스 예약용이며 MockProvider는 지원하지 않습니다.

## 실제 공급자 연결 위치

새 공급자는 `lib/ai/provider.ts`의 `AiProvider` 인터페이스를 구현하고 `lib/ai/providerRegistry.ts`에 등록합니다. Create, Results, Studio UI는 공급자를 직접 import하지 않고 내부 API 라우트 또는 `lib/ai/client.ts`를 통해서만 호출해야 합니다.

## API 키 보관 원칙

실제 API 키는 반드시 서버 환경변수에만 둡니다.

- 클라이언트 코드에 API 키를 넣지 않습니다.
- localStorage에 API 키를 저장하지 않습니다.
- 브라우저 번들에 공급자 SDK 키가 포함되지 않게 합니다.
- `.env.local`은 만들 수 있지만 Git에 커밋하지 않습니다.
- `.env.example`에는 이름만 둡니다.

예상 환경변수:

- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_TEXT_MODEL`
- `AI_IMAGE_MODEL`
- `AI_REQUEST_TIMEOUT_MS`

## 요청 구조

클라이언트는 `AiGenerateTextRequest`를 서버 라우트에 전달합니다.

포함 항목:

- `requestId`
- `idempotencyKey`
- `input`
- `brandProfile`
- `personalizationProfile`
- `taskTypes`
- `allowSafeRetry`

프롬프트 빌더는 원본 사진, 영상, 전체 History, 개인정보 원문을 프롬프트 문자열에 넣지 않습니다. 플랫폼, 목적, 브랜드명, 제품명, 말투, 선호 스타일, 필수/금지 문구, 광고 표시 방식, 캠페인 요약 등 생성에 필요한 최소 필드만 사용합니다.

## 응답 구조

응답은 자유 텍스트가 아니라 `AiStructuredResult`와 `GeneratedPackage`로 정규화합니다.

- `captions`
- `hashtags`
- `ctas`
- `hooks`
- `thumbnailTexts`
- `disclosureText`
- `summary`
- `recommendedTemplateId`
- `personalizationExplanation`
- `warnings`
- `modelMetadata`

필드가 누락되거나 배열이 비어 있으면 기본값과 검증 함수로 앱 중단을 막습니다.

## 크레딧 차감과 환불

현재 정책:

1. 입력 검증
2. 중복 요청 확인
3. 잔액 확인
4. AI 요청 기록 시작
5. 업로드 패키지 30 크레딧 차감
6. `/api/ai/generate-text` 호출
7. 결과 저장 및 History 연결
8. 실패 시 동일 차감 원장 기준 1회 환불

프롬프트 빌드, 입력 검증, 잔액 부족 단계에서는 크레딧을 차감하지 않습니다. Studio 편집, PNG 다운로드, TXT/JSON 다운로드, SNS 내보내기는 추가 크레딧을 차감하지 않습니다.

## 중복 방지

`requestId`는 개별 실행 식별자이고, `idempotencyKey`는 같은 입력이 빠르게 반복 제출되는 것을 막는 키입니다. 현재 mock 단계에서는 localStorage의 `postkit-ai-request-history`에서 최근 실행 중인 같은 키를 확인합니다. 실제 운영에서는 서버 DB와 원장 트랜잭션에서 idempotency를 보장해야 합니다.

## 개인정보 최소화

- 원본 사진과 영상은 AI 요청에 포함하지 않습니다.
- 주민등록번호, 계좌번호, 신분증, 건강 정보 등 민감정보는 업로드 전 안내만 제공하며 mock 단계에서는 자동 탐지하지 않습니다.
- 개인화 프로필 전체가 아니라 필요한 요약 필드만 사용합니다.
- 전체 History는 프롬프트에 넣지 않습니다.
- AI 사용 기록에는 요청 ID, 작업 유형, 공급자, 상태, 크레딧 비용, 성공 여부, fallback 여부 정도만 저장합니다.
- 원문 프롬프트, 생성 결과 전문, 업로드 파일 내용은 AI 감사 기록에 저장하지 않습니다.
- 사용자 콘텐츠는 기본적으로 서비스 전체 모델 학습에 사용하지 않습니다.

## 오류 코드

- `INVALID_INPUT`
- `INSUFFICIENT_CREDITS`
- `DUPLICATE_REQUEST`
- `GENERATION_FAILED`
- `PROVIDER_UNAVAILABLE`
- `OUTPUT_VALIDATION_FAILED`
- `PRIVACY_RESTRICTION`
- `UNSUPPORTED_TASK`
- `UNKNOWN_ERROR`

UI에는 위 코드를 그대로 노출하지 않고 한국어 사용자 메시지를 표시합니다.

## 운영 전 TODO

- 서버 인증 필요
- 사용자별 rate limit 필요
- 서버 기반 크레딧 원장과 idempotency 트랜잭션 필요
- 실제 결제 영수증 검증 필요
- AI 공급자별 비용 계산과 사용량 모니터링 필요
- 이미지·영상 저장소와 접근권한 설계 필요
- 개인정보 처리 위탁·국외 이전 검토 필요
- 생성 콘텐츠 안전성 검사 필요
- 관리자 신고·차단 기능 필요
- 공급자 장애 시 fallback 정책과 알림 필요
- 이미지·영상 생성 공급자 연결 시 별도 크레딧 정책 필요

## 현재 제한

- 실제 외부 AI API 호출 없음
- 실제 이미지/영상 AI 생성 없음
- 실제 안전성 분류 모델 없음
- 실제 서버 인증 없음
- 실제 서버 원장 트랜잭션 없음
- 실행 검증은 아직 완료되지 않았고 정적 검토 기준으로 작성됨
