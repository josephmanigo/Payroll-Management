import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { LoadingProvider } from "@/components/loading-provider"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Payroll Management",
  description: "A lightweight, secure, modern payroll system for small businesses",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.jpg",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider defaultTheme="dark" storageKey="payroll-management-theme">
          <Suspense fallback={null}>
            <LoadingProvider>{children}</LoadingProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
