"use client"

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SkipForward, Volume2, VolumeX, Sun, Moon, Monitor } from 'lucide-react'

// Skip to main content link
export function SkipToMainContent() {
  const mainRef = useRef<HTMLElement>(null)

  const handleSkip = () => {
    mainRef.current?.focus()
    mainRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Button
        onClick={handleSkip}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
        variant="outline"
      >
        <SkipForward className="h-4 w-4 mr-2" />
        Skip to main content
      </Button>
      <main ref={mainRef} tabIndex={-1} />
    </>
  )
}

// Focus trap for modals
export function FocusTrap({ children, onEscape }: { children: React.ReactNode; onEscape?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)
  const lastFocusableRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length > 0) {
      firstFocusableRef.current = focusableElements[0] as HTMLElement
      lastFocusableRef.current = focusableElements[focusableElements.length - 1] as HTMLElement
      firstFocusableRef.current.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape()
        return
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableRef.current) {
            e.preventDefault()
            lastFocusableRef.current?.focus()
          }
        } else {
          if (document.activeElement === lastFocusableRef.current) {
            e.preventDefault()
            firstFocusableRef.current?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEscape])

  return <div ref={containerRef}>{children}</div>
}

// Screen reader announcements
export function ScreenReaderAnnouncement({ message }: { message: string }) {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (message) {
      setAnnouncement(message)
      const timer = setTimeout(() => setAnnouncement(''), 1000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// High contrast mode toggle
export function HighContrastToggle() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  const toggleHighContrast = () => {
    setIsHighContrast(!isHighContrast)
    document.documentElement.classList.toggle('high-contrast')
  }

  return (
    <Button
      onClick={toggleHighContrast}
      variant="outline"
      size="sm"
      aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
    >
      {isHighContrast ? 'Normal' : 'High Contrast'}
    </Button>
  )
}

// Font size controls
export function FontSizeControls() {
  const [fontSize, setFontSize] = useState(16)

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 24)
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}px`
  }

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 12)
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}px`
  }

  const resetFontSize = () => {
    setFontSize(16)
    document.documentElement.style.fontSize = '16px'
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={decreaseFontSize}
        variant="outline"
        size="sm"
        aria-label="Decrease font size"
        disabled={fontSize <= 12}
      >
        A-
      </Button>
      <span className="text-sm min-w-[2rem] text-center">{fontSize}px</span>
      <Button
        onClick={increaseFontSize}
        variant="outline"
        size="sm"
        aria-label="Increase font size"
        disabled={fontSize >= 24}
      >
        A+
      </Button>
      <Button
        onClick={resetFontSize}
        variant="outline"
        size="sm"
        aria-label="Reset font size"
      >
        Reset
      </Button>
    </div>
  )
}

// Reduced motion toggle
export function ReducedMotionToggle() {
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  const toggleReducedMotion = () => {
    setIsReducedMotion(!isReducedMotion)
    document.documentElement.classList.toggle('reduce-motion')
  }

  return (
    <Button
      onClick={toggleReducedMotion}
      variant="outline"
      size="sm"
      aria-label={`${isReducedMotion ? 'Enable' : 'Disable'} animations`}
    >
      {isReducedMotion ? 'Enable Animations' : 'Reduce Motion'}
    </Button>
  )
}

// Accessibility toolbar
export function AccessibilityToolbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "bg-background border rounded-lg shadow-lg transition-all duration-200",
        isOpen ? "p-4" : "p-2"
      )}>
        {isOpen && (
          <div className="space-y-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Accessibility</span>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                aria-label="Close accessibility toolbar"
              >
                ×
              </Button>
            </div>
            <div className="space-y-2">
              <FontSizeControls />
              <HighContrastToggle />
              <ReducedMotionToggle />
            </div>
          </div>
        )}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          aria-label={`${isOpen ? 'Close' : 'Open'} accessibility toolbar`}
          className="w-full"
        >
          {isOpen ? 'Close' : 'Accessibility'}
        </Button>
      </div>
    </div>
  )
}

// Keyboard navigation hook
export function useKeyboardNavigation<T>(
  items: T[],
  onSelect: (item: T) => void,
  initialIndex = 0
) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect(items[selectedIndex])
        break
      case 'Home':
        e.preventDefault()
        setSelectedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setSelectedIndex(items.length - 1)
        break
    }
  }

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown
  }
}

// ARIA live regions
export function LiveRegion({ 
  children, 
  type = 'polite' 
}: { 
  children: React.ReactNode
  type?: 'polite' | 'assertive' | 'off'
}) {
  return (
    <div
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  )
}

// Progress indicator
export function ProgressIndicator({ 
  current, 
  total, 
  label 
}: { 
  current: number
  total: number
  label: string
}) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{current} of {total}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="sr-only">{percentage}% complete</span>
    </div>
  )
}

// Status message component
export function StatusMessage({ 
  type, 
  message 
}: { 
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}) {
  const statusConfig = {
    success: { icon: '✓', className: 'text-green-600 bg-green-50 border-green-200' },
    error: { icon: '✗', className: 'text-red-600 bg-red-50 border-red-200' },
    info: { icon: 'ℹ', className: 'text-blue-600 bg-blue-50 border-blue-200' },
    warning: { icon: '⚠', className: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  }

  const config = statusConfig[type]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 p-3 border rounded-md",
        config.className
      )}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{message}</span>
    </div>
  )
} 