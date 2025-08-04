"use client"

import type React from "react"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, MapPin, PlusCircle, ExternalLink } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import MapPicker from "@/components/MapPicker"
import MapView from "@/components/MapView"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Loader2 } from "lucide-react"
import { useRef } from "react"
import { Badge } from "@/components/ui/badge"

interface Event {
  id: string
  teamId: string
  title: string
  date: Date
  time: string
  location: {
    address: string
    coordinates: { lat: number; lng: number }
  }
  courtNumber?: string
  scheduleType: "practice" | "game"
  status: "tentative" | "confirmed" | "cancelled"
  rsvp?: { [userId: string]: "yes" | "no" | "maybe" }
  videoUrl?: string
  description?: string
}

export default function SchedulePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [newEvent, setNewEvent] = useState({
    teamId: "", // To be selected or passed in
    title: "",
    date: new Date(),
    time: "",
    address: "",
    coordinates: { lat: 0, lng: 0 },
    courtNumber: "",
    scheduleType: "practice" as "practice" | "game",
    status: "tentative" as "tentative" | "confirmed" | "cancelled",
    description: "",
  })
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [videoUploadingId, setVideoUploadingId] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("")
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      setEvents([])
      return
    }
    setLoading(true)
    setError(null)
    const q = query(
      collection(db, "events"),
      where("userId", "==", user.uid),
      orderBy("date", "asc")
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedEvents = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            teamId: data.teamId,
            title: data.title,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            time: data.time,
          location: {
              address: data.location?.address || "",
              coordinates: data.location?.coordinates || { lat: 0, lng: 0 },
          },
            courtNumber: data.courtNumber,
            scheduleType: data.scheduleType,
            status: data.status,
            rsvp: data.rsvp || {},
            videoUrl: data.videoUrl,
            description: data.description,
          } as Event
        })
        setEvents(fetchedEvents)
        setLoading(false)
      } catch (err: any) {
        setEvents([])
        setLoading(false)
        setError("Failed to load events: " + err.message)
      }
    }, (err) => {
      setEvents([])
      setLoading(false)
      setError("Failed to load events: " + err.message)
  })
    return () => unsubscribe()
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setNewEvent((prev) => ({ ...prev, [id]: value }))
  }

  const handleDateSelect = (date?: Date) => {
    if (date) {
      setNewEvent((prev) => ({ ...prev, date }))
    }
  }

  const handleLocationSelect = (place: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }) => {
    setNewEvent((prev) => ({
      ...prev,
      address: place.address,
      coordinates: place.coordinates,
    }))
    setIsMapPickerOpen(false)
  }

  const validateScheduleForm = () => {
    const errors: { [key: string]: string } = {}
    if (!newEvent.teamId) errors.teamId = "Team is required."
    if (!newEvent.title) errors.title = "Title is required."
    if (!newEvent.date) errors.date = "Date is required."
    if (!newEvent.time) errors.time = "Time is required."
    if (!newEvent.address) errors.address = "Address is required."
    return errors
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const errors = validateScheduleForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to add events.",
        variant: "destructive",
      })
      return
    }
    if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required event details.",
        variant: "destructive",
      })
      return
    }
    try {
      await addDoc(collection(db, "events"), {
        userId: user.uid,
        teamId: newEvent.teamId,
      title: newEvent.title,
        date: Timestamp.fromDate(newEvent.date),
      time: newEvent.time,
      location: {
        address: newEvent.address,
        coordinates: newEvent.coordinates,
      },
        courtNumber: newEvent.courtNumber,
        scheduleType: newEvent.scheduleType,
        status: newEvent.status,
        rsvp: {},
        videoUrl: "",
      description: newEvent.description,
        createdAt: Timestamp.now(),
      })
    setNewEvent({
        teamId: "",
      title: "",
      date: new Date(),
      time: "",
      address: "",
      coordinates: { lat: 0, lng: 0 },
        courtNumber: "",
        scheduleType: "practice",
        status: "tentative",
      description: "",
    })
    toast({
      title: "Event Added!",
        description: `Your event has been added to your schedule.`,
      })
      // TODO: Send notifications to team members here if needed
    } catch (err: any) {
      toast({
        title: "Error Adding Event",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (event: Event) => {
    setEditEvent(event)
    setIsEditDialogOpen(true)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editEvent) return
    const { id, value } = e.target
    setEditEvent({ ...editEvent, [id]: value })
  }

  const handleEditDateSelect = (date?: Date) => {
    if (!editEvent || !date) return
    setEditEvent({ ...editEvent, date })
  }

  const handleEditLocationSelect = (place: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }) => {
    if (!editEvent) return
    setEditEvent({
      ...editEvent,
      location: {
        address: place.address,
        coordinates: place.coordinates,
      },
    })
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !editEvent) return
    setEditLoading(true)
    try {
      await updateDoc(doc(db, "events", editEvent.id), {
        title: editEvent.title,
        date: Timestamp.fromDate(editEvent.date),
        time: editEvent.time,
        location: editEvent.location,
        description: editEvent.description,
      })
      setIsEditDialogOpen(false)
      setEditEvent(null)
      toast({
        title: "Event Updated!",
        description: `Your event has been updated.`,
      })
    } catch (err: any) {
      toast({
        title: "Error Updating Event",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteEvent = async () => {
    if (!user || !eventToDelete) return
    setDeleteLoading(true)
    try {
      await deleteDoc(doc(db, "events", eventToDelete.id))
      setIsDeleteDialogOpen(false)
      setEventToDelete(null)
      toast({
        title: "Event Deleted!",
        description: `Your event has been deleted.`,
    })
    } catch (err: any) {
      toast({
        title: "Error Deleting Event",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Video upload handler
  const handleVideoUpload = async (eventId: string, file: File) => {
    setVideoUploadingId(eventId)
    try {
      const storage = getStorage()
      const storageRef = ref(storage, `schedule_videos/${eventId}/${file.name}`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      await updateDoc(doc(db, "events", eventId), { videoUrl: downloadURL })
      toast({ title: "Video uploaded!", description: "Video attached to event." })
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" })
    } finally {
      setVideoUploadingId(null)
    }
  }

  const handleRsvp = async (eventId: string, response: "yes" | "no" | "maybe") => {
    if (!user) return
    setRsvpLoadingId(eventId)
    try {
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, { [`rsvp.${user.uid}`]: response })
      toast({ title: "RSVP Updated!", description: `You responded: ${response}` })
    } catch (error: any) {
      toast({ title: "Error updating RSVP", description: error.message, variant: "destructive" })
    } finally {
      setRsvpLoadingId(null)
    }
  }

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ title: "Recording not supported", description: "Your browser does not support video recording.", variant: "destructive" })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setRecordedChunks([])
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data])
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" })
        setRecordedVideoUrl(URL.createObjectURL(blob))
      }
      recorder.start()
      setRecording(true)
    } catch (error: any) {
      toast({ title: "Error starting recording", description: error.message, variant: "destructive" })
    }
  }
  const handleStopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop()
      setRecording(false)
    }
  }
  const handleUploadRecordedVideo = async (eventId: string) => {
    if (!user || recordedChunks.length === 0) return
    const blob = new Blob(recordedChunks, { type: "video/webm" })
    const storage = getStorage()
    const storageRef = ref(storage, `schedule_videos/${eventId}/recorded_${Date.now()}.webm`)
    try {
      toast({ title: "Uploading recorded video..." })
      await uploadBytes(storageRef, blob)
      const downloadURL = await getDownloadURL(storageRef)
      await updateDoc(doc(db, "events", eventId), { videoUrl: downloadURL })
      toast({ title: "Video uploaded!", description: "Video attached to event." })
      setRecordedChunks([])
      setRecordedVideoUrl("")
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" })
    }
  }

  // Helper to get RSVP summary
  const getRsvpSummary = (event: Event) => {
    const summary = { yes: 0, no: 0, maybe: 0 }
    if (event.rsvp) {
      Object.values(event.rsvp).forEach((resp) => {
        if (resp === "yes") summary.yes++
        if (resp === "no") summary.no++
        if (resp === "maybe") summary.maybe++
      })
    }
    return summary
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-8 w-48" />
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-red-500">
          <p className="text-lg font-semibold mb-2">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-2xl font-bold">My Schedule</h1>
          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                  <CardContent><Skeleton className="h-4 w-full" /></CardContent>
            </Card>
              ))}
            </div>
          ) : (
            events
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((event) => (
                <Card key={event.id} className="transition-all duration-300 ease-in-out hover:shadow-lg mb-4 w-full max-w-2xl mx-auto">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{event.title}</CardTitle>
                    <Badge variant={
                      event.status === "confirmed" ? "default" :
                      event.status === "cancelled" ? "destructive" :
                      "secondary"
                    }>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditClick(event)} aria-label="Edit Event" className="focus:ring-2 focus:ring-primary focus:outline-none">Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(event)} aria-label="Delete Event" className="focus:ring-2 focus:ring-primary focus:outline-none">Delete</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(event.date, "PPP")} at {event.time}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.location.address}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm" className="h-auto p-0 ml-2">
                            View on Map
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[500px]">
                          <DialogHeader>
                            <DialogTitle>Event Location</DialogTitle>
                            <DialogDescription>View the event location on the map.</DialogDescription>
                          </DialogHeader>
                          <MapView
                            coordinates={event.location.coordinates}
                            zoom={14}
                            className="h-[400px] w-full"
                            address={event.location.address}
                          />
                        </DialogContent>
                      </Dialog>
                    </p>
                    {event.description && <p className="text-sm text-muted-foreground mt-2">{event.description}</p>}
                    {/* Video upload/recording (admin/owner only) */}
                    {user && /* TODO: check if user is admin/owner for the event's team */ true && (
                      <div className="mt-4">
                        <Label>Upload/Record Video</Label>
                        <Input id={`video-upload-${event.id}`} type="file" accept="video/*" onChange={e => {
                          if (e.target.files && e.target.files[0]) handleVideoUpload(event.id, e.target.files[0])
                        }} disabled={videoUploadingId === event.id} ref={videoInputRef} aria-label="Upload or record video" />
                        {videoUploadingId === event.id && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                        <div className="flex gap-2 mt-2">
                          {!recording ? (
                            <Button size="sm" onClick={handleStartRecording}>Record Video</Button>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={handleStopRecording}>Stop Recording</Button>
                          )}
                          {recordedVideoUrl && (
                            <>
                              <video src={recordedVideoUrl} controls className="w-full max-w-xs mt-2 rounded" />
                              <Button size="sm" onClick={() => handleUploadRecordedVideo(event.id)}>Upload Recorded Video</Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Display video if present */}
                    {event.videoUrl && (
                      <div className="mt-4">
                        <video src={event.videoUrl} controls className="w-full max-w-xs mt-2 rounded" />
                      </div>
                    )}
                    {user && (
                      <div className="flex gap-2 mt-2">
                        <span>Your RSVP:</span>
                        <Button size="sm" variant={event.rsvp?.[user.uid] === "yes" ? "default" : "outline"} onClick={() => handleRsvp(event.id, "yes")}
disabled={rsvpLoadingId === event.id}>
  {rsvpLoadingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes"}
</Button>
                        <Button size="sm" variant={event.rsvp?.[user.uid] === "no" ? "default" : "outline"} onClick={() => handleRsvp(event.id, "no")}
disabled={rsvpLoadingId === event.id}>
  {rsvpLoadingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "No"}
</Button>
                        <Button size="sm" variant={event.rsvp?.[user.uid] === "maybe" ? "default" : "outline"} onClick={() => handleRsvp(event.id, "maybe")}
disabled={rsvpLoadingId === event.id}>
  {rsvpLoadingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Maybe"}
</Button>
                        {event.rsvp?.[user.uid] && <span className="ml-2">({event.rsvp[user.uid]})</span>}
                      </div>
                    )}
                    {user && /* TODO: check if user is admin/owner for the event's team */ true && event.rsvp && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold">RSVP Summary:</span>
                        <span className="ml-2">Yes: {getRsvpSummary(event).yes}</span>
                        <span className="ml-2">No: {getRsvpSummary(event).no}</span>
                        <span className="ml-2">Maybe: {getRsvpSummary(event).maybe}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Add New Event Form */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle>Add New Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEvent} className="space-y-4">
              {/* Team selection (if user is in multiple teams) */}
              <Label htmlFor="teamId">Team</Label>
              <Input id="teamId" value={newEvent.teamId} onChange={e => setNewEvent(prev => ({ ...prev, teamId: e.target.value }))} placeholder="Enter Team ID (or select from dropdown)" required aria-label="Select team" />
              {fieldErrors.teamId && <p className="text-xs text-red-600">{fieldErrors.teamId}</p>}
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={newEvent.title} onChange={handleInputChange} required aria-label="Event title" />
              {fieldErrors.title && <p className="text-xs text-red-600">{fieldErrors.title}</p>}
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={format(newEvent.date, 'yyyy-MM-dd')} onChange={e => setNewEvent(prev => ({ ...prev, date: new Date(e.target.value) }))} required aria-label="Event date" />
              {fieldErrors.date && <p className="text-xs text-red-600">{fieldErrors.date}</p>}
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={newEvent.time} onChange={handleInputChange} required aria-label="Event time" />
              {fieldErrors.time && <p className="text-xs text-red-600">{fieldErrors.time}</p>}
              <Label htmlFor="courtNumber">Court Number</Label>
              <Input id="courtNumber" value={newEvent.courtNumber} onChange={e => setNewEvent(prev => ({ ...prev, courtNumber: e.target.value }))} aria-label="Court number" />
              <Label htmlFor="scheduleType">Type</Label>
              <select id="scheduleType" value={newEvent.scheduleType} onChange={e => setNewEvent(prev => ({ ...prev, scheduleType: e.target.value as "practice" | "game" }))}>
                <option value="practice">Practice</option>
                <option value="game">Game</option>
              </select>
              <Label htmlFor="status">Status</Label>
              <select id="status" value={newEvent.status} onChange={e => setNewEvent(prev => ({ ...prev, status: e.target.value as "tentative" | "confirmed" | "cancelled" }))}>
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Label htmlFor="address">Location</Label>
              <Input id="address" value={newEvent.address} onChange={handleInputChange} required aria-label="Event location" />
              {fieldErrors.address && <p className="text-xs text-red-600">{fieldErrors.address}</p>}
              <Button type="button" onClick={() => setIsMapPickerOpen(true)} aria-label="Pick location on map" className="w-full focus:ring-2 focus:ring-primary focus:outline-none">Pick on Map</Button>
              {isMapPickerOpen && <MapPicker onPlaceSelect={handleLocationSelect} />}
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newEvent.description} onChange={handleInputChange} aria-label="Event description" />
              <div className="space-y-2">
                <Label htmlFor="video">Upload Video (optional)</Label>
                <Input id="video" type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} aria-label="Upload video" />
                {uploading && <span>Uploading...</span>}
              </div>
              <Button
                type="submit"
                disabled={loading || uploading}
                aria-label="Add Event"
                className="w-full focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update your event details below.</DialogDescription>
          </DialogHeader>
          {editEvent && (
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={editEvent.title}
                  onChange={handleEditInputChange}
                  required
                  aria-label="Edit event title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${
                        !editEvent.date && "text-muted-foreground"
                      }`}
                      aria-label="Edit event date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editEvent.date ? format(editEvent.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={editEvent.date} onSelect={handleEditDateSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={editEvent.time} onChange={handleEditInputChange} required aria-label="Edit event time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Location</Label>
                <Input
                  id="address"
                  value={editEvent.location.address}
                  onChange={handleEditInputChange}
                  readOnly
                  required
                  aria-label="Edit event location"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full bg-transparent" aria-label="Select location on map">
                      <MapPin className="mr-2 h-4 w-4" />
                      Select Location on Map
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[500px]">
                    <DialogHeader>
                      <DialogTitle>Pick Event Location</DialogTitle>
                    </DialogHeader>
                    <MapPicker
                      onPlaceSelect={handleEditLocationSelect}
                      initialLocation={{
                        address: editEvent.location.address,
                        city: "",
                        state: "",
                        country: "",
                        zipCode: "",
                        coordinates: editEvent.location.coordinates,
                      }}
                      className="h-[400px] w-full"
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={editEvent.description}
                  onChange={handleEditInputChange}
                  rows={3}
                  aria-label="Edit event description"
                />
              </div>
              <Button type="submit" className="w-full" disabled={editLoading} aria-label="Save changes">
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>Are you sure you want to delete this event? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteLoading} aria-label="Cancel delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={deleteLoading} aria-label="Confirm delete">
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
      </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
