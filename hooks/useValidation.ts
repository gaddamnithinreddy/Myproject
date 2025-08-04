"use client"

import { useState, useCallback } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  message?: string
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface ValidationErrors {
  [key: string]: string
}

export function useValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validateField = useCallback((value: any, rules: ValidationRule): string | null => {
    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      return rules.message || 'This field is required.'
    }

    if (!value) return null

    const stringValue = value.toString()

    // Min length validation
    if (rules.minLength && stringValue.length < rules.minLength) {
      return rules.message || `Minimum length is ${rules.minLength} characters.`
    }

    // Max length validation
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return rules.message || `Maximum length is ${rules.maxLength} characters.`
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return rules.message || 'Invalid format.'
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) return customError
    }

    return null
  }, [])

  const validateForm = useCallback((data: any, rules: ValidationRules): ValidationErrors => {
    const newErrors: ValidationErrors = {}

    Object.keys(rules).forEach(field => {
      const value = data[field]
      const fieldRules = rules[field]
      const error = validateField(value, fieldRules)
      
      if (error) {
        newErrors[field] = error
      }
    })

    setErrors(newErrors)
    return newErrors
  }, [validateField])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    setFieldError,
    clearFieldError
  }
}

// Common validation rules
export const commonValidations = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number.'
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number.'
  },
  required: {
    required: true,
    message: 'This field is required.'
  }
} 