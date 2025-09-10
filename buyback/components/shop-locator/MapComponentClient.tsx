"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ShopLocationWithPhones } from "@/types/shop";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";

interface MapComponentClientProps {
  locations: ShopLocationWithPhones[];
  selectedLocation: ShopLocationWithPhones | null;
  onSelectLocation: (location: ShopLocationWithPhones) => void;
  userLocation: { latitude: number; longitude: number } | null;
  primaryColor: string;
}

interface MapOptions {
  disableDefaultUI: boolean;
  zoomControl: boolean;
  mapTypeControl: boolean;
  streetViewControl: boolean;
  fullscreenControl: boolean;
}

// Container to only render the map on the client side
const MapContainer = ({ children }: { children: React.ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  return <>{children}</>;
};

// Map wrapper component to safely handle initialization
function MapWrapper({ 
  mapCenter, 
  zoom, 
  locations, 
  selectedLocation, 
  onSelectLocation, 
  userLocation,
  primaryColor
}: {
  mapCenter: {lat: number, lng: number};
  zoom: number;
  locations: ShopLocationWithPhones[];
  selectedLocation: ShopLocationWithPhones | null;
  onSelectLocation: (location: ShopLocationWithPhones) => void;
  userLocation: { latitude: number; longitude: number } | null;
  primaryColor: string;
}) {
  const [openInfoWindow, setOpenInfoWindow] = useState<string | number | null>(null);
  
  // Map options
  const mapOptions = useMemo<MapOptions>(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  }), []);

  // Handle marker click
  const handleMarkerClick = useCallback((location: ShopLocationWithPhones) => {
    onSelectLocation(location);
    setOpenInfoWindow(location.id);
  }, [onSelectLocation]);

  // Close info window
  const handleInfoWindowClose = useCallback(() => {
    setOpenInfoWindow(null);
  }, []);

  return (
    <GoogleMap
      mapContainerStyle={{ height: "100%", width: "100%" }}
      center={mapCenter}
      zoom={zoom}
      options={mapOptions}
    >
      {/* Display markers for all locations */}
      {locations.map((location) => {
        const position = { lat: location.latitude, lng: location.longitude };
        const isSelected = selectedLocation?.id === location.id;
        
        return (
          <MarkerF
            key={location.id}
            position={position}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/" + (isSelected ? "blue" : "red") + "-dot.png",
              scaledSize: new google.maps.Size(isSelected ? 38 : 32, isSelected ? 38 : 32),
            }}
            onClick={() => handleMarkerClick(location)}
          >
            {openInfoWindow === location.id && (
              <InfoWindowF
                position={position}
                onCloseClick={handleInfoWindowClose}
              >
                <div className="text-center">
                  <strong>{location.name}</strong>
                  <p className="text-sm">{location.address}</p>
                </div>
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}
      
      {/* Display user location if available */}
      {userLocation && (
        <MarkerF
          position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            scaledSize: new google.maps.Size(32, 32),
          }}
        >
          {openInfoWindow === "user-location" && (
            <InfoWindowF
              position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
              onCloseClick={handleInfoWindowClose}
            >
              <div className="text-center">
                <strong>Your Location</strong>
              </div>
            </InfoWindowF>
          )}
        </MarkerF>
      )}
    </GoogleMap>
  );
}

export default function MapComponentClient({
  locations,
  selectedLocation,
  onSelectLocation,
  userLocation,
  primaryColor,
}: MapComponentClientProps) {
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>({lat: 0, lng: 0});
  const [zoom, setZoom] = useState(13);
  const mapContainerId = useRef<string>(`map-${Math.random().toString(36).substring(2, 11)}`);
  
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });
  
  // Determine map center based on locations
  useEffect(() => {
    if (locations.length === 0 && !userLocation) {
      return;
    }
    
    if (selectedLocation) {
      setMapCenter({lat: selectedLocation.latitude, lng: selectedLocation.longitude});
      setZoom(15);
    } else if (userLocation) {
      setMapCenter({lat: userLocation.latitude, lng: userLocation.longitude});
      setZoom(13);
    } else if (locations.length > 0) {
      // Calculate center point of all locations
      const latSum = locations.reduce((sum, loc) => sum + loc.latitude, 0);
      const lngSum = locations.reduce((sum, loc) => sum + loc.longitude, 0);
      setMapCenter({lat: latSum / locations.length, lng: lngSum / locations.length});
      
      // Set zoom level based on number of locations
      setZoom(locations.length === 1 ? 15 : 11);
    }
  }, [locations, selectedLocation, userLocation]);
  
  // If Maps API is not loaded yet or no locations
  if (!isLoaded) {
    return <div id={mapContainerId.current} style={{ height: "100%", width: "100%", minHeight: "400px" }} />;
  }
  
  return (
    <div className="w-full h-full" style={{ minHeight: "400px" }} id={mapContainerId.current}>
      {locations.length > 0 && (
        <MapContainer>
          <MapWrapper
            mapCenter={mapCenter}
            zoom={zoom}
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={onSelectLocation}
            userLocation={userLocation}
            primaryColor={primaryColor}
          />
        </MapContainer>
      )}
    </div>
  );
} 