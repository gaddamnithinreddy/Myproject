"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

// Fade in animation
export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.3,
  className = ""
}: { 
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Slide in from direction
export function SlideIn({ 
  children, 
  direction = 'up',
  delay = 0,
  duration = 0.3,
  distance = 20,
  className = ""
}: { 
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  distance?: number
  className?: string
}) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance }
      case 'down': return { y: -distance }
      case 'left': return { x: distance }
      case 'right': return { x: -distance }
      default: return { y: distance }
    }
  }

  return (
    <motion.div
      initial={{ ...getInitialPosition(), opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={{ ...getInitialPosition(), opacity: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale animation
export function ScaleIn({ 
  children, 
  delay = 0,
  duration = 0.3,
  scale = 0.95,
  className = ""
}: { 
  children: ReactNode
  delay?: number
  duration?: number
  scale?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ scale, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale, opacity: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger children animation
export function StaggerChildren({ 
  children, 
  staggerDelay = 0.1,
  className = ""
}: { 
  children: ReactNode
  staggerDelay?: number
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Individual stagger item
export function StaggerItem({ 
  children,
  className = ""
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Bounce animation
export function Bounce({ 
  children,
  trigger = false,
  className = ""
}: { 
  children: ReactNode
  trigger?: boolean
  className?: string
}) {
  return (
    <motion.div
      animate={trigger ? { 
        scale: [1, 1.1, 1],
        transition: { duration: 0.3, ease: "easeInOut" }
      } : {}}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Shake animation
export function Shake({ 
  children,
  trigger = false,
  className = ""
}: { 
  children: ReactNode
  trigger?: boolean
  className?: string
}) {
  return (
    <motion.div
      animate={trigger ? { 
        x: [-5, 5, -5, 5, 0],
        transition: { duration: 0.4, ease: "easeInOut" }
      } : {}}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Pulse animation
export function Pulse({ 
  children,
  className = ""
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hover lift effect
export function HoverLift({ 
  children,
  liftAmount = 5,
  className = ""
}: { 
  children: ReactNode
  liftAmount?: number
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ 
        y: -liftAmount,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Loading dots animation
export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-current rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// Progress bar animation
export function AnimatedProgress({ 
  value, 
  max = 100,
  className = "",
  barClassName = ""
}: { 
  value: number
  max?: number
  className?: string
  barClassName?: string
}) {
  const percentage = (value / max) * 100

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}>
      <motion.div
        className={`h-full bg-blue-600 rounded-full ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  )
}

// Count up animation
export function CountUp({ 
  from = 0, 
  to, 
  duration = 1,
  className = ""
}: { 
  from?: number
  to: number
  duration?: number
  className?: string
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ textContent: from }}
        animate={{ textContent: to }}
        transition={{ duration, ease: "easeOut" }}
        onUpdate={(latest) => {
          if (typeof latest.textContent === 'number') {
            return Math.round(latest.textContent).toString()
          }
        }}
      />
    </motion.span>
  )
}

// Page transition wrapper
export function PageTransition({ 
  children,
  className = ""
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Modal/Dialog animation wrapper
export function ModalTransition({ 
  children,
  isOpen,
  className = ""
}: { 
  children: ReactNode
  isOpen: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Toast notification animation
export function ToastTransition({ 
  children,
  className = ""
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
