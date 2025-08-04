"use client"

import { useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

interface OptimisticState<T> {
  data: T[]
  pendingOperations: Map<string, 'create' | 'update' | 'delete'>
  errors: Map<string, string>
}

interface OptimisticOptions {
  onSuccess?: (operation: string, data: any) => void
  onError?: (operation: string, error: string, data: any) => void
  retryAttempts?: number
}

export function useOptimisticUpdates<T extends { id: string }>(
  initialData: T[] = [],
  options: OptimisticOptions = {}
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pendingOperations: new Map(),
    errors: new Map()
  })

  const { onSuccess, onError, retryAttempts = 3 } = options

  // Add optimistic item
  const addOptimistic = useCallback(async (
    item: Omit<T, 'id'> & { id?: string },
    serverAction: () => Promise<T>
  ) => {
    const tempId = item.id || `temp_${Date.now()}_${Math.random()}`
    const optimisticItem = { ...item, id: tempId } as T

    // Add to state immediately
    setState(prev => ({
      ...prev,
      data: [...prev.data, optimisticItem],
      pendingOperations: new Map(prev.pendingOperations).set(tempId, 'create'),
      errors: new Map(prev.errors)
    }))

    try {
      const serverItem = await serverAction()
      
      // Replace optimistic item with server response
      setState(prev => ({
        ...prev,
        data: prev.data.map(d => d.id === tempId ? serverItem : d),
        pendingOperations: new Map([...prev.pendingOperations].filter(([id]) => id !== tempId)),
        errors: new Map(prev.errors)
      }))

      onSuccess?.('create', serverItem)
      
    } catch (error: any) {
      // Remove optimistic item on error
      setState(prev => ({
        ...prev,
        data: prev.data.filter(d => d.id !== tempId),
        pendingOperations: new Map([...prev.pendingOperations].filter(([id]) => id !== tempId)),
        errors: new Map(prev.errors).set(tempId, error.message)
      }))

      onError?.('create', error.message, optimisticItem)
      
      toast({
        title: "Failed to create item",
        description: error.message,
        variant: "destructive"
      })
    }
  }, [onSuccess, onError])

  // Update optimistic item
  const updateOptimistic = useCallback(async (
    id: string,
    updates: Partial<T>,
    serverAction: () => Promise<T>
  ) => {
    const originalItem = state.data.find(d => d.id === id)
    if (!originalItem) return

    // Update immediately
    setState(prev => ({
      ...prev,
      data: prev.data.map(d => d.id === id ? { ...d, ...updates } : d),
      pendingOperations: new Map(prev.pendingOperations).set(id, 'update'),
      errors: new Map(prev.errors)
    }))

    try {
      const serverItem = await serverAction()
      
      // Update with server response
      setState(prev => ({
        ...prev,
        data: prev.data.map(d => d.id === id ? serverItem : d),
        pendingOperations: new Map([...prev.pendingOperations].filter(([itemId]) => itemId !== id)),
        errors: new Map(prev.errors)
      }))

      onSuccess?.('update', serverItem)
      
    } catch (error: any) {
      // Revert to original on error
      setState(prev => ({
        ...prev,
        data: prev.data.map(d => d.id === id ? originalItem : d),
        pendingOperations: new Map([...prev.pendingOperations].filter(([itemId]) => itemId !== id)),
        errors: new Map(prev.errors).set(id, error.message)
      }))

      onError?.('update', error.message, originalItem)
      
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive"
      })
    }
  }, [state.data, onSuccess, onError])

  // Delete optimistic item
  const deleteOptimistic = useCallback(async (
    id: string,
    serverAction: () => Promise<void>
  ) => {
    const originalItem = state.data.find(d => d.id === id)
    if (!originalItem) return

    // Remove immediately
    setState(prev => ({
      ...prev,
      data: prev.data.filter(d => d.id !== id),
      pendingOperations: new Map(prev.pendingOperations).set(id, 'delete'),
      errors: new Map(prev.errors)
    }))

    try {
      await serverAction()
      
      // Confirm deletion
      setState(prev => ({
        ...prev,
        pendingOperations: new Map([...prev.pendingOperations].filter(([itemId]) => itemId !== id)),
        errors: new Map(prev.errors)
      }))

      onSuccess?.('delete', originalItem)
      
    } catch (error: any) {
      // Restore item on error
      setState(prev => ({
        ...prev,
        data: [...prev.data, originalItem].sort((a, b) => a.id.localeCompare(b.id)),
        pendingOperations: new Map([...prev.pendingOperations].filter(([itemId]) => itemId !== id)),
        errors: new Map(prev.errors).set(id, error.message)
      }))

      onError?.('delete', error.message, originalItem)
      
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive"
      })
    }
  }, [state.data, onSuccess, onError])

  // Retry failed operation
  const retryOperation = useCallback(async (id: string) => {
    const error = state.errors.get(id)
    if (!error) return

    setState(prev => ({
      ...prev,
      errors: new Map([...prev.errors].filter(([itemId]) => itemId !== id))
    }))

    // Implementation would depend on storing the original operation details
    // This is a simplified version
    toast({
      title: "Retrying operation",
      description: "Attempting to retry the failed operation..."
    })
  }, [state.errors])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: new Map()
    }))
  }, [])

  // Get pending status for an item
  const isPending = useCallback((id: string) => {
    return state.pendingOperations.has(id)
  }, [state.pendingOperations])

  // Get error for an item
  const getError = useCallback((id: string) => {
    return state.errors.get(id)
  }, [state.errors])

  return {
    data: state.data,
    addOptimistic,
    updateOptimistic,
    deleteOptimistic,
    retryOperation,
    clearErrors,
    isPending,
    getError,
    hasPendingOperations: state.pendingOperations.size > 0,
    hasErrors: state.errors.size > 0
  }
}
