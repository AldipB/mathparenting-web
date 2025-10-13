import type { Metadata } from "next";
import "./globals.css";
import HeaderClient from "@/components/HeaderClient";

export const metadata: Metadata = {
  title: "MathParenting",
  description: "Teach any math topic at home with simple steps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <HeaderClient />
        <main>{children}</main>
      </body>
    </html>
  );
}
