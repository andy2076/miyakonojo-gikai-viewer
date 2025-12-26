import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ['400', '500', '700', '800'],
  subsets: ["latin"],
  variable: "--font-mplus-rounded",
});

export const metadata: Metadata = {
  title: "みえる議会　都城市版",
  description: "都城市議会の質問と答弁を簡単に検索・閲覧できるサービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${mPlusRounded.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-mplus-rounded)' }}
      >
        {children}
      </body>
    </html>
  );
}
