import type { Platform, VideoPlatform } from "@/types";

export const videoDimensions = {
  vertical: {
    width: 1080,
    height: 1920,
    aspectRatio: "9:16"
  }
} as const;

export const videoDurationOptions = [5, 8, 10, 15] as const;

export type VideoDurationOption = (typeof videoDurationOptions)[number];

export const videoPresets: Array<{
  id: string;
  platform: VideoPlatform;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  openUrl: string;
}> = [
  {
    id: "instagram-reels",
    platform: "Instagram Reels",
    label: "Instagram Reels",
    width: videoDimensions.vertical.width,
    height: videoDimensions.vertical.height,
    aspectRatio: videoDimensions.vertical.aspectRatio,
    openUrl: "https://www.instagram.com/"
  },
  {
    id: "instagram-story-video",
    platform: "Instagram Story",
    label: "Instagram Story",
    width: videoDimensions.vertical.width,
    height: videoDimensions.vertical.height,
    aspectRatio: videoDimensions.vertical.aspectRatio,
    openUrl: "https://www.instagram.com/"
  },
  {
    id: "tiktok-video",
    platform: "TikTok",
    label: "TikTok",
    width: videoDimensions.vertical.width,
    height: videoDimensions.vertical.height,
    aspectRatio: videoDimensions.vertical.aspectRatio,
    openUrl: "https://www.tiktok.com/upload"
  },
  {
    id: "youtube-shorts-video",
    platform: "YouTube Shorts",
    label: "YouTube Shorts",
    width: videoDimensions.vertical.width,
    height: videoDimensions.vertical.height,
    aspectRatio: videoDimensions.vertical.aspectRatio,
    openUrl: "https://www.youtube.com/"
  }
];

export function getVideoPresetByPlatform(platform: VideoPlatform) {
  return videoPresets.find((preset) => preset.platform === platform) ?? videoPresets[0];
}

export function mapVideoPlatformToPostKitPlatform(platform: VideoPlatform): Platform {
  if (platform === "Instagram Reels") return "Instagram Reels";
  return platform;
}

export function recommendVideoPlatform(platform: Platform | undefined): VideoPlatform {
  if (platform === "Instagram Reels" || platform === "Reels Thumbnail") return "Instagram Reels";
  if (platform === "Instagram Story") return "Instagram Story";
  if (platform === "TikTok") return "TikTok";
  if (platform === "YouTube Shorts") return "YouTube Shorts";
  return "Instagram Reels";
}

export function isVideoPreferredPlatform(platform: Platform | VideoPlatform | undefined) {
  return platform === "Instagram Story" || platform === "Reels Thumbnail" || platform === "Instagram Reels" || platform === "TikTok" || platform === "YouTube Shorts";
}
