"use client"
import { Progress } from "@/components/ui/progress"

interface PasswordStrengthCheckerProps {
  password: string
}

export default function PasswordStrengthChecker({ password }: PasswordStrengthCheckerProps) {
  const getStrength = (password: string) => {
    let score = 0
    if (!password) return 0

    // Length
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1

    // Uppercase and Lowercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1

    // Numbers
    if (/\d/.test(password)) score += 1

    // Special characters
    if (/[^a-zA-Z0-9]/.test(password)) score += 1

    return (score / 5) * 100 // Max score 5
  }

  const strength = getStrength(password)

  const getColor = (strength: number) => {
    if (strength < 40) return "bg-red-500"
    if (strength < 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getLabel = (strength: number) => {
    if (strength === 0) return "Enter password"
    if (strength < 40) return "Weak"
    if (strength < 70) return "Moderate"
    return "Strong"
  }

  return (
    <div className="space-y-1">
      <Progress value={strength} className={`h-2 ${getColor(strength)}`} />
      <p className="text-xs text-muted-foreground">{getLabel(strength)}</p>
    </div>
  )
}
