"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  Timestamp,
  getDocs,
  setDoc,
} from "firebase/firestore"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function TeamInvitationsPage() {
  const { user, userProfile } = useAuth()
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const qInv = query(
      collection(db, "teamInvitations"),
      where("userId", "==", user.uid),
      where("status", "==", "pending")
    )
    const unsub = onSnapshot(qInv, (snap) => {
      setInvitations(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const handleRespond = async (inv: any, accept: boolean) => {
    if (!user || !userProfile) return
    setRespondingId(inv.id)
    try {
      if (accept) {
        // Add to team's memberIds and teamMembers
        const teamRef = doc(db, "teams", inv.teamId)
        const teamSnap = await getDoc(teamRef)
        if (!teamSnap.exists()) throw new Error("Team not found")
        const team = teamSnap.data()
        const updatedMemberIds = Array.from(new Set([...(team.memberIds || []), user.uid]))
        const updatedAdminIds =
          inv.role === "admin"
            ? Array.from(new Set([...(team.adminIds || []), user.uid]))
            : team.adminIds || []
        await updateDoc(teamRef, {
          memberIds: updatedMemberIds,
          adminIds: updatedAdminIds,
          updatedAt: Timestamp.now(),
        })
        await addDoc(collection(db, "teamMembers"), {
          teamId: inv.teamId,
          userId: user.uid,
          role: inv.role,
          joinedAt: Timestamp.now(),
        })
        // Auto-join chat group
        const chatRoomQuery = query(
          collection(db, "chatRooms"),
          where("type", "==", "team"),
          where("teamId", "==", inv.teamId)
        )
        const chatRoomSnap = await getDocs(chatRoomQuery)
        if (!chatRoomSnap.empty) {
          // Add user to existing chat room
          const chatRoomDoc = chatRoomSnap.docs[0]
          const chatRoomData = chatRoomDoc.data()
          const newParticipants = Array.from(new Set([...(chatRoomData.participants || []), user.uid]))
          await updateDoc(doc(db, "chatRooms", chatRoomDoc.id), { participants: newParticipants })
        } else {
          // Create new chat room for the team
          await addDoc(collection(db, "chatRooms"), {
            name: team.name || "Team Chat",
            type: "team",
            teamId: inv.teamId,
            participants: updatedMemberIds,
            createdBy: team.ownerId,
            createdAt: Timestamp.now(),
            lastMessage: {
              senderId: user.uid,
              content: "Welcome to the team chat!",
              timestamp: Timestamp.now(),
              type: "text",
            },
          })
        }
        await updateDoc(doc(db, "teamInvitations", inv.id), { status: "accepted", respondedAt: Timestamp.now() })
        toast({ title: "Invitation Accepted!", description: `You have joined the team as a ${inv.role}.` })
      } else {
        await updateDoc(doc(db, "teamInvitations", inv.id), { status: "denied", respondedAt: Timestamp.now() })
        toast({ title: "Invitation Denied", description: "You have declined the team invitation." })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Team Invitations</h1>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No pending invitations.
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv) => (
              <Card key={inv.id}>
                <CardHeader>
                  <CardTitle>Invitation to Join Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><span className="font-medium">Team ID:</span> {inv.teamId}</div>
                  <div><span className="font-medium">Role:</span> {inv.role}</div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => handleRespond(inv, true)}
                      disabled={respondingId === inv.id}
                    >
                      {respondingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRespond(inv, false)}
                      disabled={respondingId === inv.id}
                    >
                      {respondingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deny"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 