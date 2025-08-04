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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export interface TeamMember {
  id: string
  userId: string
  teamId: string
  name: string
  email: string
  phone?: string
  avatar?: string
  role: 'owner' | 'admin' | 'coach' | 'player' | 'substitute' | 'manager' | 'staff'
  jerseyNumber?: number
  position?: string
  status: 'active' | 'inactive' | 'suspended' | 'injured'
  joinedAt: Date
  skills: PlayerSkills
  statistics: PlayerStatistics
  availability: PlayerAvailability
  emergencyContact?: EmergencyContact
  medicalInfo?: MedicalInfo
  permissions: TeamPermissions
  createdAt: Date
  updatedAt: Date
}

export interface PlayerSkills {
  overall: number // 1-100
  technical: number
  physical: number
  mental: number
  tactical: number
  specific: { [key: string]: number } // sport-specific skills
  strengths: string[]
  weaknesses: string[]
  notes?: string
  lastAssessed?: Date
  assessedBy?: string
}

export interface PlayerStatistics {
  gamesPlayed: number
  gamesStarted: number
  minutesPlayed: number
  goals?: number
  assists?: number
  saves?: number
  fouls?: number
  yellowCards?: number
  redCards?: number
  wins: number
  losses: number
  draws: number
  custom: { [key: string]: number } // sport-specific stats
  seasonStats: { [season: string]: Partial<PlayerStatistics> }
}

export interface PlayerAvailability {
  isAvailable: boolean
  unavailableDates: Date[]
  recurringUnavailability: {
    dayOfWeek: number // 0-6 (Sunday-Saturday)
    startTime: string // HH:MM
    endTime: string // HH:MM
    reason?: string
  }[]
  preferredPositions: string[]
  maxGamesPerWeek?: number
  notes?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
  address?: string
}

export interface MedicalInfo {
  bloodType?: string
  allergies: string[]
  medications: string[]
  conditions: string[]
  injuries: {
    type: string
    date: Date
    severity: 'minor' | 'moderate' | 'severe'
    status: 'active' | 'recovering' | 'healed'
    expectedReturn?: Date
    notes?: string
  }[]
  lastPhysical?: Date
  doctorName?: string
  doctorPhone?: string
  insuranceProvider?: string
  insuranceNumber?: string
}

export interface TeamPermissions {
  canViewSchedule: boolean
  canEditSchedule: boolean
  canViewRoster: boolean
  canEditRoster: boolean
  canViewFinances: boolean
  canEditFinances: boolean
  canManageVideos: boolean
  canManageTournaments: boolean
  canSendAnnouncements: boolean
  canViewAnalytics: boolean
  customPermissions: { [key: string]: boolean }
}

export interface TeamRole {
  id: string
  teamId: string
  name: string
  description?: string
  permissions: TeamPermissions
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SkillAssessment {
  id: string
  teamId: string
  playerId: string
  assessorId: string
  assessorName: string
  skills: PlayerSkills
  notes?: string
  assessmentDate: Date
  createdAt: Date
}

class EnhancedTeamService {
  // Add team member with enhanced details
  async addTeamMember(
    teamId: string,
    memberData: {
      userId: string
      name: string
      email: string
      phone?: string
      role: TeamMember['role']
      jerseyNumber?: number
      position?: string
      emergencyContact?: EmergencyContact
      medicalInfo?: MedicalInfo
    },
    addedBy: string
  ): Promise<string> {
    try {
      // Check if jersey number is already taken
      if (memberData.jerseyNumber) {
        const existingMember = await this.getMemberByJerseyNumber(teamId, memberData.jerseyNumber)
        if (existingMember) {
          throw new Error(`Jersey number ${memberData.jerseyNumber} is already taken`)
        }
      }

      const defaultSkills: PlayerSkills = {
        overall: 50,
        technical: 50,
        physical: 50,
        mental: 50,
        tactical: 50,
        specific: {},
        strengths: [],
        weaknesses: []
      }

      const defaultStats: PlayerStatistics = {
        gamesPlayed: 0,
        gamesStarted: 0,
        minutesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        custom: {},
        seasonStats: {}
      }

      const defaultAvailability: PlayerAvailability = {
        isAvailable: true,
        unavailableDates: [],
        recurringUnavailability: [],
        preferredPositions: memberData.position ? [memberData.position] : []
      }

      const defaultPermissions = await this.getDefaultPermissions(memberData.role)

      const teamMember: Omit<TeamMember, 'id'> = {
        ...memberData,
        teamId,
        status: 'active',
        joinedAt: new Date(),
        skills: defaultSkills,
        statistics: defaultStats,
        availability: defaultAvailability,
        permissions: defaultPermissions,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'teamMembers'), teamMember)

      // Update team member count
      const teamRef = doc(db, 'teams', teamId)
      const teamSnap = await getDoc(teamRef)
      if (teamSnap.exists()) {
        const currentMembers = teamSnap.data().members || 0
        await updateDoc(teamRef, {
          members: currentMembers + 1,
          updatedAt: serverTimestamp()
        })
      }

      return docRef.id
    } catch (error) {
      console.error('Error adding team member:', error)
      throw error
    }
  }

  // Get member by jersey number
  async getMemberByJerseyNumber(teamId: string, jerseyNumber: number): Promise<TeamMember | null> {
    try {
      const q = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('jerseyNumber', '==', jerseyNumber)
      )

      const snapshot = await getDocs(q)
      if (snapshot.empty) return null

      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        joinedAt: doc.data().joinedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as TeamMember
    } catch (error) {
      console.error('Error getting member by jersey number:', error)
      return null
    }
  }

  // Update member skills
  async updateMemberSkills(
    memberId: string,
    skills: Partial<PlayerSkills>,
    assessedBy: string
  ): Promise<void> {
    try {
      const memberRef = doc(db, 'teamMembers', memberId)
      const memberSnap = await getDoc(memberRef)
      
      if (!memberSnap.exists()) {
        throw new Error('Team member not found')
      }

      const currentSkills = memberSnap.data().skills as PlayerSkills
      const updatedSkills: PlayerSkills = {
        ...currentSkills,
        ...skills,
        lastAssessed: new Date(),
        assessedBy
      }

      await updateDoc(memberRef, {
        skills: updatedSkills,
        updatedAt: serverTimestamp()
      })

      // Create skill assessment record
      const member = memberSnap.data() as TeamMember
      const assessmentData: Omit<SkillAssessment, 'id'> = {
        teamId: member.teamId,
        playerId: memberId,
        assessorId: assessedBy,
        assessorName: '', // You'd need to get this from user data
        skills: updatedSkills,
        assessmentDate: new Date(),
        createdAt: new Date()
      }

      await addDoc(collection(db, 'skillAssessments'), assessmentData)
    } catch (error) {
      console.error('Error updating member skills:', error)
      throw error
    }
  }

  // Update member statistics
  async updateMemberStatistics(
    memberId: string,
    stats: Partial<PlayerStatistics>
  ): Promise<void> {
    try {
      const memberRef = doc(db, 'teamMembers', memberId)
      const memberSnap = await getDoc(memberRef)
      
      if (!memberSnap.exists()) {
        throw new Error('Team member not found')
      }

      const currentStats = memberSnap.data().statistics as PlayerStatistics
      const updatedStats: PlayerStatistics = {
        ...currentStats,
        ...stats
      }

      await updateDoc(memberRef, {
        statistics: updatedStats,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating member statistics:', error)
      throw error
    }
  }

  // Set member availability
  async setMemberAvailability(
    memberId: string,
    availability: Partial<PlayerAvailability>
  ): Promise<void> {
    try {
      const memberRef = doc(db, 'teamMembers', memberId)
      const memberSnap = await getDoc(memberRef)
      
      if (!memberSnap.exists()) {
        throw new Error('Team member not found')
      }

      const currentAvailability = memberSnap.data().availability as PlayerAvailability
      const updatedAvailability: PlayerAvailability = {
        ...currentAvailability,
        ...availability
      }

      await updateDoc(memberRef, {
        availability: updatedAvailability,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error setting member availability:', error)
      throw error
    }
  }

  // Update member jersey number
  async updateJerseyNumber(memberId: string, newJerseyNumber: number): Promise<void> {
    try {
      const memberRef = doc(db, 'teamMembers', memberId)
      const memberSnap = await getDoc(memberRef)
      
      if (!memberSnap.exists()) {
        throw new Error('Team member not found')
      }

      const member = memberSnap.data() as TeamMember

      // Check if new jersey number is available
      const existingMember = await this.getMemberByJerseyNumber(member.teamId, newJerseyNumber)
      if (existingMember && existingMember.id !== memberId) {
        throw new Error(`Jersey number ${newJerseyNumber} is already taken`)
      }

      await updateDoc(memberRef, {
        jerseyNumber: newJerseyNumber,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating jersey number:', error)
      throw error
    }
  }

  // Get team roster with enhanced details
  async getTeamRoster(teamId: string): Promise<TeamMember[]> {
    try {
      const q = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        orderBy('jerseyNumber', 'asc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        joinedAt: doc.data().joinedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as TeamMember[]
    } catch (error) {
      console.error('Error getting team roster:', error)
      throw error
    }
  }

  // Get available jersey numbers
  async getAvailableJerseyNumbers(teamId: string, maxNumber: number = 99): Promise<number[]> {
    try {
      const roster = await this.getTeamRoster(teamId)
      const takenNumbers = roster
        .map(member => member.jerseyNumber)
        .filter(num => num !== undefined) as number[]

      const availableNumbers: number[] = []
      for (let i = 1; i <= maxNumber; i++) {
        if (!takenNumbers.includes(i)) {
          availableNumbers.push(i)
        }
      }

      return availableNumbers
    } catch (error) {
      console.error('Error getting available jersey numbers:', error)
      return []
    }
  }

  // Create custom team role
  async createTeamRole(
    teamId: string,
    roleData: {
      name: string
      description?: string
      permissions: TeamPermissions
    }
  ): Promise<string> {
    try {
      const role: Omit<TeamRole, 'id'> = {
        ...roleData,
        teamId,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'teamRoles'), role)
      return docRef.id
    } catch (error) {
      console.error('Error creating team role:', error)
      throw error
    }
  }

  // Get default permissions for role
  private async getDefaultPermissions(role: TeamMember['role']): Promise<TeamPermissions> {
    const basePermissions: TeamPermissions = {
      canViewSchedule: true,
      canEditSchedule: false,
      canViewRoster: true,
      canEditRoster: false,
      canViewFinances: false,
      canEditFinances: false,
      canManageVideos: false,
      canManageTournaments: false,
      canSendAnnouncements: false,
      canViewAnalytics: false,
      customPermissions: {}
    }

    switch (role) {
      case 'owner':
        return {
          ...basePermissions,
          canEditSchedule: true,
          canEditRoster: true,
          canViewFinances: true,
          canEditFinances: true,
          canManageVideos: true,
          canManageTournaments: true,
          canSendAnnouncements: true,
          canViewAnalytics: true
        }
      case 'admin':
        return {
          ...basePermissions,
          canEditSchedule: true,
          canEditRoster: true,
          canManageVideos: true,
          canSendAnnouncements: true,
          canViewAnalytics: true
        }
      case 'coach':
        return {
          ...basePermissions,
          canEditSchedule: true,
          canManageVideos: true,
          canSendAnnouncements: true,
          canViewAnalytics: true
        }
      case 'manager':
        return {
          ...basePermissions,
          canEditSchedule: true,
          canViewFinances: true,
          canSendAnnouncements: true
        }
      default:
        return basePermissions
    }
  }

  // Get team skill analytics
  async getTeamSkillAnalytics(teamId: string): Promise<{
    averageSkills: PlayerSkills
    topPerformers: { skill: string; player: TeamMember; value: number }[]
    skillDistribution: { skill: string; distribution: number[] }[]
  }> {
    try {
      const roster = await this.getTeamRoster(teamId)
      const players = roster.filter(member => member.role === 'player' || member.role === 'substitute')

      if (players.length === 0) {
        return {
          averageSkills: {
            overall: 0,
            technical: 0,
            physical: 0,
            mental: 0,
            tactical: 0,
            specific: {},
            strengths: [],
            weaknesses: []
          },
          topPerformers: [],
          skillDistribution: []
        }
      }

      // Calculate average skills
      const skillSums = players.reduce((sums, player) => ({
        overall: sums.overall + player.skills.overall,
        technical: sums.technical + player.skills.technical,
        physical: sums.physical + player.skills.physical,
        mental: sums.mental + player.skills.mental,
        tactical: sums.tactical + player.skills.tactical
      }), { overall: 0, technical: 0, physical: 0, mental: 0, tactical: 0 })

      const averageSkills: PlayerSkills = {
        overall: Math.round(skillSums.overall / players.length),
        technical: Math.round(skillSums.technical / players.length),
        physical: Math.round(skillSums.physical / players.length),
        mental: Math.round(skillSums.mental / players.length),
        tactical: Math.round(skillSums.tactical / players.length),
        specific: {},
        strengths: [],
        weaknesses: []
      }

      // Find top performers for each skill
      const skillTypes = ['overall', 'technical', 'physical', 'mental', 'tactical'] as const
      const topPerformers = skillTypes.map(skill => {
        const topPlayer = players.reduce((best, current) => 
          current.skills[skill] > best.skills[skill] ? current : best
        )
        return {
          skill,
          player: topPlayer,
          value: topPlayer.skills[skill]
        }
      })

      return {
        averageSkills,
        topPerformers,
        skillDistribution: [] // Would implement skill distribution calculation
      }
    } catch (error) {
      console.error('Error getting team skill analytics:', error)
      throw error
    }
  }
}

export const enhancedTeamService = new EnhancedTeamService()
