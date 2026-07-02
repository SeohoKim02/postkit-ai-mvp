"use client";

import { designOutputPresets, designTemplates } from "@/lib/designTemplates";
import { getDesignProjects } from "@/lib/designStorage";
import { getBrowserCapabilities } from "@/lib/diagnostics/browserChecks";
import type { DiagnosticCheck } from "@/types";

function check(input: Omit<DiagnosticCheck, "category">): DiagnosticCheck {
  return { category: "Studio·Canvas 상태", ...input };
}

export function getStudioDiagnostics(): DiagnosticCheck[] {
  const capabilities = getBrowserCapabilities();
  const canvas = capabilities.find((item) => item.id === "canvas");
  const toBlob = capabilities.find((item) => item.id === "canvasToBlob");
  const projects = getDesignProjects();
  const templateIds = new Set(designTemplates.map((item) => item.id));
  const outputIds = new Set(designOutputPresets.map((item) => item.id));
  const invalidTemplate = projects.filter((project) => !templateIds.has(project.templateId));
  const invalidOutput = projects.filter((project) => !outputIds.has(project.outputPresetId));
  const invalidSize = projects.filter((project) => project.width <= 0 || project.height <= 0 || !Number.isFinite(project.width) || !Number.isFinite(project.height));
  const invalidZoom = projects.filter((project) => project.imageSettings.scale <= 0 || project.imageSettings.scale > 3);
  const invalidPosition = projects.filter((project) => Math.abs(project.imageSettings.offsetX) > 100 || Math.abs(project.imageSettings.offsetY) > 100);

  return [
    check({
      id: "studio-canvas",
      label: "Canvas API",
      status: canvas?.supported ? "정상" : "미지원",
      code: canvas?.supported ? "CANVAS_SUPPORTED" : "CANVAS_UNSUPPORTED",
      message: canvas?.supported ? "Canvas 2D 렌더링을 사용할 수 있습니다." : "이 브라우저에서는 Studio PNG 생성이 제한될 수 있습니다."
    }),
    check({
      id: "studio-to-blob",
      label: "canvas.toBlob",
      status: toBlob?.supported ? "정상" : "미지원",
      code: toBlob?.supported ? "CANVAS_TO_BLOB_SUPPORTED" : "CANVAS_TO_BLOB_UNSUPPORTED",
      message: toBlob?.supported ? "Canvas 결과를 PNG Blob으로 변환할 수 있습니다." : "PNG 다운로드가 제한될 수 있습니다."
    }),
    check({
      id: "studio-template-count",
      label: "디자인 템플릿",
      status: designTemplates.length > 0 ? "정상" : "오류",
      code: designTemplates.length > 0 ? "DESIGN_TEMPLATES_PRESENT" : "DESIGN_TEMPLATES_MISSING",
      message: `디자인 템플릿 ${designTemplates.length}개, 출력 프리셋 ${designOutputPresets.length}개가 등록되어 있습니다.`
    }),
    check({
      id: "studio-project-count",
      label: "저장된 DesignProject",
      status: projects.length > 0 ? "정상" : "실행 전",
      code: projects.length > 0 ? "DESIGN_PROJECTS_PRESENT" : "DESIGN_PROJECTS_EMPTY",
      message: `저장된 디자인 프로젝트 ${projects.length}개가 있습니다.`
    }),
    check({
      id: "studio-invalid-template",
      label: "templateId",
      status: invalidTemplate.length === 0 ? "정상" : "확인 필요",
      code: invalidTemplate.length === 0 ? "DESIGN_TEMPLATE_REFERENCES_OK" : "DESIGN_TEMPLATE_REFERENCE_MISSING",
      message: invalidTemplate.length === 0 ? "존재하지 않는 templateId 참조가 없습니다." : `존재하지 않는 templateId를 참조하는 디자인 ${invalidTemplate.length}개가 있습니다.`
    }),
    check({
      id: "studio-invalid-output",
      label: "outputPresetId",
      status: invalidOutput.length === 0 ? "정상" : "확인 필요",
      code: invalidOutput.length === 0 ? "DESIGN_OUTPUT_REFERENCES_OK" : "DESIGN_OUTPUT_REFERENCE_MISSING",
      message: invalidOutput.length === 0 ? "존재하지 않는 outputPresetId 참조가 없습니다." : `존재하지 않는 outputPresetId를 참조하는 디자인 ${invalidOutput.length}개가 있습니다.`
    }),
    check({
      id: "studio-invalid-values",
      label: "디자인 설정 범위",
      status: invalidSize.length + invalidZoom.length + invalidPosition.length === 0 ? "정상" : "확인 필요",
      code: invalidSize.length + invalidZoom.length + invalidPosition.length === 0 ? "DESIGN_VALUES_OK" : "DESIGN_VALUES_OUT_OF_RANGE",
      message: invalidSize.length + invalidZoom.length + invalidPosition.length === 0
        ? "크기, 확대, 위치 값이 v1 허용 범위 안에 있습니다."
        : `크기/확대/위치 값 확인이 필요한 디자인 ${invalidSize.length + invalidZoom.length + invalidPosition.length}개가 있습니다.`
    })
  ];
}
