import { Scale } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const sections = [
  {
    title: "서비스 목적",
    body: "PostKit은 사용자가 업로드한 사진·영상 자료와 입력 정보를 바탕으로 SNS 업로드 전 문구 패키지, 내보내기 자료, 일정·캠페인 관리 화면을 제공하는 도구입니다."
  },
  {
    title: "계정 책임",
    body: "사용자는 본인의 계정, 입력 정보, 업로드 자료, 생성 결과 사용에 대한 책임을 부담합니다. 실제 계정 인증과 결제 기능은 아직 구현되어 있지 않습니다."
  },
  {
    title: "업로드 콘텐츠 권리",
    body: "사용자는 업로드 콘텐츠를 직접 제작했거나 사용할 권한이 있어야 하며, 필요한 인물 동의와 권리 허락을 확보해야 합니다. 사용자는 원본 콘텐츠 권리를 계속 보유합니다."
  },
  {
    title: "금지 콘텐츠",
    body: "타인의 저작권, 초상권, 상표권을 침해하는 콘텐츠, 불법 콘텐츠, 민감 개인정보가 포함된 자료, 미성년자 개인정보가 포함된 자료는 업로드하지 않도록 안내합니다."
  },
  {
    title: "AI 생성 결과의 특성",
    body: "AI 또는 mock 생성 결과는 오류, 중복 표현, 권리 문제, 플랫폼 정책 위반 가능성이 있을 수 있습니다. 독점적 저작권이나 상업적 안전성이 항상 보장되는 것은 아닙니다."
  },
  {
    title: "광고·협찬 표시 책임",
    body: "제품 제공, 원고료, 제휴 링크, 할인코드, 공동구매 등 경제적 이해관계가 있는 게시물은 사용자가 관련 기준과 광고주 요청사항을 최종 확인해야 합니다."
  },
  {
    title: "신고와 삭제",
    body: "권리 침해 신고 및 삭제 요청 UI는 mock 상태로 제공됩니다. 실제 운영 전 접수, 검토, 임시조치, 이의제기, 기록 보존 절차가 필요합니다."
  },
  {
    title: "서비스 제한",
    body: "불법적 사용, 권리 침해, 시스템 악용, 허위 신고, 보안 위협이 있는 경우 서비스 이용 제한 정책을 둘 수 있습니다. 구체 기준은 운영 전 확정해야 합니다."
  },
  {
    title: "면책 범위",
    body: "PostKit의 안전장치는 사용자가 최종 게시 전 점검하도록 돕는 기능이며, 법률 준수나 권리 안전성을 완전히 보장하지 않습니다. 실제 면책 조항은 법률 검토가 필요합니다."
  }
];

export default function TermsPage() {
  return (
    <AppShell>
      <PageHeader
        action={<Badge tone="lemon">법률 검토 필요</Badge>}
        description="서비스 목적, 콘텐츠 권리, 광고·협찬 책임을 정리한 이용약관 초안입니다."
        eyebrow="Draft Terms"
        title="이용약관 초안"
      />

      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <Scale size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black">초안 안내</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              이 페이지는 MVP 검토용 약관 초안 UI입니다. 실제 서비스 출시 전 사업자 정보, 이용 제한 기준, 신고 절차, 책임 범위는 법률 검토를 통해 확정해야 합니다.
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
