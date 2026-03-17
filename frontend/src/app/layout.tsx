import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CHR Recipe Builder",
  description: "Visual tool for mapping NES CHR tiles to sprites",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col`}>
        <nav className="shrink-0 border-b border-white/10 bg-white/2">
          <div className="px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-mono font-bold text-lg tracking-tight hover:text-cyan-400 transition-colors">
              CHR Recipe Builder
            </Link>
            <div className="flex gap-4 text-sm text-white/50">
              <Link href="/import" className="hover:text-white transition-colors">Import</Link>
              <Link href="/chr" className="hover:text-white transition-colors">CHR ROM</Link>
              <Link href="/export" className="hover:text-white transition-colors">Export</Link>
            </div>
          </div>
        </nav>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}
