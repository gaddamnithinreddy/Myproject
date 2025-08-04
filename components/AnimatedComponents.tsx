"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

// Page transition variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98
  }
}

export const pageTransition = {
  type: "tween" as const,
  ease: "anticipate" as const,
  duration: 0.4
}

// Card animation variants
export const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  hover: {
    y: -5,
    scale: 1.02
  }
}

// List item animation variants
export const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const listItemVariants = {
  hidden: {
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0
  }
}

// Modal animation variants
export const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50
  }
}

// Overlay animation variants
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}

// Button animation variants
export const buttonVariants = {
  rest: {
    scale: 1
  },
  hover: {
    scale: 1.05
  },
  tap: {
    scale: 0.95
  }
}

// Loading spinner animation
export const spinnerVariants = {
  animate: {
    rotate: 360
  }
}

// Fade in animation
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1
  }
}

// Slide up animation
export const slideUpVariants = {
  hidden: {
    opacity: 0,
    y: 30
  },
  visible: {
    opacity: 1,
    y: 0
  }
}

// Scale in animation
export const scaleInVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8
  },
  visible: {
    opacity: 1,
    scale: 1
  }
}

// Animated Page Component
export function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

// Animated Card Component
export function AnimatedCard({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={className}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

// Animated List Component
export function AnimatedList({ 
  children, 
  className = "" 
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated List Item Component
export function AnimatedListItem({ 
  children, 
  className = "" 
}: { 
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={listItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Button Component
export function AnimatedButton({ 
  children, 
  className = "",
  onClick,
  disabled = false,
  type = "button"
}: { 
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}) {
  return (
    <motion.button
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={className}
    >
      {children}
    </motion.button>
  )
}

// Animated Loading Spinner
export function AnimatedSpinner({ className = "" }: { className?: string }) {
  return (
    <motion.div
      variants={spinnerVariants}
      animate="animate"
      className={className}
    >
      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full" />
    </motion.div>
  )
}

// Animated Modal Component
export function AnimatedModal({ 
  children, 
  isOpen, 
  onClose,
  className = ""
}: { 
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  className?: string
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Animated Fade In Component
export function FadeIn({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className={className}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

// Animated Slide Up Component
export function SlideUp({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={slideUpVariants}
      initial="hidden"
      animate="visible"
      className={className}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

// Animated Scale In Component
export function ScaleIn({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      variants={scaleInVariants}
      initial="hidden"
      animate="visible"
      className={className}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

// Staggered Animation Container
export function StaggeredContainer({ 
  children, 
  className = "",
  staggerDelay = 0.1 
}: { 
  children: ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
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

// Staggered Item
export function StaggeredItem({ 
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
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.3
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Counter Component
export function AnimatedCounter({ 
  value, 
  className = "" 
}: { 
  value: number
  className?: string
}) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {value}
    </motion.span>
  )
}

// Animated Progress Bar
export function AnimatedProgress({ 
  value, 
  max = 100, 
  className = "" 
}: { 
  value: number
  max?: number
  className?: string
}) {
  const percentage = (value / max) * 100

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <motion.div
        className="bg-blue-600 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  )
}

// Animated Notification
export function AnimatedNotification({ 
  children, 
  isVisible, 
  className = "" 
}: { 
  children: ReactNode
  isVisible: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
} 