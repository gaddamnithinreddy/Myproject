"use client"

import { networkFetch } from '@/hooks/useNetworkStatus'

// API Response types
export interface ApiResponse<T = any> {
  data: T
  status: number
  message: string
  success: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: any
  status?: number
}

// Request configuration
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTime?: number
}

// Cache interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private cache: Map<string, CacheEntry<any>>
  private pendingRequests: Map<string, Promise<any>>

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
    this.cache = new Map()
    this.pendingRequests = new Map()
  }

  // Set default headers
  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers }
  }

  // Add auth token
  setAuthToken(token: string) {
    this.setDefaultHeaders({ Authorization: `Bearer ${token}` })
  }

  // Clear auth token
  clearAuthToken() {
    const { Authorization, ...headers } = this.defaultHeaders
    this.defaultHeaders = headers
  }

  // Generate cache key
  private getCacheKey(url: string, config: RequestConfig): string {
    const method = config.method || 'GET'
    const body = config.body ? JSON.stringify(config.body) : ''
    return `${method}:${url}:${body}`
  }

  // Check if cache entry is valid
  private isCacheValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  // Get from cache
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (entry && this.isCacheValid(entry)) {
      return entry.data
    }
    if (entry) {
      this.cache.delete(key)
    }
    return null
  }

  // Set cache entry
  private setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // Clear cache
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  // Main request method
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const cacheKey = this.getCacheKey(url, config)
    const method = config.method || 'GET'

    // Check cache for GET requests
    if (method === 'GET' && config.cache !== false) {
      const cachedData = this.getFromCache<T>(cacheKey)
      if (cachedData) {
        return {
          data: cachedData,
          status: 200,
          message: 'Cached response',
          success: true
        }
      }
    }

    // Check for pending requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    // Create request promise
    const requestPromise = this.executeRequest<T>(url, config, cacheKey)
    this.pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  // Execute the actual request
  private async executeRequest<T>(
    url: string,
    config: RequestConfig,
    cacheKey: string
  ): Promise<ApiResponse<T>> {
    const method = config.method || 'GET'
    const headers = { ...this.defaultHeaders, ...config.headers }
    const timeout = config.timeout || 10000
    const retries = config.retries || 3

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const requestConfig: RequestInit = {
          method,
          headers,
          signal: AbortSignal.timeout(timeout)
        }

        if (config.body && method !== 'GET') {
          requestConfig.body = JSON.stringify(config.body)
        }

        const response = await networkFetch(url, requestConfig, retries)
        const data = await response.json()

        // Cache successful GET responses
        if (method === 'GET' && config.cache !== false) {
          this.setCache(cacheKey, data, config.cacheTime)
        }

        return {
          data,
          status: response.status,
          message: 'Success',
          success: true
        }
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw this.handleError(error)
        }

        // Log retry attempts
        if (attempt < retries) {
          console.warn(`API request failed, retrying... (${attempt + 1}/${retries})`, error)
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
        }
      }
    }

    throw this.handleError(lastError || new Error('Request failed'), undefined)
  }

  // Handle errors
  private handleError(error: Error, status?: number): ApiError {
    let code = 'UNKNOWN_ERROR'
    let message = error.message

    if (error.name === 'AbortError') {
      code = 'TIMEOUT'
      message = 'Request timed out'
    } else if (error.message.includes('Failed to fetch')) {
      code = 'NETWORK_ERROR'
      message = 'Network connection failed'
    } else if (status) {
      code = `HTTP_${status}`
      switch (status) {
        case 400:
          message = 'Bad request'
          break
        case 401:
          message = 'Unauthorized'
          break
        case 403:
          message = 'Forbidden'
          break
        case 404:
          message = 'Not found'
          break
        case 500:
          message = 'Internal server error'
          break
        default:
          message = `HTTP ${status} error`
      }
    }

    return {
      code,
      message,
      status,
      details: error
    }
  }

  // Utility method for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Convenience methods
  async get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data })
  }

  async put<T = any>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data })
  }

  async patch<T = any>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data })
  }

  async delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  // Upload file
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
        ...this.defaultHeaders,
        'Content-Type': undefined as any
      }
    })
  }

  // Download file
  async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const response = await this.request(endpoint, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        'Content-Type': undefined as any
      }
    })

    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Types are already exported above

// Export convenience functions
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  uploadFile: apiClient.uploadFile.bind(apiClient),
  downloadFile: apiClient.downloadFile.bind(apiClient),
  setAuthToken: apiClient.setAuthToken.bind(apiClient),
  clearAuthToken: apiClient.clearAuthToken.bind(apiClient),
  clearCache: apiClient.clearCache.bind(apiClient)
} 