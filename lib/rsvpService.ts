"use client"

import { db } from '@/lib/firebase'
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
  serverTimestamp
} from 'firebase/firestore'

export interface RSVP {
  id: string
  scheduleId: string
  userId: string
  teamId: string
  response: 'yes' | 'no' | 'maybe'
  responseAt: Date
  note?: string
  userName: string
  userAvatar?: string
}

export interface RSVPSummary {
  total: number
  yes: number
  no: number
  maybe: number
  pending: number
  responses: RSVP[]
}

export interface Schedule {
  id: string
  teamId: string
  tournamentId?: string
  name: string
  type: 'practice' | 'game' | 'tournament'
  date: Date
  startTime: Date
  endTime: Date
  location: {
    address: string
    city: string
    state: string
    country: string
    coordinates?: { lat: number; lng: number }
  }
  court?: string
  accessCode?: string
  status: 'tentative' | 'confirmed' | 'cancelled'
  rsvpEnabled: boolean
  rsvpDeadline?: Date
  videoRecording?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  description?: string
  requirements?: string[]
  maxParticipants?: number
}

class RSVPService {
  // Submit or update RSVP response
  async submitRSVP(
    scheduleId: string,
    userId: string,
    teamId: string,
    response: 'yes' | 'no' | 'maybe',
    userName: string,
    userAvatar?: string,
    note?: string
  ): Promise<string> {
    try {
      // Check if RSVP already exists
      const existingRSVPQuery = query(
        collection(db, 'rsvp'),
        where('scheduleId', '==', scheduleId),
        where('userId', '==', userId)
      )
      
      const existingRSVP = await getDocs(existingRSVPQuery)
      
      if (!existingRSVP.empty) {
        // Update existing RSVP
        const rsvpDoc = existingRSVP.docs[0]
        await updateDoc(rsvpDoc.ref, {
          response,
          responseAt: serverTimestamp(),
          note,
          updatedAt: serverTimestamp()
        })
        return rsvpDoc.id
      } else {
        // Create new RSVP
        const rsvpData: Omit<RSVP, 'id'> = {
          scheduleId,
          userId,
          teamId,
          response,
          responseAt: new Date(),
          note,
          userName,
          userAvatar
        }
        
        const docRef = await addDoc(collection(db, 'rsvp'), rsvpData)
        return docRef.id
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error)
      throw error
    }
  }

  // Get RSVP summary for a schedule
  async getRSVPSummary(scheduleId: string): Promise<RSVPSummary> {
    try {
      const q = query(
        collection(db, 'rsvp'),
        where('scheduleId', '==', scheduleId),
        orderBy('responseAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const responses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        responseAt: doc.data().responseAt?.toDate() || new Date()
      })) as RSVP[]
      
      const summary = {
        total: responses.length,
        yes: responses.filter(r => r.response === 'yes').length,
        no: responses.filter(r => r.response === 'no').length,
        maybe: responses.filter(r => r.response === 'maybe').length,
        pending: 0, // This would be calculated based on team members who haven't responded
        responses
      }
      
      return summary
    } catch (error) {
      console.error('Error getting RSVP summary:', error)
      throw error
    }
  }

  // Get user's RSVP for a specific schedule
  async getUserRSVP(scheduleId: string, userId: string): Promise<RSVP | null> {
    try {
      const q = query(
        collection(db, 'rsvp'),
        where('scheduleId', '==', scheduleId),
        where('userId', '==', userId)
      )
      
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        responseAt: doc.data().responseAt?.toDate() || new Date()
      } as RSVP
    } catch (error) {
      console.error('Error getting user RSVP:', error)
      return null
    }
  }

  // Get all RSVPs for a user
  async getUserRSVPs(userId: string): Promise<RSVP[]> {
    try {
      const q = query(
        collection(db, 'rsvp'),
        where('userId', '==', userId),
        orderBy('responseAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        responseAt: doc.data().responseAt?.toDate() || new Date()
      })) as RSVP[]
    } catch (error) {
      console.error('Error getting user RSVPs:', error)
      throw error
    }
  }

  // Subscribe to RSVP updates for a schedule
  subscribeToRSVPs(scheduleId: string, callback: (summary: RSVPSummary) => void) {
    const q = query(
      collection(db, 'rsvp'),
      where('scheduleId', '==', scheduleId),
      orderBy('responseAt', 'desc')
    )
    
    return onSnapshot(q, (snapshot) => {
      const responses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        responseAt: doc.data().responseAt?.toDate() || new Date()
      })) as RSVP[]
      
      const summary = {
        total: responses.length,
        yes: responses.filter(r => r.response === 'yes').length,
        no: responses.filter(r => r.response === 'no').length,
        maybe: responses.filter(r => r.response === 'maybe').length,
        pending: 0,
        responses
      }
      
      callback(summary)
    })
  }

  // Delete RSVP
  async deleteRSVP(rsvpId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'rsvp', rsvpId))
    } catch (error) {
      console.error('Error deleting RSVP:', error)
      throw error
    }
  }

  // Get RSVP statistics for a team
  async getTeamRSVPStats(teamId: string, startDate?: Date, endDate?: Date): Promise<{
    totalEvents: number
    avgAttendance: number
    topAttendees: { userId: string; userName: string; attendanceRate: number }[]
  }> {
    try {
      let q = query(
        collection(db, 'rsvp'),
        where('teamId', '==', teamId)
      )
      
      if (startDate && endDate) {
        q = query(q,
          where('responseAt', '>=', Timestamp.fromDate(startDate)),
          where('responseAt', '<=', Timestamp.fromDate(endDate))
        )
      }
      
      const snapshot = await getDocs(q)
      const rsvps = snapshot.docs.map(doc => doc.data()) as RSVP[]
      
      // Calculate statistics
      const uniqueEvents = new Set(rsvps.map(r => r.scheduleId)).size
      const yesResponses = rsvps.filter(r => r.response === 'yes').length
      const avgAttendance = uniqueEvents > 0 ? (yesResponses / uniqueEvents) * 100 : 0
      
      // Calculate top attendees
      const userStats = new Map<string, { name: string; total: number; yes: number }>()
      
      rsvps.forEach(rsvp => {
        const current = userStats.get(rsvp.userId) || { name: rsvp.userName, total: 0, yes: 0 }
        current.total++
        if (rsvp.response === 'yes') current.yes++
        userStats.set(rsvp.userId, current)
      })
      
      const topAttendees = Array.from(userStats.entries())
        .map(([userId, stats]) => ({
          userId,
          userName: stats.name,
          attendanceRate: (stats.yes / stats.total) * 100
        }))
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 10)
      
      return {
        totalEvents: uniqueEvents,
        avgAttendance,
        topAttendees
      }
    } catch (error) {
      console.error('Error getting team RSVP stats:', error)
      throw error
    }
  }

  // Send RSVP reminders (this would typically be called by a cloud function)
  async sendRSVPReminders(scheduleId: string): Promise<void> {
    try {
      // Get schedule details
      const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId))
      if (!scheduleDoc.exists()) return
      
      const schedule = {
        id: scheduleDoc.id,
        ...scheduleDoc.data(),
        date: scheduleDoc.data()?.date?.toDate(),
        startTime: scheduleDoc.data()?.startTime?.toDate(),
        endTime: scheduleDoc.data()?.endTime?.toDate(),
        createdAt: scheduleDoc.data()?.createdAt?.toDate(),
        updatedAt: scheduleDoc.data()?.updatedAt?.toDate()
      } as Schedule
      
      // Get team members who haven't responded
      const teamMembersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', schedule.teamId),
        where('status', '==', 'active')
      )
      
      const teamMembers = await getDocs(teamMembersQuery)
      const memberIds = teamMembers.docs.map(doc => doc.data().userId)
      
      // Get existing RSVPs
      const rsvpQuery = query(
        collection(db, 'rsvp'),
        where('scheduleId', '==', scheduleId)
      )
      
      const existingRSVPs = await getDocs(rsvpQuery)
      const respondedUserIds = new Set(existingRSVPs.docs.map(doc => doc.data().userId))
      
      // Find users who haven't responded
      const pendingUserIds = memberIds.filter(id => !respondedUserIds.has(id))
      
      // Create notifications for pending users
      const notifications = pendingUserIds.map(userId => ({
        userId,
        type: 'rsvp_reminder',
        title: 'RSVP Reminder',
        message: `Please respond to the RSVP for "${schedule.name}" on ${schedule.date.toLocaleDateString()}`,
        data: {
          scheduleId,
          teamId: schedule.teamId,
          scheduleName: schedule.name,
          scheduleDate: schedule.date.toISOString()
        },
        isRead: false,
        createdAt: serverTimestamp()
      }))
      
      // Add notifications to database
      const promises = notifications.map(notification => 
        addDoc(collection(db, 'notifications'), notification)
      )
      
      await Promise.all(promises)
    } catch (error) {
      console.error('Error sending RSVP reminders:', error)
      throw error
    }
  }

  // Get RSVP deadline status
  async getRSVPDeadlineStatus(scheduleId: string): Promise<{
    hasDeadline: boolean
    deadline?: Date
    isExpired: boolean
    hoursRemaining?: number
  }> {
    try {
      const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId))
      if (!scheduleDoc.exists()) {
        return { hasDeadline: false, isExpired: false }
      }
      
      const schedule = scheduleDoc.data()
      const deadline = schedule.rsvpDeadline?.toDate()
      
      if (!deadline) {
        return { hasDeadline: false, isExpired: false }
      }
      
      const now = new Date()
      const isExpired = now > deadline
      const hoursRemaining = isExpired ? 0 : Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
      
      return {
        hasDeadline: true,
        deadline,
        isExpired,
        hoursRemaining
      }
    } catch (error) {
      console.error('Error getting RSVP deadline status:', error)
      return { hasDeadline: false, isExpired: false }
    }
  }
}

export const rsvpService = new RSVPService()
