"use client";

import { getDesignOutputPreset, getDesignTemplate } from "@/lib/designTemplates";
import { clamp, loadImageFromUrl, readableColor } from "@/lib/imageUtils";
import { getSessionImage } from "@/lib/sessionImageStore";
import type { DesignProject, DesignTemplate, RenderResult } from "@/types";

function safeHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function font(size: number, weight = 800) {
  return `${weight} ${Math.max(12, Math.round(size))}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function splitLongToken(context: CanvasRenderingContext2D, token: string, maxWidth: number) {
  const chars = Array.from(token);
  const chunks: string[] = [];
  let current = "";

  chars.forEach((char) => {
    const test = `${current}${char}`;
    if (context.measureText(test).width > maxWidth && current) {
      chunks.push(current);
      current = char;
    } else {
      current = test;
    }
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  tokens.forEach((token) => {
    const test = current ? `${current} ${token}` : token;
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
      if (context.measureText(chunk).width > maxWidth) {
        lines.push(chunk);
      } else if (!current) {
        current = chunk;
      } else if (context.measureText(`${current} ${chunk}`).width <= maxWidth) {
        current = `${current} ${chunk}`;
      } else {
        lines.push(current);
        current = chunk;
      }
    });
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
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

function drawFallbackBackground(context: CanvasRenderingContext2D, width: number, height: number, primary: string, secondary: string) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fbf8f3");
  gradient.addColorStop(0.55, "#ffffff");
  gradient.addColorStop(1, secondary);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = `${primary}22`;
  context.beginPath();
  context.ellipse(width * 0.72, height * 0.22, width * 0.28, height * 0.16, -0.28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `${secondary}dd`;
  context.fillRect(width * 0.08, height * 0.16, width * 0.84, height * 0.48);
}

function drawImage(context: CanvasRenderingContext2D, image: HTMLImageElement, project: DesignProject) {
  const { width, height, imageSettings } = project;
  const fit = imageSettings.fit;
  const baseScale = fit === "cover" ? Math.max(width / image.width, height / image.height) : Math.min(width / image.width, height / image.height);
  const scale = baseScale * clamp(imageSettings.scale, 0.7, 2.2);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2 + (imageSettings.offsetX / 100) * width;
  const y = (height - drawHeight) / 2 + (imageSettings.offsetY / 100) * height;

  context.save();
  context.fillStyle = "#fbf8f3";
  context.fillRect(0, 0, width, height);
  context.filter = `brightness(${clamp(imageSettings.brightness, 55, 130)}%)`;
  context.drawImage(image, x, y, drawWidth, drawHeight);
  context.restore();
}

function applyOverlay(context: CanvasRenderingContext2D, project: DesignProject, template: DesignTemplate) {
  const { width, height } = project;
  const opacity = clamp(project.imageSettings.overlayOpacity, 0, 0.8);

  if (template.overlayStyle === "none" || opacity <= 0) {
    return;
  }

  if (template.overlayStyle === "gradient-bottom") {
    const gradient = context.createLinearGradient(0, height * 0.22, 0, height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return;
  }

  if (template.overlayStyle === "soft-light") {
    context.fillStyle = `rgba(255,255,255,${opacity})`;
    context.fillRect(0, 0, width, height);
    return;
  }

  context.fillStyle = `rgba(0,0,0,${opacity})`;
  context.fillRect(0, 0, width, height);
}

function getTextBox(project: DesignProject, template: DesignTemplate) {
  const padding = Math.round(project.width * template.padding);
  const width = project.width;
  const height = project.height;
  const boxWidth = template.textPosition === "left" || template.textPosition === "right" ? width * 0.55 : width - padding * 2;
  const boxHeight = height * 0.42;
  const x =
    template.textPosition === "right"
      ? width - padding - boxWidth
      : template.textPosition === "center" || template.textPosition === "top" || template.textPosition === "bottom"
        ? padding
        : padding;
  const y =
    template.textPosition === "top"
      ? padding
      : template.textPosition === "center" || template.textPosition === "left" || template.textPosition === "right"
        ? (height - boxHeight) / 2
        : height - padding - boxHeight;

  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    padding
  };
}

function drawPanelIfNeeded(context: CanvasRenderingContext2D, project: DesignProject, template: DesignTemplate, box: ReturnType<typeof getTextBox>) {
  if (template.overlayStyle !== "brand-panel" && template.overlayStyle !== "blur-card") {
    return;
  }

  const panelColor = template.overlayStyle === "brand-panel" ? project.primaryColor : "rgba(255,255,255,0.82)";
  context.fillStyle = panelColor;
  fillRoundedRect(context, box.x - box.padding * 0.35, box.y - box.padding * 0.3, box.width + box.padding * 0.7, box.height + box.padding * 0.55, Math.round(box.padding * 0.35));
}

function drawText(context: CanvasRenderingContext2D, project: DesignProject, template: DesignTemplate) {
  const box = getTextBox(project, template);
  drawPanelIfNeeded(context, project, template, box);

  const primary = safeHex(project.primaryColor, "#ff6b4a");
  const secondary = safeHex(project.secondaryColor, "#edf9f6");
  const onPrimary = readableColor(primary);
  const panelMode = template.overlayStyle === "brand-panel";
  const textColor = panelMode ? onPrimary : template.overlayStyle === "soft-light" || template.overlayStyle === "blur-card" || template.overlayStyle === "none" ? "#26242c" : "#ffffff";
  const mutedColor = panelMode ? `${onPrimary}dd` : textColor === "#ffffff" ? "rgba(255,255,255,0.82)" : "#726f7a";
  const accentColor = panelMode ? onPrimary : primary;
  const scale = clamp(project.fontScale, 0.75, 1.45);
  const titleSize = Math.round(project.width * 0.068 * scale);
  const subtitleSize = Math.round(project.width * 0.03 * scale);
  const smallSize = Math.round(project.width * 0.023 * scale);
  const lineHeight = titleSize * 1.12;
  const align = project.textAlignment;
  const x = align === "center" ? box.x + box.width / 2 : align === "right" ? box.x + box.width : box.x;

  context.textAlign = align;
  context.textBaseline = "top";

  let cursor = box.y;

  if (project.showBrandName && project.editedText.brandName) {
    context.fillStyle = accentColor;
    context.font = font(smallSize, 900);
    context.fillText(project.editedText.brandName.toUpperCase(), x, cursor);
    cursor += smallSize * 1.75;
  }

  if (project.showTitle && project.editedText.title) {
    context.fillStyle = textColor;
    context.font = font(titleSize, 900);
    wrapText(context, project.editedText.title, box.width, template.titleMaxLines).forEach((line) => {
      context.fillText(line, x, cursor);
      cursor += lineHeight;
    });
    cursor += titleSize * 0.28;
  }

  if (project.editedText.subtitle) {
    context.fillStyle = mutedColor;
    context.font = font(subtitleSize, 700);
    wrapText(context, project.editedText.subtitle, box.width, 3).forEach((line) => {
      context.fillText(line, x, cursor);
      cursor += subtitleSize * 1.45;
    });
    cursor += subtitleSize * 0.4;
  }

  if (project.showCta && project.editedText.cta) {
    context.font = font(smallSize, 900);
    const ctaText = project.editedText.cta;
    const ctaWidth = Math.min(box.width, context.measureText(ctaText).width + box.padding * 0.75);
    const ctaX = align === "center" ? x - ctaWidth / 2 : align === "right" ? x - ctaWidth : x;
    context.fillStyle = panelMode ? "rgba(255,255,255,0.2)" : secondary;
    fillRoundedRect(context, ctaX, cursor, ctaWidth, smallSize * 2.1, smallSize * 0.7);
    context.fillStyle = panelMode ? onPrimary : primary;
    context.fillText(ctaText, align === "center" ? x : align === "right" ? ctaX + ctaWidth - box.padding * 0.35 : ctaX + box.padding * 0.35, cursor + smallSize * 0.45);
    cursor += smallSize * 2.55;
  }

  if (project.showDisclosure && project.editedText.disclosure) {
    context.fillStyle = mutedColor;
    context.font = font(smallSize * 0.86, 800);
    wrapText(context, project.editedText.disclosure, box.width, 2).forEach((line) => {
      context.fillText(line, x, cursor);
      cursor += smallSize * 1.18;
    });
  }

  if (project.editedText.footer) {
    context.fillStyle = mutedColor;
    context.font = font(Math.max(16, smallSize * 0.74), 700);
    context.fillText(project.editedText.footer, project.width - box.padding, project.height - box.padding * 0.72);
  }
}

export async function drawDesignToCanvas(canvas: HTMLCanvasElement, project: DesignProject) {
  const output = getDesignOutputPreset(project.outputPresetId);
  const template = {
    ...getDesignTemplate(project.templateId),
    textPosition: project.textPosition,
    textAlignment: project.textAlignment,
    fontScale: project.fontScale,
    showBrandName: project.showBrandName,
    showDisclosure: project.showDisclosure
  };
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 컨텍스트를 만들 수 없어요.");
  }

  canvas.width = output.width;
  canvas.height = output.height;

  const primary = safeHex(project.primaryColor, "#ff6b4a");
  const secondary = safeHex(project.secondaryColor, "#edf9f6");
  const sessionImage = getSessionImage(project.uploadedAssetId);

  if (sessionImage) {
    const image = await loadImageFromUrl(sessionImage.objectUrl);
    drawImage(context, image, { ...project, width: output.width, height: output.height });
  } else {
    drawFallbackBackground(context, output.width, output.height, primary, secondary);
  }

  applyOverlay(context, { ...project, width: output.width, height: output.height }, template);
  drawText(context, { ...project, width: output.width, height: output.height }, template);
}

export async function renderDesignToBlob(project: DesignProject): Promise<RenderResult> {
  if (typeof document === "undefined") {
    return {
      ok: false,
      error: "브라우저에서만 PNG를 생성할 수 있어요."
    };
  }

  try {
    const canvas = document.createElement("canvas");
    await drawDesignToCanvas(canvas, project);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png", 0.95));

    if (!blob) {
      return {
        ok: false,
        error: "PNG Blob을 만들지 못했어요."
      };
    }

    return {
      ok: true,
      blob
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "디자인 렌더링에 실패했어요."
    };
  }
}
