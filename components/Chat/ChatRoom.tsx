"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Video, 
  Smile, 
  MoreVertical,
  Reply,
  Edit,
  Trash2,
  Download
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { chatService, type Message, type ChatRoom } from '@/lib/chatService'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatRoomProps {
  chatRoom: ChatRoom
  onBack?: () => void
}

export default function ChatRoom({ chatRoom, onBack }: ChatRoomProps) {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!chatRoom.id) return

    // Subscribe to messages
    const unsubscribe = chatService.subscribeToMessages(chatRoom.id, (newMessages) => {
      setMessages(newMessages)
      scrollToBottom()
    })

    // Mark chat as read when component mounts
    if (user?.uid) {
      chatService.markChatAsRead(chatRoom.id, user.uid)
    }

    return () => unsubscribe()
  }, [chatRoom.id, user?.uid])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !userProfile) return

    setLoading(true)
    try {
      if (editingMessage) {
        await chatService.editMessage(editingMessage.id, newMessage)
        setEditingMessage(null)
      } else {
        await chatService.sendMessage(
          chatRoom.id,
          user.uid,
          `${userProfile.firstName} ${userProfile.lastName}`,
          newMessage,
          userProfile.profilePicture,
          replyTo?.id
        )
        setReplyTo(null)
      }
      setNewMessage('')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user || !userProfile) return

    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'file'

    setLoading(true)
    try {
      await chatService.sendMediaMessage(
        chatRoom.id,
        user.uid,
        `${userProfile.firstName} ${userProfile.lastName}`,
        file,
        fileType,
        userProfile.profilePicture
      )
      toast({
        title: "Success",
        description: "File uploaded successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date()
    const messageDate = new Date(timestamp)
    
    if (now.toDateString() === messageDate.toDateString()) {
      return format(messageDate, 'HH:mm')
    } else {
      return format(messageDate, 'MMM dd, HH:mm')
    }
  }

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.senderId === user?.uid
    const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId
    const isConsecutive = index > 0 && messages[index - 1].senderId === message.senderId

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
      >
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
          {!isOwn && showAvatar && (
            <Avatar className="w-8 h-8 mr-2">
              <AvatarImage src={message.senderAvatar} />
              <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          {!isOwn && !showAvatar && <div className="w-10" />}
          
          <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
            {showAvatar && !isOwn && (
              <span className="text-xs text-gray-500 px-2">{message.senderName}</span>
            )}
            
            {message.replyTo && (
              <div className="text-xs text-gray-400 px-3 py-1 bg-gray-100 rounded border-l-2 border-blue-400">
                Reply to previous message
              </div>
            )}
            
            <div
              className={`px-3 py-2 rounded-lg max-w-full break-words ${
                isOwn 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.type === 'text' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : message.type === 'image' ? (
                <div className="space-y-2">
                  <img 
                    src={message.mediaUrl} 
                    alt={message.fileName}
                    className="max-w-full h-auto rounded cursor-pointer"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                  />
                  {message.fileName && (
                    <p className="text-xs opacity-75">{message.fileName}</p>
                  )}
                </div>
              ) : message.type === 'video' ? (
                <div className="space-y-2">
                  <video 
                    src={message.mediaUrl} 
                    controls
                    className="max-w-full h-auto rounded"
                  />
                  {message.fileName && (
                    <p className="text-xs opacity-75">{message.fileName}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4" />
                  <div>
                    <p className="font-medium">{message.fileName}</p>
                    {message.fileSize && (
                      <p className="text-xs opacity-75">
                        {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {message.edited && (
                <p className="text-xs opacity-60 mt-1">(edited)</p>
              )}
            </div>
            
            <div className={`flex items-center space-x-2 text-xs text-gray-400 px-1 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <span>{formatMessageTime(message.timestamp)}</span>
              {isOwn && (
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setEditingMessage(message)
                      setNewMessage(message.content)
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setReplyTo(message)}
                  >
                    <Reply className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                ←
              </Button>
            )}
            <div>
              <CardTitle className="text-lg">{chatRoom.name}</CardTitle>
              <p className="text-sm text-gray-500">
                {chatRoom.participants.length} participants
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1 pb-4">
            <AnimatePresence>
              {messages.map((message, index) => renderMessage(message, index))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply/Edit indicator */}
        {(replyTo || editingMessage) && (
          <div className="px-4 py-2 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {editingMessage ? (
                  <span>Editing message</span>
                ) : (
                  <span>Replying to {replyTo?.senderName}</span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyTo(null)
                  setEditingMessage(null)
                  setNewMessage('')
                }}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="p-4 border-t">
          <div className="flex items-end space-x-2">
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleFileUpload(file)
                  }
                  input.click()
                }}
                disabled={loading}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'video/*'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleFileUpload(file)
                  }
                  input.click()
                }}
                disabled={loading}
              >
                <Video className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                disabled={loading}
                className="resize-none"
              />
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || loading}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
        />
      </CardContent>
    </Card>
  )
}
