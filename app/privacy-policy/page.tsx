import { FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const sections = [
  {
    title: "처리 목적",
    body: "PostKit은 SNS 업로드 패키지 생성, 개인 맞춤 설정 반영, 크레딧 원장 관리, History·내보내기·캘린더·캠페인 기능 제공을 목적으로 데이터를 처리하는 초안 구조를 가집니다."
  },
  {
    title: "수집 항목",
    body: "브랜드/프로필 설정, 생성 입력값, 생성 결과, 복사·수정·저장 행동, 크레딧 원장, 내보내기 기록, 캠페인·일정 데이터, 권리 침해 신고 내용이 포함될 수 있습니다. 비밀번호, SNS 로그인 정보, API 키는 저장하지 않습니다."
  },
  {
    title: "보유 기간",
    body: "무료 공개 베타 기간에는 모든 데이터가 사용 중인 브라우저(localStorage)에만 저장되며, 사용자가 삭제하거나 설정한 보관 기간에 따라 정리됩니다. 서버 저장으로 전환할 때 데이터 유형별 보유 기간과 파기 기준을 다시 안내합니다."
  },
  {
    title: "개인정보 처리 위탁",
    body: "현재 MVP에서는 외부 위탁 처리가 없습니다. 향후 AI API, 클라우드 저장소, 결제, 이메일 발송 등을 연결할 경우 위탁사, 목적, 보유 기간을 별도로 고지해야 합니다."
  },
  {
    title: "국외 이전",
    body: "현재 MVP에서는 국외 이전이 없습니다. 외부 AI 또는 클라우드 서비스를 사용할 경우 이전 국가, 이전 항목, 보유 기간, 보호조치를 검토해야 합니다."
  },
  {
    title: "파기 방법",
    body: "localStorage 데이터 삭제, 업로드 파일 참조 정리, 개인 맞춤 학습 데이터 초기화 기능을 제공합니다. 실제 서버 운영 시 백업, 로그, 원장 보존 정책과 삭제 검증 절차가 필요합니다."
  },
  {
    title: "정보주체의 권리",
    body: "사용자는 개인정보 보호센터에서 데이터 내보내기, 삭제, 개인 맞춤 학습 중지, 신고 요청을 할 수 있습니다. 모든 처리는 이 브라우저에 저장된 데이터를 대상으로 하며, 서버 운영 전환 전 열람·정정·삭제·처리정지 절차를 확정해 다시 안내합니다."
  },
  {
    title: "안전성 확보조치",
    body: "현재는 외부 전송 없는 브라우저 저장 구조입니다. 운영 전 접근 권한 관리, 전송·저장 암호화, 감사 로그, 침해 대응, 취약점 점검이 필요합니다."
  },
  {
    title: "개인정보 보호 문의",
    body: "사업자명: TODO, 개인정보 보호책임자: TODO, 이메일: TODO, 주소: TODO. 임의 정보를 넣지 않았으며 실제 출시 전 확정해야 합니다."
  },
  {
    title: "처리방침 변경 내역",
    body: "v0.2 무료 공개 베타 기준: 개인정보 보호센터, 삭제·내보내기, 감사 기록, 권리 침해 신고 화면을 기준으로 작성되었습니다."
  }
];

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <PageHeader
        action={<Badge tone="lemon">법률 검토 필요</Badge>}
        description="실제 사업자 정보와 운영 정책을 확정하기 전의 개인정보 처리방침 초안입니다."
        eyebrow="Draft Policy"
        title="개인정보 처리방침 초안"
      />

      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky/10 text-sky">
            <FileText size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black">초안 안내</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              이 페이지는 PostKit MVP의 개인정보 보호 구조를 설명하기 위한 초안 UI입니다. 실제 법률 준수를 보장하지 않으며, 출시 전 변호사 또는 개인정보 보호 전문가의 검토가 필요합니다.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-black">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{section.body}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
