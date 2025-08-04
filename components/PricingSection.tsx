"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Star } from 'lucide-react'

interface PricingPlan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  color: string
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    period: "month",
    description: "Perfect for small clubs getting started",
    features: [
      "Up to 50 members",
      "Basic scheduling",
      "Team messaging",
      "Mobile app access",
      "Email support"
    ],
    color: "from-blue-500 to-blue-600"
  },
  {
    name: "Professional",
    price: "$29",
    period: "month",
    description: "Ideal for growing sports organizations",
    features: [
      "Up to 200 members",
      "Advanced scheduling",
      "Tournament management",
      "Analytics dashboard",
      "Priority support",
      "Custom branding",
      "API access"
    ],
    popular: true,
    color: "from-green-500 to-green-600"
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "month",
    description: "For large clubs and organizations",
    features: [
      "Unlimited members",
      "Advanced analytics",
      "Custom integrations",
      "Dedicated support",
      "White-label options",
      "Advanced security",
      "Custom features"
    ],
    color: "from-purple-500 to-purple-600"
  }
]

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const getPrice = (basePrice: string) => {
    if (basePrice === "$0") return "$0"
    const price = parseInt(basePrice.replace('$', ''))
    const yearlyPrice = billingPeriod === 'yearly' ? Math.round(price * 10) : price
    return `$${yearlyPrice}`
  }

  const getPeriod = () => {
    return billingPeriod === 'yearly' ? 'year' : 'month'
  }

  return (
    <section className="w-full flex justify-center mt-16 px-2">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl py-12 px-8 flex flex-col items-center text-center border border-gray-100">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Simple, Transparent Pricing</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Choose the perfect plan for your sports organization
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center space-x-4 mb-8">
          <span className={`text-sm ${billingPeriod === 'monthly' ? 'text-gray-800' : 'text-gray-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{
              backgroundColor: billingPeriod === 'yearly' ? '#10b981' : '#d1d5db'
            }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${billingPeriod === 'yearly' ? 'text-gray-800' : 'text-gray-500'}`}>
            Yearly
            <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Save 20%
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={plan.name}
              className={`relative overflow-hidden transition-all duration-300 magnetic-hover ${
                plan.popular ? 'ring-2 ring-green-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-2 text-sm font-medium">
                  <Star className="inline w-4 h-4 mr-1" />
                  Most Popular
                </div>
              )}
              
              <CardHeader className={`pt-8 ${plan.popular ? 'mt-8' : ''}`}>
                <CardTitle className="text-2xl font-bold text-gray-800">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-800">{getPrice(plan.price)}</span>
                  <span className="text-gray-500">/{getPeriod()}</span>
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full mt-6 bg-gradient-to-r ${plan.color} hover:from-blue-700 hover:to-green-700 text-white font-medium py-3 btn-enhanced button-glow magnetic-hover`}
                >
                  {plan.name === "Starter" ? "Get Started Free" : "Choose Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">All plans include a 14-day free trial</p>
          <p className="text-sm text-gray-500">
            Need a custom plan? <a href="#" className="text-blue-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </section>
  )
} 