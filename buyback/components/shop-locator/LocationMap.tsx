"use client";

import { ShopLocationWithPhones } from "@/types/shop";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
const DynamicMapComponent = dynamic(
  () => import('./MapComponentClient'),
  { ssr: false, loading: () => <Skeleton className="w-full h-[400px] rounded-lg" /> }
);

interface LocationMapProps {
  locations: ShopLocationWithPhones[];
  selectedLocation: ShopLocationWithPhones | null;
  onSelectLocation: (location: ShopLocationWithPhones) => void;
  userLocation: { latitude: number; longitude: number } | null;
  primaryColor: string;
}

export function LocationMap({
  locations,
  selectedLocation,
  onSelectLocation,
  userLocation,
  primaryColor,
}: LocationMapProps) {
  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-md">
      <DynamicMapComponent
        locations={locations}
        selectedLocation={selectedLocation}
        onSelectLocation={onSelectLocation}
        userLocation={userLocation}
        primaryColor={primaryColor}
      />
    </div>
  );
} 