"use client"

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSlow, setIsSlow] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Connection Restored",
        description: "You're back online!",
        variant: "default"
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive"
      })
    }

    // Check initial status
    setIsOnline(navigator.onLine)

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Monitor connection speed (basic implementation)
    const checkConnectionSpeed = async () => {
      try {
        const startTime = performance.now()
        await fetch('/api/ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        const endTime = performance.now()
        const duration = endTime - startTime
        
        setIsSlow(duration > 3000) // Consider slow if > 3 seconds
      } catch (error) {
        // Ignore ping errors
      }
    }

    // Check speed every 30 seconds
    const speedInterval = setInterval(checkConnectionSpeed, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(speedInterval)
    }
  }, [toast])

  return {
    isOnline,
    isSlow,
    isOffline: !isOnline
  }
}

// Network-aware fetch wrapper
export async function networkFetch(
  url: string, 
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('HTTP 4')) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }

  throw lastError || new Error('Network request failed')
} 