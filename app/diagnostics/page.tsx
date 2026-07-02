"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FlaskConical,
  RefreshCw,
  Route,
  ShieldAlert,
  Trash2,
  Wrench
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { exportAccountData } from "@/lib/accountStorage";
import { downloadJsonFile, downloadTextFile } from "@/lib/downloadUtils";
import {
  createDiagnosticReport,
  clearDiagnosticHistory,
  getQaChecklist,
  resetQaChecklist,
  runDiagnostics,
  updateQaChecklistItem
} from "@/lib/diagnostics/report";
import {
  cleanDanglingReferences,
  createStorageRepairProposals,
  exportStorageKeyData,
  resetStorageKeyToDefault
} from "@/lib/diagnostics/storageChecks";
import { diagnosticCategories, managedRoutes } from "@/lib/diagnostics/types";
import { createDemoData, countDemoData, deleteDemoDataOnly, getDemoManifest, hasExistingPostKitData } from "@/lib/demo/demoStorage";
import type { DiagnosticCheck, DiagnosticResult, DiagnosticStatus, QaChecklistItem, RepairProposal } from "@/types";

const statusTone: Record<DiagnosticStatus, "mint" | "lemon" | "coral" | "sky"> = {
  정상: "mint",
  "확인 필요": "lemon",
  오류: "coral",
  미지원: "lemon",
  미구현: "sky",
  "실행 전": "sky"
};

const statusIcon: Record<DiagnosticStatus, typeof CheckCircle2> = {
  정상: CheckCircle2,
  "확인 필요": AlertTriangle,
  오류: ShieldAlert,
  미지원: AlertTriangle,
  미구현: Wrench,
  "실행 전": RefreshCw
};

function CheckRow({ check }: { check: DiagnosticCheck }) {
  const Icon = statusIcon[check.status];

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[check.status]}>
              <Icon size={13} aria-hidden="true" />
              {check.status}
            </Badge>
            <p className="font-black">{check.label}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{check.message}</p>
          {check.fix ? <p className="mt-1 text-xs font-bold text-coral">{check.fix}</p> : null}
        </div>
        <code className="shrink-0 rounded-md bg-wash px-2 py-1 text-xs font-bold text-muted">{check.code}</code>
      </div>
      {check.route ? (
        <Link className="mt-3 inline-flex text-sm font-bold text-coral hover:underline" href={check.route}>
          이동하기
        </Link>
      ) : null}
    </div>
  );
}

export default function DiagnosticsPage() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [qaItems, setQaItems] = useState<QaChecklistItem[]>([]);
  const [demoCount, setDemoCount] = useState(0);
  const [demoConfirm, setDemoConfirm] = useState<"merge" | "replace" | null>(null);

  useEffect(() => {
    setResult(runDiagnostics("light"));
    setQaItems(getQaChecklist());
    setDemoCount(countDemoData());
  }, []);

  const grouped = useMemo(() => {
    const checks = result?.checks ?? [];
    return diagnosticCategories.map((category) => ({
      category,
      checks: checks.filter((check) => check.category === category)
    }));
  }, [result]);

  const repairProposals = useMemo<RepairProposal[]>(() => (result ? createStorageRepairProposals(result.checks) : []), [result]);
  const manifest = getDemoManifest();
  const existingData = hasExistingPostKitData();

  function flash(nextMessage: string) {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2600);
  }

  function runFullDiagnostics() {
    setRunning(true);
    setProgress(12);
    window.setTimeout(() => {
      setProgress(58);
      const next = runDiagnostics("full");
      setResult(next);
      setQaItems(getQaChecklist());
      setProgress(100);
      setRunning(false);
      flash("전체 진단을 완료했어요. 자동 삭제나 자동 수정은 하지 않았습니다.");
    }, 60);
  }

  function downloadReport(kind: "json" | "txt") {
    if (!result) return;
    const report = createDiagnosticReport(result);
    if (kind === "json") {
      downloadJsonFile(`postkit_diagnostic_report_${Date.now()}.json`, report);
    } else {
      const lines = [
        `PostKit Diagnostic Report`,
        `generatedAt: ${report.generatedAt}`,
        `errors: ${report.errorCount}`,
        `warnings: ${report.warningCount}`,
        `accountMode: ${report.currentAccountMode}`,
        "",
        ...report.unresolvedChecks.map((check) => `[${check.status}] ${check.category} / ${check.code} / ${check.message}`)
      ];
      downloadTextFile(`postkit_diagnostic_report_${Date.now()}.txt`, lines.join("\n"));
    }
    flash("진단 보고서를 다운로드했어요. 캡션 원문, 이미지, 이메일, 토큰은 포함하지 않았습니다.");
  }

  function handleRepair(proposal: RepairProposal) {
    if (proposal.action === "clean_refs") {
      if (!window.confirm("연결되지 않은 참조만 정리할까요? 먼저 전체 계정 데이터 백업 JSON을 다운로드합니다.")) return;
      downloadJsonFile(`postkit_backup_before_clean_refs_${Date.now()}.json`, exportAccountData());
      const cleaned = cleanDanglingReferences();
      setResult(runDiagnostics("full"));
      flash(cleaned.message);
      return;
    }

    if (proposal.action === "reset_default") {
      if (!window.confirm(`${proposal.targetKey}를 기본값으로 복구할까요? 먼저 해당 키 백업 JSON을 다운로드합니다.`)) return;
      downloadJsonFile(`postkit_backup_${proposal.targetKey}_${Date.now()}.json`, exportStorageKeyData(proposal.targetKey));
      const reset = resetStorageKeyToDefault(proposal.targetKey);
      setResult(runDiagnostics("full"));
      flash(reset.message);
    }
  }

  function installDemo(mode: "merge" | "replace") {
    if (mode === "replace") {
      downloadJsonFile(`postkit_backup_before_demo_replace_${Date.now()}.json`, exportAccountData());
    }
    const created = createDemoData(mode);
    setDemoConfirm(null);
    setDemoCount(countDemoData());
    setResult(runDiagnostics("full"));
    flash(created.message);
  }

  function handleDeleteDemo() {
    if (!window.confirm(`데모 표시가 있는 항목 ${demoCount}개만 삭제할까요? 실제 사용자 데이터는 삭제하지 않습니다.`)) return;
    const deleted = deleteDemoDataOnly();
    setDemoCount(countDemoData());
    setResult(runDiagnostics("full"));
    flash(deleted.message);
  }

  function handleQaChange(id: string, checked: boolean) {
    const next = updateQaChecklistItem(id, checked);
    setQaItems(next);
    setResult(runDiagnostics("light"));
  }

  function resetDiagnosticsOnly() {
    clearDiagnosticHistory();
    const reset = resetQaChecklist();
    setQaItems(reset);
    setResult(null);
    flash("진단 기록과 QA 체크리스트만 초기화했어요. 사용자 콘텐츠는 삭제하지 않았습니다.");
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={running} onClick={runFullDiagnostics} type="button">
              <RefreshCw size={17} aria-hidden="true" />
              전체 진단 실행
            </Button>
            <LinkButton href="/demo" variant="secondary">
              <FlaskConical size={17} aria-hidden="true" />
              데모 흐름 보기
            </LinkButton>
          </div>
        }
        description="브라우저 기능, localStorage 무결성, 크레딧, 계정, AI mock, Studio, 내보내기, 개인정보 상태를 한 화면에서 빠르게 점검합니다."
        eyebrow="Diagnostics"
        title="진단센터"
      />

      {message ? (
        <div className="mt-5 rounded-lg border border-mint/40 bg-aqua p-3 text-sm font-bold text-emerald-700">{message}</div>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {result
          ? Object.entries(result.summary).map(([status, count]) => {
              const typedStatus = status as DiagnosticStatus;
              return (
                <Card className="p-4" key={status}>
                  <Badge tone={statusTone[typedStatus]}>{status}</Badge>
                  <p className="mt-3 text-3xl font-black">{count}</p>
                </Card>
              );
            })
          : null}
      </div>

      {running ? (
        <Card className="mt-5">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>전체 진단 실행 중</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-wash">
            <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Card>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">데모 데이터</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                샘플 데이터는 `demo: true` 또는 `source: demo` 표시가 있는 항목으로 저장됩니다. 기존 데이터가 있으면 기본 선택은 취소입니다.
              </p>
              <p className="mt-2 text-sm font-bold text-muted">현재 데모 항목 {demoCount.toLocaleString()}개 · manifest {manifest ? "있음" : "없음"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDemoConfirm("merge")} type="button" variant="secondary">데모 추가</Button>
              <Button onClick={() => setDemoConfirm("replace")} type="button" variant="danger">백업 후 교체</Button>
              <Button disabled={demoCount === 0} onClick={handleDeleteDemo} type="button" variant="ghost">
                <Trash2 size={16} aria-hidden="true" />
                데모만 삭제
              </Button>
            </div>
          </div>
          {demoConfirm ? (
            <div className="mt-4 rounded-lg border border-lemon/40 bg-yellow-50 p-4">
              <p className="font-black text-yellow-900">
                {demoConfirm === "replace" ? "현재 데이터를 백업한 뒤 데모 데이터로 교체합니다." : "현재 데이터를 유지하고 데모 데이터를 추가합니다."}
              </p>
              <p className="mt-2 text-sm leading-6 text-yellow-800">
                {existingData ? "기존 PostKit 데이터가 있습니다. 취소가 기본 선택입니다." : "현재 기존 데이터가 거의 없는 상태로 보입니다."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => installDemo(demoConfirm)} type="button" variant={demoConfirm === "replace" ? "danger" : "secondary"}>
                  진행
                </Button>
                <Button onClick={() => setDemoConfirm(null)} type="button" variant="ghost">취소</Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-black">보고서와 초기화</h2>
          <p className="mt-2 text-sm leading-6 text-muted">보고서에는 원문 캡션, 이미지, 이메일, API 키, 토큰, 결제정보, 전체 localStorage 원문을 포함하지 않습니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!result} onClick={() => downloadReport("json")} type="button" variant="secondary">
              <FileJson size={16} aria-hidden="true" />
              JSON 보고서
            </Button>
            <Button disabled={!result} onClick={() => downloadReport("txt")} type="button" variant="secondary">
              <Download size={16} aria-hidden="true" />
              TXT 보고서
            </Button>
            <Button onClick={resetDiagnosticsOnly} type="button" variant="ghost">진단 결과 초기화</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <Database className="mt-1 text-coral" size={22} aria-hidden="true" />
          <div>
            <h2 className="text-lg font-black">복구 제안</h2>
            <p className="mt-1 text-sm leading-6 text-muted">복구는 자동 실행되지 않습니다. 실행 전 백업 JSON을 다운로드합니다.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {repairProposals.length > 0 ? (
            repairProposals.map((proposal) => (
              <div className="rounded-lg border border-line bg-white p-3" key={proposal.id}>
                <Badge tone={proposal.riskLevel === "high" ? "coral" : "lemon"}>{proposal.riskLevel}</Badge>
                <p className="mt-2 font-black">{proposal.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{proposal.description}</p>
                <Button className="mt-3" onClick={() => handleRepair(proposal)} type="button" variant={proposal.riskLevel === "high" ? "danger" : "secondary"}>
                  복구 실행
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-wash p-4 text-sm font-bold text-muted">전체 진단 후 복구 제안이 필요한 경우 여기에 표시됩니다.</p>
          )}
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="text-lg font-black">관리 라우트</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {managedRoutes.map((route) => (
            <Link className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold hover:border-coral/50 hover:bg-blush/40" href={route.path} key={route.path}>
              <Route size={15} aria-hidden="true" />
              {route.label}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="text-lg font-black">전체 QA 체크리스트</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {qaItems.map((item) => (
            <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-bold" key={item.id}>
              <input checked={item.checked} className="mt-1 h-4 w-4" onChange={(event) => handleQaChange(item.id, event.target.checked)} type="checkbox" />
              <span>
                <span className="block text-ink">{item.label}</span>
                <span className="block text-xs text-muted">{item.category}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5">
        {grouped.map((group) => (
          <Card key={group.category}>
            <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black">{group.category}</h2>
              <Badge tone="sky">{group.checks.length}개 항목</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {group.checks.length > 0 ? group.checks.map((check) => <CheckRow check={check} key={check.id} />) : <p className="rounded-lg bg-wash p-3 text-sm font-bold text-muted">아직 실행된 진단 항목이 없습니다.</p>}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
