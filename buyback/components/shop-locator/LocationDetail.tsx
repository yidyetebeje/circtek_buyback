"use client";

import { ShopLocationWithPhones } from "@/types/shop";
import { MapPin, Phone, Clock, Navigation, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationDetailProps {
  location: ShopLocationWithPhones;
  onClose: () => void;
  primaryColor: string;
}

export function LocationDetail({
  location,
  onClose,
  primaryColor,
}: LocationDetailProps) {
  // Get the primary phone number if available
  const primaryPhone = location.phones?.find(p => p.isPrimary) || location.phones?.[0];
  
  // Format the address for Google Maps
  const formatAddressForMaps = () => {
    const addressParts = [
      location.address,
      location.city,
      location.state,
      location.postalCode,
      location.country,
    ].filter(Boolean);
    
    return encodeURIComponent(addressParts.join(", "));
  };
  
  // Get directions link for Google Maps
  const getDirectionsLink = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&destination_place_id=${formatAddressForMaps()}`;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md mt-4 relative overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors z-10"
      >
        <X size={18} />
        <span className="sr-only">Close</span>
      </button>
      
      <div className="p-5">
        <h2 className="text-xl font-bold">{location.name}</h2>
        
        {location.isActive === false && (
          <div className="mt-2">
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
              Temporarily Closed
            </span>
          </div>
        )}
        
        <div className="mt-4 space-y-3">
          {/* Address */}
          <div className="flex">
            <MapPin size={20} className="mr-3 flex-shrink-0 text-gray-500" />
            <div>
              <p className="text-gray-700">{location.address}</p>
              <p className="text-gray-700">
                {location.city}{location.state ? `, ${location.state}` : ""}{" "}
                {location.postalCode || ""}
              </p>
              <p className="text-gray-700">{location.country}</p>
            </div>
          </div>
          
          {/* Phones */}
          {location.phones && location.phones.length > 0 && (
            <div className="flex">
              <Phone size={20} className="mr-3 flex-shrink-0 text-gray-500" />
              <div>
                {location.phones.map((phone, index) => (
                  <div key={index} className="flex items-center">
                    <a
                      href={`tel:${phone.phoneNumber}`}
                      className="text-gray-700 hover:underline"
                      style={{ color: phone.isPrimary ? primaryColor : undefined }}
                    >
                      {phone.phoneNumber}
                    </a>
                    {phone.isPrimary && (
                      <span className="ml-2 text-xs text-gray-500">(Primary)</span>
                    )}
                    <span className="ml-2 text-xs text-gray-500">
                      ({phone.phoneType})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Description */}
          {location.description && (
            <div className="mt-4 text-gray-600 text-sm">
              <p>{location.description}</p>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button 
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            style={{ 
              backgroundColor: primaryColor,
              borderColor: primaryColor,
            }}
            onClick={() => window.open(getDirectionsLink(), '_blank')}
          >
            <Navigation size={16} />
            Get Directions
          </Button>
          
          {primaryPhone && (
            <Button 
              variant="outline" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
              onClick={() => window.location.href = `tel:${primaryPhone.phoneNumber}`}
            >
              <Phone size={16} />
              Call Store
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 