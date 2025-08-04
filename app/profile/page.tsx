"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  AnimatedPage, 
  AnimatedCard, 
  FadeIn, 
  SlideUp, 
  AnimatedButton,
  AnimatedProgress,
  AnimatedCounter,
  StaggeredContainer,
  StaggeredItem
} from "@/components/AnimatedComponents"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Trophy, 
  Star, 
  Settings, 
  Bell, 
  Shield, 
  Camera,
  Edit,
  Save,
  X,
  Award,
  Target,
  TrendingUp,
  Users,
  Clock,
  Heart
} from "lucide-react"

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  phoneNumber: string
  dateOfBirth: string
  gender: string
  location: string
  bio: string
  position: string
  experience: string
  achievements: Achievement[]
  statistics: Statistics
  preferences: Preferences
  teams: string[]
  tournaments: string[]
  createdAt: string
  lastActive: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  date: string
  type: 'tournament' | 'team' | 'personal' | 'milestone'
}

interface Statistics {
  tournamentsPlayed: number
  tournamentsWon: number
  matchesPlayed: number
  matchesWon: number
  teamsJoined: number
  teamsCreated: number
  totalPoints: number
  winRate: number
  averageScore: number
  playTime: number
}

interface Preferences {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    tournamentUpdates: boolean
    teamUpdates: boolean
    matchReminders: boolean
  }
  privacy: {
    profileVisible: boolean
    showEmail: boolean
    showPhone: boolean
    showLocation: boolean
    showStatistics: boolean
  }
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setProfile({
          uid: user.uid,
          email: user.email || "",
          displayName: userData.displayName || user.displayName || "",
          photoURL: userData.photoURL || user.photoURL || "",
          phoneNumber: userData.phoneNumber || "",
          dateOfBirth: userData.dateOfBirth || "",
          gender: userData.gender || "",
          location: userData.location || "",
          bio: userData.bio || "",
          position: userData.position || "",
          experience: userData.experience || "",
          achievements: userData.achievements || [],
          statistics: userData.statistics || {
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            teamsJoined: 0,
            teamsCreated: 0,
            totalPoints: 0,
            winRate: 0,
            averageScore: 0,
            playTime: 0
          },
          preferences: userData.preferences || {
            notifications: {
              email: true,
              push: true,
              sms: false,
              tournamentUpdates: true,
              teamUpdates: true,
              matchReminders: true
            },
            privacy: {
              profileVisible: true,
              showEmail: false,
              showPhone: false,
              showLocation: true,
              showStatistics: true
            },
            theme: 'auto',
            language: 'en',
            timezone: 'UTC'
          },
          teams: userData.teams || [],
          tournaments: userData.tournaments || [],
          createdAt: userData.createdAt || new Date().toISOString(),
          lastActive: userData.lastActive || new Date().toISOString()
        })
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (): Promise<string> => {
    if (!imageFile || !user) return profile?.photoURL || ""

    const imageRef = ref(storage, `profile-images/${user.uid}/${Date.now()}`)
    await uploadBytes(imageRef, imageFile)
    return await getDownloadURL(imageRef)
  }

  const saveProfile = async () => {
    if (!profile || !user) return

    setSaving(true)
    try {
      let photoURL = profile.photoURL
      if (imageFile) {
        photoURL = await uploadImage()
      }

      const updatedProfile = {
        ...profile,
        photoURL,
        lastActive: new Date().toISOString()
      }

      await updateDoc(doc(db, "users", user.uid), updatedProfile)
      setProfile(updatedProfile)
      setEditing(false)
      setImageFile(null)
      setImagePreview("")
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const updatePreferences = async (section: keyof Preferences, key: string, value: any) => {
    if (!profile || !user) return

    const updatedProfile = {
      ...profile,
      preferences: {
        ...profile.preferences,
        [section]: {
          ...profile.preferences[section],
          [key]: value
        }
      }
    }

    setProfile(updatedProfile)
    await updateDoc(doc(db, "users", user.uid), {
      [`preferences.${section}.${key}`]: value
    })
  }

  if (loading) {
    return (
      <AnimatedPage>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AnimatedPage>
    )
  }

  if (!profile) {
    return (
      <AnimatedPage>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
            <p className="text-gray-600">Unable to load your profile information.</p>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <AnimatedButton
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2"
            >
              {editing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {editing ? "Cancel" : "Edit Profile"}
            </AnimatedButton>
        </div>
        </FadeIn>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <AnimatedCard className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={imagePreview || profile.photoURL} />
                  <AvatarFallback>
                          {profile.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                      {editing && (
                        <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex-1">
                      {editing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                              id="displayName"
                              value={profile.displayName}
                              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                              id="bio"
                              value={profile.bio}
                              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                              placeholder="Tell us about yourself..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="position">Position</Label>
                              <Select
                                value={profile.position}
                                onValueChange={(value) => setProfile({ ...profile, position: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="player">Player</SelectItem>
                                  <SelectItem value="captain">Captain</SelectItem>
                                  <SelectItem value="coach">Coach</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="spectator">Spectator</SelectItem>
                                </SelectContent>
                              </Select>
              </div>
                            <div>
                              <Label htmlFor="experience">Experience Level</Label>
                <Select
                                value={profile.experience}
                                onValueChange={(value) => setProfile({ ...profile, experience: value })}
                >
                  <SelectTrigger>
                                  <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                  <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                          </div>
                        </div>
                      ) : (
                  <div className="space-y-2">
                          <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                          <p className="text-gray-600">{profile.bio || "No bio added yet."}</p>
                          <div className="flex gap-2">
                            {profile.position && (
                              <Badge variant="secondary">{profile.position}</Badge>
                            )}
                            {profile.experience && (
                              <Badge variant="outline">{profile.experience}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              </StaggeredItem>

              <StaggeredItem>
                <AnimatedCard>
            <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                    {editing ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-gray-50"
                          />
                </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                  <Input
                            id="phone"
                            value={profile.phoneNumber}
                            onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                            placeholder="+1 (555) 123-4567"
                  />
                </div>
                        <div>
                          <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                            id="dob"
                    type="date"
                            value={profile.dateOfBirth}
                            onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  />
                </div>
                        <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                            value={profile.gender}
                            onValueChange={(value) => setProfile({ ...profile, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                        <div className="col-span-2">
                          <Label htmlFor="location">Location</Label>
                <Input
                            id="location"
                            value={profile.location}
                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                            placeholder="City, State, Country"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{profile.email}</span>
                        </div>
                        {profile.phoneNumber && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{profile.phoneNumber}</span>
                          </div>
                        )}
                        {profile.dateOfBirth && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{new Date(profile.dateOfBirth).toLocaleDateString()}</span>
                          </div>
                        )}
                        {profile.gender && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm capitalize">{profile.gender}</span>
                          </div>
                        )}
                        {profile.location && (
                          <div className="flex items-center gap-2 col-span-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{profile.location}</span>
                          </div>
                )}
              </div>
                    )}
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>

              {editing && (
                <StaggeredItem>
                  <div className="flex justify-end gap-4">
                    <AnimatedButton
                      variant="outline"
                      onClick={() => {
                        setEditing(false)
                        setImageFile(null)
                        setImagePreview("")
                        loadProfile()
                      }}
                    >
                      Cancel
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </AnimatedButton>
                  </div>
                </StaggeredItem>
              )}
            </StaggeredContainer>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Achievements
                    </CardTitle>
                    <CardDescription>
                      Your accomplishments and milestones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profile.achievements.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profile.achievements.map((achievement, index) => (
                          <AnimatedCard
                            key={achievement.id}
                            className="p-4 border-l-4 border-blue-500"
                            delay={index * 0.1}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <Award className="w-5 h-5 text-blue-600" />
                  </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{achievement.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {achievement.type}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(achievement.date).toLocaleDateString()}
                                  </span>
                  </div>
                  </div>
                            </div>
                          </AnimatedCard>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements Yet</h3>
                        <p className="text-gray-600">Start participating in tournaments and teams to earn achievements!</p>
                </div>
              )}
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>
            </StaggeredContainer>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Performance Statistics
                    </CardTitle>
                    <CardDescription>
                      Your gaming performance and activity metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <AnimatedCounter
                          value={profile.statistics.tournamentsPlayed}
                          className="text-3xl font-bold text-blue-600"
                        />
                        <p className="text-sm text-gray-600 mt-1">Tournaments Played</p>
                      </div>
                      <div className="text-center">
                        <AnimatedCounter
                          value={profile.statistics.tournamentsWon}
                          className="text-3xl font-bold text-green-600"
                        />
                        <p className="text-sm text-gray-600 mt-1">Tournaments Won</p>
                      </div>
                      <div className="text-center">
                        <AnimatedCounter
                          value={profile.statistics.matchesPlayed}
                          className="text-3xl font-bold text-purple-600"
                        />
                        <p className="text-sm text-gray-600 mt-1">Matches Played</p>
                      </div>
                      <div className="text-center">
                        <AnimatedCounter
                          value={profile.statistics.matchesWon}
                          className="text-3xl font-bold text-orange-600"
                        />
                        <p className="text-sm text-gray-600 mt-1">Matches Won</p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Win Rate</span>
                          <span className="text-sm text-gray-600">
                            {profile.statistics.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <AnimatedProgress
                          value={profile.statistics.winRate}
                          className="h-2"
                  />
                </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <AnimatedCounter
                            value={profile.statistics.teamsJoined}
                            className="text-2xl font-bold text-blue-600"
                          />
                          <p className="text-sm text-gray-600 mt-1">Teams Joined</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <AnimatedCounter
                            value={profile.statistics.teamsCreated}
                            className="text-2xl font-bold text-green-600"
                          />
                          <p className="text-sm text-gray-600 mt-1">Teams Created</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <AnimatedCounter
                            value={profile.statistics.totalPoints}
                            className="text-2xl font-bold text-purple-600"
                          />
                          <p className="text-sm text-gray-600 mt-1">Total Points</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <AnimatedCounter
                            value={profile.statistics.averageScore}
                            className="text-2xl font-bold text-orange-600"
                          />
                          <p className="text-sm text-gray-600 mt-1">Average Score</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>
            </StaggeredContainer>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Manage how you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-notifications">Email Notifications</Label>
                          <p className="text-sm text-gray-600">Receive notifications via email</p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={profile.preferences.notifications.email}
                          onCheckedChange={(checked) => 
                            updatePreferences('notifications', 'email', checked)
                          }
                  />
                </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-notifications">Push Notifications</Label>
                          <p className="text-sm text-gray-600">Receive push notifications</p>
              </div>
                        <Switch
                          id="push-notifications"
                          checked={profile.preferences.notifications.push}
                          onCheckedChange={(checked) => 
                            updatePreferences('notifications', 'push', checked)
                          }
                  />
                </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-notifications">SMS Notifications</Label>
                          <p className="text-sm text-gray-600">Receive SMS notifications</p>
                        </div>
                        <Switch
                          id="sms-notifications"
                          checked={profile.preferences.notifications.sms}
                          onCheckedChange={(checked) => 
                            updatePreferences('notifications', 'sms', checked)
                          }
                  />
                </div>
              </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Specific Notifications</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="tournament-updates">Tournament Updates</Label>
                            <p className="text-sm text-gray-600">Updates about tournaments you're in</p>
                          </div>
                          <Switch
                            id="tournament-updates"
                            checked={profile.preferences.notifications.tournamentUpdates}
                            onCheckedChange={(checked) => 
                              updatePreferences('notifications', 'tournamentUpdates', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="team-updates">Team Updates</Label>
                            <p className="text-sm text-gray-600">Updates about your teams</p>
                          </div>
                          <Switch
                            id="team-updates"
                            checked={profile.preferences.notifications.teamUpdates}
                            onCheckedChange={(checked) => 
                              updatePreferences('notifications', 'teamUpdates', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="match-reminders">Match Reminders</Label>
                            <p className="text-sm text-gray-600">Reminders for upcoming matches</p>
                          </div>
                          <Switch
                            id="match-reminders"
                            checked={profile.preferences.notifications.matchReminders}
                            onCheckedChange={(checked) => 
                              updatePreferences('notifications', 'matchReminders', checked)
                            }
                />
              </div>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>

              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Privacy Settings
                    </CardTitle>
                    <CardDescription>
                      Control what information is visible to others
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="profile-visible">Profile Visible</Label>
                          <p className="text-sm text-gray-600">Allow others to see your profile</p>
                        </div>
                        <Switch
                          id="profile-visible"
                          checked={profile.preferences.privacy.profileVisible}
                          onCheckedChange={(checked) => 
                            updatePreferences('privacy', 'profileVisible', checked)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="show-email">Show Email</Label>
                          <p className="text-sm text-gray-600">Display email on profile</p>
                        </div>
                        <Switch
                          id="show-email"
                          checked={profile.preferences.privacy.showEmail}
                          onCheckedChange={(checked) => 
                            updatePreferences('privacy', 'showEmail', checked)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="show-phone">Show Phone</Label>
                          <p className="text-sm text-gray-600">Display phone number on profile</p>
                        </div>
                        <Switch
                          id="show-phone"
                          checked={profile.preferences.privacy.showPhone}
                          onCheckedChange={(checked) => 
                            updatePreferences('privacy', 'showPhone', checked)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="show-location">Show Location</Label>
                          <p className="text-sm text-gray-600">Display location on profile</p>
                        </div>
                        <Switch
                          id="show-location"
                          checked={profile.preferences.privacy.showLocation}
                          onCheckedChange={(checked) => 
                            updatePreferences('privacy', 'showLocation', checked)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="show-statistics">Show Statistics</Label>
                          <p className="text-sm text-gray-600">Display statistics on profile</p>
                        </div>
                        <Switch
                          id="show-statistics"
                          checked={profile.preferences.privacy.showStatistics}
                          onCheckedChange={(checked) => 
                            updatePreferences('privacy', 'showStatistics', checked)
                          }
                        />
                      </div>
              </div>
            </CardContent>
                </AnimatedCard>
              </StaggeredItem>

              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      App Settings
                    </CardTitle>
                    <CardDescription>
                      Customize your app experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="theme">Theme</Label>
                        <Select
                          value={profile.preferences.theme}
                          onValueChange={(value) => 
                            updatePreferences('theme', 'theme', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={profile.preferences.language}
                          onValueChange={(value) => 
                            updatePreferences('language', 'language', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
          </div>
        </div>
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>
            </StaggeredContainer>
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedPage>
  )
}
