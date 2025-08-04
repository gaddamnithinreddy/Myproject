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
import { v4 as uuidv4 } from 'uuid'

export interface Tournament {
  id: string
  name: string
  sport: string
  type: 'public' | 'private'
  startDate: Date
  endDate: Date
  registrationDeadline: Date
  location: {
    country: string
    state: string
    city: string
    zipCode: string
    address?: string
    coordinates?: { lat: number; lng: number }
  }
  level: 'beginner' | 'intermediate' | 'advanced'
  ageGroup: string
  gender: 'male' | 'female' | 'any'
  contactEmail: string
  contactNumber: string
  brochure?: string
  fee: number
  maxTeams: number
  registeredTeams: number
  ownerId: string
  status: 'draft' | 'active' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
  description?: string
  rules?: string[]
  prizes?: { position: number; prize: string; amount?: number }[]
  sponsors?: { name: string; logo?: string; website?: string }[]
  venues?: { name: string; address: string; courts: number }[]
  schedule?: TournamentMatch[]
  bracket?: TournamentBracket
}

export interface TournamentRegistration {
  id: string
  tournamentId: string
  teamId: string
  teamName: string
  registeredBy: string
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  registeredAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  notes?: string
  paymentId?: string
  amount: number
  teamMembers: {
    userId: string
    name: string
    role: string
    jerseyNumber?: number
  }[]
}

export interface TournamentMatch {
  id: string
  tournamentId: string
  roundNumber: number
  matchNumber: number
  type: 'qualifier' | 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final' | 'third_place'
  team1Id?: string
  team2Id?: string
  team1Name?: string
  team2Name?: string
  scheduledDate?: Date
  scheduledTime?: Date
  venue?: string
  court?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  score?: {
    team1Score: number
    team2Score: number
    sets?: { team1: number; team2: number }[]
  }
  winnerId?: string
  winnerName?: string
  duration?: number
  officials?: string[]
  notes?: string
  videoUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface TournamentBracket {
  type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
  rounds: {
    roundNumber: number
    roundName: string
    matches: string[] // match IDs
  }[]
  finalStandings?: {
    position: number
    teamId: string
    teamName: string
    wins: number
    losses: number
    points?: number
  }[]
}

class TournamentService {
  // Create a new tournament
  async createTournament(tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'registeredTeams'>): Promise<string> {
    try {
      const tournament: Omit<Tournament, 'id'> = {
        ...tournamentData,
        registeredTeams: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'tournaments'), tournament)
      return docRef.id
    } catch (error) {
      console.error('Error creating tournament:', error)
      throw error
    }
  }

  // Update tournament
  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<void> {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating tournament:', error)
      throw error
    }
  }

  // Get tournament by ID
  async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const docSnap = await getDoc(doc(db, 'tournaments', tournamentId))
      if (!docSnap.exists()) return null

      return {
        id: docSnap.id,
        ...docSnap.data(),
        startDate: docSnap.data().startDate?.toDate(),
        endDate: docSnap.data().endDate?.toDate(),
        registrationDeadline: docSnap.data().registrationDeadline?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      } as Tournament
    } catch (error) {
      console.error('Error getting tournament:', error)
      return null
    }
  }

  // Register team for tournament
  async registerTeam(
    tournamentId: string,
    teamId: string,
    teamName: string,
    registeredBy: string,
    teamMembers: TournamentRegistration['teamMembers'],
    amount: number
  ): Promise<string> {
    try {
      const registrationData: Omit<TournamentRegistration, 'id'> = {
        tournamentId,
        teamId,
        teamName,
        registeredBy,
        status: 'pending',
        paymentStatus: 'pending',
        registeredAt: new Date(),
        amount,
        teamMembers
      }

      const docRef = await addDoc(collection(db, 'tournamentRegistrations'), registrationData)

      // Update tournament registered teams count
      const tournament = await this.getTournament(tournamentId)
      if (tournament) {
        await updateDoc(doc(db, 'tournaments', tournamentId), {
          registeredTeams: tournament.registeredTeams + 1,
          updatedAt: serverTimestamp()
        })
      }

      return docRef.id
    } catch (error) {
      console.error('Error registering team:', error)
      throw error
    }
  }

  // Approve/reject team registration
  async reviewRegistration(
    registrationId: string,
    status: 'approved' | 'rejected' | 'waitlisted',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'tournamentRegistrations', registrationId), {
        status,
        reviewedBy,
        reviewedAt: serverTimestamp(),
        notes
      })
    } catch (error) {
      console.error('Error reviewing registration:', error)
      throw error
    }
  }

  // Get tournament registrations
  async getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    try {
      const q = query(
        collection(db, 'tournamentRegistrations'),
        where('tournamentId', '==', tournamentId),
        orderBy('registeredAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registeredAt: doc.data().registeredAt?.toDate(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as TournamentRegistration[]
    } catch (error) {
      console.error('Error getting tournament registrations:', error)
      throw error
    }
  }

  // Generate tournament bracket
  async generateBracket(
    tournamentId: string,
    bracketType: TournamentBracket['type'] = 'single_elimination'
  ): Promise<void> {
    try {
      // Get approved registrations
      const registrations = await this.getTournamentRegistrations(tournamentId)
      const approvedTeams = registrations.filter(r => r.status === 'approved')

      if (approvedTeams.length < 2) {
        throw new Error('Need at least 2 teams to generate bracket')
      }

      // Generate matches based on bracket type
      const matches: Omit<TournamentMatch, 'id'>[] = []
      let bracket: TournamentBracket

      switch (bracketType) {
        case 'single_elimination':
          bracket = this.generateSingleEliminationBracket(approvedTeams, matches, tournamentId)
          break
        case 'round_robin':
          bracket = this.generateRoundRobinBracket(approvedTeams, matches, tournamentId)
          break
        default:
          throw new Error(`Bracket type ${bracketType} not implemented yet`)
      }

      // Save matches to database
      const matchPromises = matches.map(match => addDoc(collection(db, 'tournamentMatches'), match))
      const matchDocs = await Promise.all(matchPromises)

      // Update bracket with match IDs
      bracket.rounds.forEach(round => {
        round.matches = matchDocs.slice(0, round.matches.length).map(doc => doc.id)
      })

      // Update tournament with bracket
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        bracket,
        status: 'in_progress',
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error generating bracket:', error)
      throw error
    }
  }

  private generateSingleEliminationBracket(
    teams: TournamentRegistration[],
    matches: Omit<TournamentMatch, 'id'>[],
    tournamentId: string
  ): TournamentBracket {
    const numTeams = teams.length
    const numRounds = Math.ceil(Math.log2(numTeams))
    const rounds: TournamentBracket['rounds'] = []

    // Shuffle teams for random seeding
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)

    let currentRoundTeams = shuffledTeams
    let roundNumber = 1

    while (currentRoundTeams.length > 1) {
      const roundMatches: string[] = []
      const nextRoundTeams: TournamentRegistration[] = []

      // Create matches for current round
      for (let i = 0; i < currentRoundTeams.length; i += 2) {
        const team1 = currentRoundTeams[i]
        const team2 = currentRoundTeams[i + 1] || null

        const matchType = this.getMatchType(roundNumber, numRounds)
        
        const match: Omit<TournamentMatch, 'id'> = {
          tournamentId,
          roundNumber,
          matchNumber: Math.floor(i / 2) + 1,
          type: matchType,
          team1Id: team1.teamId,
          team1Name: team1.teamName,
          team2Id: team2?.teamId,
          team2Name: team2?.teamName,
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        matches.push(match)
        roundMatches.push(`match_${matches.length - 1}`) // Placeholder ID

        // If team2 doesn't exist (bye), team1 automatically advances
        if (!team2) {
          nextRoundTeams.push(team1)
        }
      }

      rounds.push({
        roundNumber,
        roundName: this.getRoundName(roundNumber, numRounds),
        matches: roundMatches
      })

      // For now, we can't determine next round teams without match results
      // This would be updated as matches are completed
      currentRoundTeams = nextRoundTeams
      roundNumber++
    }

    return {
      type: 'single_elimination',
      rounds
    }
  }

  private generateRoundRobinBracket(
    teams: TournamentRegistration[],
    matches: Omit<TournamentMatch, 'id'>[],
    tournamentId: string
  ): TournamentBracket {
    const numTeams = teams.length
    const rounds: TournamentBracket['rounds'] = []

    // Generate all possible matches
    let matchNumber = 1
    const allMatches: string[] = []

    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        const team1 = teams[i]
        const team2 = teams[j]

        const match: Omit<TournamentMatch, 'id'> = {
          tournamentId,
          roundNumber: 1,
          matchNumber,
          type: 'group',
          team1Id: team1.teamId,
          team1Name: team1.teamName,
          team2Id: team2.teamId,
          team2Name: team2.teamName,
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        matches.push(match)
        allMatches.push(`match_${matches.length - 1}`)
        matchNumber++
      }
    }

    rounds.push({
      roundNumber: 1,
      roundName: 'Round Robin',
      matches: allMatches
    })

    return {
      type: 'round_robin',
      rounds
    }
  }

  private getMatchType(roundNumber: number, totalRounds: number): TournamentMatch['type'] {
    const roundsFromEnd = totalRounds - roundNumber + 1
    
    switch (roundsFromEnd) {
      case 1: return 'final'
      case 2: return 'semi_final'
      case 3: return 'quarter_final'
      case 4: return 'round_of_16'
      case 5: return 'round_of_32'
      default: return 'qualifier'
    }
  }

  private getRoundName(roundNumber: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - roundNumber + 1
    
    switch (roundsFromEnd) {
      case 1: return 'Final'
      case 2: return 'Semi-Final'
      case 3: return 'Quarter-Final'
      case 4: return 'Round of 16'
      case 5: return 'Round of 32'
      default: return `Round ${roundNumber}`
    }
  }

  // Update match result
  async updateMatchResult(
    matchId: string,
    score: TournamentMatch['score'],
    winnerId: string,
    winnerName: string,
    duration?: number,
    notes?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'tournamentMatches', matchId), {
        score,
        winnerId,
        winnerName,
        duration,
        notes,
        status: 'completed',
        updatedAt: serverTimestamp()
      })

      // TODO: Update bracket and advance winner to next round
      await this.advanceWinnerToNextRound(matchId, winnerId, winnerName)
    } catch (error) {
      console.error('Error updating match result:', error)
      throw error
    }
  }

  private async advanceWinnerToNextRound(matchId: string, winnerId: string, winnerName: string): Promise<void> {
    // This would implement the logic to advance the winner to the next round
    // For now, it's a placeholder
    console.log(`Advancing ${winnerName} (${winnerId}) to next round from match ${matchId}`)
  }

  // Get tournament matches
  async getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
    try {
      const q = query(
        collection(db, 'tournamentMatches'),
        where('tournamentId', '==', tournamentId),
        orderBy('roundNumber', 'asc'),
        orderBy('matchNumber', 'asc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate(),
        scheduledTime: doc.data().scheduledTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as TournamentMatch[]
    } catch (error) {
      console.error('Error getting tournament matches:', error)
      throw error
    }
  }

  // Schedule match
  async scheduleMatch(
    matchId: string,
    scheduledDate: Date,
    scheduledTime: Date,
    venue?: string,
    court?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'tournamentMatches', matchId), {
        scheduledDate: Timestamp.fromDate(scheduledDate),
        scheduledTime: Timestamp.fromDate(scheduledTime),
        venue,
        court,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error scheduling match:', error)
      throw error
    }
  }

  // Upload tournament brochure
  async uploadBrochure(tournamentId: string, file: File): Promise<string> {
    try {
      const fileRef = ref(storage, `tournaments/${tournamentId}/brochure_${Date.now()}_${file.name}`)
      const uploadResult = await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(uploadResult.ref)

      // Update tournament with brochure URL
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        brochure: downloadURL,
        updatedAt: serverTimestamp()
      })

      return downloadURL
    } catch (error) {
      console.error('Error uploading brochure:', error)
      throw error
    }
  }

  // Get public tournaments
  async getPublicTournaments(filters?: {
    sport?: string
    location?: string
    level?: string
    status?: string
  }): Promise<Tournament[]> {
    try {
      let q = query(
        collection(db, 'tournaments'),
        where('type', '==', 'public'),
        orderBy('startDate', 'asc')
      )

      if (filters?.sport) {
        q = query(q, where('sport', '==', filters.sport))
      }
      if (filters?.level) {
        q = query(q, where('level', '==', filters.level))
      }
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
        registrationDeadline: doc.data().registrationDeadline?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Tournament[]
    } catch (error) {
      console.error('Error getting public tournaments:', error)
      throw error
    }
  }

  // Get user's tournaments (as owner or participant)
  async getUserTournaments(userId: string): Promise<{
    owned: Tournament[]
    participating: Tournament[]
  }> {
    try {
      // Get owned tournaments
      const ownedQuery = query(
        collection(db, 'tournaments'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const ownedSnapshot = await getDocs(ownedQuery)
      const owned = ownedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
        registrationDeadline: doc.data().registrationDeadline?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Tournament[]

      // Get participating tournaments (via registrations)
      const registrationsQuery = query(
        collection(db, 'tournamentRegistrations'),
        where('registeredBy', '==', userId),
        where('status', 'in', ['approved', 'pending'])
      )
      const registrationsSnapshot = await getDocs(registrationsQuery)
      const tournamentIds = registrationsSnapshot.docs.map(doc => doc.data().tournamentId)

      const participating: Tournament[] = []
      for (const tournamentId of tournamentIds) {
        const tournament = await this.getTournament(tournamentId)
        if (tournament) {
          participating.push(tournament)
        }
      }

      return { owned, participating }
    } catch (error) {
      console.error('Error getting user tournaments:', error)
      return { owned: [], participating: [] }
    }
  }
}

export const tournamentService = new TournamentService()
