"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Video, 
  VideoOff, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Upload, 
  Trash2, 
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface VideoRecorderProps {
  onVideoReady?: (videoBlob: Blob, videoUrl: string) => void
  onVideoUpload?: (videoFile: File) => Promise<void>
  maxDuration?: number // in seconds
  quality?: 'low' | 'medium' | 'high'
  className?: string
  title?: string
  showUpload?: boolean
  showDownload?: boolean
}

export default function VideoRecorder({
  onVideoReady,
  onVideoUpload,
  maxDuration = 300, // 5 minutes default
  quality = 'medium',
  className = "",
  title = "Video Recorder",
  showUpload = true,
  showDownload = true
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  
  const { toast } = useToast()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Get video quality settings
  const getVideoQuality = () => {
    switch (quality) {
      case 'low':
        return { width: 640, height: 480, frameRate: 24 }
      case 'high':
        return { width: 1920, height: 1080, frameRate: 60 }
      default: // medium
        return { width: 1280, height: 720, frameRate: 30 }
    }
  }

  // Request camera permission and initialize stream
  const initializeCamera = async () => {
    try {
      setError(null)
      
      const constraints = {
        video: {
          ...getVideoQuality(),
          facingMode: 'environment' // Use back camera if available
        },
        audio: true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      setHasPermission(true)
    } catch (err) {
      console.error('Failed to access camera:', err)
      setError('Failed to access camera. Please check permissions.')
      setHasPermission(false)
      toast({
        title: "Camera Access Error",
        description: "Please allow camera access to record video.",
        variant: "destructive"
      })
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!streamRef.current) {
      await initializeCamera()
      if (!streamRef.current) return
    }

    try {
      chunksRef.current = []
      
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: quality === 'high' ? 8000000 : quality === 'medium' ? 4000000 : 2000000
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const videoUrl = URL.createObjectURL(blob)
        setRecordedVideo(videoUrl)
        
        if (onVideoReady) {
          onVideoReady(blob, videoUrl)
        }
        
        toast({
          title: "Recording Complete",
          description: "Video has been recorded successfully."
        })
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording failed. Please try again.')
        setIsRecording(false)
        setIsPaused(false)
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      toast({
        title: "Recording Started",
        description: "Video recording is now active."
      })
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Failed to start recording. Please try again.')
    }
  }

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      toast({
        title: "Recording Resumed",
        description: "Video recording has resumed."
      })
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      toast({
        title: "Recording Paused",
        description: "Video recording has been paused."
      })
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Play/Pause recorded video
  const togglePlayback = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // Download recorded video
  const downloadVideo = () => {
    if (!recordedVideo) return

    const link = document.createElement('a')
    link.href = recordedVideo
    link.download = `recording-${Date.now()}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download Started",
      description: "Video download has begun."
    })
  }

  // Upload video
  const uploadVideo = async () => {
    if (!recordedVideo || !onVideoUpload) return

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Convert blob URL to File
      const response = await fetch(recordedVideo)
      const blob = await response.blob()
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' })

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await onVideoUpload(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      toast({
        title: "Upload Complete",
        description: "Video has been uploaded successfully."
      })
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Upload failed. Please try again.')
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Clear recorded video
  const clearVideo = () => {
    setRecordedVideo(null)
    setRecordingTime(0)
    setUploadProgress(0)
    setIsPlaying(false)
    setError(null)
    
    if (videoRef.current) {
      videoRef.current.src = ""
      videoRef.current.srcObject = streamRef.current
    }
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo)
      }
    }
  }, [recordedVideo])

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera()
  }, [])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera Permission Status */}
        {hasPermission === false && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-700">
              Camera access denied. Please allow camera permissions to record video.
            </span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Video Display */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            autoPlay
            muted
            playsInline
          />
          
          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <Badge variant="destructive" className="text-xs">
                {formatTime(recordingTime)}
              </Badge>
            </div>
          )}

          {/* Pause Indicator */}
          {isPaused && (
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="text-xs">
                PAUSED
              </Badge>
            </div>
          )}

          {/* Play/Pause Overlay for recorded video */}
          {recordedVideo && !isRecording && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <Button
                size="lg"
                variant="secondary"
                onClick={togglePlayback}
                className="rounded-full w-16 h-16"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        {!recordedVideo && (
          <div className="flex justify-center gap-2">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={hasPermission === false}
                className="flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button
                  onClick={togglePause}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
          </div>
        )}

        {/* Recorded Video Controls */}
        {recordedVideo && (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              <Button
                onClick={togglePlayback}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              {showDownload && (
                <Button
                  onClick={downloadVideo}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              
              {showUpload && onVideoUpload && (
                <Button
                  onClick={uploadVideo}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              )}
              
              <Button
                onClick={clearVideo}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Recording Info */}
            <div className="text-center text-sm text-gray-600">
              <p>Duration: {formatTime(recordingTime)}</p>
              <p>Quality: {quality.toUpperCase()}</p>
              <p>Format: WebM (VP9 + Opus)</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!recordedVideo && !isRecording && (
          <div className="text-center text-sm text-gray-600">
            <p>Click "Start Recording" to begin capturing video</p>
            <p>Maximum duration: {formatTime(maxDuration)}</p>
            <p>Quality: {quality.toUpperCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Video Player Component for playback
export function VideoPlayer({ 
  src, 
  title, 
  className = "",
  showDownload = true,
  showFullscreen = true 
}: { 
  src: string
  title?: string
  className?: string
  showDownload?: boolean
  showFullscreen?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const downloadVideo = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = title || `video-${Date.now()}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={src}
            className="w-full h-64 object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="space-y-2">
              {/* Progress Bar */}
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Volume Control */}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                  
                  {/* Fullscreen */}
                  {showFullscreen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Download */}
                  {showDownload && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={downloadVideo}
                      className="text-white hover:bg-white/20"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 