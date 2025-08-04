"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  AnimatedPage, 
  AnimatedCard, 
  FadeIn, 
  SlideUp, 
  AnimatedButton,
  StaggeredContainer,
  StaggeredItem,
  AnimatedModal
} from "@/components/AnimatedComponents"
import { 
  Search, 
  Filter, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Clock, 
  Users, 
  Award,
  MessageSquare,
  Heart,
  Share2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Building,
  ShoppingBag,
  Wrench,
  Car,
  Utensils,
  Camera,
  Music,
  Gamepad2
} from "lucide-react"

interface Vendor {
  id: string
  name: string
  description: string
  category: string
  subcategory: string
  contact: {
    email: string
    phone: string
    website: string
    address: string
  }
  rating: number
  reviewCount: number
  services: string[]
  specialties: string[]
  availability: string
  pricing: string
  images: string[]
  logo: string
  verified: boolean
  featured: boolean
  location: {
    city: string
    state: string
    country: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  socialMedia: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  businessHours: {
    [key: string]: string
  }
  createdAt: string
  updatedAt: string
}

interface Review {
  id: string
  vendorId: string
  userId: string
  userName: string
  rating: number
  comment: string
  date: string
  helpful: number
}

const categories = [
  { value: "equipment", label: "Equipment & Gear", icon: ShoppingBag },
  { value: "services", label: "Services", icon: Wrench },
  { value: "transportation", label: "Transportation", icon: Car },
  { value: "catering", label: "Catering", icon: Utensils },
  { value: "photography", label: "Photography", icon: Camera },
  { value: "entertainment", label: "Entertainment", icon: Music },
  { value: "gaming", label: "Gaming", icon: Gamepad2 },
  { value: "other", label: "Other", icon: Building }
]

const subcategories = {
  equipment: ["Gaming Equipment", "Audio/Visual", "Furniture", "Sporting Goods", "Electronics"],
  services: ["Event Planning", "Technical Support", "Security", "Cleaning", "Maintenance"],
  transportation: ["Shuttle Service", "Car Rental", "Bus Service", "Limousine", "Delivery"],
  catering: ["Food Service", "Beverages", "Snacks", "Full Catering", "Food Trucks"],
  photography: ["Event Photography", "Portrait", "Video Production", "Live Streaming", "Editing"],
  entertainment: ["Live Music", "DJ Services", "Performers", "Games", "Activities"],
  gaming: ["Gaming Setup", "Tournament Equipment", "Gaming Accessories", "Console Rental", "PC Setup"],
  other: ["Insurance", "Legal Services", "Marketing", "Consulting", "Other"]
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedSubcategory, setSelectedSubcategory] = useState("")
  const [sortBy, setSortBy] = useState("rating")
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    service: ""
  })

  useEffect(() => {
    loadVendors()
  }, [])

  useEffect(() => {
    filterVendors()
  }, [vendors, searchTerm, selectedCategory, selectedSubcategory, sortBy])

  const loadVendors = async () => {
    try {
      const vendorsRef = collection(db, "vendors")
      const q = query(vendorsRef, orderBy("rating", "desc"), limit(50))
      const querySnapshot = await getDocs(q)
      
      const vendorsData: Vendor[] = []
      querySnapshot.forEach((doc) => {
        vendorsData.push({ id: doc.id, ...doc.data() } as Vendor)
      })
      
      setVendors(vendorsData)
    } catch (error) {
      console.error("Error loading vendors:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterVendors = () => {
    let filtered = [...vendors]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.services.some(service => 
          service.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        vendor.specialties.some(specialty => 
          specialty.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(vendor => vendor.category === selectedCategory)
    }

    // Subcategory filter
    if (selectedSubcategory) {
      filtered = filtered.filter(vendor => vendor.subcategory === selectedSubcategory)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating
        case "name":
          return a.name.localeCompare(b.name)
        case "reviewCount":
          return b.reviewCount - a.reviewCount
        case "featured":
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
        default:
          return 0
      }
    })

    setFilteredVendors(filtered)
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendor) return

    try {
      // Here you would typically send the contact form to your backend
      // For now, we'll just log it and show a success message
      console.log("Contact form submitted:", {
        vendor: selectedVendor.name,
        ...contactForm
      })

      // Reset form
      setContactForm({
        name: "",
        email: "",
        phone: "",
        message: "",
        service: ""
      })
      setContactModalOpen(false)

      // Show success message (you can use your toast system)
      alert("Message sent successfully! The vendor will get back to you soon.")
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message. Please try again.")
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? "text-yellow-400 fill-current" 
            : i < rating 
            ? "text-yellow-400" 
            : "text-gray-300"
        }`}
      />
    ))
  }

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category)
    return categoryData ? categoryData.icon : Building
  }

  if (loading) {
    return (
      <AnimatedPage>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <FadeIn>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendors & Suppliers</h1>
            <p className="text-gray-600">
              Find trusted vendors and suppliers for your tournaments and events
            </p>
          </div>
        </FadeIn>

        {/* Search and Filters */}
        <StaggeredContainer>
          <StaggeredItem>
            <AnimatedCard className="p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <category.icon className="w-4 h-4" />
                          {category.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={selectedSubcategory} 
                  onValueChange={setSelectedSubcategory}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Subcategories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Subcategories</SelectItem>
                    {selectedCategory && subcategories[selectedCategory as keyof typeof subcategories]?.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Sort by Rating</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="reviewCount">Sort by Reviews</SelectItem>
                    <SelectItem value="featured">Featured First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AnimatedCard>
          </StaggeredItem>

          {/* Results Count */}
          <StaggeredItem>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Showing {filteredVendors.length} of {vendors.length} vendors
              </p>
              <div className="flex gap-2">
                <AnimatedButton variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </AnimatedButton>
              </div>
            </div>
          </StaggeredItem>

          {/* Vendors Grid */}
          <StaggeredItem>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor, index) => (
                <AnimatedCard
                  key={vendor.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                  delay={index * 0.1}
                >
                  <div className="relative">
                    {vendor.featured && (
                      <Badge className="absolute top-2 left-2 z-10 bg-yellow-500">
                        Featured
                      </Badge>
                    )}
                    {vendor.verified && (
                      <Badge className="absolute top-2 right-2 z-10 bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    
                    <div className="h-48 bg-gray-200 relative">
                      {vendor.images && vendor.images.length > 0 ? (
                        <img
                          src={vendor.images[0]}
                          alt={vendor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={vendor.logo} />
                          <AvatarFallback>
                            {vendor.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm">{vendor.name}</h3>
                          <div className="flex items-center gap-1">
                            {renderStars(vendor.rating)}
                            <span className="text-xs text-gray-600 ml-1">
                              ({vendor.reviewCount})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {vendor.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {vendor.services.slice(0, 3).map((service) => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                      {vendor.services.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{vendor.services.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3 h-3" />
                      <span>{vendor.location.city}, {vendor.location.state}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium text-green-600">{vendor.pricing}</span>
                      </div>
                      <div className="flex gap-2">
                        <AnimatedButton
                          size="sm"
                          onClick={() => {
                            setSelectedVendor(vendor)
                            setContactModalOpen(true)
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Contact
                        </AnimatedButton>
                        <AnimatedButton
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVendor(vendor)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </AnimatedButton>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              ))}
            </div>
          </StaggeredItem>

          {/* No Results */}
          {filteredVendors.length === 0 && !loading && (
            <StaggeredItem>
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or browse all categories
                </p>
                <AnimatedButton
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedCategory("")
                    setSelectedSubcategory("")
                  }}
                >
                  Clear Filters
                </AnimatedButton>
              </div>
            </StaggeredItem>
          )}
        </StaggeredContainer>

        {/* Contact Modal */}
        <AnimatedModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Contact {selectedVendor?.name}</DialogTitle>
              <DialogDescription>
                Send a message to this vendor to inquire about their services
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleContactSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="service">Service of Interest</Label>
                <Select
                  value={contactForm.service}
                  onValueChange={(value) => setContactForm({ ...contactForm, service: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedVendor?.services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Describe your needs and ask any questions..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={() => setContactModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton type="submit" className="flex-1">
                  Send Message
                </AnimatedButton>
              </div>
            </form>
          </div>
        </AnimatedModal>

        {/* Vendor Detail Modal */}
        {selectedVendor && (
          <AnimatedModal
            isOpen={!!selectedVendor}
            onClose={() => setSelectedVendor(null)}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedVendor.logo} />
                    <AvatarFallback>
                      {selectedVendor.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{selectedVendor.name}</h2>
                    <div className="flex items-center gap-2">
                      {renderStars(selectedVendor.rating)}
                      <span className="text-sm text-gray-600">
                        {selectedVendor.rating.toFixed(1)} ({selectedVendor.reviewCount} reviews)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedVendor.featured && (
                    <Badge className="bg-yellow-500">Featured</Badge>
                  )}
                  {selectedVendor.verified && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-4">{selectedVendor.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-gray-600">{selectedVendor.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subcategory</Label>
                  <p className="text-sm text-gray-600">{selectedVendor.subcategory}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm text-gray-600">
                    {selectedVendor.location.city}, {selectedVendor.location.state}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Pricing</Label>
                  <p className="text-sm text-gray-600">{selectedVendor.pricing}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Services</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVendor.services.map((service) => (
                      <Badge key={service} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Specialties</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVendor.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <h4 className="font-medium">Contact Information</h4>
                <div className="space-y-2">
                  {selectedVendor.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{selectedVendor.contact.email}</span>
                    </div>
                  )}
                  {selectedVendor.contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{selectedVendor.contact.phone}</span>
                    </div>
                  )}
                  {selectedVendor.contact.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <a
                        href={selectedVendor.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {selectedVendor.contact.website}
                      </a>
                    </div>
                  )}
                  {selectedVendor.contact.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{selectedVendor.contact.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <AnimatedButton
                  onClick={() => {
                    setContactModalOpen(true)
                    setSelectedVendor(null)
                  }}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Vendor
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  onClick={() => setSelectedVendor(null)}
                >
                  Close
                </AnimatedButton>
              </div>
            </div>
          </AnimatedModal>
        )}
      </div>
    </AnimatedPage>
  )
} 