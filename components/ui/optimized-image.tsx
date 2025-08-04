"use client"

import { useState, useRef, useEffect } from 'react'
import { useLazyImage, useNetworkSpeed } from '@/hooks/use-performance'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  sizes?: string
  fill?: boolean
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  sizes,
  fill = false
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const [loadAttempts, setLoadAttempts] = useState(0)
  const { networkInfo, isSlowConnection } = useNetworkSpeed()
  const { imgRef, imageSrc, isLoaded, isInView } = useLazyImage(src, {
    rootMargin: '50px'
  })

  // Generate responsive image URLs based on network speed
  const getOptimizedSrc = (originalSrc: string, targetWidth?: number) => {
    if (!targetWidth) return originalSrc
    
    // Adjust quality based on network speed
    const networkQuality = isSlowConnection ? Math.max(quality - 20, 30) : quality
    
    // For demo purposes, we'll assume a service like Cloudinary or similar
    // In production, you'd integrate with your image optimization service
    const params = new URLSearchParams({
      w: targetWidth.toString(),
      q: networkQuality.toString(),
      f: 'auto', // Auto format (WebP, AVIF when supported)
      dpr: window.devicePixelRatio.toString()
    })
    
    // If using a service like Cloudinary:
    // return `https://res.cloudinary.com/your-cloud/image/fetch/${params}/${encodeURIComponent(originalSrc)}`
    
    // For now, return original src
    return originalSrc
  }

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc: string) => {
    const breakpoints = [320, 640, 768, 1024, 1280, 1536]
    return breakpoints
      .map(bp => `${getOptimizedSrc(originalSrc, bp)} ${bp}w`)
      .join(', ')
  }

  const handleLoad = () => {
    onLoad?.()
  }

  const handleError = () => {
    setError(true)
    setLoadAttempts(prev => prev + 1)
    onError?.()
  }

  const retryLoad = () => {
    setError(false)
    setLoadAttempts(0)
  }

  // Show skeleton while loading
  if (!isInView || (!isLoaded && !error)) {
    return (
      <div 
        ref={imgRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {placeholder === 'blur' && blurDataURL ? (
          <img
            src={blurDataURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
      </div>
    )
  }

  // Show error state with retry option
  if (error && loadAttempts < 3) {
    return (
      <div 
        className={`relative flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">Failed to load image</p>
          <button
            onClick={retryLoad}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Render optimized image
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      srcSet={generateSrcSet(src)}
      sizes={sizes || '100vw'}
      alt={alt}
      width={width}
      height={height}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={fill ? { objectFit: 'cover', width: '100%', height: '100%' } : undefined}
    />
  )
}

// Avatar component with optimized loading
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  fallback,
  className = ''
}: {
  src?: string
  alt: string
  size?: number
  fallback?: string
  className?: string
}) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 font-medium text-sm">
          {fallback || alt.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setError(true)}
      quality={85}
    />
  )
}

// Background image component with optimization
export function OptimizedBackgroundImage({
  src,
  alt,
  children,
  className = '',
  overlay = false,
  overlayOpacity = 0.5
}: {
  src: string
  alt: string
  children?: React.ReactNode
  className?: string
  overlay?: boolean
  overlayOpacity?: number
}) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={() => setIsLoaded(true)}
        priority
      />
      
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
      
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}
    </div>
  )
}

// Gallery component with lazy loading
export function OptimizedGallery({
  images,
  columns = 3,
  gap = 4,
  className = ''
}: {
  images: Array<{ src: string; alt: string; width?: number; height?: number }>
  columns?: number
  gap?: number
  className?: string
}) {
  return (
    <div 
      className={`grid gap-${gap} ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {images.map((image, index) => (
        <div key={index} className="aspect-square overflow-hidden rounded-lg">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            fill
            className="hover:scale-105 transition-transform duration-300"
            sizes={`(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw`}
          />
        </div>
      ))}
    </div>
  )
}
