import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "אהרון ידיעות | עדכוני חדשות בזמן אמת",
  description:
    "פיד חדשות חי מערוץ הטלגרם של אהרון ידיעות — עדכונים ביטחוניים, אזעקות והתרעות בזמן אמת",
  keywords: [
    "אהרון ידיעות",
    "חדשות",
    "עדכונים",
    "צבע אדום",
    "אזעקות",
    "טלגרם",
    "חדשות בזמן אמת",
  ],
  authors: [{ name: "אהרון ידיעות" }],
  openGraph: {
    title: "אהרון ידיעות | עדכוני חדשות בזמן אמת",
    description: "פיד חדשות חי מערוץ הטלגרם של אהרון ידיעות",
    type: "website",
    locale: "he_IL",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
