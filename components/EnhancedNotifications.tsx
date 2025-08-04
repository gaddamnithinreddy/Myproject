"use client"

import { useState, useEffect } from 'react'
import { Bell, X, Check, Clock, Settings, Filter, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  snoozedUntil?: Date
  createdAt: Date
  priority: 'low' | 'medium' | 'high'
  category: 'team' | 'tournament' | 'schedule' | 'chat' | 'system' | 'payment'
  actionUrl?: string
}

interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  digest: 'none' | 'daily' | 'weekly'
  categories: Record<string, boolean>
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export default function EnhancedNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    inApp: true,
    digest: 'daily',
    categories: {
      team: true,
      tournament: true,
      schedule: true,
      chat: true,
      system: true,
      payment: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  })
  const [filter, setFilter] = useState<'all' | 'unread' | 'team' | 'tournament' | 'schedule' | 'chat'>('all')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load notifications
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        snoozedUntil: doc.data().snoozedUntil?.toDate()
      })) as Notification[]
      
      setNotifications(notifs)
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  // Load preferences
  useEffect(() => {
    if (!user) return

    const loadPreferences = async () => {
      try {
        const saved = localStorage.getItem(`notification_prefs_${user.uid}`)
        if (saved) {
          setPreferences(JSON.parse(saved))
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error)
      }
    }

    loadPreferences()
  }, [user])

  // Save preferences
  const savePreferences = (newPrefs: NotificationPreferences) => {
    setPreferences(newPrefs)
    if (user) {
      localStorage.setItem(`notification_prefs_${user.uid}`, JSON.stringify(newPrefs))
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false
    if (filter !== 'all' && notification.category !== filter) return false
    if (notification.snoozedUntil && notification.snoozedUntil > new Date()) return false
    return true
  })

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = notification.createdAt.toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read)
    
    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'notifications', notification.id), {
            read: true,
            readAt: Timestamp.now()
          })
        )
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Snooze notification
  const snoozeNotification = async (notificationId: string, duration: number) => {
    const snoozedUntil = new Date(Date.now() + duration * 60 * 1000) // duration in minutes
    
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        snoozedUntil: Timestamp.fromDate(snoozedUntil)
      })
    } catch (error) {
      console.error('Error snoozing notification:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Archive old notifications
  const archiveOldNotifications = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const oldNotifications = notifications.filter(n => n.createdAt < thirtyDaysAgo)
    
    try {
      await Promise.all(
        oldNotifications.map(notification =>
          deleteDoc(doc(db, 'notifications', notification.id))
        )
      )
    } catch (error) {
      console.error('Error archiving notifications:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read && (!n.snoozedUntil || n.snoozedUntil <= new Date())).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_invite': return '👥'
      case 'tournament_registration': return '🏆'
      case 'schedule_update': return '📅'
      case 'chat_message': return '💬'
      case 'payment': return '💳'
      case 'system': return '⚙️'
      default: return '📢'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-blue-500'
      default: return 'border-l-gray-300'
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount}</Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={(value: any) => setFilter(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="team">Teams</TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">
                Loading notifications...
              </div>
            ) : Object.keys(groupedNotifications).length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications</p>
                <p className="text-sm mt-2">You're all caught up!</p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
                  <div key={date} className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 px-2">
                      {new Date(date).toLocaleDateString() === new Date().toLocaleDateString() 
                        ? 'Today' 
                        : new Date(date).toLocaleDateString()}
                    </h4>
                    
                    {dayNotifications.map((notification) => (
                      <Card 
                        key={notification.id} 
                        className={`mb-2 cursor-pointer transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                          !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                        }`}
                        onClick={() => {
                          if (!notification.read) markAsRead(notification.id)
                          if (notification.actionUrl) {
                            window.location.href = notification.actionUrl
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                <h5 className="font-medium text-sm">{notification.title}</h5>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      snoozeNotification(notification.id, 60) // 1 hour
                                    }}
                                  >
                                    <Clock className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteNotification(notification.id)
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 10 && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={archiveOldNotifications}
                className="w-full"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Old Notifications
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Delivery Methods */}
            <div>
              <h4 className="font-medium mb-3">Delivery Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">In-app notifications</label>
                  <Switch
                    checked={preferences.inApp}
                    onCheckedChange={(checked) => 
                      savePreferences({ ...preferences, inApp: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Email notifications</label>
                  <Switch
                    checked={preferences.email}
                    onCheckedChange={(checked) => 
                      savePreferences({ ...preferences, email: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Push notifications</label>
                  <Switch
                    checked={preferences.push}
                    onCheckedChange={(checked) => 
                      savePreferences({ ...preferences, push: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Digest Settings */}
            <div>
              <h4 className="font-medium mb-3">Email Digest</h4>
              <Select 
                value={preferences.digest} 
                onValueChange={(value: any) => 
                  savePreferences({ ...preferences, digest: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No digest</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-medium mb-3">Categories</h4>
              <div className="space-y-3">
                {Object.entries(preferences.categories).map(([category, enabled]) => (
                  <div key={category} className="flex items-center justify-between">
                    <label className="text-sm capitalize">{category}</label>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => 
                        savePreferences({ 
                          ...preferences, 
                          categories: { ...preferences.categories, [category]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h4 className="font-medium mb-3">Quiet Hours</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Enable quiet hours</label>
                  <Switch
                    checked={preferences.quietHours.enabled}
                    onCheckedChange={(checked) => 
                      savePreferences({ 
                        ...preferences, 
                        quietHours: { ...preferences.quietHours, enabled: checked }
                      })
                    }
                  />
                </div>
                {preferences.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm block mb-1">Start time</label>
                      <input
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={(e) => 
                          savePreferences({ 
                            ...preferences, 
                            quietHours: { ...preferences.quietHours, start: e.target.value }
                          })
                        }
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm block mb-1">End time</label>
                      <input
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={(e) => 
                          savePreferences({ 
                            ...preferences, 
                            quietHours: { ...preferences.quietHours, end: e.target.value }
                          })
                        }
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
