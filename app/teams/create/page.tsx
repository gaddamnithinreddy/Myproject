"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import MapPicker from "@/components/MapPicker"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

export default function CreateTeamPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [iconUploading, setIconUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    description: "",
    type: "public" as "public" | "private" | "tournament",
    orgType: "individual" as "club" | "organization" | "individual",
    maxMembers: "",
    ageGroup: "",
    status: "active" as "active" | "inactive",
    icon: "",
    location: {
      address: userProfile?.address || "",
      city: userProfile?.city || "",
      state: userProfile?.state || "",
      country: userProfile?.country || "",
      zipCode: userProfile?.zipCode || "",
      coordinates: userProfile?.coordinates || { lat: 0, lng: 0 },
    },
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: string, value: string) => {
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

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]
    setIconUploading(true)
    const storage = getStorage()
    const storageRef = ref(storage, `team_icons/${user.uid}/${file.name}`)
    try {
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      setFormData((prev) => ({ ...prev, icon: downloadURL }))
      toast({ title: "Icon Uploaded!", description: "Team icon uploaded successfully." })
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setIconUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create a team.",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      const newTeam = {
        name: formData.name,
        sport: formData.sport.trim().toLowerCase(),
        description: formData.description,
        ownerId: user.uid,
        adminIds: [user.uid],
        memberIds: [user.uid],
        type: formData.type,
        orgType: formData.orgType,
        maxMembers: formData.maxMembers ? Number.parseInt(formData.maxMembers) : null,
        ageGroup: formData.ageGroup,
        status: formData.status,
        icon: formData.icon,
        location: formData.location,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
      const docRef = await addDoc(collection(db, "teams"), newTeam)
      await addDoc(collection(db, "teamMembers"), {
        teamId: docRef.id,
        userId: user.uid,
        role: "owner",
        joinedAt: Timestamp.now(),
      })
      toast({ title: "Team Created!", description: `${formData.name} has been successfully created.` })
      router.push(`/teams/${docRef.id}`)
    } catch (error: any) {
      toast({ title: "Error Creating Team", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Create New Team</h1>
        <p className="text-gray-600">Fill out the form below to create your new team.</p>

        <Card>
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input id="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., The Raptors" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport *</Label>
                  <Input id="sport" value={formData.sport} onChange={handleInputChange} placeholder="e.g., Basketball, Soccer" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Team Icon</Label>
                <Input id="icon" type="file" accept="image/*" ref={fileInputRef} onChange={handleIconChange} />
                {iconUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {formData.icon && <img src={formData.icon} alt="Team Icon" className="h-16 w-16 rounded-full mt-2" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={handleInputChange} placeholder="Tell us about your team..." rows={4} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Team Type</Label>
                  <Select value={formData.type} onValueChange={(value: "public" | "private" | "tournament") => setFormData((prev) => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgType">Organization Type</Label>
                  <Select value={formData.orgType} onValueChange={(value: "club" | "organization" | "individual") => setFormData((prev) => ({ ...prev, orgType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="club">Club</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxMembers">Max Members (Optional)</Label>
                  <Input id="maxMembers" type="number" value={formData.maxMembers} onChange={handleInputChange} placeholder="e.g., 12" min="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ageGroup">Age Group</Label>
                  <Input id="ageGroup" value={formData.ageGroup} onChange={handleInputChange} placeholder="e.g., Under 18" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Team Status</Label>
                <Select value={formData.status} onValueChange={(value: "active" | "inactive") => setFormData((prev) => ({ ...prev, status: value }))}>
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
                <Label htmlFor="location">Team Home Location</Label>
                <MapPicker onPlaceSelect={handleLocationSelect} initialLocation={formData.location.address ? formData.location : undefined} className="h-[400px] w-full" />
                {formData.location.address && (
                  <Input id="addressDisplay" value={formData.location.address} readOnly className="mt-2" placeholder="Selected Address" />
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Create Team
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
