"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import type { google } from "google-maps"

interface MapPickerProps {
  onPlaceSelect: (place: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }) => void
  initialLocation?: {
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  }
  className?: string
}

declare global {
  interface Window {
    google: typeof google
    initMapView: () => void
  }
}

let map: google.maps.Map
let autocomplete: google.maps.places.Autocomplete
let marker: google.maps.Marker | null = null

export default function MapPicker({ onPlaceSelect, initialLocation, className }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [loadingMap, setLoadingMap] = useState(true)
  const [currentAddress, setCurrentAddress] = useState(initialLocation?.address || "")
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates: { lat: number; lng: number }
  } | null>(null)

  const loadGoogleMapsScript = useCallback(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.");
    }
    if (window.google && window.google.maps) {
      initMap()
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initMapView&libraries=places`;
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    window.initMapView = () => {
      initMap()
    }
  }, [])

  const initMap = useCallback(() => {
    if (!mapRef.current) return

    const defaultLocation = initialLocation?.coordinates || { lat: 34.052235, lng: -118.243683 } // Default to Los Angeles
    map = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    if (initialLocation && initialLocation.coordinates.lat !== 0 && initialLocation.coordinates.lng !== 0) {
      marker = new window.google.maps.Marker({
        position: initialLocation.coordinates,
        map: map,
      })
      map.setCenter(initialLocation.coordinates)
      map.setZoom(14)
    }

    autocomplete = new window.google.maps.places.Autocomplete(inputRef.current!, {
      types: ["address"],
      componentRestrictions: { country: ["us", "ca", "mx"] }, // Restrict to North America
    })

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      if (!place || !place.geometry || !place.geometry.location) {
        toast({
          title: "Location not found",
          description: "Please select a valid address from the suggestions.",
          variant: "destructive",
        })
        return
      }

      const addressComponents = place.address_components
      const address = place.formatted_address || ""
      let city = ""
      let state = ""
      let country = ""
      let zipCode = ""

      if (addressComponents) {
        for (const component of addressComponents) {
          const type = component.types[0]
          if (type === "locality") {
            city = component.long_name
          } else if (type === "administrative_area_level_1") {
            state = component.short_name
          } else if (type === "country") {
            country = component.long_name
          } else if (type === "postal_code") {
            zipCode = component.long_name
          }
        }
      }

      const newLocation = {
        address: address,
        city: city,
        state: state,
        country: country,
        zipCode: zipCode,
        coordinates: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        },
      }

      onPlaceSelect(newLocation)
      setCurrentAddress(newLocation.address)
      setSelectedLocation(newLocation)

      map.setCenter(newLocation.coordinates)
      map.setZoom(14)

      if (marker) {
        marker.setMap(null)
      }
      marker = new window.google.maps.Marker({
        position: newLocation.coordinates,
        map: map,
      })
    })

    setLoadingMap(false)
  }, [onPlaceSelect, initialLocation])

  useEffect(() => {
    loadGoogleMapsScript()
  }, [loadGoogleMapsScript])

  useEffect(() => {
    if (initialLocation?.address && inputRef.current) {
      setCurrentAddress(initialLocation.address)
    }
  }, [initialLocation])

  return (
    <Card className={className}>
      <CardContent className="p-0 flex flex-col h-full">
        <div className="relative p-4">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter an address"
            className="pl-10"
            value={currentAddress}
            onChange={(e) => setCurrentAddress(e.target.value)}
          />
        </div>
        <div className="relative flex-1 w-full">
          {loadingMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="sr-only">Loading map...</span>
            </div>
          )}
          <div ref={mapRef} className="h-full w-full rounded-b-lg" aria-label="Google Map for location selection" />
        </div>
        {selectedLocation && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedLocation.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-blue-600 underline"
          >
            Get Directions
          </a>
        )}
      </CardContent>
    </Card>
  )
}
