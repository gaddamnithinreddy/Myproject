import { db } from "./firebase"
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore"

export function generateReferralCode(uid: string) {
  // Simple code: UID + random 4 digits
  return uid.slice(0, 6) + Math.floor(1000 + Math.random() * 9000)
}

export async function trackReferral(referrerId: string, referredUserId: string) {
  return addDoc(collection(db, "referrals"), {
    referrerId,
    referredUserId,
    createdAt: Timestamp.now(),
  })
}

export async function getUserReferrals(referrerId: string) {
  const q = query(collection(db, "referrals"), where("referrerId", "==", referrerId))
  const snap = await getDocs(q)
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
} 