import type { Metadata } from "next";
import { Dela_Gothic_One, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const display = Dela_Gothic_One({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

const body = Zen_Maru_Gothic({
  variable: "--font-body",
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "コマドリ",
  description: "空いている時間をリンクで共有して、相手に予定を入れてもらう日程調整アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
