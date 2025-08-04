"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun, Bell, User, Lock, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, logout, resetPassword } = useAuth()
  const [notificationPrefs, setNotificationPrefs] = useState({
    inApp: true,
    push: true,
    email: true,
  })
  const [prefsLoading, setPrefsLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchPrefs = async () => {
      setPrefsLoading(true)
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const prefs = userDoc.data()?.notificationPrefs || {}
      setNotificationPrefs({
        inApp: prefs.inApp !== false,
        push: prefs.push !== false,
        email: prefs.email !== false,
      })
      setPrefsLoading(false)
    }
    fetchPrefs()
  }, [user])

  const handlePrefChange = async (type: "inApp" | "push" | "email", value: boolean) => {
    if (!user) return
    setNotificationPrefs((prev) => ({ ...prev, [type]: value }))
    await updateDoc(doc(db, "users", user.uid), {
      notificationPrefs: { ...notificationPrefs, [type]: value },
    })
    toast({
      title: "Notification Preferences Updated",
      description: `Your ${type} notifications are now ${value ? "enabled" : "disabled"}.`,
    })
  }

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleChangePassword = async () => {
    if (user?.email) {
      try {
        await resetPassword(user.email)
        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for instructions to reset your password.",
        })
      } catch (error) {
        // Error handled by AuthContext toast
      }
    } else {
      toast({
        title: "Error",
        description: "Could not send password reset email. Please log in to reset your password.",
        variant: "destructive",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Settings & Preferences</h1>
        <p className="text-gray-600">Manage your application settings and account preferences.</p>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label htmlFor="theme-toggle">Dark Mode</Label>
            <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={handleThemeToggle} />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp-toggle">Enable In-App Notifications</Label>
              <Switch
                id="inapp-toggle"
                checked={notificationPrefs.inApp}
                onCheckedChange={(v) => handlePrefChange("inApp", v)}
                disabled={prefsLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-toggle">Enable Push Notifications</Label>
              <Switch
                id="push-toggle"
                checked={notificationPrefs.push}
                onCheckedChange={(v) => handlePrefChange("push", v)}
                disabled={prefsLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-toggle">Enable Email Notifications</Label>
            <Switch
                id="email-toggle"
                checked={notificationPrefs.email}
                onCheckedChange={(v) => handlePrefChange("email", v)}
                disabled={prefsLoading}
            />
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Edit Profile Information
              </Link>
            </Button>
            <Button onClick={handleChangePassword} variant="outline" className="w-full justify-start bg-transparent">
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <Button onClick={logout} variant="destructive" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
