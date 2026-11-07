import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "ExportReady", template: "%s · ExportReady" },
  description:
    "Buyer-specific evidence reports for supplier documents. An evidence review, not a certification.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "dark" || theme === "light" ? theme : undefined;

  return (
    <html lang="en" data-theme={dataTheme} className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
