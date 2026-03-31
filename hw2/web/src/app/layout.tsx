import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strategy mNAV Dashboard",
  description:
    "A DAT-focused dashboard for tracking Strategy mNAV, BTC NAV, and market-cap valuation dynamics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
