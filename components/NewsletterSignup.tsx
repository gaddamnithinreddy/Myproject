"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Send, CheckCircle } from 'lucide-react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsSubscribed(true)
      setIsLoading(false)
      setEmail('')
    }, 2000)
  }

  if (isSubscribed) {
    return (
      <section className="w-full flex justify-center mt-16 px-2">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-3xl shadow-2xl w-full max-w-4xl py-12 px-8 flex flex-col items-center text-center border border-green-200">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Welcome to KeyConnect!</h2>
          <p className="text-xl text-gray-600 mb-6">
            You've successfully subscribed to our newsletter. We'll keep you updated with the latest features and sports management tips.
          </p>
          <Button
            onClick={() => setIsSubscribed(false)}
            variant="outline"
            className="magnetic-hover"
          >
            Subscribe Another Email
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full flex justify-center mt-16 px-2">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-3xl shadow-2xl w-full max-w-4xl py-12 px-8 flex flex-col items-center text-center border border-blue-200">
        <div className="mb-8">
          <Mail className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
            Stay Updated with KeyConnect
          </h2>
          <p className="text-xl text-gray-600 mb-6 max-w-2xl">
            Get the latest sports management tips, feature updates, and exclusive content delivered to your inbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <div className="relative">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-full"
              required
            />
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-4 px-8 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 btn-enhanced button-glow magnetic-hover"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Subscribing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5" />
                <span>Subscribe Now</span>
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 text-sm text-gray-500">
          <p>Join 10,000+ sports professionals</p>
          <p>No spam, unsubscribe at any time</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">Weekly</div>
            <div className="text-gray-600">Tips & Updates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">Monthly</div>
            <div className="text-gray-600">Feature Releases</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">Quarterly</div>
            <div className="text-gray-600">Industry Reports</div>
          </div>
        </div>
      </div>
    </section>
  )
} 