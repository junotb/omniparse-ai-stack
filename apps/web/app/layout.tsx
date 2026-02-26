import type { Metadata } from "next";
import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import { Nav } from "./components/Nav";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-kr",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Omniparse AI Stack", template: "%s | Omniparse AI Stack" },
  description: "AI 기반 문서·이미지 파싱 — OCR, Parser, Image, Agent",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.variable} ${jetbrainsMono.variable} min-h-screen antialiased pb-[max(4rem,env(safe-area-inset-bottom)+3rem)] sm:pb-0`}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}
