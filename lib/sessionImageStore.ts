"use client";

export type SessionImageAsset = {
  id: string;
  file: File;
  objectUrl: string;
  name: string;
  type: string;
  size: number;
  contentId?: string;
  createdAt: string;
};

const supportedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImageSize = 15 * 1024 * 1024;
const imageStore = new Map<string, SessionImageAsset>();

function createId() {
  return `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validateStudioImageFile(file: File) {
  if (!supportedImageTypes.includes(file.type)) {
    return {
      ok: false,
      message: "PNG, JPEG, WebP 이미지만 사용할 수 있어요."
    };
  }

  if (file.size > maxImageSize) {
    return {
      ok: false,
      message: "이미지 파일은 15MB 이하만 권장합니다."
    };
  }

  return {
    ok: true,
    message: "이미지를 사용할 수 있어요."
  };
}

export function storeSessionImage(file: File, existingId?: string) {
  const validation = validateStudioImageFile(file);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.message
    };
  }

  if (existingId) {
    releaseSessionImage(existingId);
  }

  const asset: SessionImageAsset = {
    id: createId(),
    file,
    objectUrl: URL.createObjectURL(file),
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: new Date().toISOString()
  };

  imageStore.set(asset.id, asset);

  return {
    ok: true,
    asset
  };
}

export function getSessionImage(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return imageStore.get(id);
}

export function associateSessionImageWithContent(assetId: string | undefined, contentId: string) {
  const asset = getSessionImage(assetId);
  if (!asset) {
    return;
  }

  imageStore.set(asset.id, {
    ...asset,
    contentId
  });
}

export function getSessionImageForContent(contentId: string | undefined) {
  if (!contentId) {
    return undefined;
  }

  return Array.from(imageStore.values()).find((asset) => asset.contentId === contentId);
}

export function releaseSessionImage(id: string | undefined) {
  const asset = getSessionImage(id);
  if (!asset) {
    return;
  }

  URL.revokeObjectURL(asset.objectUrl);
  imageStore.delete(asset.id);
}

export function getSupportedStudioImageTypes() {
  return supportedImageTypes;
}
