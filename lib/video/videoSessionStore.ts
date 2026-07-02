"use client";

import type { VideoExportAsset } from "@/types";

const videoAssets = new Map<string, VideoExportAsset>();

export function storeVideoExportAsset(asset: VideoExportAsset) {
  const existing = videoAssets.get(asset.videoProjectId);
  if (existing?.objectUrl) {
    URL.revokeObjectURL(existing.objectUrl);
  }

  videoAssets.set(asset.videoProjectId, asset);
  return asset;
}

export function getVideoExportAsset(projectId: string | undefined) {
  if (!projectId) return undefined;
  return videoAssets.get(projectId);
}

export function getLatestVideoExportAssetForContent(contentId: string | undefined) {
  if (!contentId) return undefined;
  return Array.from(videoAssets.values())
    .filter((asset) => asset.contentId === contentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function createVideoObjectUrl(projectId: string | undefined) {
  const asset = getVideoExportAsset(projectId);
  if (!asset?.blob) return "";

  if (asset.objectUrl) {
    return asset.objectUrl;
  }

  const objectUrl = URL.createObjectURL(asset.blob);
  videoAssets.set(asset.videoProjectId, {
    ...asset,
    objectUrl
  });
  return objectUrl;
}

export function revokeVideoObjectUrl(projectId: string | undefined) {
  const asset = getVideoExportAsset(projectId);
  if (!asset?.objectUrl) return;

  URL.revokeObjectURL(asset.objectUrl);
  videoAssets.set(asset.videoProjectId, {
    ...asset,
    objectUrl: undefined
  });
}

export function clearVideoExportAsset(projectId: string | undefined) {
  const asset = getVideoExportAsset(projectId);
  if (asset?.objectUrl) {
    URL.revokeObjectURL(asset.objectUrl);
  }
  if (projectId) {
    videoAssets.delete(projectId);
  }
}
