"use client"

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
}

export default function LoadingSkeleton({ className = "", height = "h-4", width = "w-full" }: SkeletonProps) {
  return (
    <div className={`skeleton rounded ${height} ${width} ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center space-x-4 mb-4">
        <LoadingSkeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <LoadingSkeleton className="h-4 mb-2" />
          <LoadingSkeleton className="h-3 w-2/3" />
        </div>
      </div>
      <LoadingSkeleton className="h-4 mb-2" />
      <LoadingSkeleton className="h-4 mb-2" />
      <LoadingSkeleton className="h-4 w-3/4" />
    </div>
  )
}

export function FeatureCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <LoadingSkeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
      <LoadingSkeleton className="h-6 mb-2" />
      <LoadingSkeleton className="h-4 mb-2" />
      <LoadingSkeleton className="h-4 w-3/4" />
    </div>
  )
} 