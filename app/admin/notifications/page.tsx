"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc } from "firebase/firestore"
import DashboardLayout from "@/components/DashboardLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

const NOTIF_TYPES = [
  "announcement",
  "alert",
  "tournament_result",
  "tournament_complete",
  "payment",
]

const AUDIENCES = [
  { label: "All Users", value: "all" },
  { label: "Individuals", value: "individual" },
  { label: "Clubs", value: "club" },
  { label: "Organizations", value: "organization" },
]

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "announcement",
    link: "",
    audience: "all",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: any) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Fetch users by audience
      let usersSnap
      if (form.audience === "all") {
        usersSnap = await getDocs(collection(db, "users"))
      } else {
        usersSnap = await getDocs(collection(db, "users"))
        usersSnap = { docs: usersSnap.docs.filter((d) => d.data().userType === form.audience) }
      }
      const users = usersSnap.docs
      if (users.length === 0) throw new Error("No users found for this audience.")
      // Create notification for each user
      await Promise.all(
        users.map((u) =>
          addDoc(collection(db, "notifications"), {
            userId: u.id,
            type: form.type,
            title: form.title,
            body: form.body,
            link: form.link,
            createdAt: new Date(),
            read: false,
          })
        )
      )
      toast({ title: "Broadcast Sent!", description: `Notification sent to ${users.length} users.` })
      setForm({ title: "", body: "", type: "announcement", link: "", audience: "all" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Send Broadcast Notification</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Title</label>
            <Input name="title" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Body</label>
            <Textarea name="body" value={form.body} onChange={handleChange} required rows={3} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="border rounded px-2 py-1">
              {NOTIF_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Link (optional)</label>
            <Input name="link" value={form.link} onChange={handleChange} placeholder="/some/path" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Audience</label>
            <select name="audience" value={form.audience} onChange={handleChange} className="border rounded px-2 py-1">
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Sending..." : "Send Notification"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
} 