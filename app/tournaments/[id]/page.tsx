"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MapPin, Calendar, Users, Trophy, Clock, Mail, Trash2, Edit, Plus, CheckCircle, XCircle, Star } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { createNotification } from "@/lib/notifications"
import DashboardLayout from "@/components/DashboardLayout"

interface Tournament {
  id: string
  name: string
  sport: string
  startDate: any
  endDate: any
  location: string | {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }
  description: string
  type: 'public' | 'private'
  level: string
  ageGroup: string
  gender: string
  registrationDeadline: any
  maxTeams: number
  entryFee: number
  prizePool: number
  organizerId: string
  organizerName: string
  contactInfo: {
    email: string
    phone: string
  }
  status: 'draft' | 'open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: any
  brochure?: string
}

interface TournamentRegistration {
  id: string
  tournamentId: string
  teamId: string
  teamName: string
  teamSport: string
  registeredAt: any
  status: 'pending' | 'approved' | 'rejected'
  approvalNotes?: string
  paymentStatus: 'pending' | 'paid' | 'refunded'
}

interface TournamentMatch {
  id: string
  tournamentId: string
  team1Id: string
  team1Name: string
  team2Id: string
  team2Name: string
  round: number
  matchNumber: number
  scheduledDate: any
  scheduledTime: string
  court: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  winnerId?: string
  winnerName?: string
  score?: {
    team1: number
    team2: number
  }
  notes?: string
  createdAt: any
}

export default function TournamentDetail() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<TournamentRegistration | null>(null)
  const [newMatch, setNewMatch] = useState({
    team1Id: "",
    team2Id: "",
    round: 1,
    scheduledDate: "",
    scheduledTime: "",
    court: "",
    notes: ""
  })
  const [inviteEmail, setInviteEmail] = useState("")
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'rejected'>('approved')
  const [approvalNotes, setApprovalNotes] = useState("")
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (id && user) {
      fetchTournament()
      fetchRegistrations()
      fetchMatches()
    }
  }, [id, user])

  const fetchTournament = async () => {
    try {
      setLoading(true)
      const tournamentDoc = await getDoc(doc(db, "tournaments", id as string))
      
      if (tournamentDoc.exists()) {
        const tournamentData = tournamentDoc.data() as Tournament
        setTournament(tournamentData)
      } else {
        setError("Tournament not found")
      }
    } catch (err) {
      setError("Failed to load tournament")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrations = async () => {
    try {
      const registrationsQuery = query(
        collection(db, "tournamentRegistrations"), 
        where("tournamentId", "==", id),
        orderBy("registeredAt", "desc")
      )
      const registrationsSnapshot = await getDocs(registrationsQuery)
      const registrationsData = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TournamentRegistration[]
      setRegistrations(registrationsData)
    } catch (err) {
      console.error("Failed to load registrations:", err)
    }
  }

  const fetchMatches = async () => {
    try {
      const matchesQuery = query(
        collection(db, "tournamentMatches"), 
        where("tournamentId", "==", id),
        orderBy("scheduledDate", "asc")
      )
      const matchesSnapshot = await getDocs(matchesQuery)
      const matchesData = matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TournamentMatch[]
      setMatches(matchesData)
    } catch (err) {
      console.error("Failed to load matches:", err)
    }
  }

  const handleCreateMatch = async () => {
    if (!tournament || !newMatch.team1Id || !newMatch.team2Id) return
    
    try {
      setScheduleLoading(true)
      
      const team1 = registrations.find(r => r.teamId === newMatch.team1Id)
      const team2 = registrations.find(r => r.teamId === newMatch.team2Id)
      
      if (!team1 || !team2) {
        toast({
          title: "Invalid teams",
          description: "Please select valid teams for the match",
          variant: "destructive"
        })
      return
    }

      const matchData = {
        tournamentId: tournament.id,
        team1Id: newMatch.team1Id,
        team1Name: team1.teamName,
        team2Id: newMatch.team2Id,
        team2Name: team2.teamName,
        round: newMatch.round,
        matchNumber: matches.length + 1,
        scheduledDate: serverTimestamp(),
        scheduledTime: newMatch.scheduledTime,
        court: newMatch.court,
        status: 'scheduled' as const,
        notes: newMatch.notes,
        createdAt: serverTimestamp()
      }
      
      await addDoc(collection(db, "tournamentMatches"), matchData)
      
      // Notify both teams
      await Promise.all([
        createNotification({
          userId: team1.teamId, // This should be team owner ID
          type: "tournament_match",
          title: `New Match Scheduled: ${tournament.name}`,
          body: `Your team ${team1.teamName} will play against ${team2.teamName} on ${newMatch.scheduledDate} at ${newMatch.scheduledTime}`,
          data: { tournamentId: tournament.id, matchId: "new" },
          link: `/tournaments/${tournament.id}`
        }),
        createNotification({
          userId: team2.teamId, // This should be team owner ID
          type: "tournament_match",
          title: `New Match Scheduled: ${tournament.name}`,
          body: `Your team ${team2.teamName} will play against ${team1.teamName} on ${newMatch.scheduledDate} at ${newMatch.scheduledTime}`,
          data: { tournamentId: tournament.id, matchId: "new" },
          link: `/tournaments/${tournament.id}`
        })
      ])
      
      toast({
        title: "Match scheduled",
        description: "Match has been created and teams have been notified"
      })
      
      setShowScheduleModal(false)
      setNewMatch({
        team1Id: "",
        team2Id: "",
        round: 1,
        scheduledDate: "",
        scheduledTime: "",
        court: "",
        notes: ""
      })
      fetchMatches()
      
    } catch (err) {
      toast({
        title: "Failed to schedule match",
        description: "Please try again",
        variant: "destructive"
      })
      console.error(err)
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleUpdateMatch = async (matchId: string, updatedFields: Partial<TournamentMatch>) => {
    try {
      await updateDoc(doc(db, "tournamentMatches", matchId), updatedFields)
      toast({
        title: "Match updated",
        description: "Match information has been updated"
      })
      fetchMatches()
    } catch (err) {
      toast({
        title: "Failed to update match",
        description: "Please try again",
        variant: "destructive"
      })
      console.error(err)
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    try {
      setDeleteLoading(true)
      await deleteDoc(doc(db, "tournamentMatches", matchId))
      toast({
        title: "Match deleted",
        description: "Match has been removed from the tournament"
      })
      fetchMatches()
    } catch (err) {
      toast({
        title: "Failed to delete match",
        description: "Please try again",
        variant: "destructive"
      })
      console.error(err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!tournament || !inviteEmail.trim()) return
    
    try {
      setInviteLoading(true)
      
      // Check if user exists
      const usersQuery = query(collection(db, "users"), where("email", "==", inviteEmail))
      const userSnapshot = await getDocs(usersQuery)
      
      if (userSnapshot.empty) {
        toast({
          title: "User not found",
          description: "This email is not registered in our system.",
          variant: "destructive"
        })
        return
      }
      
      const invitedUser = userSnapshot.docs[0]
      
      // Create tournament invitation
      const invitationData = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        invitedUserId: invitedUser.id,
        invitedUserEmail: inviteEmail,
        invitedBy: user?.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      }
      
      await addDoc(collection(db, "tournamentInvitations"), invitationData)

      // Send notification
      await createNotification({
        userId: invitedUser.id,
        type: "tournament_invite",
        title: `Tournament Invitation: ${tournament.name}`,
        body: `You have been invited to participate in the tournament '${tournament.name}'. Check your notifications to register.`,
        data: { tournamentId: tournament.id },
        link: `/tournaments/${tournament.id}`
      })
      
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail}`
      })
      
      setShowInviteModal(false)
      setInviteEmail("")
      
    } catch (err) {
      toast({
        title: "Failed to send invitation",
        description: "Please try again",
        variant: "destructive"
      })
      console.error(err)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleReviewRegistration = async () => {
    if (!selectedRegistration) return
    
    try {
      setReviewLoading(true)
      
      await updateDoc(doc(db, "tournamentRegistrations", selectedRegistration.id), {
        status: approvalStatus,
        approvalNotes: approvalNotes,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid
      })
      
      // Notify team about the decision
      await createNotification({
        userId: selectedRegistration.teamId, // This should be team owner ID
        type: "tournament_registration",
        title: `Tournament Registration ${approvalStatus === 'approved' ? 'Approved' : 'Rejected'}: ${tournament?.name}`,
        body: `Your registration for ${tournament?.name} has been ${approvalStatus}. ${approvalNotes ? `Notes: ${approvalNotes}` : ''}`,
        data: { tournamentId: tournament?.id },
        link: `/tournaments/${tournament?.id}`
      })
      
      toast({
        title: `Registration ${approvalStatus}`,
        description: `Team has been notified of the decision`
      })
      
      setShowReviewModal(false)
      setSelectedRegistration(null)
      setApprovalStatus('approved')
      setApprovalNotes("")
      fetchRegistrations()
      
    } catch (err) {
      toast({
        title: "Failed to review registration",
        description: "Please try again",
        variant: "destructive"
      })
      console.error(err)
    } finally {
      setReviewLoading(false)
    }
  }

  const handleDeleteTournament = async () => {
    if (!tournament) return
    
    try {
      setDeleteLoading(true)
      
      // Delete all related data
      await Promise.all([
        deleteDoc(doc(db, "tournaments", tournament.id)),
        // Delete registrations
        ...registrations.map(r => deleteDoc(doc(db, "tournamentRegistrations", r.id))),
        // Delete matches
        ...matches.map(m => deleteDoc(doc(db, "tournamentMatches", m.id)))
      ])
      
      toast({
        title: "Tournament deleted",
        description: "Tournament and all related data have been removed"
      })
      
      router.push("/tournaments")
      
    } catch (err) {
      toast({
        title: "Failed to delete tournament",
        description: "Please try again",
        variant: "destructive"
      })
      console.error(err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'open': return 'bg-green-100 text-green-800'
      case 'registration_closed': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-8 w-8" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !tournament) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <p className="text-muted-foreground">{error || "Tournament not found"}</p>
            <Button onClick={() => router.push("/tournaments")} className="mt-4">
              Back to Tournaments
          </Button>
        </div>
        </div>
      </DashboardLayout>
    )
  }

  const isOrganizer = user?.uid === tournament.organizerId
  const approvedTeams = registrations.filter(r => r.status === 'approved')

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-6xl">
      {/* Tournament Header */}
      <Card className="mb-6">
              <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="/placeholder-logo.png" />
                <AvatarFallback>
                  <Trophy className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {typeof tournament.location === 'string' ? tournament.location : tournament.location?.address || 'Location not specified'}
                    </span>
                  <Badge className={getStatusColor(tournament.status)}>
                    {tournament.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </CardDescription>
                  </div>
                  </div>
            {isOrganizer && (
              <div className="flex gap-2">
                <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Send Tournament Invitation</DialogTitle>
                      <DialogDescription>
                        Invite a user to participate in this tournament
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="user@example.com"
                          required
                        />
                  </div>
                      <Button 
                        onClick={handleSendInvitation} 
                        disabled={inviteLoading || !inviteEmail.trim()}
                        className="w-full"
                      >
                        {inviteLoading ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteTournament}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Tournament
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sport</p>
              <p className="text-lg font-semibold">{tournament.sport}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dates</p>
              <p className="text-lg font-semibold">
                {tournament.startDate?.toDate?.()?.toLocaleDateString()} - {tournament.endDate?.toDate?.()?.toLocaleDateString()}
              </p>
                  </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teams</p>
              <p className="text-lg font-semibold">
                {approvedTeams.length} / {tournament.maxTeams}
              </p>
                  </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entry Fee</p>
              <p className="text-lg font-semibold">${tournament.entryFee}</p>
                  </div>
                </div>
          {tournament.description && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-base">{tournament.description}</p>
            </div>
          )}
              </CardContent>
            </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registrations */}
            <Card>
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registrations ({registrations.length})
            </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
            {registrations.length > 0 ? (
              registrations.map((registration) => (
                <div key={registration.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{registration.teamName}</p>
                    <p className="text-sm text-muted-foreground">
                      Registered: {registration.registeredAt?.toDate?.()?.toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={registration.status === 'approved' ? 'default' : registration.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {registration.status}
                      </Badge>
                      <Badge variant={registration.paymentStatus === 'paid' ? 'default' : 'outline'}>
                        {registration.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                  {isOrganizer && registration.status === 'pending' && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedRegistration(registration)
                        setShowReviewModal(true)
                      }}
                    >
                      Review
                    </Button>
                  )}
                </div>
              ))
                ) : (
              <p className="text-center text-muted-foreground">No registrations yet</p>
                )}
              </CardContent>
            </Card>

        {/* Matches */}
            <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Matches ({matches.length})
            </CardTitle>
            {isOrganizer && approvedTeams.length >= 2 && (
              <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Match
                </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Schedule Match</DialogTitle>
                    <DialogDescription>
                      Create a new match between two teams
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="team1">Team 1</Label>
                                             <Select value={newMatch.team1Id} onValueChange={(value) => setNewMatch({...newMatch, team1Id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTeams.map((team) => (
                            <SelectItem key={team.teamId} value={team.teamId}>
                              {team.teamName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="team2">Team 2</Label>
                                             <Select value={newMatch.team2Id} onValueChange={(value) => setNewMatch({...newMatch, team2Id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team 2" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTeams.filter(t => t.teamId !== newMatch.team1Id).map((team) => (
                            <SelectItem key={team.teamId} value={team.teamId}>
                              {team.teamName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="round">Round</Label>
                      <Input
                        id="round"
                        type="number"
                        value={newMatch.round}
                        onChange={(e) => setNewMatch({...newMatch, round: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newMatch.scheduledDate}
                        onChange={(e) => setNewMatch({...newMatch, scheduledDate: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newMatch.scheduledTime}
                        onChange={(e) => setNewMatch({...newMatch, scheduledTime: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="court">Court</Label>
                      <Input
                        id="court"
                        value={newMatch.court}
                        onChange={(e) => setNewMatch({...newMatch, court: e.target.value})}
                        placeholder="Court number or name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newMatch.notes}
                        onChange={(e) => setNewMatch({...newMatch, notes: e.target.value})}
                        placeholder="Additional notes"
                      />
                    </div>
                    <Button 
                      onClick={handleCreateMatch} 
                      disabled={scheduleLoading || !newMatch.team1Id || !newMatch.team2Id}
                      className="w-full"
                    >
                      {scheduleLoading ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Schedule Match
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.length > 0 ? (
              matches.map((match) => (
                <div key={match.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getMatchStatusColor(match.status)}>
                        {match.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">Round {match.round}</Badge>
                    </div>
                    {isOrganizer && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteMatch(match.id)}
                          disabled={deleteLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-medium">{match.team1Name}</p>
                      {match.score && <p className="text-lg font-bold">{match.score.team1}</p>}
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-muted-foreground">vs</span>
                    </div>
                    <div>
                      <p className="font-medium">{match.team2Name}</p>
                      {match.score && <p className="text-lg font-bold">{match.score.team2}</p>}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>{match.scheduledDate?.toDate?.()?.toLocaleDateString()} at {match.scheduledTime}</p>
                    {match.court && <p>Court: {match.court}</p>}
                    {match.winnerName && (
                      <p className="text-green-600 font-medium">
                        Winner: {match.winnerName}
                      </p>
            )}
          </div>
        </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No matches scheduled yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Registration Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Registration</DialogTitle>
            <DialogDescription>
              Approve or reject this team's registration
            </DialogDescription>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div>
                <Label>Team</Label>
                <p className="font-medium">{selectedRegistration.teamName}</p>
              </div>
              <div>
                <Label>Decision</Label>
                <Select value={approvalStatus} onValueChange={(value: 'approved' | 'rejected') => setApprovalStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes about your decision"
                />
              </div>
              <Button 
                onClick={handleReviewRegistration} 
                disabled={reviewLoading}
                className="w-full"
              >
                {reviewLoading ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {approvalStatus === 'approved' ? 'Approve' : 'Reject'} Registration
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}
