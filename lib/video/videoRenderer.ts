"use client";

import { clamp, loadImageFromUrl, readableColor } from "@/lib/imageUtils";
import { buildVideoFramePlan, getSupportedWebMMimeType } from "@/lib/video/videoUtils";
import type { VideoRenderResult, VideoRenderSettings, VideoTransitionType } from "@/types";

function safeHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function font(size: number, weight = 800) {
  return `${weight} ${Math.max(10, Math.round(size))}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function fillRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
  context.fill();
}

function splitLongToken(context: CanvasRenderingContext2D, token: string, maxWidth: number) {
  const chunks: string[] = [];
  let current = "";

  Array.from(token).forEach((char) => {
    const test = `${current}${char}`;
    if (context.measureText(test).width > maxWidth && current) {
      chunks.push(current);
      current = char;
    } else {
      current = test;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const tokens = normalized.includes(" ") ? normalized.split(" ") : Array.from(normalized);
  const lines: string[] = [];
  let current = "";

  tokens.forEach((token) => {
    const separator = normalized.includes(" ") ? " " : "";
    const test = current ? `${current}${separator}${token}` : token;
    if (context.measureText(test).width <= maxWidth) {
      current = test;
      return;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    const chunks = splitLongToken(context, token, maxWidth);
    chunks.forEach((chunk) => {
      if (!current) {
        current = chunk;
      } else if (context.measureText(`${current}${separator}${chunk}`).width <= maxWidth) {
        current = `${current}${separator}${chunk}`;
      } else {
        lines.push(current);
        current = chunk;
      }
    });
  });

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawFallbackBackground(context: CanvasRenderingContext2D, settings: VideoRenderSettings, timeSeconds: number) {
  const { width, height } = settings;
  const primary = safeHex(settings.primaryColor, "#ff6b4a");
  const secondary = safeHex(settings.secondaryColor, "#edf9f6");
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fbf8f3");
  gradient.addColorStop(0.5, "#ffffff");
  gradient.addColorStop(1, secondary);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const drift = Math.sin(timeSeconds * 0.8) * width * 0.02;
  context.fillStyle = `${primary}24`;
  context.beginPath();
  context.ellipse(width * 0.72 + drift, height * 0.2, width * 0.22, height * 0.12, -0.24, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `${secondary}cc`;
  fillRoundedRect(context, width * 0.12, height * 0.18, width * 0.76, height * 0.48, width * 0.035);
}

function imageMotionScale(settings: VideoRenderSettings, localProgress: number) {
  if (settings.transitionType === "slow-zoom" || settings.imageMotion === "ken-burns-in") {
    return 1 + localProgress * 0.08;
  }
  if (settings.imageMotion === "ken-burns-out") {
    return 1.08 - localProgress * 0.06;
  }
  if (settings.transitionType === "zoom-in-out") {
    return 1.04 + Math.sin(localProgress * Math.PI) * 0.08;
  }
  return 1;
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  settings: VideoRenderSettings,
  options: { alpha?: number; offsetX?: number; offsetY?: number; localProgress?: number } = {}
) {
  const { width, height } = settings;
  const alpha = options.alpha ?? 1;
  const localProgress = options.localProgress ?? 0;
  const baseScale = Math.max(width / image.width, height / image.height);
  const motionScale = imageMotionScale(settings, localProgress);
  const panY = settings.imageMotion === "pan-up" ? (localProgress - 0.5) * height * -0.06 : 0;
  const scale = baseScale * motionScale;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2 + (options.offsetX ?? 0);
  const y = (height - drawHeight) / 2 + panY + (options.offsetY ?? 0);

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = "#fbf8f3";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, x, y, drawWidth, drawHeight);
  context.restore();
}

async function getImage(urls: string[], index: number) {
  if (urls.length === 0) return null;
  const safeIndex = ((index % urls.length) + urls.length) % urls.length;
  return loadImageFromUrl(urls[safeIndex]);
}

function applyTransitionOffset(transition: VideoTransitionType, progress: number, width: number, height: number, direction: "current" | "next") {
  if (transition === "slide-up") {
    return {
      x: 0,
      y: direction === "current" ? -progress * height : (1 - progress) * height
    };
  }

  if (transition === "slide-side") {
    return {
      x: direction === "current" ? -progress * width : (1 - progress) * width,
      y: 0
    };
  }

  return { x: 0, y: 0 };
}

async function drawImages(context: CanvasRenderingContext2D, settings: VideoRenderSettings, imageUrls: string[], timeSeconds: number) {
  const { width, height, durationSeconds, transitionType } = settings;
  const plan = buildVideoFramePlan(durationSeconds, Math.max(1, imageUrls.length));
  const active =
    plan.find((item) => timeSeconds >= item.startSeconds && timeSeconds < item.endSeconds) ??
    plan[plan.length - 1];
  const segmentDuration = Math.max(0.1, active.endSeconds - active.startSeconds);
  const localProgress = clamp((timeSeconds - active.startSeconds) / segmentDuration, 0, 1);
  const transitionWindow = Math.min(active.transitionOutSeconds, segmentDuration * 0.42);
  const inTransition = transitionWindow > 0 && active.index < plan.length - 1 && active.endSeconds - timeSeconds <= transitionWindow;
  const transitionProgress = inTransition ? clamp(1 - (active.endSeconds - timeSeconds) / transitionWindow, 0, 1) : 0;
  const current = await getImage(imageUrls, active.imageIndex);

  if (!current) {
    drawFallbackBackground(context, settings, timeSeconds);
    return;
  }

  if (inTransition && transitionType !== "none" && transitionType !== "slow-zoom" && transitionType !== "zoom-in-out") {
    const next = await getImage(imageUrls, active.imageIndex + 1);
    const currentOffset = applyTransitionOffset(transitionType, transitionProgress, width, height, "current");
    const nextOffset = applyTransitionOffset(transitionType, transitionProgress, width, height, "next");

    drawCoverImage(context, current, settings, {
      alpha: transitionType === "fade" ? 1 : 1,
      offsetX: currentOffset.x,
      offsetY: currentOffset.y,
      localProgress
    });

    if (next) {
      drawCoverImage(context, next, settings, {
        alpha: transitionType === "fade" ? transitionProgress : 1,
        offsetX: nextOffset.x,
        offsetY: nextOffset.y,
        localProgress: 0
      });
    }
    return;
  }

  drawCoverImage(context, current, settings, { localProgress });
}

function applyOverlay(context: CanvasRenderingContext2D, settings: VideoRenderSettings) {
  const { width, height } = settings;
  const opacity = clamp(settings.overlayOpacity, 0, 0.75);
  if (settings.overlayStyle === "none" || opacity <= 0) return;

  if (settings.overlayStyle === "soft-light") {
    context.fillStyle = `rgba(255,255,255,${opacity})`;
    context.fillRect(0, 0, width, height);
    return;
  }

  if (settings.overlayStyle === "brand-gradient") {
    const gradient = context.createLinearGradient(0, height * 0.12, 0, height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.72, `rgba(0,0,0,${opacity * 0.8})`);
    gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return;
  }

  context.fillStyle = `rgba(0,0,0,${opacity})`;
  context.fillRect(0, 0, width, height);
}

function getTextBox(settings: VideoRenderSettings) {
  const safe = Math.round(settings.width * 0.075);
  const width = settings.width - safe * 2;
  const height = settings.height * 0.38;
  const y =
    settings.textPosition === "top"
      ? safe * 1.2
      : settings.textPosition === "center"
        ? (settings.height - height) / 2
        : settings.height - height - safe * 1.35;

  return {
    x: safe,
    y,
    width,
    height,
    safe
  };
}

function drawText(context: CanvasRenderingContext2D, settings: VideoRenderSettings) {
  const box = getTextBox(settings);
  const primary = safeHex(settings.primaryColor, "#ff6b4a");
  const secondary = safeHex(settings.secondaryColor, "#edf9f6");
  const onPrimary = readableColor(primary);
  const panelMode = settings.overlayStyle === "product-panel";
  const lightMode = settings.overlayStyle === "soft-light" || settings.overlayStyle === "none";
  const textColor = panelMode ? onPrimary : lightMode ? "#26242c" : "#ffffff";
  const mutedColor = panelMode ? `${onPrimary}dd` : lightMode ? "#5f5b66" : "rgba(255,255,255,0.84)";
  const accentColor = panelMode ? onPrimary : primary;
  const titleSize = Math.round(settings.width * 0.073);
  const hookSize = Math.round(settings.width * 0.036);
  const metaSize = Math.round(settings.width * 0.026);
  const x = settings.textPosition === "center" ? box.x + box.width / 2 : box.x;
  const align: CanvasTextAlign = settings.textPosition === "center" ? "center" : "left";

  if (panelMode) {
    context.fillStyle = primary;
    fillRoundedRect(context, box.x - box.safe * 0.25, box.y - box.safe * 0.28, box.width + box.safe * 0.5, box.height + box.safe * 0.34, box.safe * 0.22);
  }

  context.textAlign = align;
  context.textBaseline = "top";
  let cursor = box.y;

  if (settings.showBrandName && settings.text.brandName) {
    context.fillStyle = accentColor;
    context.font = font(metaSize, 900);
    context.fillText(settings.text.brandName.toUpperCase(), x, cursor);
    cursor += metaSize * 1.65;
  }

  if (settings.showTitle && settings.text.title) {
    context.fillStyle = textColor;
    context.font = font(titleSize, 900);
    wrapText(context, settings.text.title, box.width, settings.titleMaxLines).forEach((line) => {
      context.fillText(line, x, cursor);
      cursor += titleSize * 1.08;
    });
    cursor += titleSize * 0.24;
  }

  const subtitle = [settings.text.hook, settings.text.productName].filter(Boolean).join(" · ");
  if (subtitle) {
    context.fillStyle = mutedColor;
    context.font = font(hookSize, 750);
    wrapText(context, subtitle, box.width, 3).forEach((line) => {
      context.fillText(line, x, cursor);
      cursor += hookSize * 1.42;
    });
    cursor += hookSize * 0.42;
  }

  const footerParts = [
    settings.showCTA ? settings.text.cta : "",
    settings.text.discountCode ? `CODE ${settings.text.discountCode}` : ""
  ].filter(Boolean);

  if (footerParts.length > 0) {
    context.font = font(metaSize, 900);
    const pill = footerParts.join("  |  ");
    const pillWidth = Math.min(box.width, context.measureText(pill).width + box.safe * 0.78);
    const pillX = align === "center" ? x - pillWidth / 2 : x;
    context.fillStyle = panelMode ? "rgba(255,255,255,0.18)" : secondary;
    fillRoundedRect(context, pillX, cursor, pillWidth, metaSize * 2.18, metaSize * 0.72);
    context.fillStyle = panelMode ? onPrimary : primary;
    context.fillText(pill, align === "center" ? x : pillX + box.safe * 0.38, cursor + metaSize * 0.48);
    cursor += metaSize * 2.72;
  }

  if (settings.showDisclosure && settings.text.disclosure) {
    context.fillStyle = mutedColor;
    context.font = font(Math.max(13, metaSize * 0.78), 800);
    wrapText(context, settings.text.disclosure, box.width, 2).forEach((line) => {
      context.fillText(line, x, cursor);
      cursor += metaSize * 1.05;
    });
  }
}

export async function drawVideoFrameToCanvas(
  canvas: HTMLCanvasElement,
  settings: VideoRenderSettings,
  imageUrls: string[],
  timeSeconds: number,
  size?: { width: number; height: number }
) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 컨텍스트를 만들 수 없어요.");
  }

  const renderSettings = {
    ...settings,
    width: size?.width ?? settings.width,
    height: size?.height ?? settings.height
  };

  canvas.width = renderSettings.width;
  canvas.height = renderSettings.height;
  context.clearRect(0, 0, renderSettings.width, renderSettings.height);

  await drawImages(context, renderSettings, imageUrls, clamp(timeSeconds, 0, renderSettings.durationSeconds));
  applyOverlay(context, renderSettings);
  drawText(context, renderSettings);
}

export async function renderVideoFrameToBlob(settings: VideoRenderSettings, imageUrls: string[], timeSeconds: number) {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  await drawVideoFrameToCanvas(canvas, settings, imageUrls, timeSeconds);
  return new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png", 0.94));
}

export async function renderVideoToWebM({
  settings,
  imageUrls,
  signal,
  onProgress
}: {
  settings: VideoRenderSettings;
  imageUrls: string[];
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}): Promise<VideoRenderResult> {
  if (typeof document === "undefined") {
    return { ok: false, error: "브라우저에서만 영상을 생성할 수 있어요." };
  }

  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;

  if (typeof canvas.captureStream !== "function") {
    return { ok: false, error: "이 브라우저는 canvas.captureStream을 지원하지 않아요.", fallbackUsed: true };
  }

  if (typeof MediaRecorder === "undefined") {
    return { ok: false, error: "이 브라우저는 MediaRecorder를 지원하지 않아요.", fallbackUsed: true };
  }

  const mimeType = getSupportedWebMMimeType();
  if (!mimeType) {
    return { ok: false, error: "이 브라우저는 WebM 녹화를 지원하지 않아요.", fallbackUsed: true };
  }

  const stream = canvas.captureStream(settings.frameRate);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  return new Promise<VideoRenderResult>((resolve) => {
    let frame = 0;
    let finished = false;
    let raf = 0;
    let startedAt = 0;

    function finish(result: VideoRenderResult) {
      if (finished) return;
      finished = true;
      if (raf) window.cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
      resolve(result);
    }

    function abort() {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      finish({ ok: false, error: "영상 생성을 취소했어요.", fallbackUsed: true });
    }

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      finish({ ok: false, error: "MediaRecorder 녹화 중 오류가 발생했어요.", fallbackUsed: true });
    };

    recorder.onstop = () => {
      if (finished && chunks.length === 0) return;
      const blob = new Blob(chunks, { type: "video/webm" });
      finish({
        ok: blob.size > 0,
        blob: blob.size > 0 ? blob : undefined,
        durationSeconds: settings.durationSeconds,
        mimeType: "video/webm",
        error: blob.size > 0 ? undefined : "영상 Blob을 만들지 못했어요."
      });
    };

    async function tick(timestamp: number) {
      if (!startedAt) {
        startedAt = timestamp;
      }

      if (finished || signal?.aborted) {
        return;
      }

      const elapsedSeconds = (timestamp - startedAt) / 1000;
      const timeSeconds = clamp(elapsedSeconds, 0, settings.durationSeconds);

      try {
        await drawVideoFrameToCanvas(canvas, settings, imageUrls, timeSeconds);
      } catch (error) {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        finish({
          ok: false,
          error: error instanceof Error ? error.message : "영상 프레임 렌더링에 실패했어요.",
          fallbackUsed: true
        });
        return;
      }

      frame += 1;
      if (frame % 3 === 0) {
        onProgress?.(Math.min(100, Math.round((timeSeconds / settings.durationSeconds) * 100)));
      }

      if (elapsedSeconds >= settings.durationSeconds) {
        onProgress?.(100);
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        return;
      }

      raf = window.requestAnimationFrame(tick);
    }

    recorder.start(400);
    raf = window.requestAnimationFrame(tick);
  });
}
