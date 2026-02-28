import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "git-tweet",
  description: "Low-noise auto-posting of meaningful GitHub release events to X"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/connect/github">Connect GitHub</Link>
          <Link href="/connect/x">Connect X</Link>
          <Link href="/repositories">Repositories</Link>
          <Link href="/logs">Logs</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
