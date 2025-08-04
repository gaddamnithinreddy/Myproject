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
  limit, 
  onSnapshot, 
  getDocs,
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

export interface ChatRoom {
  id: string
  name: string
  type: 'individual' | 'team' | 'tournament'
  participants: string[]
  teamId?: string
  tournamentId?: string
  createdBy: string
  createdAt: Date
  lastMessage?: {
    senderId: string
    content: string
    timestamp: Date
    type: 'text' | 'image' | 'video' | 'file'
  }
  isActive: boolean
}

export interface Message {
  id: string
  chatRoomId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  type: 'text' | 'image' | 'video' | 'file'
  mediaUrl?: string
  fileName?: string
  fileSize?: number
  timestamp: Date
  readBy: string[]
  edited?: boolean
  editedAt?: Date
  replyTo?: string
}

export interface ChatUser {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
}

class ChatService {
  // Create a new chat room
  async createChatRoom(
    name: string,
    type: 'individual' | 'team' | 'tournament',
    participants: string[],
    createdBy: string,
    teamId?: string,
    tournamentId?: string
  ): Promise<string> {
    try {
      const chatRoomData: Omit<ChatRoom, 'id'> = {
        name,
        type,
        participants,
        teamId,
        tournamentId,
        createdBy,
        createdAt: new Date(),
        isActive: true
      }

      const docRef = await addDoc(collection(db, 'chatRooms'), chatRoomData)
      return docRef.id
    } catch (error) {
      console.error('Error creating chat room:', error)
      throw error
    }
  }

  // Get user's chat rooms
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    try {
      const q = query(
        collection(db, 'chatRooms'),
        where('participants', 'array-contains', userId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastMessage: doc.data().lastMessage ? {
          ...doc.data().lastMessage,
          timestamp: doc.data().lastMessage.timestamp?.toDate() || new Date()
        } : undefined
      })) as ChatRoom[]
    } catch (error) {
      console.error('Error getting user chat rooms:', error)
      throw error
    }
  }

  // Listen to chat rooms in real-time
  subscribeToUserChatRooms(userId: string, callback: (chatRooms: ChatRoom[]) => void) {
    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )

    return onSnapshot(q, (snapshot) => {
      const chatRooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastMessage: doc.data().lastMessage ? {
          ...doc.data().lastMessage,
          timestamp: doc.data().lastMessage.timestamp?.toDate() || new Date()
        } : undefined
      })) as ChatRoom[]
      
      callback(chatRooms)
    })
  }

  // Send a text message
  async sendMessage(
    chatRoomId: string,
    senderId: string,
    senderName: string,
    content: string,
    senderAvatar?: string,
    replyTo?: string
  ): Promise<string> {
    try {
      const messageData: Omit<Message, 'id'> = {
        chatRoomId,
        senderId,
        senderName,
        senderAvatar,
        content,
        type: 'text',
        timestamp: new Date(),
        readBy: [senderId],
        replyTo
      }

      const docRef = await addDoc(collection(db, 'messages'), messageData)

      // Update chat room's last message
      await updateDoc(doc(db, 'chatRooms', chatRoomId), {
        lastMessage: {
          senderId,
          content,
          timestamp: serverTimestamp(),
          type: 'text'
        }
      })

      return docRef.id
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  // Send media message (image/video/file)
  async sendMediaMessage(
    chatRoomId: string,
    senderId: string,
    senderName: string,
    file: File,
    type: 'image' | 'video' | 'file',
    senderAvatar?: string
  ): Promise<string> {
    try {
      // Upload file to Firebase Storage
      const fileId = uuidv4()
      const fileRef = ref(storage, `chat/${chatRoomId}/${fileId}_${file.name}`)
      const uploadResult = await uploadBytes(fileRef, file)
      const mediaUrl = await getDownloadURL(uploadResult.ref)

      const messageData: Omit<Message, 'id'> = {
        chatRoomId,
        senderId,
        senderName,
        senderAvatar,
        content: file.name,
        type,
        mediaUrl,
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date(),
        readBy: [senderId]
      }

      const docRef = await addDoc(collection(db, 'messages'), messageData)

      // Update chat room's last message
      await updateDoc(doc(db, 'chatRooms', chatRoomId), {
        lastMessage: {
          senderId,
          content: type === 'image' ? '📷 Image' : type === 'video' ? '🎥 Video' : '📎 File',
          timestamp: serverTimestamp(),
          type
        }
      })

      return docRef.id
    } catch (error) {
      console.error('Error sending media message:', error)
      throw error
    }
  }

  // Get messages for a chat room
  async getChatMessages(chatRoomId: string, limitCount: number = 50): Promise<Message[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate()
      })).reverse() as Message[]
    } catch (error) {
      console.error('Error getting chat messages:', error)
      throw error
    }
  }

  // Listen to messages in real-time
  subscribeToMessages(chatRoomId: string, callback: (messages: Message[]) => void) {
    const q = query(
      collection(db, 'messages'),
      where('chatRoomId', '==', chatRoomId),
      orderBy('timestamp', 'asc')
    )

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate()
      })) as Message[]
      
      callback(messages)
    })
  }

  // Mark message as read
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        readBy: arrayUnion(userId)
      })
    } catch (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  // Mark all messages in chat room as read
  async markChatAsRead(chatRoomId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatRoomId', '==', chatRoomId),
        where('readBy', 'not-in', [[userId]])
      )

      const snapshot = await getDocs(q)
      const batch = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          readBy: arrayUnion(userId)
        })
      )

      await Promise.all(batch)
    } catch (error) {
      console.error('Error marking chat as read:', error)
      throw error
    }
  }

  // Edit message
  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error editing message:', error)
      throw error
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'messages', messageId))
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  // Add participant to chat room
  async addParticipant(chatRoomId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'chatRooms', chatRoomId), {
        participants: arrayUnion(userId)
      })
    } catch (error) {
      console.error('Error adding participant:', error)
      throw error
    }
  }

  // Remove participant from chat room
  async removeParticipant(chatRoomId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'chatRooms', chatRoomId), {
        participants: arrayRemove(userId)
      })
    } catch (error) {
      console.error('Error removing participant:', error)
      throw error
    }
  }

  // Create individual chat room
  async createIndividualChat(user1Id: string, user2Id: string, user1Name: string, user2Name: string): Promise<string> {
    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chatRooms'),
        where('type', '==', 'individual'),
        where('participants', 'in', [[user1Id, user2Id], [user2Id, user1Id]])
      )

      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        return snapshot.docs[0].id
      }

      // Create new individual chat
      return await this.createChatRoom(
        `${user1Name} & ${user2Name}`,
        'individual',
        [user1Id, user2Id],
        user1Id
      )
    } catch (error) {
      console.error('Error creating individual chat:', error)
      throw error
    }
  }

  // Create team chat room
  async createTeamChat(teamId: string, teamName: string, participants: string[], createdBy: string): Promise<string> {
    try {
      return await this.createChatRoom(
        `${teamName} Team Chat`,
        'team',
        participants,
        createdBy,
        teamId
      )
    } catch (error) {
      console.error('Error creating team chat:', error)
      throw error
    }
  }

  // Get unread message count for user
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Get user's chat rooms
      const chatRooms = await this.getUserChatRooms(userId)
      let totalUnread = 0

      for (const room of chatRooms) {
        const q = query(
          collection(db, 'messages'),
          where('chatRoomId', '==', room.id),
          where('senderId', '!=', userId),
          where('readBy', 'not-in', [[userId]])
        )

        const snapshot = await getDocs(q)
        totalUnread += snapshot.size
      }

      return totalUnread
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }
}

export const chatService = new ChatService()
