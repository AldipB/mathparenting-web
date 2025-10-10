import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "MathParenting",
  description: "Connecting parents and children through math",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/40">
          <nav className="mx-auto flex max-w-5xl items-center gap-4 p-4" aria-label="Primary">
            <Link href="/" className="font-semibold tracking-tight">
              MathParenting
            </Link>

            <div className="ml-auto flex items-center gap-4">
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
              <Link href="/signin" className="text-blue-600 hover:underline">
                Sign in
              </Link>
              <Link href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
              <Link href="/reset-password" className="text-blue-600 hover:underline">
                Forgot password
              </Link>
              {/* Prefetch disabled so middleware reliably runs on protected route */}
              <Link href="/dashboard" prefetch={false} className="text-blue-600 hover:underline">
                Dashboard
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
