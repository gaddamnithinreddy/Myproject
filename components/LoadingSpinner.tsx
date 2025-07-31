"use client"

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export default function LoadingSpinner({ 
  size = 'md', 
  className, 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn(
      "flex flex-col items-center justify-center",
      fullScreen && "min-h-screen",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-primary",
        sizeClasses[size]
      )} />
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )

  return spinner
}

// Full screen loading component
export function FullScreenLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size="xl" text={text} />
    </div>
  )
}

// Inline loading component
export function InlineLoader({ size = 'sm', text }: { size?: 'sm' | 'md' | 'lg', text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
} 