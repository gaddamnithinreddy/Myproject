"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { sendEmailVerification } from "firebase/auth"

export default function VerifyEmailPage() {
  const { user, userProfile, loading } = useAuth()
  const [sending, setSending] = useState(false)
  const [resent, setResent] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!loading && userProfile && userProfile.emailVerified) {
      router.push("/dashboard")
    }
  }, [userProfile, loading, router])

  const handleResend = async () => {
    if (!user) return
    setSending(true)
    setResent(false)
    try {
      await sendEmailVerification(user)
      setResent(true)
    } catch (err) {
      // Optionally show error
    } finally {
      setSending(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    window.location.reload()
  }

  if (loading || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 dark:bg-gray-950">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">A verification link has been sent to:</p>
          <p className="font-mono text-primary text-lg">{userProfile.email}</p>
          <p className="text-sm text-muted-foreground">Please check your inbox and click the link to verify your email address.</p>
          <Button onClick={handleResend} disabled={sending} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Resend Verification Email"}
          </Button>
          {resent && <p className="text-green-600 text-sm">Verification email resent!</p>}
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full">
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "I've Verified My Email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 