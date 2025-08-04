"use client"

import { db, storage } from '@/lib/firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

export interface VideoRecording {
  id: string
  title: string
  description?: string
  scheduleId?: string
  teamId?: string
  tournamentId?: string
  type: 'practice' | 'game' | 'tournament' | 'training' | 'highlights'
  videoUrl: string
  thumbnailUrl?: string
  duration?: number // in seconds
  fileSize: number // in bytes
  quality: '720p' | '1080p' | '4K'
  recordedBy: string
  recordedByName: string
  recordedAt: Date
  uploadedAt: Date
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  visibility: 'public' | 'team' | 'private'
  tags?: string[]
  views: number
  likes: number
  comments: number
  isLive?: boolean
  liveStreamUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface VideoComment {
  id: string
  videoId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  timestamp?: number // timestamp in video (seconds)
  createdAt: Date
  updatedAt: Date
  replies?: VideoComment[]
  likes: number
  isEdited: boolean
}

class VideoService {
  // Upload video recording
  async uploadVideo(
    file: File,
    metadata: {
      title: string
      description?: string
      scheduleId?: string
      teamId?: string
      tournamentId?: string
      type: VideoRecording['type']
      quality: VideoRecording['quality']
      visibility: VideoRecording['visibility']
      tags?: string[]
    },
    recordedBy: string,
    recordedByName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const videoId = uuidv4()
      const fileName = `${videoId}_${file.name}`
      const videoRef = ref(storage, `videos/${fileName}`)

      // Create video record first
      const videoData: Omit<VideoRecording, 'id' | 'videoUrl'> = {
        ...metadata,
        fileSize: file.size,
        recordedBy,
        recordedByName,
        recordedAt: new Date(),
        uploadedAt: new Date(),
        status: 'uploading',
        views: 0,
        likes: 0,
        comments: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'videos'), videoData)

      // Upload file to Firebase Storage
      const uploadTask = uploadBytes(videoRef, file)
      
      if (onProgress) {
        onProgress(0)
      }

      const uploadResult = await uploadTask
      const videoUrl = await getDownloadURL(uploadResult.ref)

      // Update video record with URL
      await updateDoc(docRef, {
        videoUrl,
        status: 'processing',
        updatedAt: serverTimestamp()
      })

      if (onProgress) {
        onProgress(100)
      }

      // Mark as ready after processing simulation
      setTimeout(async () => {
        await updateDoc(docRef, {
          status: 'ready',
          updatedAt: serverTimestamp()
        })
      }, 2000)

      return docRef.id
    } catch (error) {
      console.error('Error uploading video:', error)
      throw error
    }
  }

  // Get video by ID
  async getVideo(videoId: string): Promise<VideoRecording | null> {
    try {
      const docSnap = await getDoc(doc(db, 'videos', videoId))
      if (!docSnap.exists()) return null

      return {
        id: docSnap.id,
        ...docSnap.data(),
        recordedAt: docSnap.data().recordedAt?.toDate(),
        uploadedAt: docSnap.data().uploadedAt?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      } as VideoRecording
    } catch (error) {
      console.error('Error getting video:', error)
      return null
    }
  }

  // Get videos for a team
  async getTeamVideos(teamId: string): Promise<VideoRecording[]> {
    try {
      const q = query(
        collection(db, 'videos'),
        where('teamId', '==', teamId),
        where('status', '==', 'ready'),
        orderBy('recordedAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recordedAt: doc.data().recordedAt?.toDate(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as VideoRecording[]
    } catch (error) {
      console.error('Error getting team videos:', error)
      throw error
    }
  }

  // Get videos for a schedule/game
  async getScheduleVideos(scheduleId: string): Promise<VideoRecording[]> {
    try {
      const q = query(
        collection(db, 'videos'),
        where('scheduleId', '==', scheduleId),
        where('status', '==', 'ready'),
        orderBy('recordedAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recordedAt: doc.data().recordedAt?.toDate(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as VideoRecording[]
    } catch (error) {
      console.error('Error getting schedule videos:', error)
      throw error
    }
  }

  // Record view
  async recordView(videoId: string, userId: string): Promise<void> {
    try {
      // Increment view count
      await updateDoc(doc(db, 'videos', videoId), {
        views: arrayUnion(userId),
        updatedAt: serverTimestamp()
      })

      // Create playback session
      const sessionData = {
        videoId,
        userId,
        startTime: new Date(),
        watchedDuration: 0,
        totalDuration: 0,
        completionPercentage: 0,
        device: navigator.userAgent,
        createdAt: new Date()
      }

      await addDoc(collection(db, 'videoSessions'), sessionData)
    } catch (error) {
      console.error('Error recording view:', error)
    }
  }

  // Like/unlike video
  async toggleLike(videoId: string, userId: string): Promise<boolean> {
    try {
      const videoRef = doc(db, 'videos', videoId)
      const videoSnap = await getDoc(videoRef)
      
      if (!videoSnap.exists()) return false

      const video = videoSnap.data() as VideoRecording
      const currentLikes = video.likes || 0
      const hasLiked = false // You'd need to track this separately

      if (hasLiked) {
        await updateDoc(videoRef, {
          likes: Math.max(0, currentLikes - 1),
          updatedAt: serverTimestamp()
        })
        return false
      } else {
        await updateDoc(videoRef, {
          likes: currentLikes + 1,
          updatedAt: serverTimestamp()
        })
        return true
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      return false
    }
  }

  // Add comment
  async addComment(
    videoId: string,
    userId: string,
    userName: string,
    content: string,
    timestamp?: number,
    userAvatar?: string
  ): Promise<string> {
    try {
      const commentData: Omit<VideoComment, 'id'> = {
        videoId,
        userId,
        userName,
        userAvatar,
        content,
        timestamp,
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        isEdited: false
      }

      const docRef = await addDoc(collection(db, 'videoComments'), commentData)

      // Update video comment count
      const videoRef = doc(db, 'videos', videoId)
      const videoSnap = await getDoc(videoRef)
      if (videoSnap.exists()) {
        const currentComments = videoSnap.data().comments || 0
        await updateDoc(videoRef, {
          comments: currentComments + 1,
          updatedAt: serverTimestamp()
        })
      }

      return docRef.id
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  // Get video comments
  async getVideoComments(videoId: string): Promise<VideoComment[]> {
    try {
      const q = query(
        collection(db, 'videoComments'),
        where('videoId', '==', videoId),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as VideoComment[]
    } catch (error) {
      console.error('Error getting video comments:', error)
      throw error
    }
  }

  // Delete video
  async deleteVideo(videoId: string): Promise<void> {
    try {
      const video = await this.getVideo(videoId)
      if (!video) return

      // Delete video file from storage
      const videoRef = ref(storage, video.videoUrl)
      await deleteObject(videoRef)

      // Delete thumbnail if exists
      if (video.thumbnailUrl) {
        const thumbnailRef = ref(storage, video.thumbnailUrl)
        await deleteObject(thumbnailRef)
      }

      // Delete video document
      await deleteDoc(doc(db, 'videos', videoId))

      // Delete related comments
      const commentsQuery = query(
        collection(db, 'videoComments'),
        where('videoId', '==', videoId)
      )
      const commentsSnapshot = await getDocs(commentsQuery)
      const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
    } catch (error) {
      console.error('Error deleting video:', error)
      throw error
    }
  }

  // Generate thumbnail
  async generateThumbnail(videoFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = Math.min(5, video.duration / 2) // 5 seconds or middle
      })

      video.addEventListener('seeked', () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => {
            if (blob) {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          }, 'image/jpeg', 0.8)
        }
      })

      video.addEventListener('error', reject)
      video.src = URL.createObjectURL(videoFile)
      video.load()
    })
  }

  // Search videos
  async searchVideos(searchTerm: string, filters?: {
    teamId?: string
    type?: VideoRecording['type']
    visibility?: VideoRecording['visibility']
  }): Promise<VideoRecording[]> {
    try {
      let q = query(
        collection(db, 'videos'),
        where('status', '==', 'ready'),
        orderBy('uploadedAt', 'desc')
      )

      if (filters?.teamId) {
        q = query(q, where('teamId', '==', filters.teamId))
      }
      if (filters?.type) {
        q = query(q, where('type', '==', filters.type))
      }
      if (filters?.visibility) {
        q = query(q, where('visibility', '==', filters.visibility))
      }

      const snapshot = await getDocs(q)
      const videos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recordedAt: doc.data().recordedAt?.toDate(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as VideoRecording[]

      // Filter by search term (client-side for now)
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return videos.filter(video => 
          video.title.toLowerCase().includes(term) ||
          video.description?.toLowerCase().includes(term) ||
          video.tags?.some(tag => tag.toLowerCase().includes(term))
        )
      }

      return videos
    } catch (error) {
      console.error('Error searching videos:', error)
      throw error
    }
  }
}

export const videoService = new VideoService()
