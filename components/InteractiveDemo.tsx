"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Pause, RotateCcw, Users, Calendar, Trophy, MessageCircle } from 'lucide-react'

interface DemoStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const demoSteps: DemoStep[] = [
  {
    id: 1,
    title: "Create Your Club",
    description: "Set up your sports club profile in minutes with our intuitive onboarding process.",
    icon: <Users className="w-8 h-8" />,
    color: "from-blue-500 to-blue-600"
  },
  {
    id: 2,
    title: "Schedule Events",
    description: "Plan practices, games, and tournaments with our smart scheduling system.",
    icon: <Calendar className="w-8 h-8" />,
    color: "from-green-500 to-green-600"
  },
  {
    id: 3,
    title: "Manage Tournaments",
    description: "Organize competitions with automated brackets and real-time updates.",
    icon: <Trophy className="w-8 h-8" />,
    color: "from-yellow-500 to-yellow-600"
  },
  {
    id: 4,
    title: "Team Communication",
    description: "Keep everyone connected with instant messaging and announcements.",
    icon: <MessageCircle className="w-8 h-8" />,
    color: "from-purple-500 to-purple-600"
  }
]

export default function InteractiveDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % demoSteps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + demoSteps.length) % demoSteps.length)
  }

  const resetDemo = () => {
    setCurrentStep(0)
    setIsPlaying(false)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <section className="w-full flex justify-center mt-16 px-2">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl py-12 px-8 flex flex-col items-center text-center border border-gray-100">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Try Our Platform</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Experience the power of KeyConnect with our interactive demo
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-center">
          {/* Demo Display */}
          <div className="relative">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="text-center text-gray-800">
                  {demoSteps[currentStep].title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex justify-center mb-6">
                  <div className={`bg-gradient-to-r ${demoSteps[currentStep].color} text-white rounded-full p-6`}>
                    {demoSteps[currentStep].icon}
                  </div>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {demoSteps[currentStep].description}
                </p>
                
                {/* Progress Indicators */}
                <div className="flex justify-center mt-6 space-x-2">
                  {demoSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentStep 
                          ? 'bg-gradient-to-r from-blue-600 to-green-600 scale-125' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={prevStep}
                variant="outline"
                size="lg"
                className="magnetic-hover"
              >
                Previous
              </Button>
              <Button
                onClick={togglePlay}
                size="lg"
                className={`bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 magnetic-hover ${
                  isPlaying ? 'animate-pulse' : ''
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                onClick={nextStep}
                variant="outline"
                size="lg"
                className="magnetic-hover"
              >
                Next
              </Button>
            </div>
            
            <Button
              onClick={resetDemo}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Demo
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Step {currentStep + 1} of {demoSteps.length}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-3 px-8 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 btn-enhanced button-glow magnetic-hover"
          >
            Start Free Trial
          </Button>
        </div>
      </div>
    </section>
  )
} 