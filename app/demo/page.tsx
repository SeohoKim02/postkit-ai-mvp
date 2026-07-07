"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, FlaskConical, Image as ImageIcon, ListChecks, Video, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createDemoData, getDemoManifest, hasExistingPostKitData, prefillDemoCreate } from "@/lib/demo/demoStorage";

const steps = [
  { id: "account", label: "샘플 계정 확인", href: "/account" },
  { id: "campaign", label: "샘플 캠페인 선택", href: "/campaigns" },
  { id: "create", label: "Create 입력 자동 채우기", href: "/create" },
  { id: "results", label: "샘플 콘텐츠 결과 확인", href: "/results" },
  { id: "studio", label: "Studio 디자인 열기", href: "/studio" },
  { id: "png", label: "PNG 생성 준비", href: "/studio" },
  { id: "video", label: "Video Studio 열기", href: "/video-studio" },
  { id: "webm", label: "WebM 생성 가능 여부 확인", href: "/video-studio" },
  { id: "export", label: "Export Center 이동", href: "/export" },
  { id: "history", label: "History 저장 확인", href: "/history" },
  { id: "calendar", label: "Calendar 일정 확인", href: "/calendar" }
];

export default function DemoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [manifestReady, setManifestReady] = useState(false);

  useEffect(() => {
    setManifestReady(Boolean(getDemoManifest()));
  }, []);

  function flash(nextMessage: string) {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2200);
  }

  function ensureDemoData() {
    if (!manifestReady && hasExistingPostKitData()) {
      const confirmed = window.confirm("기존 PostKit 데이터가 있습니다. 현재 데이터를 유지하고 데모 데이터를 추가할까요? 취소가 기본 선택입니다. 백업 후 교체는 진단센터에서 실행할 수 있습니다.");
      if (!confirmed) {
        flash("데모 데이터 생성을 취소했습니다.");
        return false;
      }
    }

    const created = createDemoData("merge");
    setManifestReady(Boolean(created.manifest));
    flash(created.message);
    return Boolean(created.ok);
  }

  function goCurrentStep() {
    if (!manifestReady) {
      const ready = ensureDemoData();
      if (!ready) return;
    }

    const current = steps[step];
    if (current.id === "create" || current.id === "video" || current.id === "webm") {
      prefillDemoCreate();
      flash("데모 입력값과 샘플 결과를 불러왔어요. 이 흐름은 실제 사용자 크레딧을 차감하지 않는 샘플 prefill입니다.");
    }
    if (current.id === "results") {
      prefillDemoCreate();
    }
    router.push(current.href);
  }

  function nextStep() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={ensureDemoData} type="button">
              <FlaskConical size={17} aria-hidden="true" />
              데모 데이터 준비
            </Button>
            <LinkButton href="/diagnostics" variant="secondary">
              <ListChecks size={17} aria-hidden="true" />
              진단센터
            </LinkButton>
          </div>
        }
        description="샘플 데이터로 계정, 캠페인, Create, Results, Studio, Export, History, Calendar 흐름을 빠르게 둘러봅니다."
        eyebrow="Demo Mode"
        title="PostKit 데모 흐름"
      />

      {message ? <div className="mt-5 rounded-lg border border-mint/30 bg-aqua p-3 text-sm font-bold text-emerald-700">{message}</div> : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <Badge tone={manifestReady ? "mint" : "lemon"}>{manifestReady ? "데모 데이터 준비됨" : "데모 데이터 없음"}</Badge>
          <h2 className="mt-4 text-xl font-black">데모 전용 안내</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            이 페이지는 실제 AI, 결제, SNS API를 호출하지 않습니다. 데모 데이터는 `demo: true`로 표시되고, 데모 prefill과 샘플 결과는 실제 사용자 크레딧을 차감하지 않습니다.
          </p>
          <div className="mt-5 rounded-lg border border-lemon/40 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
            실제 생성 버튼을 Create에서 직접 누르면 기존 정책대로 크레딧 차감 흐름을 사용합니다. 데모에서는 샘플 결과 확인과 이동 흐름 QA에 집중하세요.
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <WandSparkles size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black">현재 단계</h2>
              <p className="mt-1 text-2xl font-black text-coral">{step + 1}. {steps[step].label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">각 단계에서 실제 페이지로 이동해 UI와 저장 흐름을 확인할 수 있습니다.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={goCurrentStep} type="button">
              {steps[step].id === "video" || steps[step].id === "webm" ? <Video size={17} aria-hidden="true" /> : <ImageIcon size={17} aria-hidden="true" />}
              현재 단계 열기
            </Button>
            <Button disabled={step >= steps.length - 1} onClick={nextStep} type="button" variant="secondary">
              다음 단계
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-lg font-black">데모 흐름 체크</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {steps.map((item, index) => (
            <button
              className={`rounded-lg border p-4 text-left transition ${
                index === step ? "border-coral bg-blush text-coral" : "border-line bg-white hover:border-coral/40"
              }`}
              key={item.id}
              onClick={() => setStep(index)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} aria-hidden="true" />
                <span className="font-black">{index + 1}. {item.label}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{item.href}</p>
            </button>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
