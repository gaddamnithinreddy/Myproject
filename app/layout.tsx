import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/contexts/AuthContext"
import ClientLayout from "./ClientLayout"
import ErrorBoundary from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "KeyConnect",
  description: "Sports Team Management Platform",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
