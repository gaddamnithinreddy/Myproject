"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  MessageSquare,
  Video,
  Bell,
  User
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useEnhancedMobile } from '@/hooks/use-enhanced-mobile'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
  activeRoutes: string[]
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    label: 'Home',
    activeRoutes: ['/dashboard', '/']
  },
  {
    href: '/teams',
    icon: <Users className="w-5 h-5" />,
    label: 'Teams',
    activeRoutes: ['/teams']
  },
  {
    href: '/schedule',
    icon: <Calendar className="w-5 h-5" />,
    label: 'Schedule',
    activeRoutes: ['/schedule']
  },
  {
    href: '/tournaments',
    icon: <Trophy className="w-5 h-5" />,
    label: 'Tournaments',
    activeRoutes: ['/tournaments']
  },
  {
    href: '/chat',
    icon: <MessageSquare className="w-5 h-5" />,
    label: 'Chat',
    activeRoutes: ['/chat']
  }
]

export default function BottomNavigation() {
  const pathname = usePathname()
  const { isMobile } = useEnhancedMobile()
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Don't show bottom nav on desktop or auth pages
  if (!isMobile || pathname.startsWith('/auth')) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <nav className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = item.activeRoutes.some(route => 
            pathname === route || (route !== '/' && pathname.startsWith(route))
          )
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[60px] relative ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
                {unreadCounts[item.href] && unreadCounts[item.href] > 0 && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

// Hook to manage bottom navigation state
export function useBottomNavigation() {
  const { isMobile } = useEnhancedMobile()
  const pathname = usePathname()
  
  const shouldShowBottomNav = isMobile && !pathname.startsWith('/auth')
  const bottomNavHeight = shouldShowBottomNav ? 'pb-16' : ''
  
  return {
    shouldShowBottomNav,
    bottomNavHeight
  }
}
