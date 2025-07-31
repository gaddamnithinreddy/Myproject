"use client"

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle } from 'lucide-react'

export interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date' | 'time' | 'textarea' | 'select'
  placeholder?: string
  value?: string | number
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string
  success?: string
  required?: boolean
  disabled?: boolean
  className?: string
  options?: { value: string; label: string }[]
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: string) => string | null
  }
  description?: string
  autoComplete?: string
  ariaLabel?: string
}

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      value = '',
      onChange,
      onBlur,
      error,
      success,
      required = false,
      disabled = false,
      className,
      options = [],
      validation,
      description,
      autoComplete,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    const fieldId = `${name}-field`
    const errorId = `${name}-error`
    const descriptionId = `${name}-description`
    const successId = `${name}-success`

    const handleChange = (newValue: string) => {
      onChange?.(newValue)
    }

    const handleBlur = () => {
      onBlur?.()
    }

    const renderField = () => {
      const commonProps = {
        id: fieldId,
        name,
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
          handleChange(e.target.value),
        onBlur: handleBlur,
        disabled,
        required,
        'aria-invalid': !!error,
        'aria-describedby': [
          error && errorId,
          description && descriptionId,
          success && successId
        ].filter(Boolean).join(' ') || undefined,
        'aria-label': ariaLabel || label,
        autoComplete,
        ...props
      }

      switch (type) {
        case 'textarea':
          return (
            <Textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              placeholder={placeholder}
              {...commonProps}
            />
          )

        case 'select':
          return (
            <Select
              value={value as string}
              onValueChange={handleChange}
              disabled={disabled}
            >
              <SelectTrigger
                id={fieldId}
                className={cn(
                  error && "border-destructive focus:ring-destructive",
                  success && "border-green-500 focus:ring-green-500"
                )}
                aria-invalid={!!error}
                aria-describedby={[
                  error && errorId,
                  description && descriptionId,
                  success && successId
                ].filter(Boolean).join(' ') || undefined}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )

        default:
          return (
            <Input
              ref={ref as React.Ref<HTMLInputElement>}
              type={type}
              placeholder={placeholder}
              {...commonProps}
            />
          )
      }
    }

    return (
      <div className={cn("space-y-2", className)}>
        <Label
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium",
            error && "text-destructive",
            success && "text-green-600"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>

        <div className="relative">
          {renderField()}
          
          {/* Status Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {error && (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            )}
            {success && !error && (
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && !error && (
          <p
            id={successId}
            className="text-sm text-green-600 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            {success}
          </p>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'

export { FormField } 