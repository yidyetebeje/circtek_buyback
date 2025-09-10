"use client";

import { useState, useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import { displayConfigAtom, currentLanguageObjectAtom } from "@/store/atoms";
import { MainLayout } from "@/components/layout/MainLayout";
import { LocationMap } from "@/components/shop-locator/LocationMap";
import { LocationList } from "@/components/shop-locator/LocationList";
import { LocationDetail } from "@/components/shop-locator/LocationDetail";
import { useShopLocations } from "@/hooks/catalog/useShopLocations";
import { calculateDistance } from "@/utils/geo-utils";
import { getLocalizedText } from "@/utils/localization";
import { ShopLocationWithPhones, TranslatableText } from "@/types/shop";

interface ShopLocatorPageProps {
  shopId: number;
}

export function ShopLocatorPage({ shopId }: ShopLocatorPageProps) {
  const [selectedLocation, setSelectedLocation] = useState<ShopLocationWithPhones | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const displayConfig = useAtomValue(displayConfigAtom);
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en';
  
  // Fetch locations data
  const { 
    data: locationsResponse, 
    isLoading, 
    error 
  } = useShopLocations(shopId, { activeOnly: false });
  
  // Use standard locations instead of nearby ones for simplicity
  const locations = locationsResponse?.data || [];
  
  // Sort locations by distance to user if available
  const sortedLocations = useMemo(() => {
    if (!userLocation) return locations;
    
    return [...locations].sort((a, b) => {
      const distanceA = a.distance ?? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      
      const distanceB = b.distance ?? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      
      return distanceA - distanceB;
    });
  }, [locations, userLocation]);
  
  // Get user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, []);
  
  // Handle location selection
  const handleLocationSelect = (location: ShopLocationWithPhones) => {
    setSelectedLocation(location);
  };
  
  // Get page title from shop config or use default
  const pageTitle = getLocalizedText(
    { en: "Our Locations" } as TranslatableText, 
    currentLocale, 
    fallbackLocale
  );
  
  return (
    <MainLayout shopConfig={displayConfig}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-start">
          <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
          <p className="text-gray-600 mb-8">
            {getLocalizedText(
              { en: "Find the nearest shop location to you" } as TranslatableText,
              currentLocale,
              fallbackLocale
            )}
          </p>
          
          {/* Mobile view toggle */}
          <div className="md:hidden w-full mb-6">
            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'list' ? 'bg-white shadow' : 'text-gray-500'
                }`}
                onClick={() => setViewMode('list')}
              >
                List View
              </button>
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'map' ? 'bg-white shadow' : 'text-gray-500'
                }`}
                onClick={() => setViewMode('map')}
              >
                Map View
              </button>
            </div>
          </div>
          
          {/* Error state */}
          {error && (
            <div className="w-full bg-red-50 p-4 rounded-lg mb-6">
              <p className="text-red-700">Error loading locations: {error.message}</p>
            </div>
          )}
          
          {/* Main content */}
          <div className="w-full flex flex-col md:flex-row gap-8">
            {/* Location list */}
            <div className={`w-full md:w-2/5 ${viewMode === 'map' ? 'hidden md:block' : ''}`}>
              <LocationList 
                locations={sortedLocations}
                selectedLocation={selectedLocation}
                onSelectLocation={handleLocationSelect}
                isLoading={isLoading}
                userLocation={userLocation}
                primaryColor={displayConfig.theme.primary}
              />
            </div>
            
            {/* Map and location detail */}
            <div className={`w-full md:w-3/5 ${viewMode === 'list' ? 'hidden md:block' : ''}`}>
              <div className="sticky top-24">
                <LocationMap 
                  locations={sortedLocations}
                  selectedLocation={selectedLocation}
                  onSelectLocation={handleLocationSelect}
                  userLocation={userLocation}
                  primaryColor={displayConfig.theme.primary}
                />
                
                {selectedLocation && (
                  <LocationDetail 
                    location={selectedLocation}
                    onClose={() => setSelectedLocation(null)}
                    primaryColor={displayConfig.theme.primary}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 