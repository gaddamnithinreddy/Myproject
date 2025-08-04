"use client"

import React, { memo, useMemo, useCallback, Suspense, lazy } from 'react'
import LoadingSpinner from './LoadingSpinner'

// Memoized List Item Component
interface ListItemProps {
  id: string
  title: string
  description?: string
  onClick?: (id: string) => void
  selected?: boolean
  className?: string
}

export const ListItem = memo<ListItemProps>(({
  id,
  title,
  description,
  onClick,
  selected = false,
  className = ""
}) => {
  const handleClick = useCallback(() => {
    onClick?.(id)
  }, [id, onClick])

  const itemClassName = useMemo(() => {
    return `p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
      selected 
        ? 'border-primary bg-primary/5' 
        : 'border-border hover:border-primary/50 hover:bg-muted/50'
    } ${className}`
  }, [selected, className])

  return (
    <div 
      className={itemClassName}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-selected={selected}
    >
      <h3 className="font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
})

ListItem.displayName = 'ListItem'

// Virtualized List Component
interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )
    return { start: Math.max(0, start - overscan), end }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end)
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      role="list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Lazy Loaded Component Wrapper
interface LazyComponentProps {
  component: () => Promise<{ default: React.ComponentType<any> }>
  fallback?: React.ReactNode
  props?: Record<string, any>
}

export function LazyComponent({ 
  component, 
  fallback = <LoadingSpinner text="Loading component..." />,
  props = {}
}: LazyComponentProps) {
  const LazyComponent = useMemo(() => lazy(component), [component])

  return (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

// Debounced Input Component
interface DebouncedInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  delay?: number
  className?: string
  disabled?: boolean
}

export const DebouncedInput = memo<DebouncedInputProps>(({
  value,
  onChange,
  placeholder,
  delay = 300,
  className = "",
  disabled = false
}) => {
  const [localValue, setLocalValue] = React.useState(value)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue)
    }, delay)
  }, [onChange, delay])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  )
})

DebouncedInput.displayName = 'DebouncedInput'

// Infinite Scroll Hook
export function useInfiniteScroll<T>(
  items: T[],
  loadMore: () => Promise<void>,
  hasMore: boolean,
  threshold = 100
) {
  const [isLoading, setIsLoading] = React.useState(false)
  const observerRef = React.useRef<IntersectionObserver>()
  const loadingRef = React.useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && hasMore && !isLoading) {
        setIsLoading(true)
        loadMore().finally(() => setIsLoading(false))
      }
    },
    [hasMore, isLoading, loadMore]
  )

  React.useEffect(() => {
    const element = loadingRef.current
    if (element) {
      observerRef.current = new IntersectionObserver(handleObserver, {
        rootMargin: `${threshold}px`
      })
      observerRef.current.observe(element)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleObserver, threshold])

  return { loadingRef, isLoading }
}

// Optimized Image Component
interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fallback?: string
  loading?: 'lazy' | 'eager'
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className = "",
  fallback = "/placeholder.jpg",
  loading = "lazy"
}) => {
  const [imageSrc, setImageSrc] = React.useState(src)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    if (imageSrc !== fallback) {
      setImageSrc(fallback)
    }
  }, [imageSrc, fallback])

  React.useEffect(() => {
    setImageSrc(src)
    setIsLoading(true)
    setHasError(false)
  }, [src])

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${hasError ? 'object-contain' : 'object-cover'}`}
      />
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage' 