"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MapPin, Navigation, Search, Clock, Star } from 'lucide-react'
import { locationService } from '@/lib/locationService'

interface PreciseLocationPickerProps {
  onLocationSelect: (location: {
    lat: number
    lng: number
    address: string
    placeId?: string
    name?: string
  }) => void
  initialLocation?: { lat: number; lng: number }
  placeholder?: string
  showCurrentLocation?: boolean
  showNearbyPlaces?: boolean
  className?: string
}

interface LocationSuggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  types: string[]
}

interface NearbyPlace {
  placeId: string
  name: string
  vicinity: string
  rating?: number
  types: string[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

export function PreciseLocationPicker({
  onLocationSelect,
  initialLocation,
  placeholder = "Search for a location...",
  showCurrentLocation = true,
  showNearbyPlaces = true,
  className = ""
}: PreciseLocationPickerProps) {
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address: string
    name?: string
  } | null>(null)

  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Google Maps and get current location
  useEffect(() => {
    locationService.initializeGoogleMaps()
    
    if (showCurrentLocation) {
      getCurrentLocation()
    }

    if (initialLocation) {
      setCurrentLocation(initialLocation)
      loadNearbyPlaces(initialLocation)
    }
  }, [initialLocation, showCurrentLocation])

  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true)
    try {
      const location = await locationService.getCurrentLocationPrecise()
      if (location) {
        setCurrentLocation({ lat: location.lat, lng: location.lng })
        if (showNearbyPlaces) {
          loadNearbyPlaces({ lat: location.lat, lng: location.lng })
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error)
    } finally {
      setIsLoading(false)
    }
  }, [showNearbyPlaces])

  const loadNearbyPlaces = useCallback(async (location: { lat: number; lng: number }) => {
    if (!showNearbyPlaces) return

    try {
      // Get various types of nearby places
      const placeTypes = ['restaurant', 'gas_station', 'hospital', 'school', 'park']
      const allPlaces: NearbyPlace[] = []

      for (const type of placeTypes) {
        try {
          const places = await locationService.getNearbyPlaces(location, type, 2000)
          const formattedPlaces = places.slice(0, 3).map(place => ({
            placeId: place.place_id || '',
            name: place.name || '',
            vicinity: place.vicinity || '',
            rating: place.rating,
            types: place.types || [],
            geometry: {
              location: {
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0
              }
            }
          }))
          allPlaces.push(...formattedPlaces)
        } catch (error) {
          console.warn(`Error loading ${type} places:`, error)
        }
      }

      setNearbyPlaces(allPlaces.slice(0, 10)) // Limit to 10 places
    } catch (error) {
      console.error('Error loading nearby places:', error)
    }
  }, [showNearbyPlaces])

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value)
    setShowSuggestions(true)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim().length < 2) {
      setSuggestions([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const predictions = await locationService.getLocationSuggestions(
          value,
          currentLocation || undefined,
          50000
        )

        const formattedSuggestions = predictions.map(prediction => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting.main_text,
          secondaryText: prediction.structured_formatting.secondary_text,
          types: prediction.types
        }))

        setSuggestions(formattedSuggestions)
      } catch (error) {
        console.error('Error getting location suggestions:', error)
        setSuggestions([])
      }
    }, 300)
  }, [currentLocation])

  const handleSuggestionSelect = useCallback(async (suggestion: LocationSuggestion) => {
    setIsLoading(true)
    setShowSuggestions(false)
    setSearchInput(suggestion.description)

    try {
      const placeDetails = await locationService.getPlaceDetails(suggestion.placeId)
      
      if (placeDetails && placeDetails.geometry?.location) {
        const location = {
          lat: placeDetails.geometry.location.lat(),
          lng: placeDetails.geometry.location.lng(),
          address: placeDetails.formatted_address || suggestion.description,
          placeId: suggestion.placeId,
          name: placeDetails.name
        }

        setSelectedLocation(location)
        onLocationSelect(location)
      }
    } catch (error) {
      console.error('Error getting place details:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onLocationSelect])

  const handleNearbyPlaceSelect = useCallback(async (place: NearbyPlace) => {
    setIsLoading(true)

    try {
      const placeDetails = await locationService.getPlaceDetails(place.placeId)
      
      if (placeDetails && placeDetails.geometry?.location) {
        const location = {
          lat: placeDetails.geometry.location.lat(),
          lng: placeDetails.geometry.location.lng(),
          address: placeDetails.formatted_address || place.vicinity,
          placeId: place.placeId,
          name: place.name
        }

        setSelectedLocation(location)
        setSearchInput(location.address)
        onLocationSelect(location)
      }
    } catch (error) {
      console.error('Error selecting nearby place:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onLocationSelect])

  const handleUseCurrentLocation = useCallback(async () => {
    if (!currentLocation) {
      await getCurrentLocation()
      return
    }

    setIsLoading(true)
    try {
      const address = await locationService.reverseGeocode(
        currentLocation.lat,
        currentLocation.lng
      )

      const location = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: address || `${currentLocation.lat}, ${currentLocation.lng}`,
        name: 'Current Location'
      }

      setSelectedLocation(location)
      setSearchInput(location.address)
      onLocationSelect(location)
    } catch (error) {
      console.error('Error using current location:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentLocation, getCurrentLocation, onLocationSelect])

  const getPlaceTypeIcon = (types: string[]) => {
    if (types.includes('restaurant') || types.includes('food')) return '🍽️'
    if (types.includes('gas_station')) return '⛽'
    if (types.includes('hospital')) return '🏥'
    if (types.includes('school')) return '🏫'
    if (types.includes('park')) return '🌳'
    if (types.includes('store')) return '🏪'
    return '📍'
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchInput}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-4"
          onFocus={() => setShowSuggestions(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Current Location Button */}
      {showCurrentLocation && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={isLoading}
          className="mt-2 w-full justify-start"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Use Current Location
        </Button>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.placeId}
                className="flex items-center p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <MapPin className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {suggestion.mainText}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.secondaryText}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  {suggestion.types.slice(0, 2).map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nearby Places */}
      {showNearbyPlaces && nearbyPlaces.length > 0 && !showSuggestions && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              <span className="font-medium text-sm">Nearby Places</span>
            </div>
            <Separator className="mb-3" />
            <div className="space-y-2">
              {nearbyPlaces.map((place, index) => (
                <div
                  key={place.placeId}
                  className="flex items-center p-2 hover:bg-muted rounded-lg cursor-pointer"
                  onClick={() => handleNearbyPlaceSelect(place)}
                >
                  <span className="text-lg mr-3">
                    {getPlaceTypeIcon(place.types)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {place.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {place.vicinity}
                    </div>
                  </div>
                  {place.rating && (
                    <div className="flex items-center gap-1 ml-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{place.rating}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <Card className="mt-4 border-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {selectedLocation.name || 'Selected Location'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedLocation.address}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PreciseLocationPicker
