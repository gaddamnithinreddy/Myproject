"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from "react"
import { app } from "@/lib/firebase"
import { getMessaging, getToken, onMessage } from "firebase/messaging"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { saveFcmTokenToUser } from "@/lib/notifications"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  useEffect(() => {
    const requestPermission = async () => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const messaging = getMessaging(app)
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          })

          if (currentToken) {
            console.log("FCM registration token:", currentToken)
            if (user?.uid) {
              await saveFcmTokenToUser(user.uid, currentToken)
            }
          } else {
            console.log("No registration token available. Request permission to generate one.")
          }

          onMessage(messaging, (payload) => {
            console.log("Message received. ", payload)
            toast({
              title: payload.notification?.title || "New Notification",
              description: payload.notification?.body,
              variant: "default",
            })
          })
        } catch (err) {
          console.error("An error occurred while retrieving token. ", err)
          toast({
            title: "Notification Error",
            description: "Failed to get FCM token. Check console for details.",
            variant: "destructive",
          })
        }
      } else if (typeof window !== "undefined" && "Notification" in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted.")
            requestPermission() // Try to get token again
          } else {
            console.log("Notification permission denied.")
            toast({
              title: "Notifications Blocked",
              description: "Please enable notifications in your browser settings to receive alerts.",
              variant: "destructive",
            })
          }
        })
      }
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      requestPermission()
    } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      requestPermission()
    }
  }, [user])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
