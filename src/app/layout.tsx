// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import HeaderClient from "@/components/HeaderClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://mathparenting.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MathParenting",
    template: "%s — MathParenting",
  },
  description: "Teach any math topic at home with simple, parent-friendly steps.",
  applicationName: "MathParenting",
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
    description:
      "Parent-friendly math guidance, real-life examples, and practice you can do at home.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MathParenting" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mathparenting",
    creator: "@mathparenting",
    title: "MathParenting",
    description:
      "Parent-friendly math guidance, real-life examples, and practice you can do at home.",
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
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* Skip to main content for accessibility */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          Skip to content
        </a>

        {/* Header sits above backgrounds but must not block clicks */}
        <div className="relative z-20">
          <HeaderClient />
        </div>

        {/* Page content is explicitly above any accidental overlays */}
        <main
          id="main"
          className="relative z-10 isolate pointer-events-auto mx-auto max-w-5xl p-4 md:p-6"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
