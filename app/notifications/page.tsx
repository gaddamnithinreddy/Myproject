"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import DashboardLayout from "@/components/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { Bell } from "lucide-react"

const NOTIF_TYPES = [
  "all",
  "team_invite",
  "team_removed",
  "schedule",
  "schedule_update",
  "schedule_cancel",
  "tournament_registration",
  "tournament_approval",
  "tournament_rejection",
  "tournament_result",
  "tournament_complete",
  "direct_message",
  "chat_mention",
  "payment",
  "announcement",
  "alert",
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!user) return
    const fetchNotifications = async () => {
      setLoading(true)
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
      const snap = await getDocs(q)
      setNotifications(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    }
    fetchNotifications()
  }, [user])

  const filtered = notifications.filter((n) => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false
    if (readFilter === "unread" && n.read) return false
    if (readFilter === "read" && !n.read) return false
    if (search && !(`${n.title} ${n.body}`.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const handleMarkRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <div className="flex gap-2 mb-4">
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList>
              {NOTIF_TYPES.map((type) => (
                <TabsTrigger key={type} value={type} className="capitalize">
                  {type.replace(/_/g, " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-8"><Bell className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Bell className="h-8 w-8 opacity-30 mx-auto mb-2" />
            No notifications found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div key={n.id} className={`p-4 rounded border flex flex-col gap-1 ${!n.read ? "bg-primary/10 border-primary" : "bg-background"}`}>
                <div className="flex justify-between items-center">
                  <div className="font-medium">{n.title}</div>
                  {!n.read && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkRead(n.id)}>Mark as read</Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{n.body}</div>
                <div className="text-xs text-muted-foreground">{n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ""}</div>
                {n.link && (
                  <a href={n.link} className="text-xs text-blue-600 underline mt-1">View</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 