"use client"

import { useState, useEffect } from 'react'
import { toast } from '@/hooks/use-toast'

interface ConnectionStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType: string
  lastOnline: Date | null
  retryAttempts: number
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'unknown',
    lastOnline: null,
    retryAttempts: 0
  })

  useEffect(() => {
    const updateConnectionStatus = () => {
      const isOnline = navigator.onLine
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      setStatus(prev => ({
        ...prev,
        isOnline,
        connectionType: connection?.effectiveType || 'unknown',
        isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
        lastOnline: isOnline ? new Date() : prev.lastOnline
      }))

      // Show toast notifications for connection changes
      if (!isOnline && prev.isOnline) {
        toast({
          title: "Connection Lost",
          description: "You're now offline. Some features may not work.",
          variant: "destructive"
        })
      } else if (isOnline && !prev.isOnline) {
        toast({
          title: "Connection Restored",
          description: "You're back online!"
        })
      }
    }

    // Initial check
    updateConnectionStatus()

    // Event listeners
    window.addEventListener('online', updateConnectionStatus)
    window.addEventListener('offline', updateConnectionStatus)

    // Connection change listener (if supported)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.addEventListener('change', updateConnectionStatus)
    }

    return () => {
      window.removeEventListener('online', updateConnectionStatus)
      window.removeEventListener('offline', updateConnectionStatus)
      if (connection) {
        connection.removeEventListener('change', updateConnectionStatus)
      }
    }
  }, [])

  const retry = () => {
    setStatus(prev => ({
      ...prev,
      retryAttempts: prev.retryAttempts + 1
    }))
  }

  return { ...status, retry }
}

// Connection Status Indicator Component
export function ConnectionStatusIndicator() {
  const { isOnline, isSlowConnection, connectionType } = useConnectionStatus()

  if (isOnline && !isSlowConnection) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
      !isOnline 
        ? 'bg-red-500 text-white' 
        : 'bg-yellow-500 text-black'
    }`}>
      {!isOnline 
        ? 'You are offline. Some features may not work.' 
        : `Slow connection detected (${connectionType}). Performance may be affected.`
      }
    </div>
  )
}
