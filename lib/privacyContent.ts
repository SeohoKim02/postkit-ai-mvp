import type { CommercialRelationshipType, RetentionOption } from "@/types";
import { PRIVACY_STORAGE_KEYS } from "@/lib/storageKeys";

export const privacyDataInventory = [
  {
    name: "브랜드/프로필 설정",
    purpose: "생성 결과의 말투, 플랫폼, 금지 문구를 맞추기 위해 사용",
    storage: "브라우저 localStorage",
    retention: "사용자가 삭제하거나 초기화할 때까지",
    externalTransfer: "없음",
    personalizationUse: "개인 맞춤 결과 생성에 사용"
  },
  {
    name: "생성 결과와 히스토리",
    purpose: "결과 다시 보기, 복사, 내보내기, 캠페인 연결",
    storage: "브라우저 localStorage",
    retention: "콘텐츠 자동 저장 설정이 켜진 경우 사용자가 삭제할 때까지",
    externalTransfer: "없음",
    personalizationUse: "사용자가 선택·복사·수정한 행동만 개인 맞춤에 약하게 반영"
  },
  {
    name: "Studio 디자인 설정",
    purpose: "Canvas PNG를 다시 만들기 위한 템플릿, 문구, 색상, 위치 설정 저장",
    storage: "브라우저 localStorage. 실제 이미지 Blob은 저장하지 않음",
    retention: "생성 결과 또는 전체 계정 데이터를 삭제할 때까지",
    externalTransfer: "없음",
    personalizationUse: "템플릿과 플랫폼 선호를 간접적으로 참고"
  },
  {
    name: "크레딧 계정과 원장",
    purpose: "mock 크레딧 잔액, 사용, 환불, 플랜 변경 기록",
    storage: "브라우저 localStorage",
    retention: "계정 데이터 삭제 전까지",
    externalTransfer: "없음",
    personalizationUse: "사용하지 않음"
  },
  {
    name: "캘린더·캠페인·아이디어",
    purpose: "게시 일정, 광고·제휴 조건, 필수 결과물 관리",
    storage: "브라우저 localStorage",
    retention: "사용자가 삭제할 때까지",
    externalTransfer: "없음",
    personalizationUse: "플랫폼과 게시 시간 선호를 약하게 반영"
  },
  {
    name: "업로드 파일 미리보기",
    purpose: "생성 전 미리보기와 Studio Canvas 합성에 사용",
    storage: "브라우저 메모리의 object URL",
    retention: "현재 브라우저 세션 동안 유지되며 새 파일 선택, 명시적 해제, 세션 종료 시 정리",
    externalTransfer: "없음",
    personalizationUse: "사용하지 않음"
  }
];

export const rightsConfirmationItems = [
  {
    id: "own_or_licensed",
    label: "내가 직접 제작했거나 사용할 권한이 있습니다."
  },
  {
    id: "people_consent",
    label: "사진·영상 속 인물에게 필요한 동의를 받았습니다."
  },
  {
    id: "no_rights_infringement",
    label: "타인의 저작권, 초상권, 상표권을 침해하지 않습니다."
  },
  {
    id: "lawful_content",
    label: "불법적이거나 권리를 침해하는 콘텐츠를 올리지 않습니다."
  }
];

export const sensitiveInfoItems = [
  "주민등록번호",
  "계좌번호",
  "신분증",
  "건강·의료 정보",
  "상세 주소",
  "타인의 연락처",
  "미성년자 개인정보"
];

export const commercialRelationshipOptions: Array<{ label: string; value: CommercialRelationshipType }> = [
  { label: "해당 없음", value: "none" },
  { label: "제품 제공", value: "제품 제공" },
  { label: "원고료", value: "원고료" },
  { label: "제휴 링크", value: "제휴 링크" },
  { label: "할인코드", value: "할인코드" },
  { label: "공동구매", value: "공동구매" },
  { label: "자체 제품", value: "자체 제품" }
];

export const retentionOptions: Array<{ label: string; value: RetentionOption; detail: string }> = [
  { label: "원본 파일 저장 안 함", value: "none", detail: "mock 단계 기본값입니다." },
  { label: "7일", value: "7d", detail: "7일이 지난 원본 파일을 정리 대상으로 표시합니다." },
  { label: "30일", value: "30d", detail: "30일이 지난 원본 파일을 정리 대상으로 표시합니다." },
  { label: "90일", value: "90d", detail: "90일이 지난 원본 파일을 정리 대상으로 표시합니다." },
  { label: "사용자가 삭제할 때까지", value: "until_deleted", detail: "자동 정리 대상에 포함하지 않습니다." }
];

export const privacyStorageKeys = [...PRIVACY_STORAGE_KEYS];
