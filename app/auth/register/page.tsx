"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, MapPin } from "lucide-react"
import PasswordStrengthChecker from "@/components/PasswordStrengthChecker"
import MapPicker from "@/components/MapPicker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateReferralCode, trackReferral } from "@/lib/referral"

export default function RegisterPage() {
  const { register, loading, error, clearError } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    mobileNumber: "",
    dateOfBirth: "",
    gender: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    address: "",
    coordinates: { lat: 0, lng: 0 },
    userType: "individual" as "individual" | "club" | "organization",
    organizationName: "",
    referralCode: "",
    termsAccepted: false,
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [referralCode, setReferralCode] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (id === "password" || id === "confirmPassword") {
      setPasswordError(null)
    }
    clearError()
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    clearError()
  }

  const handleLocationSelect = (place: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: place.address,
      city: place.city,
      state: place.state,
      country: place.country,
      zipCode: place.zipCode || prev.zipCode,
      coordinates: place.coordinates,
    }))
    setIsMapPickerOpen(false) // Close dialog after selection
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    // Email validation
    if (!formData.email) {
      errors.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address."
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = "Password is required."
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long."
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    }
    
    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match."
    }
    
    // Required fields
    if (!formData.firstName) errors.firstName = "First name is required."
    if (!formData.lastName) errors.lastName = "Last name is required."
    if (!formData.mobileNumber) errors.mobileNumber = "Mobile number is required."
    if (!formData.dateOfBirth) errors.dateOfBirth = "Date of birth is required."
    if (!formData.zipCode) errors.zipCode = "Zip code is required."
    
    // Mobile number validation
    if (formData.mobileNumber && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.mobileNumber.replace(/\s/g, ''))) {
      errors.mobileNumber = "Please enter a valid mobile number."
    }
    
    // Date validation
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 13 || age > 100) {
        errors.dateOfBirth = "You must be between 13 and 100 years old."
      }
    }
    
    if (!formData.termsAccepted) errors.termsAccepted = "You must accept the terms and conditions."
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setPasswordError(null)
    setFieldErrors({})
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: formData.mobileNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        zipCode: formData.zipCode,
        address: formData.address,
        coordinates: formData.coordinates,
        userType: formData.userType,
        organizationName: formData.organizationName,
        referralCode: formData.referralCode,
      })
      // Registration success handled by AuthContext toast and redirect
      if (referralCode) {
        // Find referrer by code
        // const q = query(collection(db, "users"), where("referralCode", "==", referralCode))
        // const snap = await getDocs(q)
        // if (!snap.empty) {
        //   const referrer = snap.docs[0]
        //   await trackReferral(referrer.id, user.uid)
        // }
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setPasswordError("An invitation or account already exists for this email. Please check your inbox or verify your email before registering again.")
      } else {
        setPasswordError(err.message || "Registration failed. Please try again.")
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-gray-800">Register</CardTitle>
          <CardDescription className="text-gray-600">Create your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber" className="text-gray-700 font-medium">Mobile Number</Label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    required
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {fieldErrors.mobileNumber && <p className="text-xs text-red-600">{fieldErrors.mobileNumber}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <PasswordStrengthChecker password={formData.password} />
                  {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {fieldErrors.confirmPassword && <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700 font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {fieldErrors.firstName && <p className="text-xs text-red-600">{fieldErrors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700 font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {fieldErrors.lastName && <p className="text-xs text-red-600">{fieldErrors.lastName}</p>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-gray-700 font-medium">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                />
                {fieldErrors.dateOfBirth && <p className="text-xs text-red-600">{fieldErrors.dateOfBirth}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-gray-700 font-medium">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)} required>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">Location Details</h3>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-700 font-medium">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Select location on map or type address"
                  required
                  readOnly={false} // Allow manual entry
                  className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                />
                {!formData.address && (
                  <div className="text-xs text-gray-500">You can type your address or select it on the map.</div>
                )}
                <Dialog open={isMapPickerOpen} onOpenChange={setIsMapPickerOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-500">
                      <MapPin className="mr-2 h-4 w-4" />
                      Select Location on Map
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[500px]">
                    <DialogHeader>
                      <DialogTitle>Pick Your Location</DialogTitle>
                    </DialogHeader>
                    <MapPicker onPlaceSelect={handleLocationSelect} className="h-[400px] w-full" />
                  </DialogContent>
                </Dialog>
              </div>
              {formData.address && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700 font-medium">City</Label>
                    <Input id="city" value={formData.city} onChange={handleInputChange} placeholder="Enter city or select location on map" className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-700 font-medium">State</Label>
                    <Input id="state" value={formData.state} onChange={handleInputChange} placeholder="Enter state or select location on map" className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-gray-700 font-medium">Country</Label>
                    <Input id="country" value={formData.country} onChange={handleInputChange} placeholder="Enter country or select location on map" className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-700 font-medium">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="Enter zip code or select location on map"
                      required
                      className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {fieldErrors.zipCode && <p className="text-xs text-red-600">{fieldErrors.zipCode}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* User Type & Referral */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">User Type & Referral</h3>
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-gray-700 font-medium">I am a...</Label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) => handleSelectChange("userType", value)}
                  required
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual (Player/Coach)</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formData.userType === "organization" || formData.userType === "club") && (
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-gray-700 font-medium">Organization/Club Name</Label>
                  <Input
                    id="organizationName"
                    placeholder="e.g., Elite Sports Club"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    required={formData.userType === "organization" || formData.userType === "club"}
                    className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-gray-700 font-medium">Referral Code (optional)</Label>
                <Input
                  id="referralCode"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  className="bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, termsAccepted: !!checked }))}
                required
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{" "}
                <Link href="#" className="underline text-blue-600 hover:text-blue-800">
                  Terms & Conditions
                </Link>
              </Label>
            </div>
            {fieldErrors.termsAccepted && <p className="text-xs text-red-600">{fieldErrors.termsAccepted}</p>}

            {passwordError && <p className="text-sm text-red-600 text-center">{passwordError}</p>}
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium py-3" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
