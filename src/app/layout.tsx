// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://mathparenting.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MathParenting",
    template: "%s — MathParenting",
  },
  description:
    "Teach any math topic at home with simple, parent-friendly steps.",
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

function SimpleHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <a href="/" className="font-semibold">MathParenting</a>
        <nav className="flex gap-4 text-sm">
          <a className="hover:underline" href="/">Home</a>
          <a className="hover:underline" href="/courses">Courses</a>
          <a className="hover:underline" href="/signin">Sign in</a>
          <a className="hover:underline" href="/dashboard">Dashboard</a>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* Skip to main */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          Skip to content
        </a>

        {/* TEMP: safe header without overlays */}
        <SimpleHeader />

        {/* Page content */}
        <main id="main" className="mx-auto max-w-5xl p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
