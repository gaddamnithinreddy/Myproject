"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Users, 
  Trophy,
  User,
  MoreVertical
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { chatService, type ChatRoom } from '@/lib/chatService'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'

interface ChatListProps {
  onChatSelect: (chatRoom: ChatRoom) => void
  selectedChatId?: string
}

export default function ChatList({ onChatSelect, selectedChatId }: ChatListProps) {
  const { user, userProfile } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [filteredChats, setFilteredChats] = useState<ChatRoom[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [newChatType, setNewChatType] = useState<'individual' | 'team' | 'tournament'>('individual')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user?.uid) return

    // Subscribe to user's chat rooms
    const unsubscribe = chatService.subscribeToUserChatRooms(user.uid, (rooms) => {
      setChatRooms(rooms)
      setFilteredChats(rooms)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    // Filter chats based on search query
    if (!searchQuery.trim()) {
      setFilteredChats(chatRooms)
    } else {
      const filtered = chatRooms.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredChats(filtered)
    }
  }, [searchQuery, chatRooms])

  const formatLastMessageTime = (timestamp: Date) => {
    const now = new Date()
    const messageDate = new Date(timestamp)
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'now'
    } else if (diffInHours < 24) {
      return format(messageDate, 'HH:mm')
    } else if (diffInHours < 168) { // 7 days
      return format(messageDate, 'EEE')
    } else {
      return format(messageDate, 'MMM dd')
    }
  }

  const getChatIcon = (chat: ChatRoom) => {
    switch (chat.type) {
      case 'team':
        return <Users className="w-5 h-5" />
      case 'tournament':
        return <Trophy className="w-5 h-5" />
      default:
        return <User className="w-5 h-5" />
    }
  }

  const getChatTypeColor = (type: string) => {
    switch (type) {
      case 'team':
        return 'bg-blue-100 text-blue-800'
      case 'tournament':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateNewChat = async (type: 'individual' | 'team' | 'tournament') => {
    // This would open a dialog to select participants/team/tournament
    // For now, we'll show a placeholder
    toast({
      title: "Feature Coming Soon",
      description: `Creating ${type} chats will be available soon!`
    })
    setShowNewChatDialog(false)
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
          </CardTitle>
          <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center justify-start space-x-3 h-12"
                    onClick={() => handleCreateNewChat('individual')}
                  >
                    <User className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Individual Chat</div>
                      <div className="text-sm text-gray-500">Chat with a specific person</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center justify-start space-x-3 h-12"
                    onClick={() => handleCreateNewChat('team')}
                  >
                    <Users className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Team Chat</div>
                      <div className="text-sm text-gray-500">Chat with your team members</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center justify-start space-x-3 h-12"
                    onClick={() => handleCreateNewChat('tournament')}
                  >
                    <Trophy className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Tournament Chat</div>
                      <div className="text-sm text-gray-500">Chat with tournament participants</div>
                    </div>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {filteredChats.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm">Start a new chat to begin messaging</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredChats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedChatId === chat.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                  onClick={() => onChatSelect(chat)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getChatTypeColor(chat.type)}`}>
                        {getChatIcon(chat)}
                      </div>
                      {chat.type === 'individual' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {chat.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatLastMessageTime(chat.lastMessage.timestamp)}
                            </span>
                          )}
                          {unreadCounts[chat.id] > 0 && (
                            <Badge variant="default" className="text-xs px-2 py-0.5">
                              {unreadCounts[chat.id]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {chat.lastMessage ? (
                            <span>
                              {chat.lastMessage.senderId === user?.uid ? 'You: ' : ''}
                              {chat.lastMessage.content}
                            </span>
                          ) : (
                            <span className="italic">No messages yet</span>
                          )}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {chat.type}
                        </Badge>
                      </div>
                      
                      {chat.participants.length > 2 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {chat.participants.length} participants
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
