import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/contexts/AuthContext"
import ClientLayout from "./ClientLayout"
import ErrorBoundary from "@/components/ErrorBoundary"
import PWARegistration from "@/components/PWARegistration"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "KeyConnect - Sports Management Platform",
  description: "Empowering sports clubs to connect, compete, and grow together. Manage teams, schedules, tournaments, and more.",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  robots: 'index, follow',
  openGraph: {
    title: 'KeyConnect - Sports Management Platform',
    description: 'Empowering sports clubs to connect, compete, and grow together',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KeyConnect - Sports Management Platform',
    description: 'Empowering sports clubs to connect, compete, and grow together',
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      </head>
      <body className={inter.className}>
        <PWARegistration />
        <ErrorBoundary>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
