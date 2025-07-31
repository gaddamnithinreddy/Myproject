"use client"

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react"
import { db, auth } from "@/lib/firebase" // Import initialized instances

// Dynamically import Firebase SDKs that are only used on the client
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  reload,
} from "firebase/auth"
import { doc, setDoc, onSnapshot, collection, addDoc, Timestamp, updateDoc, query, getDocs, where } from "firebase/firestore"
import { generateReferralCode as generateCustomReferralCode, trackReferral } from "@/lib/referral"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  mobileNumber: string
  dateOfBirth: string
  gender: string
  country: string
  state: string
  city: string
  zipCode: string
  address: string
  coordinates: { lat: number; lng: number }
  userType: "individual" | "club" | "organization"
  organizationName?: string
  avatar?: string
  referralCode: string
  referredBy?: string
  referralPoints: number
  role: "player" | "coach" | "owner" | "supplier"
  primarySport?: string
  emergencyContact: {
    primary: { name: string; phone: string }
    secondary: { name: string; phone: string }
  }
  insuranceId?: string
  profilePicture?: string
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  idDocumentUrl?: string;
  sportPreferences?: string[];
}

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_USER_PROFILE"; payload: UserProfile | null }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_ERROR" }

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  mobileNumber: string
  dateOfBirth: string
  gender: string
  country: string
  state: string
  city: string
  zipCode: string
  address: string
  coordinates: { lat: number; lng: number }
  userType: "individual" | "club" | "organization"
  organizationName?: string
  referralCode?: string
  avatar?: File
  idDocumentUrl?: string;
  sportPreferences?: string[];
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  clearError: () => void
  isProfileComplete: (profile: UserProfile | null) => boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Dynamically import the toast helper to avoid circular deps */
async function showToast(opts: Parameters<typeof import("@/hooks/use-toast")["toast"]>[0]) {
  const { toast } = await import("@/hooks/use-toast")
  toast(opts)
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  loading: true,
  error: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_USER":
      return { ...state, user: action.payload }
    case "SET_USER_PROFILE":
      return { ...state, userProfile: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "CLEAR_ERROR":
      return { ...state, error: null }
    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/*  React Context setup                                               */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  /* ------------------------  Auth-state listener  ------------------ */
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      dispatch({ type: "SET_USER", payload: firebaseUser })

      if (unsubscribeProfile) {
        unsubscribeProfile()
        unsubscribeProfile = null
      }

      if (firebaseUser) {
        // Always reload to get latest emailVerified status
        await reload(firebaseUser)
        const userDocRef = doc(db, "users", firebaseUser.uid)
        unsubscribeProfile = onSnapshot(
          userDocRef,
          async (snap) => {
            if (snap.exists()) {
              const profile = snap.data() as UserProfile
              // Sync emailVerified with Firebase Auth
              if (profile.emailVerified !== firebaseUser.emailVerified) {
                await setDoc(userDocRef, { emailVerified: firebaseUser.emailVerified }, { merge: true })
              }
              dispatch({ type: "SET_USER_PROFILE", payload: { ...profile, emailVerified: firebaseUser.emailVerified } })
            }
            dispatch({ type: "SET_LOADING", payload: false })
          },
          (error) => {
            // Added error handling for onSnapshot
            console.error("Error fetching user profile:", error)
            dispatch({ type: "SET_ERROR", payload: "Failed to load user profile" })
            dispatch({ type: "SET_LOADING", payload: false })
          },
        )
      } else {
        dispatch({ type: "SET_USER_PROFILE", payload: null })
        dispatch({ type: "SET_LOADING", payload: false })
      }
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeProfile) unsubscribeProfile()
    }
  }, [auth, db])

  // Utility: Check if profile is complete (required fields filled)
  const isProfileComplete = (profile: UserProfile | null) => {
    if (!profile) return false
    const required = [
      profile.firstName,
      profile.lastName,
      profile.mobileNumber,
      profile.dateOfBirth,
      profile.gender,
      profile.country,
      profile.state,
      profile.city,
      profile.zipCode,
      profile.address,
      profile.userType,
      profile.email,
    ]
    return required.every(Boolean)
  }

  /* ----------------------------  Actions  -------------------------- */

  const generateReferralCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

  const register = async (userData: RegisterData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const { user } = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
      await sendEmailVerification(user)

      // Find referrer by referral code if provided
      let referrerId = null
      let refSnap = null
      if (userData.referralCode) {
        const refQuery = query(collection(db, "users"), where("referralCode", "==", userData.referralCode))
        refSnap = await getDocs(refQuery)
        if (!refSnap.empty) {
          referrerId = refSnap.docs[0].id
        }
      }

      const profile: UserProfile = {
        uid: user.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        mobileNumber: userData.mobileNumber,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender,
        country: userData.country,
        state: userData.state,
        city: userData.city,
        zipCode: userData.zipCode,
        address: userData.address,
        coordinates: userData.coordinates,
        userType: userData.userType,
        organizationName: userData.organizationName,
        referralCode: generateCustomReferralCode(user.uid),
        referredBy: userData.referralCode,
        referralPoints: 0,
        role: "player",
        emergencyContact: {
          primary: { name: "", phone: "" },
          secondary: { name: "", phone: "" },
        },
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        profilePicture:
          userData.gender === "male"
            ? "/placeholder-male.png"
            : userData.gender === "female"
            ? "/placeholder-female.png"
            : "/placeholder-user.jpg",
        idDocumentUrl: userData.idDocumentUrl || "",
        sportPreferences: userData.sportPreferences || [],
      }

      await setDoc(doc(db, "users", user.uid), profile)

      // Track referral and increment points if referrer found
      if (referrerId && refSnap) {
        await trackReferral(referrerId, user.uid)
        const refUserDoc = doc(db, "users", referrerId)
        await updateDoc(refUserDoc, { referralPoints: (refSnap.docs[0].data().referralPoints || 0) + 1 })
      }

      await showToast({
        title: "Registration Successful!",
        description: "Please check your email to verify your account.",
      })
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message })
      await showToast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      await signInWithEmailAndPassword(auth, email, password)
      if (rememberMe) localStorage.setItem("keyconnect_remember", "true")

      await showToast({ title: "Welcome back!", description: "You have been successfully logged in." })
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message })
      await showToast({
        title: "Login Failed",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const logout = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      await signOut(auth)
      localStorage.removeItem("keyconnect_remember")
      await showToast({ title: "Logged Out", description: "You have been successfully logged out." })
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message })
      await showToast({
        title: "Logout Failed",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      await sendPasswordResetEmail(auth, email)
      await showToast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for instructions to reset your password.",
      })
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message })
      await showToast({
        title: "Password Reset Failed",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!state.user) {
      await showToast({
        title: "Update Failed",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      })
      return
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const userDocRef = doc(db, "users", state.user.uid)
      await setDoc(userDocRef, { ...data, updatedAt: new Date() }, { merge: true })
      await showToast({ title: "Profile Updated", description: "Your profile has been successfully updated." })
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message })
      await showToast({
        title: "Profile Update Failed",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" })
  }

  const value = {
    user: state.user,
    userProfile: state.userProfile,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    clearError,
    isProfileComplete,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
