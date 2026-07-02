import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "PostKit",
  title: "PostKit | SNS 업로드 패키지 생성",
  description: "사진만 넣으면 SNS 업로드 직전 캡션, 해시태그, CTA, 광고 표시 문구를 생성하는 MVP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PostKit",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#ff6b4a"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
