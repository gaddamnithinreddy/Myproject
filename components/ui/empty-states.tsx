"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Users, 
  Calendar, 
  Trophy, 
  MessageSquare, 
  Video, 
  Search,
  Plus,
  UserPlus,
  CalendarPlus,
  TrophyIcon,
  MessageCircle,
  VideoIcon,
  FileX,
  Wifi,
  WifiOff
} from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  className?: string
}

export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{description}</p>
        {action && (
          <Button 
            onClick={action.onClick}
            variant={action.variant || "default"}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Predefined empty states for common scenarios
export function NoTeamsEmpty({ onCreateTeam }: { onCreateTeam: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title="No teams yet"
      description="Create your first team to start managing players, schedules, and tournaments."
      action={{
        label: "Create Team",
        onClick: onCreateTeam
      }}
    />
  )
}

export function NoSchedulesEmpty({ onCreateSchedule }: { onCreateSchedule: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="h-8 w-8 text-gray-400" />}
      title="No events scheduled"
      description="Schedule your first practice or game to keep your team organized and informed."
      action={{
        label: "Schedule Event",
        onClick: onCreateSchedule
      }}
    />
  )
}

export function NoTournamentsEmpty({ onCreateTournament }: { onCreateTournament: () => void }) {
  return (
    <EmptyState
      icon={<Trophy className="h-8 w-8 text-gray-400" />}
      title="No tournaments found"
      description="Create or join tournaments to compete with other teams and showcase your skills."
      action={{
        label: "Create Tournament",
        onClick: onCreateTournament
      }}
    />
  )
}

export function NoChatMessagesEmpty() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-8 w-8 text-gray-400" />}
      title="No messages yet"
      description="Start a conversation with your team members to coordinate and stay connected."
    />
  )
}

export function NoVideosEmpty({ onUploadVideo }: { onUploadVideo: () => void }) {
  return (
    <EmptyState
      icon={<Video className="h-8 w-8 text-gray-400" />}
      title="No videos uploaded"
      description="Upload game footage, training sessions, or highlights to share with your team."
      action={{
        label: "Upload Video",
        onClick: onUploadVideo
      }}
    />
  )
}

export function NoSearchResultsEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-gray-400" />}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try different keywords or check your spelling.`}
    />
  )
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      icon={<MessageCircle className="h-8 w-8 text-gray-400" />}
      title="All caught up!"
      description="You don't have any new notifications. Check back later for updates from your teams and tournaments."
    />
  )
}

export function OfflineEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<WifiOff className="h-8 w-8 text-gray-400" />}
      title="You're offline"
      description="Check your internet connection and try again. Some features may not be available offline."
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry,
        variant: "outline"
      } : undefined}
    />
  )
}

export function ErrorEmpty({ onRetry, error }: { onRetry?: () => void; error?: string }) {
  return (
    <EmptyState
      icon={<FileX className="h-8 w-8 text-red-400" />}
      title="Something went wrong"
      description={error || "We encountered an error while loading this content. Please try again."}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry,
        variant: "outline"
      } : undefined}
    />
  )
}

export function LoadingEmpty() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Loading...</h3>
        <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch your data.</p>
      </CardContent>
    </Card>
  )
}

// Generic empty state for custom use cases
export function CustomEmpty({ 
  icon, 
  title, 
  description, 
  actions = [] 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
    icon?: React.ReactNode
  }>
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{description}</p>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {actions.map((action, index) => (
              <Button 
                key={index}
                onClick={action.onClick}
                variant={action.variant || "default"}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
