"use client";

import { getVideoSupportStatus } from "@/lib/video/videoUtils";
import type { DiagnosticCheck } from "@/types";

export function getVideoDiagnostics(): DiagnosticCheck[] {
  const support = getVideoSupportStatus();

  return [
    {
      id: "video-route",
      category: "Video Studio 상태",
      label: "Video Studio 라우트",
      status: "정상",
      code: "VIDEO_STUDIO_ROUTE_DECLARED",
      message: "/video-studio 라우트가 등록되어 있습니다. 실제 HTTP 순회는 실행하지 않았습니다.",
      route: "/video-studio"
    },
    {
      id: "video-canvas-capture-stream",
      category: "Video Studio 상태",
      label: "canvas.captureStream",
      status: support.captureStream ? "정상" : "미지원",
      code: support.captureStream ? "VIDEO_CAPTURE_STREAM_SUPPORTED" : "VIDEO_CAPTURE_STREAM_UNSUPPORTED",
      message: support.captureStream
        ? "Canvas 프레임을 영상 스트림으로 캡처할 수 있습니다."
        : "영상 생성은 미지원입니다. PNG 이미지 세트와 문구 패키지 fallback은 사용할 수 있습니다."
    },
    {
      id: "video-media-recorder",
      category: "Video Studio 상태",
      label: "MediaRecorder",
      status: support.mediaRecorder ? "정상" : "미지원",
      code: support.mediaRecorder ? "MEDIA_RECORDER_SUPPORTED" : "MEDIA_RECORDER_UNSUPPORTED",
      message: support.mediaRecorder
        ? "브라우저 내부에서 WebM 녹화를 시도할 수 있습니다."
        : "MediaRecorder가 없어 WebM 다운로드는 만들 수 없고 fallback 내보내기를 사용합니다."
    },
    {
      id: "video-webm-mime",
      category: "Video Studio 상태",
      label: "WebM mimeType",
      status: support.webm ? "정상" : "미지원",
      code: support.webm ? "WEBM_MIME_SUPPORTED" : "WEBM_MIME_UNSUPPORTED",
      message: support.webm
        ? "video/webm mimeType을 지원합니다."
        : "MP4 또는 WebM 인코딩 지원이 제한적입니다. v1은 WebM 기본 출력만 제공합니다."
    },
    {
      id: "video-blob-create",
      category: "Video Studio 상태",
      label: "video Blob 생성 가능성",
      status: support.supported ? "정상" : "미지원",
      code: support.supported ? "VIDEO_BLOB_READY" : "VIDEO_BLOB_FALLBACK_READY",
      message: support.supported
        ? "영상 Blob 생성 조건을 충족합니다. 생성된 Blob은 localStorage에 저장하지 않습니다."
        : "영상 Blob 생성 조건이 부족합니다. 앱 전체 오류가 아니라 이미지/문구 내보내기 fallback 상태입니다."
    },
    {
      id: "video-duration-guard",
      category: "Video Studio 상태",
      label: "긴 영상 생성 주의",
      status: "정상",
      code: "VIDEO_DURATION_LIMIT_15S",
      message: "v1은 브라우저 성능을 위해 5초, 8초, 10초, 15초만 지원하고 15초 초과 생성을 막습니다."
    },
    {
      id: "video-mp4-guide",
      category: "Video Studio 상태",
      label: "MP4 미지원 안내",
      status: "미구현",
      code: "MP4_SERVER_PROCESSING_FUTURE",
      message: "외부 패키지 없이 브라우저 MP4 인코딩은 제한적이므로 v1은 WebM을 기본으로 제공하고 MP4는 향후 서버 영상 처리 기능으로 안내합니다."
    }
  ];
}
