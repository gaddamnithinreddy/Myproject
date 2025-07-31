"use client"

import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Trophy, MessageSquare, PlusCircle, Video, DollarSign } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from "firebase/firestore"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { StatusMessage } from "@/components/Accessibility"
import { ListItem } from "@/components/PerformanceOptimized"

interface Event {
  id: string
  title: string
  date: Timestamp
  location: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  } | string
}

interface Team {
  id: string
  name: string
  sport: string
  role?: string
}

interface Tournament {
  id: string
  name: string
}

interface Notification {
  id: string
  type: string
  title: string
  body: string
  createdAt: Timestamp
}

interface Activity {
  type: "event" | "tournament" | "message"
  title: string
  desc: string
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Returns distance in kilometers
  function toRad(x: number) { return x * Math.PI / 180 }
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export default function DashboardPage() {
  const { user, userProfile, isProfileComplete } = useAuth()
  const router = useRouter()
  const { isOnline, isSlow } = useNetworkStatus()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [payments, setPayments] = useState<any[]>([])

  // Fetch all data in parallel after userProfile is loaded
  useEffect(() => {
    if (!userProfile) return
    if (!isOnline) {
      setError("You're offline. Please check your connection.")
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    const fetchData = async () => {
      // 1. Events near user
      const eventsQ = query(collection(db, "events"))
      const eventsSnap = await getDocs(eventsQ)
      const userCoords = userProfile.coordinates
      const eventsNearby = eventsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Event))
        .filter(ev => {
          if (!ev.location || typeof ev.location === 'string') return false
          if (!ev.location.coordinates) return false
          const d = haversineDistance(
            userCoords.lat,
            userCoords.lng,
            ev.location.coordinates.lat,
            ev.location.coordinates.lng
          )
          return d < 50 // 50km radius
        })
      setEvents(eventsNearby)

      // 2. Teams user is a member of
      const teamsQ = query(collection(db, "teams"), where("members", "array-contains", userProfile.uid))
      const teamsSnap = await getDocs(teamsQ)
      setTeams(teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)))

      // 3. Tournaments user joined
      const tournamentsQ = query(collection(db, "tournaments"), where("participants", "array-contains", userProfile.uid))
      const tournamentsSnap = await getDocs(tournamentsQ)
      setTournaments(tournamentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)))

      // 4. Unread messages (sum across all chatRooms)
      const chatRoomsQ = query(collection(db, "chatRooms"), where("participants", "array-contains", userProfile.uid))
      const chatRoomsSnap = await getDocs(chatRoomsQ)
      let unread = 0
      chatRoomsSnap.docs.forEach(roomDoc => {
        const room = roomDoc.data()
        const lastRead = room.lastRead?.[userProfile.uid]
        const lastMsg = room.lastMessage
        if (lastMsg && lastMsg.senderId !== userProfile.uid && (!lastRead || lastMsg.timestamp.toMillis() > lastRead.toMillis())) {
          unread++
        }
      })
      setUnreadMessages(unread)

      // 5. Recent activity: combine events, tournaments, messages
      const activity: Activity[] = []
      eventsNearby.forEach(ev => activity.push({
        type: "event",
        title: ev.title,
        desc: `${ev.date ? new Date(ev.date.seconds * 1000).toLocaleString() : ""} at ${typeof ev.location === 'string' ? ev.location : ev.location?.address || ""}`
      }))
      tournamentsSnap.docs.forEach(doc => {
        const t = doc.data()
        activity.push({ type: "tournament", title: t.name, desc: "Joined tournament" })
      })
      chatRoomsSnap.docs.forEach(doc => {
        const r = doc.data()
        if (r.lastMessage && r.lastMessage.senderId !== userProfile.uid) {
          activity.push({ type: "message", title: `New message in ${r.name}`, desc: r.lastMessage.content })
        }
      })
      setRecentActivity(activity.slice(0, 5))

      // 6. Notifications: fetch from notifications collection
      const notificationsQ = query(
        collection(db, "notifications"),
        where("userId", "==", userProfile.uid),
        orderBy("createdAt", "desc")
      )
      const notificationsSnap = await getDocs(notificationsQ)
      setNotifications(
        notificationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification))
      )

      // 7. Payments (if you have a payments collection)
      // const paymentsQ = query(collection(db, "payments"), where("userId", "==", userProfile.uid))
      // const paymentsSnap = await getDocs(paymentsQ)
      // setPayments(paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

      setLoading(false)
    }
    
    fetchData().catch((err: any) => {
      setError(err.message || "Failed to load dashboard data")
      setLoading(false)
    })
  }, [userProfile, isOnline])

  useEffect(() => {
    if (userProfile && userProfile.emailVerified === false) {
      router.push("/auth/verify-email")
    } else if (userProfile && !isProfileComplete(userProfile)) {
      router.push("/profile?complete=1")
    }
  }, [userProfile, router, isProfileComplete])

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner text="Loading dashboard..." />
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <StatusMessage type="error" message={error} />
      </DashboardLayout>
    )
  }

    if (!isOnline) {
    return (
      <DashboardLayout>
        <StatusMessage type="warning" message="You're currently offline. Some features may not work." />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">Nearby events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground">Active teams</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournaments Joined</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournaments.length}</div>
            <p className="text-xs text-muted-foreground">Nearby tournaments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button asChild variant="outline">
            <Link href="/teams/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Team
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tournaments">
              <Trophy className="mr-2 h-4 w-4" /> Create Tournament
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/schedule">
              <Calendar className="mr-2 h-4 w-4" /> Add Schedule Event
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/video">
              <Video className="mr-2 h-4 w-4" /> Record Video
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 && <p className="text-muted-foreground">No recent activity.</p>}
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.desc}</p>
                  </div>
                  {a.type === "event" && <Calendar className="h-5 w-5 text-muted-foreground" />}
                  {a.type === "tournament" && <Trophy className="h-5 w-5 text-muted-foreground" />}
                  {a.type === "message" && <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle>My Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teams.length === 0 && <p className="text-muted-foreground">You are not in any teams yet.</p>}
              {teams.map((team, i) => (
                <div key={team.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">{team.sport} - {team.role || "Member"}</p>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Preview: show upcoming events */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upcoming Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-4 pr-4">
              {events.length === 0 && <p className="text-muted-foreground">No upcoming events nearby.</p>}
              {events.map((ev, i) => (
                <div key={ev.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-sm text-muted-foreground">{ev.date ? new Date(ev.date.seconds * 1000).toLocaleString() : ""} at {typeof ev.location === 'string' ? ev.location : ev.location?.address || ""}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    RSVP
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Notifications: show real notifications */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-4 pr-4">
              {notifications.length === 0 && <p className="text-muted-foreground">No notifications.</p>}
              {notifications.map((n, i) => (
                <div key={n.id || i} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{n.type?.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Payment History: left as a placeholder, can be implemented if you have payments */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Tournament Fee - Summer Slam</p>
                  <p className="text-sm text-muted-foreground">Paid on Oct 20, 2023</p>
                </div>
              </div>
              <span className="font-semibold text-green-600">+$50.00</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium">Subscription - Monthly Pro Plan</p>
                  <p className="text-sm text-muted-foreground">Failed on Sep 15, 2023</p>
                </div>
              </div>
              <span className="font-semibold text-red-600">-$10.00</span>
            </div>
          </div>
          <Button asChild variant="link" className="mt-4 w-full">
            <Link href="/payments">View All Payments</Link>
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
