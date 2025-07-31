"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  Home,
  Users,
  Calendar,
  Trophy,
  MessageSquare,
  Settings,
  LogOut,
  Loader2,
  Video,
  DollarSign,
  Bell,
  CheckCircle,
  XCircle,
  Mail,
  AlertTriangle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from "firebase/firestore"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, userProfile, loading, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchNotifications = async () => {
      setNotifLoading(true)
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
      const snap = await getDocs(q)
      const notifs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setNotifications(notifs)
      setUnreadCount((notifs as any[]).filter((n) => !n.read).length)
      setNotifLoading(false)
    }
    fetchNotifications()
  }, [user, notifDropdownOpen])

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read)
    await Promise.all(
      unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }))
    )
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  // Role-based navigation
  let navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Teams", href: "/teams", icon: Users },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Tournaments", href: "/tournaments", icon: Trophy },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Video", href: "/video", icon: Video },
    { name: "Payments", href: "/payments", icon: DollarSign },
    { name: "Settings", href: "/settings", icon: Settings },
  ]
  if (userProfile) {
    if (userProfile.userType === "individual") {
      // Individuals: Hide create tournament, payments
      navItems = navItems.filter(item => item.name !== "Payments")
    } else if (userProfile.userType === "club") {
      // Clubs: Show all, maybe add 'Manage Members'
      navItems.push({ name: "Manage Members", href: "/teams/manage", icon: Users })
    } else if (userProfile.userType === "organization") {
      // Organizations: Show all, maybe add 'Admin Panel'
      navItems.push({ name: "Admin Panel", href: "/admin", icon: Settings })
    }
  }

  // Icon per notification type
  const notifTypeIcon = (type: string) => {
    switch (type) {
      case "team_invite": return <Users className="h-5 w-5 text-blue-500" />
      case "team_removed": return <Users className="h-5 w-5 text-red-500" />
      case "schedule": return <Calendar className="h-5 w-5 text-green-500" />
      case "schedule_update": return <Calendar className="h-5 w-5 text-yellow-500" />
      case "schedule_cancel": return <Calendar className="h-5 w-5 text-red-500" />
      case "tournament_registration": return <Trophy className="h-5 w-5 text-yellow-500" />
      case "tournament_approval": return <CheckCircle className="h-5 w-5 text-green-600" />
      case "tournament_rejection": return <XCircle className="h-5 w-5 text-red-500" />
      case "direct_message": return <MessageSquare className="h-5 w-5 text-purple-500" />
      case "chat_mention": return <MessageSquare className="h-5 w-5 text-pink-500" />
      case "payment": return <DollarSign className="h-5 w-5 text-emerald-500" />
      case "announcement": return <Mail className="h-5 w-5 text-indigo-500" />
      case "alert": return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "tournament_result": return <Trophy className="h-5 w-5 text-blue-600" />
      case "tournament_complete": return <Trophy className="h-5 w-5 text-green-700" />
      default: return <Bell className="h-5 w-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent lg:h-16 lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden bg-transparent">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-only">Toggle Navigation Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Skeleton className="h-8 w-32 mb-4" />
                {[...Array(navItems.length)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar for Desktop */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-16 lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">KeyConnect</span>
              {userProfile && (
                <span className="ml-2 px-2 py-1 rounded text-xs font-bold bg-primary text-white capitalize">
                  {userProfile.userType}
                </span>
              )}
            </Link>
          </div>
          <nav className="flex-1 px-2 py-4 text-sm font-medium lg:px-4">
            <ul className="grid gap-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                      pathname === item.href ? "bg-muted text-primary" : ""
                    }`}
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent lg:h-16 lg:px-6">
          {/* Mobile Sheet Trigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden bg-transparent">
                <Home className="h-5 w-5" />
                <span className="sr-only">Toggle Navigation Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                  <span>KeyConnect</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                      pathname === item.href ? "bg-muted text-primary" : ""
                    }`}
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          {/* Notification Bell */}
          <DropdownMenu open={notifDropdownOpen} onOpenChange={setNotifDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <DropdownMenuLabel className="flex justify-between items-center">
                Notifications
                {unreadCount > 0 && (
                  <Button size="sm" variant="outline" onClick={handleMarkAllRead}>Mark all read</Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifLoading ? (
                <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Bell className="h-8 w-8 opacity-30" />
                  <div>No notifications yet.</div>
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex gap-3 items-start ${!n.read ? "bg-primary/10 font-semibold" : ""} cursor-pointer`}
                    onClick={() => {
                      if (n.link) router.push(n.link)
                      setNotifDropdownOpen(false)
                    }}
                  >
                    <div className="pt-1">{notifTypeIcon(n.type)}</div>
                    <div className="flex-1">
                      <div className="font-medium line-clamp-1">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ""}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary cursor-pointer" onClick={() => router.push("/dashboard")}>View All</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={userProfile?.profilePicture || "/placeholder.svg"} alt="User Avatar" />
                  <AvatarFallback>
                    {userProfile?.firstName?.[0]}
                    {userProfile?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {userProfile?.firstName} {userProfile?.lastName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
