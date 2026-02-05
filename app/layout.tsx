import type { Metadata } from "next";
import { Suspense } from "react";

import "./globals.css";
import LoadingBar from "./components/LoadingBar";


import { Outfit } from "next/font/google";
import Script from "next/script";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Creditly - Micro-Prêts Professionnels",
  description: "Plateforme de gestion de micro-prêts rapide et sécurisée.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} dark`} suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-7463108649392537" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8933090351597750"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased selection:bg-blue-600/20" suppressHydrationWarning>
        <Suspense fallback={null}>
          <LoadingBar />
        </Suspense>
        <main className="min-h-screen page-transition">
          {children}
        </main>
      </body>
    </html>
  );
}
