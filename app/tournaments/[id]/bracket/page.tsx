"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
// import { Bracket, RoundProps } from "react-brackets" // Uncomment if installed

export default function BracketPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [bracket, setBracket] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false) // TODO: Set based on user role

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tournaments", id), (snap) => {
      setBracket(snap.data()?.bracket || [])
      setLoading(false)
    })
    return () => unsub()
  }, [id])

  // TODO: Admin edit logic (drag-and-drop, updateDoc)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Tournament Bracket</h1>
        {loading ? (
          <div className="bg-muted rounded p-8 text-center text-muted-foreground">Loading bracket...</div>
        ) : bracket.length === 0 ? (
          <div className="bg-muted rounded p-8 text-center text-muted-foreground">No bracket data yet.</div>
        ) : (
          <div className="bg-muted rounded p-4 w-full max-w-3xl mx-auto overflow-x-auto">
            {/* Bracket visualization using react-brackets */}
            {/* To enable drag-and-drop editing, install react-brackets and replace the placeholder below: */}
            {/* <Bracket rounds={bracket as RoundProps[]} /> */}
            <div className="text-center text-muted-foreground py-8">
              Bracket visualization here (install <code>react-brackets</code> for full UI and drag-and-drop editing).
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 p-4 border rounded bg-yellow-50 text-yellow-900">
            <strong>Admin:</strong> Bracket editing coming soon (drag-and-drop, update Firestore)
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
