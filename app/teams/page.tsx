"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, getDoc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, Search, User, Crown, Shield } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"

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
  icon?: string
  status?: string
  ageGroup?: string
  location?: {
    country: string
    state: string
    city: string
  }
  privacy: "public" | "private"
}

export default function TeamsPage() {
  const { user, userProfile } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sportFilter, setSportFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState({ country: "all", state: "all", city: "all" })
  const [dateFilter, setDateFilter] = useState("")
  const [privacyFilter, setPrivacyFilter] = useState("all")

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    setError(null)
    const q = query(
      collection(db, "teams"),
      where("memberIds", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
      const fetchedTeams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Team[]
      setTeams(fetchedTeams)
      setLoading(false)
      } catch (err: any) {
        setTeams([])
        setLoading(false)
        setError(err.message)
        toast({
          title: "Error loading teams",
          description: err.message,
          variant: "destructive",
        })
      }
    }, (err) => {
      setTeams([])
      setLoading(false)
      setError(err.message)
      toast({
        title: "Error loading teams",
        description: err.message,
        variant: "destructive",
      })
    })

    return () => unsubscribe()
  }, [user])

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSport = sportFilter === "all" || team.sport === sportFilter
    const matchesType = typeFilter === "all" || team.type === typeFilter
    const matchesCountry = locationFilter.country === "all" || team.location?.country === locationFilter.country
    const matchesState = locationFilter.state === "all" || team.location?.state === locationFilter.state
    const matchesCity = locationFilter.city === "all" || team.location?.city === locationFilter.city
    const matchesDate = !dateFilter || (team.createdAt && team.createdAt.toDate().toISOString().slice(0, 10) === dateFilter)
    const matchesPrivacy = privacyFilter === "all" || team.privacy === privacyFilter
    // Only show private teams if the user is a member
    const isMember = team.memberIds.includes(user?.uid || "")
    if (team.privacy === "private" && !isMember) return false
    return matchesSearch && matchesSport && matchesType && matchesCountry && matchesState && matchesCity && matchesDate && matchesPrivacy
  })

  const getUniqueSports = () => {
    const sports = teams.map((team) => team.sport).filter(Boolean)
    return [...new Set(sports)]
  }

  const getUserRoleInTeam = (team: Team) => {
    if (team.ownerId === user?.uid) return "Owner"
    if (team.adminIds?.includes(user?.uid || "")) return "Admin"
    if (team.memberIds?.includes(user?.uid || "")) return "Member"
    return "N/A"
  }

  const handleJoinPublicTeam = async (teamId: string) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to join a team.", variant: "destructive" })
      return
    }
    try {
      const teamRef = doc(db, "teams", teamId)
      const teamSnap = await getDoc(teamRef)
      if (!teamSnap.exists()) throw new Error("Team not found")
      const team = teamSnap.data()
      const updatedMemberIds = Array.from(new Set([...(team.memberIds || []), user.uid]))
      await updateDoc(teamRef, { memberIds: updatedMemberIds, updatedAt: Timestamp.now() })
      await addDoc(collection(db, "teamMembers"), {
        teamId,
        userId: user.uid,
        role: "player",
        joinedAt: Timestamp.now(),
      })
      toast({ title: "Joined Team!", description: "You have joined the team." })
    } catch (error: any) {
      toast({ title: "Error Joining Team", description: error.message, variant: "destructive" })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Teams</h1>
            <p className="text-gray-600">Manage your teams and connect with teammates.</p>
          </div>
          <Button asChild>
            <Link href="/teams/create">
              <Plus className="h-4 w-4 mr-2" />
              Create New Team
            </Link>
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <Label>Sport</Label>
          <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger><SelectValue placeholder="All Sports" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All</SelectItem>
              {getUniqueSports().map((sport) => (
                  <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          <div>
            <Label>Country</Label>
            <Input value={locationFilter.country === "all" ? "" : locationFilter.country} onChange={e => setLocationFilter(f => ({ ...f, country: e.target.value || "all" }))} placeholder="All" />
          </div>
          <div>
            <Label>State</Label>
            <Input value={locationFilter.state === "all" ? "" : locationFilter.state} onChange={e => setLocationFilter(f => ({ ...f, state: e.target.value || "all" }))} placeholder="All" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={locationFilter.city === "all" ? "" : locationFilter.city} onChange={e => setLocationFilter(f => ({ ...f, city: e.target.value || "all" }))} placeholder="All" />
          </div>
          <div>
            <Label>Created Date</Label>
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          </div>
          <div>
            <Label>Privacy</Label>
            <Select value={privacyFilter} onValueChange={setPrivacyFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>

        {/* Team List */}
        {error ? (
          <div className="text-center text-red-500 py-8">Error loading teams: {error}</div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                  <Card className="hover:shadow-lg transition-shadow h-full shadow-sm cursor-pointer mb-4 w-full max-w-2xl mx-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={team.icon || "/placeholder.svg"} alt={team.name} />
                        <AvatarFallback>{team.name?.[0]}</AvatarFallback>
                      </Avatar>
                        {team.name}
                      <Badge variant="outline" className="ml-2 capitalize">{team.status || "active"}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Badge variant="outline">{team.sport}</Badge>
                      <Badge variant="secondary" className="capitalize">{team.type}</Badge>
                      {team.ageGroup && <Badge variant="secondary">{team.ageGroup}</Badge>}
                    </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {team.memberIds.length} Members
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {getUserRoleInTeam(team) === "Owner" && <Crown className="h-4 w-4 text-yellow-500" />}
                        {getUserRoleInTeam(team) === "Admin" && <Shield className="h-4 w-4 text-green-500" />}
                        Role: {getUserRoleInTeam(team)}
                      </p>
                      {team.privacy === "public" && !team.memberIds.includes(user?.uid || "") && (
                        <Button className="w-full mt-2" onClick={() => handleJoinPublicTeam(team.id)}>
                          Join Team
                        </Button>
                      )}
                      <Button asChild className="w-full mt-4 focus:ring-2 focus:ring-primary focus:outline-none" aria-label="View Team">
                        <Link href={`/teams/${team.id}`}>View Team</Link>
                      </Button>
                    </CardContent>
                  </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
              <p className="text-gray-500 mb-6">
                You are not a member of any teams yet. Create a new team or join an existing one!
              </p>
              <Button asChild>
                <Link href="/teams/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Team
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
