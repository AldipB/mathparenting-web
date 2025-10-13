import "./globals.css";
import type { ReactNode } from "react";
import HeaderClient from "../components/HeaderClient";

export const metadata = {
  title: "MathParenting",
  description: "Connecting parents and children through math",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-svh bg-white text-gray-900 antialiased">
        <HeaderClient />
        {/* Full width so /chat can control its own layout (like ChatGPT) */}
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
