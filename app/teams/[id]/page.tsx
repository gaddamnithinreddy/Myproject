"use client"

import Link from "next/link"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, onSnapshot, collection, query, where, addDoc, Timestamp, updateDoc, getDocs, orderBy, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParams } from "next/navigation"
import { Users, User, Crown, Shield, Mail, Phone, Loader2, Plus, MapPin, ExternalLink, Star } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import MapView from "@/components/MapView"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { createNotification } from "@/lib/notifications"

interface Team {
  id: string
  name: string
  sport: string
  description?: string
  ownerId: string
  adminIds: string[]
  memberIds: string[]
  type: "club" | "organization" | "individual"
  maxMembers?: number
  createdAt: Timestamp
  location?: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }
  icon?: string
  status?: string
  ageGroup?: string
}

interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  profilePicture?: string
  mobileNumber?: string
  role: string
}

// Extend TeamMember interface
interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: "player" | "captain" | "vice-captain" | "coach" | "admin" | "owner" | "helper"
  joinedAt: Timestamp
  jerseyNumber?: string
  skills?: string
  memberStatus?: "active" | "inactive"
  guardianInfo?: {
    name: string
    phone: string
    relationship: string
  }
}

export default function TeamDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<UserProfile[]>([])
  const [teamMemberships, setTeamMemberships] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"player" | "captain" | "vice-captain" | "coach" | "admin" | "helper">("player")
  const [potentialNewMember, setPotentialNewMember] = useState<UserProfile | null>(null)
  const [searchingUser, setSearchingUser] = useState(false)
  // Add state for editing member
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [editFields, setEditFields] = useState({ 
    jerseyNumber: "", 
    skills: "", 
    memberStatus: "active" as "active" | "inactive",
    guardianName: "",
    guardianPhone: "",
    guardianRelationship: ""
  })
  const [schedules, setSchedules] = useState<any[]>([])
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    date: "",
    time: "",
    courtNumber: "",
    scheduleType: "practice" as "practice" | "game",
    status: "tentative" as "tentative" | "confirmed" | "cancelled",
    address: "",
    coordinates: { lat: 0, lng: 0 },
    description: "",
  })
  const [roleEditMember, setRoleEditMember] = useState<TeamMember | null>(null)
  const [roleEditNewRole, setRoleEditNewRole] = useState<"player" | "captain" | "vice-captain" | "coach" | "admin" | "owner" | "helper">("player")

  useEffect(() => {
    if (!teamId) {
      setLoading(false)
      return
    }

    let unsubscribeTeam: (() => void) | null = null
    let unsubscribeUsers: (() => void) | null = null
    let unsubscribeMemberships: (() => void) | null = null

    const setupTeamListener = async () => {
      try {
        const teamDocRef = doc(db, "teams", teamId)
        unsubscribeTeam = onSnapshot(teamDocRef, async (docSnap) => {
          try {
            if (docSnap.exists()) {
              const data = docSnap.data()
              const teamData = { id: docSnap.id, ...(data as Record<string, any> || {}) } as Team
              setTeam(teamData)

              // Fetch members' profiles
              if (teamData.memberIds && teamData.memberIds.length > 0) {
                try {
                  const usersQuery = query(collection(db, "users"), where("uid", "in", teamData.memberIds))
                  unsubscribeUsers = onSnapshot(usersQuery, (userSnap) => {
                    const fetchedUsers = userSnap.docs.map((d) => ({
                      uid: d.id,
                      ...d.data(),
                    })) as UserProfile[]
                    setMembers(fetchedUsers)
                    setLoading(false)
                  }, (error) => {
                    console.error("Error loading team members:", error)
                    setMembers([])
                    setLoading(false)
                    toast({
                      title: "Error loading team members",
                      description: error.message,
                      variant: "destructive",
                    })
                  })
                } catch (error: any) {
                  console.error("Error setting up users listener:", error)
                  setMembers([])
                  setLoading(false)
                  toast({
                    title: "Error loading team members",
                    description: error.message,
                    variant: "destructive",
                  })
                }
              } else {
                setMembers([])
                setLoading(false)
              }

              // Fetch team memberships (roles)
              try {
                const teamMembershipsQuery = query(collection(db, "teamMembers"), where("teamId", "==", teamId))
                unsubscribeMemberships = onSnapshot(teamMembershipsQuery, (membershipSnap) => {
                  const fetchedMemberships = membershipSnap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                  })) as TeamMember[]
                  setTeamMemberships(fetchedMemberships)
                }, (error) => {
                  console.error("Error loading team memberships:", error)
                  setTeamMemberships([])
                  toast({
                    title: "Error loading team memberships",
                    description: error.message,
                    variant: "destructive",
                  })
                })
              } catch (error: any) {
                console.error("Error setting up memberships listener:", error)
                setTeamMemberships([])
                toast({
                  title: "Error loading team memberships",
                  description: error.message,
                  variant: "destructive",
                })
              }
            } else {
              setTeam(null)
              setMembers([])
              setTeamMemberships([])
              setLoading(false)
            }
          } catch (error: any) {
            console.error("Error processing team data:", error)
            setTeam(null)
            setMembers([])
            setTeamMemberships([])
            setLoading(false)
            toast({
              title: "Error loading team",
              description: error.message,
              variant: "destructive",
            })
          }
        }, (error) => {
          console.error("Error in team snapshot:", error)
          setTeam(null)
          setMembers([])
          setTeamMemberships([])
          setLoading(false)
          toast({
            title: "Error loading team",
            description: error.message,
            variant: "destructive",
          })
        })
      } catch (error: any) {
        console.error("Error setting up team listener:", error)
        setTeam(null)
        setMembers([])
        setTeamMemberships([])
        setLoading(false)
        toast({
          title: "Error loading team",
          description: error.message,
          variant: "destructive",
        })
      }
    }

    setupTeamListener()

    return () => {
      if (unsubscribeTeam) unsubscribeTeam()
      if (unsubscribeUsers) unsubscribeUsers()
      if (unsubscribeMemberships) unsubscribeMemberships()
    }
  }, [teamId])

  // Fetch schedules for this team
  useEffect(() => {
    if (!teamId) return
    const q = query(collection(db, "events"), where("teamId", "==", teamId), orderBy("date", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [teamId])

  const getMemberRole = (memberUid: string) => {
    const membership = teamMemberships.find((m) => m.userId === memberUid)
    return membership?.role || "player" // Default to player if not found
  }

  const isTeamAdmin = (team: Team | null) => {
    if (!user || !team) return false
    return team.ownerId === user.uid || team.adminIds?.includes(user.uid)
  }

  const handleSearchUser = async () => {
    if (!newMemberEmail) return
    setSearchingUser(true)
    setPotentialNewMember(null)
    try {
      const usersCollectionRef = collection(db, "users")
      const q = query(usersCollectionRef, where("email", "==", newMemberEmail))
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0]
        const userData = { uid: docSnap.id, ...docSnap.data() } as UserProfile
        setPotentialNewMember(userData)
      } else {
        toast({
          title: "User Not Found",
          description: "No user found with that email address.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error Searching User",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSearchingUser(false)
    }
  }

  // When opening edit modal, prefill fields
  const openEditModal = (member: TeamMember) => {
    setEditMember(member)
    setEditFields({
      jerseyNumber: member.jerseyNumber || "",
      skills: member.skills || "",
      memberStatus: member.memberStatus || "active",
      guardianName: member.guardianInfo?.name || "",
      guardianPhone: member.guardianInfo?.phone || "",
      guardianRelationship: member.guardianInfo?.relationship || ""
    })
  }

  // Save member edits
  const handleSaveMember = async () => {
    if (!editMember) return
    try {
      const updateData: any = {
        jerseyNumber: editFields.jerseyNumber,
        skills: editFields.skills,
        memberStatus: editFields.memberStatus,
      }
      
      // Add guardian info if provided
      if (editFields.guardianName || editFields.guardianPhone || editFields.guardianRelationship) {
        updateData.guardianInfo = {
          name: editFields.guardianName,
          phone: editFields.guardianPhone,
          relationship: editFields.guardianRelationship
        }
      }
      
      await updateDoc(doc(db, "teamMembers", editMember.id), updateData)
      toast({ title: "Member updated!" })
      setEditMember(null)
    } catch (error: any) {
      toast({ title: "Error updating member", description: error.message, variant: "destructive" })
    }
  }

  const handleAddMember = async () => {
    if (!team || !potentialNewMember || !user) return

    setLoading(true)
    try {
      // Create a pending invitation
      await addDoc(collection(db, "teamInvitations"), {
        teamId: team.id,
        userId: potentialNewMember.uid,
        email: potentialNewMember.email,
        role: newMemberRole,
        status: "pending",
        invitedBy: user.uid,
        invitedAt: Timestamp.now(),
      })
      // Notify the new member
      await createNotification({
        userId: potentialNewMember.uid,
        type: "team_invite",
        title: `Team Invitation: ${team.name}`,
        body: `You have been invited to join the team '${team.name}' as a ${newMemberRole}. Approve or deny the invitation in your notifications.`,
        data: { teamId: team.id },
        link: `/teams/invitations`,
      })
      toast({
        title: "Invitation Sent!",
        description: `${potentialNewMember.firstName} ${potentialNewMember.lastName} has been invited to join ${team.name}.`,
      })
      setShowAddMemberModal(false)
      setNewMemberEmail("")
      setPotentialNewMember(null)
      setNewMemberRole("player")
      setEditFields({ 
        jerseyNumber: "", 
        skills: "", 
        memberStatus: "active",
        guardianName: "",
        guardianPhone: "",
        guardianRelationship: ""
      })
    } catch (error: any) {
      toast({
        title: "Error Sending Invitation",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Remove member handler (add this function if not present)
  const handleRemoveMember = async (memberUid: string) => {
    if (!team || !user) return
    try {
      // Remove from team's memberIds
      const updatedMemberIds = team.memberIds.filter((id) => id !== memberUid)
      const updatedAdminIds = team.adminIds.filter((id) => id !== memberUid)
      await updateDoc(doc(db, "teams", team.id), {
        memberIds: updatedMemberIds,
        adminIds: updatedAdminIds,
        updatedAt: Timestamp.now(),
      })
      // Remove from teamMembers collection
      const q = query(collection(db, "teamMembers"), where("teamId", "==", team.id), where("userId", "==", memberUid))
      const snap = await getDocs(q)
      snap.forEach((d: any) => deleteDoc(doc(db, "teamMembers", d.id)))
      // Notify the removed member
      await createNotification({
        userId: memberUid,
        type: "team_removed",
        title: `Removed from Team: ${team.name}`,
        body: `You have been removed from the team '${team.name}'.`,
        link: "/teams",
      })
      toast({ title: "Member Removed!" })
    } catch (error: any) {
      toast({ title: "Error Removing Member", description: error.message, variant: "destructive" })
    }
  }

  // Add schedule handler
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !team) return
    await addDoc(collection(db, "events"), {
      teamId: team.id,
      userId: user.uid,
      title: newSchedule.title,
      date: Timestamp.fromDate(new Date(newSchedule.date)),
      time: newSchedule.time,
      courtNumber: newSchedule.courtNumber,
      scheduleType: newSchedule.scheduleType,
      status: newSchedule.status,
      location: {
        address: newSchedule.address,
        coordinates: newSchedule.coordinates,
      },
      description: newSchedule.description,
      rsvp: {},
      videoUrl: "",
      createdAt: Timestamp.now(),
    })
    // Notify all team members except the creator
    if (team.memberIds && Array.isArray(team.memberIds)) {
      const notifyPromises = team.memberIds
        .filter((uid) => uid !== user.uid)
        .map((uid) =>
          createNotification({
            userId: uid,
            type: "schedule",
            title: `New Schedule: ${newSchedule.title}`,
            body: `A new schedule has been added for your team '${team.name}'.`,
            data: { teamId: team.id },
            link: `/teams/${team.id}`,
          })
        )
      await Promise.all(notifyPromises)
    }
    setShowAddSchedule(false)
    setNewSchedule({
      title: "",
      date: "",
      time: "",
      courtNumber: "",
      scheduleType: "practice",
      status: "tentative",
      address: "",
      coordinates: { lat: 0, lng: 0 },
      description: "",
    })
  }

  // Update schedule handler (add this function if not present)
  const handleUpdateSchedule = async (eventId: string, updatedFields: any) => {
    if (!team || !user) return
    try {
      await updateDoc(doc(db, "events", eventId), updatedFields)
      // Notify all team members except the updater
      if (team.memberIds && Array.isArray(team.memberIds)) {
        const notifyPromises = team.memberIds
          .filter((uid) => uid !== user.uid)
          .map((uid) =>
            createNotification({
              userId: uid,
              type: "schedule_update",
              title: `Schedule Updated: ${updatedFields.title || "Event"}`,
              body: `A schedule has been updated for your team '${team.name}'.`,
              data: { teamId: team.id, eventId },
              link: `/teams/${team.id}`,
            })
          )
        await Promise.all(notifyPromises)
      }
      toast({ title: "Schedule Updated!" })
    } catch (error: any) {
      toast({ title: "Error Updating Schedule", description: error.message, variant: "destructive" })
    }
  }

  // Cancel schedule handler (add this function if not present)
  const handleCancelSchedule = async (eventId: string) => {
    if (!team || !user) return
    try {
      await updateDoc(doc(db, "events", eventId), { status: "cancelled" })
      // Notify all team members except the canceller
      if (team.memberIds && Array.isArray(team.memberIds)) {
        const notifyPromises = team.memberIds
          .filter((uid) => uid !== user.uid)
          .map((uid) =>
            createNotification({
              userId: uid,
              type: "schedule_cancel",
              title: `Schedule Cancelled`,
              body: `A schedule has been cancelled for your team '${team.name}'.`,
              data: { teamId: team.id, eventId },
              link: `/teams/${team.id}`,
            })
          )
        await Promise.all(notifyPromises)
      }
      toast({ title: "Schedule Cancelled!" })
    } catch (error: any) {
      toast({ title: "Error Cancelling Schedule", description: error.message, variant: "destructive" })
    }
  }

  const handleChangeMemberRole = async () => {
    if (!roleEditMember || !team) return
    if (roleEditNewRole === "owner") {
      // Only owner can transfer ownership
      if (user?.uid !== team.ownerId) {
        toast({ title: "Only the owner can transfer ownership." })
        return
      }
      // Transfer ownership
      await updateDoc(doc(db, "teams", team.id), {
        ownerId: roleEditMember.userId,
        adminIds: Array.from(new Set([...(team.adminIds || []), roleEditMember.userId])).filter(id => id !== team.ownerId),
        updatedAt: Timestamp.now(),
      })
      await updateDoc(doc(db, "teamMembers", roleEditMember.id), { role: "owner" })
      // Demote previous owner to admin
      const prevOwnerMembership = teamMemberships.find(m => m.userId === team.ownerId)
      if (prevOwnerMembership) {
        await updateDoc(doc(db, "teamMembers", prevOwnerMembership.id), { role: "admin" })
      }
      toast({ title: "Ownership transferred!" })
    } else {
      // Only owner can promote/demote admins
      if ((roleEditMember.role === "admin" || roleEditNewRole === "admin") && user?.uid !== team.ownerId) {
        toast({ title: "Only the owner can manage admins." })
        return
      }
      await updateDoc(doc(db, "teamMembers", roleEditMember.id), { role: roleEditNewRole })
      // Update adminIds in team doc
      let newAdminIds = team.adminIds || []
      if (roleEditNewRole === "admin") {
        newAdminIds = Array.from(new Set([...newAdminIds, roleEditMember.userId]))
      } else {
        newAdminIds = newAdminIds.filter(id => id !== roleEditMember.userId)
      }
      await updateDoc(doc(db, "teams", team.id), { adminIds: newAdminIds, updatedAt: Timestamp.now() })
      toast({ title: "Role updated!" })
    }
    setRoleEditMember(null)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6 lg:p-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-full mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!team && !loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Users className="h-16 w-16 mb-4" />
          <p className="text-lg">Team not found or failed to load.</p>
          <p className="text-sm">Please check the URL or go back to your teams list.</p>
          <Button className="mt-4" asChild>
            <Link href="/teams">Back to Teams</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={team?.icon || "/placeholder.svg"} alt={team?.name} />
              <AvatarFallback>{team?.name?.[0]}</AvatarFallback>
            </Avatar>
          <div>
              <h1 className="text-2xl font-bold">{team?.name}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="capitalize">{team?.status || "active"}</Badge>
                <Badge variant="secondary" className="capitalize">{team?.type}</Badge>
                {team?.ageGroup && <Badge variant="secondary">{team.ageGroup}</Badge>}
              </div>
              <p className="text-gray-600 mt-1">{team?.sport} Team</p>
            </div>
          </div>
          {isTeamAdmin(team) && (
            <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                  <DialogDescription>Search for a user by email and add them to the team.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberEmail">Member Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="memberEmail"
                        type="email"
                        placeholder="user@example.com"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                      />
                      <Button onClick={handleSearchUser} disabled={searchingUser || !newMemberEmail}>
                        {searchingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                      </Button>
                    </div>
                  </div>
                  {potentialNewMember && (
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={potentialNewMember.profilePicture || "/placeholder.svg"} />
                          <AvatarFallback>
                            {potentialNewMember.firstName?.[0]}
                            {potentialNewMember.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {potentialNewMember.firstName} {potentialNewMember.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{potentialNewMember.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="memberRole">Role</Label>
                        <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="player">Player</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="jerseyNumber">Jersey Number</Label>
                        <Input id="jerseyNumber" value={editFields.jerseyNumber} onChange={e => setEditFields(f => ({ ...f, jerseyNumber: e.target.value }))} />
                      </div>
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="skills">Skills/Positions</Label>
                        <Input id="skills" value={editFields.skills} onChange={e => setEditFields(f => ({ ...f, skills: e.target.value }))} placeholder="e.g., Forward, Defense" />
                      </div>
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="memberStatus">Status</Label>
                        <Select value={editFields.memberStatus} onValueChange={v => setEditFields(f => ({ ...f, memberStatus: v as "active" | "inactive" }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddMember} className="w-full mt-4" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Member to Team"}
                      </Button>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sport</p>
                  <p className="text-lg font-semibold">{team?.sport}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-lg font-semibold capitalize">{team?.type}</p>
                </div>
              </div>
              {team?.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base">{team?.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Members</p>
                  <p className="text-lg font-semibold">
                    {team?.memberIds.length} {team?.maxMembers ? `/ ${team?.maxMembers}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created On</p>
                  <p className="text-lg font-semibold">{team?.createdAt.toDate().toLocaleDateString()}</p>
                </div>
              </div>
              {team?.location && team.location.coordinates.lat !== 0 && team.location.coordinates.lng !== 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Home Location</p>
                  <div className="flex items-center gap-1 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {team?.location.address}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" size="sm" className="h-auto p-0 ml-2">
                          View on Map
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[500px]">
                        <DialogHeader>
                          <DialogTitle>Team Location</DialogTitle>
                        </DialogHeader>
                        <MapView
                          coordinates={team.location.coordinates}
                          zoom={14}
                          className="h-[400px] w-full"
                          address={team.location.address}
                          name={team.name}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {members.length > 0 ? (
                members.map((member) => {
                  const membership = teamMemberships.find((m) => m.userId === member.uid)
                  return (
                  <div key={member.uid} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.profilePicture || "/placeholder.svg"} />
                      <AvatarFallback>
                        {member.firstName?.[0]}
                        {member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {getMemberRole(member.uid) === "owner" && <Crown className="h-4 w-4 text-yellow-500" />}
                        {getMemberRole(member.uid) === "captain" && <Star className="h-4 w-4 text-blue-500" />}
                        {getMemberRole(member.uid) === "vice-captain" && <Shield className="h-4 w-4 text-green-500" />}
                        {getMemberRole(member.uid) === "admin" && <Shield className="h-4 w-4 text-purple-500" />}
                        {getMemberRole(member.uid) === "coach" && <User className="h-4 w-4 text-blue-500" />}
                        {getMemberRole(member.uid) === "helper" && <User className="h-4 w-4 text-orange-500" />}
                        {getMemberRole(member.uid) === "player" && <User className="h-4 w-4 text-gray-500" />}
                        <span className="capitalize">{getMemberRole(member.uid)}</span>
                      </p>
                        {/* Roster details */}
                        <div className="flex flex-wrap gap-2 mt-1 text-xs">
                          {membership?.jerseyNumber && <Badge variant="outline">Jersey: {membership.jerseyNumber}</Badge>}
                          {membership?.skills && <Badge variant="secondary">Skills: {membership.skills}</Badge>}
                          <Badge variant={membership?.memberStatus === "inactive" ? "destructive" : "outline"}>{membership?.memberStatus || "active"}</Badge>
                          {membership?.guardianInfo && (
                            <Badge variant="outline" className="text-xs">
                              Guardian: {membership.guardianInfo.name}
                            </Badge>
                          )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {team && isTeamAdmin(team) && membership && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditModal(membership)}>Edit</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRoleEditMember(membership); setRoleEditNewRole(membership.role) }}>Change Role</Button>
                            {roleEditMember && roleEditMember.id === membership.id && (
                              <Dialog open={!!roleEditMember} onOpenChange={v => { if (!v) setRoleEditMember(null) }}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Change Role</DialogTitle>
                                    <DialogDescription>Change the role for this member.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    <Label htmlFor="newRole">New Role</Label>
                                    <Select value={roleEditNewRole} onValueChange={v => setRoleEditNewRole(v as any)}>
                                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="player">Player</SelectItem>
                                        <SelectItem value="captain">Captain</SelectItem>
                                        <SelectItem value="vice-captain">Vice Captain</SelectItem>
                                        <SelectItem value="coach">Coach</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="helper">Helper</SelectItem>
                                        {user?.uid === team.ownerId && <SelectItem value="owner">Owner</SelectItem>}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2 justify-end mt-4">
                                    <Button variant="outline" onClick={() => setRoleEditMember(null)}>Cancel</Button>
                                    <Button onClick={handleChangeMemberRole}>Save</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </>
                        )}
                      {member.email && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`mailto:${member.email}`}>
                            <Mail className="h-4 w-4" />
                            <span className="sr-only">Email</span>
                          </a>
                        </Button>
                      )}
                      {member.mobileNumber && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`tel:${member.mobileNumber}`}>
                            <Phone className="h-4 w-4" />
                            <span className="sr-only">Call</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  )
                })
              ) : (
                <p className="text-center text-muted-foreground">No members yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Schedule Section */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule</CardTitle>
            {isTeamAdmin(team) && (
              <Button size="sm" onClick={() => setShowAddSchedule(true)}>Add Schedule</Button>
            )}
          </CardHeader>
          <CardContent>
            {schedules.length === 0 && <p className="text-muted-foreground">No schedules for this team.</p>}
            {schedules.map(ev => (
              <div key={ev.id} className="mb-4 border-b pb-2">
                <div className="font-medium">{ev.title}</div>
                <div className="text-xs">{ev.date?.toDate ? ev.date.toDate().toLocaleDateString() : ev.date}</div>
                <div className="text-xs">{ev.time}</div>
                <div className="text-xs">{ev.scheduleType} | {ev.status}</div>
                <div className="text-xs">{ev.courtNumber && `Court: ${ev.courtNumber}`}</div>
                <div className="text-xs">{ev.location?.address}</div>
                <div className="text-xs">{ev.description}</div>
                {ev.videoUrl && <video src={ev.videoUrl} controls className="w-full max-w-xs mt-2 rounded" />}
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Add Schedule Modal */}
        {showAddSchedule && (
          <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Schedule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <Label>Title</Label>
                <Input value={newSchedule.title} onChange={e => setNewSchedule(s => ({ ...s, title: e.target.value }))} required />
                <Label>Date</Label>
                <Input type="date" value={newSchedule.date} onChange={e => setNewSchedule(s => ({ ...s, date: e.target.value }))} required />
                <Label>Time</Label>
                <Input type="time" value={newSchedule.time} onChange={e => setNewSchedule(s => ({ ...s, time: e.target.value }))} required />
                <Label>Court Number</Label>
                <Input value={newSchedule.courtNumber} onChange={e => setNewSchedule(s => ({ ...s, courtNumber: e.target.value }))} />
                <Label>Type</Label>
                <select value={newSchedule.scheduleType} onChange={e => setNewSchedule(s => ({ ...s, scheduleType: e.target.value as "practice" | "game" }))}>
                  <option value="practice">Practice</option>
                  <option value="game">Game</option>
                </select>
                <Label>Status</Label>
                <select value={newSchedule.status} onChange={e => setNewSchedule(s => ({ ...s, status: e.target.value as "tentative" | "confirmed" | "cancelled" }))}>
                  <option value="tentative">Tentative</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Label>Location</Label>
                <Input value={newSchedule.address} onChange={e => setNewSchedule(s => ({ ...s, address: e.target.value }))} required />
                {/* MapPicker integration can be added here */}
                <Label>Description</Label>
                <Textarea value={newSchedule.description} onChange={e => setNewSchedule(s => ({ ...s, description: e.target.value }))} />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
                  <Button type="submit">Add</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {/* Edit Member Modal */}
      {editMember && (
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input id="jerseyNumber" value={editFields.jerseyNumber} onChange={e => setEditFields(f => ({ ...f, jerseyNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills/Positions</Label>
                <Input id="skills" value={editFields.skills} onChange={e => setEditFields(f => ({ ...f, skills: e.target.value }))} placeholder="e.g., Forward, Defense" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberStatus">Status</Label>
                <Select value={editFields.memberStatus} onValueChange={v => setEditFields(f => ({ ...f, memberStatus: v as "active" | "inactive" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Guardian Information (Optional)</Label>
                <Input 
                  placeholder="Guardian Name" 
                  value={editFields.guardianName} 
                  onChange={e => setEditFields(f => ({ ...f, guardianName: e.target.value }))} 
                />
                <Input 
                  placeholder="Guardian Phone" 
                  value={editFields.guardianPhone} 
                  onChange={e => setEditFields(f => ({ ...f, guardianPhone: e.target.value }))} 
                />
                <Input 
                  placeholder="Relationship" 
                  value={editFields.guardianRelationship} 
                  onChange={e => setEditFields(f => ({ ...f, guardianRelationship: e.target.value }))} 
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                <Button onClick={handleSaveMember}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}
