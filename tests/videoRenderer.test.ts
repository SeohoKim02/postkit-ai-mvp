import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { drawVideoFrameToCanvas, renderVideoToWebM } from "@/lib/video/videoRenderer";
import type { VideoRenderSettings } from "@/types";

type TextMetricLike = { width: number };
type RecordedContext = {
  fillTextCalls: string[];
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  globalAlpha: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetY: number;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  beginPath: () => void;
  clearRect: () => void;
  closePath: () => void;
  createLinearGradient: () => { addColorStop: () => void };
  drawImage: () => void;
  ellipse: () => void;
  fill: () => void;
  fillRect: () => void;
  fillText: (text: string) => void;
  lineTo: () => void;
  measureText: (text: string) => TextMetricLike;
  moveTo: () => void;
  quadraticCurveTo: () => void;
  restore: () => void;
  save: () => void;
};

type FakeTrack = { stopCount: number; stop: () => void };
type FakeStream = { track: FakeTrack; getTracks: () => FakeTrack[] };

function makeSettings(overrides: Partial<VideoRenderSettings> = {}): VideoRenderSettings {
  return {
    platform: "Instagram Reels",
    width: 1080,
    height: 1920,
    durationSeconds: 5,
    frameRate: 24,
    transitionType: "none",
    textPosition: "bottom",
    overlayStyle: "soft-dark",
    imageMotion: "none",
    overlayOpacity: 0.38,
    titleMaxLines: 2,
    showTitle: true,
    showCTA: true,
    showBrandName: true,
    showDisclosure: true,
    primaryColor: "#ff6b4a",
    secondaryColor: "#edf9f6",
    brandStyleSnapshot: {
      brandName: "PostKit QA",
      mood: "밝고 정돈된 피드",
      voice: "친근함",
      primaryColor: "#ff6b4a",
      secondaryColor: "#edf9f6",
      disclosureStyle: ""
    },
    text: {
      title: "긴제목긴제목긴제목긴제목긴제목긴제목",
      hook: "후킹 문구",
      productName: "테스트 제품",
      cta: "확인하기",
      brandName: "QA Brand",
      disclosure: "광고 아님",
      discountCode: ""
    },
    ...overrides
  };
}

function makeContext(): RecordedContext {
  const context: RecordedContext = {
    fillTextCalls: [],
    fillStyle: "#000000",
    font: "16px sans-serif",
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: "",
    shadowOffsetY: 0,
    textAlign: "left",
    textBaseline: "top",
    beginPath: () => undefined,
    clearRect: () => undefined,
    closePath: () => undefined,
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    drawImage: () => undefined,
    ellipse: () => undefined,
    fill: () => undefined,
    fillRect: () => undefined,
    fillText(text: string) {
      context.fillTextCalls.push(text);
    },
    lineTo: () => undefined,
    measureText(text: string) {
      const sizeMatch = /(\d+)px/.exec(context.font);
      const size = sizeMatch ? Number(sizeMatch[1]) : 16;
      return { width: Array.from(text).length * size * 0.48 };
    },
    moveTo: () => undefined,
    quadraticCurveTo: () => undefined,
    restore: () => undefined,
    save: () => undefined
  };
  return context;
}

function makeCanvas(context = makeContext(), stream?: FakeStream) {
  return {
    width: 0,
    height: 0,
    getContext: () => context as unknown as CanvasRenderingContext2D,
    captureStream: () => stream as unknown as MediaStream
  } as unknown as HTMLCanvasElement;
}

function installBrowserRenderStubs() {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
  const stream: FakeStream = {
    track: {
      stopCount: 0,
      stop() {
        this.stopCount += 1;
      }
    },
    getTracks() {
      return [this.track];
    }
  };

  class FakeMediaRecorder {
    static startCount = 0;
    static stopCount = 0;
    static isTypeSupported(mimeType: string) {
      return mimeType.startsWith("video/webm");
    }

    state: RecordingState = "inactive";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onerror: (() => void) | null = null;
    onstop: (() => void) | null = null;
    mediaStream: FakeStream;
    options: { mimeType?: string };

    constructor(mediaStream: FakeStream, options: { mimeType?: string }) {
      this.mediaStream = mediaStream;
      this.options = options;
    }

    start() {
      this.state = "recording";
      FakeMediaRecorder.startCount += 1;
    }

    stop() {
      if (this.state === "inactive") return;
      this.state = "inactive";
      FakeMediaRecorder.stopCount += 1;
      setTimeout(() => {
        this.ondataavailable?.({ data: new Blob(["webm-data"], { type: "video/webm" }) });
        this.onstop?.();
      }, 0);
    }
  }

  let nextTimestamp = 0;
  let nextRafId = 0;
  const rafIds = new Set<number>();
  const storage = {
    getItem: () => null,
    removeItem: () => undefined,
    setItem: () => undefined
  };
  const fakeWindow = {
    localStorage: storage,
    requestAnimationFrame(callback: FrameRequestCallback) {
      const id = ++nextRafId;
      rafIds.add(id);
      nextTimestamp += 6000;
      window.setTimeout(() => {
        if (rafIds.has(id)) callback(nextTimestamp);
      }, 0);
      return id;
    },
    cancelAnimationFrame(id: number) {
      rafIds.delete(id);
    },
    setTimeout
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => {
        assert.equal(tagName, "canvas");
        return makeCanvas(makeContext(), stream);
      }
    }
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });

  return {
    FakeMediaRecorder,
    stream,
    restore() {
      if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
      else Reflect.deleteProperty(globalThis, "document");
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
      else Reflect.deleteProperty(globalThis, "window");
      if (originalMediaRecorder) Object.defineProperty(globalThis, "MediaRecorder", originalMediaRecorder);
      else Reflect.deleteProperty(globalThis, "MediaRecorder");
    }
  };
}

describe("videoRenderer WebM lifecycle", () => {
  it("영상 생성 요청 1회당 MediaRecorder start/stop과 stream stop을 각 1회 실행한다", async () => {
    const stubs = installBrowserRenderStubs();
    try {
      const result = await renderVideoToWebM({ settings: makeSettings(), imageUrls: [] });

      assert.equal(result.ok, true, JSON.stringify({ error: result.error, fallbackUsed: result.fallbackUsed }));
      assert.equal(result.mimeType, "video/webm");
      assert.ok(result.blob && result.blob.size > 0);
      assert.equal(stubs.FakeMediaRecorder.startCount, 1);
      assert.equal(stubs.FakeMediaRecorder.stopCount, 1);
      assert.equal(stubs.stream.track.stopCount, 1);
    } finally {
      stubs.restore();
    }
  });

  it("생성 취소 시 MediaRecorder와 stream을 종료하고 실패 결과를 반환한다", async () => {
    const stubs = installBrowserRenderStubs();
    try {
      const controller = new AbortController();
      const promise = renderVideoToWebM({ settings: makeSettings(), imageUrls: [], signal: controller.signal });
      controller.abort();
      const result = await promise;

      assert.equal(result.ok, false);
      assert.equal(result.fallbackUsed, true);
      assert.equal(stubs.FakeMediaRecorder.startCount, 1);
      assert.equal(stubs.FakeMediaRecorder.stopCount, 1);
      assert.equal(stubs.stream.track.stopCount, 1);
    } finally {
      stubs.restore();
    }
  });
});

describe("videoRenderer frame content", () => {
  it("워터마크를 한 번만 그리고 CTA 표시 설정을 반영한다", async () => {
    const context = makeContext();
    const canvas = makeCanvas(context);
    await drawVideoFrameToCanvas(canvas, makeSettings({ showCTA: true }), [], 0);

    assert.equal(context.fillTextCalls.filter((text) => text === "Made with PostKit").length, 1);
    assert.ok(context.fillTextCalls.some((text) => text.includes("확인하기")));
  });

  it("CTA가 꺼져 있으면 CTA 문구를 프레임에 그리지 않는다", async () => {
    const context = makeContext();
    const canvas = makeCanvas(context);
    await drawVideoFrameToCanvas(canvas, makeSettings({ showCTA: false }), [], 0);

    assert.equal(context.fillTextCalls.filter((text) => text.includes("확인하기")).length, 0);
  });

  it("긴 제목은 설정된 최대 줄 수 안에서만 렌더링한다", async () => {
    const context = makeContext();
    const canvas = makeCanvas(context);
    await drawVideoFrameToCanvas(canvas, makeSettings({ titleMaxLines: 2 }), [], 0);

    const titleLines = context.fillTextCalls.filter((text) => text.includes("긴제목"));
    assert.ok(titleLines.length > 0);
    assert.ok(titleLines.length <= 2);
  });
});
