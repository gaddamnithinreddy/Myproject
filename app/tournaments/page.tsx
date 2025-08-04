"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, MapPin, Calendar, Users, DollarSign, Filter, Search, Trophy, Loader2, Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import Link from "next/link"
import MapPicker from "@/components/MapPicker"
import { useRouter } from "next/navigation"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { createNotification } from "@/lib/notifications"

interface Tournament {
  id: string
  name: string
  sport: string
  type: "public" | "private"
  startDate: Timestamp
  endDate: Timestamp
  registrationDeadline: Timestamp
  location: {
    address: string
    country: string
    state: string
    city: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  } | string
  level: "beginner" | "intermediate" | "advanced"
  ageGroup: string
  gender: "male" | "female" | "any"
  contactEmail: string
  contactNumber: string
  brochure?: string
  fee: number
  maxTeams: number
  registeredTeams: number
  ownerId: string
  status: "active" | "inactive" | "completed"
  createdAt: Timestamp
  invitedTeams: string[]
}

interface TournamentRegistration {
  id: string
  tournamentId: string
  teamId: string
  teamName: string
  registeredBy: string
  status: "pending" | "approved" | "rejected"
  paymentStatus: "pending" | "paid" | "failed"
  registeredAt: Timestamp
  notes?: string
  approvalStatus?: "pending" | "approved" | "rejected"
}

interface Team {
  id: string
  name: string
  sport: string
  ownerId: string
  adminIds: string[]
  memberIds: string[]
}

function safeToDate(val: any): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  if (val instanceof Date) return val;
  return null;
}

export default function TournamentsPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([])
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])
  const [userTeams, setUserTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [selectedTeam, setSelectedTeam] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sportFilter, setSportFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"public" | "my-tournaments" | "registrations">("public")
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [brochureUploading, setBrochureUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [successAnimation, setSuccessAnimation] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    type: "public" as "public" | "private",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    location: {
      address: userProfile?.address || "", // Initialize with user profile address
      city: userProfile?.city || "",
      state: userProfile?.state || "",
      country: userProfile?.country || "",
      zipCode: userProfile?.zipCode || "",
      coordinates: userProfile?.coordinates || { lat: 0, lng: 0 },
    },
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    ageGroup: "",
    gender: "any" as "male" | "female" | "any",
    contactEmail: userProfile?.email || "",
    contactNumber: userProfile?.mobileNumber || "",
    fee: "",
    maxTeams: "",
    description: "",
    brochure: "",
    invitedTeams: [] as string[],
  })

  useEffect(() => {
    if (!user) {
      setLoading(false)
      setTeamsLoading(false)
      return
    }

    // Fetch user's teams
    setTeamsLoading(true)
    setTeamsError(null)
    const teamsQuery = query(collection(db, "teamMembers"), where("userId", "==", user.uid))
    const unsubscribeTeams = onSnapshot(teamsQuery, async (snapshot) => {
      try {
      const teamIds = snapshot.docs.map((doc) => doc.data().teamId)
      if (teamIds.length > 0) {
        const teamsDetailsQuery = query(collection(db, "teams"))
        const unsubscribeTeamDetails = onSnapshot(teamsDetailsQuery, (teamsSnapshot) => {
          const teamsData = teamsSnapshot.docs
            .filter((doc) => teamIds.includes(doc.id))
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Team[]
          setUserTeams(teamsData)
            setTeamsLoading(false)
          }, (error) => {
            setUserTeams([])
            setTeamsLoading(false)
            setTeamsError(error.message)
        })
        return () => unsubscribeTeamDetails()
        } else {
          setUserTeams([])
          setTeamsLoading(false)
        }
      } catch (error: any) {
        setUserTeams([])
        setTeamsLoading(false)
        setTeamsError(error.message)
      }
    }, (error) => {
      setUserTeams([])
      setTeamsLoading(false)
      setTeamsError(error.message)
    })

    // Fetch public tournaments
    const publicTournamentsQuery = query(
      collection(db, "tournaments"),
      where("type", "==", "public"),
      where("status", "==", "active"),
      orderBy("startDate", "asc"),
    )
    const unsubscribePublic = onSnapshot(publicTournamentsQuery, (snapshot) => {
      setTournaments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Tournament))
    })

    // Fetch user's tournaments
    const myTournamentsQuery = query(
      collection(db, "tournaments"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    )
    const unsubscribeMyTournaments = onSnapshot(myTournamentsQuery, (snapshot) => {
      setMyTournaments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Tournament))
    })

    // Fetch user's registrations
    const registrationsQuery = query(collection(db, "tournamentRegistrations"), where("registeredBy", "==", user.uid))
    const unsubscribeRegistrations = onSnapshot(registrationsQuery, (snapshot) => {
      setRegistrations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TournamentRegistration))
      setLoading(false)
    })

    return () => {
      unsubscribeTeams()
      unsubscribePublic()
      unsubscribeMyTournaments()
      unsubscribeRegistrations()
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLocationSelect = (place: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        address: place.address,
        city: place.city,
        state: place.state,
        country: place.country,
        zipCode: place.zipCode,
        coordinates: place.coordinates,
      },
    }))
  }

  // Brochure upload handler
  const handleBrochureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]
    setBrochureUploading(true)
    const storage = getStorage()
    const storageRef = ref(storage, `tournament_brochures/${user.uid}/${file.name}`)
    try {
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      setFormData((prev) => ({ ...prev, brochure: downloadURL }))
      toast({ title: "Brochure Uploaded!", description: "Tournament brochure uploaded successfully." })
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setBrochureUploading(false)
    }
  }

  const validateTournamentForm = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.name) errors.name = "Tournament name is required."
    if (!formData.sport) errors.sport = "Sport is required."
    if (!formData.startDate) errors.startDate = "Start date is required."
    if (!formData.endDate) errors.endDate = "End date is required."
    if (!formData.registrationDeadline) errors.registrationDeadline = "Registration deadline is required."
    if (!formData.location.address) errors.address = "Address is required."
    if (!formData.contactEmail) errors.contactEmail = "Contact email is required."
    if (!formData.contactNumber) errors.contactNumber = "Contact number is required."
    return errors
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const errors = validateTournamentForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    if (!user) return

    setIsSubmitting(true)
    try {
      const tournamentData = {
        name: formData.name,
        sport: formData.sport.trim().toLowerCase(), // Normalize sport
        type: formData.type,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        registrationDeadline: Timestamp.fromDate(new Date(formData.registrationDeadline)),
        location: {
          address: formData.location.address,
          country: formData.location.country,
          state: formData.location.state,
          city: formData.location.city,
          zipCode: formData.location.zipCode,
          coordinates: formData.location.coordinates,
        },
        level: formData.level,
        ageGroup: formData.ageGroup,
        gender: formData.gender,
        contactEmail: formData.contactEmail,
        contactNumber: formData.contactNumber,
        fee: formData.fee ? Number.parseFloat(formData.fee) : 0,
        maxTeams: formData.maxTeams ? Number.parseInt(formData.maxTeams) : 0,
        registeredTeams: 0,
        ownerId: user.uid,
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        brochure: formData.brochure,
        invitedTeams: formData.type === "private" ? formData.invitedTeams : [],
      }

      await addDoc(collection(db, "tournaments"), tournamentData)

      toast({
        title: "Tournament Created!",
        description: `${formData.name} has been created successfully.`,
      })

      setShowCreateModal(false)
      // Reset form
      setFormData({
        name: "",
        sport: "",
        type: "public",
        startDate: "",
        endDate: "",
        registrationDeadline: "",
        location: {
          address: userProfile?.address || "",
          city: userProfile?.city || "",
          state: userProfile?.state || "",
          country: userProfile?.country || "",
          zipCode: userProfile?.zipCode || "",
          coordinates: userProfile?.coordinates || { lat: 0, lng: 0 },
        },
        level: "beginner",
        ageGroup: "",
        gender: "any",
        contactEmail: userProfile?.email || "",
        contactNumber: userProfile?.mobileNumber || "",
        fee: "",
        maxTeams: "",
        description: "",
        brochure: "",
        invitedTeams: [],
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterForTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTournament || !selectedTeam || !user) return

    try {
      const team = userTeams.find((t) => t.id === selectedTeam)
      if (!team) return

      // Check if team is already registered for this tournament
      const existingRegistration = registrations.find(
        (reg) => reg.tournamentId === selectedTournament.id && reg.teamId === selectedTeam
      )
      
      if (existingRegistration) {
        toast({
          title: "Already Registered",
          description: `Team ${team.name} is already registered for this tournament.`,
          variant: "destructive",
        })
        return
      }

      // Check if tournament is full
      if (selectedTournament.registeredTeams >= selectedTournament.maxTeams) {
        toast({
          title: "Tournament Full",
          description: "This tournament has reached its maximum team capacity.",
          variant: "destructive",
        })
        return
      }

      const registrationData = {
        tournamentId: selectedTournament.id,
        teamId: selectedTeam,
        teamName: team.name,
        registeredBy: user.uid,
        status: "pending",
        paymentStatus: selectedTournament.fee > 0 ? "pending" : "paid",
        registeredAt: Timestamp.now(),
        notes: "",
      }

      await addDoc(collection(db, "tournamentRegistrations"), registrationData)

      // Update tournament registered teams count
      await updateDoc(doc(db, "tournaments", selectedTournament.id), {
        registeredTeams: (selectedTournament.registeredTeams || 0) + 1,
        updatedAt: Timestamp.now(),
      })

      // Notify all team members (except the registering user)
      if (team.memberIds && Array.isArray(team.memberIds)) {
        const notifyPromises = team.memberIds
          .filter((uid) => uid !== user.uid)
          .map((uid) =>
            createNotification({
              userId: uid,
              type: "tournament_registration",
              title: `Team Registered for Tournament: ${selectedTournament.name}`,
              body: `Your team '${team.name}' has been registered for the tournament '${selectedTournament.name}'.`,
              data: { tournamentId: selectedTournament.id, teamId: team.id },
              link: `/tournaments/${selectedTournament.id}`,
            })
          )
        await Promise.all(notifyPromises)
      }
      
      // Notify the registering user
      await createNotification({
        userId: user.uid,
        type: "tournament_registration",
        title: `Registered for Tournament: ${selectedTournament.name}`,
        body: `You have registered team '${team.name}' for the tournament '${selectedTournament.name}'.`,
        data: { tournamentId: selectedTournament.id, teamId: team.id },
        link: `/tournaments/${selectedTournament.id}`,
      })

      // Show success state
      setRegistrationSuccess(true)
      setShowRegisterModal(false)
      
      toast({
        title: "Registration Successful! 🎉",
        description: `Your team ${team.name} has been successfully registered for ${selectedTournament.name}.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filteredTournaments = (tournamentsList: Tournament[]) => {
    return tournamentsList.filter((tournament) => {
      const matchesSearch =
        tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.sport.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSport = sportFilter === "all" || tournament.sport === sportFilter
      const matchesLevel = levelFilter === "all" || tournament.level === levelFilter
      
      // Location-based filtering - only show tournaments near user's location
      let matchesLocation = true
      if (userProfile && typeof tournament.location === 'object') {
        const tournamentLocation = tournament.location
        
        // Check if tournament is in the same city/state as user
        matchesLocation = 
          userProfile.city === tournamentLocation.city ||
          userProfile.state === tournamentLocation.state ||
          userProfile.country === tournamentLocation.country
      }
      
      return matchesSearch && matchesSport && matchesLevel && matchesLocation
    })
  }

  const formatDate = (timestamp: Timestamp | string | Date) => {
    const date = safeToDate(timestamp);
    if (!date) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getUniquesSports = (tournamentsList: Tournament[]) => {
    const sports = tournamentsList.map((tournament) => tournament.sport).filter(Boolean)
    return [...new Set(sports)]
  }

  const isRegistrationOpen = (tournament: Tournament) => {
    const now = new Date()
    const deadline = safeToDate(tournament.registrationDeadline)
    return deadline && deadline > now && tournament.status === "active"
  }

  const isUserRegistered = (tournamentId: string) => {
    // Check if any of the user's teams are registered for this tournament
    return registrations.some((reg) => 
      reg.tournamentId === tournamentId && 
      userTeams.some(team => team.id === reg.teamId)
    )
  }

  // Registration approval handler
  const handleApproveRegistration = async (registrationId: string) => {
    await updateDoc(doc(db, "tournamentRegistrations", registrationId), { approvalStatus: "approved" })
    // Notify the registering user
    const reg = registrations.find((r) => r.id === registrationId)
    if (reg) {
      await createNotification({
        userId: reg.registeredBy,
        type: "tournament_approval",
        title: "Tournament Registration Approved",
        body: `Your registration for the tournament has been approved!`,
        data: { tournamentId: reg.tournamentId, teamId: reg.teamId },
        link: `/tournaments/${reg.tournamentId}`,
      })
    }
    toast({ title: "Registration Approved" })
  }
  const handleRejectRegistration = async (registrationId: string) => {
    await updateDoc(doc(db, "tournamentRegistrations", registrationId), { approvalStatus: "rejected" })
    // Notify the registering user
    const reg = registrations.find((r) => r.id === registrationId)
    if (reg) {
      await createNotification({
        userId: reg.registeredBy,
        type: "tournament_rejection",
        title: "Tournament Registration Rejected",
        body: `Your registration for the tournament has been rejected.`,
        data: { tournamentId: reg.tournamentId, teamId: reg.teamId },
        link: `/tournaments/${reg.tournamentId}`,
      })
    }
    toast({ title: "Registration Rejected" })
  }
  const handleMarkPaid = async (registrationId: string) => {
    await updateDoc(doc(db, "tournamentRegistrations", registrationId), { paymentStatus: "paid" })
    toast({ title: "Payment Marked as Paid" })
  }

  // Notify all team members of a team about tournament result
  const notifyTournamentResult = async (teamId: string, tournamentId: string, result: string) => {
    const team = userTeams.find((t) => t.id === teamId)
    if (team && team.memberIds && Array.isArray(team.memberIds)) {
      const notifyPromises = team.memberIds.map((uid) =>
        createNotification({
          userId: uid,
          type: "tournament_result",
          title: `Tournament Result Update`,
          body: result,
          data: { tournamentId, teamId },
          link: `/tournaments/${tournamentId}`,
        })
      )
      await Promise.all(notifyPromises)
    }
  }

  // Notify all participants when tournament is completed
  const notifyTournamentComplete = async (tournament: Tournament, allTeams: Team[]) => {
    for (const team of allTeams) {
      if (team.memberIds && Array.isArray(team.memberIds)) {
        const notifyPromises = team.memberIds.map((uid) =>
          createNotification({
            userId: uid,
            type: "tournament_complete",
            title: `Tournament Completed: ${tournament.name}`,
            body: `The tournament '${tournament.name}' has concluded. Check results!`,
            data: { tournamentId: tournament.id, teamId: team.id },
            link: `/tournaments/${tournament.id}`,
          })
        )
        await Promise.all(notifyPromises)
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tournaments</h1>
            <p className="text-gray-600">Discover and manage tournaments</p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tournament
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Tournament</DialogTitle>
                <DialogDescription>Set up a new tournament for teams to compete</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTournament} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Tournament Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter tournament name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                        aria-label="Tournament name"
                      />
                      {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sport">Sport *</Label>
                      <Input
                        id="sport"
                        placeholder="e.g., Football, Basketball"
                        value={formData.sport}
                        onChange={(e) => handleInputChange("sport", e.target.value)}
                        required
                        aria-label="Sport"
                      />
                      {fieldErrors.sport && <p className="text-xs text-red-600">{fieldErrors.sport}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brochure">Brochure (PDF/Image)</Label>
                    <Input id="brochure" type="file" accept="application/pdf,image/*" onChange={handleBrochureChange} aria-label="Brochure upload" />
                    {brochureUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {formData.brochure && <a href={formData.brochure} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Brochure</a>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender Requirement</Label>
                      <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)} aria-label="Gender requirement">
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level">Level</Label>
                      <Select value={formData.level} onValueChange={(value) => handleInputChange("level", value)} aria-label="Level">
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ageGroup">Age Group</Label>
                      <Input id="ageGroup" placeholder="e.g., Under 18" value={formData.ageGroup} onChange={(e) => handleInputChange("ageGroup", e.target.value)} aria-label="Age group" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tournament Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)} aria-label="Tournament type">
                        <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  {formData.type === "private" && (
                    <div className="space-y-2">
                      <Label htmlFor="invitedTeams">Invited Teams (comma-separated team IDs)</Label>
                      <Input id="invitedTeams" value={formData.invitedTeams.join(",")} onChange={e => setFormData(prev => ({ ...prev, invitedTeams: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="teamId1, teamId2, ..." aria-label="Invited teams" />
                  </div>
                  )}
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registrationDeadline">Registration Deadline *</Label>
                      <Input
                        id="registrationDeadline"
                        type="date"
                        value={formData.registrationDeadline}
                        onChange={(e) => handleInputChange("registrationDeadline", e.target.value)}
                        required
                        aria-label="Registration deadline"
                      />
                      {fieldErrors.registrationDeadline && <p className="text-xs text-red-600">{fieldErrors.registrationDeadline}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        required
                        aria-label="Start date"
                      />
                      {fieldErrors.startDate && <p className="text-xs text-red-600">{fieldErrors.startDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                        required
                        aria-label="End date"
                      />
                      {fieldErrors.endDate && <p className="text-xs text-red-600">{fieldErrors.endDate}</p>}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Location</h3>
                  <MapPicker
                    onPlaceSelect={handleLocationSelect}
                    initialLocation={formData.location.address ? formData.location : undefined}
                    aria-label="Map picker"
                  />
                  {formData.location.address && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={formData.location.city} readOnly aria-label="City" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" value={formData.location.state} readOnly aria-label="State" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" value={formData.location.country} readOnly aria-label="Country" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input id="zipCode" value={formData.location.zipCode} readOnly aria-label="ZIP code" />
                      </div>
                    </div>
                  )}
                  {fieldErrors.address && <p className="text-xs text-red-600">{fieldErrors.address}</p>}
                </div>

                {/* Contact & Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Contact & Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="Enter contact email"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                        required
                        aria-label="Contact email"
                      />
                      {fieldErrors.contactEmail && <p className="text-xs text-red-600">{fieldErrors.contactEmail}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number *</Label>
                      <Input
                        id="contactNumber"
                        placeholder="Enter contact number"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                        required
                        aria-label="Contact number"
                      />
                      {fieldErrors.contactNumber && <p className="text-xs text-red-600">{fieldErrors.contactNumber}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fee">Entry Fee ($)</Label>
                      <Input
                        id="fee"
                        type="number"
                        placeholder="0"
                        value={formData.fee}
                        onChange={(e) => handleInputChange("fee", e.target.value)}
                        min="0"
                        step="0.01"
                        aria-label="Entry fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxTeams">Max Teams</Label>
                      <Input
                        id="maxTeams"
                        type="number"
                        placeholder="Unlimited"
                        value={formData.maxTeams}
                        onChange={(e) => handleInputChange("maxTeams", e.target.value)}
                        min="1"
                        aria-label="Max teams"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ageGroup">Age Group</Label>
                      <Input
                        id="ageGroup"
                        placeholder="e.g., Under 18"
                        value={formData.ageGroup}
                        onChange={(e) => handleInputChange("ageGroup", e.target.value)}
                        aria-label="Age group"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your tournament..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={4}
                      aria-label="Description"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} aria-label="Cancel tournament creation">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || isSubmitting} className="w-full mt-4 focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Create Tournament">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Tournament"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public Tournaments ({tournaments.length})</TabsTrigger>
            <TabsTrigger value="my-tournaments">My Tournaments ({myTournaments.length})</TabsTrigger>
            <TabsTrigger value="registrations">My Registrations ({registrations.length})</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search tournaments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      aria-label="Search tournaments"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={sportFilter} onValueChange={setSportFilter} aria-label="Filter by sport">
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {getUniquesSports([...tournaments, ...myTournaments]).map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-48">
                  <Select value={levelFilter} onValueChange={setLevelFilter} aria-label="Filter by level">
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Public Tournaments */}
          <TabsContent value="public">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments(tournaments).length > 0 ? (
                  filteredTournaments(tournaments).map((tournament) => (
                    <motion.div
                      key={tournament.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Link href={`/tournaments/${tournament.id}`}>
                        <Card className="hover:shadow-lg transition-shadow h-full shadow-sm cursor-pointer mb-4 w-full max-w-2xl mx-auto" aria-label="Tournament card">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1 truncate">{tournament.name}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{tournament.sport}</Badge>
                                  <Badge variant="secondary">{tournament.level}</Badge>
                                </div>
                              </div>
                              <Badge variant={tournament.status === "active" ? "default" : "secondary"}>
                                {tournament.status}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {typeof tournament.location === 'string' ? tournament.location : `${tournament.location.city}, ${tournament.location.state}`}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                {tournament.registeredTeams} / {tournament.maxTeams || "∞"} teams
                              </div>
                              {tournament.fee > 0 && (
                                <div className="flex items-center">
                                  <DollarSign className="h-4 w-4 mr-2" />${tournament.fee}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500">
                                Deadline: {formatDate(tournament.registrationDeadline)}
                              </div>
                              {isRegistrationOpen(tournament) && !isUserRegistered(tournament.id) && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault() // Prevent navigation
                                    setSelectedTournament(tournament)
                                    setShowRegisterModal(true)
                                  }}
                                  aria-label="Register for tournament"
                                >
                                  Register
                                </Button>
                              )}
                              {isUserRegistered(tournament.id) && <Badge variant="outline">Registered</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No public tournaments found matching your criteria.</p>
                    <p className="text-sm">Try adjusting your filters or create a new tournament!</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* My Tournaments */}
          <TabsContent value="my-tournaments">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments(myTournaments).length > 0 ? (
                filteredTournaments(myTournaments).map((tournament) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Card className="hover:shadow-lg transition-shadow h-full cursor-pointer shadow-sm" aria-label="My tournament card">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1 truncate">{tournament.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{tournament.sport}</Badge>
                                <Badge variant="secondary">{tournament.level}</Badge>
                              </div>
                            </div>
                            <Badge variant={tournament.status === "active" ? "default" : "secondary"}>
                              {tournament.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {typeof tournament.location === 'string' ? tournament.location : `${tournament.location.city}, ${tournament.location.state}`}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {tournament.registeredTeams} / {tournament.maxTeams || "∞"} teams
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge variant="outline">Owner</Badge>
                            <div className="text-xs text-gray-500">Created {formatDate(tournament.createdAt)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't created any tournaments yet.</p>
                  <p className="text-sm">Start organizing your own events!</p>
                  <Button onClick={() => setShowCreateModal(true)} className="mt-4" aria-label="Create new tournament">
                    <Plus className="h-4 w-4 mr-2" /> Create Tournament
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Registrations */}
          <TabsContent value="registrations">
            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
            <div className="space-y-4">
              {registrations.length > 0 ? (
                registrations.map((registration) => {
                  const tournament =
                    tournaments.find((t) => t.id === registration.tournamentId) ||
                    myTournaments.find((t) => t.id === registration.tournamentId)
                  if (!tournament) return null
                    const isOwner = user && tournament.ownerId === user.uid
                  return (
                    <motion.div
                      key={registration.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="shadow-sm" aria-label="Registration card">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{tournament.name}</h3>
                              <p className="text-sm text-gray-600 mb-2">Team: {registration.teamName}</p>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {typeof tournament.location === 'string' ? tournament.location : `${tournament.location.city}, ${tournament.location.state}`}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                    registration.approvalStatus === "approved"
                                    ? "default"
                                      : registration.approvalStatus === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                  {registration.approvalStatus || registration.status}
                              </Badge>
                              <Badge
                                variant={
                                  registration.paymentStatus === "paid"
                                    ? "default"
                                    : registration.paymentStatus === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {registration.paymentStatus}
                              </Badge>
                                {isOwner && registration.approvalStatus !== "approved" && registration.approvalStatus !== "rejected" && (
                                  <>
                                    <Button size="sm" variant="default" onClick={() => handleApproveRegistration(registration.id)} aria-label="Approve registration">Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectRegistration(registration.id)} aria-label="Reject registration">Reject</Button>
                                  </>
                                )}
                                {isOwner && registration.paymentStatus !== "paid" && registration.approvalStatus === "approved" && (
                                  <Button size="sm" variant="outline" onClick={() => handleMarkPaid(registration.id)} aria-label="Mark payment as paid">Mark as Paid</Button>
                                )}
                                {registration.paymentStatus === "pending" && tournament.fee > 0 && !isOwner && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                      e.preventDefault()
                                    toast({
                                      title: "Simulated Payment",
                                      description: `Payment for ${tournament.name} (Fee: $${tournament.fee}) would be processed here.`,
                                      variant: "success",
                                    })
                                  }}
                                  aria-label="Simulate payment"
                                >
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't registered for any tournaments yet.</p>
                  <p className="text-sm">Browse public tournaments to find one to join!</p>
                  <Button onClick={() => setActiveTab("public")} className="mt-4" aria-label="Browse public tournaments">
                    Browse Tournaments
                  </Button>
                </div>
              )}
            </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Registration Modal */}
        <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register for Tournament</DialogTitle>
              <DialogDescription>Register your team for {selectedTournament?.name}</DialogDescription>
            </DialogHeader>
            {registrationSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-600 mb-2">
                  Registration Successful!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your team has been successfully registered for the tournament.
                </p>
                <Button onClick={() => {
                  setShowRegisterModal(false)
                  setRegistrationSuccess(false)
                }}>
                  Continue
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegisterForTournament} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team">Select Team *</Label>
                {teamsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin h-4 w-4" /> Loading teams...
                  </div>
                ) : teamsError ? (
                  <div className="text-red-500 text-sm">Error loading teams: {teamsError}</div>
                ) : userTeams.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-muted-foreground text-sm">You have no teams. Create a team to register.</div>
                    <Button type="button" onClick={() => { setShowRegisterModal(false); router.push("/teams/create") }} aria-label="Create team">Create Team</Button>
                  </div>
                ) : (
                  <Select value={selectedTeam} onValueChange={setSelectedTeam} required aria-label="Select team">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {userTeams.map((team) => {
                        const eligible = team.sport && selectedTournament?.sport && 
                          team.sport.trim().toLowerCase() === selectedTournament.sport.trim().toLowerCase()
                        return (
                          <SelectItem key={team.id} value={team.id} disabled={!eligible}>
                            {team.name} {!eligible && " (Not eligible for this sport)"}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedTournament?.fee && selectedTournament.fee > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Entry Fee:</strong> ${selectedTournament.fee}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">Payment will be required after registration approval.</p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => setShowRegisterModal(false)} aria-label="Cancel registration">
                  Cancel
                </Button>
                <Button type="submit" disabled={!selectedTeam || userTeams.filter((team) => team.sport && selectedTournament?.sport && team.sport.trim().toLowerCase() === selectedTournament.sport.trim().toLowerCase()).length === 0} aria-label="Register team">
                  Register Team
                </Button>
              </div>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
