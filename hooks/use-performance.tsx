"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  connectionSpeed: string
  deviceType: string
  batteryLevel?: number
  isLowPowerMode?: boolean
}

// Performance monitoring hook
export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    connectionSpeed: 'unknown',
    deviceType: 'unknown'
  })

  useEffect(() => {
    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const memory = (performance as any).memory
      const connection = (navigator as any).connection

      setMetrics({
        loadTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
        renderTime: navigation?.domContentLoadedEventEnd - navigation?.navigationStart || 0,
        memoryUsage: memory?.usedJSHeapSize || 0,
        connectionSpeed: connection?.effectiveType || 'unknown',
        deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        batteryLevel: (navigator as any).getBattery?.()?.level,
        isLowPowerMode: (navigator as any).getBattery?.()?.charging === false
      })
    }

    updateMetrics()
    
    // Update periodically
    const interval = setInterval(updateMetrics, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  return metrics
}

// Image lazy loading hook with intersection observer
export function useLazyImage(src: string, options: IntersectionObserverInit = {}) {
  const [imageSrc, setImageSrc] = useState<string>()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, ...options }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [options])

  useEffect(() => {
    if (isInView && src) {
      const img = new Image()
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
      }
      img.src = src
    }
  }, [isInView, src])

  return { imgRef, imageSrc, isLoaded, isInView }
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index
  }))

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  }
}

// Debounced resize hook
export function useDebounceResize(delay: number = 250) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }, delay)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [delay])

  return windowSize
}

// Preload resources hook
export function usePreloadResources(resources: string[]) {
  useEffect(() => {
    const preloadedResources: HTMLLinkElement[] = []

    resources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      
      if (resource.endsWith('.js')) {
        link.as = 'script'
      } else if (resource.endsWith('.css')) {
        link.as = 'style'
      } else if (resource.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        link.as = 'image'
      } else if (resource.match(/\.(woff|woff2|ttf|otf)$/)) {
        link.as = 'font'
        link.crossOrigin = 'anonymous'
      }
      
      link.href = resource
      document.head.appendChild(link)
      preloadedResources.push(link)
    })

    return () => {
      preloadedResources.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link)
        }
      })
    }
  }, [resources])
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number
    total: number
    limit: number
  } | null>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      const memory = (performance as any).memory
      if (memory) {
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const isHighMemoryUsage = memoryInfo ? (memoryInfo.used / memoryInfo.limit) > 0.8 : false

  return { memoryInfo, isHighMemoryUsage }
}

// Network speed detection
export function useNetworkSpeed() {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  })

  useEffect(() => {
    const connection = (navigator as any).connection
    
    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        })
      }

      updateNetworkInfo()
      connection.addEventListener('change', updateNetworkInfo)
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  const isSlowConnection = networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g'
  const isFastConnection = networkInfo.effectiveType === '4g'

  return { networkInfo, isSlowConnection, isFastConnection }
}

// Bundle size analyzer (development only)
export function useBundleAnalyzer() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number
    chunks: Array<{ name: string; size: number }>
  } | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // This would integrate with webpack-bundle-analyzer or similar
      // For now, we'll simulate the data
      const simulatedBundleInfo = {
        totalSize: 2.5 * 1024 * 1024, // 2.5MB
        chunks: [
          { name: 'main', size: 1.2 * 1024 * 1024 },
          { name: 'vendor', size: 800 * 1024 },
          { name: 'runtime', size: 50 * 1024 }
        ]
      }
      setBundleInfo(simulatedBundleInfo)
    }
  }, [])

  return bundleInfo
}

// Performance budget checker
export function usePerformanceBudget(budgets: {
  loadTime?: number
  bundleSize?: number
  memoryUsage?: number
}) {
  const metrics = usePerformance()
  const bundleInfo = useBundleAnalyzer()
  const { memoryInfo } = useMemoryMonitor()

  const violations = []

  if (budgets.loadTime && metrics.loadTime > budgets.loadTime) {
    violations.push(`Load time exceeded budget: ${metrics.loadTime}ms > ${budgets.loadTime}ms`)
  }

  if (budgets.bundleSize && bundleInfo && bundleInfo.totalSize > budgets.bundleSize) {
    violations.push(`Bundle size exceeded budget: ${(bundleInfo.totalSize / 1024 / 1024).toFixed(2)}MB > ${(budgets.bundleSize / 1024 / 1024).toFixed(2)}MB`)
  }

  if (budgets.memoryUsage && memoryInfo && memoryInfo.used > budgets.memoryUsage) {
    violations.push(`Memory usage exceeded budget: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB > ${(budgets.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
  }

  return { violations, isWithinBudget: violations.length === 0 }
}
