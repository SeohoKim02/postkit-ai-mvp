# PostKit Backend Integration Guide

작성일: 2026-06-15

현재 PostKit은 실제 회원가입, 로그인, OAuth, 이메일 인증, 클라우드 데이터베이스, 파일 저장소, 여러 기기 동기화를 연결하지 않았습니다. 이번 v1은 localStorage 기반 앱을 유지하면서 향후 Supabase, Firebase, 자체 백엔드 등으로 전환하기 위한 계정과 데이터 저장 계층을 준비한 상태입니다.

## 현재 LocalRepository 구조

관련 파일:

- `lib/data/types.ts`
- `lib/data/localRepository.ts`
- `lib/data/cloudRepository.ts`
- `lib/data/repositoryRegistry.ts`
- `lib/data/migrations.ts`
- `lib/accountStorage.ts`

현재 실제 작동 저장소는 `LocalRepository`뿐입니다. `CloudRepository`는 인터페이스와 미구현 응답만 제공하며 네트워크 요청을 보내지 않습니다.

공통 기능:

- `get`
- `getAll`
- `set`
- `create`
- `update`
- `delete`
- `clear`
- `exportData`
- `importData`
- `migrate`

## CloudRepository 연결 위치

실제 백엔드를 연결할 때는 `lib/data/cloudRepository.ts`에 서버 API 호출 또는 SDK 호출을 구현하고 `lib/data/repositoryRegistry.ts`에서 active adapter 전환 정책을 바꿉니다.

주의:

- API 키와 service role key를 클라이언트 번들에 넣지 않습니다.
- 클라이언트는 서버 API 라우트 또는 인증된 SDK만 사용해야 합니다.
- userId와 workspaceId는 클라이언트 값만으로 신뢰하지 않습니다.
- 서버에서 세션, workspace role, row ownership을 검증해야 합니다.

## 사용자 인증

현재 mock 계정:

- 게스트 모드
- 브라우저 내부 테스트 계정
- 실제 비밀번호 없음
- 실제 인증 토큰 없음
- 실제 이메일 인증 없음

실제 전환 시 필요 항목:

- 서버 세션
- 로그인/로그아웃
- 이메일 인증 또는 OAuth
- 비밀번호 재설정 또는 magic link 정책
- 세션 만료와 refresh 정책
- 계정 삭제 요청 처리

`SESSION_SECRET`은 서버 전용 환경변수로만 사용해야 하며 localStorage나 클라이언트 코드에 저장하지 않습니다.

## Workspace와 권한 구조

현재 타입:

- `Workspace`
- `WorkspaceMember`
- `WorkspaceRole`
- `DataOwnership`

역할:

- `owner`: 모든 데이터 관리, 플랜 관리, 멤버 관리, 전체 삭제
- `admin`: 콘텐츠·캠페인·일정 관리, 일부 멤버 관리, 플랜 변경 불가
- `editor`: 콘텐츠 생성·수정·내보내기, 플랜과 멤버 관리 불가
- `viewer`: 보기와 다운로드만 가능

실제 운영에서는 모든 write/read API에서 서버 권한 검증이 필수입니다.

## 데이터베이스 테이블 후보

실제 SQL이나 DB 연결은 아직 없습니다. 후보 구조는 다음과 같습니다.

- `users`
- `profiles`
- `workspaces`
- `workspace_members`
- `subscriptions`
- `credit_accounts`
- `credit_ledger`
- `generated_contents`
- `content_history`
- `personalization_profiles`
- `design_projects`
- `campaigns`
- `content_schedules`
- `content_ideas`
- `notifications`
- `export_history`
- `ai_request_history`
- `privacy_preferences`
- `consent_records`
- `infringement_reports`
- `audit_logs`
- `sync_queue`

## 서버 기반 크레딧 원장

현재 크레딧은 localStorage mock 원장입니다. 실제 서비스에서는 다음을 서버에서 처리해야 합니다.

- 구독 상태 검증
- 결제 영수증 검증
- 월 크레딧 지급
- 이월/만료
- 콘텐츠 생성 차감
- 실패 환불
- idempotency key
- 중복 차감 방지
- 관리자 수동 조정

클라이언트의 `totalCreditBalance`, `userId`, `workspaceId`는 신뢰하지 않습니다.

## 이미지·영상 저장소

현재 원본 이미지 Blob과 생성 PNG Blob은 localStorage에 저장하지 않습니다. 브라우저 세션의 Object URL이나 Canvas Blob으로만 처리합니다.

실제 전환 시 필요 항목:

- 사용자별 파일 저장소
- workspace별 접근 권한
- 업로드 파일 검사
- 이미지/영상 변환 작업 큐
- 서명 URL 또는 접근 제어
- 삭제 요청 처리
- CDN 캐시 무효화

## 데이터 마이그레이션

현재 `runOwnershipMigration`은 기존 localStorage 데이터에 선택적 `userId`, `workspaceId`, `ownership` 필드를 붙입니다.

실제 서버 전환 순서:

1. localStorage export 생성
2. 사용자 인증 확인
3. workspace 생성 또는 선택
4. 데이터 스키마 검증
5. 민감정보와 시크릿 패턴 차단
6. 서버 transaction으로 import
7. 크레딧 원장 재계산
8. 파일 저장소 연결
9. import 결과와 실패 항목 보고

마이그레이션 실패 시 원본 localStorage 데이터를 삭제하지 않아야 합니다.

## 백업과 삭제

현재 Account 페이지는 JSON export/import와 전체 mock 데이터 삭제를 제공합니다.

실제 서비스 전환 시:

- 서버 데이터 export 비동기 작업
- 파일 저장소 포함 여부 선택
- 계정 삭제 대기 기간
- 법적 보관 대상 분리
- 감사 로그 보존 정책
- 백업 삭제 또는 익명화
- 삭제 완료 알림

## 동기화와 충돌 처리

현재 SyncQueue는 localStorage에만 기록되고 서버 요청을 보내지 않습니다.

초기 정책:

- 서버 시간이 없으므로 현재는 `localUpdatedAt` 기준
- 동일 데이터가 여러 기기에서 변경되면 `conflict` 상태
- 자동으로 한쪽을 삭제하지 않음
- 사용자가 로컬 버전 또는 클라우드 버전을 선택하는 UI를 향후 추가

실제 운영에서는 서버 revision, optimistic locking, updatedAt, deletedAt, conflict resolution UI가 필요합니다.

## 보안과 개인정보

필수 원칙:

- 비밀번호 localStorage 저장 금지
- 인증 토큰 localStorage 저장 금지
- API 키 localStorage 저장 금지
- 결제 카드 정보 저장 금지
- 민감한 원문을 감사 로그에 저장하지 않음
- 사용자 콘텐츠를 전체 AI 학습에 기본 사용하지 않음
- 개인정보 처리 위탁 및 국외 이전 검토
- 관리자 접근 감사 로그
- rate limit과 abuse detection
- 서버 권한 검증
- 저장 데이터 암호화 또는 필드 단위 보호 검토

## 환경변수 후보

`.env.example`에는 이름만 둡니다.

- `AUTH_PROVIDER`
- `DATABASE_URL`
- `STORAGE_PROVIDER`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

실제 값은 `.env.local` 또는 배포 플랫폼의 서버 환경변수에 둬야 하며 Git에 포함하지 않습니다.

## 실제 서비스 전환 순서 추천

1. 서버 인증과 세션 도입
2. workspace/member 서버 권한 검증
3. credit account와 credit ledger 서버 이전
4. generated content와 history 서버 저장
5. personalization profile 서버 저장
6. 파일 저장소와 이미지/영상 asset 연결
7. sync queue 서버 처리
8. import/export 서버 작업화
9. 개인정보 삭제와 감사 로그 운영 정책 확정
10. 실제 결제, 실제 AI API, SNS OAuth/API를 순차 연결

## 현재 제한

- 실제 네트워크 요청 없음
- 실제 회원가입 없음
- 실제 로그인 없음
- 실제 클라우드 저장 없음
- 실제 여러 기기 동기화 없음
- 실제 팀 초대 이메일 없음
- 실제 서버 권한 검증 없음
- 실행 검증은 아직 완료되지 않았고 정적 검토 기준으로 작성됨
