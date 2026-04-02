// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import HeaderClient from "@/components/HeaderClient";
import InstallPrompt from "@/components/InstallPrompt";

export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mathparenting.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "MathParenting", template: "%s — MathParenting" },
  description: "Teach any math topic at home with simple, parent friendly steps.",
  applicationName: "MathParenting",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "MathParenting",
    title: "MathParenting",
    description: "Parent friendly math guidance, real life examples, and practice you can do at home.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MathParenting" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mathparenting",
    creator: "@mathparenting",
    title: "MathParenting",
    description: "Parent friendly math guidance, real life examples, and practice you can do at home.",
    images: ["/og.png"],
  },
  category: "education",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-gray-900 antialiased relative overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-10">
          <img
            src="/logo.png"
            alt="MathParenting logo background"
            className="w-[1200px] h-[1200px] max-w-none max-h-none object-contain"
          />
        </div>

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          Skip to content
        </a>

        <HeaderClient />

        <main id="main" className="pt-16 relative z-10">
          {children}
        </main>

        <InstallPrompt />
      </body>
    </html>
  );
}