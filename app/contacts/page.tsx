"use client"

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactsPage() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch all users
    const unsub = onSnapshot(collection(db, "users"), snap => {
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch contacts
    const q = query(collection(db, "contacts"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => d.data().contactId));
    });
    return () => unsub();
  }, [user]);

  const handleAddContact = async (contactId: string) => {
    if (!user) return;
    await addDoc(collection(db, "contacts"), { userId: user.uid, contactId, createdAt: new Date() });
  };
  const handleRemoveContact = async (contactId: string) => {
    if (!user) return;
    // Find and delete the contact doc
    const q = query(collection(db, "contacts"), where("userId", "==", user.uid), where("contactId", "==", contactId));
    const snap = await getDocs(q);
    snap.forEach((d: any) => deleteDoc(doc(db, "contacts", d.id)));
  };
  const filteredUsers = allUsers.filter(u => u.uid !== user?.uid && (
    u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">User Directory & Contacts</h1>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="mb-4" />
        <div className="space-y-2">
          {filteredUsers.map(u => (
            <div key={u.uid} className="flex items-center gap-4 border-b py-2">
              <div className="flex-1">{u.firstName} {u.lastName} <span className="text-xs text-muted-foreground">{u.email}</span></div>
              {contacts.includes(u.uid) ? (
                <Button variant="outline" onClick={() => handleRemoveContact(u.uid)}>Remove Contact</Button>
              ) : (
                <Button onClick={() => handleAddContact(u.uid)}>Add Contact</Button>
              )}
              <Button variant="secondary">Start Chat</Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
} 