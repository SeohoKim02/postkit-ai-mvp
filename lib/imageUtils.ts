"use client";

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImageFromUrl(url: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 이미지를 불러올 수 있어요."));
  }

  const cached = imageCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했어요. 파일이 손상됐거나 지원하지 않는 형식일 수 있습니다."));
    image.src = url;
  });

  imageCache.set(url, promise);
  return promise;
}

export function clearLoadedImage(url: string) {
  imageCache.delete(url);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function readableColor(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 145 ? "#26242c" : "#ffffff";
}
