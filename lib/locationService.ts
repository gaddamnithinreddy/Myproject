"use client"

import { db } from '@/lib/firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  GeoPoint
} from 'firebase/firestore'

export interface Location {
  id: string
  name: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    formatted: string
  }
  coordinates: {
    latitude: number
    longitude: number
  }
  type: 'venue' | 'field' | 'court' | 'gym' | 'stadium' | 'park' | 'other'
  sport?: string
  facilities: string[]
  capacity?: number
  amenities: string[]
  contact?: {
    phone?: string
    email?: string
    website?: string
  }
  operatingHours?: {
    [day: string]: { open: string; close: string } | 'closed'
  }
  pricing?: {
    hourlyRate?: number
    dailyRate?: number
    currency: string
    notes?: string
  }
  images?: string[]
  rating?: number
  reviews?: LocationReview[]
  isVerified: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface LocationReview {
  id: string
  userId: string
  userName: string
  rating: number
  comment?: string
  createdAt: Date
}

export interface DirectionsResult {
  distance: {
    text: string
    value: number // meters
  }
  duration: {
    text: string
    value: number // seconds
  }
  steps: DirectionStep[]
  overview_polyline: string
}

export interface DirectionStep {
  instruction: string
  distance: { text: string; value: number }
  duration: { text: string; value: number }
  start_location: { lat: number; lng: number }
  end_location: { lat: number; lng: number }
}

class LocationService {
  private googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  private placesService: google.maps.places.PlacesService | null = null
  private autocompleteService: google.maps.places.AutocompleteService | null = null
  private geocoder: google.maps.Geocoder | null = null

  // Add a new location
  async addLocation(
    locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'isVerified'>,
    createdBy: string
  ): Promise<string> {
    try {
      const location: Omit<Location, 'id'> = {
        ...locationData,
        isVerified: false,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'locations'), {
        ...location,
        coordinates: new GeoPoint(location.coordinates.latitude, location.coordinates.longitude)
      })

      return docRef.id
    } catch (error) {
      console.error('Error adding location:', error)
      throw error
    }
  }

  // Get location by ID
  async getLocation(locationId: string): Promise<Location | null> {
    try {
      const docSnap = await getDoc(doc(db, 'locations', locationId))
      if (!docSnap.exists()) return null

      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        coordinates: {
          latitude: data.coordinates.latitude,
          longitude: data.coordinates.longitude
        },
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Location
    } catch (error) {
      console.error('Error getting location:', error)
      return null
    }
  }

  // Search locations by various criteria
  async searchLocations(filters: {
    sport?: string
    type?: string
    city?: string
    state?: string
    radius?: number // km
    center?: { lat: number; lng: number }
  }): Promise<Location[]> {
    try {
      let q = query(collection(db, 'locations'))

      if (filters.sport) {
        q = query(q, where('sport', '==', filters.sport))
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type))
      }
      if (filters.city) {
        q = query(q, where('address.city', '==', filters.city))
      }
      if (filters.state) {
        q = query(q, where('address.state', '==', filters.state))
      }

      const snapshot = await getDocs(q)
      let locations = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          coordinates: {
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude
          },
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as Location
      })

      // Apply radius filter if provided
      if (filters.radius && filters.center) {
        locations = locations.filter(location => {
          const distance = this.calculateDistance(
            filters.center!.lat,
            filters.center!.lng,
            location.coordinates.latitude,
            location.coordinates.longitude
          )
          return distance <= filters.radius!
        })
      }

      return locations
    } catch (error) {
      console.error('Error searching locations:', error)
      return []
    }
  }

  // Get nearby locations
  async getNearbyLocations(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    sport?: string
  ): Promise<Location[]> {
    return this.searchLocations({
      radius: radiusKm,
      center: { lat: latitude, lng: longitude },
      sport
    })
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.googleMapsApiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleMapsApiKey}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location
        return {
          lat: location.lat,
          lng: location.lng
        }
      }

      return null
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    if (!this.googleMapsApiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.googleMapsApiKey}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address
      }

      return null
    } catch (error) {
      console.error('Error reverse geocoding:', error)
      return null
    }
  }

  // Get directions between two locations
  async getDirections(
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number } | string,
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Promise<DirectionsResult | null> {
    if (!this.googleMapsApiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }

    try {
      const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`
      const destinationStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destinationStr)}&mode=${mode}&key=${this.googleMapsApiKey}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0]
        const leg = route.legs[0]

        return {
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map((step: any) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
            distance: step.distance,
            duration: step.duration,
            start_location: step.start_location,
            end_location: step.end_location
          })),
          overview_polyline: route.overview_polyline.points
        }
      }

      return null
    } catch (error) {
      console.error('Error getting directions:', error)
      return null
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Add review for a location
  async addLocationReview(
    locationId: string,
    userId: string,
    userName: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    try {
      const location = await this.getLocation(locationId)
      if (!location) throw new Error('Location not found')

      const review: LocationReview = {
        id: `review_${Date.now()}`,
        userId,
        userName,
        rating,
        comment,
        createdAt: new Date()
      }

      const updatedReviews = [...(location.reviews || []), review]
      const averageRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length

      await updateDoc(doc(db, 'locations', locationId), {
        reviews: updatedReviews,
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error adding location review:', error)
      throw error
    }
  }

  // Initialize Google Maps services
  initializeGoogleMaps(): void {
    if (typeof window !== 'undefined' && window.google) {
      this.geocoder = new google.maps.Geocoder()
      this.autocompleteService = new google.maps.places.AutocompleteService()
      // PlacesService requires a map or div element, will be initialized when needed
    }
  }

  // Get precise location suggestions with autocomplete (like Uber/Rapido)
  async getLocationSuggestions(
    input: string,
    location?: { lat: number; lng: number },
    radius?: number
  ): Promise<google.maps.places.AutocompletePrediction[]> {
    return new Promise((resolve, reject) => {
      if (!this.autocompleteService) {
        this.initializeGoogleMaps()
      }

      if (!this.autocompleteService) {
        reject(new Error('Google Maps not initialized'))
        return
      }

      const request: google.maps.places.AutocompletionRequest = {
        input,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'us' }, // Can be made configurable
      }

      // Add location bias if provided
      if (location) {
        request.location = new google.maps.LatLng(location.lat, location.lng)
        request.radius = radius || 50000 // 50km default
      }

      this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          resolve(predictions)
        } else {
          reject(new Error(`Places service error: ${status}`))
        }
      })
    })
  }

  // Get detailed place information by place ID
  async getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        // Create a temporary div for PlacesService
        const div = document.createElement('div')
        this.placesService = new google.maps.places.PlacesService(div)
      }

      if (!this.placesService) {
        reject(new Error('Places service not available'))
        return
      }

      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'types',
          'rating',
          'user_ratings_total',
          'photos',
          'opening_hours',
          'formatted_phone_number',
          'website',
          'price_level',
          'reviews'
        ]
      }

      this.placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place)
        } else {
          reject(new Error(`Place details error: ${status}`))
        }
      })
    })
  }

  // Get precise current location with high accuracy (like ride-sharing apps)
  async getCurrentLocationPrecise(): Promise<{
    lat: number
    lng: number
    accuracy: number
    address?: string
  } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser')
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }

          // Get address for the coordinates
          try {
            const address = await this.reverseGeocode(coords.lat, coords.lng)
            resolve({ ...coords, address: address || undefined })
          } catch {
            resolve(coords)
          }
        },
        (error) => {
          console.warn('Error getting current location:', error)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // 1 minute
        }
      )
    })
  }

  // Watch user location for real-time updates (like during ride)
  watchLocation(
    callback: (location: { lat: number; lng: number; accuracy: number }) => void,
    errorCallback?: (error: GeolocationPositionError) => void
  ): number | null {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser')
      return null
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // 5 seconds
      }
    )
  }

  // Stop watching location
  stopWatchingLocation(watchId: number): void {
    navigator.geolocation.clearWatch(watchId)
  }

  // Get nearby places of specific types (restaurants, gas stations, etc.)
  async getNearbyPlaces(
    location: { lat: number; lng: number },
    type: string,
    radius: number = 1000
  ): Promise<google.maps.places.PlaceResult[]> {
    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        const div = document.createElement('div')
        this.placesService = new google.maps.places.PlacesService(div)
      }

      if (!this.placesService) {
        reject(new Error('Places service not available'))
        return
      }

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius,
        type: type as any
      }

      this.placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results)
        } else {
          reject(new Error(`Nearby search error: ${status}`))
        }
      })
    })
  }

  // Calculate precise route with multiple waypoints
  async calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: { lat: number; lng: number }[],
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING,
    avoidTolls: boolean = false,
    avoidHighways: boolean = false
  ): Promise<google.maps.DirectionsResult | null> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.google) {
        reject(new Error('Google Maps not loaded'))
        return
      }

      const directionsService = new google.maps.DirectionsService()

      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode,
        avoidTolls,
        avoidHighways,
        optimizeWaypoints: true
      }

      if (waypoints && waypoints.length > 0) {
        request.waypoints = waypoints.map(point => ({
          location: new google.maps.LatLng(point.lat, point.lng),
          stopover: true
        }))
      }

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result)
        } else {
          reject(new Error(`Directions error: ${status}`))
        }
      })
    })
  }

  // Get estimated travel time and distance matrix
  async getDistanceMatrix(
    origins: { lat: number; lng: number }[],
    destinations: { lat: number; lng: number }[],
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<google.maps.DistanceMatrixResponse | null> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.google) {
        reject(new Error('Google Maps not loaded'))
        return
      }

      const service = new google.maps.DistanceMatrixService()

      service.getDistanceMatrix({
        origins: origins.map(o => new google.maps.LatLng(o.lat, o.lng)),
        destinations: destinations.map(d => new google.maps.LatLng(d.lat, d.lng)),
        travelMode,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK && response) {
          resolve(response)
        } else {
          reject(new Error(`Distance matrix error: ${status}`))
        }
      })
    })
  }

  // Get user's current location (legacy method for backward compatibility)
  async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    const location = await this.getCurrentLocationPrecise()
    return location ? { lat: location.lat, lng: location.lng } : null
  }

  // Update schedule with location
  async updateScheduleLocation(scheduleId: string, locationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'schedules', scheduleId), {
        locationId,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating schedule location:', error)
      throw error
    }
  }

  // Get schedules for a location
  async getLocationSchedules(locationId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'schedules'),
        where('locationId', '==', locationId),
        orderBy('date', 'asc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }))
    } catch (error) {
      console.error('Error getting location schedules:', error)
      return []
    }
  }

  // Find optimal meeting point for team members
  async findOptimalMeetingPoint(
    memberLocations: { lat: number; lng: number }[],
    sport?: string
  ): Promise<Location | null> {
    if (memberLocations.length === 0) return null

    try {
      // Calculate centroid of all member locations
      const centroid = {
        lat: memberLocations.reduce((sum, loc) => sum + loc.lat, 0) / memberLocations.length,
        lng: memberLocations.reduce((sum, loc) => sum + loc.lng, 0) / memberLocations.length
      }

      // Find nearby locations
      const nearbyLocations = await this.getNearbyLocations(
        centroid.lat,
        centroid.lng,
        20, // 20km radius
        sport
      )

      if (nearbyLocations.length === 0) return null

      // Calculate total travel distance for each location
      const locationScores = await Promise.all(
        nearbyLocations.map(async (location) => {
          let totalDistance = 0
          let validDistances = 0

          for (const memberLoc of memberLocations) {
            const distance = this.calculateDistance(
              memberLoc.lat,
              memberLoc.lng,
              location.coordinates.latitude,
              location.coordinates.longitude
            )
            totalDistance += distance
            validDistances++
          }

          const averageDistance = validDistances > 0 ? totalDistance / validDistances : Infinity
          const ratingBonus = (location.rating || 0) * 0.5 // Small bonus for higher rated locations

          return {
            location,
            score: averageDistance - ratingBonus // Lower is better
          }
        })
      )

      // Return location with best (lowest) score
      locationScores.sort((a, b) => a.score - b.score)
      return locationScores[0]?.location || null
    } catch (error) {
      console.error('Error finding optimal meeting point:', error)
      return null
    }
  }

  // Validate location data
  validateLocationData(locationData: Partial<Location>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!locationData.name || locationData.name.trim().length === 0) {
      errors.push('Location name is required')
    }

    if (!locationData.address?.street || locationData.address.street.trim().length === 0) {
      errors.push('Street address is required')
    }

    if (!locationData.address?.city || locationData.address.city.trim().length === 0) {
      errors.push('City is required')
    }

    if (!locationData.address?.state || locationData.address.state.trim().length === 0) {
      errors.push('State is required')
    }

    if (!locationData.coordinates?.latitude || !locationData.coordinates?.longitude) {
      errors.push('Coordinates are required')
    }

    if (locationData.coordinates?.latitude && 
        (locationData.coordinates.latitude < -90 || locationData.coordinates.latitude > 90)) {
      errors.push('Invalid latitude value')
    }

    if (locationData.coordinates?.longitude && 
        (locationData.coordinates.longitude < -180 || locationData.coordinates.longitude > 180)) {
      errors.push('Invalid longitude value')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const locationService = new LocationService()
