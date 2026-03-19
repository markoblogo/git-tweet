import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://127.0.0.1:3000"),
  title: "git-tweet",
  description: "Low-noise GitHub milestones to social posts.",
  openGraph: {
    title: "git-tweet",
    description: "Low-noise GitHub milestones to social posts.",
    images: ["/assets/og.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "git-tweet",
    description: "Low-noise GitHub milestones to social posts.",
    images: ["/assets/og.png"]
  },
  icons: {
    icon: "/assets/logo.png",
    apple: "/assets/logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link className="brand-link" href="/">
            <Image src="/assets/logo.png" alt="git-tweet logo" width={32} height={32} />
            <span>
              <strong>git-tweet</strong>
              <small>Low-noise release posts</small>
            </span>
          </Link>
          <div className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/connect/github">Connect GitHub</Link>
            <Link href="/connect/x">Connect X</Link>
            <Link href="/repositories">Repositories</Link>
            <Link href="/logs">Logs</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
