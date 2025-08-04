"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const hasConsented = localStorage.getItem('cookie-consent')
    if (!hasConsented) {
      setShowBanner(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true')
    setShowBanner(false)
  }

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'false')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="cookie-banner show">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-700">
            We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Learn more</a>
          </p>
        </div>
        <div className="flex items-center space-x-4 ml-4">
          <Button
            onClick={declineCookies}
            variant="outline"
            size="sm"
            className="text-gray-600 hover:text-gray-800"
          >
            Decline
          </Button>
          <Button
            onClick={acceptCookies}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            Accept
          </Button>
          <button
            onClick={declineCookies}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close cookie banner"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
} 