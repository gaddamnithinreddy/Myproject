"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function WelcomePage() {
  const { user, userProfile, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login") // Redirect if not logged in
    }
    if (!loading && user && userProfile) {
      // Optionally redirect to dashboard after a short delay or user action
      // setTimeout(() => router.push("/dashboard"), 3000);
    }
  }, [user, userProfile, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !userProfile) {
    return null // Should redirect by useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 dark:bg-gray-950">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome, {userProfile.firstName}!</CardTitle>
          <CardDescription>Your KeyConnect account has been successfully created.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">
            We're excited to have you on board. Get ready to connect with athletes, manage your teams, and join
            tournaments!
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={logout} className="w-full bg-transparent">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
