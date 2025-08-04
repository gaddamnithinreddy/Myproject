"use client"

import { useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

interface MapViewProps {
  coordinates: { lat: number; lng: number }
  zoom?: number
  className?: string
  address?: string
  name?: string
  showDirections?: boolean
  interactive?: boolean
  markers?: Array<{
    position: { lat: number; lng: number }
    title: string
    icon?: string
  }>
}

export default function MapView({
  coordinates,
  zoom = 14,
  className = "h-64 w-full",
  address,
  name,
  showDirections = false,
  interactive = true,
  markers = []
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>('DRIVING' as google.maps.TravelMode)

  useEffect(() => {
    const initMap = async () => {
      try {
        setLoading(true)
        
        // Load Google Maps API
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key',
          version: 'weekly',
          libraries: ['places', 'geometry']
        })

        const google = await loader.load()
        
    if (!mapRef.current) return

        // Create map instance
        const mapInstance = new google.maps.Map(mapRef.current, {
      center: coordinates,
          zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: interactive ? 'cooperative' : 'none',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        setMap(mapInstance)

        // Add main marker
        const mainMarker = new google.maps.Marker({
          position: coordinates,
          map: mapInstance,
          title: name || 'Location',
          icon: {
            url: '/placeholder-logo.svg',
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        })

        // Add info window for main marker
        if (name || address) {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 10px; max-width: 200px;">
                <h3 style="margin: 0 0 5px 0; font-size: 16px;">${name || 'Location'}</h3>
                ${address ? `<p style="margin: 0; font-size: 14px; color: #666;">${address}</p>` : ''}
                <div style="margin-top: 10px;">
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}" 
                     target="_blank" 
                     style="color: #667eea; text-decoration: none; font-size: 14px;">
                    Get Directions
                  </a>
                </div>
              </div>
            `
          })

          mainMarker.addListener('click', () => {
            infoWindow.open(mapInstance, mainMarker)
          })
        }

        // Add additional markers
        markers.forEach((markerData) => {
          const marker = new google.maps.Marker({
            position: markerData.position,
            map: mapInstance,
            title: markerData.title,
            icon: markerData.icon ? {
              url: markerData.icon,
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 24)
            } : undefined
          })

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 150px;">
                <h4 style="margin: 0; font-size: 14px;">${markerData.title}</h4>
              </div>
            `
          })

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker)
          })
        })

        // Initialize directions service if needed
        if (showDirections) {
          const directionsServiceInstance = new google.maps.DirectionsService()
          const directionsRendererInstance = new google.maps.DirectionsRenderer({
            map: mapInstance,
            suppressMarkers: true
          })

          setDirectionsService(directionsServiceInstance)
          setDirectionsRenderer(directionsRendererInstance)

          // Get user location for directions
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userPos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                }
                setUserLocation(userPos)
                
                // Calculate directions
                calculateDirections(userPos, coordinates)
              },
              (error) => {
                console.warn('Could not get user location:', error)
                setError('Could not get your location for directions')
              }
            )
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to load map:', err)
        setError('Failed to load map')
        setLoading(false)
      }
    }

    initMap()
  }, [coordinates, zoom, interactive, markers, showDirections])

  const calculateDirections = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    if (!directionsService || !directionsRenderer) return

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route({
          origin,
          destination,
          travelMode,
          provideRouteAlternatives: true
        }, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result)
          } else {
            reject(new Error(`Directions request failed: ${status}`))
          }
        })
      })

      directionsRenderer.setDirections(result)
      setDirections(result)
    } catch (err) {
      console.error('Failed to calculate directions:', err)
      setError('Could not calculate directions')
    }
  }

  const handleTravelModeChange = (mode: google.maps.TravelMode) => {
    setTravelMode(mode)
    if (userLocation) {
      calculateDirections(userLocation, coordinates)
    }
  }

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
    window.open(url, '_blank')
  }

  const getDirectionsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`
  }

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div ref={mapRef} className={className} />
      
      {/* Map Controls */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={openInGoogleMaps}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Open in Google Maps
          </button>
          <a
            href={getDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Get Directions
          </a>
        </div>

        {/* Travel Mode Selector for Directions */}
        {showDirections && userLocation && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Travel mode:</span>
            <select
              value={travelMode}
              onChange={(e) => handleTravelModeChange(e.target.value as google.maps.TravelMode)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={google.maps.TravelMode.DRIVING}>Driving</option>
              <option value={google.maps.TravelMode.WALKING}>Walking</option>
              <option value={google.maps.TravelMode.BICYCLING}>Bicycling</option>
              <option value={google.maps.TravelMode.TRANSIT}>Transit</option>
            </select>
          </div>
        )}
      </div>

      {/* Directions Panel */}
      {showDirections && directions && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Directions</h3>
          <div className="space-y-2 text-sm">
            {directions.routes[0]?.legs[0] && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{directions.routes[0].legs[0].distance?.text}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{directions.routes[0].legs[0].duration?.text}</span>
                </div>
                <div className="mt-3">
                  <h4 className="font-medium mb-1">Route:</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    {directions.routes[0].legs[0].steps?.slice(0, 3).map((step, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-medium">{index + 1}.</span>
                        <span dangerouslySetInnerHTML={{ __html: step.instructions }} />
                      </div>
                    ))}
                    {directions.routes[0].legs[0].steps && directions.routes[0].legs[0].steps.length > 3 && (
                      <div className="text-blue-600 text-xs">
                        ... and {directions.routes[0].legs[0].steps.length - 3} more steps
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Location Details */}
      {(name || address) && (
        <div className="bg-gray-50 rounded-lg p-3">
          {name && <h3 className="font-medium text-gray-900 mb-1">{name}</h3>}
          {address && <p className="text-sm text-gray-600">{address}</p>}
        </div>
      )}
    </div>
  )
}

// Location Search Component
export function LocationSearch({ onLocationSelect }: { onLocationSelect: (location: { lat: number; lng: number }, address: string) => void }) {
  const [searchBox, setSearchBox] = useState<google.maps.places.Autocomplete | null>(null)
  const [searchValue, setSearchValue] = useState("")

  useEffect(() => {
    const initSearchBox = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key',
        version: 'weekly',
        libraries: ['places']
      })

      const google = await loader.load()
      
      const input = document.getElementById('location-search') as HTMLInputElement
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: 'us' }
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            const address = place.formatted_address || ''
            
            onLocationSelect({ lat, lng }, address)
            setSearchValue(place.name || address)
          }
        })

        setSearchBox(autocomplete)
      }
    }

    initSearchBox()
  }, [onLocationSelect])

  return (
    <div className="space-y-2">
      <label htmlFor="location-search" className="block text-sm font-medium text-gray-700">
        Search Location
      </label>
      <input
        id="location-search"
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Enter location or address..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

// Map Picker Component for selecting locations
export function MapPicker({ 
  onLocationSelect, 
  initialLocation = { lat: 37.7749, lng: -122.4194 } // San Francisco default
}: { 
  onLocationSelect: (location: { lat: number; lng: number }, address: string) => void
  initialLocation?: { lat: number; lng: number }
}) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation)
  const [address, setAddress] = useState("")
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key',
        version: 'weekly',
        libraries: ['places', 'geocoding']
      })

      const google = await loader.load()
      
      const mapElement = document.getElementById('map-picker')
      if (!mapElement) return

      const mapInstance = new google.maps.Map(mapElement, {
        center: initialLocation,
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
      })

      const markerInstance = new google.maps.Marker({
        position: initialLocation,
        map: mapInstance,
        draggable: true,
        title: 'Selected Location'
      })

      setMap(mapInstance)
      setMarker(markerInstance)

      // Handle marker drag
      markerInstance.addListener('dragend', () => {
        const position = markerInstance.getPosition()
        if (position) {
          const newLocation = { lat: position.lat(), lng: position.lng() }
          setSelectedLocation(newLocation)
          reverseGeocode(newLocation)
        }
      })

      // Handle map click
      mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const newLocation = { lat: event.latLng.lat(), lng: event.latLng.lng() }
          markerInstance.setPosition(event.latLng)
          setSelectedLocation(newLocation)
          reverseGeocode(newLocation)
        }
      })

      // Initial geocoding
      reverseGeocode(initialLocation)
    }

    initMap()
  }, [initialLocation])

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key',
      version: 'weekly',
      libraries: ['geocoding']
    })

    const google = await loader.load()
    const geocoder = new google.maps.Geocoder()

    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results)
      } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })
      
      if (result[0]) {
        const address = result[0].formatted_address
        setAddress(address)
        onLocationSelect(location, address)
      }
    } catch (error) {
      console.error('Geocoding failed:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div id="map-picker" className="h-64 w-full border rounded-lg" />
      {address && (
        <div className="text-sm text-gray-600">
          <strong>Selected Address:</strong> {address}
        </div>
      )}
      <div className="text-xs text-gray-500">
        Click on the map or drag the marker to select a location
      </div>
    </div>
  )
}
