"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useCallback, useEffect, useState, useRef } from "react"
import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Timestamp } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  Send,
  MessageSquare,
  PlusCircle,
  ImageIcon,
  Smile,
  FileText,
  CheckCircle,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "@/components/DashboardLayout"
import { app } from "@/lib/firebase" // Import the app instance
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { debounce } from "lodash" // For typing indicator debounce
import { deleteField } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createNotification } from "@/lib/notifications"

// Dynamically import Firebase SDKs that are only used on the client
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  limit,
  startAfter,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  getDocs,
} from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage"

interface ChatRoom {
  id: string
  name: string
  type: "direct" | "team" | "tournament"
  participants: string[]
  teamId?: string
  tournamentId?: string
  createdBy: string
  createdAt: Timestamp
  lastMessage: {
    senderId: string
    content: string
    timestamp: Timestamp
    type: "text" | "image" | "file"
  }
  lastRead?: { [userId: string]: Timestamp }
}

interface Message {
  id: string
  chatRoomId: string
  senderId: string
  content: string
  timestamp: Timestamp
  type: "text" | "image" | "file"
  senderProfile?: {
    firstName: string
    lastName: string
    profilePicture?: string
  }
}

interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  profilePicture?: string
}

interface TypingStatus {
  [userId: string]: Timestamp
}

const MESSAGES_PER_LOAD = 20

const emojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤗",
  "🤫",
  "🤔",
  "🫡",
  "😏",
  "😮",
  "😐",
  "😑",
  "😶",
  "🙄",
  "😬",
  "🤥",
  "😌",
  "😔",
  "😪",
  "🤤",
  "😴",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🤧",
  "🥵",
  "🥶",
  "🥴",
  "😵",
  "🤯",
  "🤠",
  "🥳",
  "😎",
  "🤓",
  "🧐",
  "😕",
  "😟",
  "🙁",
  "😮",
  "😯",
  "😲",
  "😳",
  "🥺",
  "🥹",
  "😦",
  "😧",
  "😨",
  "😩",
  "😫",
  "😤",
  "😠",
  "😡",
  "🤬",
  "😈",
  "👿",
  "💀",
  "☠️",
  "💩",
  "🤡",
  "👹",
  "👺",
  "👻",
  "👽",
  "👾",
  "🤖",
  "🎃",
  "😺",
  "😸",
  "😹",
  "😻",
  "😼",
  "😽",
  "🙀",
  "😿",
  "😾",
]

export default function ChatPage() {
  const { user, userProfile } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [lastMessageDoc, setLastMessageDoc] = useState<any>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isTyping, setIsTyping] = useState(false) // Local user typing status
  const [otherTypingUsers, setOtherTypingUsers] = useState<UserProfile[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [codeInput, setCodeInput] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeSuccess, setCodeSuccess] = useState(false)
  const [userSuccess, setUserSuccess] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState<string>("")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // Initialize Firestore and Storage only on the client
  const db = getFirestore(app)
  const storage = getStorage(app)

  // Debounced function to update typing status in Firestore
  const updateTypingStatus = useCallback(
    debounce(async (roomId: string, userId: string | null, typing: boolean) => {
      if (!userId) return
      const typingDocRef = doc(db, "chatRooms", roomId, "typingStatus", "doc")
      try {
        if (typing) {
          await setDoc(typingDocRef, { [userId]: Timestamp.now() }, { merge: true })
        } else {
          // Remove user's typing status
          await updateDoc(typingDocRef, { [userId]: deleteField() })
        }
      } catch (error) {
        console.error("Error updating typing status:", error)
      }
    }, 500), // Debounce for 500ms
    [db],
  )

  // Fetch all users for display in chat
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as UserProfile[]
      setAllUsers(usersData)
    })
    return () => unsubscribe()
  }, [db])

  // Fetch chat rooms
  useEffect(() => {
    if (!user) {
      setLoadingRooms(false)
      return
    }

    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessage.timestamp", "desc"),
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatRoom[]
      setChatRooms(roomsData)
      setLoadingRooms(false)

      // If no room is selected, select the first one
      if (!selectedRoom && roomsData.length > 0) {
        setSelectedRoom(roomsData[0])
      }
    })

    return () => unsubscribe()
  }, [user, selectedRoom, db])

  // Fetch messages for selected room
  useEffect(() => {
    if (!selectedRoom?.id) {
      setMessages([])
      setLastMessageDoc(null)
      setHasMoreMessages(true)
      return
    }

    setLoadingMessages(true)
    const q = query(
      collection(db, "messages"),
      where("chatRoomId", "==", selectedRoom.id),
      orderBy("timestamp", "desc"),
      limit(MESSAGES_PER_LOAD),
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedMessages = await Promise.all(
        snapshot.docs.map(async (msgDoc) => {
          const msgData = msgDoc.data()
          const senderProfile = allUsers.find((u) => u.uid === msgData.senderId)
          return {
            id: msgDoc.id,
            ...msgData,
            senderProfile,
          } as Message
        }),
      )
      setMessages(fetchedMessages.reverse()) // Reverse to show oldest first
      setLastMessageDoc(snapshot.docs[snapshot.docs.length - 1])
      setHasMoreMessages(fetchedMessages.length === MESSAGES_PER_LOAD)
      setLoadingMessages(false)
      scrollToBottom()
    })

    return () => unsubscribe()
  }, [selectedRoom, allUsers, db])

  // Listen for typing status in the selected room
  useEffect(() => {
    if (!selectedRoom?.id || !user?.uid) {
      setOtherTypingUsers([])
      return
    }

    const typingDocRef = doc(db, "chatRooms", selectedRoom.id, "typingStatus", "doc")
    const unsubscribeTyping = onSnapshot(typingDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const typingData = snapshot.data() as TypingStatus
        const activeTypers: UserProfile[] = []
        const now = Timestamp.now().toMillis()

        for (const userId in typingData) {
          if (userId !== user.uid) {
            const lastTypedTime = typingData[userId].toMillis()
            // Consider user typing if their last activity was within the last 2 seconds
            if (now - lastTypedTime < 2000) {
              const typerProfile = allUsers.find((u) => u.uid === userId)
              if (typerProfile) {
                activeTypers.push(typerProfile)
              }
            }
          }
        }
        setOtherTypingUsers(activeTypers)
      } else {
        setOtherTypingUsers([])
      }
    })

    return () => unsubscribeTyping()
  }, [selectedRoom, user, allUsers, db])

  // When a chat room is selected, update lastRead for the user
  useEffect(() => {
    if (!selectedRoom || !user) return
    const updateLastRead = async () => {
      try {
        await updateDoc(doc(db, "chatRooms", selectedRoom.id), {
          [`lastRead.${user.uid}`]: Timestamp.now(),
        })
      } catch (err) {
        // Ignore errors for now
      }
    }
    updateLastRead()
  }, [selectedRoom, user, db])

  const fetchMoreMessages = useCallback(async () => {
    if (!selectedRoom?.id || !lastMessageDoc || !hasMoreMessages) return

    setLoadingMessages(true)
    const q = query(
      collection(db, "messages"),
      where("chatRoomId", "==", selectedRoom.id),
      orderBy("timestamp", "desc"),
      startAfter(lastMessageDoc),
      limit(MESSAGES_PER_LOAD),
    )

    const snapshot = await getDocs(q)
    const newMessages = await Promise.all(
      snapshot.docs.map(async (msgDoc: any) => {
        const msgData = msgDoc.data()
        const senderProfile = allUsers.find((u) => u.uid === msgData.senderId)
        return {
          id: msgDoc.id,
          ...msgData,
          senderProfile,
        } as Message
      }),
    )

    setMessages((prevMessages) => [...newMessages.reverse(), ...prevMessages])
    setLastMessageDoc(snapshot.docs[snapshot.docs.length - 1])
    setHasMoreMessages(newMessages.length === MESSAGES_PER_LOAD)
    setLoadingMessages(false)
  }, [selectedRoom, lastMessageDoc, hasMoreMessages, allUsers, db])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (content: string, type: "text" | "image" | "file") => {
    if (!user || !selectedRoom) return

    try {
      const messageData = {
        chatRoomId: selectedRoom.id,
        senderId: user.uid,
        content,
        timestamp: Timestamp.now(),
        type,
      }
      await addDoc(collection(db, "messages"), messageData)

      // Update last message in chat room
      await updateDoc(doc(db, "chatRooms", selectedRoom.id), {
        lastMessage: {
          senderId: user.uid,
          content: type === "text" ? content : `[${type.toUpperCase()}]`,
          timestamp: Timestamp.now(),
          type,
        },
      })

      // Notification logic
      if (selectedRoom.type === "direct") {
        // Notify the other participant
        const recipientId = selectedRoom.participants.find((uid) => uid !== user.uid)
        if (recipientId) {
          await createNotification({
            userId: recipientId,
            type: "direct_message",
            title: `New Message from ${userProfile?.firstName || "User"}`,
            body: type === "text" ? content : `Sent a ${type}`,
            data: { chatRoomId: selectedRoom.id },
            link: `/chat?room=${selectedRoom.id}`,
          })
        }
      } else if (selectedRoom.type === "team" || selectedRoom.type === "tournament") {
        // Mention detection: notify mentioned users
        if (type === "text" && content.includes("@")) {
          const mentionedUsernames = content.match(/@\w+/g) || []
          const mentionedUids = allUsers
            .filter((u) =>
              mentionedUsernames.some((mention) =>
                mention.slice(1).toLowerCase() ===
                `${u.firstName}${u.lastName}`.replace(/\s/g, "").toLowerCase()
              )
            )
            .map((u) => u.uid)
          const notifyPromises = mentionedUids
            .filter((uid) => uid !== user.uid)
            .map((uid) =>
              createNotification({
                userId: uid,
                type: "chat_mention",
                title: `Mentioned in ${selectedRoom.name}`,
                body: `${userProfile?.firstName || "User"} mentioned you: ${content}`,
                data: { chatRoomId: selectedRoom.id },
                link: `/chat?room=${selectedRoom.id}`,
              })
            )
          await Promise.all(notifyPromises)
        }
      }

      setNewMessage("")
      setIsTyping(false) // Stop typing after sending message
      updateTypingStatus(selectedRoom.id, user.uid, false) // Immediately update Firestore
      scrollToBottom()
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    await sendMessage(newMessage.trim(), "text")
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    if (!event.target.files || event.target.files.length === 0 || !user || !selectedRoom) return

    const file = event.target.files[0]
    const filePath = `${type}s/${selectedRoom.id}/${user.uid}/${Date.now()}_${file.name}`
    const fileRef = ref(storage, filePath)

    try {
      toast({
        title: `Uploading ${type}...`,
        description: "Please wait while your file is being uploaded.",
      })
      setUploadProgress(0)
      const uploadTask = uploadBytesResumable(fileRef, file)
      uploadTask.on("state_changed",
        (snapshot: any) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
        (error: any) => {
          setUploadProgress(null)
          toast({
            title: `Error uploading ${type}`,
            description: error.message,
            variant: "destructive",
          })
        },
        async () => {
          setUploadProgress(null)
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
      await sendMessage(downloadURL, type)
      toast({
        title: `${type === "image" ? "Image" : "File"} uploaded!`,
        description: "Your file has been sent.",
      })
        }
      )
    } catch (error: any) {
      setUploadProgress(null)
      toast({
        title: `Error uploading ${type}`,
        description: error.message,
        variant: "destructive",
      })
    } finally {
      event.target.value = ""
    }
  }

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (selectedRoom && user) {
      if (e.target.value.length > 0 && !isTyping) {
        setIsTyping(true)
        updateTypingStatus(selectedRoom.id, user.uid, true)
      } else if (e.target.value.length === 0 && isTyping) {
        setIsTyping(false)
        updateTypingStatus(selectedRoom.id, user.uid, false)
      }
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    if (selectedRoom && user && !isTyping) {
      setIsTyping(true)
      updateTypingStatus(selectedRoom.id, user.uid, true)
    }
  }

  const getSenderProfile = (senderId: string): UserProfile => {
    return (
      allUsers.find((u) => u.uid === senderId) || {
        uid: "unknown",
        firstName: "Unknown",
        lastName: "User",
        profilePicture: undefined,
      }
    )
  }

  const formatMessageTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (messageDate.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      // Last 7 days
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString()
    }
  }

  // Direct chat by username
  const handleUserSearchSelect = async (otherUser: UserProfile) => {
    if (!user || !otherUser) return
    setSearchLoading(true)
    setUserSuccess(false)
    // Check for existing direct chat
    const directRoom = chatRooms.find(
      (room) =>
        room.type === "direct" &&
        room.participants.length === 2 &&
        room.participants.includes(user.uid) &&
        room.participants.includes(otherUser.uid),
    )
    if (directRoom) {
      setSelectedRoom(directRoom)
      setSearchLoading(false)
      setUserSuccess(true)
      setTimeout(() => setUserSuccess(false), 1500)
      return
    }
    // Create new direct chat room
    const newRoom = {
      name: `${userProfile?.firstName || "User"} & ${otherUser.firstName}`,
      type: "direct" as const,
      participants: [user.uid, otherUser.uid],
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      lastMessage: {
        senderId: user.uid,
        content: "",
        timestamp: Timestamp.now(),
        type: "text" as const,
      },
    }
    const docRef = await addDoc(collection(db, "chatRooms"), newRoom)
    setSelectedRoom({ ...newRoom, id: docRef.id })
    setSearchLoading(false)
    setUserSuccess(true)
    setTimeout(() => setUserSuccess(false), 1500)
  }
  // Code-based chat connect
  const handleGenerateCode = async () => {
    if (!user) return
    setCodeLoading(true)
    setCodeSuccess(false)
    const code = uuidv4().slice(0, 8).toUpperCase()
    setGeneratedCode(code)
    await setDoc(doc(db, "chatInvites", code), {
      inviter: user.uid,
      createdAt: Timestamp.now(),
    })
    toast({ title: "Invite Code Generated", description: code })
    setCodeLoading(false)
    setCodeSuccess(true)
    setTimeout(() => setCodeSuccess(false), 1500)
  }
  const handleJoinByCode = async () => {
    if (!user || !codeInput) return
    setCodeLoading(true)
    setCodeSuccess(false)
    const inviteDoc = await getDoc(doc(db, "chatInvites", codeInput))
    if (!inviteDoc.exists()) {
      toast({ title: "Invalid Code", description: "No invite found for this code.", variant: "destructive" })
      setCodeLoading(false)
      return
    }
    const inviterId = inviteDoc.data().inviter
    if (inviterId === user.uid) {
      toast({
        title: "Cannot Join Own Code",
        description: "You cannot join your own invite code.",
        variant: "destructive",
      })
      setCodeLoading(false)
      return
    }
    // Check for existing direct chat
    const directRoom = chatRooms.find(
      (room) =>
        room.type === "direct" &&
        room.participants.length === 2 &&
        room.participants.includes(user.uid) &&
        room.participants.includes(inviterId),
    )
    if (directRoom) {
      setSelectedRoom(directRoom)
      await setDoc(doc(db, "chatInvites", codeInput), {}, { merge: true })
      setCodeLoading(false)
      setCodeSuccess(true)
      setTimeout(() => setCodeSuccess(false), 1500)
      return
    }
    // Create new direct chat room
    const inviterProfile = allUsers.find((u) => u.uid === inviterId)
    const newRoom = {
      name: `${userProfile?.firstName || "User"} & ${inviterProfile?.firstName || "User"}`,
      type: "direct" as const,
      participants: [user.uid, inviterId],
      createdBy: inviterId,
      createdAt: Timestamp.now(),
      lastMessage: {
        senderId: user.uid,
        content: "",
        timestamp: Timestamp.now(),
        type: "text" as const,
      },
    }
    const docRef = await addDoc(collection(db, "chatRooms"), newRoom)
    setSelectedRoom({ ...newRoom, id: docRef.id })
    await setDoc(doc(db, "chatInvites", codeInput), {}, { merge: true })
    setCodeLoading(false)
    setCodeSuccess(true)
    setTimeout(() => setCodeSuccess(false), 1500)
  }

  // Handle message editing
  const handleEditMessage = async (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditingMessageContent(currentContent)
    setNewMessage(currentContent) // Populate input with current message
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !newMessage.trim() || !selectedRoom || !user) return

    try {
      await updateDoc(doc(db, "messages", editingMessageId), {
        content: newMessage.trim(),
        timestamp: Timestamp.now(), // Update timestamp to reflect edit
      })

      // Update last message in chat room if this was the last message
      if (
        selectedRoom.lastMessage?.senderId === user.uid &&
        selectedRoom.lastMessage?.content === messages.find((m) => m.id === editingMessageId)?.content
      ) {
        await updateDoc(doc(db, "chatRooms", selectedRoom.id), {
          lastMessage: {
            senderId: user.uid,
            content: newMessage.trim(),
            timestamp: Timestamp.now(),
            type: "text",
          },
        })
      }

      toast({ title: "Message updated!", description: "Your message has been edited." })
      setEditingMessageId(null)
      setEditingMessageContent("")
      setNewMessage("")
    } catch (error: any) {
      toast({
        title: "Error editing message",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingMessageContent("")
    setNewMessage("")
  }

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedRoom || !user) return

    try {
      await updateDoc(doc(db, "messages", messageId), {
        content: "[Message deleted]",
        type: "text", // Change type to text for deleted message placeholder
        timestamp: Timestamp.now(),
      })

      // Optionally, update last message in chat room if the deleted message was the last one
      // This logic might need to fetch the *new* last message or set a placeholder
      if (
        selectedRoom.lastMessage?.senderId === user.uid &&
        selectedRoom.lastMessage?.content === messages.find((m) => m.id === messageId)?.content
      ) {
        await updateDoc(doc(db, "chatRooms", selectedRoom.id), {
          lastMessage: {
            senderId: user.uid,
            content: "[Message deleted]",
            timestamp: Timestamp.now(),
            type: "text",
          },
        })
      }

      toast({ title: "Message deleted!", description: "The message has been removed." })
    } catch (error: any) {
      toast({
        title: "Error deleting message",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Add handler to remove participant from chat
  const handleRemoveFromChat = async (uid: string) => {
    if (!selectedRoom) return
    const updated = selectedRoom.participants.filter(id => id !== uid)
    await updateDoc(doc(db, "chatRooms", selectedRoom.id), { participants: updated })
    toast({ title: "User removed from chat" })
  }

  // When a chat is selected, scroll to the most recent message
  useEffect(() => {
    if (!selectedRoom) return
    // Wait for messages to render, then scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [selectedRoom, messages])

  // Add admin check for team chat
  const isCurrentUserAdmin = selectedRoom?.type === "team" && user && selectedRoom.teamId && (() => {
    // Find the team chat room and check if the user is owner/admin in the team
    // This requires fetching the team info; for now, fallback to showing controls for all users in team chat
    // TODO: Refine this check with actual team membership/role
    return true
  })()

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Chat Rooms Sidebar */}
        <Card className="hidden md:flex flex-col w-72 shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chats
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto">
            <div className="p-4 border-b">
              <Input
                placeholder="Search users by name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                aria-label="Search users by name"
                className="w-full focus:ring-2 focus:ring-primary focus:outline-none"
              />
              {searchLoading && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {userSuccess && (
                <div className="flex justify-center py-2 text-green-600">
                  <CheckCircle className="h-5 w-5 mr-1" /> Connected! Go chat!
                </div>
              )}
              {userSearch && !searchLoading && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-card border rounded shadow">
                  {allUsers
                    .filter(
                      (u) =>
                        u.uid !== user?.uid &&
                        `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()),
                    )
                    .map((u) => (
                      <div
                        key={u.uid}
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => handleUserSearchSelect(u)}
                      >
                        {u.firstName} {u.lastName}
                      </div>
                    ))}
                </div>
              )}
              <div className="mt-4">
                <Button onClick={handleGenerateCode} className="w-full focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Generate chat code" disabled={codeLoading}>
                  Generate Chat Code {codeLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </Button>
                {generatedCode && <div className="mt-2 text-center font-mono text-primary">{generatedCode}</div>}
                {codeSuccess && (
                  <div className="flex justify-center py-2 text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" /> Code ready!
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Enter code to join chat..."
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  aria-label="Enter code to join chat"
                  className="w-full focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Button onClick={handleJoinByCode} className="w-full mt-2 focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Join by code" disabled={codeLoading}>
                  Join by Code {codeLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </Button>
                {codeSuccess && (
                  <div className="flex justify-center py-2 text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" /> Connected! Go chat!
                  </div>
                )}
              </div>
            </div>
            {loadingRooms ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatRooms.length > 0 ? (
              chatRooms.map((room) => {
                const userLastRead = room.lastRead?.[user?.uid || ""]
                // Only show unread if the last message is NOT from the current user and is newer than lastRead
                const hasUnread =
                  room.lastMessage &&
                  room.lastMessage.senderId !== user?.uid &&
                  (!userLastRead ||
                    (room.lastMessage.timestamp &&
                      userLastRead &&
                      room.lastMessage.timestamp.toMillis() > userLastRead.toMillis()))
                return (
                <div
                  key={room.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted ${
                    selectedRoom?.id === room.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <Avatar>
                    <AvatarFallback>
                      {room.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                      <p className="font-medium truncate flex items-center gap-2">
                        {room.name}
                        {hasUnread && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" title="Unread messages" />
                        )}
                      </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {room.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                </div>
                )
              })
            ) : (
              <div className="p-4 text-center text-muted-foreground">No chat rooms found.</div>
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="flex flex-col flex-1">
          <CardHeader className="border-b">
            <CardTitle>{selectedRoom ? selectedRoom.name : "Select a Chat"}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
            {!selectedRoom ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4" />
                <p className="text-lg">Select a chat to start messaging</p>
              </div>
            ) : (
              <>
                <ScrollArea
                  className="flex-1 pr-4"
                  onScrollCapture={(e) => {
                    const target = e.target as HTMLDivElement
                    if (target.scrollTop === 0 && hasMoreMessages && !loadingMessages) {
                      fetchMoreMessages()
                    }
                  }}
                >
                  {loadingMessages && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <div className="space-y-4">
                    <AnimatePresence>
                      {messages.map((message) => {
                        const isCurrentUser = message.senderId === user?.uid
                        const sender = getSenderProfile(message.senderId)
                        return (
                          <motion.div
                            key={message.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`flex items-end gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            {!isCurrentUser && (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={sender.profilePicture || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {sender.firstName?.[0]}
                                  {sender.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"}`}>
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                }`}
                              >
                                {message.type === "text" && <p className="text-sm">{message.content}</p>}
                                {message.type === "image" && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={message.content || "/placeholder.svg"}
                                    alt="Chat image"
                                    className="max-w-xs max-h-48 rounded-md object-cover"
                                  />
                                )}
                                {message.type === "file" && (
                                  <a
                                    href={message.content}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                  >
                                    <FileText className="h-5 w-5" />
                                    <span>{message.content.split("/").pop()}</span>
                                  </a>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground mt-1">
                                {isCurrentUser ? "You" : sender.firstName} at {formatMessageTime(message.timestamp)}
                              </span>
                            </div>
                            {isCurrentUser && (
                              <div className="flex items-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {message.type === "text" && (
                                      <DropdownMenuItem onClick={() => handleEditMessage(message.id, message.content)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={sender.profilePicture || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {sender.firstName?.[0]}
                                  {sender.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {otherTypingUsers.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-2 mb-1">
                    {otherTypingUsers.map((u) => u.firstName).join(", ")} {otherTypingUsers.length > 1 ? "are" : "is"}{" "}
                    typing...
                  </div>
                )}

                {/* In the chat window, show participant list and remove button for admins */}
                {selectedRoom?.type === "team" && isCurrentUserAdmin && (
                  <div className="mb-2">
                    <h4 className="font-bold text-sm mb-1">Participants</h4>
                    {selectedRoom.participants.map(uid => {
                      const member = allUsers.find(u => u.uid === uid)
                      if (!member) return null
                      return (
                        <div key={uid} className="flex items-center gap-2">
                          <span>{member.firstName} {member.lastName}</span>
                          {uid !== user.uid && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveFromChat(uid)}
                              aria-label={`Remove ${member.firstName} ${member.lastName} from chat`}
                              className="focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <form
                  onSubmit={editingMessageId ? handleSaveEdit : handleSendMessage}
                  className="flex items-center gap-2 pt-4 border-t"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "file")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    disabled={editingMessageId !== null} // Disable file/image/emoji during edit
                  >
                    <PlusCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Add attachment</span>
                  </Button>

                  <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "image")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                    disabled={editingMessageId !== null} // Disable file/image/emoji during edit
                  >
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Add image</span>
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        type="button"
                        disabled={editingMessageId !== null}
                      >
                        <Smile className="h-5 w-5 text-muted-foreground" />
                        <span className="sr-only">Add emoji</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 grid grid-cols-8 gap-1">
                      {emojis.map((emoji, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="icon"
                          className="text-xl"
                          onClick={() => handleEmojiSelect(emoji)}
                          type="button"
                        >
                          {emoji}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Input
                    placeholder={editingMessageId ? "Edit your message..." : "Type your message..."}
                    value={newMessage}
                    onChange={handleNewMessageChange}
                    className="flex-1"
                    disabled={!selectedRoom}
                  />
                  {editingMessageId ? (
                    <>
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!selectedRoom || !newMessage.trim()}>
                        Save
                      </Button>
                    </>
                  ) : (
                  <Button type="submit" size="icon" disabled={!selectedRoom || !newMessage.trim()}>
                    <Send className="h-5 w-5" />
                    <span className="sr-only">Send message</span>
                  </Button>
                  )}
                </form>
                {uploadProgress !== null && (
                  <div className="w-full bg-muted rounded mb-2">
                    <div className="bg-primary h-2 rounded" style={{ width: `${uploadProgress}%` }} />
                    <div className="text-xs text-center mt-1">Uploading: {Math.round(uploadProgress)}%</div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
