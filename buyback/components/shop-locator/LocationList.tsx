"use client";

import { useState, useMemo } from "react";
import { ShopLocationWithPhones } from "@/types/shop";
import { MapPin, Phone, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { calculateDistance } from "@/utils/geo-utils";

interface LocationListProps {
  locations: ShopLocationWithPhones[];
  selectedLocation: ShopLocationWithPhones | null;
  onSelectLocation: (location: ShopLocationWithPhones) => void;
  isLoading: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  primaryColor: string;
}

export function LocationList({
  locations,
  selectedLocation,
  onSelectLocation,
  isLoading,
  userLocation,
  primaryColor,
}: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    
    const query = searchQuery.toLowerCase();
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(query) ||
        location.address.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query) ||
        location.country.toLowerCase().includes(query) ||
        (location.postalCode && location.postalCode.toLowerCase().includes(query))
    );
  }, [locations, searchQuery]);
  
  // Sort locations by distance to user if available
  const sortedLocations = useMemo(() => {
    if (!userLocation) return filteredLocations;
    
    return [...filteredLocations].sort((a, b) => {
      const distanceA = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      
      const distanceB = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      
      return distanceA - distanceB;
    });
  }, [filteredLocations, userLocation]);
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-3/4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-medium mb-2">No locations found</h3>
        <p className="text-gray-500">This shop has no physical locations yet.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {userLocation 
            ? "Locations sorted by distance to you" 
            : "Enable location services to see the nearest stores"}
        </div>
      </div>
      
      <div className="max-h-[600px] overflow-y-auto">
        {sortedLocations.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No locations match your search</p>
          </div>
        ) : (
          sortedLocations.map((location) => {
            const isSelected = selectedLocation?.id === location.id;
            const primaryPhone = location.phones?.find(p => p.isPrimary) || location.phones?.[0];
            
            // Calculate distance if user location is available
            const distance = userLocation
              ? calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  location.latitude,
                  location.longitude
                )
              : null;
              
            return (
              <div
                key={location.id}
                className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50 ${
                  isSelected ? 'bg-gray-50 border-l-4' : ''
                }`}
                style={{ 
                  borderLeftColor: isSelected ? primaryColor : 'transparent',
                  borderLeftWidth: isSelected ? '4px' : '0'
                }}
                onClick={() => onSelectLocation(location)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg">{location.name}</h3>
                  {distance !== null && (
                    <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded-full">
                      {distance < 1 
                        ? `${Math.round(distance * 1000)} m` 
                        : `${distance.toFixed(1)} km`}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 flex items-start text-gray-600">
                  <MapPin size={16} className="mr-2 flex-shrink-0 mt-1" />
                  <span className="text-sm">
                    {location.address}, {location.city}
                    {location.state ? `, ${location.state}` : ""}{" "}
                    {location.postalCode || ""}
                  </span>
                </div>
                
                {primaryPhone && (
                  <div className="mt-2 flex items-center text-gray-600">
                    <Phone size={16} className="mr-2 flex-shrink-0" />
                    <a 
                      href={`tel:${primaryPhone.phoneNumber}`} 
                      className="text-sm hover:underline"
                      style={{ color: primaryColor }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {primaryPhone.phoneNumber}
                    </a>
                  </div>
                )}
                
                {location.isActive === false && (
                  <div className="mt-2 text-sm">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                      Temporarily Closed
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 