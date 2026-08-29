import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BarDoctor",
  description: "Release Candidate приложения BarDoctor для управления заведением.",
  manifest: "/manifest.json?v=20260812-brand-v159",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BarDoctor",
  },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon-v159.svg", type: "image/svg+xml" },
      { url: "/icons/bardoctor-v159-favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=20260812-brand-v159",
    apple: {
      url: "/icons/bardoctor-v159-apple-180.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <script src="/health-score-experience.js?v=20260828-health-startup-v332" defer />
        <script src="/modern-polish.js?v=20260811-modern-v87" defer />
      </body>
    </html>
  );
}
