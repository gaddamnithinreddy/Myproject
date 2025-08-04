"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Eye, Type, Contrast, Keyboard, Volume2 } from 'lucide-react'

interface AccessibilitySettings {
  fontSize: number
  highContrast: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  focusIndicators: boolean
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

// Accessibility Settings Hook
export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 16,
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    focusIndicators: true,
    colorBlindMode: 'none'
  })

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('accessibility_settings')
    if (saved) {
      const parsedSettings = JSON.parse(saved)
      setSettings(parsedSettings)
      applySettings(parsedSettings)
    }

    // Detect system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    
    if (prefersReducedMotion || prefersHighContrast) {
      const systemSettings = {
        ...settings,
        reducedMotion: prefersReducedMotion,
        highContrast: prefersHighContrast
      }
      setSettings(systemSettings)
      applySettings(systemSettings)
    }
  }, [])

  const applySettings = (newSettings: AccessibilitySettings) => {
    const root = document.documentElement

    // Font size
    root.style.setProperty('--base-font-size', `${newSettings.fontSize}px`)

    // High contrast
    if (newSettings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Reduced motion
    if (newSettings.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Focus indicators
    if (newSettings.focusIndicators) {
      root.classList.add('enhanced-focus')
    } else {
      root.classList.remove('enhanced-focus')
    }

    // Color blind mode
    root.className = root.className.replace(/colorblind-\w+/g, '')
    if (newSettings.colorBlindMode !== 'none') {
      root.classList.add(`colorblind-${newSettings.colorBlindMode}`)
    }
  }

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    applySettings(updated)
    localStorage.setItem('accessibility_settings', JSON.stringify(updated))
  }

  return { settings, updateSettings }
}

// Skip to Content Link
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50 focus:z-50"
    >
      Skip to main content
    </a>
  )
}

// Focus Trap Hook
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [isActive])

  return containerRef
}

// Keyboard Navigation Hook
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key handling
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
      }

      // Arrow key navigation for lists
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement?.getAttribute('role') === 'listitem') {
          e.preventDefault()
          const list = activeElement.closest('[role="list"]')
          if (list) {
            const items = Array.from(list.querySelectorAll('[role="listitem"]'))
            const currentIndex = items.indexOf(activeElement)
            
            if (e.key === 'ArrowDown' && currentIndex < items.length - 1) {
              (items[currentIndex + 1] as HTMLElement).focus()
            } else if (e.key === 'ArrowUp' && currentIndex > 0) {
              (items[currentIndex - 1] as HTMLElement).focus()
            }
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

// Screen Reader Announcements
export function useScreenReader() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  return { announce }
}

// Accessibility Settings Panel
export function AccessibilityPanel() {
  const { settings, updateSettings } = useAccessibility()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="Open accessibility settings"
      >
        <Eye className="h-4 w-4 mr-2" />
        Accessibility
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accessibility Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Font Size */}
            <div>
              <label className="text-sm font-medium mb-3 block flex items-center">
                <Type className="h-4 w-4 mr-2" />
                Font Size: {settings.fontSize}px
              </label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => updateSettings({ fontSize: value })}
                min={12}
                max={24}
                step={1}
                className="w-full"
              />
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center">
                <Contrast className="h-4 w-4 mr-2" />
                High Contrast Mode
              </label>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
              />
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Reduce Motion</label>
              <Switch
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
              />
            </div>

            {/* Keyboard Navigation */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center">
                <Keyboard className="h-4 w-4 mr-2" />
                Enhanced Keyboard Navigation
              </label>
              <Switch
                checked={settings.keyboardNavigation}
                onCheckedChange={(checked) => updateSettings({ keyboardNavigation: checked })}
              />
            </div>

            {/* Focus Indicators */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enhanced Focus Indicators</label>
              <Switch
                checked={settings.focusIndicators}
                onCheckedChange={(checked) => updateSettings({ focusIndicators: checked })}
              />
            </div>

            {/* Screen Reader */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                Screen Reader Optimizations
              </label>
              <Switch
                checked={settings.screenReader}
                onCheckedChange={(checked) => updateSettings({ screenReader: checked })}
              />
            </div>

            {/* Color Blind Mode */}
            <div>
              <label className="text-sm font-medium mb-2 block">Color Blind Support</label>
              <Select
                value={settings.colorBlindMode}
                onValueChange={(value: any) => updateSettings({ colorBlindMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="protanopia">Protanopia (Red-blind)</SelectItem>
                  <SelectItem value="deuteranopia">Deuteranopia (Green-blind)</SelectItem>
                  <SelectItem value="tritanopia">Tritanopia (Blue-blind)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Settings are automatically saved and will persist across sessions.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ARIA Live Region Component
export function LiveRegion({ 
  children, 
  priority = 'polite' 
}: { 
  children: React.ReactNode
  priority?: 'polite' | 'assertive' 
}) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  )
}

// Accessible Form Field Wrapper
export function AccessibleField({
  id,
  label,
  description,
  error,
  required = false,
  children
}: {
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  const describedBy = [
    description && `${id}-description`,
    error && `${id}-error`
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      {description && (
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <div>
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': error ? 'true' : undefined,
          'aria-required': required
        })}
      </div>
      
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
