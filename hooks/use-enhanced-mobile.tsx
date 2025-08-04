"use client"

import { useState, useEffect } from 'react'

interface MobileCapabilities {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  hasTouch: boolean
  supportsGestures: boolean
  isOnline: boolean
  deviceType: 'mobile' | 'tablet' | 'desktop'
  orientation: 'portrait' | 'landscape'
  screenSize: {
    width: number
    height: number
  }
}

export function useEnhancedMobile(): MobileCapabilities {
  const [capabilities, setCapabilities] = useState<MobileCapabilities>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    supportsGestures: false,
    isOnline: true,
    deviceType: 'desktop',
    orientation: 'landscape',
    screenSize: { width: 1920, height: 1080 }
  })

  useEffect(() => {
    const updateCapabilities = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const orientation = height > width ? 'portrait' : 'landscape'

      setCapabilities({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        supportsGestures: hasTouch && 'GestureEvent' in window,
        isOnline: navigator.onLine,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        orientation,
        screenSize: { width, height }
      })
    }

    // Initial check
    updateCapabilities()

    // Event listeners
    window.addEventListener('resize', updateCapabilities)
    window.addEventListener('orientationchange', updateCapabilities)
    window.addEventListener('online', updateCapabilities)
    window.addEventListener('offline', updateCapabilities)

    return () => {
      window.removeEventListener('resize', updateCapabilities)
      window.removeEventListener('orientationchange', updateCapabilities)
      window.removeEventListener('online', updateCapabilities)
      window.removeEventListener('offline', updateCapabilities)
    }
  }, [])

  return capabilities
}

// Touch gesture hook
export function useGestures() {
  const [gesture, setGesture] = useState<{
    type: 'swipe' | 'pinch' | 'tap' | null
    direction?: 'left' | 'right' | 'up' | 'down'
    distance?: number
  }>({ type: null })

  useEffect(() => {
    let startX = 0
    let startY = 0
    let startTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        startTime = Date.now()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX
        const endY = e.changedTouches[0].clientY
        const endTime = Date.now()
        
        const deltaX = endX - startX
        const deltaY = endY - startY
        const deltaTime = endTime - startTime
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        // Tap detection
        if (distance < 10 && deltaTime < 300) {
          setGesture({ type: 'tap' })
          return
        }

        // Swipe detection
        if (distance > 50 && deltaTime < 500) {
          const direction = Math.abs(deltaX) > Math.abs(deltaY)
            ? (deltaX > 0 ? 'right' : 'left')
            : (deltaY > 0 ? 'down' : 'up')
          
          setGesture({ type: 'swipe', direction, distance })
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return gesture
}
