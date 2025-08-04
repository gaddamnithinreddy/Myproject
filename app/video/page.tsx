"use client"

import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Square, Download, Upload, VideoIcon, Loader2 } from "lucide-react"
import { useState, useRef, useCallback, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

export default function VideoPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingChunks, setRecordingChunks] = useState<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const startRecording = useCallback(async () => {
    setRecordedVideoUrl(null)
    setRecordingChunks([])
    setUploadProgress(0)
    setUploading(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordingChunks((prev) => [...prev, event.data])
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(recordingChunks, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedVideoUrl(url)
        if (previewVideoRef.current) {
          previewVideoRef.current.src = url
          previewVideoRef.current.load() // Load the new video source
        }
        stream.getTracks().forEach((track) => track.stop()) // Stop camera/mic
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      toast({ title: "Recording started!", description: "Capturing video and audio." })
    } catch (error: any) {
      console.error("Error accessing media devices:", error)
      toast({
        title: "Recording Failed",
        description: `Could not access camera/microphone: ${error.message}`,
        variant: "destructive",
      })
    }
  }, [recordingChunks])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
      setIsRecording(false)
      toast({ title: "Recording stopped!", description: "Video saved locally." })
    }
  }, [mediaRecorder])

  const downloadVideo = useCallback(() => {
    if (recordedVideoUrl) {
      const a = document.createElement("a")
      a.href = recordedVideoUrl
      a.download = `keyconnect_video_${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast({ title: "Download started!", description: "Your video is being downloaded." })
    } else {
      toast({ title: "No video to download", description: "Record a video first.", variant: "destructive" })
    }
  }, [recordedVideoUrl])

  const uploadVideo = useCallback(() => {
    if (!recordedVideoUrl) {
      toast({ title: "No video to upload", description: "Record a video first.", variant: "destructive" })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setUploadProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setUploading(false)
        toast({ title: "Upload Complete!", description: "Video uploaded to cloud. (Simulated)", variant: "success" })
        // In a real application, you would send the 'recordedVideoUrl' (or the Blob) to your backend
        // for actual cloud storage (e.g., Firebase Storage, AWS S3, Cloudinary).
      }
    }, 200)
  }, [recordedVideoUrl])

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl)
      }
    }
  }, [recordedVideoUrl])

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Video Recording & Playback</h1>
        <p className="text-gray-600">Record and manage videos for your team's schedules and highlights.</p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VideoIcon className="h-5 w-5" /> Live Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              {!isRecording && !recordedVideoUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <p>Camera Preview</p>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              {!isRecording ? (
                <Button onClick={startRecording} disabled={uploading}>
                  <Play className="mr-2 h-4 w-4" /> Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="mr-2 h-4 w-4" /> Stop Recording
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {recordedVideoUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" /> Recorded Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                <video ref={previewVideoRef} src={recordedVideoUrl} controls className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button onClick={downloadVideo} variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Download Video
                </Button>
                <Button onClick={uploadVideo} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{" "}
                  {uploading ? `Uploading (${uploadProgress}%)` : "Upload to Cloud"}
                </Button>
              </div>
              {uploading && <Progress value={uploadProgress} className="w-full mt-2" />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Video Library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This section would display a list of your recorded and uploaded videos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Placeholder for video items */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <VideoIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Browse All Videos
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
import { History } from "lucide-react"
