"use client"

import { useState, useRef, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  MicOff, 
  Reply, 
  MoreVertical,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Sad,
  MessageSquare,
  Search,
  Hash,
  Users,
  Settings
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { FadeIn, SlideIn } from '@/components/ui/micro-animations'
import { useOptimisticUpdates } from '@/hooks/use-optimistic-updates'

interface Message {
  id: string
  chatRoomId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  type: 'text' | 'image' | 'file' | 'voice' | 'system'
  timestamp: Date
  readBy: string[]
  reactions: Record<string, string[]> // emoji -> userIds
  replyTo?: string
  threadId?: string
  edited?: boolean
  editedAt?: Date
}

interface ChatRoom {
  id: string
  name: string
  type: 'direct' | 'group' | 'team' | 'tournament'
  participants: string[]
  lastMessage?: {
    content: string
    senderId: string
    timestamp: Date
  }
  unreadCount: number
  isTyping: string[]
}

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡']

export function EnhancedChat({ chatRoomId, teamId }: { chatRoomId: string; teamId?: string }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  
  const { optimisticUpdate } = useOptimisticUpdates()

  // Load messages
  useEffect(() => {
    if (!chatRoomId) return

    const q = query(
      collection(db, 'messages'),
      where('chatRoomId', '==', chatRoomId),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })) as Message[]
      
      setMessages(messageData.reverse())
    })

    return unsubscribe
  }, [chatRoomId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Typing indicator
  useEffect(() => {
    if (!chatRoomId || !user) return

    const typingRef = doc(db, 'chatRooms', chatRoomId)
    
    return () => {
      // Clear typing status on unmount
      updateDoc(typingRef, {
        [`typing.${user.uid}`]: false
      })
    }
  }, [chatRoomId, user])

  const handleTyping = () => {
    if (!user || !chatRoomId) return

    if (!isTyping) {
      setIsTyping(true)
      updateDoc(doc(db, 'chatRooms', chatRoomId), {
        [`typing.${user.uid}`]: true
      })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      updateDoc(doc(db, 'chatRooms', chatRoomId), {
        [`typing.${user.uid}`]: false
      })
    }, 2000)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const messageData = {
      chatRoomId,
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      senderAvatar: user.photoURL,
      content: newMessage.trim(),
      type: 'text' as const,
      timestamp: new Date(),
      readBy: [user.uid],
      reactions: {},
      replyTo: replyingTo?.id,
      threadId: selectedThread
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = { ...messageData, id: tempId }
    
    optimisticUpdate(
      () => setMessages(prev => [...prev, optimisticMessage]),
      async () => {
        await addDoc(collection(db, 'messages'), messageData)
        
        // Update chat room last message
        await updateDoc(doc(db, 'chatRooms', chatRoomId), {
          lastMessage: {
            content: messageData.content,
            senderId: user.uid,
            timestamp: messageData.timestamp
          }
        })
      },
      () => setMessages(prev => prev.filter(m => m.id !== tempId))
    )

    setNewMessage('')
    setReplyingTo(null)
    
    // Clear typing status
    setIsTyping(false)
    updateDoc(doc(db, 'chatRooms', chatRoomId), {
      [`typing.${user.uid}`]: false
    })
  }

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const currentReactions = message.reactions[emoji] || []
    const hasReacted = currentReactions.includes(user.uid)

    const updatedReactions = hasReacted
      ? currentReactions.filter(uid => uid !== user.uid)
      : [...currentReactions, user.uid]

    const newReactions = {
      ...message.reactions,
      [emoji]: updatedReactions.length > 0 ? updatedReactions : undefined
    }

    // Remove empty reaction arrays
    Object.keys(newReactions).forEach(key => {
      if (!newReactions[key] || newReactions[key].length === 0) {
        delete newReactions[key]
      }
    })

    await updateDoc(doc(db, 'messages', messageId), {
      reactions: newReactions
    })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        // Here you would upload the audio file and send as voice message
        toast.success('Voice message recorded!')
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const createThread = async (messageId: string) => {
    const threadId = `thread-${messageId}-${Date.now()}`
    setSelectedThread(threadId)
    toast.success('Thread created! Reply to continue the conversation.')
  }

  const filteredMessages = messages.filter(message => {
    if (!showSearch || !searchQuery) return true
    return message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
           message.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const groupedMessages = filteredMessages.reduce((groups, message) => {
    const date = message.timestamp.toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/team-avatar.jpg" />
            <AvatarFallback>TC</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Team Chat</h3>
            <p className="text-sm text-gray-500">
              {typingUsers.length > 0 && (
                <span className="text-green-600">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-4 border-b dark:border-gray-700">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Thread Navigation */}
      {selectedThread && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Thread</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedThread(null)}
            >
              Close Thread
            </Button>
          </div>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Replying to {replyingTo.senderName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              Cancel
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1 truncate">
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dayMessages]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <Badge variant="secondary" className="text-xs">
                {new Date(date).toLocaleDateString()}
              </Badge>
            </div>
            
            {dayMessages.map((message, index) => (
              <FadeIn key={message.id} delay={index * 0.05}>
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === user?.uid}
                  onReact={addReaction}
                  onReply={setReplyingTo}
                  onThread={createThread}
                />
              </FadeIn>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              className="min-h-[40px] max-h-32 resize-none"
              rows={1}
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className={isRecording ? 'text-red-600' : ''}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  onReact,
  onReply,
  onThread
}: {
  message: Message
  isOwn: boolean
  onReact: (messageId: string, emoji: string) => void
  onReply: (message: Message) => void
  onThread: (messageId: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={message.senderAvatar} />
              <AvatarFallback>{message.senderName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{message.senderName}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </span>
          </div>
        )}
        
        <div
          className={`rounded-lg px-3 py-2 ${
            isOwn
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
        >
          {message.replyTo && (
            <div className="mb-2 p-2 rounded bg-black/10 text-sm opacity-75">
              <p className="truncate">Replying to previous message</p>
            </div>
          )}
          
          <p className="text-sm">{message.content}</p>
          
          {message.edited && (
            <span className="text-xs opacity-75 ml-2">(edited)</span>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <Badge
                key={emoji}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => onReact(message.id, emoji)}
              >
                {emoji} {userIds.length}
              </Badge>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {showActions && (
          <SlideIn direction="up" className="mt-2">
            <div className="flex items-center space-x-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Smile className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex space-x-1">
                    {EMOJI_REACTIONS.map(emoji => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onReact(message.id, emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onReply(message)}
              >
                <Reply className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onThread(message.id)}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>
          </SlideIn>
        )}
      </div>
    </div>
  )
}
