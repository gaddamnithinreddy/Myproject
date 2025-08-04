"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { 
  Check, 
  X, 
  Clock, 
  Users, 
  MessageSquare,
  Calendar,
  MapPin,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { rsvpService, type RSVP, type RSVPSummary, type Schedule } from '@/lib/rsvpService'
import { toast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface RSVPCardProps {
  schedule: Schedule
  showSummary?: boolean
  compact?: boolean
}

export default function RSVPCard({ schedule, showSummary = true, compact = false }: RSVPCardProps) {
  const { user, userProfile } = useAuth()
  const [userRSVP, setUserRSVP] = useState<RSVP | null>(null)
  const [rsvpSummary, setRSVPSummary] = useState<RSVPSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [deadlineStatus, setDeadlineStatus] = useState<{
    hasDeadline: boolean
    deadline?: Date
    isExpired: boolean
    hoursRemaining?: number
  }>({ hasDeadline: false, isExpired: false })

  useEffect(() => {
    if (!schedule.id || !user?.uid) return

    // Load user's RSVP
    loadUserRSVP()
    
    // Load RSVP summary if needed
    if (showSummary) {
      loadRSVPSummary()
    }

    // Load deadline status
    loadDeadlineStatus()
  }, [schedule.id, user?.uid, showSummary])

  const loadUserRSVP = async () => {
    if (!user?.uid) return
    
    try {
      const rsvp = await rsvpService.getUserRSVP(schedule.id, user.uid)
      setUserRSVP(rsvp)
      if (rsvp?.note) {
        setNote(rsvp.note)
      }
    } catch (error) {
      console.error('Error loading user RSVP:', error)
    }
  }

  const loadRSVPSummary = async () => {
    try {
      const summary = await rsvpService.getRSVPSummary(schedule.id)
      setRSVPSummary(summary)
    } catch (error) {
      console.error('Error loading RSVP summary:', error)
    }
  }

  const loadDeadlineStatus = async () => {
    try {
      const status = await rsvpService.getRSVPDeadlineStatus(schedule.id)
      setDeadlineStatus(status)
    } catch (error) {
      console.error('Error loading deadline status:', error)
    }
  }

  const handleRSVPResponse = async (response: 'yes' | 'no' | 'maybe') => {
    if (!user?.uid || !userProfile) return

    setLoading(true)
    try {
      await rsvpService.submitRSVP(
        schedule.id,
        user.uid,
        schedule.teamId,
        response,
        `${userProfile.firstName} ${userProfile.lastName}`,
        userProfile.profilePicture,
        note.trim() || undefined
      )

      // Reload data
      await loadUserRSVP()
      if (showSummary) {
        await loadRSVPSummary()
      }

      toast({
        title: "RSVP Updated",
        description: `Your response has been recorded as "${response}"`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update RSVP",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getResponseColor = (response: string) => {
    switch (response) {
      case 'yes':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'no':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'maybe':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getResponseIcon = (response: string) => {
    switch (response) {
      case 'yes':
        return <Check className="w-4 h-4" />
      case 'no':
        return <X className="w-4 h-4" />
      case 'maybe':
        return <Clock className="w-4 h-4" />
      default:
        return null
    }
  }

  const calculateAttendancePercentage = () => {
    if (!rsvpSummary || rsvpSummary.total === 0) return 0
    return Math.round((rsvpSummary.yes / rsvpSummary.total) * 100)
  }

  if (!schedule.rsvpEnabled) {
    return null
  }

  const isExpired = deadlineStatus.isExpired
  const canRespond = !isExpired && schedule.status !== 'cancelled'

  return (
    <Card className={`${compact ? 'p-4' : ''}`}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center space-x-2 ${compact ? 'text-base' : 'text-lg'}`}>
            <Users className="w-5 h-5" />
            <span>RSVP</span>
          </CardTitle>
          
          {deadlineStatus.hasDeadline && (
            <div className="flex items-center space-x-2">
              {isExpired ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Expired
                </Badge>
              ) : deadlineStatus.hoursRemaining && deadlineStatus.hoursRemaining < 24 ? (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {Math.round(deadlineStatus.hoursRemaining)}h left
                </Badge>
              ) : null}
            </div>
          )}
        </div>

        {deadlineStatus.hasDeadline && deadlineStatus.deadline && (
          <p className="text-sm text-gray-600">
            Deadline: {format(deadlineStatus.deadline, 'MMM dd, yyyy HH:mm')}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current User's Response */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Response:</span>
            {userRSVP && (
              <Badge className={getResponseColor(userRSVP.response)}>
                {getResponseIcon(userRSVP.response)}
                <span className="ml-1 capitalize">{userRSVP.response}</span>
              </Badge>
            )}
          </div>

          {canRespond && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={userRSVP?.response === 'yes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRSVPResponse('yes')}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Yes</span>
              </Button>
              <Button
                variant={userRSVP?.response === 'maybe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRSVPResponse('maybe')}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <Clock className="w-4 h-4" />
                <span>Maybe</span>
              </Button>
              <Button
                variant={userRSVP?.response === 'no' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRSVPResponse('no')}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>No</span>
              </Button>
            </div>
          )}

          {isExpired && !userRSVP && (
            <div className="text-center py-2 text-gray-500 text-sm">
              RSVP deadline has passed
            </div>
          )}

          {/* Note Section */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNote(!showNote)}
              className="text-sm text-gray-600 p-0 h-auto"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {userRSVP?.note ? 'Edit note' : 'Add note'}
            </Button>

            <AnimatePresence>
              {showNote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Textarea
                    placeholder="Add a note (optional)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {userRSVP?.note && !showNote && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <strong>Your note:</strong> {userRSVP.note}
              </div>
            )}
          </div>
        </div>

        {/* RSVP Summary */}
        {showSummary && rsvpSummary && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Team Response</span>
              <span className="text-sm text-gray-600">
                {rsvpSummary.total} responses
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Attendance Rate</span>
                <span>{calculateAttendancePercentage()}%</span>
              </div>
              <Progress value={calculateAttendancePercentage()} className="h-2" />
            </div>

            {/* Response Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-green-600">
                  {rsvpSummary.yes}
                </div>
                <div className="text-xs text-gray-600">Yes</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-yellow-600">
                  {rsvpSummary.maybe}
                </div>
                <div className="text-xs text-gray-600">Maybe</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-red-600">
                  {rsvpSummary.no}
                </div>
                <div className="text-xs text-gray-600">No</div>
              </div>
            </div>

            {/* Recent Responses */}
            {!compact && rsvpSummary.responses.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Recent Responses</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {rsvpSummary.responses.slice(0, 5).map((response) => (
                    <div key={response.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={response.userAvatar} />
                          <AvatarFallback className="text-xs">
                            {response.userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{response.userName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getResponseColor(response.response)}`}
                        >
                          {getResponseIcon(response.response)}
                          <span className="ml-1 capitalize">{response.response}</span>
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(response.responseAt, 'MMM dd')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
