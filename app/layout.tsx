import type { Metadata } from "next";
import { Suspense } from "react";

import "./globals.css";
import LoadingBar from "./components/LoadingBar";


import { Outfit } from "next/font/google";

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
