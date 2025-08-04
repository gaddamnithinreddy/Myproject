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
  serverTimestamp
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export interface UserProfile {
  id: string
  userId: string
  personalInfo: PersonalInfo
  contactInfo: ContactInfo
  sportPreferences: SportPreferences
  insuranceInfo?: InsuranceInfo
  identityDocuments: IdentityDocument[]
  emergencyContacts: EmergencyContact[]
  medicalInfo?: MedicalInfo
  preferences: UserPreferences
  verification: VerificationStatus
  privacy: PrivacySettings
  createdAt: Date
  updatedAt: Date
}

export interface PersonalInfo {
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  nationality: string
  languages: string[]
  avatar?: string
  bio?: string
  occupation?: string
  education?: string
}

export interface ContactInfo {
  email: string
  phone?: string
  alternatePhone?: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  socialMedia?: {
    instagram?: string
    twitter?: string
    facebook?: string
    linkedin?: string
  }
}

export interface SportPreferences {
  primarySports: string[]
  secondarySports: string[]
  skillLevels: { [sport: string]: 'beginner' | 'intermediate' | 'advanced' | 'professional' }
  preferredPositions: { [sport: string]: string[] }
  playingExperience: { [sport: string]: number } // years
  achievements: Achievement[]
  certifications: Certification[]
  availability: {
    daysOfWeek: number[] // 0-6 (Sunday-Saturday)
    timeSlots: { start: string; end: string }[]
    maxCommitment: 'casual' | 'moderate' | 'serious' | 'competitive'
  }
}

export interface Achievement {
  id: string
  sport: string
  title: string
  description?: string
  date: Date
  level: 'local' | 'regional' | 'national' | 'international'
  position?: string
  organization?: string
  certificate?: string
}

export interface Certification {
  id: string
  name: string
  organization: string
  issueDate: Date
  expiryDate?: Date
  certificateNumber?: string
  certificateUrl?: string
  isVerified: boolean
}

export interface InsuranceInfo {
  provider: string
  policyNumber: string
  groupNumber?: string
  policyHolderName: string
  relationshipToPolicyHolder: 'self' | 'spouse' | 'child' | 'parent' | 'other'
  effectiveDate: Date
  expiryDate: Date
  coverageType: 'basic' | 'comprehensive' | 'premium'
  coverageDetails: string[]
  emergencyContact: {
    name: string
    phone: string
  }
  documentUrl?: string
  isVerified: boolean
}

export interface IdentityDocument {
  id: string
  type: 'passport' | 'drivers_license' | 'national_id' | 'birth_certificate' | 'other'
  documentNumber: string
  issuingAuthority: string
  issueDate: Date
  expiryDate?: Date
  documentUrl: string
  isVerified: boolean
  verifiedAt?: Date
  verifiedBy?: string
  notes?: string
}

export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  alternatePhone?: string
  email?: string
  address?: string
  isPrimary: boolean
}

export interface MedicalInfo {
  bloodType?: string
  height?: number // cm
  weight?: number // kg
  allergies: string[]
  medications: string[]
  medicalConditions: string[]
  injuries: {
    type: string
    date: Date
    severity: 'minor' | 'moderate' | 'severe'
    status: 'active' | 'recovering' | 'healed'
    description?: string
  }[]
  doctorInfo?: {
    name: string
    phone: string
    email?: string
    specialty?: string
  }
  lastPhysicalExam?: Date
  fitnessLevel: 'poor' | 'fair' | 'good' | 'excellent'
  restrictions: string[]
}

export interface UserPreferences {
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    gameReminders: boolean
    practiceReminders: boolean
    teamUpdates: boolean
    tournamentUpdates: boolean
    socialUpdates: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'friends' | 'teams' | 'private'
    showContactInfo: boolean
    showSportStats: boolean
    showAchievements: boolean
  }
  communication: {
    preferredLanguage: string
    timezone: string
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
    timeFormat: '12h' | '24h'
  }
}

export interface VerificationStatus {
  email: boolean
  phone: boolean
  identity: boolean
  insurance: boolean
  background: boolean
  lastVerificationCheck?: Date
  verificationLevel: 'unverified' | 'basic' | 'standard' | 'premium'
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'teams' | 'private'
  contactInfoVisibility: 'public' | 'friends' | 'teams' | 'private'
  statsVisibility: 'public' | 'friends' | 'teams' | 'private'
  achievementsVisibility: 'public' | 'friends' | 'teams' | 'private'
  allowTeamInvites: boolean
  allowFriendRequests: boolean
  allowMessages: 'everyone' | 'friends' | 'teams' | 'none'
  showOnlineStatus: boolean
}

class UserProfileService {
  // Create or update user profile
  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const profileRef = doc(db, 'userProfiles', userId)
      const profileSnap = await getDoc(profileRef)

      if (profileSnap.exists()) {
        // Update existing profile
        await updateDoc(profileRef, {
          ...profileData,
          updatedAt: serverTimestamp()
        })
      } else {
        // Create new profile
        const defaultProfile: Omit<UserProfile, 'id'> = {
          userId,
          personalInfo: {
            firstName: '',
            lastName: '',
            dateOfBirth: new Date(),
            gender: 'prefer_not_to_say',
            nationality: '',
            languages: []
          },
          contactInfo: {
            email: '',
            address: {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: ''
            }
          },
          sportPreferences: {
            primarySports: [],
            secondarySports: [],
            skillLevels: {},
            preferredPositions: {},
            playingExperience: {},
            achievements: [],
            certifications: [],
            availability: {
              daysOfWeek: [],
              timeSlots: [],
              maxCommitment: 'casual'
            }
          },
          identityDocuments: [],
          emergencyContacts: [],
          preferences: {
            notifications: {
              email: true,
              sms: false,
              push: true,
              gameReminders: true,
              practiceReminders: true,
              teamUpdates: true,
              tournamentUpdates: true,
              socialUpdates: false
            },
            privacy: {
              profileVisibility: 'teams',
              showContactInfo: false,
              showSportStats: true,
              showAchievements: true
            },
            communication: {
              preferredLanguage: 'en',
              timezone: 'UTC',
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '12h'
            }
          },
          verification: {
            email: false,
            phone: false,
            identity: false,
            insurance: false,
            background: false,
            verificationLevel: 'unverified'
          },
          privacy: {
            profileVisibility: 'teams',
            contactInfoVisibility: 'teams',
            statsVisibility: 'teams',
            achievementsVisibility: 'public',
            allowTeamInvites: true,
            allowFriendRequests: true,
            allowMessages: 'friends',
            showOnlineStatus: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          ...profileData
        }

        await updateDoc(profileRef, defaultProfile)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileSnap = await getDoc(doc(db, 'userProfiles', userId))
      if (!profileSnap.exists()) return null

      return {
        id: profileSnap.id,
        ...profileSnap.data(),
        personalInfo: {
          ...profileSnap.data().personalInfo,
          dateOfBirth: profileSnap.data().personalInfo?.dateOfBirth?.toDate()
        },
        createdAt: profileSnap.data().createdAt?.toDate(),
        updatedAt: profileSnap.data().updatedAt?.toDate()
      } as UserProfile
    } catch (error) {
      console.error('Error getting profile:', error)
      return null
    }
  }

  // Upload identity document
  async uploadIdentityDocument(
    userId: string,
    file: File,
    documentInfo: {
      type: IdentityDocument['type']
      documentNumber: string
      issuingAuthority: string
      issueDate: Date
      expiryDate?: Date
    }
  ): Promise<string> {
    try {
      const documentId = `${Date.now()}_${file.name}`
      const documentRef = ref(storage, `identity_documents/${userId}/${documentId}`)
      
      // Upload file
      const uploadResult = await uploadBytes(documentRef, file)
      const documentUrl = await getDownloadURL(uploadResult.ref)

      // Create document record
      const document: IdentityDocument = {
        id: documentId,
        ...documentInfo,
        documentUrl,
        isVerified: false
      }

      // Update user profile with new document
      const profile = await this.getProfile(userId)
      if (profile) {
        const updatedDocuments = [...profile.identityDocuments, document]
        await this.updateProfile(userId, {
          identityDocuments: updatedDocuments
        })
      }

      return documentId
    } catch (error) {
      console.error('Error uploading identity document:', error)
      throw error
    }
  }

  // Upload insurance document
  async uploadInsuranceDocument(
    userId: string,
    file: File,
    insuranceInfo: Omit<InsuranceInfo, 'documentUrl' | 'isVerified'>
  ): Promise<void> {
    try {
      const documentRef = ref(storage, `insurance_documents/${userId}/${Date.now()}_${file.name}`)
      
      // Upload file
      const uploadResult = await uploadBytes(documentRef, file)
      const documentUrl = await getDownloadURL(uploadResult.ref)

      // Update profile with insurance info
      await this.updateProfile(userId, {
        insuranceInfo: {
          ...insuranceInfo,
          documentUrl,
          isVerified: false
        }
      })
    } catch (error) {
      console.error('Error uploading insurance document:', error)
      throw error
    }
  }

  // Add achievement
  async addAchievement(
    userId: string,
    achievement: Omit<Achievement, 'id'>,
    certificateFile?: File
  ): Promise<string> {
    try {
      const achievementId = `achievement_${Date.now()}`
      let certificateUrl: string | undefined

      // Upload certificate if provided
      if (certificateFile) {
        const certificateRef = ref(storage, `achievements/${userId}/${achievementId}_${certificateFile.name}`)
        const uploadResult = await uploadBytes(certificateRef, certificateFile)
        certificateUrl = await getDownloadURL(uploadResult.ref)
      }

      const newAchievement: Achievement = {
        id: achievementId,
        ...achievement,
        certificate: certificateUrl
      }

      // Update profile with new achievement
      const profile = await this.getProfile(userId)
      if (profile) {
        const updatedAchievements = [...profile.sportPreferences.achievements, newAchievement]
        await this.updateProfile(userId, {
          sportPreferences: {
            ...profile.sportPreferences,
            achievements: updatedAchievements
          }
        })
      }

      return achievementId
    } catch (error) {
      console.error('Error adding achievement:', error)
      throw error
    }
  }

  // Add certification
  async addCertification(
    userId: string,
    certification: Omit<Certification, 'id' | 'isVerified'>,
    certificateFile?: File
  ): Promise<string> {
    try {
      const certificationId = `cert_${Date.now()}`
      let certificateUrl: string | undefined

      // Upload certificate if provided
      if (certificateFile) {
        const certificateRef = ref(storage, `certifications/${userId}/${certificationId}_${certificateFile.name}`)
        const uploadResult = await uploadBytes(certificateRef, certificateFile)
        certificateUrl = await getDownloadURL(uploadResult.ref)
      }

      const newCertification: Certification = {
        id: certificationId,
        ...certification,
        certificateUrl,
        isVerified: false
      }

      // Update profile with new certification
      const profile = await this.getProfile(userId)
      if (profile) {
        const updatedCertifications = [...profile.sportPreferences.certifications, newCertification]
        await this.updateProfile(userId, {
          sportPreferences: {
            ...profile.sportPreferences,
            certifications: updatedCertifications
          }
        })
      }

      return certificationId
    } catch (error) {
      console.error('Error adding certification:', error)
      throw error
    }
  }

  // Update sport preferences
  async updateSportPreferences(
    userId: string,
    preferences: Partial<SportPreferences>
  ): Promise<void> {
    try {
      const profile = await this.getProfile(userId)
      if (profile) {
        await this.updateProfile(userId, {
          sportPreferences: {
            ...profile.sportPreferences,
            ...preferences
          }
        })
      }
    } catch (error) {
      console.error('Error updating sport preferences:', error)
      throw error
    }
  }

  // Add emergency contact
  async addEmergencyContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id'>
  ): Promise<string> {
    try {
      const contactId = `contact_${Date.now()}`
      const newContact: EmergencyContact = {
        id: contactId,
        ...contact
      }

      const profile = await this.getProfile(userId)
      if (profile) {
        const updatedContacts = [...profile.emergencyContacts, newContact]
        await this.updateProfile(userId, {
          emergencyContacts: updatedContacts
        })
      }

      return contactId
    } catch (error) {
      console.error('Error adding emergency contact:', error)
      throw error
    }
  }

  // Update privacy settings
  async updatePrivacySettings(
    userId: string,
    privacySettings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      const profile = await this.getProfile(userId)
      if (profile) {
        await this.updateProfile(userId, {
          privacy: {
            ...profile.privacy,
            ...privacySettings
          }
        })
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      throw error
    }
  }

  // Search profiles by sport and location
  async searchProfiles(filters: {
    sport?: string
    location?: string
    skillLevel?: string
    availability?: string
  }): Promise<UserProfile[]> {
    try {
      let q = query(
        collection(db, 'userProfiles'),
        where('privacy.profileVisibility', 'in', ['public', 'teams'])
      )

      const snapshot = await getDocs(q)
      let profiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        personalInfo: {
          ...doc.data().personalInfo,
          dateOfBirth: doc.data().personalInfo?.dateOfBirth?.toDate()
        },
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as UserProfile[]

      // Apply client-side filters
      if (filters.sport) {
        profiles = profiles.filter(profile => 
          profile.sportPreferences.primarySports.includes(filters.sport!) ||
          profile.sportPreferences.secondarySports.includes(filters.sport!)
        )
      }

      if (filters.location) {
        profiles = profiles.filter(profile =>
          profile.contactInfo.address.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
          profile.contactInfo.address.state.toLowerCase().includes(filters.location!.toLowerCase())
        )
      }

      if (filters.skillLevel && filters.sport) {
        profiles = profiles.filter(profile =>
          profile.sportPreferences.skillLevels[filters.sport!] === filters.skillLevel
        )
      }

      return profiles
    } catch (error) {
      console.error('Error searching profiles:', error)
      return []
    }
  }

  // Get verification status
  async getVerificationStatus(userId: string): Promise<VerificationStatus | null> {
    try {
      const profile = await this.getProfile(userId)
      return profile?.verification || null
    } catch (error) {
      console.error('Error getting verification status:', error)
      return null
    }
  }

  // Update verification status (admin function)
  async updateVerificationStatus(
    userId: string,
    verificationUpdates: Partial<VerificationStatus>,
    verifiedBy: string
  ): Promise<void> {
    try {
      const profile = await this.getProfile(userId)
      if (profile) {
        const updatedVerification: VerificationStatus = {
          ...profile.verification,
          ...verificationUpdates,
          lastVerificationCheck: new Date()
        }

        // Determine verification level based on completed verifications
        const verificationCount = Object.values(updatedVerification).filter(v => v === true).length
        if (verificationCount >= 4) {
          updatedVerification.verificationLevel = 'premium'
        } else if (verificationCount >= 2) {
          updatedVerification.verificationLevel = 'standard'
        } else if (verificationCount >= 1) {
          updatedVerification.verificationLevel = 'basic'
        }

        await this.updateProfile(userId, {
          verification: updatedVerification
        })
      }
    } catch (error) {
      console.error('Error updating verification status:', error)
      throw error
    }
  }
}

export const userProfileService = new UserProfileService()
